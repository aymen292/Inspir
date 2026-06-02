# Semaine 6 — Suivi d'humeur quotidien

> Projet : Inspir — Bien-être & Micro-habitudes  
> Stack : FastAPI · PostgreSQL · Redis · Stripe · Scaleway  
> Dernière mise à jour : juin 2026

---

## Objectif de la semaine

À la fin de cette semaine, l'utilisateur peut **noter son humeur chaque jour** et **consulter son évolution** sur 7 jours. Concrètement :

- Le modèle `UserMood` est créé avec sa migration
- `POST /api/moods` enregistre l'humeur du jour (une seule fois par jour)
- `GET /api/moods/me` retourne l'historique des 7 derniers jours
- La page d'accueil propose un sélecteur d'humeur en haut
- La page profil affiche un mini-graphique de l'humeur de la semaine

---

## Prérequis

- [ ] Semaine 5 terminée : table `user_sessions` et endpoints sessions fonctionnels
- [ ] `GET /api/auth/me` fonctionne avec token JWT
- [ ] `getToken()` disponible dans `auth.js`

---

## Étape 1 — Modèle `UserMood`

### 1.1 Compléter `app/models/mood.py`

```python
from sqlalchemy import Column, String, Integer, Date, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base

class UserMood(Base):
    __tablename__ = "user_moods"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), nullable=False, index=True)
    date       = Column(Date, nullable=False, server_default=func.current_date())
    score      = Column(Integer, nullable=False)  # 1 (très mal) à 5 (très bien)
    emoji      = Column(String, nullable=True)    # copie de l'emoji pour l'affichage
    label      = Column(String, nullable=True)    # "Stressé", "Fatigué", "Bien"...
    note       = Column(Text, nullable=True)      # commentaire libre (optionnel)
```

> **Pourquoi `score` plutôt que texte libre ?** Un entier de 1 à 5 permet de tracer des courbes et de calculer des tendances. L'`emoji` et le `label` restent disponibles pour l'affichage.

### 1.2 Importer dans `app/models/__init__.py`

```python
from app.models.user import User
from app.models.routine import Routine
from app.models.session import UserSession
from app.models.mood import UserMood
```

### 1.3 Migration Alembic

```bash
alembic revision --autogenerate -m "create user_moods table"
alembic upgrade head
```

---

## Étape 2 — Schéma Pydantic

### 2.1 Créer `app/schemas/mood.py`

```python
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import date
from typing import Optional, List

class MoodCreate(BaseModel):
    score: int = Field(..., ge=1, le=5, description="Score de 1 (très mal) à 5 (très bien)")
    emoji: Optional[str]  = None
    label: Optional[str]  = None
    note:  Optional[str]  = None

class MoodResponse(BaseModel):
    id:     UUID
    date:   date
    score:  int
    emoji:  Optional[str]
    label:  Optional[str]
    note:   Optional[str]

    class Config:
        from_attributes = True

class MoodSemaine(BaseModel):
    """Résumé de l'humeur sur 7 jours pour l'affichage frontend."""
    jours:       List[MoodResponse]
    score_moyen: float
    tendance:    str   # "stable" | "hausse" | "baisse"
```

---

## Étape 3 — Endpoints moods

### 3.1 Compléter `app/routes/moods.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sqlfunc
from typing import List
from datetime import date, timedelta

from app.database import get_db
from app.models.mood import UserMood
from app.schemas.mood import MoodCreate, MoodResponse, MoodSemaine
from app.services.auth_service import get_current_user

router = APIRouter()


@router.post("/", response_model=MoodResponse, status_code=201)
async def log_mood(
    data: MoodCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Enregistre l'humeur du jour.
    Si une humeur a déjà été enregistrée aujourd'hui, elle est mise à jour.
    """
    aujourd_hui = date.today()

    result = await db.execute(
        select(UserMood)
        .where(UserMood.user_id == current_user.id)
        .where(UserMood.date == aujourd_hui)
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.score = data.score
        existing.emoji = data.emoji
        existing.label = data.label
        existing.note  = data.note
        await db.commit()
        await db.refresh(existing)
        return existing

    mood = UserMood(
        user_id=current_user.id,
        score=data.score,
        emoji=data.emoji,
        label=data.label,
        note=data.note,
    )
    db.add(mood)
    await db.commit()
    await db.refresh(mood)
    return mood


@router.get("/me", response_model=List[MoodResponse])
async def get_my_moods(
    jours: int = 7,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retourne les humeurs des N derniers jours (défaut : 7)."""
    depuis = date.today() - timedelta(days=jours)
    result = await db.execute(
        select(UserMood)
        .where(UserMood.user_id == current_user.id)
        .where(UserMood.date >= depuis)
        .order_by(UserMood.date.asc())
    )
    return result.scalars().all()


@router.get("/me/semaine", response_model=MoodSemaine)
async def get_mood_semaine(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Résumé de l'humeur sur les 7 derniers jours."""
    depuis = date.today() - timedelta(days=6)
    result = await db.execute(
        select(UserMood)
        .where(UserMood.user_id == current_user.id)
        .where(UserMood.date >= depuis)
        .order_by(UserMood.date.asc())
    )
    moods = result.scalars().all()

    if not moods:
        return MoodSemaine(jours=[], score_moyen=0.0, tendance="stable")

    scores = [m.score for m in moods]
    score_moyen = round(sum(scores) / len(scores), 1)

    # Tendance : compare première et deuxième moitié
    mi = len(scores) // 2
    if mi > 0:
        debut = sum(scores[:mi]) / mi
        fin   = sum(scores[mi:]) / (len(scores) - mi)
        if fin - debut >= 0.5:
            tendance = "hausse"
        elif debut - fin >= 0.5:
            tendance = "baisse"
        else:
            tendance = "stable"
    else:
        tendance = "stable"

    return MoodSemaine(jours=moods, score_moyen=score_moyen, tendance=tendance)


@router.get("/me/today", response_model=MoodResponse | None)
async def get_today_mood(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retourne l'humeur enregistrée aujourd'hui, ou null."""
    result = await db.execute(
        select(UserMood)
        .where(UserMood.user_id == current_user.id)
        .where(UserMood.date == date.today())
    )
    return result.scalar_one_or_none()
```

---

## Étape 4 — Frontend : sélecteur d'humeur sur la page d'accueil

### 4.1 Créer `frontend/js/mood.js`

```javascript
const MOODS = [
  { score: 1, emoji: '😔', label: 'Très mal' },
  { score: 2, emoji: '😕', label: 'Pas terrible' },
  { score: 3, emoji: '😐', label: 'Neutre' },
  { score: 4, emoji: '🙂', label: 'Bien' },
  { score: 5, emoji: '😄', label: 'Très bien' },
];

async function enregistrerHumeur(score, emoji, label) {
  const token = getToken();
  if (!token) return;

  try {
    await fetch(`${API_BASE}/moods/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ score, emoji, label }),
    });
  } catch (err) {
    console.warn('[Inspir] Humeur non enregistrée:', err);
  }
}

async function chargerHumeurAujourdhui() {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/moods/me/today`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function afficherSelecteurHumeur(conteneurId, moodActuel) {
  const conteneur = document.getElementById(conteneurId);
  if (!conteneur) return;

  const scoreActuel = moodActuel?.score || 0;

  conteneur.innerHTML = `
    <div style="background:var(--couleur-fond-carte);border-radius:var(--rayon-bordure);padding:16px 16px 14px;margin-bottom:20px;box-shadow:var(--ombre-carte);">
      <div style="font-size:0.88rem;font-weight:600;color:var(--couleur-texte);margin-bottom:12px;">Comment tu te sens aujourd'hui ?</div>
      <div style="display:flex;justify-content:space-between;gap:6px;">
        ${MOODS.map(m => `
          <button
            class="mood-btn ${m.score === scoreActuel ? 'actif' : ''}"
            data-score="${m.score}"
            data-emoji="${m.emoji}"
            data-label="${m.label}"
            title="${m.label}"
            style="
              flex:1; border:none; background:${m.score === scoreActuel ? 'var(--couleur-principale)' : 'var(--couleur-fond)'};
              border-radius:12px; padding:10px 4px; cursor:pointer;
              display:flex; flex-direction:column; align-items:center; gap:4px;
              transition:all 0.15s ease;
            ">
            <span style="font-size:1.5rem;">${m.emoji}</span>
          </button>
        `).join('')}
      </div>
      ${moodActuel ? `<div style="font-size:0.78rem;color:var(--couleur-texte-doux);margin-top:10px;text-align:center;">Humeur du jour : ${moodActuel.emoji} ${moodActuel.label}</div>` : ''}
    </div>
  `;

  // Gestion des clics
  conteneur.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const score = parseInt(btn.dataset.score);
      const emoji = btn.dataset.emoji;
      const label = btn.dataset.label;

      // Mise à jour visuelle immédiate
      conteneur.querySelectorAll('.mood-btn').forEach(b => {
        b.style.background = 'var(--couleur-fond)';
      });
      btn.style.background = 'var(--couleur-principale)';

      await enregistrerHumeur(score, emoji, label);
    });
  });
}
```

### 4.2 Ajouter le sélecteur dans `frontend/index.html`

Dans `index.html`, ajoute cet élément **entre le header et les filtres** :

```html
<!-- Humeur du jour -->
<div id="humeur-du-jour"></div>
```

Et en bas du body, ajoute `mood.js` avant `home.js` :

```html
<script src="/js/api.js"></script>
<script src="/js/auth.js"></script>
<script src="/js/mood.js"></script>
<script src="/js/home.js"></script>
```

### 4.3 Charger le sélecteur dans `frontend/js/home.js`

Au début de `home.js`, ajoute le chargement de l'humeur :

```javascript
// Chargement initial de l'humeur du jour
async function initialiserHumeur() {
  if (!getToken()) return; // pas connecté
  const moodActuel = await chargerHumeurAujourdhui();
  afficherSelecteurHumeur('humeur-du-jour', moodActuel);
}

// Appel au chargement de la page
initialiserHumeur();
afficherRoutines();
```

---

## Étape 5 — Affichage des humeurs sur la page profil

### 5.1 Ajouter dans `frontend/js/sessions.js`

```javascript
async function chargerHumeurSemaine() {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/moods/me/semaine`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.ok ? res.json() : null;
  } catch { return null; }
}
```

### 5.2 Mettre à jour `construireProfil` dans `profil.js`

Ajoute une section humeur dans le profil :

```javascript
function afficherTendance(tendance) {
  if (tendance === 'hausse') return '↗️ En amélioration';
  if (tendance === 'baisse') return '↘️ En baisse';
  return '→ Stable';
}

// Dans construireProfil, ajoute ce bloc après les stats :
const humeurHTML = humeurSemaine && humeurSemaine.jours.length > 0 ? `
  <div style="background:var(--couleur-fond-carte);border-radius:var(--rayon-bordure);padding:16px;margin-bottom:16px;box-shadow:var(--ombre-carte);">
    <div style="font-size:0.88rem;font-weight:600;margin-bottom:10px;">Humeur cette semaine</div>
    <div style="display:flex;gap:4px;align-items:flex-end;height:48px;">
      ${humeurSemaine.jours.map(m => `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
          <span style="font-size:${10 + m.score * 3}px;">${m.emoji}</span>
        </div>
      `).join('')}
    </div>
    <div style="font-size:0.78rem;color:var(--couleur-texte-doux);margin-top:8px;">
      Score moyen : ${humeurSemaine.score_moyen}/5 · ${afficherTendance(humeurSemaine.tendance)}
    </div>
  </div>
` : '';
```

---

## Étape 6 — Tester

### Scénario de test

1. Lance le serveur : `inspir`
2. Connecte-toi
3. Sur la page d'accueil → le sélecteur d'humeur s'affiche en haut
4. Clique sur un emoji → couleur change, call API en background
5. Recharge la page → l'emoji sélectionné est en surbrillance (humeur du jour chargée)
6. Dans `/docs` → `POST /api/moods` avec un token → vérifie la réponse
7. `GET /api/moods/me` → la liste s'affiche
8. Page profil → l'historique de l'humeur de la semaine s'affiche

### Test en base

```bash
psql -U bienetre_user -d bienetre_db -c "SELECT date, score, emoji, label FROM user_moods ORDER BY date DESC LIMIT 7;"
```

---

## Étape 7 — Commit Git

```bash
git add app/models/mood.py app/schemas/mood.py app/routes/moods.py
git add frontend/js/mood.js frontend/js/home.js frontend/js/profil.js
git add frontend/index.html frontend/profil.html
git commit -m "feat(semaine-6): suivi d'humeur quotidien, historique 7 jours, profil"
git push origin main
```

---

## Récapitulatif

| # | Action | Fichier |
|---|--------|---------|
| 1 | Modèle `UserMood` | `app/models/mood.py` |
| 2 | Migration | `alembic revision + upgrade head` |
| 3 | Schéma Pydantic | `app/schemas/mood.py` |
| 4 | Endpoints moods | `app/routes/moods.py` |
| 5 | JS sélecteur humeur | `frontend/js/mood.js` |
| 6 | Intégration page accueil | `frontend/index.html` + `home.js` |
| 7 | Historique page profil | `frontend/js/profil.js` |
| 8 | Tests | `/docs` + vérification base |
| 9 | Commit | `git commit -m "feat(semaine-6)..."` |

---

## Livrable de fin de semaine 6

✅ Table `user_moods` créée avec migration  
✅ `POST /api/moods` enregistre/met à jour l'humeur du jour  
✅ `GET /api/moods/me` retourne l'historique  
✅ `GET /api/moods/me/semaine` retourne score moyen et tendance  
✅ Sélecteur d'humeur sur la page d'accueil  
✅ Historique visuel des humeurs dans la page profil

---

## Points d'attention

**Une seule humeur par jour.** L'endpoint `POST /api/moods` met à jour l'entrée existante si elle date d'aujourd'hui — pas de doublons en base.

**L'humeur est optionnelle.** Si l'utilisateur ne sélectionne rien, aucune données n'est envoyée. L'app fonctionne sans cette fonctionnalité activée.

**Le graphique est minimaliste.** Les emojis de taille variable remplacent un vrai graphique SVG pour rester simple. Une librairie comme Chart.js peut être ajoutée plus tard.

---

*Prochaine étape : Semaine 7 — Streaks et gamification*
