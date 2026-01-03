from pydantic import BaseModel
from typing import List

class BoundingBox(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int
    confidence: float

class DetectFrameResponse(BaseModel):
    people_count: int
    boxes: List[BoundingBox]
    message: str

class VideoInfoResponse(BaseModel):
    width: int
    height: int
    fps: float
    total_frames: int
    duration_seconds: float
