import os
import shutil
import uuid
from pathlib import Path
from typing import Optional

from app.config import settings


def get_storage_base(custom_storage_dir: Optional[Path] = None) -> Path:
    """Return the absolute, resolved storage root directory."""
    base = custom_storage_dir or Path(settings.STORAGE_DIR)
    resolved = base.resolve()
    resolved.mkdir(parents=True, exist_ok=True)
    return resolved


def validate_uuid_str(val: str) -> str:
    """Ensure a string is a valid UUID to prevent path traversal via identifiers."""
    try:
        parsed = uuid.UUID(str(val).strip())
        return str(parsed)
    except (ValueError, AttributeError):
        raise ValueError(f"Invalid UUID identifier: '{val}'")


def get_memory_dir(memory_id: str, custom_storage_dir: Optional[Path] = None) -> Path:
    """Return the resolved directory path for a specific memory, preventing path traversal."""
    safe_id = validate_uuid_str(memory_id)
    base = get_storage_base(custom_storage_dir)
    mem_dir = (base / safe_id).resolve()
    if not mem_dir.is_relative_to(base):
        raise ValueError("Path traversal attempt detected in memory identifier.")
    mem_dir.mkdir(parents=True, exist_ok=True)
    return mem_dir


def save_memory_file(
    memory_id: str,
    subpath: str,
    content: bytes,
    custom_storage_dir: Optional[Path] = None,
) -> str:
    """
    Save binary content into the memory's directory under the given subpath.
    Guarantees no path traversal outside the memory's designated folder.
    Returns the relative subpath string from the storage base.
    """
    mem_dir = get_memory_dir(memory_id, custom_storage_dir)
    target_path = (mem_dir / subpath).resolve()

    if not target_path.is_relative_to(mem_dir):
        raise ValueError(f"Path traversal detected for subpath '{subpath}'")

    target_path.parent.mkdir(parents=True, exist_ok=True)

    # Write to a temporary file in the same directory then replace atomically
    temp_path = target_path.with_suffix(target_path.suffix + f".tmp_{uuid.uuid4().hex[:8]}")
    with open(temp_path, "wb") as f:
        f.write(content)
    temp_path.replace(target_path)

    # Return normalized relative path with forward slashes
    rel_path = target_path.relative_to(get_storage_base(custom_storage_dir)).as_posix()
    return rel_path


def get_memory_file_path(
    memory_id: str,
    path_or_subpath: str,
    custom_storage_dir: Optional[Path] = None,
) -> Optional[Path]:
    """
    Locate and return the Path to an existing asset, or None if it doesn't exist.
    Handles both relative paths starting with memory_id/ and subpaths inside memory_dir.
    Prevents path traversal.
    """
    try:
        safe_id = validate_uuid_str(memory_id)
        mem_dir = get_memory_dir(safe_id, custom_storage_dir)

        # Normalize forward/backslashes
        norm = path_or_subpath.replace("\\", "/").strip("/")
        if norm.startswith(f"{safe_id}/"):
            norm = norm[len(safe_id) + 1 :]

        target_path = (mem_dir / norm).resolve()
        if not target_path.is_relative_to(mem_dir):
            return None
        if target_path.is_file():
            return target_path
        return None
    except Exception:
        return None


def delete_memory_assets(
    memory_id: str,
    custom_storage_dir: Optional[Path] = None,
) -> bool:
    """
    Safely delete all stored media files and the memory directory.
    Returns True if deleted or did not exist.
    """
    try:
        safe_id = validate_uuid_str(memory_id)
        base = get_storage_base(custom_storage_dir)
        mem_dir = (base / safe_id).resolve()
        if not mem_dir.is_relative_to(base):
            return False
        if mem_dir.exists() and mem_dir.is_dir():
            shutil.rmtree(mem_dir, ignore_errors=True)
        return True
    except Exception:
        return False


def cleanup_memory_dir(
    memory_id: str,
    custom_storage_dir: Optional[Path] = None,
) -> None:
    """Helper alias used on partial upload failures."""
    delete_memory_assets(memory_id, custom_storage_dir)
