# TextAnalyzer — AI-Powered Text Processing Platform

> 🆓 **Free-first architecture** — no paid AI API key required for core features.

A professional fullstack web application for OCR text extraction, grammar checking, AI paraphrasing, and multilingual translation.

**Stack:** React 18 + FastAPI + MongoDB Atlas (free)

---

## ✨ Features — Free-first, production-ready

| Feature | Technology | Cost | Limit |
|---------|-----------|------|-------|
| 🔍 **OCR** | Puter.js + Mistral `mistral-ocr-latest` (preferred) + backend OCR fallback | **FREE** | Unlimited |
| ✓ **Grammar Check** | Backend free providers + local correction fallback | **FREE** | Unlimited |
| ✨ **Paraphrase** | Backend rewrite pipeline + local style fallback | **FREE** | Unlimited |
| 🌐 **Translation** | `deep-translator` chain + local dictionary fallback | **FREE** | Unlimited |
| 📥 **Export** | Client-side (TXT) + Backend (PDF/DOCX) | **FREE** | Unlimited |
| 🕐 **History** | MongoDB Atlas M0 | **FREE** | 512MB storage |
| 👤 **Auth** | JWT + MongoDB | **FREE** | Unlimited users |

**Puter.js** is used mainly for OCR quality in-browser, with backend fallbacks for reliability.
Reference: https://developer.puter.com/tutorials/free-unlimited-mistral-ocr-api/

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB (local or free Atlas)

### 1. Setup Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set MONGODB_URL and JWT_SECRET
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Setup Frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

---

## 🔑 What You Need to Set Up

### REQUIRED (only 2 things)

#### 1. MongoDB Database — FREE
**Option A: MongoDB Atlas (recommended)**
1. Go to https://cloud.mongodb.com/
2. Create free account → Build a Database → **M0 Free** cluster
3. Create database user → Get connection string
4. Add to `.env`:

```env
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
DATABASE_NAME=text_analyzer
```

If your network has TLS/DNS issues with Atlas, add local fallback:

```env
MONGODB_URL_FALLBACK=mongodb://localhost:27017
```

**Option B: Local MongoDB**

```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=text_analyzer
```

#### 2. JWT Secret Key — FREE

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Add to `.env`:

```env
JWT_SECRET=paste-your-generated-key-here
```

---

## 🏗️ Architecture

```text
User Browser (React)
    │
    ├── Puter.js (Optional, preferred for OCR)
    │   └── OCR: mistral-ocr-latest
    │
    └── FastAPI Backend (core processing)
        ├── Authentication (JWT)
        ├── History storage (MongoDB)
        ├── Grammar / Paraphrase / Translation
        ├── OCR fallback processing
        └── Export (PDF/DOCX/TXT)
```

---

## 🎨 Design System

**Colors:** Navy Blue `#0D2461` + White `#FFFFFF` + Soft Gray `#F5F7FA`
**Font:** Inter (Google Fonts)

---

## 🐳 Docker

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with MongoDB URL and JWT secret
docker-compose up -d
```

---

## 💰 Cost Summary

| Service | Provider | Cost |
|---------|----------|------|
| AI OCR (preferred) | Puter.js | **$0** |
| AI text tools | Backend free providers | **$0** |
| Database | MongoDB Atlas M0 | **$0** |
| Backend hosting | Your server / free tier | **$0** |
| Frontend hosting | Vercel / Netlify free | **$0** |
| **TOTAL** | | **$0/month** |

---

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/history` | Get history |
| DELETE | `/api/history/{id}` | Delete item |
| POST | `/api/export` | Export results |
| GET | `/health` | Health check |

Swagger UI: http://localhost:8000/docs
