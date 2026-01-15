from core.engine import DatabaseEngine
from interface.repl import start_repl

def main():
    engine = DatabaseEngine()
    # Pre-loading schema logic could go here
    start_repl(engine)

if __name__ == "__main__":
    main()