class Index:
    def __init__(self):
        # Maps {value: row_index} e.g., {1: 0, 2: 1}
        self.map = {}

    def add(self, value, row_index):
        if value in self.map:
            return False # Duplicate found
        self.map[value] = row_index
        return True

    def get(self, value):
        return self.map.get(value)

    def remove(self, value):
        if value in self.map:
            del self.map[value]