from core import storage
from core.schema import TableSchema
from core.indexer import Index

class DatabaseEngine:
    def __init__(self):
        self.indices = {} # Stores {table_name: {column_name: Index()}}
        self.schemas = {} # Stores {table_name: TableSchema}
        self._load_existing_metadata()

    def _load_existing_metadata(self):
        """Loads metadata from disk and rebuilds indices."""
        # Note: In a real DB, you'd load metadata.json here.
        # For Milestone 2, we initialize indices manually in the test.
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
        # Performance: Use index if available
        if table_name in self.indices and col in self.indices[table_name]:
            idx = self.indices[table_name][col].get(val)
            return [rows[idx]] if idx is not None else []
        
        # Fallback: Full table scan
        return [r for r in rows if r.get(col) == val]