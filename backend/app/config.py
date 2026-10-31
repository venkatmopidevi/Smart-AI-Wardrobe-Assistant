"""
Smart AI Wardrobe Assistant - Configuration
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "Smart AI Wardrobe Assistant"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Security
    SECRET_KEY: str = "your-super-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "wardrobe_assistant"

    # Google Gemini API
    GEMINI_API_KEY: str = ""

    # OpenWeatherMap
    WEATHER_API_KEY: str = ""
    WEATHER_BASE_URL: str = "https://api.openweathermap.org/data/2.5"

    # File Upload
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10485760  # 10MB
    ALLOWED_EXTENSIONS: str = "jpg,jpeg,png,webp"

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"

    # Admin
    ADMIN_EMAIL: str = "admin@wardrobe.ai"
    ADMIN_PASSWORD: str = "admin123"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
