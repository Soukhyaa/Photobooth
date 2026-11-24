import logging
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import MemorySession
from app.services.storage import delete_memory_assets

logger = logging.getLogger("vintage_booth.cleanup")

_last_cleanup_time: float = 0.0
_cleanup_lock = threading.Lock()


def utcnow():
    return datetime.now(timezone.utc)


def cleanup_expired_memories(
    db: Session,
    custom_storage_dir: Optional[Path] = None,
) -> int:
    """
    Find all memories whose expires_at timestamp has passed, delete their media
    files from the filesystem if present, and remove the database records
    (which permanently deletes all binary media stored in Neon PostgreSQL).
    Returns the count of purged memories.
    """
    now = utcnow()
    expired = (
        db.query(MemorySession)
        .filter(MemorySession.expires_at <= now)
        .all()
    )

    if not expired:
        return 0

    deleted_count = 0
    for mem in expired:
        try:
            # 1. Remove legacy media directory from filesystem if exists
            delete_memory_assets(mem.id, custom_storage_dir=custom_storage_dir)
            # 2. Delete database record (cascading deletes PhotoFrames and all BYTEA data in Neon)
            db.delete(mem)
            deleted_count += 1
        except Exception as exc:
            logger.error("Failed to delete expired memory %s: %s", mem.id, exc)

    try:
        db.commit()
        logger.info("Expired memory cleanup completed: purged %d memories from database.", deleted_count)
    except Exception as exc:
        db.rollback()
        logger.error("Failed to commit database changes during memory cleanup: %s", exc)

    return deleted_count


def run_expiration_cleanup_if_needed(
    db: Session,
    min_interval_seconds: int = 1800,
    custom_storage_dir: Optional[Path] = None,
) -> int:
    """
    Request-time cleanup trigger. If at least `min_interval_seconds` have passed
    since the last run, executes cleanup immediately. Guarantees expired binary
    data is purged even if the platform sleeps background threads (e.g. Render Free).
    """
    global _last_cleanup_time
    now_ts = datetime.now(timezone.utc).timestamp()
    if now_ts - _last_cleanup_time < min_interval_seconds:
        return 0

    with _cleanup_lock:
        if now_ts - _last_cleanup_time < min_interval_seconds:
            return 0
        deleted = cleanup_expired_memories(db, custom_storage_dir=custom_storage_dir)
        _last_cleanup_time = datetime.now(timezone.utc).timestamp()
        return deleted


class MemoryCleanupWorker:
    """
    Background worker thread that periodically purges expired memories.
    Uses a daemon thread and a threading.Event stop signal to avoid blocking
    FastAPI startup or anyio/Starlette test runners.
    """

    def __init__(self, interval_seconds: int = 6 * 3600, custom_storage_dir: Optional[Path] = None):
        self.interval_seconds = interval_seconds
        self.custom_storage_dir = custom_storage_dir
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None

    def start(self):
        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._run,
            name="MemoryCleanupWorker",
            daemon=True,
        )
        self._thread.start()
        logger.info("Memory cleanup worker started (interval: %d seconds).", self.interval_seconds)

    def stop(self, timeout: float = 3.0):
        if self._thread and self._thread.is_alive():
            self._stop_event.set()
            self._thread.join(timeout=timeout)
            logger.info("Memory cleanup worker stopped.")

    def _run(self):
        while not self._stop_event.is_set():
            # Wait for interval or stop event
            if self._stop_event.wait(timeout=self.interval_seconds):
                break
            try:
                with SessionLocal() as db:
                    cleanup_expired_memories(db, custom_storage_dir=self.custom_storage_dir)
            except Exception as exc:
                logger.error("Unexpected error in memory cleanup runner: %s", exc)
