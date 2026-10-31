# Smart AI Wardrobe Assistant — Implementation Plan

## Overview

A production-quality, full-stack AI application for wardrobe management and personalized outfit recommendations. The system integrates Computer Vision, NLP (Gemini API), weather APIs, and personalized ML recommendations into a modern React + FastAPI + MongoDB stack.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (React)                  │
│  Landing │ Auth │ Dashboard │ Wardrobe │ Chatbot    │
│  Analytics │ Profile │ Admin                        │
└─────────────────────┬───────────────────────────────┘
                      │ REST API (HTTP/JSON)
┌─────────────────────▼───────────────────────────────┐
│             BACKEND (FastAPI / Python)               │
│  Auth Routes │ Wardrobe Routes │ AI Routes           │
│  Weather Routes │ Chatbot Routes │ Analytics Routes  │
└──────┬──────────────┬──────────────────┬────────────┘
       │              │                  │
  ┌────▼────┐  ┌──────▼──────┐  ┌───────▼──────┐
  │ MongoDB │  │ Gemini API  │  │ OpenWeather  │
  │ (Data)  │  │ (Chatbot/AI)│  │ API (Weather)│
  └─────────┘  └─────────────┘  └──────────────┘
```

---

## Folder Structure

```
project_recom/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI entry point
│   │   ├── config.py                 # Settings & env vars
│   │   ├── database.py               # MongoDB connection
│   │   ├── models/
│   │   │   ├── user.py               # User schema
│   │   │   ├── clothing.py           # Clothing item schema
│   │   │   ├── outfit.py             # Outfit schema
│   │   │   └── analytics.py          # Analytics schema
│   │   ├── routes/
│   │   │   ├── auth.py               # Register/Login/Logout
│   │   │   ├── wardrobe.py           # Clothing CRUD + upload
│   │   │   ├── recommendations.py    # Outfit recommendations
│   │   │   ├── chatbot.py            # AI Chatbot (Gemini)
│   │   │   ├── weather.py            # Weather API
│   │   │   ├── analytics.py          # Dashboard analytics
│   │   │   ├── outfit_rating.py      # Selfie outfit rating
│   │   │   └── admin.py              # Admin endpoints
│   │   ├── services/
│   │   │   ├── ai_classifier.py      # CV clothing classifier
│   │   │   ├── color_engine.py       # Color matching engine
│   │   │   ├── recommendation.py     # Recommendation engine
│   │   │   ├── gemini_service.py     # Gemini API integration
│   │   │   ├── weather_service.py    # Weather service
│   │   │   ├── speech_service.py     # STT/TTS
│   │   │   └── outfit_rater.py       # Outfit rating AI
│   │   └── utils/
│   │       ├── auth.py               # JWT utilities
│   │       ├── image_processing.py   # Image helpers
│   │       └── validators.py         # Input validation
│   ├── models/                       # ML model files (.pkl, .h5)
│   ├── uploads/                      # Uploaded clothing images
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                   # Reusable UI components
│   │   │   ├── layout/               # Header, Sidebar, Footer
│   │   │   ├── wardrobe/             # Wardrobe components
│   │   │   ├── chatbot/              # Chatbot components
│   │   │   └── charts/               # Analytics charts
│   │   ├── pages/
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
│   │   ├── services/
│   │   │   ├── api.js                # Axios API client
│   │   │   ├── auth.js               # Auth service
│   │   │   └── speech.js             # Web Speech API
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── useWardrobe.js
│   │   ├── utils/
│   │   │   └── helpers.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── Dockerfile
├── docker-compose.yml
├── README.md
└── .env.example
```

---

## Implementation Phases

### Phase 1: Project Setup & Infrastructure
- Initialize React (Vite + Tailwind) frontend
- Initialize FastAPI backend
- MongoDB connection setup
- Docker & docker-compose configuration
- Environment variables setup

### Phase 2: Authentication System
- Backend: JWT auth routes (register, login, logout, profile)
- Frontend: Login, Register, Profile pages with form validation
- AuthContext for global state

### Phase 3: Digital Wardrobe
- Backend: Image upload endpoint, clothing CRUD
- AI Classifier: OpenCV + scikit-learn color extraction, rule-based + ML classification
- Frontend: Wardrobe page with drag-and-drop upload, clothing grid

### Phase 4: AI Services
- Color Matching Engine (HSL-based compatibility scores)
- Recommendation Engine (content-based filtering)
- Gemini API integration (chatbot + outfit rating)
- Weather API integration (OpenWeatherMap)

### Phase 5: Features
- Outfit recommendations (weather + occasion based)
- AI Chatbot page with voice assistant (Web Speech API)
- Outfit Rating System
- Analytics Dashboard with charts

### Phase 6: Admin & Polish
- Admin dashboard
- Landing page
- Dark mode
- Responsive design polish
- README & documentation

---

## Key Technical Decisions

| Feature | Technology | Rationale |
|---|---|---|
| AI Classification | OpenCV + scikit-learn (color/texture), rule-based CNN-lite | No heavy GPU needed, fast & reliable |
| Chatbot | Google Gemini 1.5 Flash API | Best NLP quality, free tier available |
| Color Analysis | OpenCV K-Means clustering | Accurate dominant color extraction |
| Recommendations | Content-based filtering (cosine similarity) | Works without user history cold-start |
| Weather | OpenWeatherMap API | Free tier, reliable |
| Voice | Web Speech API (browser-native) + gTTS backend | No external paid API needed |
| Charts | Recharts (React) | Lightweight, beautiful |
| Auth | JWT + bcrypt | Industry standard |

---

## Open Questions

> [!IMPORTANT]
> **API Keys Required** — The following external API keys are needed:
> - **Google Gemini API Key** — for AI chatbot & outfit rating
> - **OpenWeatherMap API Key** — for weather-based recommendations
>
> Please have these ready, or the app will run in demo mode with mocked responses.

> [!NOTE]
> **MongoDB** — Will use a local MongoDB instance by default. A MongoDB Atlas URI can be provided via environment variable for cloud deployment.

> [!NOTE]
> **ML Models** — The clothing classifier will use OpenCV for color extraction and a lightweight rule-based + KNN classifier (no GPU required). TensorFlow is optional and will be used if available.

---

## Verification Plan

### Automated
- Backend: `pytest` for API routes
- Frontend: Build verification (`npm run build`)

### Manual
- Full user flow: Register → Upload clothes → Get recommendations → Chat
- Voice assistant in browser
- Admin dashboard user management
- Dark mode toggle
- Mobile responsive check
