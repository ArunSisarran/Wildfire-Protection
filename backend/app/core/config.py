from pydantic import BaseModel


class Settings(BaseModel):
    project_name: str = "Wildfire Protection API"
    api_v1_prefix: str = "/api"


settings = Settings()


