"""
Smart AI Wardrobe Assistant - Pydantic Models for Outfits & Analytics
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class Occasion(str, Enum):
    INTERVIEW = "interview"
    COLLEGE = "college"
    PARTY = "party"
    WEDDING = "wedding"
    CASUAL = "casual"
    OFFICE = "office"
    GYM = "gym"
    DATE = "date"
    TRAVEL = "travel"


# ─── Outfit Models ─────────────────────────────────────────────────────────────

class OutfitRecommendationRequest(BaseModel):
    occasion: Optional[Occasion] = None
    weather_city: Optional[str] = None
    use_weather: bool = False


class OutfitItem(BaseModel):
    clothing_id: str
    name: str
    category: str
    image_url: str
    dominant_color: str


class OutfitResponse(BaseModel):
    id: Optional[str] = None
    items: List[OutfitItem]
    occasion: Optional[str] = None
    weather_context: Optional[str] = None
    compatibility_score: float   # 0-10
    style_score: float           # 0-10
    description: str
    tips: List[str] = []
    created_at: Optional[datetime] = None


# ─── Outfit Rating Models ──────────────────────────────────────────────────────

class OutfitRatingResponse(BaseModel):
    overall_score: float        # 0-10
    color_score: float
    formality_score: float
    style_score: float
    feedback: str
    suggestions: List[str]
    occasion_suitability: Dict[str, float]


# ─── Analytics Models ─────────────────────────────────────────────────────────

class WearLogCreate(BaseModel):
    clothing_id: str
    outfit_id: Optional[str] = None
    occasion: Optional[str] = None


class AnalyticsSummary(BaseModel):
    total_clothes: int
    total_outfits: int
    total_wear_logs: int
    favorite_colors: List[Dict[str, Any]]
    most_worn_items: List[Dict[str, Any]]
    category_distribution: Dict[str, int]
    style_distribution: Dict[str, int]
    monthly_activity: List[Dict[str, Any]]
    outfit_history: List[Dict[str, Any]]


# ─── Chat Models ──────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    weather_city: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    suggestions: List[str] = []
    outfit_items: List[OutfitItem] = []
    timestamp: datetime
