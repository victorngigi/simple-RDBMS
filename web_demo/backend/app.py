from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
from core.engine import DatabaseEngine

# 1. Initialize the engine globally so all routes can access it
db = DatabaseEngine()

# 2. Modern Lifespan Handler (replaces @app.on_event)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP: Initialize your tables if they don't exist
    print("🚀 PesaDB Startup: Checking table schemas...")
    
    # Ensure Students Table exists
    if "students" not in db.schemas:
        db.create_table(
            "students", 
            {"id": "int", "name": "str", "major": "str"}, 
            primary_key="id"
        )
    
    # Ensure Enrollments Table exists (for Join demo)
    if "enrollments" not in db.schemas:
        db.create_table(
            "enrollments", 
            {"id": "int", "student_id": "int", "course_name": "str"}, 
            primary_key="id"
        )
    
    yield  # The app runs while yielded
    
    # SHUTDOWN: Logic for when the server stops (optional)
    print("🛑 PesaDB Shutdown: Closing database connections...")

# 3. Create the FastAPI app instance
app = FastAPI(lifespan=lifespan)

# 4. CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Data Models ---
class Student(BaseModel):
    id: int
    name: str
    major: str

# --- API Routes ---

@app.get("/")
def read_root():
    return {
        "status": "PesaDB API is Online",
        "tables_loaded": list(db.schemas.keys())
    }

@app.get("/students")
def get_students():
    return db.select("students")

@app.post("/students")
def add_student(student: Student):
    try:
        return db.insert("students", student.model_dump()) 
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/students/{student_id}")
def update_student(student_id: int, student: Student):
    try:
        # Pass the filter and the new data to your engine
        return db.update("students", {"id": student_id}, student.model_dump())
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/students/{student_id}")
def delete_student(student_id: int):
    return db.delete("students", {"id": student_id})

@app.get("/enrollment-report")
def get_enrollment_report():
    """
    Relational Join demonstration linking Students and Enrollments.
    """
    try:
        report = db.join(
            table_a_name="students", 
            table_b_name="enrollments", 
            join_col_a="id",          # Primary Key
            join_col_b="student_id"   # Foreign Key
        )
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Join Error: {str(e)}")