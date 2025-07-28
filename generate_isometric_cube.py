import numpy as np
import cv2
import matplotlib.pyplot as plt

# Create a black image
img = np.zeros((512, 512, 3), np.uint8)

# Define the vertices of an isometric cube
pts = np.array([[256, 100], [156, 150], [156, 250], [256, 300],
                [356, 250], [356, 150], [256, 100], [356, 150],
                [356, 250], [256, 300], [156, 250], [156, 150]], np.int32)
pts = pts.reshape((-1, 1, 2))
cv2.polylines(img, [pts], False, (255, 255, 255), 3)

# Save the image
plt.imsave('isometric_cube.png', img)

print("Test image 'isometric_cube.png' created successfully.")
