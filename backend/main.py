from fastapi import FastAPI, UploadFile, File, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from .models import DetectFrameResponse, BoundingBox, VideoInfoResponse
import cv2
import torch
import numpy as np
import base64
import datetime
import asyncio

app = FastAPI(title="People Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLOv5 model
model = torch.hub.load("ultralytics/yolov5", "yolov5s", pretrained=True)
model.classes = [0]  # only detect people

VIDEO_PATH = "backend/assets/videos/fight_0002.mp4"

# -------------------------
# Health check
# -------------------------
@app.get("/status")
def status():
    return {"status": "OK", "message": "People Detection API running"}

# -------------------------
# Get video info
# -------------------------
@app.get("/video-info", response_model=VideoInfoResponse)
def video_info():
    cap = cv2.VideoCapture(VIDEO_PATH)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0
    cap.release()
    return VideoInfoResponse(
        width=width, height=height, fps=fps, total_frames=total_frames, duration_seconds=duration
    )

# -------------------------
# Detect people in single frame
# -------------------------
@app.post("/detect-frame", response_model=DetectFrameResponse)
async def detect_frame(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    results = model(frame)
    detections = results.xyxy[0]  # x1, y1, x2, y2, conf, cls

    boxes = []
    people_count = 0
    for det in detections:
        x1, y1, x2, y2, conf, cls = det
        if int(cls) == 0 and float(conf) > 0.5:
            boxes.append(BoundingBox(
                x1=int(x1), y1=int(y1), x2=int(x2), y2=int(y2), confidence=float(conf)
            ))
            people_count += 1

    message = "Violence Detected ⚠️" if people_count > 4 else "All Clear ✅"
    return DetectFrameResponse(people_count=people_count, boxes=boxes, message=message)

# -------------------------
# WebSocket for live video feed
# -------------------------
@app.websocket("/ws/livefeed")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    cap = cv2.VideoCapture(VIDEO_PATH)

    while True:
        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        results = model(frame)
        detections = results.xyxy[0]
        people = [det for det in detections if int(det[5]) == 0]

        # Draw bounding boxes
        for det in people:
            x1, y1, x2, y2, conf, cls = det
            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)

        _, buffer = cv2.imencode(".jpg", frame)
        frame_bytes = base64.b64encode(buffer).decode("utf-8")

        now = datetime.datetime.now().strftime("%H:%M:%S")
        await ws.send_json({
            "time": now,
            "people_count": len(people),
            "frame": frame_bytes,
            "message": "Violence Detected ⚠️" if len(people) > 4 else "All Clear ✅"
        })

        await asyncio.sleep(0.05)

    cap.release()
