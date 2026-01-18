# PesaDB: Multi-Tenant RDBMS Storage Engine & Admin Console

**Author:** Victor Ngigi  
**Submission:** Pesapal Software Engineering Challenge  
**Date:** January 17, 2026  

---

## Project Overview

**PesaDB** is a custom-built Relational Database Management System (RDBMS) featuring a logical directory-based storage engine, strict schema enforcement, and a professional administrative console. Designed to simulate the core mechanics of production databases like PostgreSQL, it implements a multi-tenant architecture where each database is treated as an isolated logical cluster.



### Development Lifecycle
This project was designed and developed within an intensive **48-hour** timeframe. To meet the rigorous requirements of the challenge while ensuring high-quality architectural integrity, I leveraged **Gemini Code Assist (VS Code extension)** for boilerplate acceleration and **Gemini (Advanced)** for system planning and relational logic architecture.

---

## Key Technical Features

### 1. Storage Engine & Multi-Tenancy
* **Logical Isolation:** Every database created exists as a distinct physical directory on the disk, ensuring zero data leakage between clusters.
* **JSON Persistence:** Data and metadata are persisted in structured JSON formats, optimized for readability and lightweight transfer.
* **Schema Enforcement:** Strict validation of data types and required attributes at the engine level before any write operation is committed to disk.

### 2. Referential Integrity & Relational Logic
* **Primary Keys (PK):** Enforces uniqueness across records with hash-map indexing for $O(1)$ lookup performance.
* **Foreign Keys (FK):** Implements referential integrity checks during insertion to prevent "orphaned" records.
* **Join Algorithm:** A custom Nested Loop Join implementation allows for the generation of virtual views combining data from multiple disk sectors.



### 3. Schema Evolution
* **Dynamic Attributes:** Users can append new columns to existing entities via the UI or Shell without wiping existing data.
* **Attribute Purging:** Support for dropping non-primary attributes. The engine performs "data surgery" to physically remove keys from all records on disk while preserving schema integrity.

### 4. Unified Terminal Experience (CLI & Web Shell)
A raw command-line interface featuring a regex-based parser. Users can execute low-level engine instructions directly:
* **Command History:** Navigate previous instructions using **ArrowUp/Down** keys (supported in both Python REPL and Web Console).
* **Soft-Sync Logic:** Terminal commands (like `USE`) automatically update the Sidebar and Header context without forcing a full UI refresh.

### 5. Branded Admin Console (UI/UX)
* **Dynamic Contextual Titles:** Browser tabs dynamically update (e.g., *PesaDB | Table: users*) to reflect the active session.
* **Professional Feedback:** Integrated **Sonner** toast notifications and **Shadcn/UI** confirmation dialogs for destructive actions.
* **Custom Identity:** Fully branded with a custom DatabaseZap SVG favicon and cohesive color palette.

---

## Tech Stack

* **Engine & CLI:** Python 3.11 (Core Logic, Storage Management, REPL)
* **API:** FastAPI (Context-aware asynchronous routing)
* **Frontend:** React 18, Vite, Tailwind CSS, Shadcn/UI, Lucide Icons
* **Communication:** Axios (RESTful API interaction)

---

## Setup Instructions

### Prerequisites
* Python 3.10+
* Node.js 18+

### 1. Backend Setup
```bash
# Navigate to the project root
cd simple-RDBMS

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn

# Start the PesaDB Engine
python -m uvicorn web_demo.backend.app:app --reload
```

### 2.Frontend Setup (Web Admin Console)
```bash
# Navigate to the frontend directory
cd web_demo/frontend

# Install professional UI components
npm install

# Launch the Admin Console
npm run dev
```

### 3. REPL Setup (Direct CLI Access)
```bash
# From the project root (ensure venv is active)
python interface/repl.py
```
_Note: For full command history support on Windows, ```pip install pyreadline3``` is recommended._

---

## CLI Quick Reference
Whether using the Web Terminal or the Python REPL, use these commands to manage your data:
| Command | Action |
| :--- | :--- |
| `HELP` | Show the integrated manual |
| `SHOW DATABASES` | List all available logical clusters |
| `SHOW TABLES` | List all entities in the active DB |
| `USE <db>` | Switch current session context |
| `CREATE DATABASE <db>` | Initialize a new disk cluster |
| `ADD COLUMN <tbl> <col>` | Append a new attribute to an entity |
| `DROP COLUMN <tbl> <col>` | Purge an attribute and its data from disk |
| `SELECT FROM <table>` | Query all records from an entity |
| `INSERT INTO <table> {d}` | Commit a JSON record (e.g. `{"id":1, "name":"Victor"}`) |
| `DROP TABLE <table>` | Permanently delete an entity and its data |

## Ownership & License

This project is released under the **MIT License**. **Victor Ngigi** maintains full ownership of the original logic, architecture, and source code developed for this challenge.

---

### Built with passion and precision for the Pesapal Engineering Challenge.


