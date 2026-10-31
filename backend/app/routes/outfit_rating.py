"""
Smart AI Wardrobe Assistant - Outfit Rating Routes
AI-powered outfit rating from uploaded selfie
"""
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from app.utils.auth import get_current_user
from app.utils.image_processing import save_upload_file
from app.services.ai_classifier import classify_clothing, extract_dominant_colors
from app.services.gemini_service import rate_outfit_with_gemini
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/rating", tags=["Outfit Rating"])


@router.post("/analyze")
async def analyze_outfit(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """
    Upload an outfit photo/selfie for AI rating.
    Returns style score, color analysis, and personalized feedback.
    """
    # Save image
    image_url, _ = await save_upload_file(file, subfolder="ratings")
    abs_path = image_url.lstrip("/")

    # Run AI classification on the image
    classification = classify_clothing(abs_path)

    # Build description for Gemini
    colors = classification.get("dominant_colors", [])
    color_names = [c["name"] for c in colors[:3]]
    outfit_desc = (
        f"Outfit category: {classification['category']}\n"
        f"Style: {classification['style']}\n"
        f"Formality level: {classification['formality_score']:.1f}/1.0\n"
        f"Dominant colors: {', '.join(color_names)}\n"
        f"Season suitability: {', '.join(classification.get('season_suitability', []))}"
    )

    # Rate with Gemini
    rating = await rate_outfit_with_gemini(outfit_desc, classification)

    return {
        "image_url": image_url,
        "rating": rating,
        "color_analysis": colors,
        "detected_style": classification["style"],
        "formality": classification["formality_score"],
    }
