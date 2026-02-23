# TextAnalyzer - Deployment Guide

Complete guide for deploying TextAnalyzer to production on Vercel with MongoDB Atlas.

## Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Git account and repository
- Vercel account (free tier available)
- MongoDB Atlas account (free tier available)
- API keys for: Mistral, LanguageTool, Google Translate

## Step 1: MongoDB Atlas Setup

1. **Create MongoDB Account**
   - Visit https://www.mongodb.com/cloud/atlas
   - Sign up for free account

2. **Create Cluster**
   - Click "Create" → "Build a Database"
   - Select "Free (M0)" tier
   - Choose your preferred cloud region
   - Click "Create Cluster"

3. **Setup Network Access**
   - Go to "Network Access"
   - Click "Add IP Address"
   - Select "Allow access from anywhere" (for development)
   - In production, add specific IP addresses

4. **Create Database User**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Create username/password
   - Save the connection string

5. **Get Connection String**
   - In Cluster view, click "Connect"
   - Copy the "Connection String"
   - Replace `<password>` with your database password
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority`

## Step 2: Get API Keys

### Mistral API Key
1. Visit https://console.mistral.ai
2. Sign up and verify email
3. Go to API keys section
4. Create new API key
5. Copy and save securely

### LanguageTool API Key (Optional - Free Tier Available)
1. Visit https://www.languaggetoolplus.com/
2. Register account
3. Get API key from dashboard

### Google Translate (Optional - Uses free endpoint by default)

## Step 3: Local Development Setup

### Setup with Docker (Recommended)

```bash
# 1. Install Docker and Docker Compose

# 2. Clone repository
git clone <your-repo-url>
cd TextAnalyzerProject

# 3. Create .env file in backend/
cat > backend/.env << EOF
MONGODB_URL=mongodb://mongodb:27017/
DATABASE_NAME=text_analyzer
JWT_SECRET=dev-secret-key-change-in-production
MISTRAL_API_KEY=your-mistral-key
DEBUG=True
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
EOF

# 4. Start services
docker-compose up -d

# 5. Access application
# Frontend: http://localhost:5173
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Manual Setup

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env with your configuration
cp .env.example .env
# Edit .env with your MongoDB URL and API keys

uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Step 4: Vercel Deployment

### 1. Push to GitHub

```bash
# Initialize git if not already done
git add .
git commit -m "Ready for deployment"
git push -u origin main
```

### 2. Connect to Vercel

1. Visit https://vercel.com/new
2. Select "Import Git Repository"
3. Choose your repository
4. Select root directory (if mono-repo)
5. Click "Import"

### 3. Environment Variables

In Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add the following:

```
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
DATABASE_NAME=text_analyzer
JWT_SECRET=your-super-secure-random-key-here
MISTRAL_API_KEY=your-mistral-api-key
LANGUAGE_TOOL_API_KEY=your-language-tool-key
DEBUG=False
ALLOWED_ORIGINS=https://your-domain.vercel.app
```

### 4. Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Your site is live!

**Default URLs:**
- Frontend: `https://your-project-name.vercel.app`
- API: `https://your-project-name.vercel.app/api`
- Docs: `https://your-project-name.vercel.app/api/docs`

## Step 5: Post-Deployment

### 1. Test Authentication
```bash
# Register
curl -X POST https://your-domain.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"TestPass123","email":"test@example.com"}'

# Login
curl -X POST https://your-domain.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"TestPass123"}'
```

### 2. Test OCR/Text Processing
Use Vercel's API documentation at `/api/docs` to test endpoints.

### 3. Monitor Logs
- View logs in Vercel dashboard
- Check MongoDB Atlas for database activity
- Monitor API usage

## Troubleshooting

### MongoDB Connection Issues
- Verify connection string is correct
- Check network access in MongoDB Atlas
- Ensure firewall allows connections

### API Timeout
- Increase maxDuration in vercel.json
- Check MongoDB performance
- Optimize large batch requests

### Build Failures
- Check build logs in Vercel dashboard
- Verify all dependencies in requirements.txt
- Test locally before pushing

## Production Checklist

- [ ] Update JWT_SECRET to strong random value
- [ ] Update allowed CORS origins
- [ ] Enable MongoDB IP whitelist (specific IPs only)
- [ ] Setup SSL/HTTPS (automatic on Vercel)
- [ ] Enable error monitoring (optional)
- [ ] Setup automated backups
- [ ] Create database indexes (done automatically)
- [ ] Test with production data
- [ ] Setup custom domain
- [ ] Monitor costs

## Scaling Considerations

### Database
- Upgrade MongoDB tier as needed
- Enable sharding for large datasets
- Setup read replicas for high traffic

### API
- Increase function memory in vercel.json
- Implement caching strategies
- Setup CDN for static assets

### Frontend
- Enable ISR (Incremental Static Regeneration)
- Optimize images and assets
- Setup analytics

## Maintenance

### Regular Tasks
- Monitor error logs
- Review API usage metrics
- Update dependencies monthly
- Run database maintenance
- Backup important data

### Updates
```bash
# Update dependencies
npm outdated
pip list --outdated

# Test updates locally before deploying
npm update
pip install --upgrade -r requirements.txt
```

## Support Resources

- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **MongoDB Docs:** https://docs.mongodb.com/
- **Vercel Docs:** https://vercel.com/docs
- **React Docs:** https://react.dev/

## Security Best Practices

1. **Never commit .env files**
2. **Use environment variables for secrets**
3. **Enable HTTPS (automatic on Vercel)**
4. **Validate all user inputs**
5. **Use strong JWT secrets (32+ chars)**
6. **Update dependencies regularly**
7. **Monitor suspicious activity**
8. **Implement rate limiting for APIs**

---

**Deployed:** The application is now live and ready for production use!
