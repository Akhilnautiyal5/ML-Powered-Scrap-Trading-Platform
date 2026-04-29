# scripts/generate_fake_logos.py
"""
Generate fake logo variations for classification training
"""

import os
import random
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw
import numpy as np

def apply_logo_distortions(genuine_logo_path, output_dir, brand):
    """Apply various distortions to create fake logos"""
    
    try:
        img = Image.open(genuine_logo_path)
        logo_name = os.path.basename(genuine_logo_path).replace('.png', '')
        
        distortions = {
            'blurry': lambda x: x.filter(ImageFilter.GaussianBlur(random.uniform(1.5, 3.5))),
            'pixelated': lambda x: pixelate_logo(x),
            'color_shift': lambda x: shift_colors(x),
            'rotated': lambda x: x.rotate(random.uniform(-20, 20), fillcolor=(255,255,255,255)),
            'stretched': lambda x: stretch_logo(x),
            'low_quality': lambda x: reduce_quality(x),
            'noisy': lambda x: add_noise(x),
            'partial': lambda x: remove_parts(x)
        }
        
        created_count = 0
        for dist_name, dist_func in distortions.items():
            try:
                fake_img = dist_func(img.copy())
                output_path = os.path.join(output_dir, f'{brand}_fake_{dist_name}_{created_count}.png')
                fake_img.save(output_path, 'PNG')
                created_count += 1
            except Exception as e:
                print(f"   ⚠️  Failed {dist_name}: {e}")
        
        return created_count
        
    except Exception as e:
        print(f"❌ Error processing {genuine_logo_path}: {e}")
        return 0

def pixelate_logo(img):
    """Pixelate the logo"""
    small = img.resize((32, 32), Image.Resampling.NEAREST)
    return small.resize(img.size, Image.Resampling.NEAREST)

def shift_colors(img):
    """Shift colors randomly"""
    enhancer = ImageEnhance.Color(img)
    return enhancer.enhance(random.uniform(0.3, 2.0))

def stretch_logo(img):
    """Stretch logo disproportionately"""
    w, h = img.size
    new_w = int(w * random.uniform(0.7, 1.3))
    new_h = int(h * random.uniform(0.7, 1.3))
    stretched = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    return stretched.resize((w, h), Image.Resampling.LANCZOS)

def reduce_quality(img):
    """Reduce image quality"""
    # Convert to JPEG and back to simulate compression
    if img.mode == 'RGBA':
        img = img.convert('RGB')
    return img

def add_noise(img):
    """Add random noise"""
    img_array = np.array(img)
    noise = np.random.randint(-30, 30, img_array.shape, dtype=np.int16)
    noisy_array = np.clip(img_array.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(noisy_array)

def remove_parts(img):
    """Remove parts of the logo (simulate damage)"""
    draw = ImageDraw.Draw(img)
    w, h = img.size
    # Draw random white rectangles to "remove" parts
    for _ in range(random.randint(1, 3)):
        x1 = random.randint(0, w-20)
        y1 = random.randint(0, h-20)
        x2 = x1 + random.randint(5, 30)
        y2 = y1 + random.randint(5, 30)
        draw.rectangle([x1, y1, x2, y2], fill=(255, 255, 255, 255))
    return img

def generate_fake_logos_dataset():
    """Generate fake logos for all brands"""
    
    base_dir = 'data/logo_dataset/classification'
    
    if not os.path.exists(base_dir):
        print("❌ Classification dataset not found! Run setup script first.")
        return
    
    total_fakes = 0
    
    for brand in os.listdir(base_dir):
        brand_dir = os.path.join(base_dir, brand)
        genuine_dir = os.path.join(brand_dir, 'genuine')
        fake_dir = os.path.join(brand_dir, 'fake')
        
        if not os.path.exists(genuine_dir):
            print(f"⚠️  No genuine logos found for {brand}")
            continue
        
        genuine_logos = [f for f in os.listdir(genuine_dir) if f.endswith('.png')]
        
        if not genuine_logos:
            print(f"⚠️  No PNG files in {genuine_dir}")
            continue
        
        print(f"\n🏷️  Generating fake logos for: {brand.upper()}")
        
        brand_fakes = 0
        for genuine_logo in genuine_logos[:2]:  # Use first 2 genuine logos as base
            genuine_path = os.path.join(genuine_dir, genuine_logo)
            created = apply_logo_distortions(genuine_path, fake_dir, brand)
            brand_fakes += created
        
        print(f"   ✅ Created {brand_fakes} fake variations")
        total_fakes += brand_fakes
    
    print(f"\n🎉 Total fake logos generated: {total_fakes}")
    print("📁 Location: data/logo_dataset/classification/*/fake/")

if __name__ == "__main__":
    generate_fake_logos_dataset()