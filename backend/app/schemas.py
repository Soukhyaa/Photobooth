from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class HealthResponse(BaseModel):
    status: str
    app: str
    version: str


class MemoryCreateMetadata(BaseModel):
    caption: Optional[str] = None
    date_text: Optional[str] = None
    design_id: str = "classic_cream"
    solid_color_id: Optional[str] = None
    width_id: str = "wide"
    filter_id: Optional[str] = None
    capture_mode: str = "still"


class PhotoFrameResponse(BaseModel):
    photo_index: int
    photo_url: str
    live_video_url: Optional[str] = None
    duration: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)


class MemorySessionSummary(BaseModel):
    id: str
    created_at: datetime
    expires_at: datetime
    caption: Optional[str] = None
    date_text: Optional[str] = None
    design_id: str
    solid_color_id: Optional[str] = None
    width_id: str
    filter_id: Optional[str] = None
    capture_mode: str
    thumbnail_url: str
    strip_url: str
    model_config = ConfigDict(from_attributes=True)


class MemorySessionDetail(MemorySessionSummary):
    live_strip_video_url: Optional[str] = None
    frames: List[PhotoFrameResponse] = []
    model_config = ConfigDict(from_attributes=True)


class DeleteResponse(BaseModel):
    status: str
    id: str
