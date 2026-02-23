# TextAnalyzer - Professional Text Processing & Analysis Platform

A full-featured web application for text analysis with **OCR** (Optical Character Recognition), **grammar checking**, **paraphrasing**, and **multi-language translation**.

## Features 🚀

- **Optical Character Recognition (OCR)** - Extract text from images with high accuracy
- **Grammar Checking** - Identify and fix grammatical errors
- **Paraphrasing** - Rewrite text in different styles
- **Multi-Language Translation** - Translate between 50+ languages
- **Batch Processing** - Process multiple documents at once
- **Processing History** - Save and manage all your activities
- **Export Options** - Download results as PDF, DOCX, or TXT

## Tech Stack 💻

### Frontend
- **React 18** - User interface
- **Vite** - Fast build tool and development server
- **Zustand** - State management
- **Axios** - HTTP client
- **React Router** - Navigation

### Backend
- **FastAPI** - High-performance Python web framework
- **MongoDB** - NoSQL database
- **JWT** - Secure authentication
- **bcrypt** - Password hashing

### External APIs
- **Mistral OCR API** - Image text recognition
- **LanguageTool API** - Grammar checking
- **Google Translate / Mistral** - Multi-language translation

## Project Structure

```
TextAnalyzerProject/
├── frontend/              # React application
├── backend/              # FastAPI server
└── IMPLEMENTATION_STATUS.md
```

## Getting Started 🎯

### Prerequisites
- Node.js 16+ (for frontend)
- Python 3.9+ (for backend)
- MongoDB (local or MongoDB Atlas)

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Environment Configuration
Create `.env` files in both `frontend/` and `backend/` directories:

**backend/.env**
```
MONGODB_URL=mongodb+srv://user:password@cluster.mongodb.net/
DATABASE_NAME=text_analyzer
JWT_SECRET=your-super-secret-key
MISTRAL_API_KEY=your-mistral-key
LANGUAGE_TOOL_API_KEY=your-language-tool-key
GOOGLE_TRANSLATE_API_KEY=your-google-key
DEBUG=False
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

**frontend/.env**
```
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=TextAnalyzer
```

### Run Backend
```bash
cd backend
uvicorn app.main:app --reload
```
Backend runs at `http://localhost:8000`
API Docs available at `http://localhost:8000/docs`

## Design System 🎨

### Colors
- **Primary Navy**: `#0A1F5C` - Professional primary color
- **Soft Gray**: `#F5F7FA` - Subtle backgrounds
- **White**: `#FFFFFF` - Main background
- **Accent Navy**: `#1E40AF` - Hover states

### Typography
- Clean, professional sans-serif fonts
- Mobile-first responsive design
- Accessible contrast ratios

## API Endpoints 📡

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login user

### OCR
- `POST /api/ocr/process` - Process image
- `POST /api/ocr/upload` - Upload image file

### Text Processing (Coming Soon)
- `POST /api/text/grammar-check` - Check grammar
- `POST /api/text/paraphrase` - Paraphrase text
- `POST /api/text/translate` - Translate text

### History & Export (Coming Soon)
- `GET /api/history` - Get processing history
- `POST /api/export` - Export results

## Implementation Status 📊

Currently in **Phase 2** (Foundation + Initial Features):
- ✅ Authentication system complete
- ✅ Frontend infrastructure and pages
- ✅ Backend database and models
- ✅ OCR service setup
- ⏳ Text processing features
- ⏳ Export functionality
- ⏳ Deployment configuration

See `IMPLEMENTATION_STATUS.md` for detailed progress.

## Deployment 🚀

### Frontend (Vercel)
```bash
# Push to GitHub, then connect to Vercel
# Automatic deployment on push
```

### Backend (Vercel Serverless)
```bash
# Create /api directory with FastAPI handler
# Connect MongoDB Atlas
# Set environment variables
```

## Contributing 🤝

This is a personal project. For modifications:
1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Commit with clear messages

## Security Notes 🔒

- All passwords are hashed with bcrypt (12 rounds)
- JWT tokens expire after 24 hours
- All API endpoints require authentication
- Images validated for type and size
- CORS configured for production domains

## License 📄

Private project - All rights reserved

## Support 💬

For issues or feature requests, please refer to the implementation notes in `IMPLEMENTATION_STATUS.md`.

---

**Built with ❤️ using modern web technologies**
**Last Updated**: February 23, 2026
