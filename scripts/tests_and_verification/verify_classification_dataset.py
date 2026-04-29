# scripts/verify_classification_dataset.py
"""
Verify the classification dataset structure and counts
"""

import os
from PIL import Image
import matplotlib.pyplot as plt

def verify_classification_dataset():
    """Verify classification dataset"""
    
    base_dir = 'data/logo_dataset/classification'
    
    if not os.path.exists(base_dir):
        print("❌ Classification dataset not found!")
        return
    
    print("\n" + "="*60)
    print("📊 CLASSIFICATION DATASET VERIFICATION")
    print("="*60)
    
    brands = [d for d in os.listdir(base_dir) if os.path.isdir(os.path.join(base_dir, d))]
    
    total_genuine = 0
    total_fake = 0
    
    print("\n📈 Dataset Statistics:")
    print("-" * 40)
    
    for brand in brands:
        genuine_dir = os.path.join(base_dir, brand, 'genuine')
        fake_dir = os.path.join(base_dir, brand, 'fake')
        
        genuine_count = len([f for f in os.listdir(genuine_dir) if f.endswith('.png')]) if os.path.exists(genuine_dir) else 0
        fake_count = len([f for f in os.listdir(fake_dir) if f.endswith('.png')]) if os.path.exists(fake_dir) else 0
        
        total_genuine += genuine_count
        total_fake += fake_count
        
        print(f"🏷️  {brand.upper():<10} | Genuine: {genuine_count:>3} | Fake: {fake_count:>3}")
    
    print("-" * 40)
    print(f"📦 TOTAL        | Genuine: {total_genuine:>3} | Fake: {total_fake:>3}")
    print(f"🎯 BALANCE      | Ratio: 1:{total_fake/max(1,total_genuine):.1f}")
    
    # Show sample images
    if total_genuine > 0 and total_fake > 0:
        print("\n📸 Generating sample visualization...")
        show_sample_comparison(base_dir, brands[0])
    
    print("\n" + "="*60)
    print("✅ Dataset verification complete!")

def show_sample_comparison(base_dir, sample_brand):
    """Show genuine vs fake comparison for one brand"""
    
    genuine_dir = os.path.join(base_dir, sample_brand, 'genuine')
    fake_dir = os.path.join(base_dir, sample_brand, 'fake')
    
    genuine_imgs = [os.path.join(genuine_dir, f) for f in os.listdir(genuine_dir) if f.endswith('.png')][:3]
    fake_imgs = [os.path.join(fake_dir, f) for f in os.listdir(fake_dir) if f.endswith('.png')][:3]
    
    fig, axes = plt.subplots(2, 3, figsize=(12, 8))
    
    # Genuine logos
    for i, img_path in enumerate(genuine_imgs):
        img = Image.open(img_path)
        axes[0, i].imshow(img)
        axes[0, i].set_title(f"✅ GENUINE\n{sample_brand}", color='green', fontweight='bold')
        axes[0, i].axis('off')
    
    # Fake logos
    for i, img_path in enumerate(fake_imgs):
        img = Image.open(img_path)
        axes[1, i].imshow(img)
        fake_type = os.path.basename(img_path).split('_fake_')[1].split('_')[0]
        axes[1, i].set_title(f"❌ FAKE\n{fake_type}", color='red', fontweight='bold')
        axes[1, i].axis('off')
    
    plt.suptitle(f'Genuine vs Fake Logo Comparison - {sample_brand.upper()}', fontsize=16, fontweight='bold')
    plt.tight_layout()
    plt.savefig('logo_classification_samples.png', dpi=150, bbox_inches='tight')
    print("✅ Sample visualization saved: logo_classification_samples.png")
    plt.show()

if __name__ == "__main__":
    verify_classification_dataset()