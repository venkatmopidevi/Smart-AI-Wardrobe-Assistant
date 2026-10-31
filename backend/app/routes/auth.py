"""
Smart AI Wardrobe Assistant - Authentication Routes
"""
from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
from bson import ObjectId
from app.models.user import UserRegister, UserLogin, UserUpdate, UserResponse, TokenResponse, MessageResponse
from app.utils.auth import hash_password, verify_password, create_access_token, get_current_user
from app.database import get_database
from app.config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def serialize_user(user: dict) -> dict:
    """Convert MongoDB user doc to serializable dict."""
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "gender": user.get("gender"),
        "age": user.get("age"),
        "fashion_preferences": user.get("fashion_preferences", []),
        "location": user.get("location"),
        "avatar_url": user.get("avatar_url"),
        "is_admin": user.get("is_admin", False),
        "created_at": user.get("created_at", datetime.utcnow()),
        "total_clothes": user.get("total_clothes", 0),
        "total_outfits": user.get("total_outfits", 0),
    }


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: UserRegister):
    """Register a new user account."""
    db = get_database()

    # Check if email already exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user document
    is_admin = (data.email == settings.ADMIN_EMAIL)
    user_doc = {
        "name": data.name,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "gender": data.gender,
        "age": data.age,
        "fashion_preferences": [str(p) for p in (data.fashion_preferences or [])],
        "location": data.location,
        "avatar_url": None,
        "is_admin": is_admin,
        "created_at": datetime.utcnow(),
        "total_clothes": 0,
        "total_outfits": 0,
    }

    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    token = create_access_token({"sub": str(result.inserted_id)})
    return {"access_token": token, "token_type": "bearer", "user": serialize_user(user_doc)}


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    """Authenticate user and return JWT token."""
    db = get_database()

    user = await db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user["_id"])})
    return {"access_token": token, "token_type": "bearer", "user": serialize_user(user)}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user=Depends(get_current_user)):
    """Get current authenticated user's profile."""
    db = get_database()
    # Get real counts
    clothing_count = await db.clothing_items.count_documents({"user_id": str(current_user["_id"])})
    outfit_count = await db.outfits.count_documents({"user_id": str(current_user["_id"])})
    current_user["total_clothes"] = clothing_count
    current_user["total_outfits"] = outfit_count
    return serialize_user(current_user)


@router.put("/profile", response_model=UserResponse)
async def update_profile(data: UserUpdate, current_user=Depends(get_current_user)):
    """Update user profile information."""
    db = get_database()

    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if "fashion_preferences" in update_data:
        update_data["fashion_preferences"] = [str(p) for p in update_data["fashion_preferences"]]

    if update_data:
        await db.users.update_one(
            {"_id": current_user["_id"]},
            {"$set": update_data}
        )

    updated_user = await db.users.find_one({"_id": current_user["_id"]})
    clothing_count = await db.clothing_items.count_documents({"user_id": str(current_user["_id"])})
    outfit_count = await db.outfits.count_documents({"user_id": str(current_user["_id"])})
    updated_user["total_clothes"] = clothing_count
    updated_user["total_outfits"] = outfit_count
    return serialize_user(updated_user)


@router.post("/logout", response_model=MessageResponse)
async def logout(current_user=Depends(get_current_user)):
    """Logout endpoint (client should discard token)."""
    return {"message": "Successfully logged out", "success": True}
