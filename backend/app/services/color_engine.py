"""
Smart AI Wardrobe Assistant - Color Matching Engine
HSL-based compatibility scoring for outfit color combinations
"""
import colorsys
from typing import List, Dict, Tuple, Any
import logging

logger = logging.getLogger(__name__)

# ─── Known Good & Bad Combinations ───────────────────────────────────────────
GOOD_COMBOS = [
    {"Black", "White"}, {"Black", "Grey"}, {"Black", "Red"},
    {"Black", "Navy Blue"}, {"Black", "Beige"}, {"Black", "Pink"},
    {"Navy Blue", "White"}, {"Navy Blue", "Light Grey"}, {"Navy Blue", "Beige"},
    {"Blue", "White"}, {"Blue", "Grey"}, {"Blue", "Khaki"},
    {"Grey", "White"}, {"Grey", "Blue"}, {"Grey", "Pink"},
    {"White", "Beige"}, {"White", "Brown"}, {"White", "Olive"},
    {"Brown", "Beige"}, {"Brown", "Cream"}, {"Brown", "White"},
    {"Olive", "Beige"}, {"Olive", "Brown"}, {"Olive", "White"},
    {"Maroon", "White"}, {"Maroon", "Beige"}, {"Maroon", "Grey"},
    {"Teal", "White"}, {"Teal", "Beige"}, {"Teal", "Grey"},
]

BAD_COMBOS = [
    {"Red", "Orange"}, {"Red", "Pink"}, {"Red", "Purple"},
    {"Orange", "Purple"}, {"Orange", "Pink"}, {"Green", "Red"},
    {"Yellow", "Green"}, {"Yellow", "Orange"}, {"Purple", "Green"},
]


def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def rgb_to_hsl(r: int, g: int, b: int) -> Tuple[float, float, float]:
    """Convert RGB to HSL."""
    h, l, s = colorsys.rgb_to_hls(r/255, g/255, b/255)
    return h * 360, s * 100, l * 100


def color_harmony_score(color1_name: str, color2_name: str) -> float:
    """
    Compute compatibility score (0-10) between two colors.
    Uses known good/bad combos + HSL distance heuristics.
    """
    pair = {color1_name, color2_name}

    # Check known good combos
    for combo in GOOD_COMBOS:
        if pair == combo or pair.issubset(combo):
            return 9.0

    # Check known bad combos
    for combo in BAD_COMBOS:
        if pair == combo or pair.issubset(combo):
            return 2.5

    # If either is Black or White, generally good
    if "Black" in pair or "White" in pair:
        return 8.0

    # Neutral-neutral: always ok
    neutrals = {"Grey", "Light Grey", "Dark Grey", "Beige", "Cream"}
    if color1_name in neutrals or color2_name in neutrals:
        return 7.5

    # Default medium score
    return 6.0


def compute_outfit_compatibility(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compute color compatibility for a set of outfit items.
    Items should each have 'dominant_colors' list.
    """
    if not items:
        return {"score": 0.0, "breakdown": [], "summary": "No items"}

    # Collect dominant color from each item
    colors = []
    for item in items:
        dom = item.get("dominant_colors", [])
        if dom:
            colors.append(dom[0].get("name", "Unknown"))
        else:
            colors.append("Unknown")

    # Pairwise scoring
    pairs = []
    total_score = 0.0
    count = 0
    for i in range(len(colors)):
        for j in range(i + 1, len(colors)):
            score = color_harmony_score(colors[i], colors[j])
            pairs.append({
                "color1": colors[i],
                "color2": colors[j],
                "score": score,
            })
            total_score += score
            count += 1

    avg = round(total_score / count, 1) if count else 5.0

    if avg >= 8.5:
        summary = "Excellent color combination! These colors complement each other beautifully."
    elif avg >= 7.0:
        summary = "Good color match. This outfit works well together."
    elif avg >= 5.5:
        summary = "Decent combination. Some colors could work better together."
    else:
        summary = "Color clash detected. Consider swapping some items for a better match."

    return {
        "score": avg,
        "color_pairs": pairs,
        "summary": summary,
        "individual_colors": colors,
    }


def suggest_complementary_colors(color_name: str) -> List[str]:
    """Suggest colors that pair well with the given color."""
    suggestions = []
    for combo in GOOD_COMBOS:
        if color_name in combo:
            suggestions.extend(combo - {color_name})
    if not suggestions:
        suggestions = ["White", "Black", "Grey"]
    return list(set(suggestions))[:5]


OCCASION_COLOR_RULES = {
    "interview": {
        "preferred": ["Navy Blue", "Black", "Dark Grey", "White", "Maroon"],
        "avoid": ["Yellow", "Orange", "Cyan", "Light Pink"],
        "tip": "Stick to professional, muted tones for interviews.",
    },
    "party": {
        "preferred": ["Red", "Black", "Purple", "Royal Blue", "Pink"],
        "avoid": ["Beige", "Light Grey"],
        "tip": "Bold, vibrant colors work great for parties.",
    },
    "casual": {
        "preferred": ["Blue", "White", "Grey", "Olive", "Teal"],
        "avoid": [],
        "tip": "Almost any combination works for casual — express yourself!",
    },
    "wedding": {
        "preferred": ["Cream", "Beige", "Navy Blue", "Royal Blue", "Maroon"],
        "avoid": ["Black", "White"],
        "tip": "Elegant pastels and jewel tones are ideal for weddings.",
    },
    "office": {
        "preferred": ["Navy Blue", "Grey", "Black", "White", "Brown"],
        "avoid": ["Orange", "Cyan", "Yellow"],
        "tip": "Professional neutrals project confidence in office settings.",
    },
    "college": {
        "preferred": ["Blue", "Grey", "White", "Olive", "Green"],
        "avoid": [],
        "tip": "Comfortable, smart-casual looks work best for college.",
    },
}
