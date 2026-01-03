import cv2
import numpy as np
import os
import json
from datetime import datetime
from backend.utils.alert_manager import add_alert

def detect_people(video_path, output_path="output_with_boxes.mp4"):
    # Load YOLO model (must have yolov3.cfg and yolov3.weights)
    cfg = os.path.join(os.path.dirname(__file__), "yolov3.cfg")
    weights = os.path.join(os.path.dirname(__file__), "yolov3.weights")
    net = cv2.dnn.readNetFromDarknet(cfg, weights)
    layer_names = net.getLayerNames()
    output_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]

    cap = cv2.VideoCapture(video_path)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    out = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))

    total_people = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        blob = cv2.dnn.blobFromImage(frame, 1/255, (416, 416), swapRB=True, crop=False)
        net.setInput(blob)
        outs = net.forward(output_layers)

        boxes, confidences = [], []
        for out in outs:
            for detection in out:
                scores = detection[5:]
                class_id = np.argmax(scores)
                confidence = scores[class_id]
                if class_id == 0 and confidence > 0.5:  # class_id 0 = person
                    center_x, center_y, w, h = (detection[0:4] * [width, height, width, height]).astype(int)
                    x = int(center_x - w / 2)
                    y = int(center_y - h / 2)
                    boxes.append([x, y, int(w), int(h)])
                    confidences.append(float(confidence))

        indices = cv2.dnn.NMSBoxes(boxes, confidences, 0.5, 0.4)
        people_count = len(indices)
        total_people += people_count

        for i in indices:
            x, y, w, h = boxes[i]
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            cv2.putText(frame, "Person", (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

        out.write(frame)

    cap.release()
    out.release()

    # Create alert
    alert_msg = f"Detected {total_people} people in video"
    add_alert(alert_msg)

    print(f"✅ Processed video saved as {output_path}")
    print(f"🚨 Alert generated: {alert_msg}")
