import numpy as np
import cv2
import matplotlib.pyplot as plt

# Create a black image
img = np.zeros((512, 512, 3), np.uint8)

# Draw a white line
cv2.line(img, (100, 100), (400, 400), (255, 255, 255), 5)

# Draw a blue circle
cv2.circle(img, (250, 250), 100, (0, 0, 255), 5)

# Save the image
plt.imsave('test_image.png', img)

print("Test image 'test_image.png' created successfully.")
