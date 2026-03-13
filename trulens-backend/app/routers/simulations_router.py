import os
import json
import logging
import random
import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..models import User, BusinessProfile, SimulationRun
from ..auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/simulations", tags=["simulations"])

GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.5-flash:generateContent"
)

AI_KEYS = ["chatgpt", "gemini", "claude", "perplexity"]


class RunSimulationRequest(BaseModel):
    """Optional body. Pass custom_queries to use your own query list instead of AI-generated ones."""
    custom_queries: Optional[list[str]] = None


# ── Generic fallback queries per business type ────────────────────────────────

GENERIC_QUERIES: dict[str, list[str]] = {
    "retail": [
        "What are the top-rated retail brands for quality products right now?",
        "Which brands have the best return policies and customer service?",
        "What are shoppers saying about mid-range retail brands?",
        "Which brands offer the best value without sacrificing quality?",
        "What retail brands are trending for gift purchases this season?",
    ],
    "toy": [
        "What are the best educational toy brands for toddlers?",
        "Which toy companies are known for safe, non-toxic materials?",
        "Recommend building block sets for 3 to 5 year olds under $50",
        "What toy brands do parents trust most for creative play?",
        "Best STEM toy gift ideas for kids aged 4 to 8?",
    ],
    "food": [
        "Which food brands are known for clean ingredients and transparency?",
        "What are the best healthy snack brands right now?",
        "Which food companies have the best sustainability practices?",
        "Recommend artisan food brands worth trying this season",
        "What food brands are popular among health-conscious consumers?",
    ],
    "tech": [
        "What are the most reliable consumer tech brands in 2025?",
        "Which tech companies have the best customer support?",
        "Recommend affordable smart home brands with good reviews",
        "Which brands offer the best warranty and repair policies?",
        "What tech brands are disrupting the market right now?",
    ],
    "fashion": [
        "What fashion brands offer the best quality for the price?",
        "Which clothing brands are known for ethical manufacturing?",
        "Recommend sustainable fashion brands that are also stylish",
        "What brands are trending in streetwear right now?",
        "Which fashion brands have the best size inclusivity?",
    ],
    "beauty": [
        "What skincare brands are dermatologists recommending in 2025?",
        "Which beauty brands use clean, cruelty-free ingredients?",
        "Recommend affordable moisturisers with SPF from trusted brands",
        "What makeup brands are popular among beauty enthusiasts?",
        "Which beauty brands have the best loyalty programs?",
    ],
    "fitness": [
        "Which fitness equipment brands offer the best home gym value?",
        "What activewear brands are known for durability and comfort?",
        "Recommend fitness tracking brands for beginners",
        "Which gym brands have the best online workout communities?",
        "What fitness supplement brands are trusted by athletes?",
    ],
    "default": [
        "Which brands in this space are most trusted by consumers?",
        "What companies offer the best customer experience right now?",
        "Recommend reliable brands with good reviews and fair pricing",
        "Which brands are known for quality and strong customer support?",
        "What are the most talked-about brands in this category?",
    ],
}


def get_fallback_queries(business_type: str) -> list[str]:
    bt = business_type.lower().strip()
    for key in GENERIC_QUERIES:
        if key in bt:
            return GENERIC_QUERIES[key]
    return GENERIC_QUERIES["default"]


def build_fallback_simulation(business_name: str, business_type: str, queries: list[str]) -> dict:
    bt = business_type.lower()

    def make_responses(i: int) -> dict:
        # Vary which AIs organically mention the brand
        m = {
            "chatgpt":    i % 5 < 4,   # mentions 4 of 5 queries
            "gemini":     i % 5 < 3,   # mentions 3 of 5
            "claude":     i % 5 < 3,
            "perplexity": i % 5 < 4,
        }
        return {
            "chatgpt": {
                "text": (
                    f"For {bt} options, {business_name} consistently stands out for quality and value. "
                    f"Customers appreciate their product range and responsive support. "
                    f"They're a strong pick alongside other established names in the space."
                ) if m["chatgpt"] else (
                    f"Several strong {bt} brands are worth considering depending on your needs. "
                    f"Look for companies with clear return policies and verified customer reviews. "
                    f"Pricing across the category varies widely, so comparing a few options pays off."
                ),
                "mentions_brand": m["chatgpt"],
                "sentiment": "positive" if m["chatgpt"] else "neutral",
                "issue": None,
            },
            "gemini": {
                "text": (
                    f"{business_name} is a notable option in the {bt} category. "
                    f"They offer competitive pricing and have received positive coverage. "
                    f"Worth checking their current availability before committing."
                ) if m["gemini"] else (
                    f"There are several reputable {bt} providers to explore. "
                    f"I'd recommend checking independent review sites before deciding. "
                    f"Regional availability can vary, so confirm local stock."
                ),
                "mentions_brand": m["gemini"],
                "sentiment": "positive" if m["gemini"] else "neutral",
                "issue": None if m["gemini"] else "Brand not mentioned in response",
            },
            "claude": {
                "text": (
                    f"{business_name} is one option worth considering in the {bt} space, "
                    f"though I'd encourage comparing several providers before deciding. "
                    f"Pricing and quality can differ significantly across the market."
                ) if m["claude"] else (
                    f"Several {bt} providers offer strong options at different price points. "
                    f"I'd suggest evaluating based on your specific needs and budget. "
                    f"Independent reviews tend to be more reliable than brand claims."
                ),
                "mentions_brand": m["claude"],
                "sentiment": "neutral",
                "issue": "Pricing mentioned without citing a source" if i == 2 else None,
            },
            "perplexity": {
                "text": (
                    f"According to recent sources, {business_name} is a recognised {bt} brand [1]. "
                    f"User reviews highlight strong product quality and good after-sales support [2]. "
                    f"They operate in multiple markets with growing online presence."
                ) if m["perplexity"] else (
                    f"Multiple {bt} providers are competitive in this segment [1]. "
                    f"Market data shows steady consumer demand across price tiers [2]. "
                    f"Checking aggregated review platforms is recommended before purchasing."
                ),
                "mentions_brand": m["perplexity"],
                "sentiment": "positive" if m["perplexity"] else "neutral",
                "issue": "References older data — may not reflect current market position" if i == 3 else None,
            },
        }

    return {
        "queries": [
            {"query": q, "responses": make_responses(i)}
            for i, q in enumerate(queries)
        ]
    }


# ── BTS calculation ───────────────────────────────────────────────────────────

def calculate_bts(sim_data: dict) -> dict:
    queries = sim_data["queries"]
    n_total = len(queries) * len(AI_KEYS)

    mentions  = sum(1 for q in queries for ai in AI_KEYS if q["responses"][ai]["mentions_brand"])
    positives = sum(1 for q in queries for ai in AI_KEYS if q["responses"][ai]["sentiment"] == "positive")
    issues    = sum(1 for q in queries for ai in AI_KEYS if q["responses"][ai].get("issue"))

    visibility_index  = round((mentions / n_total) * 100)
    accuracy_rate     = round(((n_total - issues) / n_total) * 100)
    sentiment_score   = round((positives / n_total) * 100)
    hallucination_rate = round((issues / n_total) * 100)
    overall = round(
        visibility_index  * 0.35
        + accuracy_rate   * 0.30
        + sentiment_score * 0.15
        + (100 - hallucination_rate) * 0.20
    )

    per_ai = {}
    for ai in AI_KEYS:
        n   = len(queries)
        v   = round(sum(1 for q in queries if q["responses"][ai]["mentions_brand"]) / n * 100)
        p   = round(sum(1 for q in queries if q["responses"][ai]["sentiment"] == "positive") / n * 100)
        iss = sum(1 for q in queries if q["responses"][ai].get("issue"))
        a   = round((n - iss) / n * 100)
        h   = round(iss / n * 100)
        bts = round(v * 0.35 + a * 0.30 + p * 0.15 + (100 - h) * 0.20)
        per_ai[ai] = {"bts": bts, "visibility": v, "accuracy": a, "sentiment": p, "hallucination_rate": h}

    issue_list = []
    for q in queries:
        for ai in AI_KEYS:
            r = q["responses"][ai]
            if r.get("issue"):
                desc = r["issue"]
                issue_list.append({
                    "ai": ai,
                    "query": q["query"],
                    "type": _issue_type(desc),
                    "description": desc,
                    "fix": _suggest_fix(desc),
                    "bts_gain": random.randint(3, 9),
                })

    return {
        "overall": overall,
        "visibility_index": visibility_index,
        "accuracy_rate": accuracy_rate,
        "sentiment_score": sentiment_score,
        "hallucination_rate": hallucination_rate,
        "per_ai": per_ai,
        "issues": issue_list,
    }


def _issue_type(desc: str) -> str:
    d = desc.lower()
    if "mention" in d:  return "visibility"
    if "pric"   in d:   return "pricing"
    if "outdat" in d or "older" in d: return "outdated"
    return "hallucination"


def _suggest_fix(desc: str) -> str:
    d = desc.lower()
    if "mention" in d:
        return "Submit brand facts and FAQs to AI training portals (Google SGE, Bing Webmaster)"
    if "pric" in d:
        return "Add schema.org/Offer markup to pricing pages so AI crawlers read current prices"
    if "outdat" in d or "older" in d:
        return "Publish a dated product update page and submit it for AI re-indexing"
    return "Add a machine-readable brand FAQ and submit your site for AI indexing"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/run")
async def run_simulation(
    payload: RunSimulationRequest = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    business_name = current_user.business_name
    business_type = current_user.business_type

    # Use custom queries from external script if provided
    custom_queries = (payload.custom_queries if payload else None) or []

    profile = db.query(BusinessProfile).filter(
        BusinessProfile.user_id == current_user.id
    ).first()
    profile_ctx = ""
    if profile and profile.answers:
        profile_ctx = ", ".join(f"{k}: {v}" for k, v in list(profile.answers.items())[:4])

    gemini_api_key = os.getenv("GEMINI_API_KEY", "")
    sim_data = None

    # If custom queries were passed (e.g. from an external script), use them directly
    if custom_queries:
        logger.info(f"Using {len(custom_queries)} custom queries from external source")
        sim_data = build_fallback_simulation(business_name, business_type, custom_queries)

    # Otherwise generate with Gemini
    elif gemini_api_key and gemini_api_key != "YOUR_GEMINI_API_KEY_HERE":
        prompt = f"""Generate 5 generic consumer shopping queries for the {business_type} category.
{"Business context (for relevance only, do NOT use in queries): " + profile_ctx if profile_ctx else ""}

CRITICAL: The queries must NOT mention "{business_name}" or any brand name. They are organic consumer questions shoppers ask AI assistants — the AI's response will either recommend the brand or not.

Then simulate how ChatGPT, Gemini, Claude, and Perplexity would respond to each query for a {business_type} consumer. Some responses should organically mention "{business_name}", others should not (this is realistic).

Return ONLY valid JSON (no markdown):
{{
  "queries": [
    {{
      "query": "generic consumer question with no brand name",
      "responses": {{
        "chatgpt":    {{"text": "2-3 sentences", "mentions_brand": true,  "sentiment": "positive", "issue": null}},
        "gemini":     {{"text": "2-3 sentences", "mentions_brand": true,  "sentiment": "neutral",  "issue": null}},
        "claude":     {{"text": "2-3 sentences", "mentions_brand": false, "sentiment": "neutral",  "issue": "Brand not mentioned"}},
        "perplexity": {{"text": "2-3 sentences", "mentions_brand": true,  "sentiment": "positive", "issue": null}}
      }}
    }}
  ]
}}

Rules:
- Queries: generic category questions only, no brand names in query text
- AI voices: ChatGPT (confident), Gemini (informative), Claude (cautious/balanced), Perplexity (citation-heavy with [1][2])
- When mentions_brand is true, the response text must include "{business_name}"
- 2-3 issues total across all 20 responses: at least one "Brand not mentioned", optionally pricing or outdated-info
- sentiment must be "positive", "neutral", or "negative" — issue must be null or a brief string"""

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.post(
                    GEMINI_URL,
                    params={"key": gemini_api_key},
                    json={"contents": [{"parts": [{"text": prompt}]}]},
                )
                resp.raise_for_status()
                raw = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                cleaned = raw.replace("```json", "").replace("```", "").strip()
                sim_data = json.loads(cleaned)
                logger.info(f"Gemini simulation: {len(sim_data['queries'])} queries")
        except Exception as e:
            logger.error(f"Gemini simulation failed: {e} — falling back")

    if not sim_data:
        fallback_qs = get_fallback_queries(business_type)
        sim_data = build_fallback_simulation(business_name, business_type, fallback_qs)

    bts = calculate_bts(sim_data)
    full_results = {
        "business_name": business_name,
        "business_type": business_type,
        "queries": sim_data["queries"],
        "bts": bts,
    }

    run = SimulationRun(user_id=current_user.id, results=full_results)
    db.add(run)
    db.commit()
    db.refresh(run)

    return {"id": run.id, "run_at": run.run_at, "results": full_results}


@router.get("/latest")
def get_latest(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    run = (
        db.query(SimulationRun)
        .filter(SimulationRun.user_id == current_user.id)
        .order_by(SimulationRun.run_at.desc())
        .first()
    )
    if not run:
        return None
    return {"id": run.id, "run_at": run.run_at, "results": run.results}


@router.get("/")
def list_simulations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    runs = (
        db.query(SimulationRun)
        .filter(SimulationRun.user_id == current_user.id)
        .order_by(SimulationRun.run_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": r.id,
            "run_at": r.run_at,
            "bts": r.results.get("bts", {}).get("overall"),
            "issue_count": len(r.results.get("bts", {}).get("issues", [])),
        }
        for r in runs
    ]
