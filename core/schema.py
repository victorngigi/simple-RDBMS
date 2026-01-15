class TableSchema:
    def __init__(self, name, columns, primary_key=None, unique_keys=None):
        """
        :param name: String name of the table
        :param columns: Dict of {column_name: type_string} e.g. {'id': 'int'}
        :param primary_key: String name of the PK column
        :param unique_keys: List of column names that must be unique
        """
        self.name = name
        self.columns = columns
        self.primary_key = primary_key
        self.unique_keys = unique_keys or []

    def validate(self, data):
        """Validates and coerces types for a single row (dict)."""
        if not isinstance(data, dict):
            raise ValueError("Row data must be a dictionary.")

        for col_name, col_type in self.columns.items():
            if col_name not in data:
                raise ValueError(f"Missing column '{col_name}' for table '{self.name}'.")
            
            value = data[col_name]
            try:
                if col_type == 'int':
                    data[col_name] = int(value)
                elif col_type == 'float':
                    data[col_name] = float(value)
                elif col_type == 'str':
                    data[col_name] = str(value)
            except (ValueError, TypeError):
                raise TypeError(f"Column '{col_name}' expected {col_type}, got {type(value).__name__}")

        return data

    def to_dict(self):
        """Helper to save schema definition to metadata.json"""
        return {
            "name": self.name,
            "columns": self.columns,
            "primary_key": self.primary_key,
            "unique_keys": self.unique_keys
        }