from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from core.engine import DatabaseEngine
import re
import ast

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

# --- Helper Validation ---
def check_db_exists(db_name: str):
    """Utility to verify if the logical cluster exists on disk."""
    if db_name not in db.list_databases():
        raise HTTPException(
            status_code=404, 
            detail=f"Database '{db_name}' does not exist. Use 'CREATE DATABASE {db_name}' first."
        )

# --- Database Management ---

@app.get("/databases")
def list_dbs():
    return db.list_databases()

@app.post("/databases")
def create_db(payload: dict):
    db_name = payload.get("name")
    if not db_name:
        raise HTTPException(status_code=400, detail="Database name is required")
    db.set_active_db(db_name)
    return {"status": "success", "message": f"Database '{db_name}' initialized"}

@app.delete("/databases/{db_name}")
def delete_database(db_name: str):
    try:
        db.delete_database(db_name) 
        return {"status": "Database dropped"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Table & Schema Management ---

@app.get("/{db_name}/tables")
def get_tables(db_name: str):
    check_db_exists(db_name)
    db.set_active_db(db_name)
    return list(db.schemas.keys())

@app.post("/{db_name}/tables")
def create_table(db_name: str, payload: dict):
    check_db_exists(db_name)
    db.set_active_db(db_name)
    table_name = payload.get("name")
    if not table_name:
        raise HTTPException(status_code=400, detail="Table name is required")
    columns = payload.get("columns", {"id": "str", "name": "str"})
    pk = payload.get("primary_key", "id")
    try:
        return db.create_table(table_name, columns, primary_key=pk)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/{db_name}/{table_name}")
def drop_table(db_name: str, table_name: str):
    db.set_active_db(db_name)
    try:
        db.drop_table(table_name)
        return {"status": "Table dropped"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Data Operations (CRUD) ---

@app.get("/{db_name}/{table_name}/rows")
def get_rows(db_name: str, table_name: str):
    db.set_active_db(db_name)
    rows = db.select(table_name)
    schema = db.schemas.get(table_name)
    columns = list(schema.columns.keys()) if schema else []
    return {"rows": rows, "columns": columns}

@app.post("/{db_name}/{table_name}/rows")
def insert_generic_row(db_name: str, table_name: str, row: dict):
    try:
        db.set_active_db(db_name)
        result = db.insert(table_name, row)
        return {"status": "success", "message": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/{db_name}/{table_name}/rows/{row_id}")
def update_row_route(db_name: str, table_name: str, row_id: str, payload: dict):
    try:
        db.set_active_db(db_name)
        return {"message": db.update(table_name, row_id, payload)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/{db_name}/join")
def perform_join(db_name: str, table_a: str, table_b: str, col_a: str, col_b: str):
    db.set_active_db(db_name)
    try:
        results = db.join(table_a, table_b, col_a, col_b)
        columns = list(results[0].keys()) if results else []
        return {"rows": results, "columns": columns}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- PesaDB Bash Shell Logic ---

@app.post("/shell")
def execute_raw_command(payload: dict):
    raw_cmd = payload.get("command", "").strip()
    if not raw_cmd:
        raise HTTPException(status_code=400, detail="Empty command")

    # 0. HELP COMMAND
    if raw_cmd.upper() == "HELP":
        return {"status": "success", "message": (
            "Available PesaDB Commands:\n"
            "USE <db_name>               : Switch to a specific database.\n"
            "CREATE DATABASE <db_name>   : Initialize a new logical cluster.\n"
            "DROP DATABASE <db_name>     : Delete a database cluster.\n"
            "SELECT FROM <table_name>    : Retrieve records.\n"
            "INSERT INTO <table_name> {d} : Commit a record.\n"
            "DROP TABLE <table_name>     : Delete a table.\n"
            "CLEAR                       : Clear terminal history."
        )}

    # 1. USE <db_name> (With Validation)
    match = re.match(r"USE\s+(\w+)", raw_cmd, re.IGNORECASE)
    if match:
        db_name = match.group(1)
        if db_name not in db.list_databases():
            raise HTTPException(status_code=404, detail=f"Database '{db_name}' not found.")
        db.set_active_db(db_name)
        return {"status": "success", "message": f"Switched to database: {db_name}"}

    # 2. CREATE DATABASE <db_name>
    match = re.match(r"CREATE\s+DATABASE\s+(\w+)", raw_cmd, re.IGNORECASE)
    if match:
        db_name = match.group(1)
        db.set_active_db(db_name)
        return {"status": "success", "message": f"Database {db_name} created."}

    # 3. DROP DATABASE <db_name>
    match = re.match(r"DROP\s+DATABASE\s+(\w+)", raw_cmd, re.IGNORECASE)
    if match:
        db_name = match.group(1)
        try:
            db.delete_database(db_name)
            return {"status": "success", "message": f"Database {db_name} deleted."}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    # 4. SELECT FROM <table_name>
    match = re.match(r"SELECT\s+FROM\s+(\w+)", raw_cmd, re.IGNORECASE)
    if match:
        if not db.active_db: 
            raise HTTPException(status_code=400, detail="No active DB")
        table_name = match.group(1)
        rows = db.select(table_name)
        return {"status": "success", "message": f"Fetched {len(rows)} rows."}

    # 5. INSERT INTO <table_name> VALUES
    match = re.match(r"INSERT\s+INTO\s+(\w+)\s+(.+)", raw_cmd, re.IGNORECASE)
    if match:
        table_name = match.group(1)
        try:
            data = ast.literal_eval(match.group(2))
            msg = db.insert(table_name, data)
            return {"status": "success", "message": msg}
        except Exception:
            raise HTTPException(status_code=400, detail="Malformed data. Use {key:val}")

    # 6. DROP TABLE <table_name>
    match = re.match(r"DROP\s+TABLE\s+(\w+)", raw_cmd, re.IGNORECASE)
    if match:
        if not db.active_db: 
            raise HTTPException(status_code=400, detail="No active DB")
        table_name = match.group(1)
        try:
            db.drop_table(table_name)
            return {"status": "success", "message": f"Table {table_name} dropped."}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    return {"status": "error", "message": f"Command not recognized: {raw_cmd}"}