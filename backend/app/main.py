from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router
import os


def create_app() -> FastAPI:
    app = FastAPI(title="Wildfire Protection API", version="0.1.0")

    # Get frontend URL from environment or use default
    frontend_url = os.getenv("FRONTEND_URL", "https://frontend-l4dndu693-zhuolin-lis-projects.vercel.app")
    
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

    @app.get("/health")
    async def health() -> dict:
        return {"status": "ok"}

    app.include_router(api_router)

    return app


app = create_app()


