import os
import json
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from ..database import get_db
from ..models import User, BusinessProfile
from ..schemas import OnboardingQuestionsRequest, SaveProfileRequest, SaveProfileResponse
from ..auth import get_current_user

load_dotenv()

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.0-flash-lite:generateContent"
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
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
        return FALLBACK_QUESTIONS

    prompt = f"""You are helping a "{payload.business_type}" business owner set up an AI brand monitoring profile.

Generate exactly 7 thoughtful questions to understand their business. Cover: target customers, top products or services, price range, primary geographic market, main competitors, brand personality/tone, and what makes them unique.

Return ONLY a valid JSON array — no markdown, no explanation, no code fences. Use this exact structure:
[
  {{
    "label": "The question text",
    "field_name": "snake_case_key",
    "input_type": "text",
    "options": []
  }}
]

Rules:
- Use "select" with a populated "options" array when a predefined list makes sense.
- Use "textarea" for questions expecting longer, descriptive answers.
- Use "text" for short open-ended answers.
- Keep labels conversational and natural, not robotic."""

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                GEMINI_URL,
                params={"key": GEMINI_API_KEY},
                json={"contents": [{"parts": [{"text": prompt}]}]},
            )
            resp.raise_for_status()
            data = resp.json()
            raw_text: str = data["candidates"][0]["content"]["parts"][0]["text"]
            cleaned = raw_text.replace("```json", "").replace("```", "").strip()
            return json.loads(cleaned)
    except Exception:
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
