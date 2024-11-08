import numpy as np
import matplotlib.pyplot as plt

"""
Testing out using matplotlib to generate basic body plan... Calling it a fossil right because that was the inspiration, but may change concept
"""
def generate_fossil_image(size=64):
    """
    Procedurally generates a black and white 64x64 image representing a creature's body plan.
    The image grows from a central point and uses bilateral or radial symmetry.
    TODO: Do we need to start from a central point?
    """
    # Initialize image
    image = np.zeros((size, size))
    
    # Choose symmetry (0 = bilateral, 1 = radial)
    symmetry_type = np.random.choice([0, 1])
    
    # Define center point
    center = (size // 2, size // 2)
    
    # Circle body part
    # TODO: Should circle be filled?
    # TODO: How to differentiate between circle as head and circle as bone structure?
    def draw_circle(img, center, radius):
        for x in range(-radius, radius + 1):
            for y in range(-radius, radius + 1):
                if x**2 + y**2 <= radius**2:
                    img[center[0] + x, center[1] + y] = 1

    # Line body part
    def draw_line(img, start, end):
        x0, y0 = start
        x1, y1 = end
        length = max(abs(x1 - x0), abs(y1 - y0))
        for i in range(length + 1):
            x = x0 + i * (x1 - x0) // length
            y = y0 + i * (y1 - y0) // length
            img[x, y] = 1
    
    # TODO: need curving line too
    # TODO: triangle or other shapes?

    # Step 1: Create center body part
    # TODO: adjust logic to add additional types of body parts
    if np.random.choice([True, False]):  # Circle added
        draw_circle(image, center, radius=np.random.randint(4, 8))
    else:  # Line added
        draw_line(image, (center[0], center[1] - 8), (center[0], center[1] + 8))
    
    # Step 2: Create additional/secondary body part
    # TODO: more of these? Pelvis/girdle structure?
    if np.random.choice([True, False]):  # Circle added
        draw_circle(image, (center[0], center[1] - 12), radius=np.random.randint(2, 5))
    else:  # Line added
        draw_line(image, (center[0] - 4, center[1] - 8), (center[0] + 4, center[1] - 8))
    
    # Step 3: Add appendages
    # TODO: only using lines right now - more realistic to have rectangles?
    # TODO: decide on range for length and number. Angle should vary?
    appendage_length = np.random.randint(6, 10)
    num_appendages = np.random.randint(2, 5)
    angle_step = 360 // num_appendages
    
    # TODO: Not sure if limbs are connecting to existing body parts or just reflected on symmetry
    if symmetry_type == 0:  # Bilateral symmetry
        for i in [-1, 1]:
            draw_line(image, center, (center[0] + i * appendage_length, center[1] - appendage_length))
    else:  # Radial symmetry
        for angle in range(0, 360, angle_step):
            angle_rad = np.deg2rad(angle)
            x_end = int(center[0] + appendage_length * np.cos(angle_rad))
            y_end = int(center[1] + appendage_length * np.sin(angle_rad))
            draw_line(image, center, (x_end, y_end))
    
    return image

# Generate the image
image = generate_fossil_image()
plt.imshow(image, cmap='gray')
plt.axis('off')
plt.show()
