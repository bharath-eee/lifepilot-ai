from fastapi import APIRouter
from app.core.database import get_database
from app.api.v1.auth import router as auth_router
from app.api.v1.emails import router as emails_router
from app.api.v1.chat import router as chat_router
from app.api.v1.tasks import router as tasks_router
from app.api.v1.bills import router as bills_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(emails_router, prefix="/emails", tags=["Emails"])
api_router.include_router(chat_router, prefix="/chat", tags=["Chat"])
api_router.include_router(tasks_router, prefix="/tasks", tags=["Tasks"])
api_router.include_router(bills_router, prefix="/bills", tags=["Bills"])

@api_router.get("/health", tags=["Health"])
async def health_check():
    db = get_database()
    db_status = "unconnected"
    if db is not None:
        try:
            await db.client.admin.command('ping')
            db_status = "healthy"
        except Exception as e:
            db_status = f"error: {str(e)}"
            
    return {
        "status": "healthy",
        "database": db_status,
        "service": "LifePilot AI Backend v1 API"
    }
