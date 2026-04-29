# scripts/setup_classification_dataset.py
"""
Setup classification dataset structure for fake logo detection
"""

import os
import shutil

def setup_classification_structure():
    """Create the folder structure for classification dataset"""
    
    base_dir = 'data/logo_dataset/classification'
    brands = ['apple', 'samsung', 'dell', 'hp', 'lenovo']
    
    print("📁 Setting up classification dataset structure...")
    
    for brand in brands:
        # Create brand directories
        genuine_dir = os.path.join(base_dir, brand, 'genuine')
        fake_dir = os.path.join(base_dir, brand, 'fake')
        
        os.makedirs(genuine_dir, exist_ok=True)
        os.makedirs(fake_dir, exist_ok=True)
        
        print(f"✅ Created: {brand}/genuine/ and {brand}/fake/")
    
    print(f"\n🎯 Dataset structure ready at: {base_dir}")
    print("📝 Next: Add genuine logos to brand/genuine/ folders")
    print("📝 Then: Run fake logo generator to populate fake/ folders")

if __name__ == "__main__":
    setup_classification_structure()