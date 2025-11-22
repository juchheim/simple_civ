from PIL import Image
import os
import numpy as np

def remove_white_background(image_path):
    try:
        img = Image.open(image_path).convert("RGBA")
        data = np.array(img)
        
        # Define white threshold (e.g., pixels brighter than 240 in all channels)
        r, g, b, a = data.T
        white_areas = (r > 240) & (g > 240) & (b > 240)
        
        # Set alpha to 0 for white areas
        data[..., 3][white_areas.T] = 0
        
        # Save back
        new_img = Image.fromarray(data)
        new_img.save(image_path)
        print(f"Processed {image_path}")
    except Exception as e:
        print(f"Error processing {image_path}: {e}")

directory = "client/public/cities"
for filename in os.listdir(directory):
    if filename.endswith(".png"):
        remove_white_background(os.path.join(directory, filename))
