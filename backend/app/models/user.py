"""
Smart AI Wardrobe Assistant - Pydantic Models for Users
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    NON_BINARY = "non_binary"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class FashionStyle(str, Enum):
    CASUAL = "casual"
    FORMAL = "formal"
    SPORTY = "sporty"
    BOHEMIAN = "bohemian"
    MINIMALIST = "minimalist"
    STREETWEAR = "streetwear"
    VINTAGE = "vintage"
    PREPPY = "preppy"


# ─── Request Models ────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=72)
    gender: Optional[Gender] = None
    age: Optional[int] = Field(None, ge=13, le=120)
    fashion_preferences: Optional[List[FashionStyle]] = []
    location: Optional[str] = None  # for weather


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=72)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    gender: Optional[Gender] = None
    age: Optional[int] = Field(None, ge=13, le=120)
    fashion_preferences: Optional[List[FashionStyle]] = []
    location: Optional[str] = None
    avatar_url: Optional[str] = None


# ─── Response Models ───────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    gender: Optional[str] = None
    age: Optional[int] = None
    fashion_preferences: List[str] = []
    location: Optional[str] = None
    avatar_url: Optional[str] = None
    is_admin: bool = False
    created_at: datetime
    total_clothes: int = 0
    total_outfits: int = 0


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    message: str
    success: bool = True
