from datetime import datetime

# Temporary in-memory DB
ALERTS_DB = []

def add_alert(video_name, confidence, label):
    ALERTS_DB.append({
        "video": video_name,
        "label": label,
        "confidence": confidence,
        "timestamp": datetime.now().isoformat()
    })

def get_recent_alerts(limit=5):
    return sorted(ALERTS_DB, key=lambda x: x["timestamp"], reverse=True)[:limit]
