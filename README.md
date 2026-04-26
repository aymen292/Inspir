# Bien-être & Micro-habitudes — API

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
