 RUN COMMAND
 ..\venv_andal\Scripts\python.exe -m uvicorn app.main:app -

Revised Tech Stack (Simpler)

Frontend: Plain HTML/CSS/JavaScript + Bootstrap 5
Backend: FastAPI (same as before)
Database: PostgreSQL (same)
UI Framework: Bootstrap 5 (instead of Ant Design)
Icons: Bootstrap Icons or Font Awesome
HTTP Client: Fetch API (built-in) or Axios

Project Structure (Simplified)
lady-andal-erp/
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── dashboard.html
│   ├── inventory.html
│   ├── demands.html
│   ├── transfers.html
│   ├── reports.html
│   ├── audit.html
│   ├── settings.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   ├── inventory.js
│   │   ├── demands.js
│   │   ├── transfers.js
│   │   ├── reports.js
│   │   ├── audit.js
│   │   └── utils.js
│   └── assets/
│       └── images/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── routes/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── auth.py
│   │   │   │   ├── users.py
│   │   │   │   ├── inventory.py
│   │   │   │   ├── demands.py
│   │   │   │   ├── approvals.py
│   │   │   │   ├── transfers.py
│   │   │   │   ├── reports.py
│   │   │   │   └── audit.py
│   │   │   └── dependencies.py
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   ├── database.py
│   │   │   └── permissions.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── inventory.py
│   │   │   ├── demand.py
│   │   │   ├── transfer.py
│   │   │   └── audit_log.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   └── (all schema files)
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── stock_service.py
│   │       ├── notification.py
│   │       └── audit_service.py
│   ├── requirements.txt
│   ├── .env
│   └── Dockerfile
├── docker-compose.yml
└── README.md
