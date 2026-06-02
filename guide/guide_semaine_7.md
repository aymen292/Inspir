# Semaine 7 — Streaks et gamification

> Projet : Inspir — Bien-être & Micro-habitudes  
> Stack : FastAPI · PostgreSQL · Redis · Stripe · Scaleway  
> Dernière mise à jour : juin 2026

---

## Objectif de la semaine

À la fin de cette semaine, l'application **récompense la régularité** de l'utilisateur. Concrètement :

- L'endpoint `GET /api/streaks/me` calcule la série de jours consécutifs réels depuis la base de données
- La page profil affiche la série actuelle, le record personnel et un calendrier des 7 derniers jours
- Un message de félicitation s'affiche quand une routine est terminée (si c'est la première du jour)
- Les badges sont débloqués automatiquement selon les jalons atteints

---

## Prérequis

- [ ] Semaine 5 terminée : table `user_sessions` avec données
- [ ] Semaine 6 terminée : table `user_moods` avec données
- [ ] `GET /api/sessions/me` retourne l'historique des séances

---

## Étape 1 — Logique de calcul des streaks (service)

### 1.1 Créer `app/services/streak_service.py`

```python
from datetime import date, timedelta
from typing import List
from sqlalchemy import select, func as sqlfunc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.session import UserSession
from uuid import UUID


async def calculer_streak(user_id: UUID, db: AsyncSession) -> dict:
    """
    Calcule la série actuelle, le record personnel et les jours actifs sur 30 jours.
    Retourne un dict avec : serie_actuelle, record, jours_actifs_30j, jours_semaine.
    """
    # Récupère toutes les dates de séances distinctes (triées décroissantes)
    result = await db.execute(
        select(sqlfunc.date(UserSession.started_at).label("jour"))
        .where(UserSession.user_id == user_id)
        .where(UserSession.completed == "oui")
        .group_by(sqlfunc.date(UserSession.started_at))
        .order_by(sqlfunc.date(UserSession.started_at).desc())
    )
    jours = [row.jour for row in result.all()]

    if not jours:
        return {
            "serie_actuelle": 0,
            "record": 0,
            "jours_actifs_30j": 0,
            "jours_semaine": [0, 0, 0, 0, 0, 0, 0],
            "derniere_seance": None,
        }

    # ── Série actuelle ──────────────────────────────────────────────────
    aujourd_hui = date.today()
    hier = aujourd_hui - timedelta(days=1)

    serie = 0
    # La série est valide si la dernière séance est aujourd'hui ou hier
    if jours[0] in (aujourd_hui, hier):
        serie = 1
        for i in range(1, len(jours)):
            if (jours[i - 1] - jours[i]).days == 1:
                serie += 1
            else:
                break

    # ── Record personnel ────────────────────────────────────────────────
    record = 0
    courante = 1
    for i in range(1, len(jours)):
        if (jours[i - 1] - jours[i]).days == 1:
            courante += 1
            record = max(record, courante)
        else:
            courante = 1
    record = max(record, serie, courante)

    # ── Jours actifs sur 30 jours ────────────────────────────────────────
    il_y_a_30j = aujourd_hui - timedelta(days=30)
    jours_actifs_30j = sum(1 for j in jours if j >= il_y_a_30j)

    # ── Calendrier de la semaine (L=0 … D=6) ────────────────────────────
    lundi = aujourd_hui - timedelta(days=aujourd_hui.weekday())
    jours_set = set(jours)
    jours_semaine = [
        1 if (lundi + timedelta(days=i)) in jours_set else 0
        for i in range(7)
    ]

    return {
        "serie_actuelle": serie,
        "record": record,
        "jours_actifs_30j": jours_actifs_30j,
        "jours_semaine": jours_semaine,
        "derniere_seance": jours[0].isoformat(),
    }


def calculer_badges(stats: dict, total_sessions: int) -> list[dict]:
    """Retourne la liste des badges avec leur statut (obtenu ou non)."""
    serie = stats["serie_actuelle"]
    record = stats["record"]

    return [
        {"id": "b1", "emoji": "🔥", "label": "7 jours de suite",     "obtenu": record >= 7},
        {"id": "b2", "emoji": "🌱", "label": "Première séance",       "obtenu": total_sessions >= 1},
        {"id": "b3", "emoji": "🌙", "label": "5 séances sommeil",     "obtenu": False},   # implémenté plus tard
        {"id": "b4", "emoji": "🎯", "label": "10 séances focus",      "obtenu": False},   # implémenté plus tard
        {"id": "b5", "emoji": "🌟", "label": "30 jours régulier",     "obtenu": stats["jours_actifs_30j"] >= 25},
        {"id": "b6", "emoji": "🏆", "label": "100 séances complètes", "obtenu": total_sessions >= 100},
    ]
```

---

## Étape 2 — Schéma et endpoint streaks

### 2.1 Créer `app/schemas/streak.py`

```python
from pydantic import BaseModel
from typing import List, Optional

class StreakResponse(BaseModel):
    serie_actuelle: int
    record: int
    jours_actifs_30j: int
    jours_semaine: List[int]   # 7 valeurs : 1=actif, 0=inactif (L→D)
    derniere_seance: Optional[str]
    badges: List[dict]
```

### 2.2 Compléter `app/routes/streaks.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sqlfunc

from app.database import get_db
from app.models.session import UserSession
from app.schemas.streak import StreakResponse
from app.services.auth_service import get_current_user
from app.services.streak_service import calculer_streak, calculer_badges

router = APIRouter()


@router.get("/me", response_model=StreakResponse)
async def get_my_streak(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retourne la série actuelle, le record et les badges de l'utilisateur."""
    stats = await calculer_streak(current_user.id, db)

    # Total sessions pour les badges
    result = await db.execute(
        select(sqlfunc.count(UserSession.id))
        .where(UserSession.user_id == current_user.id)
        .where(UserSession.completed == "oui")
    )
    total_sessions = result.scalar()

    badges = calculer_badges(stats, total_sessions)

    return StreakResponse(**stats, badges=badges)
```

### 2.3 Mettre à jour `app/routes/sessions.py` — corriger `serie_actuelle`

Dans `get_my_stats`, remplace `serie_actuelle=0` par un vrai calcul :

```python
from app.services.streak_service import calculer_streak

# Dans get_my_stats :
streak_data = await calculer_streak(current_user.id, db)

return SessionStats(
    total_sessions=row.total,
    total_minutes=row.minutes,
    sessions_semaine=sessions_semaine,
    serie_actuelle=streak_data["serie_actuelle"],
)
```

---

## Étape 3 — Frontend : page de progression

### 3.1 Créer `frontend/js/streak.js`

```javascript
async function chargerStreak() {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/streaks/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

function afficherCalendrierSemaine(jours) {
  const labels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  return `
    <div style="display:flex;gap:6px;justify-content:space-between;margin-top:12px;">
      ${jours.map((actif, i) => `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
          <div style="
            width:36px;height:36px;border-radius:10px;
            background:${actif ? 'var(--couleur-principale)' : 'var(--couleur-fond)'};
            border:1.5px solid ${actif ? 'transparent' : 'var(--couleur-bordure)'};
            display:flex;align-items:center;justify-content:center;
            font-size:${actif ? '1.1' : '0.85'}rem;
          ">${actif ? '🔥' : ''}</div>
          <span style="font-size:0.72rem;color:var(--couleur-texte-doux);">${labels[i]}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function afficherBadges(badges) {
  return `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:4px;">
      ${badges.map(b => `
        <div style="
          display:flex;flex-direction:column;align-items:center;gap:6px;
          opacity:${b.obtenu ? 1 : 0.4};
        ">
          <div style="
            width:52px;height:52px;border-radius:16px;
            background:${b.obtenu ? 'var(--couleur-fond-carte)' : 'rgba(255,255,255,.4)'};
            border:${b.obtenu ? '1.5px solid var(--couleur-principale)' : '1.5px dashed var(--couleur-bordure)'};
            display:flex;align-items:center;justify-content:center;
            font-size:1.5rem;box-shadow:${b.obtenu ? 'var(--ombre-carte)' : 'none'};
          ">${b.obtenu ? b.emoji : '🔒'}</div>
          <span style="font-size:0.72rem;color:var(--couleur-texte-doux);text-align:center;line-height:1.2;">${b.label}</span>
        </div>
      `).join('')}
    </div>
  `;
}
```

### 3.2 Créer `frontend/progression.html`

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#4a7c59" />
  <title>Ma progression — Inspir</title>
  <link rel="stylesheet" href="/css/style.css" />
  <link rel="manifest" href="/manifest.json" />
</head>
<body>

  <header class="app-header" style="display:flex;justify-content:space-between;align-items:center;">
    <a href="/" class="retour-btn">← Accueil</a>
    <span style="font-weight:700;">Ma progression</span>
    <span style="width:48px;"></span>
  </header>

  <main class="app-content" id="contenu-progression">
    <p class="chargement">Chargement…</p>
  </main>

  <script src="/js/api.js"></script>
  <script src="/js/auth.js"></script>
  <script src="/js/sessions.js"></script>
  <script src="/js/streak.js"></script>
  <script src="/js/progression.js"></script>
</body>
</html>
```

### 3.3 Créer `frontend/js/progression.js`

```javascript
async function afficherProgression() {
  const token = getToken();
  if (!token) { window.location.href = '/auth.html'; return; }

  const conteneur = document.getElementById('contenu-progression');

  try {
    const [streak, stats] = await Promise.all([
      chargerStreak(),
      chargerStats(),
    ]);

    if (!streak) {
      conteneur.innerHTML = '<p class="erreur">Impossible de charger les données.</p>';
      return;
    }

    conteneur.innerHTML = `

      <!-- Série actuelle -->
      <div style="background:var(--couleur-principale);border-radius:var(--rayon-bordure);padding:20px;color:white;margin-bottom:16px;text-align:center;">
        <div style="font-size:3rem;font-weight:800;">${streak.serie_actuelle}</div>
        <div style="font-size:1rem;opacity:.9;margin-top:2px;">jour${streak.serie_actuelle > 1 ? 's' : ''} de série 🔥</div>
        <div style="font-size:0.82rem;opacity:.75;margin-top:6px;">Record : ${streak.record} jours</div>
      </div>

      <!-- Calendrier semaine -->
      <div style="background:var(--couleur-fond-carte);border-radius:var(--rayon-bordure);padding:16px;margin-bottom:16px;box-shadow:var(--ombre-carte);">
        <div style="font-size:0.88rem;font-weight:600;">Cette semaine</div>
        ${afficherCalendrierSemaine(streak.jours_semaine)}
      </div>

      <!-- Stats globales -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;">
        ${[
          ['🧘', stats?.total_sessions ?? 0, 'séances'],
          ['⏱', stats?.total_minutes ?? 0, 'minutes'],
          ['📅', streak.jours_actifs_30j, 'jours/mois'],
        ].map(([e, n, l]) => `
          <div style="background:var(--couleur-fond-carte);border-radius:var(--rayon-bordure);padding:14px 8px;text-align:center;box-shadow:var(--ombre-carte);">
            <div style="font-size:1.2rem;">${e}</div>
            <div style="font-size:1.4rem;font-weight:700;color:var(--couleur-principale);margin-top:4px;">${n}</div>
            <div style="font-size:0.72rem;color:var(--couleur-texte-doux);">${l}</div>
          </div>
        `).join('')}
      </div>

      <!-- Badges -->
      <div style="background:var(--couleur-fond-carte);border-radius:var(--rayon-bordure);padding:16px;box-shadow:var(--ombre-carte);">
        <div style="font-size:0.88rem;font-weight:600;margin-bottom:4px;">Mes badges</div>
        ${afficherBadges(streak.badges)}
      </div>

    `;
  } catch (err) {
    conteneur.innerHTML = '<p class="erreur">Erreur lors du chargement.</p>';
    console.error(err);
  }
}

afficherProgression();
```

### 3.4 Ajouter le lien vers la progression dans `profil.html`

Dans `construireProfil` (profil.js), ajoute un lien :

```javascript
<a href="/progression.html" style="display:block;text-align:center;padding:14px;background:var(--couleur-fond);border-radius:var(--rayon-bordure);margin-bottom:16px;text-decoration:none;color:var(--couleur-principale);font-weight:600;">
  📊 Voir ma progression complète →
</a>
```

### 3.5 Ajouter la route dans `app/main.py`

```python
@app.get("/progression.html")
async def progression_page():
    return FileResponse(os.path.join(FRONTEND_DIR, "progression.html"))
```

---

## Étape 4 — Message de félicitation après une séance

### 4.1 Modifier `frontend/js/routine.js`

Dans la section "Routine terminée", ajoute un message personnalisé selon la série :

```javascript
// Après enregistrerSeance(...)
async function afficherFelicitations(routineTitre) {
  const streak = await chargerStreak();
  if (!streak) return;

  const msg = streak.serie_actuelle >= 7
    ? `🏆 ${streak.serie_actuelle} jours de suite ! Tu es incroyable !`
    : streak.serie_actuelle >= 3
    ? `🔥 ${streak.serie_actuelle} jours d'affilée, continue !`
    : `✅ "${routineTitre}" terminée. Bravo !`;

  // Affiche un toast discret en bas de l'écran
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:var(--couleur-principale);color:white;
    padding:12px 20px;border-radius:24px;font-size:0.88rem;font-weight:600;
    box-shadow:0 4px 20px rgba(0,0,0,.2);z-index:999;
    animation:fadeIn .3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
```

---

## Étape 5 — Tester

### Scénario de test

1. Lance le serveur : `inspir`
2. Connecte-toi et complète 2 routines
3. `GET /api/streaks/me` → vérifie `serie_actuelle` et `jours_semaine`
4. Ouvre `http://localhost:8000/progression.html` → les stats s'affichent
5. Complète une routine → le toast de félicitations s'affiche
6. Page profil → lien vers la progression disponible

### Test du calcul de série en base

```bash
psql -U bienetre_user -d bienetre_db -c \
  "SELECT DATE(started_at) as jour, COUNT(*) FROM user_sessions GROUP BY DATE(started_at) ORDER BY jour DESC LIMIT 10;"
```

---

## Étape 6 — Commit Git

```bash
git add app/services/streak_service.py app/schemas/streak.py app/routes/streaks.py
git add app/routes/sessions.py
git add frontend/js/streak.js frontend/js/progression.js frontend/js/routine.js
git add frontend/progression.html frontend/profil.html app/main.py
git commit -m "feat(semaine-7): streaks, badges, page progression, toast félicitations"
git push origin main
```

---

## Récapitulatif

| # | Action | Fichier |
|---|--------|---------|
| 1 | Service calcul streak | `app/services/streak_service.py` |
| 2 | Schéma streak | `app/schemas/streak.py` |
| 3 | Endpoint `/api/streaks/me` | `app/routes/streaks.py` |
| 4 | Corriger `serie_actuelle` | `app/routes/sessions.py` |
| 5 | JS streak + badges | `frontend/js/streak.js` |
| 6 | Page progression | `frontend/progression.html` + `progression.js` |
| 7 | Toast félicitations | `frontend/js/routine.js` |
| 8 | Route dans main.py | `app/main.py` |
| 9 | Commit | `git commit -m "feat(semaine-7)..."` |

---

## Livrable de fin de semaine 7

✅ Calcul réel de la série depuis les séances en base  
✅ `GET /api/streaks/me` retourne série, record et badges  
✅ Page `/progression.html` avec calendrier, stats et badges  
✅ Badges débloqués automatiquement selon les jalons  
✅ Toast de félicitations après chaque routine terminée

---

## Points d'attention

**La série se casse si l'utilisateur saute un jour.** C'est intentionnel — c'est la motivation principale. Un message bienveillant ("Tu as manqué hier, mais tu peux recommencer aujourd'hui !") peut être ajouté.

**Les badges `sommeil` et `focus`** nécessitent de filtrer les sessions par catégorie — c'est possible avec les données déjà en base, à implémenter si besoin.

**Redis non utilisé ici.** Le calcul de streak est fait en PostgreSQL à chaque requête. Pour les performances à grande échelle, on pourrait cacher le résultat dans Redis (TTL de 1h). Pour le MVP, PostgreSQL suffit.

---

*Prochaine étape : Semaine 8 — Notifications push Web*
