# Semaine 1 — Guide de mise en place (Étapes 2 à 7)

> Projet : Application Bien-être & Micro-habitudes  
> Stack : FastAPI · PostgreSQL · Redis · Auth.js · Stripe · Scaleway  
> Dernière mise à jour : 21 avril 2026

---

## Prérequis

Avant de commencer, assure-toi d'avoir :

- Python 3.11+ installé (`python --version`)
- Git installé et dépôt initialisé (étape 1 déjà faite ✅)
- Un terminal ouvert dans le dossier racine du projet

---

## Étape 2 — Initialiser le projet FastAPI

### 2.1 Créer la structure de dossiers

```bash
mkdir -p app/{models,routes,services,schemas} migrations seeds tests
touch app/__init__.py
touch app/{main,config,database}.py
touch app/models/{__init__,user,routine,session,mood,streak}.py
touch app/routes/{__init__,auth,routines,sessions,moods,streaks,payments}.py
touch app/services/{__init__,recommendations,notifications,analytics}.py
touch app/schemas/{__init__,user,routine,mood}.py
touch migrations/.gitkeep seeds/.gitkeep tests/.gitkeep
touch requirements.txt .env .env.example
```

### 2.2 Créer l'environnement virtuel et installer les dépendances

**Linux / Mac :**
```bash
python3 -m venv venv
source venv/bin/activate
```

**Windows :**
```bash
python -m venv venv
venv\Scripts\activate
```

> ⚠️ Tu dois voir `(venv)` apparaître dans ton terminal. **Répète l'activation à chaque nouveau terminal.**

Si `venv` n'est pas disponible sur Linux :
```bash
sudo apt install python3.12-venv python3-pip python-is-python3
```

### 2.3 Contenu de `requirements.txt`

```txt
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy==2.0.30
alembic==1.13.1
asyncpg==0.29.0
psycopg2-binary==2.9.9
redis==5.0.4
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.1
pydantic[email]==2.7.1
pydantic-settings==2.2.1
httpx==0.27.0
stripe==9.5.0
pywebpush==2.0.0
```

Puis installe :
```bash
pip install -r requirements.txt
```

### 2.4 Contenu de `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import auth, routines, sessions, moods, streaks, payments

app = FastAPI(
    title="Bien-être API",
    description="API pour l'application bien-être & micro-habitudes",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(routines.router, prefix="/api/routines", tags=["routines"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(moods.router, prefix="/api/moods", tags=["moods"])
app.include_router(streaks.router, prefix="/api/streaks", tags=["streaks"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])

@app.get("/")
def root():
    return {"status": "ok", "message": "Bienvenue sur l'API Bien-être"}
```

### 2.5 Contenu de `app/config.py`

```python
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 jours
    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    class Config:
        env_file = ".env"

settings = Settings()
```

### 2.6 Contenu de `app/database.py`

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

DATABASE_URL = settings.DATABASE_URL.replace(
    "postgresql://", "postgresql+asyncpg://"
)

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

### 2.7 Remplir tous les fichiers de routes (contenu minimal)

Ces fichiers doivent exister avec un `router` défini pour que `main.py` démarre sans erreur. On les remplira dans les semaines suivantes.

**`app/routes/auth.py`**
```python
from fastapi import APIRouter
router = APIRouter()
```

Répète ce contenu pour chaque fichier :
- `app/routes/routines.py`
- `app/routes/sessions.py`
- `app/routes/moods.py`
- `app/routes/streaks.py`
- `app/routes/payments.py`

### 2.8 Vérifier que le serveur démarre

```bash
uvicorn app.main:app --reload
```

✅ Tu dois voir : `Uvicorn running on http://127.0.0.1:8000`  
📖 Documentation auto : `http://localhost:8000/docs`

---

## Étape 3 — PostgreSQL en local + premières tables

### 3.1 Installer PostgreSQL

**Linux (Ubuntu/Debian) :**
```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Mac (Homebrew) :**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Windows :** Télécharger l'installeur sur https://www.postgresql.org/download/windows/

### 3.2 Créer la base de données et l'utilisateur

```bash
psql -U postgres
```

```sql
CREATE DATABASE bienetre_db;
CREATE USER bienetre_user WITH PASSWORD 'ton_mot_de_passe_ici';
GRANT ALL PRIVILEGES ON DATABASE bienetre_db TO bienetre_user;
\q
```

> Sur Linux, tu devras peut-être lancer : `sudo -u postgres psql`

### 3.3 Contenu de `app/models/user.py`

```python
from sqlalchemy import Column, String, Boolean, Integer, Time, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    prenom = Column(String, nullable=True)
    objectif = Column(String, nullable=True)
    profil_vie = Column(String, nullable=True)
    disponibilite = Column(Integer, nullable=True)
    heure_rappel = Column(Time, nullable=True)
    is_premium = Column(Boolean, default=False)
    stripe_customer = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### 3.4 Contenu de `app/models/routine.py`

```python
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Routine(Base):
    __tablename__ = "routines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    titre = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    categorie = Column(String, nullable=False)
    duree_minutes = Column(Integer, nullable=False)
    moment = Column(String, nullable=True)
    niveau = Column(String, default="Débutant")
    profil_cible = Column(String, default="Universel")
    humeur_declencheur = Column(String, nullable=True)
    etapes = Column(JSONB, nullable=False)
    is_premium = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### 3.5 Créer les tables avec Alembic

Initialiser Alembic :
```bash
alembic init migrations
```

Dans `alembic.ini`, remplacer la ligne `sqlalchemy.url` :
```ini
sqlalchemy.url = postgresql://bienetre_user:ton_mot_de_passe_ici@localhost/bienetre_db
```

Dans `migrations/env.py`, ajouter **en haut du fichier** :
```python
from app.models.user import User
from app.models.routine import Routine
from app.database import Base
target_metadata = Base.metadata
```

Puis créer et appliquer la migration :
```bash
alembic revision --autogenerate -m "create users and routines tables"
alembic upgrade head
```

✅ Si tout va bien, les tables `users` et `routines` existent dans ta base de données.

---

## Étape 4 — Redis en local

### 4.1 Installer Redis

**Linux :**
```bash
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**Mac :**
```bash
brew install redis
brew services start redis
```

**Windows :** Utiliser Docker (solution la plus simple) :
```bash
docker run -d -p 6379:6379 --name redis redis
```

### 4.2 Vérifier que Redis fonctionne

```bash
redis-cli ping
# Doit répondre : PONG
```

### 4.3 Créer `app/services/redis_client.py`

```python
import redis.asyncio as redis
from app.config import settings

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

async def set_session(key: str, value: str, expire: int = 3600):
    await redis_client.setex(key, expire, value)

async def get_session(key: str) -> str | None:
    return await redis_client.get(key)

async def delete_session(key: str):
    await redis_client.delete(key)
```

---

## Étape 5 — Authentification JWT (backend) + Auth.js (frontend)

Auth.js est côté frontend. Le backend FastAPI gère les JWT. Les deux communiquent via des endpoints REST.

### 5.1 Créer `app/services/auth_service.py`

```python
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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
```

### 5.2 Contenu de `app/schemas/user.py`

```python
from pydantic import BaseModel, EmailStr
from uuid import UUID

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    prenom: str | None = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID
    email: str
    prenom: str | None
    is_premium: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
```

### 5.3 Contenu de `app/routes/auth.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.services.auth_service import (
    get_password_hash, verify_password, create_access_token
)

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=201)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing = result.scalar_one_or_none()
    if existing:
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
```

### 5.4 Tester l'authentification

Lance le serveur et ouvre `http://localhost:8000/docs`, puis :

1. `POST /api/auth/register` avec `{"email": "test@test.com", "password": "1234", "prenom": "Test"}`
2. `POST /api/auth/login` avec les mêmes identifiants → tu reçois un `access_token`

---

## Étape 6 — Fichier `.env`

### 6.1 Créer le fichier `.env` à la racine du projet

```env
# Base de données
DATABASE_URL=postgresql://bienetre_user:ton_mot_de_passe_ici@localhost:5432/bienetre_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
SECRET_KEY=remplacer_par_une_cle_generee
ALGORITHM=HS256

# Stripe (clés de test — à remplacer en semaine 9)
STRIPE_SECRET_KEY=sk_test_remplacer_plus_tard
STRIPE_WEBHOOK_SECRET=whsec_remplacer_plus_tard

# Origines autorisées (frontend)
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

### 6.2 Générer une SECRET_KEY sécurisée

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Copie le résultat et remplace `remplacer_par_une_cle_generee` dans ton `.env`.

### 6.3 Créer `.env.example` (version sans valeurs sensibles, pour Git)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/bienetre_db
REDIS_URL=redis://localhost:6379
SECRET_KEY=
ALGORITHM=HS256
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ALLOWED_ORIGINS=["http://localhost:3000"]
```

### 6.4 Ajouter `.env` au `.gitignore`

```bash
echo ".env" >> .gitignore
echo "venv/" >> .gitignore
echo "__pycache__/" >> .gitignore
echo "*.pyc" >> .gitignore
```

> ⚠️ **Ne commite jamais le fichier `.env` sur Git.** Seul `.env.example` va sur le dépôt.

---

## Étape 7 — README.md

Créer le fichier `README.md` à la racine du projet :

```markdown
# 🌿 Bien-être & Micro-habitudes — API

Application web progressive (PWA) française dédiée au bien-être quotidien.

## Stack technique

- **Backend** : FastAPI (Python 3.11+)
- **Base de données** : PostgreSQL 15
- **Cache / Sessions** : Redis
- **Auth** : JWT (HS256) côté backend + Auth.js côté frontend
- **Paiement** : Stripe
- **Hébergement** : Scaleway (France)

## Prérequis

- Python 3.11+
- PostgreSQL 15+
- Redis 7+

## Installation

```bash
git clone https://github.com/ton-user/bien-etre-api.git
cd bien-etre-api

python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

pip install -r requirements.txt
cp .env.example .env      # Remplir les variables
```

## Base de données

```bash
alembic upgrade head              # Créer les tables
python seeds/seed_routines.py     # Insérer les 15 routines (semaine 2)
```

## Démarrage en développement

```bash
uvicorn app.main:app --reload
```

- API disponible sur : `http://localhost:8000`
- Documentation interactive : `http://localhost:8000/docs`

## Structure du projet

```
app/
├── main.py          # Point d'entrée
├── config.py        # Variables d'environnement
├── database.py      # Connexion PostgreSQL
├── models/          # Tables SQLAlchemy
├── routes/          # Endpoints API
├── services/        # Logique métier
└── schemas/         # Validation Pydantic
migrations/          # Scripts Alembic
seeds/               # Données initiales
tests/               # Tests unitaires
```

## Variables d'environnement

Voir `.env.example` pour la liste complète des variables nécessaires.

## Tests

```bash
pytest tests/
```

## Branches Git

- `main` : code stable, prêt pour la production
- `develop` : intégration des nouvelles fonctionnalités
- `feature/*` : développement d'une fonctionnalité spécifique
```

---

## Récapitulatif — Ordre d'exécution

| # | Action | Commande clé |
|---|--------|-------------|
| 1 | Créer la structure de dossiers | `mkdir -p app/{models,routes,...}` |
| 2 | Créer et activer le venv | `python3 -m venv venv && source venv/bin/activate` |
| 3 | Installer les dépendances | `pip install -r requirements.txt` |
| 4 | Remplir les fichiers Python | Voir contenus ci-dessus |
| 5 | Créer le `.env` | Voir étape 6 |
| 6 | Démarrer PostgreSQL et Redis | `sudo systemctl start postgresql redis` |
| 7 | Créer la base de données | `psql -U postgres` + SQL |
| 8 | Appliquer les migrations | `alembic upgrade head` |
| 9 | Lancer le serveur | `uvicorn app.main:app --reload` |
| 10 | Vérifier l'API | Ouvrir `http://localhost:8000/docs` |

---

## Livrable de fin de semaine 1

✅ Serveur FastAPI qui démarre sans erreur  
✅ Base de données PostgreSQL avec les tables `users` et `routines`  
✅ Redis actif et connecté  
✅ Endpoints `/api/auth/register` et `/api/auth/login` fonctionnels  
✅ Fichier `.env` configuré (jamais sur Git)  
✅ `README.md` documenté  

---

*Prochaine étape : Semaine 2 — Rédaction des 15 routines et création du script `seed.py`*