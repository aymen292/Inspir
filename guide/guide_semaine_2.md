# Semaine 2 — Contenu et données

> Projet : Application Bien-être & Micro-habitudes  
> Stack : FastAPI · PostgreSQL · Redis · Auth.js · Stripe · Scaleway  
> Dernière mise à jour : 26 avril 2026

---

## Objectif de la semaine

À la fin de cette semaine, tu dois avoir **15 routines consultables via l'API**. Concrètement :

- Le modèle SQLAlchemy `Routine` est finalisé
- Un script `seed.py` insère automatiquement les 15 routines en base
- Deux endpoints sont fonctionnels : `GET /api/routines` et `GET /api/routines/{id}`
- Les données sont validées avec un schéma Pydantic propre

---

## Prérequis

Avant de commencer, vérifie que la semaine 1 est bien terminée :

- [ ] `uvicorn app.main:app --reload` démarre sans erreur
- [ ] PostgreSQL tourne en local (`sudo systemctl status postgresql`)
- [ ] Redis tourne en local (`sudo systemctl status redis`)
- [ ] Les tables `users` et `routines` existent en base (`alembic upgrade head` déjà appliqué)
- [ ] Le fichier `.env` est configuré

---

## Étape 1 — Finaliser le modèle `Routine`

Le modèle `Routine` a déjà été créé en semaine 1. On va le compléter avec deux champs manquants utiles pour les recommandations et les filtres.

### 1.1 Mettre à jour `app/models/routine.py`

```python
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Routine(Base):
    __tablename__ = "routines"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    titre            = Column(String, nullable=False)
    description      = Column(Text, nullable=True)
    categorie        = Column(String, nullable=False, index=True)
    duree_minutes    = Column(Integer, nullable=False)
    moment           = Column(String, nullable=True)          # Matin, Après-midi, Soir, Nuit, N'importe quand
    niveau           = Column(String, default="Débutant")
    profil_cible     = Column(String, default="Universel")    # Universel, Salarié, Parent, Senior, Étudiant
    humeur_declencheur = Column(String, nullable=True)        # Anxieux, Fatigué, Démotivé, Tendu, Agité...
    etapes           = Column(JSONB, nullable=False)          # Liste ordonnée des étapes
    is_premium       = Column(Boolean, default=False)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
```

### 1.2 Générer et appliquer la migration

Comme on a modifié le modèle (ajout du champ `humeur_declencheur`), on crée une nouvelle migration :

```bash
alembic revision --autogenerate -m "add humeur_declencheur to routines"
alembic upgrade head
```

Vérifie que la migration s'applique sans erreur. Si tu vois `Nothing to update`, c'est que le champ existait déjà — pas de problème, continue.

---

## Étape 2 — Créer le schéma Pydantic pour les routines

### 2.1 Contenu de `app/schemas/routine.py`

```python
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import List, Optional

class EtapeRoutine(BaseModel):
    numero: int
    texte: str

class RoutineResponse(BaseModel):
    id: UUID
    titre: str
    description: Optional[str]
    categorie: str
    duree_minutes: int
    moment: Optional[str]
    niveau: str
    profil_cible: str
    humeur_declencheur: Optional[str]
    etapes: List[dict]
    is_premium: bool
    created_at: datetime

    class Config:
        from_attributes = True

class RoutineListItem(BaseModel):
    """Version allégée pour la liste (sans les étapes détaillées)"""
    id: UUID
    titre: str
    description: Optional[str]
    categorie: str
    duree_minutes: int
    moment: Optional[str]
    niveau: str
    profil_cible: str
    is_premium: bool

    class Config:
        from_attributes = True
```

> **Pourquoi deux schémas ?** `RoutineListItem` est utilisé pour l'endpoint liste (performances) — pas besoin de renvoyer les étapes complètes pour afficher une carte. `RoutineResponse` est utilisé pour l'endpoint détail d'une routine.

---

## Étape 3 — Créer les endpoints routines

### 3.1 Contenu de `app/routes/routines.py`

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models.routine import Routine
from app.schemas.routine import RoutineResponse, RoutineListItem

router = APIRouter()


@router.get("/", response_model=List[RoutineListItem])
async def get_routines(
    categorie: Optional[str] = Query(None, description="Filtrer par catégorie"),
    moment: Optional[str] = Query(None, description="Filtrer par moment"),
    duree_max: Optional[int] = Query(None, description="Durée max en minutes"),
    profil: Optional[str] = Query(None, description="Filtrer par profil cible"),
    db: AsyncSession = Depends(get_db)
):
    """
    Retourne la liste des routines avec filtres optionnels.
    Exemples :
      GET /api/routines/
      GET /api/routines/?categorie=Stress
      GET /api/routines/?moment=Matin&duree_max=10
    """
    query = select(Routine)

    if categorie:
        query = query.where(Routine.categorie == categorie)
    if moment:
        query = query.where(Routine.moment.in_([moment, "N'importe quand"]))
    if duree_max:
        query = query.where(Routine.duree_minutes <= duree_max)
    if profil:
        query = query.where(Routine.profil_cible.in_([profil, "Universel"]))

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{routine_id}", response_model=RoutineResponse)
async def get_routine(routine_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Retourne le détail complet d'une routine avec toutes ses étapes.
    """
    result = await db.execute(select(Routine).where(Routine.id == routine_id))
    routine = result.scalar_one_or_none()

    if not routine:
        raise HTTPException(status_code=404, detail="Routine introuvable")

    return routine
```

---

## Étape 4 — Créer le fichier de données des routines

On va séparer les données du script d'insertion. Ça facilite la maintenance et les futures mises à jour du catalogue.

### 4.1 Créer `seeds/routines_data.py`

Ce fichier contient les 15 routines du MVP sous forme de liste Python, prêtes à être insérées.

```python
ROUTINES = [

    # ─── STRESS & ANXIÉTÉ ────────────────────────────────────────────────────

    {
        "titre": "Respiration 4-7-8",
        "description": "Une technique de respiration issue du yoga pranayama pour calmer rapidement le système nerveux.",
        "categorie": "Stress",
        "duree_minutes": 5,
        "moment": "N'importe quand",
        "niveau": "Débutant",
        "profil_cible": "Universel",
        "humeur_declencheur": "Anxieux",
        "is_premium": False,
        "etapes": [
            {"numero": 1, "texte": "Installe-toi confortablement, dos droit, épaules relâchées."},
            {"numero": 2, "texte": "Expire complètement par la bouche en faisant un son doux."},
            {"numero": 3, "texte": "Ferme la bouche et inspire silencieusement par le nez en comptant jusqu'à 4."},
            {"numero": 4, "texte": "Retiens ta respiration en comptant jusqu'à 7."},
            {"numero": 5, "texte": "Expire complètement par la bouche en comptant jusqu'à 8."},
            {"numero": 6, "texte": "C'est un cycle complet. Répète ce cycle 4 fois."},
            {"numero": 7, "texte": "Observe comment ton corps se sent maintenant."}
        ]
    },

    {
        "titre": "Scan corporel rapide",
        "description": "Un balayage progressif du corps pour identifier et relâcher les zones de tension accumulées.",
        "categorie": "Stress",
        "duree_minutes": 7,
        "moment": "Soir",
        "niveau": "Débutant",
        "profil_cible": "Universel",
        "humeur_declencheur": "Tendu",
        "is_premium": False,
        "etapes": [
            {"numero": 1, "texte": "Allonge-toi ou assieds-toi dans une position confortable."},
            {"numero": 2, "texte": "Ferme les yeux et prends 3 respirations profondes lentes."},
            {"numero": 3, "texte": "Porte ton attention sur tes pieds. Sont-ils tendus ? Laisse-les se détendre."},
            {"numero": 4, "texte": "Remonte lentement vers les mollets, les genoux, les cuisses."},
            {"numero": 5, "texte": "Relâche le ventre à chaque expiration."},
            {"numero": 6, "texte": "Dénoue les épaules, le cou, la mâchoire."},
            {"numero": 7, "texte": "Termine par le visage et le crâne."},
            {"numero": 8, "texte": "Reste immobile 1 minute en respirant calmement."}
        ]
    },

    {
        "titre": "Ancrage 5-4-3-2-1",
        "description": "Une technique d'ancrage sensoriel pour sortir d'un état d'anxiété ou de rumination en quelques minutes.",
        "categorie": "Stress",
        "duree_minutes": 3,
        "moment": "N'importe quand",
        "niveau": "Débutant",
        "profil_cible": "Universel",
        "humeur_declencheur": "Agité",
        "is_premium": False,
        "etapes": [
            {"numero": 1, "texte": "Regarde autour de toi et nomme mentalement 5 choses que tu vois."},
            {"numero": 2, "texte": "Nomme 4 choses que tu peux toucher autour de toi. Touche-les."},
            {"numero": 3, "texte": "Nomme 3 sons que tu entends en ce moment."},
            {"numero": 4, "texte": "Nomme 2 odeurs que tu perçois ou que tu aimes."},
            {"numero": 5, "texte": "Nomme 1 chose que tu goûtes ou que tu apprécies vraiment."},
            {"numero": 6, "texte": "Prends une grande inspiration et expire lentement. Tu es ici, maintenant."}
        ]
    },

    # ─── SOMMEIL & RÉCUPÉRATION ───────────────────────────────────────────────

    {
        "titre": "Routine du soir déconnectée",
        "description": "Un rituel de transition entre l'activité de la journée et le sommeil, sans écran.",
        "categorie": "Sommeil",
        "duree_minutes": 10,
        "moment": "Soir",
        "niveau": "Débutant",
        "profil_cible": "Universel",
        "humeur_declencheur": "Agité",
        "is_premium": False,
        "etapes": [
            {"numero": 1, "texte": "Pose ton téléphone à l'autre bout de la pièce ou dans une autre pièce."},
            {"numero": 2, "texte": "Tamise la lumière de ta chambre ou éteins le plafond."},
            {"numero": 3, "texte": "Assieds-toi sur ton lit et note 3 choses qui se sont bien passées aujourd'hui."},
            {"numero": 4, "texte": "Note 1 chose que tu feras demain (pour vider ta tête)."},
            {"numero": 5, "texte": "Allonge-toi et pratique la respiration 4-7-8 pendant 3 cycles."},
            {"numero": 6, "texte": "Garde les yeux fermés et laisse ton esprit dériver sans chercher à t'endormir."}
        ]
    },

    {
        "titre": "Relâchement musculaire progressif",
        "description": "La technique de Jacobson : contracter puis relâcher chaque groupe musculaire pour induire un relâchement profond.",
        "categorie": "Sommeil",
        "duree_minutes": 10,
        "moment": "Nuit",
        "niveau": "Débutant",
        "profil_cible": "Universel",
        "humeur_declencheur": "N'arrive pas à dormir",
        "is_premium": False,
        "etapes": [
            {"numero": 1, "texte": "Allonge-toi dans ton lit, bras le long du corps."},
            {"numero": 2, "texte": "Contracte fortement les muscles de tes pieds pendant 5 secondes, puis relâche complètement."},
            {"numero": 3, "texte": "Fais de même avec les mollets (5 secondes, relâche)."},
            {"numero": 4, "texte": "Cuisses (5 secondes, relâche)."},
            {"numero": 5, "texte": "Ventre (5 secondes, relâche)."},
            {"numero": 6, "texte": "Poings serrés (5 secondes, relâche)."},
            {"numero": 7, "texte": "Épaules remontées vers les oreilles (5 secondes, relâche)."},
            {"numero": 8, "texte": "Visage grimaçant (5 secondes, relâche)."},
            {"numero": 9, "texte": "Observe le relâchement total de ton corps et laisse le sommeil venir."}
        ]
    },

    {
        "titre": "Micro-sieste guidée",
        "description": "Une récupération de 15 minutes l'après-midi pour restaurer l'énergie et la concentration.",
        "categorie": "Sommeil",
        "duree_minutes": 15,
        "moment": "Après-midi",
        "niveau": "Débutant",
        "profil_cible": "Universel",
        "humeur_declencheur": "Fatigué",
        "is_premium": False,
        "etapes": [
            {"numero": 1, "texte": "Mets une alarme dans 20 minutes (pour ne pas dépasser)."},
            {"numero": 2, "texte": "Allonge-toi ou incline ton siège au maximum."},
            {"numero": 3, "texte": "Ferme les yeux et respire lentement."},
            {"numero": 4, "texte": "Visualise un endroit calme et agréable que tu connais."},
            {"numero": 5, "texte": "Ne cherche pas à t'endormir, cherche juste à te reposer."},
            {"numero": 6, "texte": "Quand l'alarme sonne, étire-toi lentement avant de te lever."}
        ]
    },

    # ─── CONCENTRATION & PRODUCTIVITÉ ────────────────────────────────────────

    {
        "titre": "Mise en route mentale",
        "description": "Un rituel de démarrage le matin pour identifier sa priorité du jour et entrer en action clairement.",
        "categorie": "Concentration",
        "duree_minutes": 5,
        "moment": "Matin",
        "niveau": "Débutant",
        "profil_cible": "Universel",
        "humeur_declencheur": "Démotivé",
        "is_premium": False,
        "etapes": [
            {"numero": 1, "texte": "Avant d'ouvrir ton ordinateur, assieds-toi tranquillement 2 minutes."},
            {"numero": 2, "texte": "Pose-toi cette question : quelle est la chose la plus importante que je dois accomplir aujourd'hui ?"},
            {"numero": 3, "texte": "Écris-la ou note-la mentalement."},
            {"numero": 4, "texte": "Prends 5 respirations profondes en te concentrant uniquement sur l'air qui entre et sort."},
            {"numero": 5, "texte": "Ouvre les yeux, étire tes bras au plafond, et commence."}
        ]
    },

    {
        "titre": "Pause active entre deux tâches",
        "description": "Une coupure physique et mentale de 5 minutes pour repartir sur une tâche avec une concentration retrouvée.",
        "categorie": "Concentration",
        "duree_minutes": 5,
        "moment": "Après-midi",
        "niveau": "Débutant",
        "profil_cible": "Salarié",
        "humeur_declencheur": "Fatigué",
        "is_premium": False,
        "etapes": [
            {"numero": 1, "texte": "Éloigne-toi de ton écran et de ton bureau."},
            {"numero": 2, "texte": "Lève-toi et marche lentement pendant 2 minutes (même dans une petite pièce)."},
            {"numero": 3, "texte": "Fais 10 rotations des épaules vers l'arrière."},
            {"numero": 4, "texte": "Étire le cou : oreille vers l'épaule droite 30 secondes, puis gauche."},
            {"numero": 5, "texte": "Bois un verre d'eau lentement."},
            {"numero": 6, "texte": "Reviens à ton poste avec une tâche précise en tête."}
        ]
    },

    # ─── MOUVEMENT & CORPS ───────────────────────────────────────────────────

    {
        "titre": "Étirements de bureau",
        "description": "Une séquence d'étirements doux réalisables au bureau ou à la maison pour relâcher les tensions posturales.",
        "categorie": "Mouvement",
        "duree_minutes": 7,
        "moment": "N'importe quand",
        "niveau": "Débutant",
        "profil_cible": "Salarié",
        "humeur_declencheur": "Tendu",
        "is_premium": False,
        "etapes": [
            {"numero": 1, "texte": "Debout, croise les doigts et étire les bras au plafond, paumes vers le haut. Tiens 30 secondes."},
            {"numero": 2, "texte": "Penche-toi doucement sur le côté droit, bras gauche au plafond. 30 secondes. Recommence à gauche."},
            {"numero": 3, "texte": "Assis, croise les jambes et tords le buste vers la droite en posant la main gauche sur le genou droit. 30 secondes chaque côté."},
            {"numero": 4, "texte": "Debout, plie légèrement les genoux, roule les épaules 10 fois vers l'avant, 10 vers l'arrière."},
            {"numero": 5, "texte": "Termine en secouant doucement les mains et les poignets pendant 30 secondes."}
        ]
    },

    {
        "titre": "Réveil en douceur",
        "description": "Une séquence au lit et au lever pour activer le corps progressivement sans brutalité.",
        "categorie": "Mouvement",
        "duree_minutes": 5,
        "moment": "Matin",
        "niveau": "Débutant",
        "profil_cible": "Universel",
        "humeur_declencheur": "Fatigué",
        "is_premium": False,
        "etapes": [
            {"numero": 1, "texte": "Avant de sortir du lit, allonge-toi sur le dos et ramène les deux genoux vers la poitrine. Tiens 30 secondes."},
            {"numero": 2, "texte": "Toujours allongé, laisse tomber les genoux sur le côté droit, tête tournée à gauche. 30 secondes."},
            {"numero": 3, "texte": "Recommence de l'autre côté."},
            {"numero": 4, "texte": "Assis sur le bord du lit, roule les chevilles 10 fois dans chaque sens."},
            {"numero": 5, "texte": "Lève-toi lentement, étire les bras au plafond et bâille franchement."},
            {"numero": 6, "texte": "Bois un grand verre d'eau avant toute chose."}
        ]
    },

    # ─── ÉMOTIONS & MENTAL ───────────────────────────────────────────────────

    {
        "titre": "Journaling des 3 gratitudes",
        "description": "Une pratique de psychologie positive pour orienter l'attention vers ce qui va bien et cultiver un état d'esprit positif.",
        "categorie": "Émotions",
        "duree_minutes": 5,
        "moment": "Matin",
        "niveau": "Débutant",
        "profil_cible": "Universel",
        "humeur_declencheur": "Démotivé",
        "is_premium": False,
        "etapes": [
            {"numero": 1, "texte": "Prends un carnet ou utilise la zone de note de l'app."},
            {"numero": 2, "texte": "Écris 3 choses pour lesquelles tu es reconnaissant aujourd'hui. Petites ou grandes, peu importe."},
            {"numero": 3, "texte": "Pour chacune, écris une phrase sur pourquoi elle compte pour toi."},
            {"numero": 4, "texte": "Relis ce que tu as écrit."},
            {"numero": 5, "texte": "Prends une respiration et remarque ce que tu ressens."}
        ]
    },

    {
        "titre": "Lettre à soi-même",
        "description": "Un exercice d'écriture libre pour exprimer ses émotions et identifier ses besoins du moment.",
        "categorie": "Émotions",
        "duree_minutes": 10,
        "moment": "Soir",
        "niveau": "Intermédiaire",
        "profil_cible": "Universel",
        "humeur_declencheur": "Anxieux",
        "is_premium": True,
        "etapes": [
            {"numero": 1, "texte": "Assieds-toi dans un endroit calme avec de quoi écrire."},
            {"numero": 2, "texte": "Commence par : 'Aujourd'hui j'ai ressenti...'"},
            {"numero": 3, "texte": "Écris librement pendant 5 minutes sans corriger, sans relire."},
            {"numero": 4, "texte": "Termine par : 'Ce dont j'ai besoin en ce moment, c'est...'"},
            {"numero": 5, "texte": "Pose ton stylo, relis uniquement la dernière phrase."},
            {"numero": 6, "texte": "Prends soin de ce besoin, même par un petit geste ce soir."}
        ]
    },

    {
        "titre": "Recadrage cognitif rapide",
        "description": "Une technique issue des thérapies cognitivo-comportementales (TCC) pour sortir des pensées négatives automatiques.",
        "categorie": "Émotions",
        "duree_minutes": 5,
        "moment": "N'importe quand",
        "niveau": "Intermédiaire",
        "profil_cible": "Universel",
        "humeur_declencheur": "Anxieux",
        "is_premium": True,
        "etapes": [
            {"numero": 1, "texte": "Identifie une pensée négative qui tourne en boucle. Écris-la."},
            {"numero": 2, "texte": "Pose-toi cette question : est-ce que cette pensée est un fait ou une interprétation ?"},
            {"numero": 3, "texte": "Écris une version plus neutre de cette pensée (ni positive forcée, ni catastrophiste)."},
            {"numero": 4, "texte": "Demande-toi : qu'est-ce que je conseillerais à un ami qui aurait cette pensée ?"},
            {"numero": 5, "texte": "Lis ta version neutre à voix haute ou mentalement trois fois."}
        ]
    },

    # ─── ÉNERGIE & VITALITÉ ──────────────────────────────────────────────────

    {
        "titre": "Boost d'énergie en 3 minutes",
        "description": "Une activation corporelle rapide pour sortir d'un coup de fatigue ou d'une baisse d'énergie l'après-midi.",
        "categorie": "Énergie",
        "duree_minutes": 3,
        "moment": "Après-midi",
        "niveau": "Débutant",
        "profil_cible": "Universel",
        "humeur_declencheur": "Fatigué",
        "is_premium": False,
        "etapes": [
            {"numero": 1, "texte": "Debout, secoue énergiquement les mains et les bras pendant 30 secondes."},
            {"numero": 2, "texte": "Tape doucement avec les poings fermés sur ta poitrine (sternum) 20 fois."},
            {"numero": 3, "texte": "Frictionne tes paumes énergiquement l'une contre l'autre pendant 20 secondes."},
            {"numero": 4, "texte": "Pose les paumes chaudes sur tes yeux fermés. Reste ainsi 20 secondes."},
            {"numero": 5, "texte": "Prends 3 grandes inspirations rapides par le nez, puis expire lentement."},
            {"numero": 6, "texte": "Souris volontairement pendant 10 secondes (l'effet est réel, même forcé)."}
        ]
    },

    {
        "titre": "Hydratation et pause consciente",
        "description": "Un geste simple et souvent négligé : boire de l'eau en pleine conscience pour récupérer de l'énergie mentale.",
        "categorie": "Énergie",
        "duree_minutes": 5,
        "moment": "N'importe quand",
        "niveau": "Débutant",
        "profil_cible": "Universel",
        "humeur_declencheur": "Fatigué",
        "is_premium": False,
        "etapes": [
            {"numero": 1, "texte": "Remplis un grand verre d'eau froide."},
            {"numero": 2, "texte": "Bois-le lentement, gorgée par gorgée, sans faire autre chose en même temps."},
            {"numero": 3, "texte": "Pose le verre et ferme les yeux 1 minute."},
            {"numero": 4, "texte": "Remarque comment ton corps se sent après avoir bu."},
            {"numero": 5, "texte": "Observe si tu as faim, froid, chaud, si tu as besoin de bouger."},
            {"numero": 6, "texte": "Réponds à un besoin que tu as identifié, même par un petit geste immédiat."}
        ]
    },

]
```

---

## Étape 5 — Créer le script `seed.py`

### 5.1 Contenu de `seeds/seed_routines.py`

```python
"""
Script d'insertion des 15 routines du MVP en base de données.
Usage : python seeds/seed_routines.py
"""
import asyncio
import sys
import os

# Permet d'importer les modules app depuis la racine du projet
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.models.routine import Routine
from app.database import Base
from app.config import settings
from seeds.routines_data import ROUTINES


DATABASE_URL = settings.DATABASE_URL.replace(
    "postgresql://", "postgresql+asyncpg://"
)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def seed():
    async with AsyncSessionLocal() as session:
        # Vérifier si des routines existent déjà
        result = await session.execute(select(Routine))
        existing = result.scalars().all()

        if existing:
            print(f"⚠️  {len(existing)} routine(s) déjà présente(s) en base.")
            confirmation = input("Veux-tu les supprimer et réinsérer ? (oui/non) : ")
            if confirmation.strip().lower() != "oui":
                print("Annulé. Aucune modification.")
                return

            for r in existing:
                await session.delete(r)
            await session.commit()
            print("🗑️  Routines existantes supprimées.")

        # Insérer les nouvelles routines
        inserted = 0
        for data in ROUTINES:
            routine = Routine(**data)
            session.add(routine)
            inserted += 1

        await session.commit()
        print(f"✅ {inserted} routines insérées avec succès.")


if __name__ == "__main__":
    asyncio.run(seed())
```

### 5.2 Créer `seeds/__init__.py`

```bash
touch seeds/__init__.py
```

### 5.3 Lancer le script

```bash
python seeds/seed_routines.py
```

Tu dois voir :
```
✅ 15 routines insérées avec succès.
```

---

## Étape 6 — Tester les endpoints

### 6.1 Démarrer le serveur

```bash
uvicorn app.main:app --reload
```

### 6.2 Tests via la documentation interactive

Ouvre `http://localhost:8000/docs` dans ton navigateur.

**Test 1 — Liste complète**
```
GET /api/routines/
```
→ Résultat attendu : tableau JSON de 15 routines (sans les étapes)

**Test 2 — Filtre par catégorie**
```
GET /api/routines/?categorie=Stress
```
→ Résultat attendu : 3 routines

**Test 3 — Filtre par moment et durée**
```
GET /api/routines/?moment=Matin&duree_max=5
```
→ Résultat attendu : routines du matin de 5 minutes max

**Test 4 — Détail d'une routine**

Copie l'`id` d'une routine dans la réponse du Test 1, puis :
```
GET /api/routines/{id_copié}
```
→ Résultat attendu : objet routine complet avec le tableau `etapes`

**Test 5 — Routine inexistante**
```
GET /api/routines/00000000-0000-0000-0000-000000000000
```
→ Résultat attendu : `{"detail": "Routine introuvable"}` avec status 404

### 6.3 Tests via curl (optionnel)

```bash
# Liste complète
curl http://localhost:8000/api/routines/ | python3 -m json.tool

# Filtré par catégorie
curl "http://localhost:8000/api/routines/?categorie=Sommeil" | python3 -m json.tool
```

---

## Étape 7 — Vérification directe en base (optionnel)

Pour confirmer que les données sont bien en base :

```bash
psql -U bienetre_user -d bienetre_db
```

```sql
-- Compter les routines
SELECT COUNT(*) FROM routines;

-- Voir la répartition par catégorie
SELECT categorie, COUNT(*) as total
FROM routines
GROUP BY categorie
ORDER BY categorie;

-- Voir les routines gratuites vs premium
SELECT is_premium, COUNT(*) FROM routines GROUP BY is_premium;
```

Résultats attendus :
```
 COUNT
-------
    15

   categorie    | total
----------------+-------
 Concentration  |     2
 Énergie        |     2
 Émotions       |     3
 Mouvement      |     2
 Sommeil        |     3
 Stress         |     3

 is_premium | count
------------+-------
 false      |    13
 true       |     2
```

---

## Étape 8 — Mettre à jour `app/routes/__init__.py`

Si ce fichier est vide, il n'y a rien à faire. Si tu veux vérifier que tous les routeurs sont bien importés dans `main.py`, relis `app/main.py` — tous les routers doivent être inclus via `app.include_router(...)`.

---

## Étape 9 — Commit Git

Une fois tout fonctionnel :

```bash
git add .
git commit -m "feat(semaine-2): modèle Routine, schémas Pydantic, endpoints GET, seed 15 routines"
git push origin develop
```

> **Convention de message de commit :**
> - `feat(...)` : nouvelle fonctionnalité
> - `fix(...)` : correction de bug
> - `chore(...)` : tâche technique (config, dépendances)
> - `docs(...)` : documentation

---

## Récapitulatif — Ordre d'exécution

| # | Action | Fichier / Commande |
|---|--------|--------------------|
| 1 | Mettre à jour le modèle Routine | `app/models/routine.py` |
| 2 | Créer la migration Alembic | `alembic revision --autogenerate -m "..."` |
| 3 | Appliquer la migration | `alembic upgrade head` |
| 4 | Créer les schémas Pydantic | `app/schemas/routine.py` |
| 5 | Créer les endpoints routines | `app/routes/routines.py` |
| 6 | Créer le fichier de données | `seeds/routines_data.py` |
| 7 | Créer le script d'insertion | `seeds/seed_routines.py` |
| 8 | Lancer le seed | `python seeds/seed_routines.py` |
| 9 | Démarrer le serveur | `uvicorn app.main:app --reload` |
| 10 | Tester les endpoints | `http://localhost:8000/docs` |
| 11 | Commit Git | `git commit -m "feat(semaine-2): ..."` |

---

## Livrable de fin de semaine 2

✅ Modèle `Routine` complet avec tous les attributs  
✅ Migration Alembic appliquée sans erreur  
✅ 15 routines insérées en base via `seed_routines.py`  
✅ `GET /api/routines/` retourne la liste avec filtres fonctionnels  
✅ `GET /api/routines/{id}` retourne le détail complet avec les étapes  
✅ Erreur 404 correcte pour une routine inexistante  
✅ Commit pushé sur la branche `develop`

---

## Points d'attention

**Les étapes sont stockées en JSONB.** PostgreSQL stocke le tableau d'étapes sous forme de JSON natif. C'est plus flexible qu'une table séparée pour le MVP, et ça facilite la lecture d'une routine complète en une seule requête.

**Deux routines sont marquées `is_premium: True`** (`Lettre à soi-même` et `Recadrage cognitif rapide`). La logique de blocage premium sera implémentée en semaine 9 avec Stripe. Pour l'instant, elles sont accessibles librement — c'est voulu.

**Le filtre `moment`** inclut automatiquement `N'importe quand` en plus du moment demandé. Ainsi, `?moment=Matin` retourne les routines du matin ET celles marquées "N'importe quand".

---

*Prochaine étape : Semaine 3 — Frontend PWA et affichage des routines sur mobile*