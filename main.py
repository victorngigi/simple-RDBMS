from core.schema import TableSchema
from core import storage

def test_milestone_1_persistence():
    print("--- Running Milestone 1 Test: Persistence ---")
    
    # 1. Setup Table and Data
    user_columns = {"id": "int", "name": "str"}
    schema = TableSchema(name="users", columns=user_columns, primary_key="id")
    valid_row = {"id": 1, "name": "Lucy"}
    
    # 2. Test Saving Schema
    try:
        storage.save_schema(schema.to_dict())
        print("✅ Metadata saved to metadata.json")
    except Exception as e:
        print(f"❌ Failed to save metadata: {e}")

    # 3. Test Saving and Loading Rows
    try:
        rows_to_save = [valid_row]
        storage.save_table_data("users", rows_to_save)
        print("✅ Data saved to users.json")
        
        loaded_rows = storage.load_table_data("users")
        print(f"✅ Data loaded successfully: {loaded_rows}")
        assert loaded_rows == rows_to_save
    except Exception as e:
        print(f"❌ Persistence failed: {e}")

    print("--- Milestone 1 Persistence Complete ---\n")

if __name__ == "__main__":
    # test_milestone_1() # You already passed this!
    test_milestone_1_persistence()