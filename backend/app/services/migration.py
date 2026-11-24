import logging
from pathlib import Path
from typing import Dict, Any, Optional
from sqlalchemy import text, inspect
from sqlalchemy.orm import Session

from app.config import settings
from app.models import MemorySession, PhotoFrame
from app.services.storage import get_memory_file_path

logger = logging.getLogger("vintage_booth.migration")


def run_database_migration(engine, custom_storage_dir: Optional[Path] = None) -> Dict[str, Any]:
    """
    Executes an idempotent schema migration to add BYTEA/BLOB binary media columns
    to existing tables, and backfills binary data for any existing records whose
    files exist on local disk.
    """
    inspector = inspect(engine)
    dialect_name = engine.dialect.name
    logger.info("Running database migration on dialect: %s", dialect_name)

    # 1. Schema Migration: Add missing columns
    with engine.begin() as conn:
        if dialect_name == "postgresql":
            # PostgreSQL supports ADD COLUMN IF NOT EXISTS
            conn.execute(text("""
                ALTER TABLE memory_sessions ADD COLUMN IF NOT EXISTS strip_image_data BYTEA;
                ALTER TABLE memory_sessions ADD COLUMN IF NOT EXISTS strip_image_mime VARCHAR(64) DEFAULT 'image/png';
                ALTER TABLE memory_sessions ADD COLUMN IF NOT EXISTS strip_thumbnail_data BYTEA;
                ALTER TABLE memory_sessions ADD COLUMN IF NOT EXISTS strip_thumbnail_mime VARCHAR(64) DEFAULT 'image/webp';
                ALTER TABLE memory_sessions ADD COLUMN IF NOT EXISTS live_strip_video_data BYTEA;
                ALTER TABLE memory_sessions ADD COLUMN IF NOT EXISTS live_strip_video_mime VARCHAR(64);

                ALTER TABLE photo_frames ADD COLUMN IF NOT EXISTS photo_image_data BYTEA;
                ALTER TABLE photo_frames ADD COLUMN IF NOT EXISTS photo_image_mime VARCHAR(64) DEFAULT 'image/jpeg';
                ALTER TABLE photo_frames ADD COLUMN IF NOT EXISTS live_video_data BYTEA;
                ALTER TABLE photo_frames ADD COLUMN IF NOT EXISTS live_video_mime VARCHAR(64) DEFAULT 'video/webm';
            """))
        else:
            # SQLite inspection & migration
            existing_session_cols = {c["name"] for c in inspector.get_columns("memory_sessions")}
            session_cols_to_add = [
                ("strip_image_data", "BLOB"),
                ("strip_image_mime", "VARCHAR(64) DEFAULT 'image/png'"),
                ("strip_thumbnail_data", "BLOB"),
                ("strip_thumbnail_mime", "VARCHAR(64) DEFAULT 'image/webp'"),
                ("live_strip_video_data", "BLOB"),
                ("live_strip_video_mime", "VARCHAR(64)"),
            ]
            for col_name, col_type in session_cols_to_add:
                if col_name not in existing_session_cols:
                    conn.execute(text(f"ALTER TABLE memory_sessions ADD COLUMN {col_name} {col_type};"))

            existing_frame_cols = {c["name"] for c in inspector.get_columns("photo_frames")}
            frame_cols_to_add = [
                ("photo_image_data", "BLOB"),
                ("photo_image_mime", "VARCHAR(64) DEFAULT 'image/jpeg'"),
                ("live_video_data", "BLOB"),
                ("live_video_mime", "VARCHAR(64) DEFAULT 'video/webm'"),
            ]
            for col_name, col_type in frame_cols_to_add:
                if col_name not in existing_frame_cols:
                    conn.execute(text(f"ALTER TABLE photo_frames ADD COLUMN {col_name} {col_type};"))

    logger.info("Schema migration completed. Columns verified.")

    # 2. Data Migration: Backfill existing disk files into database
    migrated_sessions = 0
    migrated_frames = 0
    missing_files = []

    with Session(engine) as db:
        sessions_to_backfill = (
            db.query(MemorySession)
            .filter(MemorySession.strip_image_data.is_(None))
            .all()
        )

        for session in sessions_to_backfill:
            session_modified = False

            # Backfill strip image
            if session.strip_image_path:
                strip_file = get_memory_file_path(session.id, session.strip_image_path, custom_storage_dir)
                if strip_file and strip_file.is_file():
                    session.strip_image_data = strip_file.read_bytes()
                    session.strip_image_mime = "image/png" if strip_file.suffix.lower() == ".png" else "image/jpeg"
                    session_modified = True
                else:
                    missing_files.append(f"Strip {session.id}: {session.strip_image_path}")

            # Backfill thumbnail
            if session.strip_thumbnail_path:
                thumb_file = get_memory_file_path(session.id, session.strip_thumbnail_path, custom_storage_dir)
                if thumb_file and thumb_file.is_file():
                    session.strip_thumbnail_data = thumb_file.read_bytes()
                    session.strip_thumbnail_mime = "image/webp"
                    session_modified = True
                else:
                    missing_files.append(f"Thumb {session.id}: {session.strip_thumbnail_path}")

            # Backfill live strip video
            if session.live_strip_video_path:
                video_file = get_memory_file_path(session.id, session.live_strip_video_path, custom_storage_dir)
                if video_file and video_file.is_file():
                    session.live_strip_video_data = video_file.read_bytes()
                    session.live_strip_video_mime = "video/webm" if video_file.suffix.lower() == ".webm" else "video/mp4"
                    session_modified = True

            # Backfill frames
            for frame in session.frames:
                frame_modified = False
                if frame.photo_image_path and frame.photo_image_data is None:
                    p_file = get_memory_file_path(session.id, frame.photo_image_path, custom_storage_dir)
                    if p_file and p_file.is_file():
                        frame.photo_image_data = p_file.read_bytes()
                        frame.photo_image_mime = "image/jpeg" if p_file.suffix.lower() in (".jpg", ".jpeg") else "image/png"
                        frame_modified = True
                        migrated_frames += 1
                    else:
                        missing_files.append(f"Frame {session.id} p{frame.photo_index}: {frame.photo_image_path}")

                if frame.live_video_path and frame.live_video_data is None:
                    v_file = get_memory_file_path(session.id, frame.live_video_path, custom_storage_dir)
                    if v_file and v_file.is_file():
                        frame.live_video_data = v_file.read_bytes()
                        frame.live_video_mime = "video/webm" if v_file.suffix.lower() == ".webm" else "video/mp4"
                        frame_modified = True

                if frame_modified:
                    session_modified = True

            if session_modified:
                migrated_sessions += 1

        db.commit()

    report = {
        "status": "success",
        "dialect": dialect_name,
        "migrated_sessions": migrated_sessions,
        "migrated_frames": migrated_frames,
        "missing_files_count": len(missing_files),
        "missing_files": missing_files,
    }
    logger.info("Migration & backfill report: %s", report)
    return report
