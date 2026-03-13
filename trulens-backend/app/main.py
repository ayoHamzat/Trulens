from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .routers import auth_router, onboarding_router, simulations_router

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="TruLens API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(onboarding_router.router)
app.include_router(simulations_router.router)


@app.get("/health")
def health():
    return {"status": "ok"}
