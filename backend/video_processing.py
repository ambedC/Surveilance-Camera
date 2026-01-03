import cv2
import os
from glob import glob

def create_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)

def extract_frames(video_path, output_dir="backend/uploads/frames", gap=10):
    create_dir(output_dir)
    vidcap = cv2.VideoCapture(video_path)
    count = 0
    frame_count = 0
    saved_frames = []
    
    while True:
        success, frame = vidcap.read()
        if not success:
            break
        if count % gap == 0:
            frame_path = os.path.join(output_dir, f"frame_{frame_count}.jpg")
            cv2.imwrite(frame_path, frame)
            saved_frames.append(frame_path)
            frame_count += 1
        count += 1

    vidcap.release()
    return saved_frames


def extract_features(frame_paths):
    orb = cv2.ORB_create()
    features = {}

    for path in frame_paths:
        img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            continue
        keypoints, descriptors = orb.detectAndCompute(img, None)
        features[path] = {
            "num_keypoints": len(keypoints),
            "descriptor_shape": descriptors.shape if descriptors is not None else None
        }
    return features
