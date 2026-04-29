# scripts/generate_sample_data.py
import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
import os



def generate_sample_data(n_samples=5000):
    """Generate realistic sample product data with non-linear relationships"""
    
    categories = {
        'Laptop': {
            'brands': ['Dell', 'HP', 'Lenovo', 'Apple', 'Asus', 'Acer'],
            'base_price_range': (30000, 150000),
            'depreciation_rate': 0.18
        },
        'Mobile': {
            'brands': ['Apple', 'Samsung', 'OnePlus', 'Xiaomi', 'Realme', 'Oppo'],
            'base_price_range': (8000, 100000),
            'depreciation_rate': 0.22
        },
        'Furniture': {
            'brands': ['IKEA', 'Godrej', 'Durian', 'Urban Ladder', 'Pepperfry', 'Generic'],
            'base_price_range': (3000, 50000),
            'depreciation_rate': 0.10
        },
        'Bike': {
            'brands': ['Hero', 'Honda', 'Bajaj', 'TVS', 'Royal Enfield', 'Yamaha'],
            'base_price_range': (30000, 200000),
            'depreciation_rate': 0.12
        },
        'Camera': {
            'brands': ['Canon', 'Nikon', 'Sony', 'Fujifilm', 'Panasonic'],
            'base_price_range': (15000, 150000),
            'depreciation_rate': 0.15
        }
    }
    
    conditions = ['Excellent', 'Good', 'Fair', 'Poor']
    condition_multipliers = {
        'Excellent': 0.90,
        'Good': 0.75,
        'Fair': 0.55,
        'Poor': 0.35
    }
    
    products = []
    
    cat_names = list(categories.keys())
    
    for i in range(n_samples):
        cat_name = random.choice(cat_names)
        cat_data = categories[cat_name]
        brand = random.choice(cat_data['brands'])
        
        price_range = cat_data['base_price_range']
        min_price = price_range[0]
        max_price = price_range[1]
        original_price = random.randint(min_price, max_price)
        
        age_years = float(random.uniform(0, 6))
        age_years = round(age_years, 2)
        condition = random.choice(conditions)
        
        dep_rate = float(cat_data['depreciation_rate'])
        age_depreciation = (1.0 - dep_rate) ** age_years
        
        brand_multiplier = 1.15 if brand in ['Apple', 'Royal Enfield'] else 1.0
        condition_multiplier = float(condition_multipliers[condition])
        
        resale_price = float(original_price) * age_depreciation * condition_multiplier * brand_multiplier
        
        has_warranty = (age_years < 1.0) and (random.random() > 0.3)
        if has_warranty:
            resale_price *= 1.10
            
        has_box = random.random() > 0.4
        if has_box:
            resale_price *= 1.05
            
        if cat_name in ['Laptop', 'Mobile', 'Camera']:
            usage_hours = int(age_years * 365.0 * random.uniform(1.0, 10.0))
            usage_penalty = max(0.8, 1.0 - (float(usage_hours) / 50000.0))
            resale_price *= usage_penalty
        else:
            usage_hours = 0
            
        noise = random.uniform(0.95, 1.05)
        resale_price = int(resale_price * noise)
        
        resale_price = max(resale_price, int(float(original_price) * 0.05), 500)
        
        product = {
            'product_id': f'PROD_{i+1:05d}',
            'category': cat_name,
            'brand': brand,
            'original_price': original_price,
            'age_years': age_years,
            'condition': condition,
            'usage_hours': usage_hours,
            'resale_price': resale_price,
            'location': random.choice(['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata', 'Pune']),
            'has_warranty': bool(has_warranty),
            'has_box': bool(has_box),
            'created_at': (datetime.now() - timedelta(days=random.randint(1, 365))).strftime('%Y-%m-%d')
        }
        
        products.append(product)
    
    df = pd.DataFrame(products)
    os.makedirs('data/raw', exist_ok=True)
    df.to_csv('data/raw/product_data.csv', index=False)
    
    print(f"✅ Generated {n_samples} high-quality sample products")
    return df

if __name__ == "__main__":
    generate_sample_data(n_samples=5000)
