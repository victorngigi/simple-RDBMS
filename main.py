from core.engine import DatabaseEngine

def test_milestone_2_joins():
    print("--- Running Milestone 2.5 Test: Relational Joins ---")
    db = DatabaseEngine()

    # 1. Setup Tables
    db.create_table("users", {"id": "int", "name": "str"}, primary_key="id")
    db.create_table("posts", {"p_id": "int", "user_id": "int", "content": "str"}, primary_key="p_id")

    # 2. Insert Data
    db.insert("users", {"id": 1, "name": "Lucy"})
    db.insert("posts", {"p_id": 101, "user_id": 1, "content": "Hello PesaDB!"})
    db.insert("posts", {"p_id": 102, "user_id": 1, "content": "Learning RDBMS is fun."})

    # 3. Perform Join
    # Link users.id to posts.user_id
    results = db.join("users", "posts", "id", "user_id")
    
    print(f"✅ Join Success! Found {len(results)} joined records.")
    for row in results:
        print(f"   - {row['name']} posted: '{row['content']}'")

    assert len(results) == 2
    assert results[0]['name'] == "Lucy"
    print("--- Milestone 2.5 Complete ---")

if __name__ == "__main__":
    test_milestone_2_joins()