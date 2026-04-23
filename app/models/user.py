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