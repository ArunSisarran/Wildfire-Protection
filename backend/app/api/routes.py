from fastapi import APIRouter


router = APIRouter(prefix="/api", tags=["api"])


@router.get("/hello")
async def hello(name: str = "world") -> dict:
    return {"message": f"Hello, {name}!"}


