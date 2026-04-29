import os
from pathlib import Path

# Setup paths
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parents[2]

# Path to the reference logos folder (used for serving images to the UI)
REFERENCE_LOGO_DIR = PROJECT_ROOT / "Dataset" / "Fake_logo_Detection_Dataset" / "Logos"

# Fallback if the path above doesn't exist
if not REFERENCE_LOGO_DIR.exists():
    REFERENCE_LOGO_DIR = PROJECT_ROOT / "archive" / "genLogoOutput"
