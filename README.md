# Trulens

**Trulens** is a brand visibility monitoring platform that shows you how AI assistants (ChatGPT, Gemini, Claude, Perplexity) talk about your business — and gives you a score and action plan to improve it.

---

## What It Does

1. **Onboarding** — Answer 7 AI-generated questions about your business
2. **Simulations** — The platform fires generic consumer queries at 4 major AI models and checks whether they mention your brand, and how
3. **Brand Trust Score (BTS)** — A 0–100 composite score based on:
   - Visibility Index (35%) — how often AIs mention you
   - Accuracy Rate (30%) — how correctly they describe you
   - Sentiment Score (15%) — positive vs. negative framing
   - Hallucination Rate (20%) — false or fabricated claims
4. **Insights** — Ranked list of issues with recommended fixes
5. **Settings** — Light / dark mode toggle, account info, logout

---

## Tech Stack

## Technology Stack

| Layer      | Technology |
|-------------|-------------|
| Frontend    | Angular 19, TypeScript, Standalone Components |
| Backend     | FastAPI (Python), Uvicorn |
| Database    | SQLite with SQLAlchemy 2.0 |
| Authentication | JWT (HS256), bcrypt |
| AI Providers | Google Gemini 2.5 Flash (Primary) |
|             | OpenAI |
|             | Anthropic Claude |
|             | Perplexity |

---

## Project Structure

```
Trulens/
├── trulens-backend/          # FastAPI API server
│   ├── app/
│   │   ├── main.py           # App entry point, CORS, router registration
│   │   ├── models.py         # SQLAlchemy models (User, BusinessProfile, SimulationRun)
│   │   ├── schemas.py        # Pydantic request/response schemas
│   │   ├── auth.py           # JWT creation, password hashing, bearer validation
│   │   ├── database.py       # SQLAlchemy engine and session factory
│   │   └── routers/
│   │       ├── auth_router.py          # /auth endpoints
│   │       ├── onboarding_router.py    # /onboarding endpoints
│   │       └── simulations_router.py  # /simulations endpoints
│   ├── requirements.txt
│   └── .env                  # API keys and secrets (not committed)
│
└── trulens-frontend/         # Angular SPA
    └── src/
        ├── app/
        │   ├── pages/
        │   │   ├── auth-page/          # Login / Register
        │   │   ├── onboarding-page/    # Guided wizard
        │   │   ├── dashboard-page/     # BTS overview + recent sims
        │   │   ├── simulations-page/   # Run & view simulations
        │   │   ├── insights-page/      # Detailed analytics
        │   │   └── settings-page/      # Theme toggle, account info
        │   ├── components/
        │   │   └── sidebar/            # Navigation sidebar
        │   └── services/
        │       ├── auth.service.ts
        │       ├── simulation.service.ts
        │       └── theme.service.ts
        ├── environments/
        │   └── environment.ts          # Backend API URL
        └── styles.css                  # Global design system (CSS variables)
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- A Google Gemini API key ([get one here](https://aistudio.google.com/app/apikey))
- OPEN AI API KEY
- CLAUDE AI API KEY
- PREPLEXCITY AI API KEY

---

### Backend Setup

```bash
cd trulens-backend

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env   # or create manually (see below)

# Start the server
uvicorn app.main:app --reload --port 8000
```

**`.env` file:**
```env
SECRET_KEY=your-long-random-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
GEMINI_API_KEY=your-gemini-api-key-here
DATABASE_URL=sqlite:///./trulens.db
```

The SQLite database is created automatically on first run. Interactive API docs are available at `http://localhost:8000/docs`.

---

### Frontend Setup

```bash
cd trulens-frontend

# Install dependencies
npm install

# Start dev server
ng serve```

App runs at `http://localhost:4200` and proxies API calls to `http://localhost:8000`.

---

## API Endpoints

### Auth — `/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create a new account |
| POST | `/auth/login` | Login and receive JWT |
| GET | `/auth/me` | Get current user (Bearer token required) |

### Onboarding — `/onboarding`
| Method | Path | Description |
|---|---|---|
| POST | `/onboarding/questions` | Generate business-specific questions via Gemini |
| POST | `/onboarding/save` | Save answered business profile |

### Simulations — `/simulations`
| Method | Path | Description |
|---|---|---|
| POST | `/simulations/run` | Run a new simulation |
| GET | `/simulations/latest` | Get the most recent simulation result |
| GET | `/simulations/` | List up to 20 past simulation summaries |

**Custom query injection** — a third-party script can inject its own queries:
```bash
curl -X POST http://localhost:8000/simulations/run \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"custom_queries": ["Best coffee shop downtown?", "Where should I get brunch?"]}'
```

---

## Database Models

| Model | Key Fields |
|---|---|
| `User` | `owner_name`, `email`, `hashed_password`, `business_name`, `business_type` |
| `BusinessProfile` | `user_id`, `answers` (JSON) |
| `SimulationRun` | `user_id`, `results` (JSON — full BTS data), `run_at` |

---

## BTS Score Formula

```
BTS = (Visibility × 0.35) + (Accuracy × 0.30) + (Sentiment × 0.15) + ((100 - Hallucination) × 0.20)
```

| Range | Rating |
|---|---|
| 70 – 100 | Strong performance |
| 50 – 69 | Room for improvement |
| 0 – 49 | Needs attention |

---

## Notes

- The app defaults to **light mode**. Dark mode is toggled from the Settings page and persisted in `localStorage`.
- Simulations use **generic consumer queries** (no brand name included) to test organic AI visibility.
- If the Gemini API is unavailable, the backend falls back to a built-in simulation with deterministic per-business-type responses.
- CORS is configured for `http://localhost:4200` only. Update `main.py` for production deployment.
