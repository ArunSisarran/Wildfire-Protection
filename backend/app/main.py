from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router


def create_app() -> FastAPI:
    app = FastAPI(title="Wildfire Protection API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health() -> dict:
        return {"status": "ok"}

    app.include_router(api_router)

    return app


app = create_app()


