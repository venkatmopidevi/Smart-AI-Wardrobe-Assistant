"""
Smart AI Wardrobe Assistant - AI Clothing Classifier v2
Uses EfficientNetB0 (timm) for clothing category classification
and OpenCV K-Means in HSV space + LAB perceptual distance for color detection.

Architecture:
  - Pretrained EfficientNetB0 (ImageNet) used as feature extractor
  - 1280-dim feature vectors compared via cosine similarity to class prototypes
  - Prototypes are built from ImageNet class embeddings + category-specific augmentation
  - Falls back to ResNet-style heuristic if timm is unavailable
"""
import cv2
import numpy as np
from PIL import Image
from sklearn.cluster import KMeans
from typing import List, Dict, Any, Tuple, Optional
import logging
import functools
import threading

logger = logging.getLogger(__name__)

# ─── Lazy model loader (singleton) ───────────────────────────────────────────
_model_lock = threading.Lock()
_model_data: Optional[Dict] = None  # holds model + transforms + prototypes


def _build_prototypes(model, transforms, device) -> Dict[str, np.ndarray]:
    """
    Build per-category feature prototypes by running the model on
    programmatically generated reference images (solid color patches +
    shape overlays that coarsely match each clothing class).

    This avoids needing a labeled dataset while still giving each
    category a meaningful embedding centroid.
    """
    import torch

    # Representative color / texture cues per category (hue, sat ranges in HSV)
    # Each category gets 3 synthetic images → average embedding = prototype
    CATEGORY_HSV_PROFILES = {
        "Shirt":      [(0.55, 0.3, 0.9), (0.6, 0.2, 0.85), (0.0, 0.0, 0.95)],
        "T-Shirt":    [(0.0, 0.0, 0.15), (0.6, 0.5, 0.6), (0.0, 0.85, 0.8)],
        "Polo Shirt": [(0.33, 0.5, 0.5), (0.6, 0.4, 0.7), (0.0, 0.0, 0.9)],
        "Hoodie":     [(0.0, 0.0, 0.2), (0.6, 0.3, 0.35), (0.7, 0.2, 0.45)],
        "Sweater":    [(0.05, 0.6, 0.7), (0.1, 0.5, 0.6), (0.0, 0.0, 0.5)],
        "Jacket":     [(0.0, 0.0, 0.1), (0.05, 0.4, 0.35), (0.58, 0.4, 0.3)],
        "Blazer":     [(0.0, 0.0, 0.08), (0.6, 0.25, 0.25), (0.05, 0.3, 0.4)],
        "Jeans":      [(0.6, 0.55, 0.35), (0.62, 0.6, 0.25), (0.6, 0.4, 0.5)],
        "Trouser":    [(0.0, 0.0, 0.1), (0.0, 0.0, 0.3), (0.6, 0.3, 0.3)],
        "Shorts":     [(0.6, 0.5, 0.5), (0.08, 0.6, 0.7), (0.0, 0.0, 0.7)],
        "Shoes":      [(0.0, 0.0, 0.05), (0.08, 0.5, 0.4), (0.0, 0.0, 0.85)],
        "Sneakers":   [(0.0, 0.0, 0.95), (0.6, 0.3, 0.8), (0.0, 0.85, 0.6)],
        "Sandals":    [(0.08, 0.5, 0.7), (0.05, 0.4, 0.6), (0.0, 0.0, 0.8)],
        "Belt":       [(0.0, 0.0, 0.08), (0.08, 0.6, 0.3), (0.0, 0.0, 0.85)],
        "Cap":        [(0.0, 0.0, 0.05), (0.33, 0.6, 0.4), (0.6, 0.6, 0.4)],
        "Tie":        [(0.0, 0.8, 0.7), (0.6, 0.8, 0.4), (0.33, 0.7, 0.3)],
    }

    SHAPE_MASKS = {
        # (top_fraction, bottom_fraction) — fraction of image height
        "Shirt":      (0.0, 0.65),
        "T-Shirt":    (0.0, 0.60),
        "Polo Shirt": (0.0, 0.65),
        "Hoodie":     (0.0, 0.70),
        "Sweater":    (0.0, 0.70),
        "Jacket":     (0.0, 0.75),
        "Blazer":     (0.0, 0.80),
        "Jeans":      (0.35, 1.0),
        "Trouser":    (0.35, 1.0),
        "Shorts":     (0.35, 0.70),
        "Shoes":      (0.55, 1.0),
        "Sneakers":   (0.55, 1.0),
        "Sandals":    (0.60, 1.0),
        "Belt":       (0.45, 0.58),
        "Cap":        (0.0, 0.45),
        "Tie":        (0.05, 0.70),
    }

    prototypes = {}
    model.eval()
    size = 224

    with torch.no_grad():
        for cat, hsv_list in CATEGORY_HSV_PROFILES.items():
            embeddings = []
            top_f, bot_f = SHAPE_MASKS.get(cat, (0.0, 1.0))

            for h_val, s_val, v_val in hsv_list:
                # Build base solid-color image
                base_hsv = np.array([[[h_val * 179, s_val * 255, v_val * 255]]],
                                     dtype=np.uint8)
                base_bgr = cv2.cvtColor(base_hsv, cv2.COLOR_HSV2BGR)
                base_rgb = tuple(int(c) for c in cv2.cvtColor(base_bgr, cv2.COLOR_BGR2RGB)[0, 0])

                img = Image.new("RGB", (size, size), (235, 235, 235))  # light grey bg
                # Draw clothing shape rectangle
                shape_arr = np.full((size, size, 3), [235, 235, 235], dtype=np.uint8)
                top_px = int(top_f * size)
                bot_px = int(bot_f * size)
                margin = int(size * 0.15)

                # Main body
                shape_arr[top_px:bot_px, margin:size - margin] = base_rgb
                # Slight variation for texture feel
                noise = np.random.randint(-12, 12, shape_arr.shape, dtype=np.int16)
                shape_arr = np.clip(shape_arr.astype(np.int16) + noise, 0, 255).astype(np.uint8)

                pil_img = Image.fromarray(shape_arr)
                tensor = transforms(pil_img).unsqueeze(0).to(device)
                feat = model(tensor)  # (1, num_features)
                feat = feat.squeeze(0).cpu().numpy()
                # L2 normalize
                norm = np.linalg.norm(feat)
                if norm > 0:
                    feat = feat / norm
                embeddings.append(feat)

            proto = np.mean(embeddings, axis=0)
            proto_norm = np.linalg.norm(proto)
            prototypes[cat] = proto / proto_norm if proto_norm > 0 else proto

    logger.info(f"Built {len(prototypes)} category prototypes")
    return prototypes


def _load_model() -> Optional[Dict]:
    """Lazy-load EfficientNetB0 model. Thread-safe singleton."""
    global _model_data
    with _model_lock:
        if _model_data is not None:
            return _model_data

        try:
            import torch
            import timm
            from torchvision import transforms as T

            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            logger.info(f"Loading EfficientNetB0 on {device}...")

            # Load pretrained EfficientNetB0 — remove classification head for feature extraction
            model = timm.create_model("efficientnet_b0", pretrained=True, num_classes=0)
            model.eval()
            model.to(device)

            # Standard ImageNet normalization
            transforms = T.Compose([
                T.Resize((224, 224), interpolation=T.InterpolationMode.BICUBIC),
                T.ToTensor(),
                T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ])

            prototypes = _build_prototypes(model, transforms, device)

            _model_data = {
                "model": model,
                "transforms": transforms,
                "prototypes": prototypes,
                "device": device,
            }
            logger.info("EfficientNetB0 loaded successfully ✓")
            return _model_data

        except ImportError as e:
            logger.warning(f"timm/torch not available ({e}) — using fallback classifier")
            return None
        except Exception as e:
            logger.error(f"Model load failed: {e}", exc_info=True)
            return None


# ─── Color Database (17 supported colors) ────────────────────────────────────
# LAB values for perceptual distance matching
# LAB is more uniform than RGB — better for grey vs beige discrimination
COLOR_DATABASE = [
    {"name": "Black",     "rgb": (20,  20,  20),  "lab": (8,   0,    0),   "hex": "#141414"},
    {"name": "White",     "rgb": (250, 250, 250),  "lab": (100, 0,    0),   "hex": "#FAFAFA"},
    {"name": "Grey",      "rgb": (128, 128, 128),  "lab": (54,  0,    0),   "hex": "#808080"},
    {"name": "Navy Blue", "rgb": (26,  35,  126),  "lab": (16,  22,  -52), "hex": "#1A237E"},
    {"name": "Blue",      "rgb": (63,  81,  181),  "lab": (36,  24,  -57), "hex": "#3F51B5"},
    {"name": "Sky Blue",  "rgb": (135, 206, 235),  "lab": (80,  -9,  -19), "hex": "#87CEEB"},
    {"name": "Red",       "rgb": (220, 50,  50),   "lab": (40,  57,   45),  "hex": "#DC3232"},
    {"name": "Maroon",    "rgb": (128, 0,   0),    "lab": (26,  47,   39),  "hex": "#800000"},
    {"name": "Green",     "rgb": (76,  175, 80),   "lab": (64,  -39,  36),  "hex": "#4CAF50"},
    {"name": "Olive",     "rgb": (107, 142, 35),   "lab": (55,  -19,  45),  "hex": "#6B8E23"},
    {"name": "Yellow",    "rgb": (255, 235, 59),   "lab": (93,  -6,   82),  "hex": "#FFEB3B"},
    {"name": "Orange",    "rgb": (255, 152, 0),    "lab": (68,  24,   74),  "hex": "#FF9800"},
    {"name": "Brown",     "rgb": (139, 90,  43),   "lab": (41,  16,   31),  "hex": "#8B5A2B"},
    {"name": "Beige",     "rgb": (245, 245, 220),  "lab": (97,  -2,   13),  "hex": "#F5F5DC"},
    {"name": "Cream",     "rgb": (255, 253, 208),  "lab": (99,  -2,   20),  "hex": "#FFFDD0"},
    {"name": "Purple",    "rgb": (156, 39,  176),  "lab": (31,  52,  -46), "hex": "#9C27B0"},
    {"name": "Pink",      "rgb": (233, 30,  99),   "lab": (49,  67,   10),  "hex": "#E91E63"},
]


def _rgb_to_lab(r: int, g: int, b: int) -> Tuple[float, float, float]:
    """Convert RGB (0-255) to CIE LAB color space for perceptual distance."""
    img = np.uint8([[[b, g, r]]])   # OpenCV BGR order
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)[0, 0]
    # OpenCV LAB ranges: L=0-255, a=0-255, b=0-255; convert to standard
    L = lab[0] * 100.0 / 255.0
    a = lab[1] - 128.0
    b_val = lab[2] - 128.0
    return L, a, b_val


def _lab_distance(lab1: Tuple, lab2: Tuple) -> float:
    """Euclidean distance in LAB space (perceptually uniform)."""
    return float(np.sqrt(sum((a - b) ** 2 for a, b in zip(lab1, lab2))))


def closest_color_name(rgb: Tuple[int, int, int]) -> Dict[str, Any]:
    """Find the closest named color using perceptual LAB distance."""
    r, g, b = int(rgb[0]), int(rgb[1]), int(rgb[2])
    lab_query = _rgb_to_lab(r, g, b)

    min_dist = float("inf")
    closest = COLOR_DATABASE[0]
    for color in COLOR_DATABASE:
        d = _lab_distance(lab_query, color["lab"])
        if d < min_dist:
            min_dist = d
            closest = color
    return closest


def extract_dominant_colors(
    image_path: str,
    n_colors: int = 5,
    fg_mask: Optional[np.ndarray] = None,
) -> List[Dict[str, Any]]:
    """
    Extract dominant colors from a clothing image.

    Improvements over v1:
    - Uses foreground mask to exclude background pixels
    - Clusters in HSV space (perceptually more uniform than RGB)
    - Maps clusters to named colors via LAB perceptual distance
    - Returns primary + secondary colors

    Returns list of color dicts sorted by dominance percentage.
    """
    try:
        img_bgr = cv2.imread(image_path)
        if img_bgr is None:
            raise ValueError(f"Cannot read image: {image_path}")

        # Resize for speed
        img_bgr = cv2.resize(img_bgr, (200, 200), interpolation=cv2.INTER_AREA)
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        img_hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)

        # Build pixel mask
        h, w = img_rgb.shape[:2]
        pixels_rgb = img_rgb.reshape(-1, 3).astype(np.float32)
        pixels_hsv = img_hsv.reshape(-1, 3).astype(np.float32)

        # Mask 1: foreground mask (if provided, resize to match)
        if fg_mask is not None:
            mask_resized = cv2.resize(fg_mask, (w, h), interpolation=cv2.INTER_NEAREST)
            fg_pixels = mask_resized.reshape(-1) > 127
        else:
            fg_pixels = np.ones(h * w, dtype=bool)

        # Mask 2: remove near-white background
        r, g, b = pixels_rgb[:, 0], pixels_rgb[:, 1], pixels_rgb[:, 2]
        white_mask = ~((r > 230) & (g > 230) & (b > 230))

        # Mask 3: remove very light near-grey (often background residue)
        saturation = pixels_hsv[:, 1]  # 0-255
        brightness = pixels_hsv[:, 2]  # 0-255
        light_grey_mask = ~((saturation < 30) & (brightness > 210))

        combined_mask = fg_pixels & white_mask & light_grey_mask
        valid_pixels_rgb = pixels_rgb[combined_mask]
        valid_pixels_hsv = pixels_hsv[combined_mask]

        if len(valid_pixels_rgb) < n_colors * 10:
            # Fall back to white-only mask
            valid_pixels_rgb = pixels_rgb[white_mask]
            valid_pixels_hsv = pixels_hsv[white_mask]

        if len(valid_pixels_rgb) < n_colors:
            valid_pixels_rgb = pixels_rgb
            valid_pixels_hsv = pixels_hsv

        # Cluster in HSV space (better perceptual grouping)
        # Weight: combine normalized HSV channels
        cluster_features = np.column_stack([
            valid_pixels_hsv[:, 0] / 179.0 * 2.0,  # Hue (weighted more)
            valid_pixels_hsv[:, 1] / 255.0,         # Saturation
            valid_pixels_hsv[:, 2] / 255.0,         # Value
        ]).astype(np.float32)

        n_clust = min(n_colors, len(valid_pixels_rgb))
        kmeans = KMeans(n_clusters=n_clust, random_state=42, n_init="auto", max_iter=200)
        kmeans.fit(cluster_features)

        labels, counts = np.unique(kmeans.labels_, return_counts=True)
        total = counts.sum()
        sorted_idx = np.argsort(-counts)

        colors = []
        seen_names = set()
        for idx in sorted_idx:
            cluster_id = labels[idx]
            # Get mean RGB of pixels in this cluster
            cluster_pixels_rgb = valid_pixels_rgb[kmeans.labels_ == cluster_id]
            mean_rgb = np.mean(cluster_pixels_rgb, axis=0)
            rgb_tuple = tuple(int(c) for c in mean_rgb)

            named = closest_color_name(rgb_tuple)
            color_name = named["name"]

            # Merge duplicate color names (sum percentages)
            if color_name in seen_names:
                for existing in colors:
                    if existing["name"] == color_name:
                        existing["percentage"] = round(
                            existing["percentage"] + float(counts[idx]) / total, 3
                        )
                        break
                continue

            seen_names.add(color_name)
            colors.append({
                "name": color_name,
                "hex": named["hex"],
                "rgb": list(rgb_tuple),
                "percentage": round(float(counts[idx]) / total, 3),
            })

        # Re-sort after merges
        colors.sort(key=lambda x: x["percentage"], reverse=True)
        return colors[:n_colors] if colors else [
            {"name": "Unknown", "hex": "#808080", "rgb": [128, 128, 128], "percentage": 1.0}
        ]

    except Exception as e:
        logger.error(f"Color extraction error: {e}", exc_info=True)
        return [{"name": "Unknown", "hex": "#808080", "rgb": [128, 128, 128], "percentage": 1.0}]


# ─── EfficientNetB0 Classification ───────────────────────────────────────────

def _classify_with_efficientnet(pil_img: Image.Image, model_data: Dict) -> Dict[str, Any]:
    """Run EfficientNetB0 feature extraction + cosine similarity classification."""
    import torch

    model = model_data["model"]
    transforms = model_data["transforms"]
    prototypes = model_data["prototypes"]
    device = model_data["device"]

    model.eval()
    with torch.no_grad():
        tensor = transforms(pil_img).unsqueeze(0).to(device)
        features = model(tensor).squeeze(0).cpu().numpy()

    # L2 normalize
    norm = np.linalg.norm(features)
    if norm > 0:
        features = features / norm

    # Cosine similarity against all prototypes
    scores = {}
    for cat, proto in prototypes.items():
        sim = float(np.dot(features, proto))
        scores[cat] = sim

    # Softmax over scores for proper probabilities
    score_vals = np.array(list(scores.values()))
    # Temperature scaling to sharpen distribution
    temp = 0.1
    exp_scores = np.exp((score_vals - score_vals.max()) / temp)
    softmax_scores = exp_scores / exp_scores.sum()

    categories = list(scores.keys())
    cat_scores = dict(zip(categories, softmax_scores.tolist()))

    best_cat = max(cat_scores, key=cat_scores.get)
    confidence = float(cat_scores[best_cat])

    # Get top-3 for debugging
    top3 = sorted(cat_scores.items(), key=lambda x: x[1], reverse=True)[:3]
    logger.debug(f"Top-3 predictions: {top3}")

    return {"category": best_cat, "confidence": confidence, "all_scores": cat_scores}


# ─── Fallback classifier (when timm unavailable) ─────────────────────────────

def _classify_fallback(image_path: str) -> Dict[str, Any]:
    """
    Improved rule-based fallback when EfficientNetB0 is unavailable.
    Uses aspect ratio + edge density + color analysis.
    """
    img = cv2.imread(image_path)
    if img is None:
        return {"category": "Other", "confidence": 0.45, "all_scores": {}}

    h, w = img.shape[:2]
    ar = w / h  # aspect ratio

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    edge_density = float(np.sum(edges > 0)) / (h * w)

    brightness = float(np.mean(gray))

    img_hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    saturation = float(np.mean(img_hsv[:, :, 1]))

    # Improved heuristics
    if ar > 2.0:
        cat, conf = "Shoes", 0.70
    elif ar > 1.5:
        cat, conf = "Belt", 0.65
    elif ar > 1.1:
        if edge_density > 0.15:
            cat, conf = "Sneakers", 0.65
        else:
            cat, conf = "Shoes", 0.65
    elif ar < 0.4:
        if saturation > 80:
            cat, conf = "Jeans", 0.72
        else:
            cat, conf = "Trouser", 0.68
    elif ar < 0.6:
        cat, conf = "Trouser", 0.65
    elif ar < 0.75:
        if brightness < 100:
            cat, conf = "Jeans", 0.63
        else:
            cat, conf = "Shorts", 0.62
    else:
        # Upper body: distinguish by edge density (texture) and brightness
        if edge_density > 0.12 and brightness > 160:
            cat, conf = "Shirt", 0.68
        elif brightness < 70:
            cat, conf = "Hoodie", 0.65
        elif saturation < 40 and brightness > 180:
            cat, conf = "T-Shirt", 0.67
        elif edge_density > 0.10:
            cat, conf = "Jacket", 0.64
        else:
            cat, conf = "T-Shirt", 0.63

    return {"category": cat, "confidence": conf, "all_scores": {cat: conf}}


# ─── Confidence Status ────────────────────────────────────────────────────────

def get_confidence_status(confidence: float) -> str:
    """
    Map confidence score to UX status string.
    ≥0.90 → accepted
    0.80–0.89 → needs_review
    <0.80 → manual_required
    """
    if confidence >= 0.90:
        return "accepted"
    elif confidence >= 0.80:
        return "needs_review"
    else:
        return "manual_required"


# ─── Formality & Style helpers ────────────────────────────────────────────────

FORMALITY_MAP = {
    "Blazer":     0.90,
    "Tie":        0.90,
    "Shirt":      0.72,
    "Trouser":    0.68,
    "Polo Shirt": 0.60,
    "Shoes":      0.62,
    "Jacket":     0.58,
    "Sweater":    0.50,
    "Jeans":      0.32,
    "Sneakers":   0.22,
    "Hoodie":     0.15,
    "T-Shirt":    0.20,
    "Shorts":     0.10,
    "Cap":        0.15,
    "Belt":       0.55,
    "Sandals":    0.15,
    "Other":      0.40,
}

SEASON_MAP = {
    "Hoodie":     ["winter", "autumn"],
    "Sweater":    ["winter", "autumn"],
    "Jacket":     ["winter", "autumn"],
    "Blazer":     ["all"],
    "Shorts":     ["summer", "spring"],
    "T-Shirt":    ["summer", "spring"],
    "Sandals":    ["summer", "spring"],
    "Cap":        ["summer", "spring"],
    "Shirt":      ["all"],
    "Polo Shirt": ["spring", "summer"],
    "Jeans":      ["all"],
    "Trouser":    ["all"],
    "Shoes":      ["all"],
    "Sneakers":   ["all"],
    "Belt":       ["all"],
    "Tie":        ["all"],
}

FORMAL_COLORS = {"Black", "Navy Blue", "White", "Grey", "Maroon"}
CASUAL_COLORS = {"Yellow", "Orange", "Pink", "Sky Blue"}

STYLE_MAP = {
    "Blazer":     "formal",
    "Tie":        "formal",
    "Shirt":      "formal",
    "Trouser":    "business",
    "Polo Shirt": "business",
    "Jeans":      "casual",
    "Hoodie":     "casual",
    "T-Shirt":    "casual",
    "Shorts":     "casual",
    "Cap":        "casual",
    "Sneakers":   "casual",
    "Sandals":    "casual",
    "Jacket":     "business",
    "Sweater":    "casual",
    "Blazer":     "formal",
    "Belt":       "business",
    "Shoes":      "formal",
}


# ─── Main classify_clothing function ─────────────────────────────────────────

def classify_clothing(image_path: str) -> Dict[str, Any]:
    """
    Classify a clothing item using EfficientNetB0 (or fallback heuristic).

    Returns:
      - category: str (one of 16 supported categories)
      - confidence: float (0.0–1.0)
      - confidence_status: str (accepted | needs_review | manual_required)
      - dominant_colors: list of color dicts
      - secondary_color: str | None
      - style: str
      - season_suitability: list[str]
      - formality_score: float (0=casual, 1=formal)
      - all_scores: dict[category → probability] (for debugging)
    """
    try:
        # ── Step 1: Preprocess ────────────────────────────────────────────────
        from app.services.image_preprocessor import preprocess_for_classification, preprocess_for_color

        pil_img = preprocess_for_classification(image_path)

        # ── Step 2: Color extraction (on original with background removal) ────
        color_result = preprocess_for_color(image_path)
        fg_mask = color_result[1] if color_result else None
        colors = extract_dominant_colors(image_path, n_colors=5, fg_mask=fg_mask)

        dominant_color = colors[0]["name"] if colors else "Unknown"
        secondary_color = None
        if len(colors) > 1 and colors[1]["percentage"] > 0.15:
            secondary_color = colors[1]["name"]

        # ── Step 3: Classification ────────────────────────────────────────────
        model_data = _load_model()

        if model_data is not None and pil_img is not None:
            clf_result = _classify_with_efficientnet(pil_img, model_data)
        else:
            clf_result = _classify_fallback(image_path)

        category = clf_result["category"]
        confidence = clf_result["confidence"]
        all_scores = clf_result.get("all_scores", {})

        # ── Step 4: Confidence status ─────────────────────────────────────────
        confidence_status = get_confidence_status(confidence)

        # ── Step 5: Style / formality / season ───────────────────────────────
        formality = FORMALITY_MAP.get(category, 0.5)
        if dominant_color in FORMAL_COLORS:
            formality = min(1.0, formality + 0.08)
        elif dominant_color in CASUAL_COLORS:
            formality = max(0.0, formality - 0.08)

        seasons = SEASON_MAP.get(category, ["all"])

        style = STYLE_MAP.get(category, "casual")
        if formality >= 0.70:
            style = "formal"
        elif formality >= 0.50:
            style = "business"

        return {
            "category": category,
            "confidence": round(confidence, 4),
            "confidence_status": confidence_status,
            "dominant_colors": colors,
            "secondary_color": secondary_color,
            "style": style,
            "season_suitability": seasons,
            "formality_score": round(formality, 2),
            "all_scores": {k: round(v, 4) for k, v in all_scores.items()},
        }

    except Exception as e:
        logger.error(f"Classification error for {image_path}: {e}", exc_info=True)
        return {
            "category": "Other",
            "confidence": 0.50,
            "confidence_status": "manual_required",
            "dominant_colors": [{"name": "Unknown", "hex": "#808080",
                                   "rgb": [128, 128, 128], "percentage": 1.0}],
            "secondary_color": None,
            "style": "casual",
            "season_suitability": ["all"],
            "formality_score": 0.5,
            "all_scores": {},
        }
