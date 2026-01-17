from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from core.engine import DatabaseEngine
import re 
# Initialize the engine globally
db = DatabaseEngine()
app = FastAPI(title="PesaDB API")

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database Management ---

@app.get("/databases")
def list_dbs():
    """Lists all available logical databases in the data/ directory."""
    return db.list_databases()


# --- Table & Schema Management ---

@app.get("/{db_name}/tables")
def get_tables(db_name: str):
    """Switches context to db_name and returns all loaded schemas."""
    db.set_active_db(db_name)
    return list(db.schemas.keys())

# Fix for "Add New DB"
@app.post("/databases")
def create_db(payload: dict):
    # The frontend sends { name: "db_name" }
    db_name = payload.get("name")
    if not db_name:
        raise HTTPException(status_code=400, detail="Database name is required")
    
    # This must trigger directory creation in core/storage.py
    db.set_active_db(db_name)
    return {"status": "success", "message": f"Database '{db_name}' initialized"}

# Fix for "Add New Table"
@app.post("/{db_name}/tables")
def create_table(db_name: str, payload: dict):
    # Set the engine context first
    db.set_active_db(db_name)
    
    table_name = payload.get("name")
    if not table_name:
        raise HTTPException(status_code=400, detail="Table name is required")
        
    # We provide a default schema if the UI doesn't send one yet
    # This ensures the "New Table" button doesn't crash the engine
    columns = payload.get("columns", {"id": "int", "name": "str", "major": "str"})
    pk = payload.get("primary_key", "id")
    
    try:
        return db.create_table(table_name, columns, primary_key=pk)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Data Operations (CRUD) ---

@app.get("/{db_name}/{table_name}/rows")
def get_rows(db_name: str, table_name: str):
    db.set_active_db(db_name)
    rows = db.select(table_name)
    # Fetch the schema columns so the UI knows what to show even if rows are empty
    schema = db.schemas.get(table_name)
    columns = list(schema.columns.keys()) if schema else []
    return {"rows": rows, "columns": columns}

# web_demo/backend/app.py

@app.post("/{db_name}/{table_name}/rows")
def insert_generic_row(db_name: str, table_name: str, row: dict):
    """Inserts a record into the specified database and table."""
    try:
        db.set_active_db(db_name) # Ensure engine is in the right folder
        result = db.insert(table_name, row) # Validates and persists
        return {"status": "success", "message": result}
    except ValueError as e:
        # This catches schema validation or duplicate PK errors
        raise HTTPException(status_code=400, detail=str(e))
# --- Database Deletion ---
@app.delete("/databases/{db_name}")
def delete_database(db_name: str):
    try:
        # storage.delete_db_dir would be a new util to remove the folder
        db.delete_database(db_name) 
        return {"status": "Database dropped"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Table Deletion ---
@app.delete("/{db_name}/{table_name}")
def drop_table(db_name: str, table_name: str):
    db.set_active_db(db_name)
    try:
        # Engine needs a drop_table method to remove the .json and metadata entry
        db.drop_table(table_name)
        return {"status": "Table dropped"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Row Deletion ---
@app.delete("/{db_name}/{table_name}/rows/{row_id}")
def delete_row(db_name: str, table_name: str, row_id: str):
    db.set_active_db(db_name)
    # We use the PK to find and delete
    pk_col = db.schemas[table_name].primary_key
    return db.delete(table_name, {pk_col: row_id})

@app.put("/{db_name}/{table_name}/rows/{row_id}")
def update_row_route(db_name: str, table_name: str, row_id: str, payload: dict):
    try:
        db.set_active_db(db_name)
        # payload should contain the fields to change, e.g., {"name": "New Name"}
        return {"message": db.update(table_name, row_id, payload)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@app.get("/{db_name}/join")
def perform_join(
    db_name: str, 
    table_a: str, 
    table_b: str, 
    col_a: str, 
    col_b: str
):
    db.set_active_db(db_name)
    try:
        # Calls your existing DatabaseEngine.join() method
        results = db.join(table_a, table_b, col_a, col_b)
        
        # We also need to send the column names for the UI to build the table headers
        if results:
            columns = list(results[0].keys())
        else:
            columns = []
            
        return {"rows": results, "columns": columns}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@app.post("/shell")
def execute_raw_command(payload: dict):
    raw_cmd = payload.get("command", "").strip()
    if not raw_cmd:
        raise HTTPException(status_code=400, detail="Empty command")

    #0. HELP COMMAND
    if raw_cmd.upper() == "HELP":
        help_text = (
            "Available PesaDB Commands:\n"
            "--------------------------\n"
            "USE <db_name>               : Switch to a specific logical database.\n"
            "CREATE DATABASE <db_name>   : Initialize a new logical cluster.\n"
            "SELECT FROM <table_name>    : Retrieve all records from an entity.\n"
            "INSERT INTO <table_name> {data} : Commit a record (e.g. {'id': 1}).\n"
            "DROP DATABASE <db_name>     : Permanently delete a database cluster.\n"
            "DROP TABLE <table_name>        : Delete a table and its associated data.\n"
            "CLEAR                       : Clear terminal history."
        )
        return {"status": "success", "message": help_text}

    # 1. USE DATABASE <db_name>
    match = re.match(r"USE\s+(\w+)", raw_cmd, re.IGNORECASE)
    if match:
        db_name = match.group(1)
        db.set_active_db(db_name)
        return {"status": "success", "message": f"Switched to database: {db_name}"}

    # 2. CREATE DATABASE <db_name>
    match = re.match(r"CREATE\s+DATABASE\s+(\w+)", raw_cmd, re.IGNORECASE)
    if match:
        db_name = match.group(1)
        db.set_active_db(db_name)
        return {"status": "success", "message": f"Database {db_name} created."}

    # 3. SELECT * FROM <table_name>
    match = re.match(r"SELECT\s+\*\s+FROM\s+(\w+)", raw_cmd, re.IGNORECASE)
    if match:
        if not db.active_db: 
            raise HTTPException(status_code=400, detail="No active DB")
        table_name = match.group(1)
        rows = db.select(table_name)
        return {"status": "success", "data": rows, "message": f"Fetched {len(rows)} rows."}

    # 4. INSERT INTO <table_name> VALUES (k:v, k:v)
    # Simple parser: INSERT INTO table {id:1, name:victor}
    match = re.match(r"INSERT\s+INTO\s+(\w+)\s+(.+)", raw_cmd, re.IGNORECASE)
    if match:
        table_name = match.group(1)
        try:
            # Note: In a real system, use a safer JSON parser
            import ast
            data = ast.literal_eval(match.group(2))
            msg = db.insert(table_name, data)
            return {"status": "success", "message": msg}
        except Exception:
            raise HTTPException(status_code=400, detail="Malformed data. Use {key:val}")

    return {"status": "error", "message": f"Command not recognized: {raw_cmd}"}