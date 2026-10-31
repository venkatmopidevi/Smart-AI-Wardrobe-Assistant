"""
Smart AI Wardrobe Assistant - Image Preprocessing Pipeline
Handles background removal, smart crop, contrast/brightness normalization,
and noise reduction before feeding images to the classifier.
"""
import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import logging
from pathlib import Path
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# Target input size for EfficientNetB0
MODEL_INPUT_SIZE = (224, 224)


def _grabcut_background_removal(img_bgr: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Use OpenCV GrabCut to separate clothing from background.
    Returns (masked_bgr, alpha_mask) where alpha_mask is 0=bg, 255=fg.
    """
    h, w = img_bgr.shape[:2]

    # Define a tight foreground rectangle (assumes object is roughly centered)
    margin_x = max(5, int(w * 0.05))
    margin_y = max(5, int(h * 0.05))
    rect = (margin_x, margin_y, w - 2 * margin_x, h - 2 * margin_y)

    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)
    mask = np.zeros((h, w), np.uint8)

    try:
        cv2.grabCut(img_bgr, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
        # Combine definite and probable foreground
        fg_mask = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)

        # Morphological cleanup: close small holes
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_DILATE, kernel)

        # Apply mask
        result = img_bgr.copy()
        result[fg_mask == 0] = [255, 255, 255]  # set background to white
        return result, fg_mask

    except Exception as e:
        logger.warning(f"GrabCut failed: {e} — using original image")
        fg_mask = np.ones((h, w), np.uint8) * 255
        return img_bgr.copy(), fg_mask


def _remove_white_background(img_bgr: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Simple threshold-based white/near-white background removal.
    More reliable for product shots on plain white backgrounds.
    Returns (masked_bgr, alpha_mask).
    """
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    # Create mask where pixels are NOT near-white/near-grey background
    r, g, b = img_rgb[:, :, 0], img_rgb[:, :, 1], img_rgb[:, :, 2]

    # White/near-white background detection
    white_mask = (r > 230) & (g > 230) & (b > 230)

    # Very light grey detection
    light_grey = (
        (np.abs(r.astype(int) - g.astype(int)) < 20) &
        (np.abs(g.astype(int) - b.astype(int)) < 20) &
        (r > 210)
    )

    bg_mask = white_mask | light_grey
    fg_mask = (~bg_mask).astype(np.uint8) * 255

    # Morphological cleanup
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
    fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)

    result = img_bgr.copy()
    result[fg_mask == 0] = [255, 255, 255]
    return result, fg_mask


def _smart_crop(img_bgr: np.ndarray, fg_mask: np.ndarray, padding: float = 0.08) -> np.ndarray:
    """
    Crop tightly around the foreground bounding box with padding.
    Returns cropped BGR image.
    """
    h, w = img_bgr.shape[:2]
    contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return img_bgr  # no foreground found, return original

    # Get bounding box of all contours combined
    all_pts = np.vstack(contours)
    x, y, cw, ch = cv2.boundingRect(all_pts)

    # Add padding
    pad_x = int(cw * padding)
    pad_y = int(ch * padding)
    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(w, x + cw + pad_x)
    y2 = min(h, y + ch + pad_y)

    cropped = img_bgr[y1:y2, x1:x2]
    return cropped if cropped.size > 0 else img_bgr


def _enhance_image(pil_img: Image.Image) -> Image.Image:
    """
    Apply CLAHE contrast enhancement, brightness normalization, and noise reduction.
    """
    # Convert to numpy for CLAHE
    img_array = np.array(pil_img.convert("RGB"))
    img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    img_lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)

    # Apply CLAHE to L channel only (preserves color)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    img_lab[:, :, 0] = clahe.apply(img_lab[:, :, 0])
    img_bgr = cv2.cvtColor(img_lab, cv2.COLOR_LAB2BGR)

    # Normalize brightness: target mean ~128
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    mean_brightness = float(np.mean(gray))
    if mean_brightness < 60 or mean_brightness > 210:
        alpha = 128.0 / (mean_brightness + 1e-6)
        alpha = np.clip(alpha, 0.5, 2.0)
        img_bgr = cv2.convertScaleAbs(img_bgr, alpha=alpha, beta=0)

    # Gentle noise reduction (bilateral filter preserves edges)
    img_bgr = cv2.bilateralFilter(img_bgr, d=5, sigmaColor=40, sigmaSpace=40)

    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    result = Image.fromarray(img_rgb)

    # Subtle sharpening
    result = result.filter(ImageFilter.UnsharpMask(radius=1, percent=80, threshold=3))
    return result


def preprocess_for_classification(image_path: str) -> Optional[Image.Image]:
    """
    Full preprocessing pipeline for clothing classification.

    Steps:
      1. Load image
      2. Detect & remove background (white threshold → GrabCut fallback)
      3. Smart crop around clothing item
      4. CLAHE contrast enhancement
      5. Brightness normalization
      6. Bilateral noise reduction
      7. Resize to 224×224 (EfficientNet input)
      8. Return PIL Image ready for model inference

    Returns preprocessed PIL Image, or None on failure.
    """
    try:
        # Load
        img_bgr = cv2.imread(image_path)
        if img_bgr is None:
            logger.error(f"Cannot read image: {image_path}")
            return None

        # Step 1: resize large images for processing speed
        h, w = img_bgr.shape[:2]
        max_dim = 1024
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            img_bgr = cv2.resize(img_bgr, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

        # Step 2: background removal
        # Try white-background removal first (fast, accurate for product shots)
        masked_bgr, fg_mask = _remove_white_background(img_bgr)

        # Check how much foreground was detected
        fg_ratio = np.sum(fg_mask > 0) / fg_mask.size
        if fg_ratio < 0.10 or fg_ratio > 0.95:
            # White-background removal didn't work well → use GrabCut
            logger.debug(f"fg_ratio={fg_ratio:.2f} — switching to GrabCut")
            masked_bgr, fg_mask = _grabcut_background_removal(img_bgr)

        # Step 3: smart crop
        cropped = _smart_crop(masked_bgr, fg_mask, padding=0.06)

        # Step 4-6: convert to PIL and enhance
        cropped_rgb = cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(cropped_rgb)
        pil_img = _enhance_image(pil_img)

        # Step 7: resize to model input size
        pil_img = pil_img.resize(MODEL_INPUT_SIZE, Image.LANCZOS)

        return pil_img

    except Exception as e:
        logger.error(f"Preprocessing failed for {image_path}: {e}", exc_info=True)
        # Return basic resize as fallback
        try:
            img = Image.open(image_path).convert("RGB")
            return img.resize(MODEL_INPUT_SIZE, Image.LANCZOS)
        except Exception:
            return None


def preprocess_for_color(image_path: str) -> Optional[np.ndarray]:
    """
    Preprocessing for color extraction only.
    Returns BGR numpy array with white background removed.
    No resizing — keeps more pixels for better color accuracy.
    """
    try:
        img_bgr = cv2.imread(image_path)
        if img_bgr is None:
            return None

        # Resize for speed
        h, w = img_bgr.shape[:2]
        if max(h, w) > 512:
            scale = 512 / max(h, w)
            img_bgr = cv2.resize(img_bgr, (int(w * scale), int(h * scale)))

        masked_bgr, fg_mask = _remove_white_background(img_bgr)
        fg_ratio = np.sum(fg_mask > 0) / fg_mask.size
        if fg_ratio < 0.10 or fg_ratio > 0.95:
            masked_bgr, fg_mask = _grabcut_background_removal(img_bgr)

        return masked_bgr, fg_mask

    except Exception as e:
        logger.error(f"Color preprocessing failed: {e}")
        img_bgr = cv2.imread(image_path)
        ones = np.ones(img_bgr.shape[:2], dtype=np.uint8) * 255 if img_bgr is not None else None
        return img_bgr, ones
