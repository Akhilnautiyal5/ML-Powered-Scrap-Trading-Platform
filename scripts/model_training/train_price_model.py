import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
import joblib
import os
import sys

# Setup paths relative to project root
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parents[2]
raw_data_path = BASE_DIR / 'Dataset' / 'Price_Prediction_Dataset' / 'product_data.csv'
model_dir = BASE_DIR / 'server' / 'ml_models'
log_path = BASE_DIR / 'scripts' / 'train_log.txt'

def log_print(msg):
    print(msg)
    with open(log_path, 'a', encoding='utf-8') as f:
        f.write(str(msg) + '\n')

with open(log_path, 'w', encoding='utf-8') as f:
    f.write("Starting training...\n")

if not os.path.exists(model_dir):
    os.makedirs(model_dir)

# Load data
try:
    df = pd.read_csv(raw_data_path)
    log_print(f"Loaded {len(df)} rows from {raw_data_path}")
except Exception as e:
    log_print(f"Error loading data: {e}")
    sys.exit(1)

# Features and Target
X = df.drop(['product_id', 'resale_price', 'created_at'], axis=1)
y = df['resale_price']

# Identify categorical and numerical columns
categorical_cols = ['category', 'brand', 'condition', 'location']
numerical_cols = ['original_price', 'age_years', 'usage_hours', 'has_warranty', 'has_box']

# Preprocessing pipeline
preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), numerical_cols),
        ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_cols)
    ])

# Model pipeline with Optimized Parameters
model = Pipeline(steps=[
    ('preprocessor', preprocessor),
    ('regressor', RandomForestRegressor(
        n_estimators=200, 
        max_depth=25,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1 # Use all CPU cores for faster training
    ))
])

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42)

# Train model
log_print("Training Optimized Price Prediction Model...")
model.fit(X_train, y_train)

# Evaluate
from sklearn.metrics import mean_absolute_error, r2_score
y_pred = model.predict(X_test)
r2 = r2_score(y_test, y_pred)
mae = mean_absolute_error(y_test, y_pred)

log_print("-" * 30)
log_print(f"📊 MODEL ACCURACY REPORT 📊")
log_print(f"R^2 Accuracy Score: {r2*100:.2f}%")
log_print(f"Mean Error: ₹{mae:.2f} (Average off-by amount)")
log_print("-" * 30)

# Save model
model_path = os.path.join(model_dir, 'price_model.joblib')
joblib.dump(model, model_path)
log_print(f"🚀 Optimized Model saved to {model_path}")
