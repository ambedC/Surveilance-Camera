from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os

from backend.utils.alert_manager import get_recent_alerts
from backend.featureExtraction.detect_people import detect_people

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/")
def home():
    return {"message": "Backend running successfully!"}

@app.get("/alerts/recent")
def recent_alerts():
    return get_recent_alerts()

@app.post("/process-video")
async def process_video(file: UploadFile = File(...)):
    video_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    output_path = os.path.join(UPLOAD_DIR, "processed_" + file.filename)
    detect_people(video_path, output_path)
    return {"message": "Video processed successfully", "output": output_path}
