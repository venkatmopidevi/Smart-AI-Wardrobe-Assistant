"""
Smart AI Wardrobe Assistant - Analytics Routes v2
Added classification accuracy, correction rate, and AI performance metrics.
"""
from fastapi import APIRouter, Depends, Query
from datetime import datetime, timedelta
from collections import Counter
from app.utils.auth import get_current_user
from app.database import get_database
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/summary")
async def get_analytics_summary(current_user=Depends(get_current_user)):
    """Get comprehensive analytics for the user's wardrobe."""
    db = get_database()
    user_id = str(current_user["_id"])

    # Fetch all clothing items
    cursor = db.clothing_items.find({"user_id": user_id})
    items = await cursor.to_list(500)

    # Basic counts
    total_clothes = len(items)
    favorites_count = sum(1 for i in items if i.get("is_favorite"))

    # Category distribution
    categories = Counter(i.get("category", "Other") for i in items)

    # Style distribution
    styles = Counter(i.get("style", "casual") for i in items)

    # Color distribution (dominant color of each item)
    colors = Counter()
    for item in items:
        dom_colors = item.get("dominant_colors", [])
        if dom_colors:
            colors[dom_colors[0].get("name", "Unknown")] += 1

    # Most worn items (top 5)
    worn_items = sorted(
        [i for i in items if i.get("wear_count", 0) > 0],
        key=lambda x: x.get("wear_count", 0),
        reverse=True
    )[:5]

    # Outfits
    total_outfits = await db.outfits.count_documents({"user_id": user_id})

    # Wear logs per month (last 6 months)
    six_months_ago = datetime.utcnow() - timedelta(days=180)
    wear_logs_cursor = db.wear_logs.find({
        "user_id": user_id,
        "worn_at": {"$gte": six_months_ago}
    })
    wear_logs = await wear_logs_cursor.to_list(500)

    monthly_activity = {}
    for log in wear_logs:
        month_key = log["worn_at"].strftime("%Y-%m") if log.get("worn_at") else "Unknown"
        monthly_activity[month_key] = monthly_activity.get(month_key, 0) + 1

    monthly_list = [
        {"month": k, "count": v}
        for k, v in sorted(monthly_activity.items())
    ]

    # Recent outfits
    outfit_cursor = db.outfits.find({"user_id": user_id}).sort("created_at", -1).limit(5)
    recent_outfits = await outfit_cursor.to_list(5)

    return {
        "total_clothes": total_clothes,
        "total_outfits": total_outfits,
        "total_wear_logs": len(wear_logs),
        "favorites_count": favorites_count,
        "category_distribution": dict(categories),
        "style_distribution": dict(styles),
        "favorite_colors": [
            {"name": name, "count": count}
            for name, count in colors.most_common(8)
        ],
        "most_worn_items": [
            {
                "id": str(i["_id"]),
                "name": i.get("name", ""),
                "category": i.get("category", ""),
                "wear_count": i.get("wear_count", 0),
                "image_url": i.get("image_url", ""),
            }
            for i in worn_items
        ],
        "monthly_activity": monthly_list,
        "recent_outfits": [
            {
                "id": str(o["_id"]),
                "occasion": o.get("occasion"),
                "style_score": o.get("style_score", 0),
                "created_at": o.get("created_at"),
            }
            for o in recent_outfits
        ],
    }


@router.get("/classification")
async def get_classification_analytics(current_user=Depends(get_current_user)):
    """
    Get AI classification performance analytics for the user's wardrobe.

    Returns:
      - avg_confidence: average AI confidence across all items
      - correction_rate: percentage of items the user corrected
      - total_corrections: number of corrections made
      - confidence_distribution: breakdown of accepted / needs_review / manual_required
      - most_uploaded_category: category with most items
      - most_common_color: dominant color across wardrobe
      - correction_breakdown: which categories were corrected most
    """
    db = get_database()
    user_id = str(current_user["_id"])

    # All clothing items
    items_cursor = db.clothing_items.find({"user_id": user_id})
    items = await items_cursor.to_list(1000)

    total = len(items)
    if total == 0:
        return {
            "avg_confidence": 0.0,
            "correction_rate": 0.0,
            "total_corrections": 0,
            "confidence_distribution": {"accepted": 0, "needs_review": 0, "manual_required": 0},
            "most_uploaded_category": None,
            "most_common_color": None,
            "correction_breakdown": [],
            "total_items": 0,
        }

    # Average confidence
    confidences = [i.get("confidence_score", 0.0) for i in items]
    avg_confidence = round(sum(confidences) / len(confidences), 4)

    # Confidence distribution
    conf_dist = {"accepted": 0, "needs_review": 0, "manual_required": 0}
    for item in items:
        status = item.get("confidence_status", "manual_required")
        if status in conf_dist:
            conf_dist[status] += 1
        else:
            # Infer from score for old records without status field
            score = item.get("confidence_score", 0.0)
            if score >= 0.90:
                conf_dist["accepted"] += 1
            elif score >= 0.80:
                conf_dist["needs_review"] += 1
            else:
                conf_dist["manual_required"] += 1

    # Corrections from classification_corrections collection
    corrections_cursor = db.classification_corrections.find({"user_id": user_id})
    corrections = await corrections_cursor.to_list(1000)
    total_corrections = len(corrections)

    corrected_items = sum(1 for i in items if i.get("was_corrected", False))
    correction_rate = round(corrected_items / total * 100, 1) if total > 0 else 0.0

    # Most corrected categories
    correction_cats = Counter(c.get("predicted_category", "Other") for c in corrections)
    correction_breakdown = [
        {"category": cat, "corrections": count}
        for cat, count in correction_cats.most_common(5)
    ]

    # Most uploaded category
    categories = Counter(i.get("category", "Other") for i in items)
    most_uploaded_category = categories.most_common(1)[0][0] if categories else None

    # Most common color
    colors = Counter()
    for item in items:
        dom = item.get("dominant_colors", [])
        if dom:
            colors[dom[0].get("name", "Unknown")] += 1
    most_common_color = colors.most_common(1)[0][0] if colors else None

    # Confidence trend over time (last 10 items)
    recent_items = sorted(items, key=lambda x: x.get("created_at", datetime.min), reverse=True)[:20]
    confidence_trend = [
        {
            "name": i.get("name", i.get("category", "?")),
            "confidence": round(i.get("confidence_score", 0.0) * 100, 1),
            "category": i.get("category", "?"),
        }
        for i in reversed(recent_items)
    ]

    return {
        "avg_confidence": avg_confidence,
        "avg_confidence_pct": round(avg_confidence * 100, 1),
        "correction_rate": correction_rate,
        "total_corrections": total_corrections,
        "total_corrected_items": corrected_items,
        "confidence_distribution": conf_dist,
        "most_uploaded_category": most_uploaded_category,
        "most_common_color": most_common_color,
        "correction_breakdown": correction_breakdown,
        "confidence_trend": confidence_trend,
        "total_items": total,
    }


@router.get("/insights")
async def get_style_insights(current_user=Depends(get_current_user)):
    """Get AI-generated style insights for the user."""
    db = get_database()
    user_id = str(current_user["_id"])

    cursor = db.clothing_items.find({"user_id": user_id})
    items = await cursor.to_list(500)

    if not items:
        return {"insights": [], "message": "Upload clothes to get personalized insights!"}

    total = len(items)
    categories = Counter(i.get("category", "Other") for i in items)
    styles = Counter(i.get("style", "casual") for i in items)
    colors = Counter()
    for item in items:
        dom = item.get("dominant_colors", [])
        if dom:
            colors[dom[0].get("name", "Unknown")] += 1

    dominant_style = styles.most_common(1)[0][0] if styles else "casual"
    top_colors = [c for c, _ in colors.most_common(3)]
    top_category = categories.most_common(1)[0][0] if categories else "Shirt"

    # Correction rate insight
    corrected_count = sum(1 for i in items if i.get("was_corrected", False))
    correction_pct = round(corrected_count / total * 100, 0) if total > 0 else 0

    # Average confidence insight
    avg_conf = sum(i.get("confidence_score", 0.5) for i in items) / total
    conf_label = f"{round(avg_conf * 100, 0):.0f}%"

    insights = [
        {
            "icon": "👗",
            "title": "Dominant Style",
            "value": dominant_style.capitalize(),
            "description": f"Your wardrobe skews {dominant_style}. Consider adding more variety!",
        },
        {
            "icon": "🎨",
            "title": "Favourite Colors",
            "value": ", ".join(top_colors[:3]) if top_colors else "Mixed",
            "description": "These are your go-to colors. They reflect your personal palette.",
        },
        {
            "icon": "👕",
            "title": "Most Owned Category",
            "value": top_category,
            "description": f"You have the most {top_category}s. Make sure you have matching items!",
        },
        {
            "icon": "🤖",
            "title": "AI Confidence",
            "value": conf_label,
            "description": "Average AI confidence across your wardrobe. Higher = better classification.",
        },
        {
            "icon": "✏️",
            "title": "Correction Rate",
            "value": f"{correction_pct:.0f}%",
            "description": "How often you corrected the AI. Your feedback helps improve predictions!",
        },
        {
            "icon": "💡",
            "title": "Wardrobe Score",
            "value": f"{min(10, round(total / 5, 1))}/10",
            "description": "A diverse wardrobe of 50+ items gives you maximum outfit combinations.",
        },
    ]

    return {"insights": insights, "total_analyzed": total}
