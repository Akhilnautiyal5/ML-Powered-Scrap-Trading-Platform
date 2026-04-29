# scripts/verify_logo_dataset.py
"""
Verify and visualize the improved logo dataset
Shows clear differences between genuine and fake logos
"""

import os
import numpy as np
from PIL import Image
import matplotlib.pyplot as plt

def verify_dataset():
    """Verify dataset quality"""
    
    genuine_dir = 'data/logo_dataset/genuine'
    fake_dir = 'data/logo_dataset/fake'
    
    print("\n" + "="*70)
    print("📊 LOGO DATASET VERIFICATION")
    print("="*70)
    
    # Check genuine logos
    if os.path.exists(genuine_dir):
        genuine_images = [f for f in os.listdir(genuine_dir) if f.endswith('.png')]
        print(f"\n✅ Genuine logos: {len(genuine_images)} images")
    else:
        print("\n❌ Genuine directory not found!")
        return
    
    # Check fake logos
    if os.path.exists(fake_dir):
        fake_images = [f for f in os.listdir(fake_dir) if f.endswith('.png')]
        print(f"✅ Fake logos: {len(fake_images)} images")
    else:
        print("❌ Fake directory not found!")
        return
    
    print(f"\n📈 Dataset Statistics:")
    print(f"   Total images: {len(genuine_images) + len(fake_images)}")
    print(f"   Genuine: {len(genuine_images)} ({len(genuine_images)/(len(genuine_images)+len(fake_images))*100:.1f}%)")
    print(f"   Fake: {len(fake_images)} ({len(fake_images)/(len(genuine_images)+len(fake_images))*100:.1f}%)")
    
    if len(genuine_images) + len(fake_images) < 30:
        print("\n⚠️  WARNING: Small dataset. Accuracy may be limited.")
    else:
        print("\n✅ Dataset size is good for training!")
    
    # Visualize comparisons
    print("\n📸 Creating visualization...")
    
    fig = plt.figure(figsize=(16, 10))
    
    # Show 5 brands with genuine vs fake comparison
    num_brands = min(5, len(genuine_images))
    
    for i in range(num_brands):
        # Get genuine logo
        genuine_img_path = os.path.join(genuine_dir, genuine_images[i])
        genuine_img = Image.open(genuine_img_path)
        
        # Get corresponding fake logos
        brand_name = genuine_images[i].split('_genuine')[0]
        fake_logos = [f for f in fake_images if f.startswith(brand_name)]
        
        if len(fake_logos) > 0:
            # Genuine logo
            ax = plt.subplot(num_brands, 4, i*4 + 1)
            ax.imshow(genuine_img)
            ax.set_title(f"✅ GENUINE\n{brand_name.upper()}", 
                        color='green', fontweight='bold', fontsize=10)
            ax.axis('off')
            
            # Show 3 fake variations
            for j in range(min(3, len(fake_logos))):
                fake_img_path = os.path.join(fake_dir, fake_logos[j])
                fake_img = Image.open(fake_img_path)
                
                technique = fake_logos[j].replace(f'{brand_name}_fake_', '').replace('.png', '')
                
                ax = plt.subplot(num_brands, 4, i*4 + j + 2)
                ax.imshow(fake_img)
                ax.set_title(f"❌ FAKE\n{technique}", 
                            color='red', fontweight='bold', fontsize=8)
                ax.axis('off')
    
    plt.suptitle('Genuine vs Fake Logo Comparison', 
                 fontsize=16, fontweight='bold', y=0.995)
    plt.tight_layout()
    plt.savefig('logo_dataset_comparison.png', dpi=150, bbox_inches='tight')
    print("✅ Visualization saved: logo_dataset_comparison.png")
    plt.show()
    
    print("\n" + "="*70)
    print("✅ Dataset verification complete!")
    print("="*70)

if __name__ == "__main__":
    verify_dataset()