import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
from app.config import APP_NAME, APP_VERSION, DEBUG, ALLOWED_ORIGINS
from app.database import MongoDB
from app.routes import auth
from app.models import ErrorResponse

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if DEBUG else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="Professional text analysis API with OCR, grammar checking, and translation"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add custom exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "HTTP Exception",
            "detail": exc.detail,
            "status_code": exc.status_code,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": str(exc) if DEBUG else "An error occurred",
            "status_code": 500,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

# Startup and shutdown events
@app.on_event("startup")
async def startup():
    """Connect to MongoDB on startup"""
    logger.info(f"Starting {APP_NAME} v{APP_VERSION}")
    MongoDB.connect_db()

@app.on_event("shutdown")
async def shutdown():
    """Close MongoDB connection on shutdown"""
    logger.info("Shutting down application")
    MongoDB.close_db()

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app": APP_NAME,
        "version": APP_VERSION,
        "timestamp": datetime.utcnow().isoformat()
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": f"Welcome to {APP_NAME}",
        "version": APP_VERSION,
        "docs": "/docs"
    }

# Include routers
app.include_router(auth.router)

# Import and include other routers
from app.routes import ocr, text, history, batch
app.include_router(ocr.router)
app.include_router(text.router)
app.include_router(history.router)
app.include_router(batch.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=DEBUG
    )
