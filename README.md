# ♻️ ML Powered Second-Hand Trading Platform

![Python](https://img.shields.io/badge/Python-3.10-blue)
![React](https://img.shields.io/badge/React-18-blue)
![Flask](https://img.shields.io/badge/Flask-Backend-black)
![Firebase](https://img.shields.io/badge/Firebase-Auth-orange)
![License](https://img.shields.io/badge/License-MIT-green)

An intelligent full-stack web application that modernizes the second-hand goods trading ecosystem using **Machine Learning**, ensuring **fair pricing**, **fraud prevention**, and **trustworthy transactions** while promoting sustainability and the circular economy.

---

## 🚀 Project Overview

The **ML Powered Second-Hand Trading Platform** is designed to bridge the gap between buyers and sellers of second-hand items.  
It leverages machine learning models to provide **price prediction**, **image-based product search**, **fake logo verification**, and **personalized recommendations**.

This platform helps users:
- Get **fair price suggestions**
- Avoid **counterfeit products**
- Find similar items using images
- Trade second-hand items securely and efficiently

---

## 💡 Problem Statement

Traditional second-hand markets face:

- ❌ Lack of price transparency  
- ❌ No fraud detection mechanisms  
- ❌ Informal and unsafe transactions  
- ❌ Limited product discovery  

This platform solves these problems using intelligent ML pipelines and secure web architecture.

---

## 📊 Platform Comparison

| Feature | Traditional Second-Hand Market | This Platform |
|----------|--------------------------|---------------|
| Price Transparency | ❌ No | ✅ ML-Based Prediction |
| Fraud Detection | ❌ None | ✅ Logo Verification |
| Image Search | ❌ Not Available | ✅ Deep Learning |
| Personalized Recommendations | ❌ No | ✅ Content-Based Filtering |
| Secure Transactions | ❌ Informal | ✅ Production-Grade Escrow (Atomic + RBAC + Audit Trail) |
| Digital Identity | ❌ Unverified | ✅ Firebase Authentication |

---

## 🧠 Key Features

| Feature | Description |
|---------|------------|
| 🔍 Image-Based Product Search | Uses deep learning to find visually similar second-hand items. |
| 💰 Fair Price Prediction | ML model predicts an optimal price range based on category, condition, and market trends. |
| 🛡️ Fake Logo Verification | CNN-based model detects counterfeit brand logos to prevent fraud. |
| 🎯 Personalized Recommendations | Recommends relevant items using content-based filtering. |
| 🔐 Secure Authentication | Firebase Authentication for user login and role management. |
| 💬 Escrow V2 System | Atomic Firebase-based escrow with FSM state control, dispute lock, auto-refund & auto-release scheduler. |

---

## 🏗️ System Architecture

```
User (Frontend - React)
        ↓
Flask REST API
        ↓
ML Services Layer
        ↓
Firebase Database & Storage
```
---

## 🧰 Tech Stack


| Layer | Technologies |
|------|-------------|
| **Frontend** | React.js, Tailwind CSS, JavaScript |
| **Backend** | Flask (Python), REST APIs |
| **Database** | Firebase Realtime Database |
| **Authentication** | Firebase Authentication |
| **Storage** | Firebase Storage |

---


### 🤖 Machine Learning Modules

| Module | Algorithm / Technique | Status |
|------|----------------------|--------|
| **Visual Search Engine** | **EfficientNetB0** + Cosine Similarity | ✅ High Accuracy |
| **Smart Price Estimator** | **Random Forest Regressor** (Multi-feature) | ✅ High Accuracy |
| **Authenticity Lab** | CNN + Feature Matching (LogoGuard AI) | ✅ Optimized |
| **Recommendations** | TF-IDF + Cosine Similarity | 🛠️ In-Progress |

---

## 🎨 Design & UX

The platform features a **Premium Design System** built on:
- **Glassmorphism Aesthetic**: Translucent layers with subtle blurs for a modern, futuristic feel.
- **Dynamic Color Palettes**: Space-themed gradients (Indigo/Purple for Vision, Emerald/Teal for Finance).
- **Interactive UI**: Micro-animations, responsive hover effects, and real-time validation feedback.
- **Dark Mode Optimized**: Native support for high-contrast dark environments.

## 📂 Project Structure

```bash
ML-Powered-Scrap-Trading-Platform/
│
├── client/ # Frontend (React + Tailwind)
│ ├── src/
│ ├── public/
│ └── package.json
│
├── server/ # Backend (Flask)
│ ├── app.py
│ ├── routes/
│ ├── ml_services/
│ └── requirements.txt
│
├── ml_models/ # Training scripts (no large models)
│
├── .gitignore
├── README.md
└── docker-compose.yml (optional)
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/Akshitgarg1/ML-Powered-Scrap-Trading-Platform.git
cd ML-Powered-Scrap-Trading-Platform
```
### 2️⃣ Frontend Setup
```text
cd client
npm install
npm run dev
```

### 3️⃣ Backend Setup
```text
cd server
python -m venv venv
.venv\Scripts\activate
pip install -r requirement.txt
```
### 🔐 Firebase Admin Setup (Required for Escrow)

- Generate Firebase Service Account Key
- Place it inside:
```bash
server/serviceAccountKey.json
```
- Update databaseURL in app.py
- Run:
```text
python app.py
```
- ⚠️ serviceAccountKey.json is ignored via .gitignore.

---

## 🔐 Environment Variables
```text
Create a .env file in both client and server folders for sensitive keys:

FIREBASE_API_KEY=your_key_here
FIREBASE_PROJECT_ID=your_project_id
```
---

## 📦 ML Models & Datasets

- Large ML models are intentionally excluded.
- Models are stored locally or in cloud storage.
- Keeps repository lightweight and collaboration-friendly.

---

## 🔐 Security Considerations

- Firebase role-based authentication
- Protected API routes
- Environment variable isolation
- No sensitive keys in repository

---

## 🔒 Escrow V2 Architecture (escrow-v2 Branch)

- The escrow-v2 branch introduces a production-grade escrow system designed with:

-- 🔁 Atomic Firebase Transactions

-- 🔐 Role-Based Access Control (Buyer / Seller / Admin / System)

-- 📊 Multi-State Synchronization (escrow_status, payment_status, shipment_status)

-- ⏳ Auto-Refund (Shipping Timeout)

-- ⏳ Auto-Release (Delivery Confirmation Timeout)

-- 🛡️ Admin Lock Mechanism

-- 📜 Immutable Audit Trail

- All fund transitions are validated through a strict Finite State Machine (FSM).

- Branch Info:
```bash
main        → Base Stable Version
escrow-v2   → Hardened Escrow Production Version
```
---

## 🌱 Sustainability Impact

| Initiative | Description |
|------------|------------|
| Responsible Recycling | Encourages proper disposal and reuse of second-hand materials. |
| Reduction of Waste | Minimizes landfill contribution through structured resale. |
| Circular Economy Adoption | Promotes reuse and redistribution of materials within the economy. |
| Digital Trust in Informal Second-Hand Markets | Builds transparency and credibility using ML-based verification systems. |

---

## 📈 Future Enhancements

- Real-time dynamic pricing
- Mobile application (React Native)
- Blockchain-based transaction verification
- Multilingual support
- Advanced recommender system (Hybrid Model)

---

## 🎓 Academic Context

| Category        | Details                                   |
|----------------|-------------------------------------------|
| Degree         | B.Tech (Computer Science & Engineering)   |
| Project Type   | Final Year Major Project                  |
| Focus Areas    | Machine Learning, Web Development, Sustainability |

---

## 📄 License

This project is licensed under the MIT License.

---
