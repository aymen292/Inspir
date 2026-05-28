# Semaine 4 — Authentification et profil utilisateur

> Projet : Application Bien-être & Micro-habitudes  
> Stack : FastAPI · PostgreSQL · Redis · Auth.js · Stripe · Scaleway  
> Dernière mise à jour : mai 2026

---

## Objectif de la semaine

À la fin de cette semaine, l'utilisateur peut **créer un compte, se connecter et avoir un profil persistant**. Concrètement :

- Les formulaires d'inscription et de connexion sont intégrés au frontend
- L'onboarding en 4 questions guide le nouvel utilisateur
- Les réponses d'onboarding sont sauvegardées dans la base de données
- Une page profil affiche les informations de l'utilisateur connecté
- Les routes API qui nécessitent une connexion sont protégées par un middleware JWT

---

## Prérequis

Avant de commencer, vérifie que la semaine 3 est bien terminée :

- [ ] La PWA s'affiche sur `http://localhost:8000`
- [ ] La liste des routines et les pages de détail fonctionnent
- [ ] Le Service Worker est enregistré (onglet Application dans les DevTools)
- [ ] `POST /api/auth/register` et `POST /api/auth/login` fonctionnent (semaine 1)

---

## Étape 1 — Middleware d'authentification JWT (backend)

Le middleware vérifie le token JWT dans le header `Authorization` pour les routes protégées.

### 1.1 Créer `app/services/auth_service.py` (version complète)

Remplace le contenu du fichier créé en semaine 1 :

```python
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {**data, "exp": expire},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
):
    """Dépendance FastAPI : vérifie le JWT et retourne l'utilisateur connecté."""
    from app.models.user import User

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception

    return user


async def get_current_premium_user(current_user=Depends(get_current_user)):
    """Dépendance : l'utilisateur doit être premium."""
    if not current_user.is_premium:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cette fonctionnalité est réservée aux abonnés premium"
        )
    return current_user
```

### 1.2 Mettre à jour `app/schemas/user.py`

Ajoute les schémas pour l'onboarding et la mise à jour du profil :

```python
from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import time
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    prenom: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    prenom: Optional[str]
    objectif: Optional[str]
    profil_vie: Optional[str]
    disponibilite: Optional[int]
    heure_rappel: Optional[time]
    is_premium: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class OnboardingUpdate(BaseModel):
    """Les 4 questions de l'onboarding."""
    prenom: Optional[str] = None
    objectif: Optional[str] = None           # stress, sommeil, concentration, energie, emotions
    profil_vie: Optional[str] = None         # etudiant, salarie, parent, senior, freelance
    disponibilite: Optional[int] = None      # minutes par jour : 5, 10, 15, 30
    heure_rappel: Optional[time] = None      # ex: "08:00:00"


class UserUpdate(BaseModel):
    """Mise à jour générale du profil."""
    prenom: Optional[str] = None
    objectif: Optional[str] = None
    profil_vie: Optional[str] = None
    disponibilite: Optional[int] = None
    heure_rappel: Optional[time] = None
```

### 1.3 Mettre à jour `app/routes/auth.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserCreate, UserLogin, UserResponse, Token,
    OnboardingUpdate, UserUpdate
)
from app.services.auth_service import (
    get_password_hash, verify_password,
    create_access_token, get_current_user
)

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        prenom=user_data.prenom,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Retourne le profil de l'utilisateur connecté."""
    return current_user


@router.put("/onboarding", response_model=UserResponse)
async def update_onboarding(
    data: OnboardingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Sauvegarde les réponses de l'onboarding."""
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mise à jour du profil utilisateur."""
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.delete("/account", status_code=204)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Suppression complète du compte (conformité RGPD)."""
    await db.delete(current_user)
    await db.commit()
```

---

## Étape 2 — Pages frontend : inscription et connexion

### 2.1 Créer `frontend/auth.html`

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#4a7c59" />
  <title>Connexion — Inspir</title>
  <link rel="stylesheet" href="/css/style.css" />
  <link rel="stylesheet" href="/css/auth.css" />
  <link rel="manifest" href="/manifest.json" />
</head>
<body>

  <header class="app-header">
    <h1>🌿 Inspir</h1>
    <p id="auth-sous-titre">Connexion</p>
  </header>

  <main class="app-content">

    <!-- Onglets -->
    <div class="auth-onglets">
      <button class="onglet actif" id="onglet-connexion">Se connecter</button>
      <button class="onglet" id="onglet-inscription">Créer un compte</button>
    </div>

    <!-- Formulaire de connexion -->
    <div id="form-connexion">
      <div class="form-groupe">
        <label for="email-co">Email</label>
        <input type="email" id="email-co" placeholder="ton@email.fr" autocomplete="email" />
      </div>
      <div class="form-groupe">
        <label for="mdp-co">Mot de passe</label>
        <input type="password" id="mdp-co" placeholder="••••••••" autocomplete="current-password" />
      </div>
      <p class="erreur-form" id="erreur-connexion"></p>
      <button class="btn-commencer" id="btn-connexion">Se connecter</button>
    </div>

    <!-- Formulaire d'inscription -->
    <div id="form-inscription" style="display:none;">
      <div class="form-groupe">
        <label for="prenom-in">Prénom</label>
        <input type="text" id="prenom-in" placeholder="Marie" autocomplete="given-name" />
      </div>
      <div class="form-groupe">
        <label for="email-in">Email</label>
        <input type="email" id="email-in" placeholder="ton@email.fr" autocomplete="email" />
      </div>
      <div class="form-groupe">
        <label for="mdp-in">Mot de passe</label>
        <input type="password" id="mdp-in" placeholder="8 caractères minimum" autocomplete="new-password" />
      </div>
      <p class="erreur-form" id="erreur-inscription"></p>
      <button class="btn-commencer" id="btn-inscription">Créer mon compte</button>
    </div>

  </main>

  <script src="/js/api.js"></script>
  <script src="/js/auth.js"></script>
</body>
</html>
```

### 2.2 Créer `frontend/css/auth.css`

```css
.auth-onglets {
  display: flex;
  background: var(--couleur-fond-carte);
  border-radius: var(--rayon-bordure);
  padding: 4px;
  margin-bottom: 24px;
  border: 1.5px solid var(--couleur-bordure);
}

.onglet {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--couleur-texte-doux);
  cursor: pointer;
  transition: all 0.15s ease;
}

.onglet.actif {
  background: var(--couleur-principale);
  color: white;
  font-weight: 700;
}

.form-groupe {
  margin-bottom: 16px;
}

.form-groupe label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--couleur-texte);
  margin-bottom: 6px;
}

.form-groupe input {
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid var(--couleur-bordure);
  border-radius: 10px;
  font-size: 0.95rem;
  background: var(--couleur-fond-carte);
  color: var(--couleur-texte);
  transition: border-color 0.15s ease;
  outline: none;
}

.form-groupe input:focus {
  border-color: var(--couleur-principale);
}

.erreur-form {
  color: #c0392b;
  font-size: 0.83rem;
  margin-bottom: 12px;
  min-height: 18px;
}

/* Onboarding */
.onboarding-question {
  margin-bottom: 28px;
}

.onboarding-question h3 {
  font-size: 1.05rem;
  font-weight: 600;
  margin-bottom: 14px;
  line-height: 1.4;
}

.options-grille {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.option-carte {
  border: 2px solid var(--couleur-bordure);
  border-radius: 12px;
  padding: 12px 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s ease;
  background: var(--couleur-fond-carte);
}

.option-carte:hover {
  border-color: var(--couleur-principale-claire);
}

.option-carte.selectionnee {
  border-color: var(--couleur-principale);
  background: #eef4f0;
}

.option-emoji { font-size: 1.5rem; display: block; margin-bottom: 6px; }
.option-label { font-size: 0.82rem; font-weight: 600; color: var(--couleur-texte); }

.progression-onboarding {
  display: flex;
  gap: 6px;
  margin-bottom: 28px;
}

.point-progression {
  flex: 1;
  height: 4px;
  background: var(--couleur-bordure);
  border-radius: 2px;
  transition: background 0.2s ease;
}

.point-progression.actif { background: var(--couleur-principale); }
```

### 2.3 Créer `frontend/js/auth.js`

```javascript
// ── Utilitaires ────────────────────────────────────────────────────
function sauvegarderToken(token) {
  localStorage.setItem('inspir_token', token);
}

function getToken() {
  return localStorage.getItem('inspir_token');
}

function supprimerToken() {
  localStorage.removeItem('inspir_token');
  localStorage.removeItem('inspir_user');
}

function sauvegarderUser(user) {
  localStorage.setItem('inspir_user', JSON.stringify(user));
}

function getUser() {
  const u = localStorage.getItem('inspir_user');
  return u ? JSON.parse(u) : null;
}

// ── Appels API ─────────────────────────────────────────────────────
async function apiRegister(prenom, email, password) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prenom, email, password })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Erreur lors de l\'inscription');
  }
  return res.json();
}

async function apiLogin(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Email ou mot de passe incorrect');
  }
  return res.json();
}

async function apiGetMe(token) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Session expirée');
  return res.json();
}

async function apiOnboarding(token, data) {
  const res = await fetch(`${API_BASE}/auth/onboarding`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Erreur lors de la sauvegarde');
  return res.json();
}

// ── Logique des formulaires ────────────────────────────────────────
if (document.getElementById('btn-connexion')) {

  // Onglets
  document.getElementById('onglet-connexion').addEventListener('click', () => {
    document.getElementById('form-connexion').style.display = 'block';
    document.getElementById('form-inscription').style.display = 'none';
    document.getElementById('onglet-connexion').classList.add('actif');
    document.getElementById('onglet-inscription').classList.remove('actif');
    document.getElementById('auth-sous-titre').textContent = 'Connexion';
  });

  document.getElementById('onglet-inscription').addEventListener('click', () => {
    document.getElementById('form-connexion').style.display = 'none';
    document.getElementById('form-inscription').style.display = 'block';
    document.getElementById('onglet-inscription').classList.add('actif');
    document.getElementById('onglet-connexion').classList.remove('actif');
    document.getElementById('auth-sous-titre').textContent = 'Créer un compte';
  });

  // Connexion
  document.getElementById('btn-connexion').addEventListener('click', async () => {
    const email = document.getElementById('email-co').value.trim();
    const password = document.getElementById('mdp-co').value;
    const errEl = document.getElementById('erreur-connexion');
    errEl.textContent = '';

    if (!email || !password) {
      errEl.textContent = 'Remplis tous les champs.';
      return;
    }

    try {
      const { access_token } = await apiLogin(email, password);
      sauvegarderToken(access_token);
      const user = await apiGetMe(access_token);
      sauvegarderUser(user);

      // Redirection selon l'état d'onboarding
      if (!user.objectif) {
        window.location.href = '/onboarding.html';
      } else {
        window.location.href = '/';
      }
    } catch (err) {
      errEl.textContent = err.message;
    }
  });

  // Inscription
  document.getElementById('btn-inscription').addEventListener('click', async () => {
    const prenom = document.getElementById('prenom-in').value.trim();
    const email = document.getElementById('email-in').value.trim();
    const password = document.getElementById('mdp-in').value;
    const errEl = document.getElementById('erreur-inscription');
    errEl.textContent = '';

    if (!email || !password) {
      errEl.textContent = 'Email et mot de passe sont requis.';
      return;
    }
    if (password.length < 8) {
      errEl.textContent = 'Le mot de passe doit faire au moins 8 caractères.';
      return;
    }

    try {
      await apiRegister(prenom, email, password);
      const { access_token } = await apiLogin(email, password);
      sauvegarderToken(access_token);
      window.location.href = '/onboarding.html';
    } catch (err) {
      errEl.textContent = err.message;
    }
  });
}
```

---

## Étape 3 — Page d'onboarding (4 questions)

### 3.1 Créer `frontend/onboarding.html`

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#4a7c59" />
  <title>Personnalisation — Inspir</title>
  <link rel="stylesheet" href="/css/style.css" />
  <link rel="stylesheet" href="/css/auth.css" />
  <link rel="manifest" href="/manifest.json" />
</head>
<body>

  <header class="app-header">
    <h1>🌿 Personnalise ton expérience</h1>
    <p id="onboarding-sous-titre">Question 1 sur 4</p>
  </header>

  <main class="app-content">
    <div class="progression-onboarding">
      <div class="point-progression actif" id="prog-1"></div>
      <div class="point-progression" id="prog-2"></div>
      <div class="point-progression" id="prog-3"></div>
      <div class="point-progression" id="prog-4"></div>
    </div>
    <div id="contenu-onboarding"></div>
    <button class="btn-commencer" id="btn-suivant" style="display:none;">Continuer →</button>
  </main>

  <script src="/js/api.js"></script>
  <script src="/js/auth.js"></script>
  <script src="/js/onboarding.js"></script>
</body>
</html>
```

### 3.2 Créer `frontend/js/onboarding.js`

```javascript
const ETAPES = [
  {
    id: 'objectif',
    question: 'Quel est ton objectif principal ?',
    options: [
      { valeur: 'stress', emoji: '😮‍💨', label: 'Réduire le stress' },
      { valeur: 'sommeil', emoji: '🌙', label: 'Mieux dormir' },
      { valeur: 'concentration', emoji: '🎯', label: 'Me concentrer' },
      { valeur: 'energie', emoji: '⚡', label: 'Retrouver de l\'énergie' },
    ]
  },
  {
    id: 'profil_vie',
    question: 'Quel est ton profil de vie ?',
    options: [
      { valeur: 'etudiant', emoji: '📚', label: 'Étudiant(e)' },
      { valeur: 'salarie', emoji: '💼', label: 'Salarié(e)' },
      { valeur: 'parent', emoji: '👨‍👩‍👦', label: 'Parent' },
      { valeur: 'senior', emoji: '🌻', label: 'Senior actif' },
    ]
  },
  {
    id: 'disponibilite',
    question: 'Combien de temps as-tu par jour ?',
    options: [
      { valeur: 5, emoji: '⚡', label: '5 minutes' },
      { valeur: 10, emoji: '🕐', label: '10 minutes' },
      { valeur: 15, emoji: '🕒', label: '15 minutes' },
      { valeur: 30, emoji: '🌟', label: '30 minutes' },
    ]
  },
  {
    id: 'heure_rappel',
    question: 'À quelle heure veux-tu ton rappel quotidien ?',
    options: [
      { valeur: '08:00:00', emoji: '🌅', label: '8h — Matin' },
      { valeur: '12:30:00', emoji: '☀️', label: '12h30 — Midi' },
      { valeur: '18:00:00', emoji: '🌆', label: '18h — Soir' },
      { valeur: '21:00:00', emoji: '🌙', label: '21h — Nuit' },
    ]
  }
];

let etapeActuelle = 0;
const reponses = {};

function afficherEtape(index) {
  const etape = ETAPES[index];
  const conteneur = document.getElementById('contenu-onboarding');

  document.getElementById('onboarding-sous-titre').textContent =
    `Question ${index + 1} sur ${ETAPES.length}`;

  // Progression
  ETAPES.forEach((_, i) => {
    const el = document.getElementById(`prog-${i + 1}`);
    if (el) el.classList.toggle('actif', i <= index);
  });

  const optionsHTML = etape.options.map(opt => `
    <div class="option-carte" data-valeur="${opt.valeur}">
      <span class="option-emoji">${opt.emoji}</span>
      <span class="option-label">${opt.label}</span>
    </div>
  `).join('');

  conteneur.innerHTML = `
    <div class="onboarding-question">
      <h3>${etape.question}</h3>
      <div class="options-grille">${optionsHTML}</div>
    </div>
  `;

  document.getElementById('btn-suivant').style.display = 'none';

  // Sélection d'une option
  conteneur.querySelectorAll('.option-carte').forEach(carte => {
    carte.addEventListener('click', () => {
      conteneur.querySelectorAll('.option-carte').forEach(c => c.classList.remove('selectionnee'));
      carte.classList.add('selectionnee');
      reponses[etape.id] = carte.dataset.valeur;

      // Conversion pour disponibilite (string -> int)
      if (etape.id === 'disponibilite') {
        reponses[etape.id] = parseInt(carte.dataset.valeur);
      }

      document.getElementById('btn-suivant').style.display = 'block';
    });
  });
}

document.getElementById('btn-suivant').addEventListener('click', async () => {
  etapeActuelle++;

  if (etapeActuelle < ETAPES.length) {
    afficherEtape(etapeActuelle);
  } else {
    // Sauvegarder et rediriger
    try {
      const token = getToken();
      await apiOnboarding(token, reponses);
      window.location.href = '/';
    } catch (err) {
      alert('Erreur lors de la sauvegarde. Réessaie.');
    }
  }
});

// Vérifier que l'utilisateur est connecté
const token = getToken();
if (!token) {
  window.location.href = '/auth.html';
} else {
  afficherEtape(0);
}
```

---

## Étape 4 — Page profil

### 4.1 Créer `frontend/profil.html`

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#4a7c59" />
  <title>Mon profil — Inspir</title>
  <link rel="stylesheet" href="/css/style.css" />
  <link rel="stylesheet" href="/css/auth.css" />
  <link rel="manifest" href="/manifest.json" />
</head>
<body>

  <header class="app-header">
    <a href="/" class="retour-btn">← Accueil</a>
    <h1>Mon profil</h1>
  </header>

  <main class="app-content" id="contenu-profil">
    <p class="chargement">Chargement…</p>
  </main>

  <script src="/js/api.js"></script>
  <script src="/js/auth.js"></script>
  <script src="/js/profil.js"></script>
</body>
</html>
```

### 4.2 Créer `frontend/js/profil.js`

```javascript
const labelsObjectif = {
  stress: '😮‍💨 Réduire le stress',
  sommeil: '🌙 Mieux dormir',
  concentration: '🎯 Me concentrer',
  energie: '⚡ Retrouver de l\'énergie',
};

const labelsProfil = {
  etudiant: '📚 Étudiant(e)',
  salarie: '💼 Salarié(e)',
  parent: '👨‍👩‍👦 Parent',
  senior: '🌻 Senior actif',
};

function construireProfil(user) {
  return `
    <div style="background:var(--couleur-fond-carte);border-radius:var(--rayon-bordure);padding:20px;margin-bottom:20px;box-shadow:var(--ombre-carte);">
      <div style="font-size:2.5rem;text-align:center;margin-bottom:8px;">👤</div>
      <h2 style="text-align:center;font-size:1.2rem;">${user.prenom || 'Mon compte'}</h2>
      <p style="text-align:center;font-size:0.85rem;color:var(--couleur-texte-doux);">${user.email}</p>
      ${user.is_premium ? '<p style="text-align:center;color:var(--couleur-premium);font-weight:700;margin-top:8px;">⭐ Abonné Premium</p>' : ''}
    </div>

    <div style="background:var(--couleur-fond-carte);border-radius:var(--rayon-bordure);padding:20px;margin-bottom:20px;box-shadow:var(--ombre-carte);">
      <h3 style="font-size:0.95rem;font-weight:600;margin-bottom:14px;">Mes préférences</h3>
      <div style="display:flex;flex-direction:column;gap:10px;font-size:0.88rem;">
        <div style="display:flex;justify-content:space-between;">
          <span style="color:var(--couleur-texte-doux);">Objectif</span>
          <span style="font-weight:600;">${labelsObjectif[user.objectif] || '—'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:var(--couleur-texte-doux);">Profil de vie</span>
          <span style="font-weight:600;">${labelsProfil[user.profil_vie] || '—'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:var(--couleur-texte-doux);">Disponibilité</span>
          <span style="font-weight:600;">${user.disponibilite ? user.disponibilite + ' min/jour' : '—'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:var(--couleur-texte-doux);">Rappel quotidien</span>
          <span style="font-weight:600;">${user.heure_rappel ? user.heure_rappel.slice(0,5) : '—'}</span>
        </div>
      </div>
    </div>

    ${!user.is_premium ? `
    <div style="background:#fdf8e7;border:2px solid var(--couleur-premium);border-radius:var(--rayon-bordure);padding:20px;margin-bottom:20px;text-align:center;">
      <p style="font-weight:700;color:var(--couleur-premium);margin-bottom:8px;">⭐ Passer à Premium</p>
      <p style="font-size:0.85rem;color:var(--couleur-texte-doux);margin-bottom:14px;">Accède à toutes les routines pour 4,99€/mois</p>
      <a href="/premium.html" class="btn-commencer" style="display:inline-block;padding:12px 24px;width:auto;">Voir les offres</a>
    </div>
    ` : ''}

    <button
      onclick="deconnexion()"
      style="width:100%;padding:14px;border:1.5px solid #e74c3c;background:white;color:#e74c3c;border-radius:var(--rayon-bordure);font-size:0.9rem;font-weight:600;cursor:pointer;margin-top:10px;">
      Se déconnecter
    </button>
  `;
}

function deconnexion() {
  supprimerToken();
  window.location.href = '/auth.html';
}

async function chargerProfil() {
  const token = getToken();
  if (!token) {
    window.location.href = '/auth.html';
    return;
  }

  try {
    const user = await apiGetMe(token);
    sauvegarderUser(user);
    document.getElementById('contenu-profil').innerHTML = construireProfil(user);
  } catch (err) {
    supprimerToken();
    window.location.href = '/auth.html';
  }
}

chargerProfil();
```

---

## Étape 5 — Mettre à jour la navigation

### 5.1 Mettre à jour `frontend/index.html`

Ajoute un lien vers le profil dans le header et une vérification de connexion :

Dans `index.html`, remplace le `<header>` par :

```html
<header class="app-header" style="display:flex;justify-content:space-between;align-items:center;">
  <div>
    <h1>🌿 Inspir</h1>
    <p>Ton moment de bien-être</p>
  </div>
  <a href="/profil.html" style="color:white;font-size:1.4rem;text-decoration:none;" id="lien-profil">👤</a>
</header>
```

Et ajoute ce script en bas du `<body>` de `index.html` :

```html
<script src="/js/auth.js"></script>
<script>
  // Rediriger si non connecté
  if (!getToken()) {
    window.location.href = '/auth.html';
  }
</script>
```

### 5.2 Ajouter les nouvelles pages dans `app/main.py`

Dans `app/main.py`, ajoute les routes pour les nouvelles pages :

```python
@app.get("/auth.html")
async def auth_page():
    return FileResponse(os.path.join(FRONTEND_DIR, "auth.html"))

@app.get("/onboarding.html")
async def onboarding_page():
    return FileResponse(os.path.join(FRONTEND_DIR, "onboarding.html"))

@app.get("/profil.html")
async def profil_page():
    return FileResponse(os.path.join(FRONTEND_DIR, "profil.html"))
```

Et ajoute le montage du CSS auth :

```python
# Déjà couvert par le montage /css si auth.css est dans frontend/css/
```

---

## Étape 6 — Tester l'authentification de bout en bout

### 6.1 Scénario de test complet

1. Ouvre `http://localhost:8000` → tu dois être redirigé vers `/auth.html`
2. Crée un compte avec un email et un mot de passe
3. Tu es redirigé vers `/onboarding.html` → réponds aux 4 questions
4. Tu arrives sur la page d'accueil avec les routines
5. Clique sur l'icône 👤 → page profil avec tes réponses d'onboarding
6. Clique "Se déconnecter" → retour sur `/auth.html`
7. Reconnecte-toi → tu arrives directement sur la page d'accueil (onboarding déjà fait)

### 6.2 Tester les endpoints protégés via `/docs`

```
GET /api/auth/me
```
Sans token → `401 Unauthorized`  
Avec token (bouton Authorize dans Swagger) → retourne le profil utilisateur

---

## Étape 7 — Commit Git

```bash
git add .
git commit -m "feat(semaine-4): auth JWT, onboarding 4 questions, page profil, routes protégées"
git push origin develop
```

---

## Récapitulatif — Ordre d'exécution

| # | Action | Fichier |
|---|--------|---------|
| 1 | Mettre à jour `auth_service.py` | `app/services/auth_service.py` |
| 2 | Mettre à jour les schémas user | `app/schemas/user.py` |
| 3 | Mettre à jour les routes auth | `app/routes/auth.py` |
| 4 | Créer la page auth | `frontend/auth.html` |
| 5 | Créer le CSS auth | `frontend/css/auth.css` |
| 6 | Créer `auth.js` | `frontend/js/auth.js` |
| 7 | Créer la page onboarding | `frontend/onboarding.html` |
| 8 | Créer `onboarding.js` | `frontend/js/onboarding.js` |
| 9 | Créer la page profil | `frontend/profil.html` + `profil.js` |
| 10 | Mettre à jour `index.html` | Navigation + vérification connexion |
| 11 | Mettre à jour `main.py` | Nouvelles routes de pages |
| 12 | Tester le flux complet | Inscription → onboarding → profil |
| 13 | Commit Git | `git commit -m "feat(semaine-4): ..."` |

---

## Livrable de fin de semaine 4

✅ Inscription et connexion fonctionnelles via le frontend  
✅ Onboarding en 4 questions sauvegardé en base de données  
✅ Page profil affichant les informations de l'utilisateur connecté  
✅ Middleware JWT protégeant les routes API  
✅ Déconnexion fonctionnelle avec suppression du token local  
✅ Redirection automatique si non connecté  
✅ Commit pushé sur la branche `develop`

---

## Points d'attention

**Le token est stocké dans `localStorage`.** C'est suffisant pour le MVP. En production, on pourrait envisager des cookies `httpOnly` pour une sécurité accrue — c'est une décision à prendre lors du déploiement.

**L'onboarding est optionnel côté API.** Si l'utilisateur ferme l'app pendant l'onboarding, il pourra le compléter depuis sa page profil. Implémente cette logique en semaine 8 si nécessaire.

**`get_current_premium_user`** est prête à l'emploi mais ne sera utilisée qu'en semaine 9 lors de l'intégration Stripe.

**La suppression de compte** (`DELETE /api/auth/account`) est disponible mais pas encore exposée dans le frontend — c'est une exigence RGPD à ajouter sur la page profil avant le lancement.

---

*Prochaine étape : Semaine 5 — Suivi d'humeur quotidien*