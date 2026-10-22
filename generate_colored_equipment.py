import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# Directory where equipment icons are stored
output_dir = Path(r"C:/Users/Lenovo/Desktop/禁閉逃殺_文字獄/images/equipment")

# Equipment names and distinct background colors (RGB)
names = ["Sword", "Shield", "Armor", "Helmet", "Ring", "Staff", "Bow", "Axe", "Boots", "Gloves"]
colors = [
    (220, 20, 60),   # Crimson
    (30, 144, 255),  # DodgerBlue
    (34, 139, 34),   # ForestGreen
    (255, 165, 0),   # Orange
    (128, 0, 128),   # Purple
    (255, 215, 0),   # Gold
    (70, 130, 180),  # SteelBlue
    (139, 69, 19),   # SaddleBrown
    (199, 21, 133),  # MediumVioletRed
    (255, 105, 180), # HotPink
]

# Load a font – try Arial, fall back to default if unavailable
try:
    font = ImageFont.truetype("arial.ttf", 40)
except Exception:
    font = ImageFont.load_default()

for i, (name, color) in enumerate(zip(names, colors), start=1):
    img = Image.new("RGBA", (256, 256), color + (255,))
    draw = ImageDraw.Draw(img)
    text = name
    # Center the text
    bbox = draw.textbbox((0,0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    draw.text(((256 - w) / 2, (256 - h) / 2), text, fill="white", font=font)
    out_path = output_dir / f"裝備圖片_{i}.webp"
    img.save(out_path, "WEBP")
    print(f"Saved {out_path}")
