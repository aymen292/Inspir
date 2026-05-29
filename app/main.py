from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from fastapi.staticfiles import StaticFiles 
from fastapi.responses import FileResponse 
import os 
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

# Servir les fichiers statiques du frontend
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

if os.path.exists(FRONTEND_DIR):
    app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")
    app.mount("/icons", StaticFiles(directory=os.path.join(FRONTEND_DIR, "icons")), name="icons")
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")

    @app.get("/manifest.json")
    async def manifest():
        return FileResponse(os.path.join(FRONTEND_DIR, "manifest.json"))

    @app.get("/sw.js")
    async def service_worker():
        return FileResponse(os.path.join(FRONTEND_DIR, "sw.js"))

    @app.get("/routine.html")
    async def routine_page():
        return FileResponse(os.path.join(FRONTEND_DIR, "routine.html"))

    @app.get("/", include_in_schema=False)
    async def frontend_home():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
    
@app.get("/")
def root():
    return {"status": "ok", "message": "Bienvenue sur l'API Bien-être"}