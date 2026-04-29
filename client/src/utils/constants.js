export const API_URLS = {
  BASE: 'http://localhost:5050/api',
  PREDICT_PRICE: '/ai/predict-price',
  HEALTH: '/health'
}

export const LISTING_CATEGORY_OPTIONS = [
	{ value: "electronics", label: "Electronics & Gadgets" },
	{ value: "mobile_devices", label: "Smartphones & Tablets" },
	{ value: "computers", label: "Laptops & Desktops" },
	{ value: "cameras", label: "Cameras & Drones" },
	{ value: "audio", label: "Audio & Headphones" },
	{ value: "gaming", label: "Gaming Consoles & VR" },
	{ value: "wearables", label: "Wearables & Smart Devices" },
	{ value: "home_appliances", label: "Home Appliances" },
	{ value: "furniture", label: "Furniture & Decor" },
	{ value: "fashion", label: "Fashion & Apparel" },
	{ value: "books", label: "Books & Media" },
	{ value: "sports", label: "Sports & Fitness Gear" },
	{ value: "Bike", label: "Bike/Motorcycles" },
	{ value: "Car", label: "Car/Four-Wheelers" },
	{ value: "automotive", label: "Automotive Accessories" },
	{ value: "collectibles", label: "Collectibles & Hobbies" },
	{ value: "kids", label: "Kids & Baby Products" },
	{ value: "outdoor", label: "Outdoor & Travel" },
];

export const PRICE_CATEGORY_OPTIONS = [
  { value: 'laptop_ultrabook', label: 'Laptops & Ultrabooks', modelValue: 'Laptop' },
  { value: 'laptop_gaming', label: 'Gaming Desktops / PCs', modelValue: 'Laptop' },
  { value: 'mobile_flagship', label: 'Flagship Smartphones', modelValue: 'Mobile' },
  { value: 'mobile_budget', label: 'Budget Smartphones / Tablets', modelValue: 'Mobile' },
  { value: 'furniture_premium', label: 'Premium Furniture', modelValue: 'Furniture' },
  { value: 'furniture_basic', label: 'Essential Furniture', modelValue: 'Furniture' },
  { value: 'bike_motorcycle', label: 'Motorcycles / Scooters', modelValue: 'Bike' },
  { value: 'bike_cycle', label: 'Bicycles & E-Bikes', modelValue: 'Bike' },
  { value: 'camera_pro', label: 'Professional Cameras', modelValue: 'Camera' },
  { value: 'camera_compact', label: 'Compact Cameras & Drones', modelValue: 'Camera' },
]

export const CONDITIONS = [
  'Excellent',
  'Good',
  'Fair',
  'Poor'
]

export const LOCATIONS = [
  'Delhi',
  'Mumbai',
  'Bangalore',
  'Chennai',
  'Kolkata',
  'Hyderabad'
]