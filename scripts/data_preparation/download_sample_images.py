# scripts/download_sample_images.py
"""
Downloads sample product images for image search training
Uses publicly available product images
"""

import os
import requests
from PIL import Image
from io import BytesIO
import time

def download_sample_images():
    """Download sample product images"""
    
    # Sample image URLs (public domain product images)
    sample_images = {
        'laptop': [
            'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400',
            'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
            'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=400',
            'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400',
            'https://images.unsplash.com/photo-1484788984921-03950022c9ef?w=400'
        ],
        'mobile': [
            'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
            'https://images.unsplash.com/photo-1592286927505-c8d0e21c6568?w=400',
            'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400',
            'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=400',
            'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=400'
        ],
        'furniture': [
            'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400',
            'https://images.unsplash.com/photo-1550581190-9c1c48d21d6c?w=400',
            'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400',
            'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400',
            'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400'
        ],
        'camera': [
            'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400',
            'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=400',
            'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400',
            'https://images.unsplash.com/photo-1606933248010-efaa382fc5c8?w=400',
            'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400'
        ],
        'bike': [
            'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400',
            'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=400',
            'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=400',
            'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=400',
            'https://images.unsplash.com/photo-1591258370814-01609b341790?w=400'
        ]
    }
    
    # Create directories
    base_dir = 'data/images/products'
    os.makedirs(base_dir, exist_ok=True)
    
    print("📥 Downloading sample product images...")
    print("="*60)
    
    total_downloaded = 0
    
    for category, urls in sample_images.items():
        category_dir = os.path.join(base_dir, category)
        os.makedirs(category_dir, exist_ok=True)
        
        print(f"\n📂 Category: {category}")
        
        for idx, url in enumerate(urls, 1):
            try:
                # Download image
                response = requests.get(url, timeout=10)
                response.raise_for_status()
                
                # Open and save image
                img = Image.open(BytesIO(response.content))
                
                # Convert to RGB if needed
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Save image
                img_path = os.path.join(category_dir, f'{category}_{idx}.jpg')
                img.save(img_path, 'JPEG', quality=95)
                
                print(f"   ✅ Downloaded: {category}_{idx}.jpg")
                total_downloaded += 1
                
                # Be respectful - small delay
                time.sleep(0.5)
                
            except Exception as e:
                print(f"   ❌ Error downloading {url}: {e}")
                continue
    
    print("\n" + "="*60)
    print(f"✅ Download complete! Total images: {total_downloaded}")
    print(f"📁 Images saved to: {base_dir}")
    
    return total_downloaded

if __name__ == "__main__":
    download_sample_images()