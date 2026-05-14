# College Voice Assistant

A small **Siri / Jarvis–style** assistant for students: voice or text input, notes, reminders, weekly timetable, optional desktop app launches, and AI answers. **React** frontend + **FastAPI** backend, with browser speech recognition and text-to-speech.

## Features

| Feature | Description |
|--------|-------------|
| **Voice commands** | Uses the browser **Web Speech API** (Chrome / Edge recommended). |
| **Text-to-speech** | Reads AI replies aloud via `speechSynthesis` (toggle in UI). |
| **Notes** | Save notes in a local SQLite DB; say **“note …”** or **“save note …”** to save without calling the LLM. |
| **Reminders** | Due date/time with optional spoken alert when due. |
| **Timetable** | Weekly class slots; “Today’s classes” uses your schedule in context. |
| **Open websites** | AI can return actions; the app opens URLs in a new tab. |
| **Open apps (Windows)** | Allowlisted apps launched via the API (`notepad`, `calculator`, `chrome`, `edge`, `vscode`, `explorer`). |
| **AI Q&A** | **OpenAI** or **Google Gemini** (set in `.env`). |

## Tech stack

- **Frontend:** React 18, TypeScript, Vite  
- **Backend:** Python 3, FastAPI, SQLAlchemy, SQLite  
- **AI:** OpenAI Chat Completions or Gemini (configurable)  
- **Speech:** Browser APIs (no server-side audio required for the default flow)

## Project layout

```
├── backend/           # FastAPI app
│   ├── app/           # main, routers, models, AI service
│   ├── data/          # SQLite DB (created at runtime; gitignored)
│   ├── requirements.txt
│   └── .env.example   # copy to .env — do not commit .env
├── frontend/          # Vite + React UI
├── package.json       # root scripts (run API + web together)
└── README.md
```

## Prerequisites

- **Node.js** (LTS) and **npm**  
- **Python 3.10+** (3.11+ recommended)  
- An **OpenAI** and/or **Gemini** API key for chat features  

## Quick start

### 1. Clone and enter the folder

```bash
git clone https://github.com/aadirao002/college-voice-assistance.git
cd college-voice-assistance
```

*(If your folder name differs, `cd` into that folder instead.)*

### 2. Backend setup

```bash
cd backend
python -m pip install -r requirements.txt
copy .env.example .env   # Windows CMD
# or:  cp .env.example .env   # macOS / Linux / Git Bash
```

Edit **`backend/.env`** and set at least one provider:

- **OpenAI (default):** `AI_PROVIDER=openai` and `OPENAI_API_KEY=sk-...`  
- **Gemini:** `AI_PROVIDER=gemini`, `GEMINI_API_KEY=...`, and you can leave OpenAI blank.

### 3. Install Node dependencies (project root)

From the **repository root** (parent of `backend` and `frontend`):

```bash
npm install
npm run install-frontend
```

### 4. Run everything (recommended)

Still at the **repository root**:

```bash
npm run dev
```

This starts:

- **API:** [http://127.0.0.1:8000](http://127.0.0.1:8000) (FastAPI / OpenAPI at `/docs`)  
- **Web UI:** [http://localhost:5173](http://localhost:5173) (Vite proxies `/api` to port 8000)

Open **http://localhost:5173** in the browser.

### 5. Run API and UI separately (optional)

**Terminal A — API**

```bash
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal B — UI**

```bash
npm run dev:web
```

*(Or `cd frontend` then `npm install` once and `npm run dev`.)*

## Production build (frontend only)

```bash
npm run build
```

Static files are written to `frontend/dist/`. Serve them behind any static host and point API calls to your deployed FastAPI URL (you will need to adjust CORS and the frontend API base URL for a split deployment).

## Environment variables

| Variable | Meaning |
|----------|---------|
| `AI_PROVIDER` | `openai` or `gemini` |
| `OPENAI_API_KEY` | OpenAI secret key |
| `OPENAI_MODEL` | e.g. `gpt-4o-mini` |
| `GEMINI_API_KEY` | Google AI key |
| `GEMINI_MODEL` | e.g. `gemini-1.5-flash` |
| `CORS_ORIGINS` | Comma-separated origins allowed by the API (default includes Vite dev URL) |

Never commit **`.env`** or real keys. Use **`.env.example`** as a template only.

## Security notes

- **`.gitignore`** excludes env files, keys, local databases, and common credential filenames.  
- The **`/api/system/open-app`** endpoint only allows a fixed list of Windows programs.  
- **Opening URLs** is done in the browser; only use trusted links.

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| `ECONNREFUSED 127.0.0.1:8000` | Start the backend (`npm run dev:api` or `npm run dev`). |
| Voice not working | Use **Chrome** or **Edge**; allow microphone when prompted. |
| AI errors / 503 | Check `backend/.env` keys and `AI_PROVIDER`. |
| `npm` errors at repo root | Run `npm install` at the **root** first; frontend lives in `frontend/`. |

## License

Use and modify for your own learning and projects. Add a license file if you redistribute publicly.

## Author

Student / portfolio project — [college-voice-assistance on GitHub](https://github.com/aadirao002/college-voice-assistance).
