from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import the main FastAPI app from the new structure
from app.api.fems_fastapi import app

# Get frontend URL from environment or use default
frontend_url = os.getenv("FRONTEND_URL", "https://wildfire-protection.vercel.app")

# Update CORS settings for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        frontend_url,
        "http://localhost:3000",  # For local development
        "https://*.vercel.app",  # Allow all Vercel previews
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Add a simple health check endpoint
@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
