import cv2, time

for i in range(6):
    cap = cv2.VideoCapture(i)
    ok = cap.isOpened()
    print(f"index {i}: isOpened={ok}")
    if ok:
        ret, frame = cap.read()
        print(f" index {i}: read={ret}, frame shape={None if not ret else frame.shape}")
        cap.release()
    time.sleep(0.2)
print('probe complete')
