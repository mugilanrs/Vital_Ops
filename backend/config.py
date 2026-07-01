from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:admin@localhost:5432/vitalops"
    qdrant_url: str = "http://localhost:6333"
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"
    embedding_model: str = "all-MiniLM-L6-v2"
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
