from interface.parser import parse_command

def start_repl(engine):
    print("--- PesaDB Interactive Shell (v1.0) ---")
    print("Type 'EXIT' to quit. Use lowercase types (int, str).")
    
    while True:
        try:
            user_input = input("pesaDB> ")
            if user_input.upper() == "EXIT":
                break
            
            parsed = parse_command(user_input)
            if not parsed:
                print("Error: Unknown command syntax.")
                continue

            # Route to Engine
            if parsed['action'] == "create":
                # Note: Defaulting first column to PK for simplicity
                pk = list(parsed['columns'].keys())[0]
                msg = engine.create_table(parsed['table'], parsed['columns'], primary_key=pk)
                print(msg)
            
            elif parsed['action'] == "insert":
                schema = engine.schemas[parsed['table']]
                col_names = list(schema.columns.keys())
                
                # Create the raw dict from parser strings
                raw_data = dict(zip(col_names, parsed['values']))
                
                # CRITICAL: Use the schema to validate AND COERCE types
                # This turns "1" (str) into 1 (int)
                validated_row = schema.validate(raw_data) 
                
                print(engine.insert(parsed['table'], validated_row))            

            elif parsed['action'] == "select":
                results = engine.select(parsed['table'], where=parsed['where'])
                if not results:
                    print("No records found.")
                else:
                    for row in results:
                        print(row)

        except Exception as e:
            print(f"Execution Error: {e}")