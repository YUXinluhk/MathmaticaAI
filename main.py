import cv2
import pytesseract
import numpy as np
import ezdxf

def detect_and_generate_cad(image_path, output_path):
    """
    Detects shapes and text in an image and generates a DXF file.
    """
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)

    # --- Shape Detection (Lines) ---
    detected_lines = []
    lines = cv2.HoughLines(edges, 1, np.pi / 180, 100)
    if lines is not None:
        for rho, theta in lines[:, 0]:
            a = np.cos(theta)
            b = np.sin(theta)
            x0 = a * rho
            y0 = b * rho
            # For simplicity, we are drawing long lines.
            # A more robust solution would find the line endpoints.
            x1 = int(x0 + 1000 * (-b))
            y1 = int(y0 + 1000 * (a))
            x2 = int(x0 - 1000 * (-b))
            y2 = int(y0 - 1000 * (a))
            detected_lines.append(((x1, y1), (x2, y2)))

    # --- Text Recognition ---
    text = pytesseract.image_to_string(gray)
    print(f"Detected text: {text}")

    # --- CAD Generation ---
    doc = ezdxf.new()
    msp = doc.modelspace()
    for line in detected_lines:
        # A real implementation would need to properly scale and position the lines
        # based on the detected dimensions. For now, we just draw the detected lines.
        msp.add_line(line[0], line[1])

    doc.saveas(output_path)
    print(f"DXF file '{output_path}' created successfully.")

if __name__ == '__main__':
    # We will use the image with dimensions as our test case
    detect_and_generate_cad('test_image_with_dimensions.png', 'final_output.dxf')
