# PrepVela

PrepVela is an AI interview preparation platform with a React frontend and a Django REST API. It includes interview practice, resume tools, question generation, skill insights, coding interview practice, and AI feedback.

## Project structure

```text
backend/    Django API and application services
frontend/   React, Vite, and Tailwind CSS application
docs/       Development, deployment, and project notes
```

## Requirements

- Python and pip
- Node.js and npm (Node.js 20.19+ or 22.12+ for the current Vite version)
- A MongoDB instance
- A Gemini API key for AI-powered features

## Run locally

### Backend

In a terminal from the project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` with your Django secret, MongoDB connection, database name, and Gemini API settings. The example defaults to a local MongoDB server. Then start Django:

```powershell
python manage.py migrate
python manage.py runserver
```

The API runs at `http://127.0.0.1:8000`. Django's SQLite file is only used for Django's internal tables; application data is stored in MongoDB.

### Frontend

In a second terminal from the project root:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
```

The frontend runs at the URL printed by Vite, usually `http://localhost:5173`. Set `VITE_API_BASE_URL` in `frontend/.env.local` if the API is hosted somewhere else. Values prefixed with `VITE_` are included in the browser bundle; never put private credentials there.

## Configuration

Backend settings are read from `backend/.env`; start with `backend/.env.example`. Keep real credentials in local environment files or a deployment secret manager. Do not commit `.env` files, database dumps, private keys, or production credentials.

For deployment, set `DEBUG=False`, use a unique secret key, configure `ALLOWED_HOSTS` and `FRONTEND_URL` for the deployed domains, and use HTTPS for both the frontend and API. See [Frontend Deployment](docs/FRONTEND_DEPLOYMENT.md) for static hosting and SPA routing details.

## Helpful commands

```sh
# Frontend (from frontend/)
npm run build
npm run lint

# Backend (from backend/)
python manage.py check
python manage.py test
```

The backend test suite requires the Python dependencies and may need service configuration for integration paths.

## License

No license has been selected yet. Until a license is added, the source remains under the default copyright protections; public visibility on GitHub does not grant permission to reuse it.
