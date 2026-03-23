import time
import cv2
import os
from ultralytics import YOLO

def test_inference_speed():
    model_path = os.path.join("backend", "yolo_model", "best.pt")
    if not os.path.exists(model_path):
        print("Model not found")
        return
        
    model = YOLO(model_path)
    # Create dummy black frame
    import numpy as np
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    
    # Warmup
    for _ in range(3):
        model.track(frame, persist=True, imgsz=320, verbose=False)
        
    start_time = time.time()
    num_frames = 50
    for _ in range(num_frames):
        # Resize logic
        infer_frame = cv2.resize(frame, (320, 240))
        results = model.track(infer_frame, persist=True, verbose=False)[0]
    
    elapsed = time.time() - start_time
    fps = num_frames / elapsed
    print(f"FPS at 320x240: {fps:.2f}")
    
    start_time = time.time()
    for _ in range(num_frames):
        results = model.track(frame, persist=True, verbose=False)[0]
        
    elapsed = time.time() - start_time
    fps = num_frames / elapsed
    print(f"FPS at 640x480: {fps:.2f}")

if __name__ == "__main__":
    test_inference_speed()
