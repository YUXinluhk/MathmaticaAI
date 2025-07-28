import numpy as np
import cv2
import matplotlib.pyplot as plt

# Create a black image
img = np.zeros((512, 512, 3), np.uint8)

# Draw a white line
cv2.line(img, (100, 100), (400, 100), (255, 255, 255), 5)

# Draw dimension lines
cv2.line(img, (100, 80), (100, 120), (255, 255, 255), 1)
cv2.line(img, (400, 80), (400, 120), (255, 255, 255), 1)
cv2.line(img, (100, 100), (400, 100), (255, 255, 255), 1)


# Add dimension text
cv2.putText(img, '300', (230, 70), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)


# Save the image
plt.imsave('test_image_with_dimensions.png', img)

print("Test image 'test_image_with_dimensions.png' created successfully.")
