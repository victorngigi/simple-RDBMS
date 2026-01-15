# web_demo/backend/app.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from core.engine import DatabaseEngine # Ensure core is in your PYTHONPATH

app = FastAPI()
db = DatabaseEngine()

# Add CORS so your Vite frontend can talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Student(BaseModel):
    id: int
    name: str
    major: str

@app.get("/students")
def get_students():
    # Uses your custom RDBMS select logic
    return db.select("students")

@app.post("/students")
def add_student(student: Student):
    try:
        # Pass the validated Pydantic dict to your custom engine
        return db.insert("students", student.model_dump()) 
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@app.get("/")
def read_root():
    return {
        "status": "PesaDB API is Online",
        "tables_loaded": list(db.schemas.keys())
    }