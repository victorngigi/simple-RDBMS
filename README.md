# PesaDB: Multi-Tenant RDBMS Storage Engine & Admin Console

**Author:** Victor Ngigi  
**Submission:** Pesapal Software Engineering Challenge  
**Date:** January 17, 2026  

---

## Project Overview

**PesaDB** is a custom-built Relational Database Management System (RDBMS) featuring a logical directory-based storage engine, strict schema enforcement, and a professional administrative console. Designed to simulate the core mechanics of production databases like PostgreSQL, it implements a multi-tenant architecture where each database is treated as an isolated logical cluster.



### Development Lifecycle
This project was designed and developed within an intensive **48-hour** timeframe. To meet the rigorous requirements of the challenge while ensuring high-quality architectural integrity, I leveraged **Gemini Code Assist (VS Code extension)** for boilerplate acceleration and **Gemini (Advanced)** for system planning and relational logic architecture. This approach allowed me to focus on high-level engineering decisions while maintaining a rapid delivery pace.

---

## Key Technical Features

### 1. Storage Engine & Multi-Tenancy
* **Logical Isolation:** Every database created exists as a distinct physical directory on the disk, ensuring zero data leakage between clusters.
* **JSON Persistence:** Data and metadata are persisted in structured JSON formats, optimized for readability and lightweight transfer.
* **Schema Enforcement:** Strict validation of data types and required attributes at the engine level before any write operation is committed to disk.

### 2. Referential Integrity & Relational Logic
* **Primary Keys (PK):** Enforces uniqueness across records with hash-map indexing for $O(1)$ lookup performance.
* **Foreign Keys (FK):** Implements referential integrity checks during insertion to prevent "orphaned" records (e.g., ensuring a `student_id` exists in the `students` table before an enrollment record is saved).
* **Join Algorithm:** A custom Nested Loop Join implementation allows for the generation of virtual views combining data from multiple disk sectors.



### 3. PesaDB Bash (Terminal Shell)
A raw command-line interface featuring a regex-based parser. Users can bypass the UI to execute low-level engine instructions directly:
* `USE <db_name>` - Switch logical database context.
* `CREATE DATABASE <db_name>` - Initialize a new disk cluster.
* `SELECT FROM <table_name>` - Retrieve record sets.
* `INSERT INTO <table_name> {data}` - Commit structured records.
* `HELP` - Integrated documentation for shell syntax.

### 4. Admin Console (UI/UX)
* **Dynamic Schema Designer:** A visual tool to define entities, attributes, PKs, and FKs with real-time feedback.
* **Relational Explorer:** A dedicated builder for generating and previewing joined dataset views.
* **Enterprise Interface:** Built with React and Shadcn/UI, featuring toast notifications, stylized confirmation dialogs, and async loading states.

---

## Tech Stack

* **Engine:** Python 3.11 (Core Logic & Storage Management)
* **API:** FastAPI (Context-aware asynchronous routing)
* **Frontend:** React, Vite, Tailwind CSS, Shadcn/UI, Lucide Icons
* **Communication:** Axios (RESTful API interaction)

---

## Ownership & License

This project is released under the **MIT License**. **Victor Ngigi** maintains full ownership of the original logic, architecture, and source code developed for this challenge.

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

# Navigate to the frontend directory
cd web_demo/frontend

# Install professional UI components
npm install

# Launch the Admin Console
npm run dev
```
---

## Conclusion
PesaDB demonstrates a comprehensive understanding of how relational data is structured, isolated, and queried. By combining low-level engine logic (referential integrity, indexing, joins) with a modern high-level interface, this project serves as a robust proof-of-concept for a scalable storage solution.

### Built with passion and precision for the Pesapal Engineering Challenge.
