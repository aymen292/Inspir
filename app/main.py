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