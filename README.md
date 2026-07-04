# LifePilot AI

LifePilot AI is an intelligent daily manager designed to organize objectives and automate scheduling from emails, calendar events, and bill invoices. It uses FastAPI for the backend, React (Vite) for the frontend, and MongoDB for database persistence, with AI orchestration via OpenRouter.

---

## Architecture Overview 

1. **Frontend:** React (TypeScript) + Vite + TailwindCSS / Vanilla CSS UI.
2. **Backend:** FastAPI (Python) + Motor (Async MongoDB Driver) + Uvicorn server.
3. **Database:** MongoDB (collection schemas for users, tasks, and bills).
4. **AI Gateway:** OpenRouter API (`google/gemini-2.5-flash` for vision/OCR operations and `deepseek/deepseek-chat` for natural language chat commands).

---

## Quick Start (Local Development)

### Prerequisites
* Python 3.10+
* Node.js 18+
* MongoDB running locally (default: `mongodb://localhost:27017`)

### 1. Backend Setup
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   * **Windows PowerShell:**
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   * **macOS / Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend/` root directory (see [Configuration](#configuration) below).
5. Run the backend development server:
   ```bash
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### 2. Frontend Setup
1. Navigate to the `frontend` folder:
   ```bash
   cd ../frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`.

---

## Configuration (`.env`)

Create a `.env` file in the `backend/` directory with the following variables:

```ini
# MongoDB Configs
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=lifepilot

# Security Configs
JWT_SECRET_KEY=your-jwt-super-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Google OAuth Credentials (for Calendar & Gmail integration)
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/callback

# AI Gateway Configs
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_MODEL=deepseek/deepseek-chat
```

---

## Deployment (Docker Compose)

For production or containerized deployments, you can deploy all services (Frontend, Backend, and MongoDB) in one command using Docker Compose:

### Command:
```bash
docker-compose up --build -d
```

### What this does:
1. **Starts MongoDB** on port `27017`, persisting data inside a named volume `mongodb_data`.
2. **Builds and starts the FastAPI backend** on port `8000`.
3. **Builds and starts the Vite frontend** on port `5173`.

### Stop deployment:
To stop and clean up the containers:
```bash
docker-compose down
```
#
