"""
Smart AI Wardrobe Assistant - Admin Routes
"""
from fastapi import APIRouter, Depends, Query
from app.utils.auth import get_admin_user
from app.database import get_database
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/stats")
async def get_system_stats(admin=Depends(get_admin_user)):
    """Get overall system statistics."""
    db = get_database()
    total_users = await db.users.count_documents({})
    total_clothes = await db.clothing_items.count_documents({})
    total_outfits = await db.outfits.count_documents({})
    total_chats = await db.chat_history.count_documents({})
    total_wears = await db.wear_logs.count_documents({})

    return {
        "total_users": total_users,
        "total_clothes": total_clothes,
        "total_outfits": total_outfits,
        "total_chats": total_chats,
        "total_wear_logs": total_wears,
        "generated_at": datetime.utcnow(),
    }


@router.get("/users")
async def get_all_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin=Depends(get_admin_user),
):
    """Get all registered users."""
    db = get_database()
    skip = (page - 1) * limit
    total = await db.users.count_documents({})
    cursor = db.users.find({}, {"password_hash": 0}).sort("created_at", -1).skip(skip).limit(limit)
    users = await cursor.to_list(limit)

    serialized = []
    for u in users:
        clothing_count = await db.clothing_items.count_documents({"user_id": str(u["_id"])})
        serialized.append({
            "id": str(u["_id"]),
            "name": u.get("name"),
            "email": u.get("email"),
            "gender": u.get("gender"),
            "is_admin": u.get("is_admin", False),
            "created_at": u.get("created_at"),
            "total_clothes": clothing_count,
        })

    return {"users": serialized, "total": total, "page": page, "limit": limit}


@router.get("/clothes")
async def get_all_clothes(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin=Depends(get_admin_user),
):
    """Get all uploaded clothing items across all users."""
    db = get_database()
    skip = (page - 1) * limit
    total = await db.clothing_items.count_documents({})
    cursor = db.clothing_items.find({}).sort("created_at", -1).skip(skip).limit(limit)
    items = await cursor.to_list(limit)

    return {
        "items": [
            {
                "id": str(i["_id"]),
                "user_id": i.get("user_id"),
                "name": i.get("name"),
                "category": i.get("category"),
                "image_url": i.get("image_url"),
                "created_at": i.get("created_at"),
            }
            for i in items
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }
