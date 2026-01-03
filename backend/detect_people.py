import cv2
import os

def detect_people(video_path, output_path="output_with_boxes.mp4"):
    # Load the built-in YOLOv3 model from OpenCV (uses COCO dataset)
    net = cv2.dnn.readNetFromDarknet(
        cv2.data.haarcascades.replace("haarcascade_frontalface_default.xml", "") + "dnn/yolov3.cfg",
        cv2.data.haarcascades.replace("haarcascade_frontalface_default.xml", "") + "dnn/yolov3.weights"
    )
    layer_names = net.getLayerNames()
    output_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]

    cap = cv2.VideoCapture(video_path)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    out = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Prepare blob and forward pass
        blob = cv2.dnn.blobFromImage(frame, 1/255, (416, 416), swapRB=True, crop=False)
        net.setInput(blob)
        outs = net.forward(output_layers)

        boxes, confidences = [], []
        for out in outs:
            for detection in out:
                scores = detection[5:]
                class_id = int(np.argmax(scores))
                confidence = scores[class_id]
                # Only detect 'person' class (class_id == 0 in COCO)
                if class_id == 0 and confidence > 0.5:
                    center_x, center_y, w, h = (detection[0:4] * [width, height, width, height]).astype(int)
                    x = int(center_x - w/2)
                    y = int(center_y - h/2)
                    boxes.append([x, y, int(w), int(h)])
                    confidences.append(float(confidence))

        # Non-max suppression
        indices = cv2.dnn.NMSBoxes(boxes, confidences, 0.5, 0.4)
        for i in indices:
            x, y, w, h = boxes[i]
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            cv2.putText(frame, "Person", (x, y - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

        out.write(frame)

    cap.release()
    out.release()
    print(f"✅ Processed video saved at: {output_path}")
