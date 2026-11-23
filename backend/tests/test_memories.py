import io
import json
import shutil
import tempfile
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models import MemorySession
from app.services.cleanup import cleanup_expired_memories
from app.services.storage import get_memory_file_path, save_memory_file

# Helper functions to create test media in memory
def create_test_image(width: int = 400, height: int = 300, color: str = "blue", fmt: str = "PNG") -> bytes:
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


def create_test_video() -> bytes:
    # Standard WebM EBML header prefix
    return b"\x1a\x45\xdf\xa3\x9f\x42\x86\x81\x01\x42\xf7\x81\x01" + b"\x00" * 256


@pytest.fixture(scope="function")
def test_env():
    # 1. Create a temporary directory for file storage
    temp_storage = tempfile.mkdtemp(prefix="pb_test_storage_")
    orig_storage = settings.STORAGE_DIR
    settings.STORAGE_DIR = temp_storage

    # 2. Create a temporary SQLite database
    db_fd, db_path = tempfile.mkstemp(prefix="pb_test_db_", suffix=".sqlite")
    test_db_url = f"sqlite:///{Path(db_path).as_posix()}"
    test_engine = create_engine(test_db_url, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with patch("app.main.MemoryCleanupWorker"):
        with TestClient(app) as client:
            yield {
                "client": client,
                "db_factory": TestingSessionLocal,
                "storage_dir": Path(temp_storage),
            }

    # Cleanup
    app.dependency_overrides.clear()
    import os
    try:
        os.close(db_fd)
        os.unlink(db_path)
    except Exception:
        pass
    shutil.rmtree(temp_storage, ignore_errors=True)
    settings.STORAGE_DIR = orig_storage


# 1. Health endpoint
def test_01_health_endpoint(test_env):
    client = test_env["client"]
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["app"] == "Vintage Booth API"
    assert "version" in data


# 2. Saving a memory with a strip and four photos
def test_02_save_memory_strip_and_four_photos(test_env):
    client = test_env["client"]
    token = str(uuid.uuid4())

    strip_bytes = create_test_image(600, 1800, color="#fffdd0")
    p1 = create_test_image(400, 300, color="red")
    p2 = create_test_image(400, 300, color="green")
    p3 = create_test_image(400, 300, color="blue")
    p4 = create_test_image(400, 300, color="yellow")

    metadata = {
        "caption": "SUMMER ADVENTURE 1974",
        "date_text": "JULY 4, 1974",
        "design_id": "classic_cream",
        "width_id": "wide",
        "capture_mode": "still",
    }

    files = [
        ("strip_image", ("strip.png", strip_bytes, "image/png")),
        ("photos", ("p1.png", p1, "image/png")),
        ("photos", ("p2.png", p2, "image/png")),
        ("photos", ("p3.png", p3, "image/png")),
        ("photos", ("p4.png", p4, "image/png")),
    ]

    resp = client.post(
        "/api/memories",
        headers={"X-Client-Token": token},
        data={"metadata": json.dumps(metadata)},
        files=files,
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert "id" in data
    assert data["caption"] == "SUMMER ADVENTURE 1974"
    assert data["design_id"] == "classic_cream"
    assert data["thumbnail_url"].startswith(f"/api/memories/{data['id']}/thumbnail")
    assert data["strip_url"].startswith(f"/api/memories/{data['id']}/strip")

    # Verify files created on disk
    mem_dir = test_env["storage_dir"] / data["id"]
    assert mem_dir.is_dir()
    assert any(p.name.startswith("strip_") and p.suffix == ".png" for p in mem_dir.iterdir())
    assert any(p.name.startswith("thumb_") and p.suffix == ".webp" for p in mem_dir.iterdir())
    photos_dir = mem_dir / "photos"
    assert photos_dir.is_dir()
    assert len(list(photos_dir.iterdir())) == 4


# 3. Saving a memory with optional video assets
def test_03_save_memory_with_video_assets(test_env):
    client = test_env["client"]
    token = str(uuid.uuid4())

    strip_bytes = create_test_image(600, 1800, color="black")
    photos = [create_test_image(400, 300, color="purple") for _ in range(4)]
    clips = [create_test_video() for _ in range(4)]
    strip_video = create_test_video()

    files = [("strip_image", ("strip.png", strip_bytes, "image/png"))]
    for i, p in enumerate(photos):
        files.append(("photos", (f"p{i+1}.png", p, "image/png")))
    for i, c in enumerate(clips):
        files.append(("live_clips", (f"clip{i+1}.webm", c, "video/webm")))
    files.append(("live_strip_video", ("animated_strip.webm", strip_video, "video/webm")))

    resp = client.post(
        "/api/memories",
        headers={"X-Client-Token": token},
        data={"capture_mode": "live", "design_id": "polka_dots"},
        files=files,
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["capture_mode"] == "live"
    mem_id = data["id"]

    # Verify detail endpoint reflects videos
    detail_resp = client.get(f"/api/memories/{mem_id}", headers={"X-Client-Token": token})
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()
    assert detail_data["live_strip_video_url"] == f"/api/memories/{mem_id}/strip-video"
    assert len(detail_data["frames"]) == 4
    for frame in detail_data["frames"]:
        assert frame["live_video_url"] is not None

    # Fetch strip video
    sv_resp = client.get(f"/api/memories/{mem_id}/strip-video", headers={"X-Client-Token": token})
    assert sv_resp.status_code == 200


# 4. Listing memories for the correct browser token
def test_04_list_memories_scoped_to_token(test_env):
    client = test_env["client"]
    token_a = str(uuid.uuid4())
    token_b = str(uuid.uuid4())

    strip_bytes = create_test_image(600, 1800)
    photos = [create_test_image(400, 300) for _ in range(4)]

    def make_upload_files():
        return [
            ("strip_image", ("strip.png", strip_bytes, "image/png")),
            ("photos", ("p1.png", photos[0], "image/png")),
            ("photos", ("p2.png", photos[1], "image/png")),
            ("photos", ("p3.png", photos[2], "image/png")),
            ("photos", ("p4.png", photos[3], "image/png")),
        ]

    # Create 2 memories for token A
    client.post(
        "/api/memories",
        headers={"X-Client-Token": token_a},
        data={"caption": "MEMORY 1"},
        files=make_upload_files(),
    )
    client.post(
        "/api/memories",
        headers={"X-Client-Token": token_a},
        data={"caption": "MEMORY 2"},
        files=make_upload_files(),
    )

    # Create 1 memory for token B
    client.post(
        "/api/memories",
        headers={"X-Client-Token": token_b},
        data={"caption": "TOKEN B MEMORY"},
        files=make_upload_files(),
    )

    # Token A list
    res_a = client.get("/api/memories", headers={"X-Client-Token": token_a})
    assert res_a.status_code == 200
    list_a = res_a.json()
    assert len(list_a) == 2
    assert list_a[0]["caption"] == "MEMORY 2"  # Newest first

    # Token B list
    res_b = client.get("/api/memories", headers={"X-Client-Token": token_b})
    assert res_b.status_code == 200
    list_b = res_b.json()
    assert len(list_b) == 1
    assert list_b[0]["caption"] == "TOKEN B MEMORY"


# 5. Confirming a different token cannot view or delete those memories (returns 404)
def test_05_privacy_and_isolation_between_tokens(test_env):
    client = test_env["client"]
    token_owner = str(uuid.uuid4())
    token_stranger = str(uuid.uuid4())

    strip_bytes = create_test_image(600, 1800)
    photos = [create_test_image(400, 300) for _ in range(4)]
    files = [
        ("strip_image", ("strip.png", strip_bytes, "image/png")),
        ("photos", ("p1.png", photos[0], "image/png")),
        ("photos", ("p2.png", photos[1], "image/png")),
        ("photos", ("p3.png", photos[2], "image/png")),
        ("photos", ("p4.png", photos[3], "image/png")),
    ]

    create_resp = client.post(
        "/api/memories",
        headers={"X-Client-Token": token_owner},
        data={"caption": "SECRET PRIVATE MEMORY"},
        files=files,
    )
    mem_id = create_resp.json()["id"]

    # Stranger tries GET /api/memories/{id} -> 404
    resp_get = client.get(f"/api/memories/{mem_id}", headers={"X-Client-Token": token_stranger})
    assert resp_get.status_code == 404

    # Stranger tries GET /api/memories/{id}/strip -> 404
    resp_strip = client.get(f"/api/memories/{mem_id}/strip", headers={"X-Client-Token": token_stranger})
    assert resp_strip.status_code == 404

    # Stranger tries DELETE /api/memories/{id} -> 404
    resp_del = client.delete(f"/api/memories/{mem_id}", headers={"X-Client-Token": token_stranger})
    assert resp_del.status_code == 404

    # Owner can still view it
    owner_get = client.get(f"/api/memories/{mem_id}", headers={"X-Client-Token": token_owner})
    assert owner_get.status_code == 200


# 6. Retrieving a saved strip and thumbnail
def test_06_retrieve_strip_and_thumbnail(test_env):
    client = test_env["client"]
    token = str(uuid.uuid4())

    strip_bytes = create_test_image(600, 1800, color="orange")
    photos = [create_test_image(400, 300) for _ in range(4)]
    files = [
        ("strip_image", ("strip.png", strip_bytes, "image/png")),
        ("photos", ("p1.png", photos[0], "image/png")),
        ("photos", ("p2.png", photos[1], "image/png")),
        ("photos", ("p3.png", photos[2], "image/png")),
        ("photos", ("p4.png", photos[3], "image/png")),
    ]

    create_resp = client.post(
        "/api/memories",
        headers={"X-Client-Token": token},
        files=files,
    )
    mem_id = create_resp.json()["id"]

    # Retrieve strip
    strip_resp = client.get(f"/api/memories/{mem_id}/strip", headers={"X-Client-Token": token})
    assert strip_resp.status_code == 200
    assert strip_resp.headers["content-type"] in ("image/png", "image/jpeg")
    assert len(strip_resp.content) == len(strip_bytes)

    # Retrieve thumbnail
    thumb_resp = client.get(f"/api/memories/{mem_id}/thumbnail", headers={"X-Client-Token": token})
    assert thumb_resp.status_code == 200
    assert thumb_resp.headers["content-type"] == "image/webp"

    # Verify thumbnail is a valid WebP approximately 240px wide
    with Image.open(io.BytesIO(thumb_resp.content)) as thumb_img:
        assert thumb_img.format == "WEBP"
        assert thumb_img.width == 240


# 7. Manually deleting a memory and checking that its files are removed
def test_07_manual_delete_and_file_purge(test_env):
    client = test_env["client"]
    token = str(uuid.uuid4())

    strip_bytes = create_test_image(600, 1800)
    photos = [create_test_image(400, 300) for _ in range(4)]
    files = [
        ("strip_image", ("strip.png", strip_bytes, "image/png")),
        ("photos", ("p1.png", photos[0], "image/png")),
        ("photos", ("p2.png", photos[1], "image/png")),
        ("photos", ("p3.png", photos[2], "image/png")),
        ("photos", ("p4.png", photos[3], "image/png")),
    ]

    create_resp = client.post(
        "/api/memories",
        headers={"X-Client-Token": token},
        files=files,
    )
    mem_id = create_resp.json()["id"]

    mem_dir = test_env["storage_dir"] / mem_id
    assert mem_dir.exists()

    # Delete
    del_resp = client.delete(f"/api/memories/{mem_id}", headers={"X-Client-Token": token})
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "deleted"

    # Filesystem check: folder must be gone
    assert not mem_dir.exists()

    # GET should return 404 now
    assert client.get(f"/api/memories/{mem_id}", headers={"X-Client-Token": token}).status_code == 404


# 8. Rejecting invalid image uploads
def test_08_reject_invalid_image_uploads(test_env):
    client = test_env["client"]
    token = str(uuid.uuid4())

    valid_strip = create_test_image(600, 1800)
    valid_photo = create_test_image(400, 300)
    corrupted_bytes = b"NOT_AN_IMAGE_FILE_RANDOM_TEXT_DATA"

    # A: Corrupted strip
    files_a = [
        ("strip_image", ("strip.png", corrupted_bytes, "image/png")),
        ("photos", ("p1.png", valid_photo, "image/png")),
        ("photos", ("p2.png", valid_photo, "image/png")),
        ("photos", ("p3.png", valid_photo, "image/png")),
        ("photos", ("p4.png", valid_photo, "image/png")),
    ]
    resp_a = client.post("/api/memories", headers={"X-Client-Token": token}, files=files_a)
    assert resp_a.status_code == 400
    assert "Invalid photo strip image" in resp_a.json()["detail"]

    # B: Wrong photo count (only 3 photos)
    files_b = [
        ("strip_image", ("strip.png", valid_strip, "image/png")),
        ("photos", ("p1.png", valid_photo, "image/png")),
        ("photos", ("p2.png", valid_photo, "image/png")),
        ("photos", ("p3.png", valid_photo, "image/png")),
    ]
    resp_b = client.post("/api/memories", headers={"X-Client-Token": token}, files=files_b)
    assert resp_b.status_code == 400
    assert "Expected exactly 4" in resp_b.json()["detail"]

    # C: Missing X-Client-Token
    files_c = [
        ("strip_image", ("strip.png", valid_strip, "image/png")),
        ("photos", ("p1.png", valid_photo, "image/png")),
        ("photos", ("p2.png", valid_photo, "image/png")),
        ("photos", ("p3.png", valid_photo, "image/png")),
        ("photos", ("p4.png", valid_photo, "image/png")),
    ]
    resp_c = client.post("/api/memories", files=files_c)
    assert resp_c.status_code == 400
    assert "Missing required X-Client-Token header" in resp_c.json()["detail"]

    # D: Invalid UUID token
    resp_d = client.post("/api/memories", headers={"X-Client-Token": "not-a-valid-uuid"}, files=files_c)
    assert resp_d.status_code == 400
    assert "must be a valid UUID" in resp_d.json()["detail"]


# 9. Expired memory cleanup
def test_09_expired_memory_cleanup(test_env):
    db_factory = test_env["db_factory"]
    storage_dir = test_env["storage_dir"]

    # Create an expired memory and an active memory in database
    now = datetime.now(timezone.utc)
    expired_id = str(uuid.uuid4())
    active_id = str(uuid.uuid4())

    with db_factory() as db:
        # Expired memory (expired 2 hours ago)
        mem_expired = MemorySession(
            id=expired_id,
            client_token_hash="fake_hash_1",
            created_at=now - timedelta(days=8),
            expires_at=now - timedelta(hours=2),
            caption="EXPIRED MEMORY",
        )
        # Active memory (expires in 6 days)
        mem_active = MemorySession(
            id=active_id,
            client_token_hash="fake_hash_2",
            created_at=now,
            expires_at=now + timedelta(days=6),
            caption="ACTIVE MEMORY",
        )
        db.add(mem_expired)
        db.add(mem_active)
        db.commit()

    # Create directories for both on disk
    save_memory_file(expired_id, "strip.png", b"test_strip_expired", custom_storage_dir=storage_dir)
    save_memory_file(active_id, "strip.png", b"test_strip_active", custom_storage_dir=storage_dir)

    assert (storage_dir / expired_id).exists()
    assert (storage_dir / active_id).exists()

    # Run cleanup
    with db_factory() as db:
        pruned_count = cleanup_expired_memories(db, custom_storage_dir=storage_dir)
        assert pruned_count == 1

        # Expired record gone, active record remains
        assert db.query(MemorySession).filter(MemorySession.id == expired_id).first() is None
        assert db.query(MemorySession).filter(MemorySession.id == active_id).first() is not None

    # Filesystem check: expired dir deleted, active dir remains
    assert not (storage_dir / expired_id).exists()
    assert (storage_dir / active_id).exists()


# 10. Handling partial upload failures without leaving orphaned files or incomplete database records
def test_10_partial_upload_failure_cleanup(test_env):
    client = test_env["client"]
    token = str(uuid.uuid4())

    strip_bytes = create_test_image(600, 1800)
    photos = [create_test_image(400, 300) for _ in range(4)]
    files = [
        ("strip_image", ("strip.png", strip_bytes, "image/png")),
        ("photos", ("p1.png", photos[0], "image/png")),
        ("photos", ("p2.png", photos[1], "image/png")),
        ("photos", ("p3.png", photos[2], "image/png")),
        ("photos", ("p4.png", photos[3], "image/png")),
    ]

    # Force an error during the DB commit phase after files have been partially written
    with patch("app.api.memories.Session.commit", side_effect=RuntimeError("Simulated database disk error")):
        resp = client.post(
            "/api/memories",
            headers={"X-Client-Token": token},
            files=files,
        )
        assert resp.status_code == 500

    # Ensure no directories were orphaned inside test_env["storage_dir"]
    storage_subdirs = [p for p in test_env["storage_dir"].iterdir() if p.is_dir()]
    assert len(storage_subdirs) == 0

    # Ensure no database record was saved
    with test_env["db_factory"]() as db:
        records = db.query(MemorySession).all()
        assert len(records) == 0
