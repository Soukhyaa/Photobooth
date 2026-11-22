from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.api.memories import router as memories_router
from app.database import Base, engine
import app.models  # Register models on Base.metadata
from app.schemas import HealthResponse
from app.services.cleanup import MemoryCleanupWorker


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize SQLite database tables on startup
    Base.metadata.create_all(bind=engine)

    # 2. Start periodic 7-day expiration cleanup worker (every 6 hours)
    worker = MemoryCleanupWorker(interval_seconds=6 * 3600)
    worker.start()

    yield

    # 3. Stop background worker cleanly on shutdown
    worker.stop()


app = FastAPI(
    title="Vintage Booth API",
    version="1.0.0",
    description="Backend API for Vintage Booth Photo Booth memories and storage.",
    lifespan=lifespan,
)

# Register memories router
app.include_router(memories_router, prefix="/api", tags=["memories"])


@app.get("/api/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="ok",
        app="Vintage Booth API",
        version="1.0.0",
    )
