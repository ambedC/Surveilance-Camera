from fastapi import FastAPI, UploadFile, File, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from .models import DetectFrameResponse, BoundingBox, VideoInfoResponse

import cv2
import numpy as np
import base64
import datetime
import asyncio
import os
import math
import time

# IMPORTANT: Use YOLOv8 loader
from ultralytics import YOLO

app = FastAPI(title="Threat Detection API")

app.add_middleware(
CORSMiddleware,
allow_origins=["*"],
allow_methods=["*"],
allow_headers=["*"],
)

# -------------------------
# Paths
# -------------------------

MODEL_PATH = os.path.join("backend", "yolo_model", "best.pt")
VIDEO_PATH = os.path.join("backend", "assets", "videos", "fight_0002.mp4")

# -------------------------
# Load YOLOv8 model
# -------------------------

def load_custom_model(path: str):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model file not found: {path}")
    model = YOLO(path)
    print(f"Loaded custom YOLOv8 model from {path}")
    return model

model = load_custom_model(MODEL_PATH)

# -------------------------
# Class mapping
# -------------------------

names = model.names

weapon_keywords = {"knife", "gun", "pistol", "rifle", "firearm"}
animal_keywords = {"dog", "cat", "horse", "sheep", "cow", "bird", "bear", "elephant", "tiger", "leopard"}

person_classes = []
weapon_classes = []
animal_classes = []

for idx, name in names.items():
    lname = name.lower()
    
    if "person" in lname:
        person_classes.append(idx)
    
    if any(w in lname for w in weapon_keywords):
        weapon_classes.append(idx)
    
    if any(a in lname for a in animal_keywords):
        animal_classes.append(idx)

print("Class mapping summary:")
print("Persons:", person_classes)
print("Weapons:", weapon_classes)
print("Animals:", animal_classes)

# -------------------------
# Fight detection helper functions
# -------------------------

class OverlapTracker:
    """Tracks overlap duration between pairs of people"""
    def __init__(self):
        self.overlap_times = {}  # key: (i, j), value: start_time
        self.last_fight_time = None  # Track when last fight was detected
        self.fight_cooldown = 0.3  # Keep fight flagged for 0.3 seconds after detection
    
    def start_overlap(self, i, j):
        """Start tracking overlap for a pair"""
        key = (min(i, j), max(i, j))
        if key not in self.overlap_times:
            self.overlap_times[key] = time.time()
    
    def get_overlap_duration(self, i, j):
        """Get overlap duration in seconds"""
        key = (min(i, j), max(i, j))
        if key in self.overlap_times:
            return time.time() - self.overlap_times[key]
        return 0.0
    
    def end_overlap(self, i, j):
        """End tracking overlap for a pair"""
        key = (min(i, j), max(i, j))
        if key in self.overlap_times:
            del self.overlap_times[key]
    
    def mark_fight_detected(self):
        """Mark that a fight was just detected"""
        self.last_fight_time = time.time()
    
    def is_in_fight_cooldown(self):
        """Check if we're still in fight cooldown period"""
        if self.last_fight_time is None:
            return False
        time_since_fight = time.time() - self.last_fight_time
        return time_since_fight < self.fight_cooldown
    
    def clear(self):
        """Clear all tracked overlaps"""
        self.overlap_times.clear()
        self.last_fight_time = None

def calculate_box_center(box):
    """Calculate center point of bounding box"""
    x1, y1, x2, y2 = box
    return ((x1 + x2) / 2, (y1 + y2) / 2)

def calculate_movement_distance(prev_box, curr_box):
    """Calculate movement distance between two bounding boxes"""
    if prev_box is None:
        return 0.0
    
    prev_center = calculate_box_center(prev_box)
    curr_center = calculate_box_center(curr_box)
    
    distance = math.sqrt((curr_center[0] - prev_center[0])**2 + 
                        (curr_center[1] - prev_center[1])**2)
    return distance

def check_fight_with_movement(person_dets, prev_person_boxes, overlap_tracker, 
                             movement_threshold=25, min_overlap_duration=0.5):
    """
    Fight detection based on:
    1. Bounding boxes overlap for SUSTAINED duration (> 0.5 seconds)
    2. Fast, aggressive movement from both persons (> 25 pixels per frame)
    
    This avoids false positives from:
    - Walking by (brief overlap, directional movement)
    - Hugs (slow movement despite long overlap)
    - Handshakes (brief but slow/deliberate movement)
    
    Args:
        person_dets: List of current person bounding boxes
        prev_person_boxes: List of previous frame person bounding boxes
        overlap_tracker: OverlapTracker instance
        movement_threshold: Minimum pixels moved per frame (default 25 - fighting intensity)
        min_overlap_duration: Minimum seconds of overlap before checking fight (default 0.5)
    """
    fighting = False
    current_overlaps = set()
    
    if len(person_dets) >= 2:
        for i in range(len(person_dets)):
            for j in range(i + 1, len(person_dets)):
                x1a, y1a, x2a, y2a = person_dets[i]
                x1b, y1b, x2b, y2b = person_dets[j]
                
                # Check if bounding boxes overlap
                boxes_overlap = x1a < x2b and x2a > x1b and y1a < y2b and y2a > y1b
                pair_key = (min(i, j), max(i, j))
                
                if boxes_overlap:
                    current_overlaps.add(pair_key)
                    
                    # Start tracking if not already tracking
                    if pair_key not in overlap_tracker.overlap_times:
                        overlap_tracker.start_overlap(i, j)
                    
                    # Get overlap duration
                    overlap_duration = overlap_tracker.get_overlap_duration(i, j)
                    
                    # Only consider fight if overlap is sustained (not just walking by)
                    if overlap_duration >= min_overlap_duration:
                        # Calculate movement for both persons
                        prev_box_i = prev_person_boxes[i] if i < len(prev_person_boxes) else None
                        prev_box_j = prev_person_boxes[j] if j < len(prev_person_boxes) else None
                        
                        movement_i = calculate_movement_distance(prev_box_i, person_dets[i])
                        movement_j = calculate_movement_distance(prev_box_j, person_dets[j])
                        
                        # Fight only if both persons have fast, aggressive movement
                        if movement_i > movement_threshold and movement_j > movement_threshold:
                            fighting = True
                            overlap_tracker.mark_fight_detected()
                            break
            
            if fighting:
                break
    
    # If not currently detecting fight conditions, check if still in cooldown
    if not fighting and overlap_tracker.is_in_fight_cooldown():
        fighting = True
    
    # End tracking for overlaps that are no longer happening
    overlaps_to_remove = []
    for pair_key in overlap_tracker.overlap_times:
        if pair_key not in current_overlaps:
            overlaps_to_remove.append(pair_key)
    
    for pair_key in overlaps_to_remove:
        overlap_tracker.end_overlap(pair_key[0], pair_key[1])
    
    return fighting

# -------------------------
# Health check
# -------------------------

@app.get("/status")
def status():
    return {"status": "OK", "message": "Threat Detection API running"}

# -------------------------
# Video info
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
        width=width,
        height=height,
        fps=fps,
        total_frames=total_frames,
        duration_seconds=duration
    )

# -------------------------
# Detect frame
# -------------------------

@app.post("/detect-frame", response_model=DetectFrameResponse)
async def detect_frame(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    results = model(frame)[0]

    boxes = []
    people_count = 0
    weapon_count = 0
    animal_count = 0
    person_boxes = []

    for box in results.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        conf = float(box.conf[0])
        cls = int(box.cls[0])

        if conf < 0.3:
            continue

        if cls in person_classes or cls in weapon_classes or cls in animal_classes:
            boxes.append(
                BoundingBox(
                    x1=x1,
                    y1=y1,
                    x2=x2,
                    y2=y2,
                    confidence=conf
                )
            )

        if cls in person_classes:
            people_count += 1
            person_boxes.append((x1, y1, x2, y2))

        if cls in weapon_classes:
            weapon_count += 1

        if cls in animal_classes:
            animal_count += 1

    # fight detection (bounding box overlap)
    fighting = False

    if len(person_boxes) >= 2:
        for i in range(len(person_boxes)):
            for j in range(i + 1, len(person_boxes)):
                x1a, y1a, x2a, y2a = person_boxes[i]
                x1b, y1b, x2b, y2b = person_boxes[j]
                
                # Check if bounding boxes overlap
                if x1a < x2b and x2a > x1b and y1a < y2b and y2a > y1b:
                    fighting = True
                    break
            if fighting:
                break

    # message logic
    if fighting:
        message = "Fight Detected ⚠️"
    elif weapon_count > 0:
        message = f"Weapon Detected ({weapon_count}) ⚠️"
    elif animal_count > 0:
        message = f"Animal Detected ({animal_count})"
    else:
        message = "All Clear ✅"

    return DetectFrameResponse(
        people_count=people_count,
        boxes=boxes,
        message=message
    )

# -------------------------
# WebSocket live feed
# -------------------------

@app.websocket("/ws/livefeed")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    cap = cv2.VideoCapture(VIDEO_PATH)
    prev_gray = None
    prev_person_boxes = []
    overlap_tracker = OverlapTracker()
    
    movement_threshold = 25  # Higher threshold - walking is ~15-20, fighting is 25+
    min_overlap_duration = 0.5  # Must overlap for at least 0.5 seconds (not just walking by)

    while True:
        ret, frame = cap.read()

        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            prev_gray = None
            prev_person_boxes = []
            overlap_tracker.clear()
            continue

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        if prev_gray is None:
            frame_diff = np.zeros_like(gray)
        else:
            frame_diff = cv2.absdiff(prev_gray, gray)

        prev_gray = gray

        results = model(frame)[0]

        person_dets = []
        weapon_count = 0
        animal_count = 0

        for box in results.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            conf = float(box.conf[0])
            cls = int(box.cls[0])

            if conf < 0.25:
                continue

            if cls in person_classes:
                person_dets.append((x1, y1, x2, y2))
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

            elif cls in weapon_classes:
                weapon_count += 1
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)

            elif cls in animal_classes:
                animal_count += 1
                cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 128, 0), 2)

        # Fight detection: sustained overlap + aggressive movement
        fighting = check_fight_with_movement(
            person_dets, 
            prev_person_boxes, 
            overlap_tracker,
            movement_threshold=movement_threshold,
            min_overlap_duration=min_overlap_duration
        )

        if fighting:
            cv2.putText(
                frame,
                "FIGHT DETECTED",
                (50, 50),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0, 0, 255),
                3
            )

        # Update previous positions for next frame
        prev_person_boxes = person_dets.copy()

        _, buffer = cv2.imencode(".jpg", frame)
        frame_bytes = base64.b64encode(buffer).decode("utf-8")

        await ws.send_json({
            "people_count": len(person_dets),
            "weapon_count": weapon_count,
            "animal_count": animal_count,
            "fighting": fighting,
            "frame": frame_bytes
        })

        await asyncio.sleep(0.05)

    cap.release()

# -------------------------
# WebSocket webcam feed
# -------------------------

@app.websocket("/ws/webcam")
async def websocket_webcam(ws: WebSocket):
    await ws.accept()
    cap = cv2.VideoCapture(0)  # 0 = default webcam
    
    # Set resolution for better performance
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    prev_gray = None
    prev_person_boxes = []
    overlap_tracker = OverlapTracker()
    
    movement_threshold = 25  # Higher threshold - walking is ~15-20, fighting is 25+
    min_overlap_duration = 0.5  # Must overlap for at least 0.5 seconds (not just walking by)

    while True:
        ret, frame = cap.read()

        if not ret:
            await ws.send_json({"error": "Cannot read from webcam"})
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        if prev_gray is None:
            frame_diff = np.zeros_like(gray)
        else:
            frame_diff = cv2.absdiff(prev_gray, gray)

        prev_gray = gray

        results = model(frame)[0]

        person_dets = []
        weapon_count = 0
        animal_count = 0

        for box in results.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            conf = float(box.conf[0])
            cls = int(box.cls[0])

            if conf < 0.25:
                continue

            if cls in person_classes:
                person_dets.append((x1, y1, x2, y2))
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

            elif cls in weapon_classes:
                weapon_count += 1
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)

            elif cls in animal_classes:
                animal_count += 1
                cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 128, 0), 2)

        # Fight detection: sustained overlap + aggressive movement
        fighting = check_fight_with_movement(
            person_dets, 
            prev_person_boxes, 
            overlap_tracker,
            movement_threshold=movement_threshold,
            min_overlap_duration=min_overlap_duration
        )

        if fighting:
            cv2.putText(
                frame,
                "FIGHT DETECTED",
                (50, 50),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0, 0, 255),
                3
            )

        # Update previous positions for next frame
        prev_person_boxes = person_dets.copy()

        _, buffer = cv2.imencode(".jpg", frame)
        frame_bytes = base64.b64encode(buffer).decode("utf-8")

        await ws.send_json({
            "people_count": len(person_dets),
            "weapon_count": weapon_count,
            "animal_count": animal_count,
            "fighting": fighting,
            "frame": frame_bytes
        })

        await asyncio.sleep(0.03)  # ~30 FPS for webcam

    cap.release()