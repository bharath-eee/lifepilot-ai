from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import get_database
from app.core.security import get_current_user
from pydantic import BaseModel
from typing import List

router = APIRouter()

class TaskItem(BaseModel):
    title: str
    due: str
    completed: bool
    priority: str

class TaskResponse(BaseModel):
    id: str
    title: str
    due: str
    completed: bool
    priority: str

@router.get("", response_model=List[TaskResponse])
async def get_tasks(current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        return []
    
    user_email = current_user["email"]
    tasks = await db.tasks.find({"email": user_email}).to_list(None)
    
    # Seed default tasks if empty
    if not tasks:
        default_tasks = [
            { "title": "Submit College Assignment", "due": "Friday (Today)", "completed": False, "priority": "Critical", "email": user_email },
            { "title": "Pay Electricity Bill", "due": "Tomorrow", "completed": False, "priority": "High", "email": user_email },
            { "title": "Confirm internship interview timeslot", "due": "In 2 days", "completed": False, "priority": "Critical", "email": user_email }
        ]
        for task in default_tasks:
            await db.tasks.insert_one(task)
        tasks = await db.tasks.find({"email": user_email}).to_list(None)
        
    return [
        TaskResponse(
            id=str(t["_id"]),
            title=t["title"],
            due=t["due"],
            completed=t["completed"],
            priority=t["priority"]
        ) for t in tasks
    ]

@router.post("", response_model=TaskResponse)
async def create_task(task: TaskItem, current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unconnected")
        
    task_doc = task.dict()
    task_doc["email"] = current_user["email"]
    
    result = await db.tasks.insert_one(task_doc)
    return TaskResponse(
        id=str(result.inserted_id),
        title=task.title,
        due=task.due,
        completed=task.completed,
        priority=task.priority
    )

@router.put("/{task_id}/toggle", response_model=TaskResponse)
async def toggle_task(task_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unconnected")
        
    from bson import ObjectId
    task = await db.tasks.find_one({"_id": ObjectId(task_id), "email": current_user["email"]})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    new_completed = not task["completed"]
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {"completed": new_completed}}
    )
    
    return TaskResponse(
        id=task_id,
        title=task["title"],
        due=task["due"],
        completed=new_completed,
        priority=task["priority"]
    )

@router.delete("/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unconnected")
        
    from bson import ObjectId
    result = await db.tasks.delete_one({"_id": ObjectId(task_id), "email": current_user["email"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "success"}
