import numpy as np
import matplotlib.pyplot as plt

"""
Testing out using matplotlib to generate basic body plan...
"""
def generate_fossil_image(size=64):
    """
    Procedurally generates a black and white 64x64 image representing a creature's body plan.
    The image grows from a central point and uses bilateral or radial symmetry.
    """
    # Initialize image
    image = np.zeros((size, size))
    
    # Choose symmetry (0 = bilateral, 1 = radial)
    symmetry_type = np.random.choice([0, 1])
    