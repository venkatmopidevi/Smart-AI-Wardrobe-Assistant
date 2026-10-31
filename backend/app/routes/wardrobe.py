"""
Smart AI Wardrobe Assistant - Wardrobe Routes v2
Upload, classify (EfficientNetB0), CRUD, correction feedback for clothing items.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
from app.utils.auth import get_current_user
from app.database import get_database
from app.models.clothing import ClothingItemUpdate, ClothingItemCorrection
from app.utils.image_processing import save_upload_file, delete_upload_file
from app.services.ai_classifier import classify_clothing
import logging
import os

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/wardrobe", tags=["Wardrobe"])


def serialize_item(item: dict) -> dict:
    return {
        "id": str(item["_id"]),
        "user_id": item["user_id"],
        "name": item.get("name", ""),
        "image_url": item.get("image_url", ""),
        "thumbnail_url": item.get("thumbnail_url"),
        "category": item.get("category", "Other"),
        "style": item.get("style", "casual"),
        "season": item.get("season", "all"),
        "brand": item.get("brand"),
        "notes": item.get("notes"),
        "tags": item.get("tags", []),
        "dominant_colors": item.get("dominant_colors", []),
        "secondary_color": item.get("secondary_color"),
        "confidence_score": item.get("confidence_score", 0.0),
        "confidence_status": item.get("confidence_status", "manual_required"),
        "formality_score": item.get("formality_score", 0.5),
        "wear_count": item.get("wear_count", 0),
        "last_worn": item.get("last_worn"),
        "created_at": item.get("created_at", datetime.utcnow()),
        "is_favorite": item.get("is_favorite", False),
        "was_corrected": item.get("was_corrected", False),
    }


@router.post("/upload")
async def upload_clothing(
    file: UploadFile = File(...),
    name: str = Form(""),
    brand: str = Form(""),
    notes: str = Form(""),
    current_user=Depends(get_current_user),
):
    """Upload a clothing image and auto-classify it using EfficientNetB0."""
    db = get_database()
    user_id = str(current_user["_id"])

    # Save uploaded file
    image_url, thumbnail_url = await save_upload_file(file, subfolder="clothing")

    # Run AI classification (preprocessing → EfficientNetB0 → color engine)
    abs_path = image_url.lstrip("/")
    classification = classify_clothing(abs_path)

    # Auto-name if not provided
    if not name:
        color = classification["dominant_colors"][0]["name"] if classification["dominant_colors"] else ""
        name = f"{color} {classification['category']}".strip()

    # Determine primary season
    seasons = classification.get("season_suitability", ["all"])
    primary_season = seasons[0] if seasons else "all"

    # Store in MongoDB (extended schema)
    item_doc = {
        "user_id":          user_id,
        "name":             name,
        "image_url":        image_url,
        "thumbnail_url":    thumbnail_url,
        "category":         classification["category"],
        "style":            classification["style"],
        "season":           primary_season,
        "season_suitability": seasons,
        "brand":            brand or None,
        "notes":            notes or None,
        "tags":             [],
        "dominant_colors":  classification["dominant_colors"],
        "secondary_color":  classification.get("secondary_color"),
        "confidence_score": classification["confidence"],
        "confidence_status": classification["confidence_status"],
        "formality_score":  classification["formality_score"],
        "wear_count":       0,
        "last_worn":        None,
        "is_favorite":      False,
        "was_corrected":    False,
        "created_at":       datetime.utcnow(),
    }

    result = await db.clothing_items.insert_one(item_doc)
    item_doc["_id"] = result.inserted_id

    # Update user's clothing count
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"total_clothes": 1}}
    )

    return {"item": serialize_item(item_doc), "classification": classification}


@router.post("/items/{item_id}/correct")
async def correct_classification(
    item_id: str,
    data: ClothingItemCorrection,
    current_user=Depends(get_current_user),
):
    """
    Submit a manual correction for an AI classification result.

    - Updates the clothing item in MongoDB with corrected values
    - Stores a correction record in the classification_corrections collection
      (for continuous learning / future retraining)
    """
    db = get_database()
    try:
        oid = ObjectId(item_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid item ID")

    user_id = str(current_user["_id"])
    item = await db.clothing_items.find_one({"_id": oid, "user_id": user_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Record original predictions before overwriting
    original_category = item.get("category", "Other")
    original_color = (
        item.get("dominant_colors", [{}])[0].get("name", "Unknown")
        if item.get("dominant_colors") else "Unknown"
    )

    corrected_category = data.corrected_category.value
    corrected_color    = data.corrected_color.value

    # Update the clothing item with corrected values
    update_fields = {
        "category":          corrected_category,
        "was_corrected":     True,
        "corrected_at":      datetime.utcnow(),
    }

    # If color corrected, update dominant_colors[0].name
    if corrected_color != original_color:
        dominant_colors = item.get("dominant_colors", [])
        if dominant_colors:
            dominant_colors[0]["name"] = corrected_color
            update_fields["dominant_colors"] = dominant_colors

    await db.clothing_items.update_one({"_id": oid}, {"$set": update_fields})

    # Insert correction feedback record (for training dataset)
    correction_doc = {
        "item_id":            item_id,
        "image_path":         item.get("image_url", ""),
        "predicted_category": original_category,
        "corrected_category": corrected_category,
        "predicted_color":    original_color,
        "corrected_color":    corrected_color,
        "user_id":            user_id,
        "timestamp":          datetime.utcnow(),
        "notes":              data.notes,
        "confidence_at_prediction": item.get("confidence_score", 0.0),
    }
    await db.classification_corrections.insert_one(correction_doc)

    logger.info(
        f"Correction recorded: item={item_id} "
        f"cat={original_category}→{corrected_category} "
        f"color={original_color}→{corrected_color}"
    )

    # Return updated item
    updated = await db.clothing_items.find_one({"_id": oid})
    return {
        "message": "Correction saved successfully",
        "item": serialize_item(updated),
        "correction": {
            "original_category": original_category,
            "corrected_category": corrected_category,
            "original_color": original_color,
            "corrected_color": corrected_color,
        }
    }


@router.get("/items")
async def get_wardrobe(
    category: Optional[str] = Query(None),
    style: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user=Depends(get_current_user),
):
    """Get the current user's wardrobe items with optional filtering."""
    db = get_database()
    user_id = str(current_user["_id"])

    query = {"user_id": user_id}
    if category:
        query["category"] = category
    if style:
        query["style"] = style

    total = await db.clothing_items.count_documents(query)
    skip = (page - 1) * limit
    cursor = db.clothing_items.find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)

    return {
        "items": [serialize_item(i) for i in items],
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/items/{item_id}")
async def get_item(item_id: str, current_user=Depends(get_current_user)):
    """Get a specific clothing item by ID."""
    db = get_database()
    try:
        item = await db.clothing_items.find_one({
            "_id": ObjectId(item_id),
            "user_id": str(current_user["_id"])
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid item ID")

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return serialize_item(item)


@router.put("/items/{item_id}")
async def update_item(
    item_id: str,
    data: ClothingItemUpdate,
    current_user=Depends(get_current_user),
):
    """Update clothing item metadata."""
    db = get_database()
    try:
        oid = ObjectId(item_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid item ID")

    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")

    result = await db.clothing_items.update_one(
        {"_id": oid, "user_id": str(current_user["_id"])},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")

    item = await db.clothing_items.find_one({"_id": oid})
    return serialize_item(item)


@router.delete("/items/{item_id}")
async def delete_item(item_id: str, current_user=Depends(get_current_user)):
    """Delete a clothing item."""
    db = get_database()
    try:
        oid = ObjectId(item_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid item ID")

    item = await db.clothing_items.find_one({"_id": oid, "user_id": str(current_user["_id"])})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    delete_upload_file(item.get("image_url", ""))
    delete_upload_file(item.get("thumbnail_url", ""))

    await db.clothing_items.delete_one({"_id": oid})
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"total_clothes": -1}}
    )

    return {"message": "Item deleted successfully"}


@router.post("/items/{item_id}/favorite")
async def toggle_favorite(item_id: str, current_user=Depends(get_current_user)):
    """Toggle favorite status for a clothing item."""
    db = get_database()
    try:
        oid = ObjectId(item_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid item ID")

    item = await db.clothing_items.find_one({"_id": oid, "user_id": str(current_user["_id"])})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    new_status = not item.get("is_favorite", False)
    await db.clothing_items.update_one({"_id": oid}, {"$set": {"is_favorite": new_status}})
    return {"is_favorite": new_status}


@router.post("/items/{item_id}/wear")
async def log_wear(item_id: str, current_user=Depends(get_current_user)):
    """Log that an item was worn today."""
    db = get_database()
    try:
        oid = ObjectId(item_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid item ID")

    now = datetime.utcnow()
    result = await db.clothing_items.update_one(
        {"_id": oid, "user_id": str(current_user["_id"])},
        {"$inc": {"wear_count": 1}, "$set": {"last_worn": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")

    await db.wear_logs.insert_one({
        "user_id": str(current_user["_id"]),
        "clothing_id": item_id,
        "worn_at": now,
    })
    return {"message": "Wear logged", "worn_at": now}
