import cv2
cap = cv2.VideoCapture(0)
print('opened', cap.isOpened())
ret, frame = cap.read()
print('read', ret)
if ret:
    cv2.imwrite('sample.jpg', frame)
    print('wrote sample.jpg')
cap.release()
