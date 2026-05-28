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