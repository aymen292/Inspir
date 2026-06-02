# Semaine 10 — Recommandations personnalisées

> Projet : Inspir — Bien-être & Micro-habitudes  
> Stack : FastAPI · PostgreSQL · Redis · Stripe · Scaleway  
> Dernière mise à jour : juin 2026

---

## Objectif de la semaine

À la fin de cette semaine, l'application **propose la bonne routine au bon moment**. Concrètement :

- `GET /api/routines/recommandee` retourne une routine adaptée à l'utilisateur
- L'algorithme prend en compte : heure du jour, humeur du moment, catégorie préférée, historique récent
- La page d'accueil affiche une **carte "Pour toi"** mise en avant
- Les recommandations sont cachées dans Redis (TTL 30 minutes) pour de meilleures performances
- Un fallback simple fonctionne si l'utilisateur n'est pas connecté

---

## Prérequis

- [ ] Semaines 5 à 9 terminées
- [ ] `heure_rappel`, `objectif`, `profil_vie` stockés dans le profil utilisateur
- [ ] Historique de séances disponible via `user_sessions`
- [ ] Redis actif (`docker start redis-bienetre`)

---

## Étape 1 — Service de recommandation

### 1.1 Créer `app/services/recommendations.py`

```python
from datetime import datetime, date, timedelta, timezone
from uuid import UUID
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sqlfunc
from app.models.routine import Routine
from app.models.session import UserSession
from app.models.mood import UserMood
from app.models.user import User


def moment_depuis_heure(heure: int) -> str:
    """Retourne le moment de la journée selon l'heure."""
    if 5 <= heure < 12:
        return "Matin"
    elif 12 <= heure < 18:
        return "Après-midi"
    elif 18 <= heure < 22:
        return "Soir"
    else:
        return "Nuit"


def categorie_depuis_humeur(score_humeur: Optional[int]) -> Optional[str]:
    """Suggère une catégorie en fonction du score d'humeur."""
    if score_humeur is None:
        return None
    if score_humeur <= 2:
        return "Stress"       # humeur basse → gestion du stress
    elif score_humeur == 3:
        return "Énergie"      # humeur neutre → boost d'énergie
    else:
        return "Concentration" # bonne humeur → productivité


async def recommander_routine(
    user_id: Optional[UUID],
    user: Optional[User],
    db: AsyncSession
) -> Optional[Routine]:
    """
    Algorithme de recommandation en 4 étapes :
    1. Filtre par moment de la journée
    2. Filtre par humeur du jour si disponible
    3. Exclut les routines déjà faites aujourd'hui
    4. Priorise la catégorie préférée de l'utilisateur
    Retourne la routine la plus pertinente, ou une routine aléatoire en fallback.
    """
    heure_actuelle = datetime.now().hour
    moment_actuel  = moment_depuis_heure(heure_actuelle)

    # ── 1. Récupère l'humeur du jour ─────────────────────────────────
    categorie_humeur = None
    if user_id:
        result_mood = await db.execute(
            select(UserMood)
            .where(UserMood.user_id == user_id)
            .where(UserMood.date == date.today())
        )
        mood_today = result_mood.scalar_one_or_none()
        if mood_today:
            categorie_humeur = categorie_depuis_humeur(mood_today.score)

    # ── 2. Routine déjà faite aujourd'hui ────────────────────────────
    ids_exclus = set()
    if user_id:
        depuis_minuit = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
        result_sessions = await db.execute(
            select(UserSession.routine_id)
            .where(UserSession.user_id == user_id)
            .where(UserSession.started_at >= depuis_minuit)
            .where(UserSession.completed == "oui")
        )
        ids_exclus = {row[0] for row in result_sessions.all() if row[0]}

    # ── 3. Catégorie préférée de l'utilisateur ───────────────────────
    categorie_preferee = None
    if user and user.objectif:
        mapping = {
            "stress": "Stress", "sommeil": "Sommeil",
            "concentration": "Concentration", "energie": "Énergie",
            "emotions": "Émotions",
        }
        categorie_preferee = mapping.get(user.objectif.lower())

    # ── 4. Construction de la requête ────────────────────────────────
    # Priorité : humeur > moment > catégorie préférée

    # Essai 1 : moment + humeur
    if categorie_humeur:
        query = (
            select(Routine)
            .where(Routine.categorie == categorie_humeur)
            .where(Routine.moment.in_([moment_actuel, "N'importe quand"]))
        )
        if ids_exclus:
            query = query.where(~Routine.id.in_(ids_exclus))
        if user and not (user.is_premium):
            query = query.where(Routine.is_premium == False)
        result = await db.execute(query.limit(1))
        routine = result.scalar_one_or_none()
        if routine:
            return routine

    # Essai 2 : catégorie préférée + moment
    if categorie_preferee:
        query = (
            select(Routine)
            .where(Routine.categorie == categorie_preferee)
            .where(Routine.moment.in_([moment_actuel, "N'importe quand"]))
        )
        if ids_exclus:
            query = query.where(~Routine.id.in_(ids_exclus))
        if user and not user.is_premium:
            query = query.where(Routine.is_premium == False)
        result = await db.execute(query.limit(1))
        routine = result.scalar_one_or_none()
        if routine:
            return routine

    # Essai 3 : uniquement par moment (fallback)
    query = (
        select(Routine)
        .where(Routine.moment.in_([moment_actuel, "N'importe quand"]))
        .where(Routine.is_premium == False)
    )
    if ids_exclus:
        query = query.where(~Routine.id.in_(ids_exclus))
    result = await db.execute(query.order_by(sqlfunc.random()).limit(1))
    return result.scalar_one_or_none()
```

---

## Étape 2 — Endpoint recommandation

### 2.1 Mettre à jour `app/routes/routines.py`

Ajoute cet endpoint **avant** `GET /{routine_id}` :

```python
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

from app.services.recommendations import recommander_routine
from app.services.auth_service import get_current_user
from app.schemas.routine import RoutineResponse

# ... imports existants ...

@router.get("/recommandee", response_model=RoutineResponse)
async def get_routine_recommandee(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Retourne la routine la plus adaptée à l'utilisateur en ce moment.
    Prend en compte : heure, humeur du jour, objectif, historique du jour.
    """
    routine = await recommander_routine(current_user.id, current_user, db)

    if not routine:
        # Fallback absolu : première routine gratuite disponible
        result = await db.execute(
            select(Routine).where(Routine.is_premium == False).limit(1)
        )
        routine = result.scalar_one_or_none()

    if not routine:
        raise HTTPException(status_code=404, detail="Aucune routine disponible")

    return routine


@router.get("/recommandee/anonyme", response_model=RoutineResponse)
async def get_routine_anonyme(
    db: AsyncSession = Depends(get_db),
):
    """
    Retourne une routine adaptée à l'heure du jour (sans authentification).
    Pour les visiteurs non connectés.
    """
    from app.services.recommendations import moment_depuis_heure
    from datetime import datetime

    heure = datetime.now().hour
    moment = moment_depuis_heure(heure)

    result = await db.execute(
        select(Routine)
        .where(Routine.moment.in_([moment, "N'importe quand"]))
        .where(Routine.is_premium == False)
        .order_by(sqlfunc.random())
        .limit(1)
    )
    routine = result.scalar_one_or_none()

    if not routine:
        result = await db.execute(select(Routine).where(Routine.is_premium == False).limit(1))
        routine = result.scalar_one_or_none()

    if not routine:
        raise HTTPException(status_code=404, detail="Aucune routine disponible")

    return routine
```

---

## Étape 3 — Cache Redis pour les recommandations

### 3.1 Créer `app/services/redis_service.py` (si pas encore fait)

```python
import redis.asyncio as aioredis
import json
from app.config import settings

redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)


async def get_cache(key: str):
    val = await redis_client.get(key)
    return json.loads(val) if val else None


async def set_cache(key: str, value: dict, ttl: int = 1800):
    """Cache pendant TTL secondes (défaut : 30 min)."""
    await redis_client.setex(key, ttl, json.dumps(value, default=str))


async def delete_cache(key: str):
    await redis_client.delete(key)
```

### 3.2 Mettre à jour l'endpoint pour utiliser le cache

Dans `app/routes/routines.py`, modifie `get_routine_recommandee` :

```python
from app.services.redis_service import get_cache, set_cache

@router.get("/recommandee", response_model=RoutineResponse)
async def get_routine_recommandee(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Clé de cache unique par utilisateur + heure (renouvelée toutes les heures)
    from datetime import datetime
    heure = datetime.now().hour
    cache_key = f"recommandation:{current_user.id}:{heure}"

    # Vérifier le cache
    cached = await get_cache(cache_key)
    if cached:
        return cached

    routine = await recommander_routine(current_user.id, current_user, db)

    if not routine:
        result = await db.execute(select(Routine).where(Routine.is_premium == False).limit(1))
        routine = result.scalar_one_or_none()

    if not routine:
        raise HTTPException(status_code=404, detail="Aucune routine disponible")

    # Mettre en cache (TTL : 30 min)
    routine_dict = {c.name: getattr(routine, c.name) for c in routine.__table__.columns}
    await set_cache(cache_key, routine_dict, ttl=1800)

    return routine
```

---

## Étape 4 — Frontend : carte "Pour toi"

### 4.1 Modifier `frontend/js/home.js`

Ajoute cette fonction en haut du fichier :

```javascript
async function afficherRoutineRecommandee(conteneurId) {
  const conteneur = document.getElementById(conteneurId);
  if (!conteneur) return;

  const token = getToken();
  const endpoint = token
    ? `${API_BASE}/routines/recommandee`
    : `${API_BASE}/routines/recommandee/anonyme`;
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

  try {
    const res = await fetch(endpoint, { headers });
    if (!res.ok) return;
    const routine = await res.json();

    const emojis = {
      Stress: '😮‍💨', Sommeil: '🌙', Concentration: '🎯',
      Mouvement: '🤸', Émotions: '💚', Énergie: '⚡',
    };
    const emoji = emojis[routine.categorie] || '✨';

    conteneur.innerHTML = `
      <div style="margin-bottom:20px;">
        <div style="font-size:0.82rem;font-weight:600;color:var(--couleur-principale);margin-bottom:8px;letter-spacing:0.3px;">
          ✨ Pour toi en ce moment
        </div>
        <a href="/routine.html?id=${routine.id}" style="text-decoration:none;display:block;">
          <div style="background:var(--couleur-principale);border-radius:var(--rayon-bordure);padding:18px;color:white;position:relative;overflow:hidden;box-shadow:0 4px 20px rgba(74,124,89,.3);">
            <div style="position:absolute;right:-15px;top:-15px;font-size:4rem;opacity:.2;">${emoji}</div>
            <div style="font-size:0.78rem;font-weight:600;opacity:.85;text-transform:uppercase;letter-spacing:0.5px;">${routine.categorie}</div>
            <div style="font-size:1.2rem;font-weight:700;margin-top:6px;line-height:1.3;">${routine.titre}</div>
            <div style="font-size:0.82rem;opacity:.85;margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${routine.description || ''}</div>
            <div style="font-size:0.78rem;opacity:.8;margin-top:12px;">⏱ ${routine.duree_minutes} min · ${routine.niveau}</div>
          </div>
        </a>
      </div>
    `;
  } catch {
    conteneur.innerHTML = '';
  }
}
```

### 4.2 Modifier `frontend/index.html`

Ajoute l'emplacement de la recommandation entre le sélecteur d'humeur et les filtres :

```html
<!-- Humeur du jour -->
<div id="humeur-du-jour"></div>

<!-- Routine recommandée -->
<div id="routine-recommandee"></div>

<!-- Filtres -->
<div class="filtres" id="filtres-categorie">
```

### 4.3 Appeler la fonction dans `home.js`

```javascript
// Dans home.js, au chargement :
initialiserHumeur();
afficherRoutineRecommandee('routine-recommandee');
afficherRoutines();
```

---

## Étape 5 — Invalider le cache lors d'une séance

Quand une routine est complétée, la recommandation doit être recalculée. Dans `sessions.js` :

```javascript
async function enregistrerSeance(routineId, routineTitre, categorie, dureeMinutes) {
  // ... code existant ...

  // Refresh la recommandation après la séance
  setTimeout(() => afficherRoutineRecommandee('routine-recommandee'), 500);
}
```

---

## Étape 6 — Tester

### Scénario de test

1. Lance le serveur : `inspir`
2. Ouvre la page d'accueil → une carte "Pour toi" s'affiche en haut
3. L'emoji et la catégorie correspondent au moment de la journée (matin/après-midi/soir)
4. Connecte-toi et note une humeur stressée (score 1-2) → la recommandation change pour "Stress"
5. Complète la routine recommandée → la carte se met à jour après 500ms
6. Sans connexion → la carte affiche quand même une routine adaptée à l'heure

### Test de l'endpoint

```bash
# Sans token (anonyme)
curl "http://localhost:8000/api/routines/recommandee/anonyme" | python3 -m json.tool

# Avec token
curl -H "Authorization: Bearer TON_TOKEN" "http://localhost:8000/api/routines/recommandee" | python3 -m json.tool
```

---

## Étape 7 — Commit Git

```bash
git add app/services/recommendations.py app/services/redis_service.py
git add app/routes/routines.py
git add frontend/js/home.js frontend/index.html
git commit -m "feat(semaine-10): recommandations personnalisées, cache Redis, carte Pour toi"
git push origin main
```

---

## Récapitulatif

| # | Action | Fichier |
|---|--------|---------|
| 1 | Service recommandation | `app/services/recommendations.py` |
| 2 | Service Redis cache | `app/services/redis_service.py` |
| 3 | Endpoint `/recommandee` | `app/routes/routines.py` |
| 4 | Endpoint `/recommandee/anonyme` | `app/routes/routines.py` |
| 5 | Carte "Pour toi" frontend | `frontend/js/home.js` |
| 6 | Intégration page accueil | `frontend/index.html` |
| 7 | Invalidation après séance | `frontend/js/sessions.js` |
| 8 | Tester | curl + page accueil |
| 9 | Commit | `git commit -m "feat(semaine-10)..."` |

---

## Livrable de fin de semaine 10

✅ `GET /api/routines/recommandee` retourne la routine adaptée (authentifié)  
✅ `GET /api/routines/recommandee/anonyme` fonctionne sans token  
✅ Algorithme prend en compte heure, humeur, objectif, historique  
✅ Cache Redis (30 min) évite les recalculs inutiles  
✅ Carte "Pour toi" visible sur la page d'accueil  

---

## Points d'attention

**L'algorithme est intentionnellement simple.** Pour le MVP, des règles basées sur l'humeur et l'heure suffisent. Plus tard, on peut enrichir avec un modèle ML ou des filtres collaboratifs.

**Redis doit tourner.** Si Redis est arrêté, le cache échoue silencieusement et la recommandation est recalculée à chaque requête — l'app continue de fonctionner.

**La recommandation change toutes les heures.** La clé de cache inclut l'heure (`heure`), donc une nouvelle recommandation est calculée naturellement toutes les heures.

---

*Prochaine étape : Semaine 11 — Déploiement sur Scaleway*
