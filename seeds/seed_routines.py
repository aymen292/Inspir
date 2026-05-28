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