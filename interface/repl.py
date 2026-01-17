import os
import sys
import re
import ast
import atexit

# 1. THE PATH FIX: Allows importing from the parent directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from core.engine import DatabaseEngine
except ImportError:
    print("Error: Could not find 'core' module. Ensure you are in the project root.")
    sys.exit(1)

# 2. Professional Readline Setup
try:
    import readline
    histfile = os.path.join(os.path.expanduser("~"), ".pesadb_history")
    if os.path.exists(histfile):
        readline.read_history_file(histfile)
    readline.set_history_length(1000)
    atexit.register(readline.write_history_file, histfile)
except ImportError:
    readline = None

# --- Visual Styling ---
CLR_EMERALD = "\033[38;5;48m"
CLR_CYAN = "\033[38;5;51m"
CLR_RED = "\033[38;5;196m"
CLR_GRAY = "\033[38;5;244m"
CLR_RESET = "\033[0m"
BOLD = "\033[1m"

class PesaDBRepl:
    def __init__(self):
        self.engine = DatabaseEngine()
        self.running = True

    def print_success(self, text):
        print(f"{CLR_EMERALD}✔ {text}{CLR_RESET}")

    def print_error(self, text):
        print(f"{CLR_RED}✘ Error: {text}{CLR_RESET}")

    def list_display(self, title, items):
        """Helper to print lists in a clean format"""
        print(f"\n{BOLD}{title}{CLR_RESET}")
        print("-" * len(title))
        if not items:
            print(f"{CLR_GRAY}(empty set){CLR_RESET}")
        else:
            for item in items:
                print(f" • {item}")
        print("")

    def table_display(self, rows):
        """Standard RDBMS ASCII table formatter"""
        if not rows:
            print(f"{CLR_GRAY}(empty set){CLR_RESET}")
            return

        headers = list(rows[0].keys())
        # Calculate max width for each column
        widths = {h: len(h) for h in headers}
        for row in rows:
            for h in headers:
                widths[h] = max(widths[h], len(str(row.get(h, ""))))

        # Draw border
        sep = "+" + "+".join("-" * (widths[h] + 2) for h in headers) + "+"
        
        print(sep)
        print("| " + " | ".join(f"{h.upper():<{widths[h]}}" for h in headers) + " |")
        print(sep)
        for row in rows:
            print("| " + " | ".join(f"{str(row.get(h, '')):<widths[h]}" for h in headers) + " |")
        print(sep)

    def show_help(self):
        """Prints the CLI Manual"""
        print(f"\n{BOLD}PesaDB CLI Manual{CLR_RESET}")
        print("-" * 20)
        cmds = [
            ("SHOW DATABASES", "List all databases on disk"),
            ("SHOW TABLES", "List tables in active database"),
            ("USE <db>", "Switch database context"),
            ("CREATE DATABASE <db>", "Initialize new database"),
            ("SELECT FROM <table>", "Query all records"),
            ("INSERT INTO <table> {d}", "Insert record (e.g. {'id':1})"),
            ("DROP DATABASE <db>", "Delete database cluster"),
            ("DROP TABLE <table>", "Delete table and data"),
            ("HELP", "Show this manual"),
            ("CLEAR", "Clear terminal"),
            ("EXIT", "Close CLI")
        ]
        for c, d in cmds:
            print(f" {CLR_CYAN}{c:<25}{CLR_RESET} : {d}")
        print("")

    def execute(self, cmd):
        cmd = cmd.strip()
        if not cmd: 
            return
        cmd_upper = cmd.upper()

        if cmd_upper == "EXIT":
            self.running = False
            return

        if cmd_upper == "HELP":
            self.show_help()
            return

        if cmd_upper == "CLEAR":
            os.system('cls' if os.name == 'nt' else 'clear')
            return

        if cmd_upper == "SHOW DATABASES":
            self.list_display("Available Databases", self.engine.list_databases())
            return

        if cmd_upper == "SHOW TABLES":
            if not self.engine.active_db:
                self.print_error("No active DB. Use 'USE <db>'")
                return
            self.list_display(f"Tables in '{self.engine.active_db}'", list(self.engine.schemas.keys()))
            return

        # USE <db_name>
        match = re.match(r"USE\s+(\w+)", cmd, re.IGNORECASE)
        if match:
            db_name = match.group(1)
            if db_name not in self.engine.list_databases():
                self.print_error(f"Database '{db_name}' not found.")
                return
            self.engine.set_active_db(db_name)
            self.print_success(f"Context switched to: {db_name}")
            return

        # CREATE DATABASE <db_name>
        match = re.match(r"CREATE\s+DATABASE\s+(\w+)", cmd, re.IGNORECASE)
        if match:
            db_name = match.group(1)
            self.engine.set_active_db(db_name)
            self.print_success(f"Database '{db_name}' initialized.")
            return

        # SELECT FROM <table_name>
        match = re.match(r"SELECT\s+FROM\s+(\w+)", cmd, re.IGNORECASE)
        if match:
            if not self.engine.active_db:
                self.print_error("No active DB context.")
                return
            table_name = match.group(1)
            rows = self.engine.select(table_name)
            self.print_success(f"Found {len(rows)} records.")
            self.table_display(rows) # USE NEW TABLE FORMATTER
            return

        # INSERT INTO <table_name> {data}
        match = re.match(r"INSERT\s+INTO\s+(\w+)\s+(.+)", cmd, re.IGNORECASE)
        if match:
            table_name = match.group(1)
            try:
                data = ast.literal_eval(match.group(2))
                msg = self.engine.insert(table_name, data)
                self.print_success(msg)
            except Exception as e:
                self.print_error(f"Malformed data: {e}")
            return

        self.print_error(f"Unknown command: '{cmd}'. Type 'HELP' for instructions.")

    def start(self):
        os.system('cls' if os.name == 'nt' else 'clear')
        print(f"{CLR_EMERALD}{BOLD}PesaDB v1.0.0 CLI{CLR_RESET}")
        print(f"{CLR_GRAY}Type 'HELP' for manual or 'EXIT' to quit.{CLR_RESET}\n")

        while self.running:
            try:
                context = self.engine.active_db if self.engine.active_db else "system"
                prompt = f"{CLR_EMERALD}➜  {CLR_CYAN}{context}{CLR_RESET} "
                user_input = input(prompt)
                self.execute(user_input)
            except (KeyboardInterrupt, EOFError):
                print("\nBye!")
                break

if __name__ == "__main__":
    repl = PesaDBRepl()
    repl.start()