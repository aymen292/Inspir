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