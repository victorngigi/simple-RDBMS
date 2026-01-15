import re

def parse_command(command_str):
    """
    Translates string input into a dictionary the engine understands.
    Example: "INSERT INTO users VALUES (3, 'Rex')"
    """
    cmd = command_str.strip()
    
    # 1. CREATE TABLE (id:int, name:str)
    if cmd.startswith("CREATE TABLE"):
        match = re.match(r"CREATE TABLE (\w+) \((.*)\)", cmd, re.IGNORECASE)
        if match:
            table_name = match.group(1)
            cols_raw = match.group(2).split(",")
            columns = {}
            for c in cols_raw:
                c_name, c_type = c.strip().split(":")
                columns[c_name] = c_type
            return {"action": "create", "table": table_name, "columns": columns}

    # 2. INSERT INTO VALUES (3, 'Rex')
    elif cmd.startswith("INSERT INTO"):
        match = re.match(r"INSERT INTO (\w+) VALUES \((.*)\)", cmd, re.IGNORECASE)
        if match:
            table_name = match.group(1)
            values = [v.strip().strip("'") for v in match.group(2).split(",")]
            return {"action": "insert", "table": table_name, "values": values}

    # 3. SELECT * or FROM
    elif cmd.startswith("SELECT"):
        match = re.match(r"SELECT (?:\* )?FROM (\w+)(?: WHERE (\w+) = (.*))?", cmd, re.IGNORECASE)
        if match:
            table_name = match.group(1)
            where_col = match.group(2)
            where_val = match.group(3).strip("'") if match.group(3) else None
            return {"action": "select", "table": table_name, "where": {where_col: where_val} if where_col else None}
        

    return None