from core import storage
from core.schema import TableSchema
from core.indexer import Index
from core.storage import ensure_data_dir

class DatabaseEngine:
    def __init__(self):
        self.indices = {} # Stores {table_name: {column_name: Index()}}
        self.schemas = {} # Stores {table_name: TableSchema}
        self._load_existing_metadata()

    def _load_existing_metadata(self):
        """Loads metadata from disk and rebuilds indices."""
        ensure_data_dir()
        try:
            with open(storage.METADATA_FILE, 'r') as f:
                metadata = storage.json.load(f)
            for table_name, schema_dict in metadata.items():
                schema = TableSchema(
                    name=schema_dict['name'],
                    columns=schema_dict['columns'],
                    primary_key=schema_dict.get('primary_key'),
                    unique_keys=schema_dict.get('unique_keys', [])
                )
                self.schemas[table_name] = schema
                self.indices[table_name] = {}
                
                # Rebuild indices for primary key
                if schema.primary_key:
                    self.indices[table_name][schema.primary_key] = Index()
                    rows = storage.load_table_data(table_name)
                    for idx, row in enumerate(rows):
                        pk_value = row[schema.primary_key]
                        self.indices[table_name][schema.primary_key].add(pk_value, idx)
        except (FileNotFoundError, storage.json.JSONDecodeError):
            # No existing metadata
            pass
        

    def create_table(self, name, columns, primary_key=None, unique_keys=None):
        schema = TableSchema(name, columns, primary_key, unique_keys)
        self.schemas[name] = schema
        self.indices[name] = {}
        
        # Initialize index for primary key
        if primary_key:
            self.indices[name][primary_key] = Index()
            
        storage.save_schema(schema.to_dict())
        storage.save_table_data(name, []) # Create empty file
        return f"Table '{name}' created successfully."

    def insert(self, table_name, row_data):
        if table_name not in self.schemas:
            raise ValueError(f"Table '{table_name}' does not exist.")

        schema = self.schemas[table_name]
        data = schema.validate(row_data) # Milestone 1 logic
        
        # Load existing rows
        rows = storage.load_table_data(table_name)
        
        # Check Primary Key Constraint
        pk = schema.primary_key
        if pk:
            pk_value = data[pk]
            index = self.indices[table_name][pk]
            if index.get(pk_value) is not None:
                raise ValueError(f"Integrity Error: Duplicate Primary Key '{pk_value}'")
            
            # Update index with the new row's position
            index.add(pk_value, len(rows))

        # Append and Save
        rows.append(data)
        storage.save_table_data(table_name, rows)
        return "Row inserted successfully."

    def select(self, table_name, where=None):
        """Simple select with an optional {column: value} filter."""
        rows = storage.load_table_data(table_name)
        if not where:
            return rows
        
        col, val = list(where.items())[0]
        schema = self.schemas[table_name]
        # Performance: Use index if available
        target_type = schema.columns.get(col)
        if target_type == 'int':
            val = int(val)
        elif target_type == 'float':
            val = float(val)
        if table_name in self.indices and col in self.indices[table_name]:
            idx = self.indices[table_name][col].get(val)
            return [rows[idx]] if idx is not None else []
        
        # Fallback: Full table scan
        return [r for r in rows if r.get(col) == val]
    
    def update(self, table_name, where, new_data):
            """Updates records matching the 'where' criteria."""
            rows = storage.load_table_data(table_name)
            schema = self.schemas[table_name]
            count = 0

            for i, row in enumerate(rows):
                # Check if row matches 'where' (e.g., {'id': 1})
                match = all(row.get(k) == v for k, v in where.items())
                if match:
                    # Update row and re-validate
                    updated_row = {**row, **new_data}
                    rows[i] = schema.validate(updated_row)
                    count += 1
            
            storage.save_table_data(table_name, rows)
            # Re-build indices because values changed
            self._load_existing_metadata() 
            return f"Updated {count} row(s)."

    def delete(self, table_name, where):
        """Deletes records matching the 'where' criteria."""
        rows = storage.load_table_data(table_name)
        # Filter out the rows that match the 'where' condition
        new_rows = [r for r in rows if not all(r.get(k) == v for k, v in where.items())]
        
        deleted_count = len(rows) - len(new_rows)
        storage.save_table_data(table_name, new_rows)
        # Re-build indices to remove deleted keys
        self._load_existing_metadata()
        return f"Deleted {deleted_count} row(s)."    
    
    def join(self, table_a_name, table_b_name, join_col_a, join_col_b):
        """
        Performs an Inner Join between two tables.
        Returns a list of combined dictionaries.
        """
        # Load both datasets
        rows_a = storage.load_table_data(table_a_name)
        rows_b = storage.load_table_data(table_b_name)
        
        joined_results = []

        # Nested Loop Join Algorithm
        for row_a in rows_a:
            for row_b in rows_b:
                # Check if the join condition is met
                if row_a.get(join_col_a) == row_b.get(join_col_b):
                    # Merge dictionaries (handle overlapping column names)
                    combined = row_a.copy()
                    for key, value in row_b.items():
                        # If a key exists in both, prefix the second one
                        new_key = key if key not in combined else f"{table_b_name}_{key}"
                        combined[new_key] = value
                    joined_results.append(combined)        
        
        return joined_results