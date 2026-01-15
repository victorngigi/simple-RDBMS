import json
import os

# Path to the data directory relative to the project root
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
METADATA_FILE = os.path.join(DATA_DIR, 'metadata.json')

def ensure_data_dir():
    """Creates the data directory if it doesn't exist."""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    if not os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, 'w') as f:
            json.dump({}, f)

def save_schema(schema_dict):
    """Saves a table definition to metadata.json."""
    ensure_data_dir()
    with open(METADATA_FILE, 'r') as f:
        metadata = json.load(f)
    
    metadata[schema_dict['name']] = schema_dict
    
    with open(METADATA_FILE, 'w') as f:
        json.dump(metadata, f, indent=4)

def save_table_data(table_name, rows):
    """Saves a list of rows to data/{table_name}.json."""
    ensure_data_dir()
    file_path = os.path.join(DATA_DIR, f"{table_name}.json")
    with open(file_path, 'w') as f:
        json.dump(rows, f, indent=4)

def load_table_data(table_name):
    """Loads a list of rows from data/{table_name}.json."""
    file_path = os.path.join(DATA_DIR, f"{table_name}.json")
    if not os.path.exists(file_path):
        return []
    with open(file_path, 'r') as f:
        return json.load(f)