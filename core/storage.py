import json
import os

# Root data directory
BASE_DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')

def ensure_db_dir(db_name):
    """Creates the specific database directory and its metadata file."""
    db_path = os.path.join(BASE_DATA_DIR, db_name)
    if not os.path.exists(db_path):
        os.makedirs(db_path)
    
    metadata_path = os.path.join(db_path, 'metadata.json')
    if not os.path.exists(metadata_path):
        with open(metadata_path, 'w') as f:
            json.dump({}, f)
    return db_path

def save_schema(db_name, schema_dict):
    """Saves a table definition to the specific database's metadata.json."""
    db_path = ensure_db_dir(db_name)
    metadata_file = os.path.join(db_path, 'metadata.json')
    
    with open(metadata_file, 'r') as f:
        metadata = json.load(f)
    
    metadata[schema_dict['name']] = schema_dict
    
    with open(metadata_file, 'w') as f:
        json.dump(metadata, f, indent=4)

def save_table_data(db_name, table_name, rows):
    """Saves rows to data/{db_name}/{table_name}.json."""
    db_path = ensure_db_dir(db_name)
    file_path = os.path.join(db_path, f"{table_name}.json")
    with open(file_path, 'w') as f:
        json.dump(rows, f, indent=4)

def load_table_data(db_name, table_name):
    """Loads rows from data/{db_name}/{table_name}.json."""
    file_path = os.path.join(BASE_DATA_DIR, db_name, f"{table_name}.json")
    if not os.path.exists(file_path):
        return []
    with open(file_path, 'r') as f:
        return json.load(f)