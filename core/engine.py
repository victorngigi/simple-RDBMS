import os
import json
import shutil  # Required for deleting database directories
from core import storage
from core.schema import TableSchema
from core.indexer import Index

class DatabaseEngine:
    def __init__(self):
        self.active_db = None
        self.indices = {} # Stores {table_name: {column_name: Index()}}
        self.schemas = {} # Stores {table_name: TableSchema}

    # --- DATABASE OPERATIONS ---

    def list_databases(self):
        """Lists all existing database folders in the data directory."""
        if not os.path.exists(storage.BASE_DATA_DIR):
            return []
        return [d for d in os.listdir(storage.BASE_DATA_DIR) 
                if os.path.isdir(os.path.join(storage.BASE_DATA_DIR, d))]

    def set_active_db(self, db_name):
        """Switches context and hydrates memory with DB metadata."""
        self.active_db = db_name
        self.schemas = {}
        self.indices = {}
        
        db_path = storage.ensure_db_dir(db_name)
        metadata_file = os.path.join(db_path, 'metadata.json')
        
        try:
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
            for table_name, schema_dict in metadata.items():
                schema = TableSchema(
                    name=schema_dict['name'],
                    columns=schema_dict['columns'],
                    primary_key=schema_dict.get('primary_key'),
                    unique_keys=schema_dict.get('unique_keys', []),
                    foreign_keys=schema_dict.get('foreign_keys', {}) # Ensure FKs load
                )
                self.schemas[table_name] = schema
                self.indices[table_name] = {}
                
                if schema.primary_key:
                    self.indices[table_name][schema.primary_key] = Index()
                    rows = storage.load_table_data(db_name, table_name)
                    for idx, r in enumerate(rows):
                        pk_value = r[schema.primary_key]
                        self.indices[table_name][schema.primary_key].add(pk_value, idx)
        except (FileNotFoundError, json.JSONDecodeError):
            pass

    def delete_database(self, db_name):
        """Physically removes the database directory."""
        db_path = os.path.join(storage.BASE_DATA_DIR, db_name)
        if os.path.exists(db_path):
            shutil.rmtree(db_path)
            if self.active_db == db_name:
                self.active_db = None
                self.schemas = {}
                self.indices = {}
            return f"Database '{db_name}' dropped."
        raise ValueError(f"Database '{db_name}' not found.")

    # --- TABLE OPERATIONS ---

    def create_table(self, name, columns, primary_key=None, unique_keys=None, foreign_keys=None):
        if not self.active_db:
            raise ValueError("Please select or create a database first.")
            
        schema = TableSchema(name, columns, primary_key, unique_keys, foreign_keys)
        self.schemas[name] = schema
        self.indices[name] = {}
        
        if primary_key:
            self.indices[name][primary_key] = Index()
            
        storage.save_schema(self.active_db, schema.to_dict())
        storage.save_table_data(self.active_db, name, []) 
        return f"Table '{name}' created successfully in '{self.active_db}'."

    def drop_table(self, table_name):
        """Deletes table data and metadata entry."""
        if not self.active_db:
            raise ValueError("No active database selected.")
        
        # Remove from memory
        self.schemas.pop(table_name, None)
        self.indices.pop(table_name, None)

        # Update metadata.json on disk
        db_path = storage.ensure_db_dir(self.active_db)
        metadata_file = os.path.join(db_path, 'metadata.json')
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
        
        if table_name in metadata:
            del metadata[table_name]
            with open(metadata_file, 'w') as f:
                json.dump(metadata, f, indent=4)

        # Delete JSON file
        file_path = os.path.join(db_path, f"{table_name}.json")
        if os.path.exists(file_path):
            os.remove(file_path)
        return f"Table '{table_name}' dropped."

    # --- ROW OPERATIONS ---

    def insert(self, table_name, row_data):
        if not self.active_db:
            raise ValueError("No active database selected.")
        
        schema = self.schemas[table_name]
        data = schema.validate(row_data)
        
        rows = storage.load_table_data(self.active_db, table_name)
        
        # Primary Key Check
        if schema.primary_key:
            pk_val = data.get(schema.primary_key)
            if any(r.get(schema.primary_key) == pk_val for r in rows):
                raise ValueError(f"PK Integrity Error: {pk_val} already exists.")

        # Foreign Key Check
        if hasattr(schema, 'foreign_keys') and schema.foreign_keys:
            for local_col, reference in schema.foreign_keys.items():
                parent_table, parent_col = reference.split('.')
                parent_rows = storage.load_table_data(self.active_db, parent_table)
                fk_val = data.get(local_col)
                if not any(pr.get(parent_col) == fk_val for pr in parent_rows):
                    raise ValueError(f"FK Integrity Error: Value '{fk_val}' not found in {parent_table}.")

        rows.append(data)
        storage.save_table_data(self.active_db, table_name, rows)
        return "Row inserted."

    def update(self, table_name, pk_value, updated_fields):
        """Finds row by PK and merges new fields."""
        if not self.active_db:
            raise ValueError("No active database.")
        
        schema = self.schemas[table_name]
        rows = storage.load_table_data(self.active_db, table_name)
        pk_col = schema.primary_key
        
        updated = False
        for i, row in enumerate(rows):
            if str(row.get(pk_col)) == str(pk_value):
                new_row = {**row, **updated_fields}
                rows[i] = schema.validate(new_row)
                updated = True
                break

        if updated:
            storage.save_table_data(self.active_db, table_name, rows)
            self.set_active_db(self.active_db) # Refresh memory/indices
            return f"Record {pk_value} updated."
        raise ValueError(f"Record {pk_value} not found.")

    def delete(self, table_name, where):
        """Deletes rows matching 'where' criteria."""
        if not self.active_db:
            raise ValueError("No active database.")
        
        rows = storage.load_table_data(self.active_db, table_name)
        new_rows = [
            r for r in rows 
            if not all(str(r.get(k)) == str(v) for k, v in where.items())
        ]
        
        storage.save_table_data(self.active_db, table_name, new_rows)
        self.set_active_db(self.active_db) # Refresh indices
        return f"Deleted {len(rows) - len(new_rows)} row(s)."

    def select(self, table_name, where=None):
        if not self.active_db:
            raise ValueError("No active database selected.")
        rows = storage.load_table_data(self.active_db, table_name)
        if not where:
            return rows
        
        schema = self.schemas[table_name]
        col, val = list(where.items())[0]
        
        target_type = schema.columns.get(col)
        if target_type == 'int': 
            val = int(val)
        elif target_type == 'float': 
            val = float(val)

        if table_name in self.indices and col in self.indices[table_name]:
            idx = self.indices[table_name][col].get(val)
            return [rows[idx]] if idx is not None else []
        
        return [r for r in rows if r.get(col) == val]

    def join(self, table_a_name, table_b_name, join_col_a, join_col_b):
        if not self.active_db:
            raise ValueError("No active database selected.")
        rows_a = storage.load_table_data(self.active_db, table_a_name)
        rows_b = storage.load_table_data(self.active_db, table_b_name)
        
        joined_results = []
        for row_a in rows_a:
            for row_b in rows_b:
                if row_a.get(join_col_a) == row_b.get(join_col_b):
                    combined = row_a.copy()
                    for key, value in row_b.items():
                        new_key = key if key not in combined else f"{table_b_name}_{key}"
                        combined[new_key] = value
                    joined_results.append(combined)        
        return joined_results
    def save_metadata(self, table_name=None):
            """Persists the current memory schemas to metadata.json on disk."""
            if not self.active_db:
                return
                
            db_path = storage.ensure_db_dir(self.active_db)
            metadata_file = os.path.join(db_path, 'metadata.json')
            
            # 1. Load existing metadata
            metadata = {}
            if os.path.exists(metadata_file):
                with open(metadata_file, 'r') as f:
                    try:
                        metadata = json.load(f)
                    except json.JSONDecodeError:
                        metadata = {}

            # 2. Update metadata with current memory state for the tables
            for name, schema in self.schemas.items():
                metadata[name] = schema.to_dict()

            # 3. Save back to disk
            with open(metadata_file, 'w') as f:
                json.dump(metadata, f, indent=4) 
                  
    def remove_column(self, table_name, col_name):
        """Removes an attribute from schema and physically purges it from disk."""
        if not self.active_db:
            raise ValueError("No active database session.")
        
        schema = self.schemas.get(table_name)
        if not schema:
            raise ValueError(f"Entity '{table_name}' not found.")
            
        # SAFETY GATE: Protecting the Primary Key
        if col_name == schema.primary_key:
            raise ValueError("Integrity Violation: Cannot drop the Primary Key.")

        # 1. Update Memory Schema
        if col_name in schema.columns:
            del schema.columns[col_name]
        
        # 2. Persist Metadata change
        self.save_metadata()

        # 3. Physical Data Purge (Data Surgery)
        rows = storage.load_table_data(self.active_db, table_name)
        for row in rows:
            row.pop(col_name, None) # Remove key if it exists
        
        # 4. Write cleaned data back to disk
        storage.save_table_data(self.active_db, table_name, rows)
        return f"Attribute '{col_name}' successfully purged from {table_name}." 