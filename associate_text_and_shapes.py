import cv2
import pytesseract
import numpy as np

# Read the image
img = cv2.imread('test_image_with_dimensions.png')
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
edges = cv2.Canny(gray, 50, 150, apertureSize=3)

# Detect lines
lines = cv2.HoughLines(edges, 1, np.pi / 180, 100)

# Get text and bounding boxes
data = pytesseract.image_to_data(gray, output_type=pytesseract.Output.DICT)
n_boxes = len(data['level'])

detected_lines = []
if lines is not None:
    for rho, theta in lines[:, 0]:
        a = np.cos(theta)
        b = np.sin(theta)
        x0 = a * rho
        y0 = b * rho
        x1 = int(x0 + 1000 * (-b))
        y1 = int(y0 + 1000 * (a))
        x2 = int(x0 - 1000 * (-b))
        y2 = int(y0 - 1000 * (a))
        detected_lines.append(((x1, y1), (x2, y2)))

for i in range(n_boxes):
    if int(data['conf'][i]) > 60:  # Confidence level
        (x, y, w, h) = (data['left'][i], data['top'][i], data['width'][i], data['height'][i])
        text = data['text'][i]

        # Simple association logic: if text is near a line, associate them
        for line in detected_lines:
            (x1, y1), (x2, y2) = line
            # Check if the text is horizontally aligned with the line
            if abs(y - y1) < 50 and abs(y - y2) < 50:
                 print(f"Associated text '{text}' with line from {line[0]} to {line[1]}")
