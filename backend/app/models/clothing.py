"""
Smart AI Wardrobe Assistant - Pydantic Models for Clothing Items (v2)
Extended categories, correction model, and classification feedback schema.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ClothingCategory(str, Enum):
    # Tops
    SHIRT      = "Shirt"
    T_SHIRT    = "T-Shirt"
    POLO_SHIRT = "Polo Shirt"
    HOODIE     = "Hoodie"
    SWEATER    = "Sweater"
    JACKET     = "Jacket"
    BLAZER     = "Blazer"
    # Bottoms
    JEANS      = "Jeans"
    TROUSER    = "Trouser"
    SHORTS     = "Shorts"
    # Footwear
    SHOES      = "Shoes"
    SNEAKERS   = "Sneakers"
    SANDALS    = "Sandals"
    # Accessories
    BELT       = "Belt"
    CAP        = "Cap"
    TIE        = "Tie"
    # Legacy / misc
    DRESS      = "Dress"
    SKIRT      = "Skirt"
    SUIT       = "Suit"
    COAT       = "Coat"
    OTHER      = "Other"


class ClothingColor(str, Enum):
    BLACK     = "Black"
    WHITE     = "White"
    GREY      = "Grey"
    NAVY_BLUE = "Navy Blue"
    BLUE      = "Blue"
    SKY_BLUE  = "Sky Blue"
    RED       = "Red"
    MAROON    = "Maroon"
    GREEN     = "Green"
    OLIVE     = "Olive"
    YELLOW    = "Yellow"
    ORANGE    = "Orange"
    BROWN     = "Brown"
    BEIGE     = "Beige"
    CREAM     = "Cream"
    PURPLE    = "Purple"
    PINK      = "Pink"
    UNKNOWN   = "Unknown"


class ClothingStyle(str, Enum):
    CASUAL      = "casual"
    FORMAL      = "formal"
    SPORTY      = "sporty"
    PARTY       = "party"
    BUSINESS    = "business"
    TRADITIONAL = "traditional"
    OTHER       = "other"


class Season(str, Enum):
    SUMMER = "summer"
    WINTER = "winter"
    SPRING = "spring"
    AUTUMN = "autumn"
    ALL    = "all"


# ─── Request Models ────────────────────────────────────────────────────────────

class ClothingItemUpdate(BaseModel):
    name:     Optional[str]              = None
    category: Optional[ClothingCategory] = None
    style:    Optional[ClothingStyle]    = None
    season:   Optional[Season]           = None
    brand:    Optional[str]              = None
    notes:    Optional[str]              = None
    tags:     Optional[List[str]]        = []


class ClothingItemCorrection(BaseModel):
    """Payload for user-submitted AI prediction corrections."""
    corrected_category: ClothingCategory
    corrected_color:    ClothingColor
    notes:              Optional[str] = None


# ─── Response Models ───────────────────────────────────────────────────────────

class ColorInfo(BaseModel):
    name:       str        # e.g. "Navy Blue"
    hex:        str        # e.g. "#1a237e"
    rgb:        List[int]  # [26, 35, 126]
    percentage: float      # 0.0 - 1.0


class AIClassificationResult(BaseModel):
    category:          str
    confidence:        float           # 0.0 - 1.0
    confidence_status: str             # accepted | needs_review | manual_required
    dominant_colors:   List[ColorInfo]
    secondary_color:   Optional[str]   = None
    style:             str
    season_suitability: List[str]
    formality_score:   float           # 0 = casual, 1 = formal
    all_scores:        dict            = {}


class CorrectionRecord(BaseModel):
    """Schema for classification_corrections MongoDB collection."""
    item_id:             str
    image_path:          str
    predicted_category:  str
    corrected_category:  str
    predicted_color:     str
    corrected_color:     str
    user_id:             str
    timestamp:           datetime
    notes:               Optional[str] = None


class ClothingItemResponse(BaseModel):
    id:               str
    user_id:          str
    name:             str
    image_url:        str
    thumbnail_url:    Optional[str]   = None
    category:         str
    style:            str
    season:           str
    brand:            Optional[str]   = None
    notes:            Optional[str]   = None
    tags:             List[str]       = []
    dominant_colors:  List[ColorInfo] = []
    secondary_color:  Optional[str]   = None
    confidence_score: float           = 0.0
    confidence_status: str            = "manual_required"
    formality_score:  float           = 0.0
    wear_count:       int             = 0
    last_worn:        Optional[datetime] = None
    created_at:       datetime
    is_favorite:      bool            = False
    was_corrected:    bool            = False   # True if user corrected the AI


class ClothingListResponse(BaseModel):
    items: List[ClothingItemResponse]
    total: int
    page:  int
    limit: int
