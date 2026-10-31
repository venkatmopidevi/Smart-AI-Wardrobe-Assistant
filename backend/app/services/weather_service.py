"""
Smart AI Wardrobe Assistant - Weather Service
Integrates with OpenWeatherMap API
"""
import httpx
from typing import Dict, Any, Optional
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Demo weather data when no API key is set
DEMO_WEATHER = {
    "city": "Demo City",
    "temperature": 24.0,
    "feels_like": 23.0,
    "humidity": 60,
    "description": "Partly cloudy",
    "icon": "02d",
    "wind_speed": 3.5,
    "rain_probability": 20,
    "condition": "mild",
}


async def get_weather(city: str) -> Dict[str, Any]:
    """Fetch current weather for a city."""
    if not settings.WEATHER_API_KEY:
        logger.warning("No weather API key — returning demo data")
        return {**DEMO_WEATHER, "city": city, "demo": True}

    url = f"{settings.WEATHER_BASE_URL}/weather"
    params = {
        "q": city,
        "appid": settings.WEATHER_API_KEY,
        "units": "metric",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        temp = data["main"]["temp"]
        humidity = data["main"]["humidity"]
        desc = data["weather"][0]["description"]
        icon = data["weather"][0]["icon"]
        wind = data["wind"]["speed"]
        rain_prob = data.get("clouds", {}).get("all", 0)

        # Determine condition category
        condition = categorize_weather(temp, rain_prob, desc)

        return {
            "city": data["name"],
            "temperature": round(temp, 1),
            "feels_like": round(data["main"]["feels_like"], 1),
            "humidity": humidity,
            "description": desc.capitalize(),
            "icon": icon,
            "wind_speed": round(wind, 1),
            "rain_probability": rain_prob,
            "condition": condition,
            "demo": False,
        }

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise ValueError(f"City '{city}' not found.")
        raise ValueError(f"Weather service error: {e}")
    except Exception as e:
        logger.error(f"Weather fetch error: {e}")
        return {**DEMO_WEATHER, "city": city, "demo": True}


def categorize_weather(temp: float, rain_prob: int, description: str) -> str:
    """Categorize weather into: hot / mild / cold / rainy / windy."""
    desc_lower = description.lower()
    if "rain" in desc_lower or "drizzle" in desc_lower or rain_prob > 60:
        return "rainy"
    if temp >= 30:
        return "hot"
    if temp <= 12:
        return "cold"
    if "snow" in desc_lower:
        return "cold"
    return "mild"


def get_clothing_advice(weather: Dict[str, Any]) -> Dict[str, Any]:
    """Map weather condition to clothing advice."""
    condition = weather.get("condition", "mild")
    temp = weather.get("temperature", 24)

    advice = {
        "hot": {
            "categories": ["T-Shirt", "Shorts", "Dress"],
            "fabrics": ["Cotton", "Linen", "Breathable"],
            "colors": ["White", "Light Grey", "Beige", "Sky Blue"],
            "tip": f"It's {temp}°C — stay cool with light, breathable fabrics.",
            "avoid": ["Hoodie", "Jacket", "Coat"],
        },
        "mild": {
            "categories": ["Shirt", "Jeans", "T-Shirt", "Trouser"],
            "fabrics": ["Cotton", "Denim", "Light Wool"],
            "colors": ["Blue", "Grey", "White", "Olive"],
            "tip": f"Perfect weather at {temp}°C — any comfortable outfit works!",
            "avoid": [],
        },
        "cold": {
            "categories": ["Hoodie", "Jacket", "Trouser", "Coat"],
            "fabrics": ["Wool", "Fleece", "Thermal"],
            "colors": ["Dark Grey", "Navy Blue", "Black", "Brown"],
            "tip": f"It's {temp}°C — layer up with warm fabrics.",
            "avoid": ["T-Shirt", "Shorts"],
        },
        "rainy": {
            "categories": ["Jacket", "Jeans", "Shoes"],
            "fabrics": ["Waterproof", "Synthetic", "Quick-dry"],
            "colors": ["Dark Grey", "Black", "Navy Blue"],
            "tip": "Rain expected — wear a waterproof jacket and closed shoes.",
            "avoid": ["Suede Shoes", "Light Fabrics"],
        },
    }

    return advice.get(condition, advice["mild"])
