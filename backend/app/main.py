from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.api.memories import router as memories_router
from app.database import Base, SessionLocal, engine, migration_engine
import app.models  # Register models on Base.metadata
from app.schemas import HealthResponse
from app.services.cleanup import MemoryCleanupWorker, cleanup_expired_memories
from app.services.migration import run_database_migration


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize database tables safely on startup (using direct unpooled connection)
    Base.metadata.create_all(bind=migration_engine)

    # 2. Run idempotent schema migration and data backfill for BYTEA media columns
    try:
        run_database_migration(migration_engine)
    except Exception as exc:
        import logging
        logging.getLogger("vintage_booth.startup").error("Migration on startup failed: %s", exc)

    # 3. Initial expired memory cleanup on startup
    try:
        with SessionLocal() as db:
            cleanup_expired_memories(db)
    except Exception as exc:
        import logging
        logging.getLogger("vintage_booth.startup").error("Initial cleanup on startup failed: %s", exc)

    # 4. Start periodic 7-day expiration cleanup worker (every 6 hours)
    worker = MemoryCleanupWorker(interval_seconds=6 * 3600)
    worker.start()

    yield

    # 5. Stop background worker cleanly on shutdown
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
