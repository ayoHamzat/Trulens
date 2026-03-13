from pydantic import BaseModel, EmailStr
from typing import Any
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    owner_name: str
    email: EmailStr
    password: str
    business_name: str
    business_type: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: int
    owner_name: str
    email: str
    business_name: str
    business_type: str

    model_config = {"from_attributes": True}


# ── Onboarding ────────────────────────────────────────────────────────────────

class OnboardingQuestionsRequest(BaseModel):
    business_type: str


class SaveProfileRequest(BaseModel):
    answers: dict[str, Any]


class SaveProfileResponse(BaseModel):
    message: str


# ── Simulations ───────────────────────────────────────────────────────────────

class SimulationRunOut(BaseModel):
    id: int
    run_at: datetime
    results: dict[str, Any]

    model_config = {"from_attributes": True}


class SimulationSummary(BaseModel):
    id: int
    run_at: datetime
    bts: int | None
    issue_count: int
