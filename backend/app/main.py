"""
Smart AI Wardrobe Assistant - FastAPI Main Application Entry Point
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import os

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.routes import auth, wardrobe, recommendations, chatbot, analytics, outfit_rating, admin

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ─── Lifespan (startup/shutdown) ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: connect DB on startup, close on shutdown."""
    logger.info("🚀 Starting Smart AI Wardrobe Assistant API...")
    await connect_to_mongo()

    # Ensure upload directories exist
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(f"{settings.UPLOAD_DIR}/clothing", exist_ok=True)
    os.makedirs(f"{settings.UPLOAD_DIR}/clothing/thumbnails", exist_ok=True)
    os.makedirs(f"{settings.UPLOAD_DIR}/ratings", exist_ok=True)

    yield

    logger.info("🛑 Shutting down...")
    await close_mongo_connection()


# ─── App Initialization ───────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered wardrobe management and outfit recommendation system",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)


# ─── CORS Middleware ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Static Files (uploaded images) ──────────────────────────────────────────
import os
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR, check_dir=False), name="uploads")


# ─── Global Exception Handler ─────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred.", "success": False},
    )


# ─── Include Routers ──────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(wardrobe.router)
app.include_router(recommendations.router)
app.include_router(chatbot.router)
app.include_router(analytics.router)
app.include_router(outfit_rating.router)
app.include_router(admin.router)


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "docs": "/api/docs",
        "version": settings.APP_VERSION,
    }
