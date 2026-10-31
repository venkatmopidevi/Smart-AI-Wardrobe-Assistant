# 🧥 Smart AI Wardrobe Assistant

> A production-quality full-stack AI application for wardrobe management and personalized outfit recommendations.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?logo=mongodb)](https://mongodb.com)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Gemini](https://img.shields.io/badge/Gemini-AI-4285F4?logo=google)](https://aistudio.google.com)

---

## ✨ Features

| Feature | Technology | Status |
|---------|-----------|--------|
| User Authentication (JWT) | FastAPI + bcrypt | ✅ |
| Digital Wardrobe Management | React + FastAPI | ✅ |
| AI Clothing Classification | OpenCV + scikit-learn | ✅ |
| Dominant Color Extraction | K-Means Clustering | ✅ |
| Color Matching Engine | HSL + Rule-based | ✅ |
| Weather-Based Recommendations | OpenWeatherMap API | ✅ |
| Occasion-Based Outfits | Content-Based Filtering | ✅ |
| Personalized Recommendations | Cosine Similarity | ✅ |
| AI Fashion Chatbot | Google Gemini 1.5 Flash | ✅ |
| Voice Assistant | Web Speech API + gTTS | ✅ |
| Outfit Rating System | Gemini Vision + CV | ✅ |
| Analytics Dashboard | Recharts | ✅ |
| Admin Dashboard | FastAPI + React | ✅ |
| Dark Mode UI | Tailwind CSS | ✅ |
| Mobile Responsive | Tailwind CSS | ✅ |
| Docker Support | Docker Compose | ✅ |

---

## 🏗️ Architecture

```
Frontend (React + Vite + Tailwind)
    ↕ REST API
Backend (FastAPI + Python)
    ↕              ↕              ↕
MongoDB        Gemini API    OpenWeatherMap
```

---

## 📁 Project Structure

```
project_recom/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI entry point
│   │   ├── config.py             # Settings from .env
│   │   ├── database.py           # MongoDB async connection
│   │   ├── models/               # Pydantic schemas
│   │   │   ├── user.py
│   │   │   ├── clothing.py
│   │   │   └── outfit.py
│   │   ├── routes/               # API route handlers
│   │   │   ├── auth.py           # Register/Login/Profile
│   │   │   ├── wardrobe.py       # Clothing CRUD + Upload
│   │   │   ├── recommendations.py# Outfit generation
│   │   │   ├── chatbot.py        # Gemini chatbot
│   │   │   ├── analytics.py      # Dashboard data
│   │   │   ├── outfit_rating.py  # Selfie rating
│   │   │   └── admin.py          # Admin endpoints
│   │   ├── services/             # Business logic
│   │   │   ├── ai_classifier.py  # CV + KMeans classifier
│   │   │   ├── color_engine.py   # Color harmony scoring
│   │   │   ├── recommendation.py # Content-based filtering
│   │   │   ├── gemini_service.py # Gemini API integration
│   │   │   └── weather_service.py# OpenWeatherMap
│   │   └── utils/
│   │       ├── auth.py           # JWT utilities
│   │       └── image_processing.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/                # React pages
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Wardrobe.jsx
│   │   │   ├── Recommendations.jsx
│   │   │   ├── Chatbot.jsx
│   │   │   ├── Analytics.jsx
│   │   │   ├── Profile.jsx
│   │   │   └── Admin.jsx
│   │   ├── components/           # Reusable components
│   │   │   └── layout/
│   │   │       ├── AppLayout.jsx
│   │   │       ├── Sidebar.jsx
│   │   │       └── Header.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # Auth state management
│   │   ├── services/
│   │   │   └── api.js            # Axios API client
│   │   ├── App.jsx
│   │   └── index.css             # Global styles
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB 7.0+
- (Optional) Google Gemini API Key
- (Optional) OpenWeatherMap API Key

### 1. Clone & Setup

```bash
git clone <your-repo>
cd project_recom
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env and add your API keys

# Start MongoDB (if running locally)
# mongod --dbpath /data/db

# Start backend
uvicorn app.main:app --reload --port 8000
```

Backend runs at: http://localhost:8000
API Docs: http://localhost:8000/api/docs

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: http://localhost:5173

---

## 🐳 Docker Setup

```bash
# Copy env and add API keys
cp backend/.env.example backend/.env

# Start all services
docker-compose up --build

# Access
# Frontend: http://localhost:5173
# Backend:  http://localhost:8000
# API Docs: http://localhost:8000/api/docs
```

---

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SECRET_KEY` | JWT signing key | ✅ |
| `MONGODB_URL` | MongoDB connection URI | ✅ |
| `GEMINI_API_KEY` | Google Gemini API key | ⚡ Optional |
| `WEATHER_API_KEY` | OpenWeatherMap API key | ⚡ Optional |

> Without API keys, the app runs in **demo mode** with mock responses.

---

## 📡 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create account |
| `/api/auth/login` | POST | Get JWT token |
| `/api/auth/me` | GET | Get current user |
| `/api/wardrobe/upload` | POST | Upload + classify clothing |
| `/api/wardrobe/items` | GET | List wardrobe items |
| `/api/recommendations/occasion` | GET | Outfit by occasion |
| `/api/recommendations/weather` | GET | Weather advice |
| `/api/chatbot/chat` | POST | Chat with AI stylist |
| `/api/analytics/summary` | GET | Analytics data |
| `/api/rating/analyze` | POST | Rate outfit photo |
| `/api/admin/stats` | GET | System stats (admin) |

Full interactive docs: http://localhost:8000/api/docs

---

## 🎨 Tech Stack

**Frontend:** React 18, Vite, Tailwind CSS 3, React Router, Framer Motion, Recharts, Axios
**Backend:** FastAPI, Motor (async MongoDB), Pydantic, Python-Jose (JWT), Passlib (bcrypt)
**AI/ML:** OpenCV, scikit-learn (KMeans clustering), Google Generative AI (Gemini 1.5 Flash)
**Database:** MongoDB 7.0
**Voice:** Web Speech API (STT), gTTS (TTS)
**DevOps:** Docker, Docker Compose

---

## 👤 Default Admin Account

```
Email:    admin@wardrobe.ai
Password: admin123
```

> Change these in production via the `.env` file.

---

## 📄 License

MIT License — free to use for portfolio and learning purposes.

Built with ❤️ using React · FastAPI · MongoDB · Google Gemini · OpenCV
