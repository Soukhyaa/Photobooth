import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, LargeBinary
from sqlalchemy.orm import relationship

from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class MemorySession(Base):
    __tablename__ = "memory_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_token_hash = Column(String(64), index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    caption = Column(String(255), nullable=True)
    date_text = Column(String(64), nullable=True)
    design_id = Column(String(32), nullable=False, default="classic_cream")
    solid_color_id = Column(String(32), nullable=True)
    width_id = Column(String(16), nullable=False, default="wide")
    filter_id = Column(String(32), nullable=True)
    capture_mode = Column(String(16), nullable=False, default="still")

    # Binary media storage (Neon PostgreSQL BYTEA / SQLite BLOB)
    strip_image_data = Column(LargeBinary, nullable=True)
    strip_image_mime = Column(String(64), nullable=True, default="image/png")
    strip_thumbnail_data = Column(LargeBinary, nullable=True)
    strip_thumbnail_mime = Column(String(64), nullable=True, default="image/webp")
    live_strip_video_data = Column(LargeBinary, nullable=True)
    live_strip_video_mime = Column(String(64), nullable=True, default="video/webm")

    # Stored media file paths (retained for backward compatibility / fallback)
    strip_image_path = Column(String(512), nullable=True)
    strip_thumbnail_path = Column(String(512), nullable=True)
    live_strip_video_path = Column(String(512), nullable=True)

    # Associated photo frames
    frames = relationship(
        "PhotoFrame",
        back_populates="memory_session",
        cascade="all, delete-orphan",
        order_by="PhotoFrame.photo_index",
    )


class PhotoFrame(Base):
    __tablename__ = "photo_frames"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(
        String(36),
        ForeignKey("memory_sessions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    photo_index = Column(Integer, nullable=False)  # 1 to 4

    # Binary media storage (Neon PostgreSQL BYTEA / SQLite BLOB)
    photo_image_data = Column(LargeBinary, nullable=True)
    photo_image_mime = Column(String(64), nullable=True, default="image/jpeg")
    live_video_data = Column(LargeBinary, nullable=True)
    live_video_mime = Column(String(64), nullable=True, default="video/webm")

    # Stored media file paths (retained for backward compatibility / fallback)
    photo_image_path = Column(String(512), nullable=True)
    live_video_path = Column(String(512), nullable=True)
    duration = Column(Float, nullable=True)

    memory_session = relationship("MemorySession", back_populates="frames")
