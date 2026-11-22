import json
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_client_token_hash
from app.config import settings
from app.database import get_db
from app.models import MemorySession, PhotoFrame
from app.schemas import (
    DeleteResponse,
    MemoryCreateMetadata,
    MemorySessionDetail,
    MemorySessionSummary,
    PhotoFrameResponse,
)
from app.services.image_processor import (
    generate_thumbnail,
    get_image_extension,
    validate_image,
)
from app.services.storage import (
    cleanup_memory_dir,
    delete_memory_assets,
    get_memory_file_path,
    save_memory_file,
)

router = APIRouter(prefix="/memories")


def utcnow():
    return datetime.now(timezone.utc)


ALLOWED_VIDEO_EXTENSIONS = {".webm", ".mp4"}
ALLOWED_VIDEO_MIMES = {"video/webm", "video/mp4", "application/octet-stream"}
MAX_VIDEO_SIZE = 35 * 1024 * 1024  # 35 MB per clip


def validate_video_file(data: bytes, original_filename: Optional[str], content_type: Optional[str]) -> str:
    """Validate video clip data and return a safe normalized extension."""
    if not data or len(data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded video clip cannot be empty.",
        )
    if len(data) > MAX_VIDEO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Video exceeds maximum allowable size ({MAX_VIDEO_SIZE // (1024 * 1024)} MB).",
        )

    # Determine extension from filename or content-type
    ext = ".webm"
    if original_filename:
        suffix = Path(original_filename).suffix.lower()
        if suffix in ALLOWED_VIDEO_EXTENSIONS:
            ext = suffix
    elif content_type and "mp4" in content_type.lower():
        ext = ".mp4"

    # Basic magic byte check: EBML (webm/mkv) or MP4 ftyp
    is_ebml = data.startswith(b"\x1a\x45\xdf\xa3")
    is_mp4 = len(data) >= 8 and b"ftyp" in data[4:12]
    if not (is_ebml or is_mp4):
        # Allow if extension matches standard container to support diverse browser MediaRecorder headers
        if ext not in ALLOWED_VIDEO_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported video format. Only MP4 and WebM are permitted.",
            )

    return ext.lstrip(".")


def format_memory_summary(mem: MemorySession) -> MemorySessionSummary:
    return MemorySessionSummary(
        id=mem.id,
        created_at=mem.created_at,
        expires_at=mem.expires_at,
        caption=mem.caption,
        date_text=mem.date_text,
        design_id=mem.design_id,
        solid_color_id=mem.solid_color_id,
        width_id=mem.width_id,
        filter_id=mem.filter_id,
        capture_mode=mem.capture_mode,
        thumbnail_url=f"/api/memories/{mem.id}/thumbnail",
        strip_url=f"/api/memories/{mem.id}/strip",
    )


def format_memory_detail(mem: MemorySession) -> MemorySessionDetail:
    summary = format_memory_summary(mem)
    frames_resp = []
    for f in sorted(mem.frames, key=lambda x: x.photo_index):
        frames_resp.append(
            PhotoFrameResponse(
                photo_index=f.photo_index,
                photo_url=f"/api/memories/{mem.id}/photos/{f.photo_index}",
                live_video_url=(
                    f"/api/memories/{mem.id}/videos/{f.photo_index}"
                    if f.live_video_path
                    else None
                ),
                duration=f.duration,
            )
        )

    return MemorySessionDetail(
        **summary.model_dump(),
        live_strip_video_url=(
            f"/api/memories/{mem.id}/strip-video"
            if mem.live_strip_video_path
            else None
        ),
        frames=frames_resp,
    )


@router.post(
    "",
    response_model=MemorySessionSummary,
    status_code=status.HTTP_201_CREATED,
    summary="Save a completed photo strip memory (opt-in)",
)
async def create_memory(
    strip_image: UploadFile = File(..., description="The composed high-resolution photo strip (PNG/JPEG)"),
    photos: List[UploadFile] = File(..., description="The four individual captured photo frames"),
    live_clips: Optional[List[UploadFile]] = File(None, description="Optional Live Photo video clips (1-4)"),
    live_strip_video: Optional[UploadFile] = File(None, description="Optional animated video strip (MP4/WebM)"),
    metadata: Optional[str] = Form(None, description="JSON string containing session configuration metadata"),
    caption: Optional[str] = Form(None),
    date_text: Optional[str] = Form(None),
    design_id: Optional[str] = Form(None),
    solid_color_id: Optional[str] = Form(None),
    width_id: Optional[str] = Form(None),
    filter_id: Optional[str] = Form(None),
    capture_mode: Optional[str] = Form(None),
    client_token_hash: str = Depends(get_client_token_hash),
    db: Session = Depends(get_db),
):
    # 1. Validate photo count
    if not photos or len(photos) != 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Expected exactly 4 individual photos, received {len(photos) if photos else 0}.",
        )

    # 2. Parse session metadata
    meta = MemoryCreateMetadata()
    if metadata:
        try:
            parsed = json.loads(metadata)
            meta = MemoryCreateMetadata(**parsed)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid metadata JSON: {str(exc)}",
            )
    else:
        # Fall back to individual form fields if provided
        if caption is not None:
            meta.caption = caption
        if date_text is not None:
            meta.date_text = date_text
        if design_id is not None:
            meta.design_id = design_id
        if solid_color_id is not None:
            meta.solid_color_id = solid_color_id
        if width_id is not None:
            meta.width_id = width_id
        if filter_id is not None:
            meta.filter_id = filter_id
        if capture_mode is not None:
            meta.capture_mode = capture_mode

    # 3. Read and validate strip image
    strip_bytes = await strip_image.read()
    try:
        strip_fmt, _ = validate_image(strip_bytes)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid photo strip image: {str(val_err)}",
        )

    # 4. Read and validate each individual photo
    photo_items = []
    for idx, p in enumerate(photos, start=1):
        p_bytes = await p.read()
        try:
            p_fmt, _ = validate_image(p_bytes)
            photo_items.append((idx, p_fmt, p_bytes))
        except ValueError as val_err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid photo #{idx}: {str(val_err)}",
            )

    # 5. Read and validate optional Live Photo video clips
    clip_items = {}
    if live_clips:
        for idx, clip in enumerate(live_clips, start=1):
            if clip and clip.filename:
                clip_bytes = await clip.read()
                if len(clip_bytes) > 0:
                    clip_ext = validate_video_file(clip_bytes, clip.filename, clip.content_type)
                    clip_items[idx] = (clip_ext, clip_bytes)

    # 6. Read and validate optional Live Strip Video
    strip_video_data = None
    if live_strip_video and live_strip_video.filename:
        sv_bytes = await live_strip_video.read()
        if len(sv_bytes) > 0:
            sv_ext = validate_video_file(sv_bytes, live_strip_video.filename, live_strip_video.content_type)
            strip_video_data = (sv_ext, sv_bytes)

    # 7. Generate Thumbnail
    try:
        thumb_bytes = generate_thumbnail(strip_bytes, target_width=240)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate strip thumbnail: {str(exc)}",
        )

    # 8. Allocate server-controlled Memory ID and timestamps
    memory_id = str(uuid.uuid4())
    created_at = utcnow()
    expires_at = created_at + timedelta(days=settings.MEMORY_EXPIRATION_DAYS)

    # 9. Store assets on disk with rollback guard
    try:
        strip_ext = get_image_extension(strip_fmt)
        strip_filename = f"strip_{uuid.uuid4().hex[:8]}.{strip_ext}"
        strip_rel_path = save_memory_file(memory_id, strip_filename, strip_bytes)

        thumb_filename = f"thumb_{uuid.uuid4().hex[:8]}.webp"
        thumb_rel_path = save_memory_file(memory_id, thumb_filename, thumb_bytes)

        live_strip_rel_path = None
        if strip_video_data:
            sv_ext, sv_bytes = strip_video_data
            sv_filename = f"videos/live_strip_{uuid.uuid4().hex[:8]}.{sv_ext}"
            live_strip_rel_path = save_memory_file(memory_id, sv_filename, sv_bytes)

        # Database session record
        mem_session = MemorySession(
            id=memory_id,
            client_token_hash=client_token_hash,
            created_at=created_at,
            expires_at=expires_at,
            caption=meta.caption,
            date_text=meta.date_text,
            design_id=meta.design_id,
            solid_color_id=meta.solid_color_id,
            width_id=meta.width_id,
            filter_id=meta.filter_id,
            capture_mode=meta.capture_mode,
            strip_image_path=strip_rel_path,
            strip_thumbnail_path=thumb_rel_path,
            live_strip_video_path=live_strip_rel_path,
        )
        db.add(mem_session)

        # Photo frame records
        for p_idx, p_fmt, p_bytes in photo_items:
            p_ext = get_image_extension(p_fmt)
            p_filename = f"photos/photo_{p_idx}_{uuid.uuid4().hex[:8]}.{p_ext}"
            p_rel_path = save_memory_file(memory_id, p_filename, p_bytes)

            v_rel_path = None
            if p_idx in clip_items:
                c_ext, c_bytes = clip_items[p_idx]
                c_filename = f"videos/clip_{p_idx}_{uuid.uuid4().hex[:8]}.{c_ext}"
                v_rel_path = save_memory_file(memory_id, c_filename, c_bytes)

            frame = PhotoFrame(
                session_id=memory_id,
                photo_index=p_idx,
                photo_image_path=p_rel_path,
                live_video_path=v_rel_path,
                duration=2.7 if v_rel_path else None,
            )
            db.add(frame)

        db.commit()
        db.refresh(mem_session)
        return format_memory_summary(mem_session)

    except Exception as exc:
        db.rollback()
        # Clean up any partial files written for this memory
        cleanup_memory_dir(memory_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save memory session. All temporary assets were purged.",
        ) from exc


@router.get(
    "",
    response_model=List[MemorySessionSummary],
    summary="List all non-expired memories scoped to calling browser identity",
)
def list_memories(
    client_token_hash: str = Depends(get_client_token_hash),
    db: Session = Depends(get_db),
):
    now = utcnow()
    memories = (
        db.query(MemorySession)
        .filter(
            MemorySession.client_token_hash == client_token_hash,
            MemorySession.expires_at > now,
        )
        .order_by(MemorySession.created_at.desc())
        .all()
    )
    return [format_memory_summary(m) for m in memories]


@router.get(
    "/{memory_id}",
    response_model=MemorySessionDetail,
    summary="Retrieve full details for a specific memory",
)
def get_memory(
    memory_id: str,
    client_token_hash: str = Depends(get_client_token_hash),
    db: Session = Depends(get_db),
):
    now = utcnow()
    mem = (
        db.query(MemorySession)
        .filter(
            MemorySession.id == memory_id,
            MemorySession.client_token_hash == client_token_hash,
            MemorySession.expires_at > now,
        )
        .first()
    )
    if not mem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found.",
        )
    return format_memory_detail(mem)


@router.get(
    "/{memory_id}/strip",
    summary="Serve the full-resolution photo strip image",
)
def get_memory_strip(
    memory_id: str,
    client_token_hash: str = Depends(get_client_token_hash),
    db: Session = Depends(get_db),
):
    now = utcnow()
    mem = (
        db.query(MemorySession)
        .filter(
            MemorySession.id == memory_id,
            MemorySession.client_token_hash == client_token_hash,
            MemorySession.expires_at > now,
        )
        .first()
    )
    if not mem or not mem.strip_image_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory strip not found.",
        )

    file_path = get_memory_file_path(memory_id, mem.strip_image_path)
    if not file_path or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strip file not found on disk.",
        )

    media_type = "image/png" if file_path.suffix.lower() == ".png" else "image/jpeg"
    return FileResponse(file_path, media_type=media_type, filename=f"vintage-booth-strip-{memory_id[:8]}.png")


@router.get(
    "/{memory_id}/thumbnail",
    summary="Serve the WebP thumbnail for fast gallery rendering",
)
def get_memory_thumbnail(
    memory_id: str,
    client_token_hash: str = Depends(get_client_token_hash),
    db: Session = Depends(get_db),
):
    now = utcnow()
    mem = (
        db.query(MemorySession)
        .filter(
            MemorySession.id == memory_id,
            MemorySession.client_token_hash == client_token_hash,
            MemorySession.expires_at > now,
        )
        .first()
    )
    if not mem or not mem.strip_thumbnail_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thumbnail not found.",
        )

    file_path = get_memory_file_path(memory_id, mem.strip_thumbnail_path)
    if not file_path or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thumbnail file not found on disk.",
        )

    return FileResponse(file_path, media_type="image/webp")


@router.get(
    "/{memory_id}/photos/{photo_index}",
    summary="Serve an individual photo frame (1-4)",
)
def get_memory_photo(
    memory_id: str,
    photo_index: int,
    client_token_hash: str = Depends(get_client_token_hash),
    db: Session = Depends(get_db),
):
    now = utcnow()
    mem = (
        db.query(MemorySession)
        .filter(
            MemorySession.id == memory_id,
            MemorySession.client_token_hash == client_token_hash,
            MemorySession.expires_at > now,
        )
        .first()
    )
    if not mem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found.",
        )

    frame = (
        db.query(PhotoFrame)
        .filter(PhotoFrame.session_id == memory_id, PhotoFrame.photo_index == photo_index)
        .first()
    )
    if not frame or not frame.photo_image_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Photo #{photo_index} not found.",
        )

    file_path = get_memory_file_path(memory_id, frame.photo_image_path)
    if not file_path or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo file not found on disk.",
        )

    media_type = "image/png" if file_path.suffix.lower() == ".png" else "image/jpeg"
    return FileResponse(file_path, media_type=media_type, filename=f"photo-{photo_index}.png")


@router.get(
    "/{memory_id}/videos/{photo_index}",
    summary="Serve an individual Live Photo video clip (1-4)",
)
def get_memory_video(
    memory_id: str,
    photo_index: int,
    client_token_hash: str = Depends(get_client_token_hash),
    db: Session = Depends(get_db),
):
    now = utcnow()
    mem = (
        db.query(MemorySession)
        .filter(
            MemorySession.id == memory_id,
            MemorySession.client_token_hash == client_token_hash,
            MemorySession.expires_at > now,
        )
        .first()
    )
    if not mem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found.",
        )

    frame = (
        db.query(PhotoFrame)
        .filter(PhotoFrame.session_id == memory_id, PhotoFrame.photo_index == photo_index)
        .first()
    )
    if not frame or not frame.live_video_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Live video for photo #{photo_index} not found.",
        )

    file_path = get_memory_file_path(memory_id, frame.live_video_path)
    if not file_path or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video file not found on disk.",
        )

    media_type = "video/mp4" if file_path.suffix.lower() == ".mp4" else "video/webm"
    return FileResponse(file_path, media_type=media_type)


@router.get(
    "/{memory_id}/strip-video",
    summary="Serve the animated Live Photo strip video",
)
def get_memory_strip_video(
    memory_id: str,
    client_token_hash: str = Depends(get_client_token_hash),
    db: Session = Depends(get_db),
):
    now = utcnow()
    mem = (
        db.query(MemorySession)
        .filter(
            MemorySession.id == memory_id,
            MemorySession.client_token_hash == client_token_hash,
            MemorySession.expires_at > now,
        )
        .first()
    )
    if not mem or not mem.live_strip_video_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Live strip video not found.",
        )

    file_path = get_memory_file_path(memory_id, mem.live_strip_video_path)
    if not file_path or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video strip file not found on disk.",
        )

    media_type = "video/mp4" if file_path.suffix.lower() == ".mp4" else "video/webm"
    return FileResponse(file_path, media_type=media_type, filename="vintage-live-strip.mp4")


@router.delete(
    "/{memory_id}",
    response_model=DeleteResponse,
    summary="Permanently delete a memory and all its stored media files",
)
def delete_memory(
    memory_id: str,
    client_token_hash: str = Depends(get_client_token_hash),
    db: Session = Depends(get_db),
):
    mem = (
        db.query(MemorySession)
        .filter(
            MemorySession.id == memory_id,
            MemorySession.client_token_hash == client_token_hash,
        )
        .first()
    )
    if not mem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found.",
        )

    # 1. Delete all filesystem assets
    delete_memory_assets(memory_id)

    # 2. Delete database record (cascade deletes frames)
    db.delete(mem)
    db.commit()

    return DeleteResponse(status="deleted", id=memory_id)
