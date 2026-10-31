"""
Smart AI Wardrobe Assistant - Gemini API Service
Handles chatbot, outfit generation context, and outfit rating
"""
import google.generativeai as genai
from typing import Optional, List, Dict, Any
from app.config import settings
import logging
import json

logger = logging.getLogger(__name__)

# System prompt for the fashion AI assistant
SYSTEM_PROMPT = """You are StyleAI, an expert AI Fashion Assistant for the Smart Wardrobe app.
You help users make outfit decisions, provide style advice, and answer fashion questions.

Your personality:
- Friendly, enthusiastic, and encouraging
- Expert in fashion, color matching, occasion dressing
- Practical and considerate of the user's actual wardrobe

Rules:
- Keep responses concise but helpful (2-4 sentences typically)
- If you suggest outfit items, format them as a bullet list
- Always consider the occasion, weather, and user preferences when known
- If no wardrobe data is provided, give general fashion advice
- Be positive and encouraging about style choices

Response format:
- Give direct, actionable advice
- End with 1-2 practical tips when relevant
"""


def init_gemini():
    """Initialize Gemini API."""
    if settings.GEMINI_API_KEY:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        logger.info("Gemini initialized")
        return True
    return False


def get_demo_response(message: str) -> str:
    """Return a demo response when no API key is configured."""
    message_lower = message.lower()
    if "interview" in message_lower:
        return ("For an interview, I recommend a **Navy Blue Formal Shirt** with **Black Trousers** and **Black Shoes**. "
                "This classic combination projects confidence and professionalism. "
                "💡 Tip: Ensure your clothes are ironed and shoes are polished!")
    elif "party" in message_lower:
        return ("For a party, go bold! A **Dark Fitted Shirt** with **Slim Jeans** works great. "
                "Add some accessories to elevate the look. 🎉 "
                "💡 Tip: Darker colors are slimming and versatile for evening events.")
    elif "weather" in message_lower or "today" in message_lower:
        return ("Based on typical weather, I'd suggest a **Comfortable T-Shirt** with **Jeans** — "
                "it's a timeless casual look that works in most conditions. "
                "💡 Tip: Layer with a light jacket if it gets cooler in the evening!")
    elif "color" in message_lower:
        return ("Great color combinations include: **Navy Blue + White**, **Black + White**, "
                "and **Grey + Blue**. These are foolproof pairings that always look polished. "
                "💡 Tip: Start with neutrals if you're unsure!")
    else:
        return ("I'm your AI Style Assistant! I can help you with outfit recommendations, "
                "color matching, occasion dressing, and more. "
                "Try asking: 'What should I wear for a job interview?' or 'What colors go with navy blue?'")


async def chat_with_gemini(
    message: str,
    wardrobe_context: Optional[List[Dict]] = None,
    weather_context: Optional[Dict] = None,
    chat_history: Optional[List[Dict]] = None,
) -> Dict[str, Any]:
    """
    Send a message to Gemini and get a fashion-focused response.
    Falls back to demo mode if no API key.
    """
    if not init_gemini():
        return {
            "reply": get_demo_response(message),
            "suggestions": ["Try asking about outfit ideas", "Ask about color matching", "Request weather-based outfits"],
        }

    try:
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=SYSTEM_PROMPT,
        )

        # Build context string
        context_parts = []

        if wardrobe_context:
            wardrobe_str = "User's wardrobe contains:\n"
            for item in wardrobe_context[:15]:  # limit context size
                colors = item.get("dominant_colors", [{}])
                color_name = colors[0].get("name", "Unknown") if colors else "Unknown"
                wardrobe_str += f"- {item.get('category', 'Item')}: {color_name} ({item.get('style', 'casual')})\n"
            context_parts.append(wardrobe_str)

        if weather_context:
            w = weather_context
            context_parts.append(
                f"Current weather in {w.get('city', 'their city')}: "
                f"{w.get('temperature', '?')}°C, {w.get('description', '')}, "
                f"Condition: {w.get('condition', 'mild')}"
            )

        context_str = "\n".join(context_parts)
        full_message = f"{context_str}\n\nUser question: {message}" if context_str else message

        # Start chat with history
        history = []
        if chat_history:
            for h in chat_history[-6:]:  # last 3 exchanges
                history.append({"role": h["role"], "parts": [h["content"]]})

        chat = model.start_chat(history=history)
        
        logger.info(f"Gemini request sent: {full_message}")
        response = await chat.send_message_async(full_message)
        reply = response.text.strip()
        logger.info(f"Gemini response received: {reply}")

        return {
            "reply": reply,
            "suggestions": [],
        }

    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return {
            "reply": get_demo_response(message),
            "suggestions": ["Note: AI is running in demo mode. Add your Gemini API key for full functionality."],
        }


async def rate_outfit_with_gemini(
    outfit_description: str,
    image_analysis: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Use Gemini to provide outfit rating and feedback.
    """
    if not init_gemini():
        return _demo_outfit_rating(image_analysis)

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"""You are an expert fashion critic. Rate this outfit on a scale of 1-10 and provide feedback.

Outfit details:
{outfit_description}

Color analysis: {json.dumps(image_analysis, indent=2)}

Respond in JSON format:
{{
  "overall_score": <float 0-10>,
  "color_score": <float 0-10>,
  "formality_score": <float 0-10>,
  "style_score": <float 0-10>,
  "feedback": "<2-3 sentence assessment>",
  "suggestions": ["<tip 1>", "<tip 2>", "<tip 3>"],
  "occasion_suitability": {{
    "casual": <float 0-10>,
    "office": <float 0-10>,
    "party": <float 0-10>,
    "interview": <float 0-10>
  }}
}}"""

        response = await model.generate_content_async(prompt)
        text = response.text.strip()
        # Extract JSON
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        return json.loads(text)

    except Exception as e:
        logger.error(f"Gemini rating error: {e}")
        return _demo_outfit_rating(image_analysis)


def _demo_outfit_rating(image_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Demo outfit rating when Gemini is unavailable."""
    formality = image_analysis.get("formality_score", 0.5)
    return {
        "overall_score": 7.5,
        "color_score": 8.0,
        "formality_score": round(formality * 10, 1),
        "style_score": 7.8,
        "feedback": "This outfit shows good color coordination and style awareness. The pieces work well together.",
        "suggestions": [
            "Consider accessorizing to elevate the look",
            "Ensure the fit is tailored — well-fitted clothes always look better",
            "Add a statement piece to make the outfit more memorable",
        ],
        "occasion_suitability": {
            "casual": 8.5,
            "office": round(formality * 10, 1),
            "party": 6.5,
            "interview": round(formality * 9, 1),
        },
    }
