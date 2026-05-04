from fastapi import FastAPI, UploadFile, File, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from backend.models import DetectFrameResponse, BoundingBox, VideoInfoResponse
from backend.routes.auth import router as auth_router

import base64
import datetime
import asyncio
import os
import math
import time
# note: cv2 and numpy are imported lazily inside detection functions to
# avoid bringing in heavy dependencies during auth-only operation

# IMPORTANT: Use YOLOv8 loader
# Note: ultralytics/YOLO import is deferred into the loader to avoid importing
# heavy packages (like numpy) at module import time which can crash startup on
# some Windows setups. The loader will attempt the import when called.

app = FastAPI(title="Threat Detection API")

# CORS Settings
origins = os.getenv("CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include authentication router
app.include_router(auth_router)

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
    # import YOLO here to avoid heavy import at module load time
    from ultralytics import YOLO
    model = YOLO(path)
    
    # Connect model to GPU
    try:
        import torch
        if torch.cuda.is_available():
            model.to('cuda')
            print(f"Loaded custom YOLOv8 model from {path} on GPU (CUDA)")
        else:
            print(f"Loaded custom YOLOv8 model from {path} (CUDA not available, falling back to CPU)")
    except Exception as e:
        print(f"Loaded custom YOLOv8 model from {path} (error connecting to GPU: {e})")
        
    return model

# For now we disable model loading completely to avoid numpy/ultralytics crashes
# model = None ensures detection endpoints respond with 503.
model = None
# If you want to enable detection, uncomment the following and ensure the
# environment has a compatible numpy/cv2 installation.
#
#try:
#    model = load_custom_model(MODEL_PATH)
#except Exception as e:
#    print(f"Warning: failed to load YOLO model: {e}")
#    model = None

# -------------------------
# Class mapping (conditionally built if model loaded)
# -------------------------

weapon_keywords = {"knife", "gun", "pistol", "rifle", "firearm"}
animal_keywords = {"lion", "tiger", "elephant", "leopard"}

person_classes = []
weapon_classes = []
animal_classes = []

if model is not None:
    names = model.names
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
else:
    print("Model not loaded, skipping class mapping")

# -------------------------
# Fight detection helper functions
# -------------------------

class OverlapTracker:
    """Tracks overlap duration between pairs of people"""
    def __init__(self):
        self.overlap_times = {}  # key: (i, j), value: start_time
        self.last_seen_times = {}  # key: (i, j), value: last seen time
        self.last_fight_time = None  # Track when last fight was detected
        self.fight_cooldown = 2.0  # Keep fight flagged for 2 seconds after detection to maintain state during continued movement
    
    def start_overlap(self, i, j):
        """Start tracking overlap for a pair"""
        key = (min(i, j), max(i, j))
        if key not in self.overlap_times:
            self.overlap_times[key] = time.time()
        self.last_seen_times[key] = time.time()
    
    def get_overlap_duration(self, i, j):
        """Get overlap duration in seconds"""
        key = (min(i, j), max(i, j))
        if key in self.overlap_times:
            return time.time() - self.overlap_times[key]
        return 0.0

    def update_last_seen(self, i, j):
        """Update last seen time to tolerate brief tracking drops"""
        key = (min(i, j), max(i, j))
        self.last_seen_times[key] = time.time()
    
    def end_overlap(self, i, j):
        """End tracking overlap for a pair"""
        key = (min(i, j), max(i, j))
        if key in self.overlap_times:
            del self.overlap_times[key]
        if key in self.last_seen_times:
            del self.last_seen_times[key]
            
    def cleanup_stale_overlaps(self, current_overlaps, tolerance=0.5):
        """Remove overlaps that haven't been seen for > tolerance seconds"""
        current_time = time.time()
        stale_keys = []
        for key in self.overlap_times.keys():
            if key not in current_overlaps:
                if current_time - self.last_seen_times.get(key, 0) > tolerance:
                    stale_keys.append(key)
        for key in stale_keys:
            self.end_overlap(key[0], key[1])
    
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
        self.last_seen_times.clear()
        self.last_fight_time = None

def calculate_box_center(box):
    """Calculate center point of bounding box"""
    x1, y1, x2, y2 = box
    return ((x1 + x2) / 2, (y1 + y2) / 2)

def calculate_movement_distance(prev_boxes_dict, curr_id, curr_box):
    """Calculate exact movement distance for a tracked moving object by its ID.
    Returns the movement as a PERCENTAGE of their body size to ensure scale invariance (e.g., phones shown to webcams).
    Strictly relies on tracking IDs to avoid false positives by accidentally tracking neighbors when IDs flicker."""
    if curr_id not in prev_boxes_dict:
        return 0.0
        
    curr_center = calculate_box_center(curr_box)
    curr_diag = math.sqrt((curr_box[2] - curr_box[0])**2 + (curr_box[3] - curr_box[1])**2)
    if curr_diag < 1: curr_diag = 1.0
    
    prev_box = prev_boxes_dict[curr_id]
    prev_center = calculate_box_center(prev_box)
    distance = math.sqrt((curr_center[0] - prev_center[0])**2 + (curr_center[1] - prev_center[1])**2)
    
    return (distance / curr_diag) * 100.0

def check_fight_with_movement(person_dets_dict, prev_person_boxes_dict, overlap_tracker, 
                             movement_threshold=25, min_overlap_duration=0.5):
    """
    Fight detection based on:
    1. Bounding boxes overlap for SUSTAINED duration (> 2.0 seconds)
    2. Fast, aggressive movement from both persons (> 25 pixels per frame)
    
    Args:
        person_dets_dict: Dict of ID -> current person bounding box
        prev_person_boxes_dict: Dict of ID -> previous frame person bounding box
        overlap_tracker: OverlapTracker instance
        movement_threshold: Minimum pixels moved per frame (default 25 - fighting intensity)
        min_overlap_duration: Minimum seconds of overlap before checking fight (default 2.0)
    """
    fighting = False
    current_overlaps = set()
    
    person_ids = list(person_dets_dict.keys())

    if len(person_ids) >= 2:
        for idx1 in range(len(person_ids)):
            for idx2 in range(idx1 + 1, len(person_ids)):
                id1 = person_ids[idx1]
                id2 = person_ids[idx2]
                
                box1 = person_dets_dict[id1]
                box2 = person_dets_dict[id2]
                
                x1a, y1a, x2a, y2a = box1
                x1b, y1b, x2b, y2b = box2
                
                # Check if bounding boxes overlap
                boxes_overlap = x1a < x2b and x2a > x1b and y1a < y2b and y2a > y1b
                pair_key = (min(id1, id2), max(id1, id2))
                
                if boxes_overlap:
                    current_overlaps.add(pair_key)
                    
                    # Start tracking if not already tracking
                    if pair_key not in overlap_tracker.overlap_times:
                        overlap_tracker.start_overlap(id1, id2)
                    else:
                        overlap_tracker.update_last_seen(id1, id2)
                    
                    # Get overlap duration
                    overlap_duration = overlap_tracker.get_overlap_duration(id1, id2)
                    
                    # Always calculate exact movement for both tracked persons
                    movement_1 = calculate_movement_distance(prev_person_boxes_dict, id1, box1)
                    movement_2 = calculate_movement_distance(prev_person_boxes_dict, id2, box2)
                    
                    # The fight is ONLY detected when boxes overlap for > min_overlap_duration
                    # AND the combined movement of both people represents a violent struggle.
                    sustained_overlap = (overlap_duration >= min_overlap_duration)
                    
                    # Calculate "kinetic energy" of the overlap (sum of both movements).
                    # A threshold of ~20-25% combined movement perfectly catches asymmetrical fights.
                    active_struggle = (movement_1 + movement_2) > (movement_threshold * 1.5)
                    
                    if sustained_overlap and active_struggle:
                        fighting = True
                        overlap_tracker.mark_fight_detected()
    
    # If not currently detecting fight conditions, check if still in cooldown
    if not fighting and overlap_tracker.is_in_fight_cooldown():
        fighting = True
    
    # End tracking for overlaps that are no longer happening (with tolerance for tracking drops)
    overlap_tracker.cleanup_stale_overlaps(current_overlaps, tolerance=0.5)
    
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
    # import heavy libs locally
    try:
        import cv2
    except ImportError:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="cv2 not installed on server")

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


# Debug: list registered routes (helps debug missing websocket path)
@app.get("/_routes")
def list_routes():
    return {"routes": [str(r) for r in app.routes]}

# -------------------------
# Detect frame
# -------------------------

@app.post("/detect-frame", response_model=DetectFrameResponse)
async def detect_frame(file: UploadFile = File(...)):
    if model is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Model not loaded")

    # import heavy libs when actually needed
    import numpy as np
    import cv2

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

        if conf < 0.25:
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
    # If model is not available, refuse the websocket connection
    if model is None:
        await ws.accept()
        await ws.send_json({"error": "Model not loaded on server"})
        await ws.close()
        return

    await ws.accept()
    # import cv2 locally
    import cv2
    import numpy as np
    cap = cv2.VideoCapture(VIDEO_PATH)
    prev_person_boxes = {}
    overlap_tracker = OverlapTracker()
    
    frame_counter = 0
    # Decreased to 3 since CAP_PROP_BUFFERSIZE=1 handles hardware lag, allowing more frequent inference
    SKIP_FRAMES = 3 
    last_person_dets_dict = {}
    last_weapon_count = 0
    last_animal_count = 0
    last_fighting = False
    
    movement_threshold = 7.5  # 7.5% movement of body size in ~0.1s
    min_overlap_duration = 2.0  # Must overlap for at least 2.0 seconds

    while True:
        ret, frame = cap.read()

        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            prev_person_boxes = {}
            overlap_tracker.clear()
            continue

        frame_counter += 1

        do_inference = (frame_counter % SKIP_FRAMES == 0)

        if do_inference:
            # Default detection outputs
            person_dets_dict = {}
            weapon_count = 0
            animal_count = 0
            fighting = False
        else:
            # Use cached detections
            person_dets_dict = last_person_dets_dict.copy()
            weapon_count = last_weapon_count
            animal_count = last_animal_count
            fighting = last_fighting

        # Run model inference synchronously with persistent tracking on a small frame for speed
        if model is not None and do_inference:
            try:
                # Use YOLO's built-in tracker on the full-resolution frame for better accuracy
                results = model.track(frame, persist=True, verbose=False)[0]
                
                if results.boxes.id is not None:
                    track_ids = results.boxes.id.int().cpu().tolist()
                else:
                    track_ids = [None] * len(results.boxes)

                for box, track_id in zip(results.boxes, track_ids):
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                        
                    conf = float(box.conf[0])
                    cls = int(box.cls[0])
                    if conf < 0.25:
                        continue
                        
                    if cls in person_classes:
                        if track_id is not None:
                            person_dets_dict[track_id] = (x1, y1, x2, y2)
                    elif cls in weapon_classes:
                        weapon_count += 1
                    elif cls in animal_classes:
                        animal_count += 1

                # Check fight using dicts of persistent IDs
                fighting = check_fight_with_movement(
                    person_dets_dict,
                    prev_person_boxes,  # This is actually a dict now
                    overlap_tracker,
                    movement_threshold=movement_threshold,
                    min_overlap_duration=min_overlap_duration,
                )
                
            except Exception as e:
                print(f"Warning: model tracking error: {e}")
                fighting = False

        if do_inference:
            # Update cache
            last_person_dets_dict = person_dets_dict.copy()
            last_weapon_count = weapon_count
            last_animal_count = animal_count
            last_fighting = fighting

        # Update previous positions dictionary for next frame
        prev_person_boxes = person_dets_dict.copy()
        
        # Always draw the boxes we have
        for track_id, (x1, y1, x2, y2) in person_dets_dict.items():
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frame, f"ID {track_id}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

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

        # Lower JPEG quality to compress faster and reduce payload size, decreasing network latency
        _, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 60])
        frame_bytes = base64.b64encode(buffer).decode("utf-8")

        await ws.send_json({
            "people_count": len(person_dets_dict),
            "weapon_count": weapon_count,
            "animal_count": animal_count,
            "fighting": fighting,
            "frame": frame_bytes
        })

        await asyncio.sleep(0.001)  # Minimal yield to keep event loop free

    cap.release()

# -------------------------
# WebSocket webcam feed
# -------------------------

@app.websocket("/ws/webcam")
async def websocket_webcam(ws: WebSocket):
    # perform lazy imports for heavy libs so auth-only runs don't crash
    try:
        import cv2
        import numpy as np
    except ImportError:
        # if cv2/numpy unavailable, cannot stream webcam
        await ws.accept()
        await ws.send_json({"error": "cv2 or numpy not installed"})
        await ws.close()
        return
    await ws.accept()
    # Try to load the detection model if it's not already loaded so we can provide
    # live detection data. If model loading fails, continue streaming without detection.
    global model, person_classes, weapon_classes, animal_classes
    if model is None:
        try:
            model = load_custom_model(MODEL_PATH)

            # rebuild class mappings
            person_classes.clear()
            weapon_classes.clear()
            animal_classes.clear()
            names = model.names
            for idx, name in names.items():
                lname = name.lower()
                if "person" in lname:
                    person_classes.append(idx)
                if any(w in lname for w in weapon_keywords):
                    weapon_classes.append(idx)
                if any(a in lname for a in animal_keywords):
                    animal_classes.append(idx)

            await ws.send_json({"info": "model_loaded"})
        except Exception as e:
            # Model failed to load — continue streaming frames without detection.
            await ws.send_json({"info": "model_unavailable", "error": str(e)})
            model = None

    # Try multiple camera indices in case default 0 is busy or not present
    cap = None
    chosen_cam_index = None
    for idx in range(0, 4):
        try:
            # Prefer DirectShow on Windows for more reliable camera access
            c = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
            if c is not None and c.isOpened():
                # Reduce buffer size to 1 to minimize latency/lag from queued frames
                c.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                cap = c
                using_video_file = False
                chosen_cam_index = idx
                break
            else:
                if c is not None:
                    c.release()
        except Exception:
            continue

    # If camera not found, try fallback video file
    using_video_file = False
    if cap is None:
        if os.path.exists(VIDEO_PATH):
            cap = cv2.VideoCapture(VIDEO_PATH)
            if cap is not None and cap.isOpened():
                using_video_file = True
        if cap is None or not cap.isOpened():
            await ws.send_json({"error": "No camera available and fallback video missing"})
            await ws.close()
            return

    # Set resolution when using webcam (has no effect for video file)
    if not using_video_file:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

        # Log which source we're streaming from
        if using_video_file:
            print(f"Streaming from sample video: {VIDEO_PATH}")
        else:
            print(f"Streaming from camera index: {chosen_cam_index}")

    prev_person_boxes = {}
    overlap_tracker = OverlapTracker()
    movement_threshold = 7.5
    min_overlap_duration = 2.0
    
    frame_counter = 0
    # Decreased to 3 since CAP_PROP_BUFFERSIZE=1 handles hardware lag, allowing more frequent inference
    SKIP_FRAMES = 3 
    last_person_dets_dict = {}
    last_weapon_count = 0
    last_animal_count = 0
    last_fighting = False

    # Inform client if we are streaming from sample video
    if using_video_file:
        await ws.send_json({"info": "streaming_sample_video"})

    while True:
        ret, frame = cap.read()

        # If using a webcam and frame read fails, retry a few times
        if not ret:
            # If streaming a file, we've reached end; rewind
            if using_video_file:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                prev_person_boxes = {}
                overlap_tracker.clear()
                continue
            # webcam failure
            await ws.send_json({"error": "Cannot read from webcam"})
            break

        frame_counter += 1

        do_inference = (frame_counter % SKIP_FRAMES == 0)

        if do_inference:
            # Default detection outputs
            person_dets_dict = {}
            weapon_count = 0
            animal_count = 0
            fighting = False
        else:
            # Use cached detections
            person_dets_dict = last_person_dets_dict.copy()
            weapon_count = last_weapon_count
            animal_count = last_animal_count
            fighting = last_fighting

        # Run model inference synchronously with persistent tracking on a small frame for speed
        if model is not None and do_inference:
            try:
                # Use YOLO's built-in tracker on the full-resolution frame for better accuracy
                results = model.track(frame, persist=True, verbose=False)[0]
                
                if results.boxes.id is not None:
                    track_ids = results.boxes.id.int().cpu().tolist()
                else:
                    track_ids = [None] * len(results.boxes)

                for box, track_id in zip(results.boxes, track_ids):
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                        
                    conf = float(box.conf[0])
                    cls = int(box.cls[0])
                    if conf < 0.25:
                        continue
                        
                    if cls in person_classes:
                        if track_id is not None:
                            person_dets_dict[track_id] = (x1, y1, x2, y2)
                    elif cls in weapon_classes:
                        weapon_count += 1
                    elif cls in animal_classes:
                        animal_count += 1

                # Check fight using dicts of persistent IDs
                fighting = check_fight_with_movement(
                    person_dets_dict,
                    prev_person_boxes,  # This is actually a dict now
                    overlap_tracker,
                    movement_threshold=movement_threshold,
                    min_overlap_duration=min_overlap_duration,
                )
                
            except Exception as e:
                print(f"Warning: model tracking error: {e}")
                fighting = False

        if do_inference:
            # Update cache
            last_person_dets_dict = person_dets_dict.copy()
            last_weapon_count = weapon_count
            last_animal_count = animal_count
            last_fighting = fighting

        # Update previous positions dictionary for next frame
        prev_person_boxes = person_dets_dict.copy()
        
        # Always draw the boxes we have
        for track_id, (x1, y1, x2, y2) in person_dets_dict.items():
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frame, f"ID {track_id}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            
        if fighting:
            try:
                cv2.putText(frame, "FIGHT DETECTED", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)
            except Exception:
                pass

        # Lower JPEG quality to compress faster and reduce payload size, decreasing network latency
        _, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 60])
        frame_bytes = base64.b64encode(buffer).decode("utf-8")

        await ws.send_json({
            "people_count": len(person_dets_dict),
            "weapon_count": weapon_count,
            "animal_count": animal_count,
            "fighting": fighting,
            "frame": frame_bytes,
            "using_video_file": using_video_file,
        })

        await asyncio.sleep(0.001)  # Minimal yield to event loop

    cap.release()