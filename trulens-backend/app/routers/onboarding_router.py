import os
import json
import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

from ..database import get_db
from ..models import User, BusinessProfile
from ..schemas import OnboardingQuestionsRequest, SaveProfileRequest, SaveProfileResponse
from ..auth import get_current_user

load_dotenv()

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.5-flash:generateContent"
)

FALLBACK_QUESTIONS = [
    {"label": "Who is your primary target customer?", "field_name": "target_customer", "input_type": "select",
     "options": ["Men", "Women", "Both men and women", "Teens", "Kids", "Seniors", "Businesses (B2B)"]},
    {"label": "What are your top 3 products or services?", "field_name": "top_products", "input_type": "textarea"},
    {"label": "What price range do your products typically fall into?", "field_name": "price_range", "input_type": "select",
     "options": ["Under $25", "$25 – $75", "$75 – $150", "$150 – $500", "$500+"]},
    {"label": "Which region is your primary market?", "field_name": "primary_market", "input_type": "select",
     "options": ["United States", "Canada", "United Kingdom", "Europe", "Australia", "Asia", "Global"]},
    {"label": "Who are your top 2–3 competitors?", "field_name": "competitors", "input_type": "text"},
    {"label": "How would you describe your brand's personality and tone?", "field_name": "brand_tone", "input_type": "select",
     "options": ["Premium & sophisticated", "Fun & playful", "Bold & edgy", "Trustworthy & professional", "Eco-conscious & ethical", "Affordable & accessible"]},
    {"label": "What makes your brand unique compared to competitors?", "field_name": "unique_value", "input_type": "textarea"},
]


@router.post("/questions")
async def get_questions(payload: OnboardingQuestionsRequest, current_user: User = Depends(get_current_user)):
    gemini_api_key = os.getenv("GEMINI_API_KEY", "")

    if not gemini_api_key or gemini_api_key == "YOUR_GEMINI_API_KEY_HERE":
        logger.warning("GEMINI_API_KEY not set — returning fallback questions")
        return FALLBACK_QUESTIONS

    logger.info(f"Calling Gemini for business type: {payload.business_type}")

    prompt = f"""Create 7 short onboarding questions for a "{payload.business_type}" business. Cover: target customers, top products/services, price range, primary market, competitors, brand tone, and unique value.

Return ONLY a JSON array, no markdown. Format:
[{{"label":"Question?","field_name":"snake_key","input_type":"text","options":[]}}]

Rules:
- Labels must be under 8 words, conversational.
- Use "select" + options array for predictable answers.
- Use "textarea" for open-ended answers.
- Use "text" for short answers."""

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                GEMINI_URL,
                params={"key": gemini_api_key},
                json={"contents": [{"parts": [{"text": prompt}]}]},
            )
            resp.raise_for_status()
            data = resp.json()
            raw_text: str = data["candidates"][0]["content"]["parts"][0]["text"]
            cleaned = raw_text.replace("```json", "").replace("```", "").strip()
            questions = json.loads(cleaned)
            logger.info(f"Gemini returned {len(questions)} questions successfully")
            return questions
    except Exception as e:
        logger.error(f"Gemini call failed: {e} — returning fallback questions")
        return FALLBACK_QUESTIONS


@router.post("/save", response_model=SaveProfileResponse)
def save_profile(
    payload: SaveProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    if existing:
        existing.answers = payload.answers
    else:
        profile = BusinessProfile(user_id=current_user.id, answers=payload.answers)
        db.add(profile)
    db.commit()
    return SaveProfileResponse(message="Profile saved successfully.")
