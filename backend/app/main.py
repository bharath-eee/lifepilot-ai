from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.api.v1.api import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic: connect to MongoDB
    try:
        await connect_to_mongo()
    except Exception as e:
        print(f"Startup MongoDB connection warning: {e}")
    yield
    # Shutdown logic: close connections
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Intelligent personal productivity assistant combining LLMs, emails, calendar, tasks, and automations.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware configuration
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Register routers
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "message": "Welcome to LifePilot AI API. Visit /docs for Swagger documentation.",
        "project": settings.PROJECT_NAME
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
