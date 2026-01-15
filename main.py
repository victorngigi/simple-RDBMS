from core.schema import TableSchema

def test_milestone_1():
    print("--- Running Milestone 1 Test: Schema Validation ---")
    
    # 1. Define a schema for a 'users' table
    user_columns = {
        "id": "int",
        "name": "str",
        "balance": "float"
    }
    schema = TableSchema(name="users", columns=user_columns, primary_key="id")

    # 2. Test valid data
    valid_row = {"id": "1", "name": "Lucy", "balance": "500.50"}
    try:
        cleaned_data = schema.validate(valid_row)
        print(f"✅ Validation Success: {cleaned_data}")
        assert isinstance(cleaned_data['id'], int)
        assert isinstance(cleaned_data['balance'], float)
    except Exception as e:
        print(f"❌ Validation Failed unexpectedly: {e}")

    # 3. Test invalid data (missing column)
    invalid_row = {"id": 2, "name": "Rex"} # missing 'balance'
    try:
        schema.validate(invalid_row)
        print("❌ Failed: Should have caught missing column.")
    except ValueError as e:
        print(f"✅ Successfully caught error: {e}")

    print("--- Milestone 1 Test Complete ---\n")

if __name__ == "__main__":
    # This will be commented out once the REPL is ready
    test_milestone_1()
    
    # Future entry point:
    # from interface.repl import start_repl
    # start_repl()