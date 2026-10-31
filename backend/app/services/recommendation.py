"""
Smart AI Wardrobe Assistant - Recommendation Engine
Content-based filtering using cosine similarity on clothing features
"""
import numpy as np
from typing import List, Dict, Any, Optional
from app.services.color_engine import (
    compute_outfit_compatibility,
    OCCASION_COLOR_RULES,
    suggest_complementary_colors,
)
from app.services.weather_service import get_clothing_advice
import logging

logger = logging.getLogger(__name__)

# ─── Occasion Category Rules (v2 — includes all 16 categories) ───────────────
OCCASION_OUTFIT_RULES = {
    "interview": {
        "top":          ["Shirt", "Blazer", "Polo Shirt"],
        "bottom":       ["Trouser", "Jeans"],
        "footwear":     ["Shoes"],
        "optional":     ["Jacket", "Tie", "Belt"],
        "formality_min": 0.55,
        "description":  "Smart, professional look for interview success.",
    },
    "office": {
        "top":          ["Shirt", "Polo Shirt", "Blazer", "T-Shirt"],
        "bottom":       ["Trouser", "Jeans"],
        "footwear":     ["Shoes", "Sneakers"],
        "optional":     ["Jacket", "Belt"],
        "formality_min": 0.45,
        "description":  "Business-casual office look.",
    },
    "college": {
        "top":          ["T-Shirt", "Shirt", "Hoodie", "Polo Shirt"],
        "bottom":       ["Jeans", "Trouser", "Shorts"],
        "footwear":     ["Sneakers", "Shoes"],
        "optional":     ["Cap"],
        "formality_min": 0.0,
        "description":  "Comfortable and stylish for campus life.",
    },
    "casual": {
        "top":          ["T-Shirt", "Shirt", "Hoodie", "Sweater", "Polo Shirt"],
        "bottom":       ["Jeans", "Shorts", "Trouser"],
        "footwear":     ["Sneakers", "Sandals", "Shoes"],
        "optional":     ["Cap", "Belt"],
        "formality_min": 0.0,
        "description":  "Relaxed, everyday casual style.",
    },
    "party": {
        "top":          ["Shirt", "T-Shirt", "Blazer"],
        "bottom":       ["Jeans", "Trouser"],
        "footwear":     ["Shoes", "Sneakers"],
        "optional":     ["Jacket", "Belt"],
        "formality_min": 0.2,
        "description":  "Bold and fun — stand out at the party!",
    },
    "wedding": {
        "top":          ["Shirt", "Blazer"],
        "bottom":       ["Trouser"],
        "footwear":     ["Shoes"],
        "optional":     ["Jacket", "Tie", "Belt"],
        "formality_min": 0.65,
        "description":  "Elegant and celebration-ready.",
    },
    "gym": {
        "top":          ["T-Shirt", "Hoodie"],
        "bottom":       ["Shorts", "Trouser"],
        "footwear":     ["Sneakers", "Shoes"],
        "optional":     ["Cap"],
        "formality_min": 0.0,
        "description":  "Comfortable and functional for your workout.",
    },
    "date": {
        "top":          ["Shirt", "T-Shirt", "Polo Shirt"],
        "bottom":       ["Jeans", "Trouser"],
        "footwear":     ["Shoes", "Sneakers"],
        "optional":     ["Jacket", "Belt"],
        "formality_min": 0.25,
        "description":  "Smart-casual and stylish for a great date look.",
    },
    "beach": {
        "top":          ["T-Shirt"],
        "bottom":       ["Shorts"],
        "footwear":     ["Sandals"],
        "optional":     ["Cap"],
        "formality_min": 0.0,
        "description":  "Breezy and comfortable for a beach day.",
    },
}


def item_to_feature_vector(item: Dict[str, Any]) -> np.ndarray:
    """
    Convert a clothing item to a numerical feature vector for similarity matching.
    Features: category (one-hot across all 16 categories), formality, season (one-hot).
    """
    categories = [
        "Shirt", "T-Shirt", "Polo Shirt", "Hoodie", "Sweater",
        "Jacket", "Blazer", "Jeans", "Trouser", "Shorts",
        "Shoes", "Sneakers", "Sandals", "Belt", "Cap", "Tie",
        "Dress", "Other",
    ]
    seasons = ["summer", "winter", "spring", "autumn", "all"]

    cat_vec  = [1 if item.get("category") == c else 0 for c in categories]
    formality = [float(item.get("formality_score", 0.5))]

    item_seasons = item.get("season_suitability", ["all"])
    if isinstance(item_seasons, str):
        item_seasons = [item_seasons]
    season_vec = [1 if s in item_seasons else 0 for s in seasons]

    return np.array(cat_vec + formality + season_vec, dtype=float)


def cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
    """Compute cosine similarity between two vectors."""
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (norm1 * norm2))


def select_best_item(
    items: List[Dict],
    target_categories: List[str],
    formality_min: float,
    preferred_colors: Optional[List[str]] = None,
    exclude_ids: Optional[List[str]] = None,
) -> Optional[Dict]:
    """Select the best matching item from a list based on category and formality."""
    exclude_ids = exclude_ids or []
    candidates = [
        item for item in items
        if item.get("category") in target_categories
        and float(item.get("formality_score", 0.0)) >= formality_min
        and str(item.get("_id", item.get("id", ""))) not in exclude_ids
    ]

    if not candidates:
        # Relax formality constraint
        candidates = [
            item for item in items
            if item.get("category") in target_categories
            and str(item.get("_id", item.get("id", ""))) not in exclude_ids
        ]

    if not candidates:
        return None

    # Prioritize by wear_count (less worn = suggest more) and preferred colors
    def score_item(item):
        score = 0.0
        # Prefer less-worn items
        wear_count = item.get("wear_count", 0)
        score -= wear_count * 0.1

        # Prefer color-matched items
        if preferred_colors:
            item_colors = [c.get("name", "") for c in item.get("dominant_colors", [])]
            if any(c in preferred_colors for c in item_colors):
                score += 2.0

        # Prefer favorites
        if item.get("is_favorite"):
            score += 1.5

        return score

    candidates.sort(key=score_item, reverse=True)
    return candidates[0]


async def generate_occasion_outfit(
    wardrobe: List[Dict],
    occasion: str,
    weather_advice: Optional[Dict] = None,
) -> Optional[Dict[str, Any]]:
    """Generate a complete outfit for a given occasion from the user's wardrobe."""
    if not wardrobe:
        return None

    rules = OCCASION_OUTFIT_RULES.get(occasion, OCCASION_OUTFIT_RULES["casual"])
    color_rules = OCCASION_COLOR_RULES.get(occasion, {})
    preferred_colors = color_rules.get("preferred", [])

    # Override categories if weather suggests specific items
    top_cats = rules["top"]
    bottom_cats = rules["bottom"]

    if weather_advice:
        weather_cats = weather_advice.get("categories", [])
        if weather_cats:
            # Prefer weather-appropriate top
            weather_tops = [c for c in weather_cats if c in ["T-Shirt", "Shirt", "Hoodie", "Jacket"]]
            if weather_tops:
                top_cats = weather_tops + top_cats

    selected = []
    selected_ids = []

    # Select top
    top = select_best_item(wardrobe, top_cats, rules["formality_min"], preferred_colors)
    if top:
        selected.append(top)
        selected_ids.append(str(top.get("_id", top.get("id", ""))))

    # Select bottom
    bottom = select_best_item(wardrobe, bottom_cats, rules["formality_min"], preferred_colors, selected_ids)
    if bottom:
        selected.append(bottom)
        selected_ids.append(str(bottom.get("_id", bottom.get("id", ""))))

    # Select footwear
    shoes = select_best_item(wardrobe, rules["footwear"], 0.0, preferred_colors, selected_ids)
    if shoes:
        selected.append(shoes)
        selected_ids.append(str(shoes.get("_id", shoes.get("id", ""))))

    if not selected:
        return None

    # Compute color compatibility
    compat = compute_outfit_compatibility(selected)
    style_score = min(10.0, compat["score"] + (rules["formality_min"] * 2))

    tips = [color_rules.get("tip", "Dress for the occasion!")]
    if weather_advice:
        tips.append(weather_advice.get("tip", ""))
    tips = [t for t in tips if t]

    return {
        "items": selected,
        "occasion": occasion,
        "compatibility_score": compat["score"],
        "style_score": round(style_score, 1),
        "description": rules["description"],
        "tips": tips,
        "weather_context": f"{weather_advice.get('tip', '')}" if weather_advice else None,
    }


def get_personalized_recommendations(
    wardrobe: List[Dict],
    wear_history: List[Dict],
    limit: int = 6,
) -> List[Dict]:
    """
    Content-based recommendation: surface under-worn items similar to favorites.
    """
    if not wardrobe:
        return []

    # Find user's most-worn / favorite items as reference
    sorted_items = sorted(wardrobe, key=lambda x: x.get("wear_count", 0), reverse=True)
    reference_items = [i for i in sorted_items if i.get("is_favorite") or i.get("wear_count", 0) > 0]

    if not reference_items:
        reference_items = sorted_items[:3]

    reference_vectors = [item_to_feature_vector(item) for item in reference_items]
    avg_ref_vector = np.mean(reference_vectors, axis=0) if reference_vectors else None

    # Score all items by similarity to reference
    scored = []
    for item in wardrobe:
        item_vec = item_to_feature_vector(item)
        if avg_ref_vector is not None:
            sim = cosine_similarity(item_vec, avg_ref_vector)
        else:
            sim = 0.5
        # Boost low-wear items
        wear_boost = max(0, (5 - item.get("wear_count", 0)) * 0.05)
        scored.append((item, sim + wear_boost))

    scored.sort(key=lambda x: x[1], reverse=True)
    return [item for item, _ in scored[:limit]]
