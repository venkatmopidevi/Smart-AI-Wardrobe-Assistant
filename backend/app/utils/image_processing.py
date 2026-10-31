"""
Smart AI Wardrobe Assistant - Image Processing Utilities
"""
import os
import uuid
import aiofiles
from pathlib import Path
from PIL import Image
from fastapi import UploadFile, HTTPException
from app.config import settings
import logging

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
THUMBNAIL_SIZE = (300, 300)


def get_file_extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def validate_image(file: UploadFile) -> None:
    """Validate file type and size."""
    ext = get_file_extension(file.filename or "")
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Use: {', '.join(ALLOWED_EXTENSIONS)}"
        )


async def save_upload_file(file: UploadFile, subfolder: str = "clothing") -> tuple[str, str]:
    """
    Save an uploaded file to disk.
    Returns (image_url, thumbnail_url).
    """
    validate_image(file)
    ext = get_file_extension(file.filename or "jpg")
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    thumb_name = f"thumb_{unique_name}"

    # Create directories
    upload_path = Path(settings.UPLOAD_DIR) / subfolder
    upload_path.mkdir(parents=True, exist_ok=True)
    thumb_path = upload_path / "thumbnails"
    thumb_path.mkdir(parents=True, exist_ok=True)

    file_path = upload_path / unique_name
    thumbnail_file_path = thumb_path / thumb_name

    # Read & save original
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    # Create thumbnail
    try:
        img = Image.open(file_path)
        img.thumbnail(THUMBNAIL_SIZE, Image.LANCZOS)
        img.save(thumbnail_file_path)
    except Exception as e:
        logger.warning(f"Could not create thumbnail: {e}")
        thumbnail_file_path = file_path  # fallback

    image_url = f"/uploads/{subfolder}/{unique_name}"
    thumbnail_url = f"/uploads/{subfolder}/thumbnails/{thumb_name}"

    return image_url, thumbnail_url


def delete_upload_file(image_url: str) -> None:
    """Delete an uploaded file from disk."""
    try:
        file_path = Path(image_url.lstrip("/"))
        if file_path.exists():
            file_path.unlink()
    except Exception as e:
        logger.warning(f"Could not delete file {image_url}: {e}")
