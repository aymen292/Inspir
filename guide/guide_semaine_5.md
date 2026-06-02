# Semaine 5 — Suivi des séances utilisateur

> Projet : Inspir — Bien-être & Micro-habitudes  
> Stack : FastAPI · PostgreSQL · Redis · Stripe · Scaleway  
> Dernière mise à jour : juin 2026

---

## Objectif de la semaine

À la fin de cette semaine, chaque séance complétée est **enregistrée en base de données**. Concrètement :

- Le modèle `UserSession` est créé avec la migration Alembic
- `POST /api/sessions` enregistre une séance terminée (authentifié)
- `GET /api/sessions/me` retourne l'historique de l'utilisateur connecté
- Le frontend appelle l'API dès qu'une routine est terminée
- La page profil affiche les stats réelles : nombre de séances et minutes totales

---

## Prérequis

Avant de commencer, vérifie que la semaine 4 est bien terminée :

- [ ] `POST /api/auth/register` et `POST /api/auth/login` fonctionnent
- [ ] `GET /api/auth/me` retourne le profil connecté (token JWT valide)
- [ ] Les pages `auth.html`, `onboarding.html` et `profil.html` sont en place
- [ ] `getToken()` et `sauvegarderToken()` sont disponibles dans `auth.js`

---

## Étape 1 — Modèle `UserSession`

### 1.1 Compléter `app/models/session.py`

```python
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base

class UserSession(Base):
    __tablename__ = "user_sessions"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id        = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    routine_id     = Column(UUID(as_uuid=True), ForeignKey("routines.id", ondelete="SET NULL"), nullable=True)
    routine_titre  = Column(String, nullable=True)   # copie du titre au moment de la séance
    categorie      = Column(String, nullable=True)
    duree_minutes  = Column(Integer, nullable=False)
    completed      = Column(String, default="oui")   # oui / partielle / abandon
    started_at     = Column(DateTime(timezone=True), server_default=func.now())
```

> **Pourquoi copier `routine_titre` ?** Si une routine est supprimée plus tard, l'historique reste lisible grâce à cette copie dénormalisée.

### 1.2 Importer le modèle dans `app/models/__init__.py`

```python
from app.models.user import User
from app.models.routine import Routine
from app.models.session import UserSession
```

### 1.3 Créer et appliquer la migration

```bash
alembic revision --autogenerate -m "create user_sessions table"
alembic upgrade head
```

Vérifie que la table existe :
```bash
psql -U bienetre_user -d bienetre_db -c "\d user_sessions"
```

---

## Étape 2 — Schéma Pydantic pour les sessions

### 2.1 Créer `app/schemas/session.py`

```python
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class SessionCreate(BaseModel):
    routine_id:    Optional[UUID] = None
    routine_titre: Optional[str]  = None
    categorie:     Optional[str]  = None
    duree_minutes: int
    completed:     str = "oui"     # oui | partielle | abandon

class SessionResponse(BaseModel):
    id:            UUID
    routine_id:    Optional[UUID]
    routine_titre: Optional[str]
    categorie:     Optional[str]
    duree_minutes: int
    completed:     str
    started_at:    datetime

    class Config:
        from_attributes = True

class SessionStats(BaseModel):
    """Statistiques agrégées pour la page profil."""
    total_sessions: int
    total_minutes:  int
    sessions_semaine: int    # 7 derniers jours
    serie_actuelle:   int    # jours consécutifs (calculé ici)
```

---

## Étape 3 — Endpoints sessions

### 3.1 Compléter `app/routes/sessions.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sqlfunc
from typing import List
from datetime import datetime, timedelta, timezone
from uuid import UUID

from app.database import get_db
from app.models.session import UserSession
from app.schemas.session import SessionCreate, SessionResponse, SessionStats
from app.services.auth_service import get_current_user

router = APIRouter()


@router.post("/", response_model=SessionResponse, status_code=201)
async def create_session(
    data: SessionCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Enregistre une séance terminée pour l'utilisateur connecté."""
    session = UserSession(
        user_id=current_user.id,
        routine_id=data.routine_id,
        routine_titre=data.routine_titre,
        categorie=data.categorie,
        duree_minutes=data.duree_minutes,
        completed=data.completed,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/me", response_model=List[SessionResponse])
async def get_my_sessions(
    limit: int = 20,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retourne les dernières séances de l'utilisateur connecté."""
    result = await db.execute(
        select(UserSession)
        .where(UserSession.user_id == current_user.id)
        .order_by(UserSession.started_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/me/stats", response_model=SessionStats)
async def get_my_stats(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retourne les statistiques globales de l'utilisateur."""
    now = datetime.now(timezone.utc)
    sept_jours = now - timedelta(days=7)

    # Total sessions et minutes
    result = await db.execute(
        select(
            sqlfunc.count(UserSession.id).label("total"),
            sqlfunc.coalesce(sqlfunc.sum(UserSession.duree_minutes), 0).label("minutes")
        ).where(UserSession.user_id == current_user.id)
    )
    row = result.one()

    # Sessions cette semaine
    result_semaine = await db.execute(
        select(sqlfunc.count(UserSession.id))
        .where(UserSession.user_id == current_user.id)
        .where(UserSession.started_at >= sept_jours)
    )
    sessions_semaine = result_semaine.scalar()

    return SessionStats(
        total_sessions=row.total,
        total_minutes=row.minutes,
        sessions_semaine=sessions_semaine,
        serie_actuelle=0,    # sera calculé en semaine 8
    )
```

---

## Étape 4 — Frontend : enregistrer une séance terminée

### 4.1 Créer `frontend/js/sessions.js`

```javascript
/**
 * Enregistre une séance terminée auprès de l'API.
 * Appelé depuis routine.js quand l'utilisateur clique sur "Routine terminée".
 */
async function enregistrerSeance(routineId, routineTitre, categorie, dureeMinutes) {
  const token = getToken();
  if (!token) return; // utilisateur non connecté, on skip silencieusement

  try {
    const res = await fetch(`${API_BASE}/sessions/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        routine_id:    routineId,
        routine_titre: routineTitre,
        categorie:     categorie,
        duree_minutes: dureeMinutes,
        completed:     'oui',
      }),
    });
    if (!res.ok) console.warn('[Inspir] Séance non enregistrée:', res.status);
  } catch (err) {
    console.warn('[Inspir] Erreur enregistrement séance:', err);
  }
}

async function chargerStats() {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/sessions/me/stats`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
```

### 4.2 Ajouter `sessions.js` dans `routine.html`

Dans `frontend/routine.html`, ajoute avant la balise `</body>` :

```html
<script src="/js/api.js"></script>
<script src="/js/auth.js"></script>
<script src="/js/sessions.js"></script>
<script src="/js/routine.js"></script>
```

### 4.3 Modifier `frontend/js/routine.js` — appel API à la fin d'une séance

Dans la fonction `initialiserInteractions`, repère ce bloc :

```javascript
if (etapeActuelle > routine.etapes.length) {
  btnSuivant.textContent = '🎉 Routine terminée !';
  btnSuivant.disabled = true;
  btnSuivant.style.background = '#b0c9b8';
  clearInterval(minuteurInterval);
```

Et ajoute l'appel API juste après `clearInterval` :

```javascript
  // Enregistre la séance si l'utilisateur est connecté
  enregistrerSeance(
    routine.id,
    routine.titre,
    routine.categorie,
    routine.duree_minutes
  );
```

### 4.4 Mettre à jour `frontend/js/profil.js` — afficher les stats réelles

Dans la fonction `chargerProfil`, remplace la section stats statique par :

```javascript
async function chargerProfil() {
  const token = getToken();
  if (!token) { window.location.href = '/auth.html'; return; }

  try {
    const [user, stats] = await Promise.all([
      apiGetMe(token),
      chargerStats(),
    ]);
    sauvegarderUser(user);
    document.getElementById('contenu-profil').innerHTML = construireProfil(user, stats);
  } catch (err) {
    supprimerToken();
    window.location.href = '/auth.html';
  }
}
```

Modifie `construireProfil` pour accepter `stats` en second paramètre et l'afficher :

```javascript
function construireProfil(user, stats) {
  const statsHTML = stats ? `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;">
      <div style="background:var(--couleur-fond);border-radius:10px;padding:12px;text-align:center;">
        <div style="font-size:1.6rem;font-weight:700;color:var(--couleur-principale);">${stats.total_sessions}</div>
        <div style="font-size:0.78rem;color:var(--couleur-texte-doux);margin-top:2px;">séances</div>
      </div>
      <div style="background:var(--couleur-fond);border-radius:10px;padding:12px;text-align:center;">
        <div style="font-size:1.6rem;font-weight:700;color:var(--couleur-principale);">${stats.total_minutes}</div>
        <div style="font-size:0.78rem;color:var(--couleur-texte-doux);margin-top:2px;">minutes</div>
      </div>
    </div>
  ` : '';
  // ... reste du HTML de profil inchangé, avec statsHTML injecté
}
```

### 4.5 Ajouter `sessions.js` dans `profil.html`

```html
<script src="/js/api.js"></script>
<script src="/js/auth.js"></script>
<script src="/js/sessions.js"></script>
<script src="/js/profil.js"></script>
```

---

## Étape 5 — Mettre à jour `app/main.py`

Ajoute le montage du dossier `assets` (nécessaire pour la suite) si ce n'est pas encore fait, et vérifie que `sessions.js` est accessible via le montage `/js` existant — c'est automatique si le fichier est dans `frontend/js/`.

---

## Étape 6 — Tester de bout en bout

### Scénario de test

1. Lance le serveur : `inspir`
2. Connecte-toi sur `http://localhost:8000/auth.html`
3. Ouvre une routine depuis la page d'accueil
4. Clique sur toutes les étapes jusqu'à "Routine terminée"
5. Ouvre `http://localhost:8000/docs` → `POST /api/sessions` → vérifie la réponse
6. Va sur `GET /api/sessions/me` → la séance doit apparaître
7. Va sur `GET /api/sessions/me/stats` → les stats doivent être mises à jour
8. Va sur `http://localhost:8000/profil.html` → les stats s'affichent

### Test direct en base

```bash
psql -U bienetre_user -d bienetre_db -c "SELECT routine_titre, duree_minutes, started_at FROM user_sessions ORDER BY started_at DESC LIMIT 5;"
```

---

## Étape 7 — Commit Git

```bash
git add app/models/session.py app/schemas/session.py app/routes/sessions.py
git add frontend/js/sessions.js frontend/js/routine.js frontend/js/profil.js
git add frontend/routine.html frontend/profil.html
git commit -m "feat(semaine-5): suivi des séances utilisateur, stats profil"
git push origin main
```

---

## Récapitulatif

| # | Action | Fichier |
|---|--------|---------|
| 1 | Modèle `UserSession` | `app/models/session.py` |
| 2 | Import dans `__init__` | `app/models/__init__.py` |
| 3 | Migration Alembic | `alembic revision + upgrade head` |
| 4 | Schéma Pydantic | `app/schemas/session.py` |
| 5 | Endpoints sessions | `app/routes/sessions.py` |
| 6 | JS sessions | `frontend/js/sessions.js` |
| 7 | Appel API fin de routine | `frontend/js/routine.js` |
| 8 | Stats dans profil | `frontend/js/profil.js` |
| 9 | Tester de bout en bout | `http://localhost:8000/docs` |
| 10 | Commit | `git commit -m "feat(semaine-5)..."` |

---

## Livrable de fin de semaine 5

✅ Table `user_sessions` créée en base  
✅ `POST /api/sessions` enregistre une séance (authentifié)  
✅ `GET /api/sessions/me` retourne l'historique  
✅ `GET /api/sessions/me/stats` retourne les stats agrégées  
✅ Le frontend appelle l'API dès qu'une routine est terminée  
✅ La page profil affiche les vraies statistiques (séances, minutes)

---

## Points d'attention

**L'enregistrement est silencieux.** Si l'utilisateur n'est pas connecté, `enregistrerSeance` skip sans erreur — la routine reste utilisable sans compte.

**`routine_id` peut être `null`.** Le champ `ForeignKey` est nullable car la routine pourrait être supprimée plus tard. La copie de `routine_titre` garantit la lisibilité de l'historique.

**`serie_actuelle` retourne 0 pour l'instant.** Le calcul de la série de jours consécutifs sera implémenté en semaine 8 avec l'endpoint `/api/streaks/me`.

---

*Prochaine étape : Semaine 6 — Suivi d'humeur quotidien*
