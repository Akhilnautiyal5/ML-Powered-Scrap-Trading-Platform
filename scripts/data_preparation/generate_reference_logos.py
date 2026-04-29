"""
Utility script to generate placeholder reference logos for development/testing.

The generated logos are simple text-based images so we can demo the
fake-logo-verification pipeline without requiring proprietary assets.
"""

import os
from pathlib import Path
from typing import List

from PIL import Image, ImageDraw, ImageFont

WORKSPACE_ROOT = Path(__file__).resolve().parents[1]
REFERENCE_DIR = WORKSPACE_ROOT / "server" / "ml_services" / "logo_verifier" / "reference_logos"

BRAND_STYLES = {
    "nike": {
        "colors": ["#000000", "#ffffff"],
        "bg_colors": ["#ffffff", "#000000"],
        "text": "NIKE",
    },
    "adidas": {
        "colors": ["#101820", "#ffffff"],
        "bg_colors": ["#ffffff", "#101820"],
        "text": "ADIDAS",
    },
    "puma": {
        "colors": ["#e10600", "#ffffff"],
        "bg_colors": ["#ffffff", "#e10600"],
        "text": "PUMA",
    },
    "apple": {
        "colors": ["#000000", "#a2aaad"],
        "bg_colors": ["#ffffff", "#ffffff"],
        "text": "APPLE",
    },
    "samsung": {
        "colors": ["#1428a0", "#ffffff"],
        "bg_colors": ["#ffffff", "#1428a0"],
        "text": "SAMSUNG",
    },
}


def ensure_font() -> ImageFont.FreeTypeFont:
    """Loads a default font with a reasonable size."""
    try:
        return ImageFont.truetype("arial.ttf", 72)
    except OSError:
        # Degrade gracefully if Arial is not available (Linux environments).
        return ImageFont.load_default()


def create_logo(brand: str, fg_color: str, bg_color: str, text: str, variant: int) -> None:
    """Creates a simple logo PNG."""
    brand_dir = REFERENCE_DIR / brand
    brand_dir.mkdir(parents=True, exist_ok=True)

    img = Image.new("RGB", (600, 300), color=bg_color)
    draw = ImageDraw.Draw(img)
    font = ensure_font()

    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    pos = ((600 - text_width) / 2, (300 - text_height) / 2)
    draw.text(pos, text, font=font, fill=fg_color)

    # Add simple underline slash to mimic stylized logo
    draw.line(
        (100, 220, 500, 240),
        fill=fg_color,
        width=8 if variant == 0 else 4,
    )

    output_path = brand_dir / f"{brand}_v{variant + 1}.png"
    img.save(output_path)
    print(f"Generated {output_path}")


def generate_logos() -> None:
    """Generates two variants per brand."""
    font = ensure_font()
    print(f"Using font: {font}")
    for brand, style in BRAND_STYLES.items():
        fg_colors: List[str] = style["colors"]
        bg_colors: List[str] = style["bg_colors"]
        text = style["text"]
        for idx in range(2):
            fg = fg_colors[idx % len(fg_colors)]
            bg = bg_colors[idx % len(bg_colors)]
            create_logo(brand, fg, bg, text, idx)


if __name__ == "__main__":
    generate_logos()

