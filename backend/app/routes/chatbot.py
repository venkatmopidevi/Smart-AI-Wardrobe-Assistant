"""
Smart AI Wardrobe Assistant - Chatbot Routes
Gemini-powered AI fashion chatbot with voice support
"""
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from fastapi.responses import FileResponse
from typing import Optional
from datetime import datetime
from bson import ObjectId
from app.utils.auth import get_current_user
from app.database import get_database
from app.models.outfit import ChatMessage, ChatResponse
from app.services.gemini_service import chat_with_gemini
from app.services.weather_service import get_weather
import logging
import tempfile
import os

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chatbot", tags=["Chatbot"])


@router.post("/chat")
async def chat(
    data: ChatMessage,
    current_user=Depends(get_current_user),
):
    """Send a message to the AI Fashion Chatbot."""
    db = get_database()
    user_id = str(current_user["_id"])

    # Fetch wardrobe for context
    cursor = db.clothing_items.find({"user_id": user_id}).limit(20)
    wardrobe = await cursor.to_list(20)

    # Fetch weather if city provided
    weather_data = None
    if data.weather_city:
        try:
            weather_data = await get_weather(data.weather_city)
        except Exception:
            pass

    # Fetch recent chat history (last 6 messages)
    history_cursor = db.chat_history.find({"user_id": user_id}).sort("timestamp", -1).limit(6)
    history_raw = await history_cursor.to_list(6)
    chat_history = [
        {"role": h["role"], "content": h["content"]}
        for h in reversed(history_raw)
    ]

    # Call Gemini
    result = await chat_with_gemini(
        message=data.message,
        wardrobe_context=wardrobe,
        weather_context=weather_data,
        chat_history=chat_history,
    )

    now = datetime.utcnow()

    # Save chat history
    await db.chat_history.insert_many([
        {"user_id": user_id, "role": "user", "content": data.message, "timestamp": now},
        {"user_id": user_id, "role": "model", "content": result["reply"], "timestamp": now},
    ])

    return {
        "reply": result["reply"],
        "suggestions": result.get("suggestions", []),
        "outfit_items": result.get("outfit_items", []),
        "timestamp": now,
    }


@router.get("/history")
async def get_chat_history(
    limit: int = 30,
    current_user=Depends(get_current_user),
):
    """Retrieve chat history for the current user."""
    db = get_database()
    user_id = str(current_user["_id"])

    cursor = db.chat_history.find({"user_id": user_id}).sort("timestamp", -1).limit(limit)
    history = await cursor.to_list(limit)

    return {
        "messages": [
            {
                "id": str(h["_id"]),
                "role": h["role"],
                "content": h["content"],
                "timestamp": h["timestamp"],
            }
            for h in reversed(history)
        ]
    }


@router.delete("/history")
async def clear_chat_history(current_user=Depends(get_current_user)):
    """Clear all chat history for the current user."""
    db = get_database()
    result = await db.chat_history.delete_many({"user_id": str(current_user["_id"])})
    return {"message": f"Deleted {result.deleted_count} messages"}


@router.post("/tts")
async def text_to_speech(
    data: dict,
    current_user=Depends(get_current_user),
):
    """Convert text to speech (gTTS) and return audio file."""
    text = data.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="No text provided")

    try:
        from gtts import gTTS
        tts = gTTS(text=text[:500], lang="en", slow=False)
        tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
        tts.save(tmp.name)
        return FileResponse(
            tmp.name,
            media_type="audio/mpeg",
            filename="response.mp3",
        )
    except ImportError:
        raise HTTPException(status_code=503, detail="TTS service unavailable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS error: {e}")
