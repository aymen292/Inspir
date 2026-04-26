# app/services/redis_service.py
import redis.asyncio as redis
from app.config import settings

# Client Redis partagé (connexion async)
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


async def set_session(key: str, value: str, expire: int = 3600):
    """Stocke une valeur avec expiration (en secondes). Défaut : 1 heure."""
    await redis_client.setex(key, expire, value)


async def get_session(key: str) -> str | None:
    """Récupère une valeur. Retourne None si la clé n'existe pas ou a expiré."""
    return await redis_client.get(key)


async def delete_session(key: str):
    """Supprime une clé (ex: déconnexion, révocation de token)."""
    await redis_client.delete(key)


async def set_streak_cache(user_id: str, streak: int):
    """Cache le streak d'un utilisateur pendant 25 heures."""
    await redis_client.setex(f"streak:{user_id}", 60 * 60 * 25, str(streak))


async def get_streak_cache(user_id: str) -> int | None:
    """Récupère le streak en cache. Retourne None si absent."""
    value = await redis_client.get(f"streak:{user_id}")
    return int(value) if value else None


async def invalidate_streak_cache(user_id: str):
    """Invalide le cache du streak (après une activité de l'utilisateur)."""
    await redis_client.delete(f"streak:{user_id}")