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