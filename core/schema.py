class Table:
    def __init__(self, name, columns):
        self.name = name
        self.columns = columns  # Dictionary of column_name: type (e.g., {'email': 'string', 'age': 'int'})
        self.data = [] # List of dictionaries, where each dictionary is a row

    def add_row(self, row_data):
        # Basic type checking (can be expanded)
        if not isinstance(row_data, dict):
            raise ValueError("Row data must be a dictionary.")

        for col_name, col_type in self.columns.items():
            if col_name not in row_data:
                raise ValueError(f"Missing column '{col_name}' in row data.")
            # Add more robust type checking here if needed
            # For example:
            # if col_type == 'int' and not isinstance(row_data[col_name], int):
            #     raise TypeError(f"Expected int for column '{col_name}', got {type(row_data[col_name])}.")
            # if col_type == 'string' and not isinstance(row_data[col_name], str):
            #     raise TypeError(f"Expected string for column '{col_name}', got {type(row_data[col_name])}.")

        self.data.append(row_data)

    def get_rows(self):
        return self.data

    def __repr__(self):
        return f"Table(name='{self.name}', columns={self.columns}, rows={len(self.data)})"
