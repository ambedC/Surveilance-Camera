import json
import os
from datetime import datetime

ALERT_FILE = os.path.join(os.path.dirname(__file__), "../database/alerts.json")

def add_alert(message):
    """Add a new alert entry."""
    alert = {
        "id": int(datetime.now().timestamp()),
        "time": datetime.now().strftime("%I:%M %p"),
        "message": message
    }
    alerts = []
    if os.path.exists(ALERT_FILE):
        with open(ALERT_FILE, "r") as f:
            alerts = json.load(f)
    alerts.insert(0, alert)
    with open(ALERT_FILE, "w") as f:
        json.dump(alerts[:20], f, indent=4)  # Keep only recent 20 alerts

def get_recent_alerts():
    """Return recent alerts."""
    if not os.path.exists(ALERT_FILE):
        return []
    with open(ALERT_FILE, "r") as f:
        return json.load(f)
