"""
Smart AI Wardrobe Assistant - Recommendation & Weather Routes
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from bson import ObjectId
from datetime import datetime
from app.utils.auth import get_current_user
from app.database import get_database
from app.services.recommendation import generate_occasion_outfit, get_personalized_recommendations
from app.services.weather_service import get_weather, get_clothing_advice
from app.services.color_engine import compute_outfit_compatibility
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])


async def get_user_wardrobe(user_id: str, db) -> list:
    """Helper to fetch all wardrobe items for a user."""
    cursor = db.clothing_items.find({"user_id": user_id})
    items = await cursor.to_list(length=200)
    for item in items:
        item["id"] = str(item["_id"])
    return items


def serialize_outfit_item(item: dict) -> dict:
    dominant = item.get("dominant_colors", [{}])
    color = dominant[0].get("name", "Unknown") if dominant else "Unknown"
    return {
        "clothing_id": str(item.get("_id", item.get("id", ""))),
        "name": item.get("name", ""),
        "category": item.get("category", ""),
        "image_url": item.get("image_url", ""),
        "dominant_color": color,
    }


@router.get("/occasion")
async def recommend_by_occasion(
    occasion: str = Query(..., description="e.g. interview, party, casual"),
    city: Optional[str] = Query(None, description="City for weather-based advice"),
    current_user=Depends(get_current_user),
):
    """Generate a complete outfit recommendation for a given occasion."""
    db = get_database()
    user_id = str(current_user["_id"])
    wardrobe = await get_user_wardrobe(user_id, db)

    if not wardrobe:
        return {
            "success": False,
            "message": "Your wardrobe is empty! Upload some clothes first.",
            "outfit": None,
        }

    # Optional weather context
    weather_advice = None
    weather_data = None
    if city:
        try:
            weather_data = await get_weather(city)
            weather_advice = get_clothing_advice(weather_data)
        except Exception as e:
            logger.warning(f"Weather fetch failed: {e}")

    outfit = await generate_occasion_outfit(wardrobe, occasion, weather_advice)
    if not outfit:
        return {
            "success": False,
            "message": f"Not enough clothes for a '{occasion}' outfit. Try uploading more items!",
            "outfit": None,
        }

    # Serialize outfit items
    outfit["items"] = [serialize_outfit_item(i) for i in outfit["items"]]

    # Save to outfits collection
    outfit_doc = {
        **outfit,
        "user_id": user_id,
        "created_at": datetime.utcnow(),
    }
    result = await db.outfits.insert_one(outfit_doc)
    outfit["id"] = str(result.inserted_id)

    return {
        "success": True,
        "outfit": outfit,
        "weather": weather_data,
    }


@router.get("/weather")
async def get_weather_recommendations(
    city: str = Query(...),
    current_user=Depends(get_current_user),
):
    """Get weather data and clothing advice for a city."""
    try:
        weather = await get_weather(city)
        advice = get_clothing_advice(weather)
        return {"weather": weather, "clothing_advice": advice}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/personalized")
async def get_personalized(
    limit: int = Query(6, ge=1, le=20),
    current_user=Depends(get_current_user),
):
    """Get personalized outfit recommendations based on wear history."""
    db = get_database()
    user_id = str(current_user["_id"])
    wardrobe = await get_user_wardrobe(user_id, db)

    wear_history_cursor = db.wear_logs.find({"user_id": user_id}).sort("worn_at", -1).limit(50)
    wear_history = await wear_history_cursor.to_list(50)

    recommended = get_personalized_recommendations(wardrobe, wear_history, limit)

    return {
        "items": [serialize_outfit_item(i) for i in recommended],
        "total": len(recommended),
        "message": "Based on your style preferences and wear history",
    }


@router.get("/color-check")
async def check_color_compatibility(
    item_ids: str = Query(..., description="Comma-separated item IDs"),
    current_user=Depends(get_current_user),
):
    """Check color compatibility between selected wardrobe items."""
    db = get_database()
    user_id = str(current_user["_id"])
    ids = [i.strip() for i in item_ids.split(",") if i.strip()]

    items = []
    for iid in ids:
        try:
            item = await db.clothing_items.find_one({"_id": ObjectId(iid), "user_id": user_id})
            if item:
                items.append(item)
        except Exception:
            pass

    if len(items) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 valid item IDs")

    compatibility = compute_outfit_compatibility(items)
    return {
        "compatibility": compatibility,
        "items": [serialize_outfit_item(i) for i in items],
    }


@router.get("/history")
async def get_outfit_history(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    current_user=Depends(get_current_user),
):
    """Get the user's outfit recommendation history."""
    db = get_database()
    user_id = str(current_user["_id"])
    skip = (page - 1) * limit
    total = await db.outfits.count_documents({"user_id": user_id})
    cursor = db.outfits.find({"user_id": user_id}).sort("created_at", -1).skip(skip).limit(limit)
    outfits = await cursor.to_list(length=limit)

    serialized = []
    for o in outfits:
        serialized.append({
            "id": str(o["_id"]),
            "occasion": o.get("occasion"),
            "items": o.get("items", []),
            "compatibility_score": o.get("compatibility_score", 0),
            "style_score": o.get("style_score", 0),
            "description": o.get("description", ""),
            "created_at": o.get("created_at"),
        })

    return {"outfits": serialized, "total": total, "page": page, "limit": limit}
