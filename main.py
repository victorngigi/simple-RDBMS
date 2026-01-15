from core.engine import DatabaseEngine

def test_milestone_2_engine():
    print("--- Running Milestone 2 Test: Database Engine ---")
    db = DatabaseEngine()

    # 1. Create Table
    print(db.create_table("users", {"id": "int", "name": "str"}, primary_key="id"))

    # 2. Insert Data
    db.insert("users", {"id": 1, "name": "Lucy"})
    db.insert("users", {"id": 2, "name": "Rex"})
    print("✅ Inserted Lucy and Rex")

    # 3. Test Primary Key Violation
    try:
        db.insert("users", {"id": 1, "name": "Duplicate Lucy"})
    except ValueError as e:
        print(f"✅ Successfully blocked duplicate ID: {e}")

    # 4. Test Indexed Selection
    result = db.select("users", where={"id": 2})
    print(f"✅ Indexed Select Result: {result}")
    
    assert len(result) == 1
    assert result[0]['name'] == "Rex"

    print("--- Milestone 2 Complete ---")

if __name__ == "__main__":
    test_milestone_2_engine()