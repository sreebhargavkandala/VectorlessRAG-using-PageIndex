# VectorlessRAG  (Powered by PageIndex)

A document Q&A app that does **RAG without embeddings**. Upload a PDF, ask questions, get cited answers — no vector database, no chunking, no embedding model.

Instead of the traditional embed → chunk → similarity search pipeline, it uses [PageIndex](https://pageindex.ai) to build a hierarchical tree of the document structure, then uses GPT-4o to navigate that tree and retrieve the exact sections needed to answer each question.

---

## How it works

```
PDF Upload
    │
    ▼
PageIndex API ──► Builds a hierarchical document tree
                  (chapters → sections → subsections)
    │
    ▼
User asks a question
    │
    ▼
Step 1 — Tree Search
  GPT-4o reads the compressed tree (like a table of contents)
  and picks the node IDs most likely to contain the answer
    │
    ▼
Step 2 — Node Retrieval
  Full text of selected nodes is fetched from the tree
    │
    ▼
Step 3 — Cited Answer
  GPT-4o generates a streamed answer using only
  the retrieved context, citing section + page for every claim
    │
    ▼
Sources highlighted in the document tree on the left
```

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript (CRA), Tailwind CSS |
| Backend | FastAPI + Python 3.11 |
| Document indexing | [PageIndex](https://pageindex.ai) |
| LLM | OpenAI GPT-4o (tree search + answer generation) |
| Database | SQLite (WAL mode) |
| Auth | Bearer token (`API_SECRET_KEY`) |
| Rate limiting | slowapi (10/min upload, 20/min query) |

---

## Features

- **No embeddings** — zero vector DB, zero embedding API calls
- **Tree-based retrieval** — LLM navigates document structure to find relevant sections
- **Streamed answers** — response streams token by token via SSE
- **Source highlighting** — retrieved sections glow in the structure panel
- **Session-only** — all documents wiped on page refresh (no persistent user data)
- **File validation** — magic bytes check, 20MB cap, PDF-only
- **Structured logging** — all requests and errors logged server-side

---

## Project structure

```
VectorlessRAG/
├── backend/
│   ├── main.py          # FastAPI app — all routes, RAG pipeline
│   ├── requirements.txt
│   └── .env             # OPENAI_API_KEY, PAGEINDEX_API_KEY, API_SECRET_KEY
├── frontend/
│   ├── src/
│   │   ├── App.tsx      # Main React app — upload, tree view, chat
│   │   ├── App.css      # Full custom design system (dark navy + blue)
│   │   └── components/
│   │       └── ui/
│   │           ├── ai-loader.tsx   # Animated indexing overlay
│   │           └── ai-loader.css
│   ├── .env             # REACT_APP_API_URL, REACT_APP_API_KEY
│   └── .env.example
├── .gitignore
└── README.md
```

---

## Running locally

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:
```
OPENAI_API_KEY=your_openai_key
PAGEINDEX_API_KEY=your_pageindex_key
API_SECRET_KEY=your_secret_key   # any random string
```

```bash
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:
```
REACT_APP_API_URL=http://localhost:8000
REACT_APP_API_KEY=your_secret_key   # must match API_SECRET_KEY above
```

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploying

### Backend → [Render](https://render.com) (free)

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

Environment variables to set on Render:
```
OPENAI_API_KEY
PAGEINDEX_API_KEY
API_SECRET_KEY
ALLOWED_ORIGINS=https://your-app.netlify.app
```

### Frontend → [Netlify](https://netlify.com) (free)

| Setting | Value |
|---|---|
| Base directory | `frontend` |
| Build command | `npm run build` |
| Publish directory | `frontend/build` |

Environment variables to set on Netlify:
```
REACT_APP_API_URL=https://your-backend.onrender.com
REACT_APP_API_KEY=your_secret_key
```

---

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/documents/upload` | Upload a PDF (rate: 10/min) |
| `GET` | `/documents` | List all documents |
| `GET` | `/documents/{id}` | Get document + tree |
| `GET` | `/documents/{id}/status` | Polling status during indexing |
| `GET` | `/documents/{id}/history` | Chat history |
| `POST` | `/query` | Stream a RAG answer (rate: 20/min) |
| `DELETE` | `/documents` | Clear all documents |
| `DELETE` | `/documents/{id}` | Delete one document |

All endpoints except `/health` require `Authorization: Bearer <API_SECRET_KEY>`.

---

## Security

- Bearer token auth on every endpoint
- File validation: extension + `%PDF` magic bytes + 20MB size cap
- Pydantic input validation: UUID pattern, 2000 char question limit, 20 item history cap, typed `role` field
- Prompt injection mitigation: explicit `[SYSTEM]/[QUESTION]/[CONTEXT]/[ANSWER]` role separation
- Error details stripped from client responses — full traces logged server-side only
- CORS locked to configured origins via `ALLOWED_ORIGINS` env var
- SQLite WAL mode for safe concurrent reads
- Crashed indexing tasks auto-recovered on server restart

---

## License

MIT — see [LICENSE](LICENSE)

---

## Getting API keys

- **OpenAI** — [platform.openai.com](https://platform.openai.com)
- **PageIndex** — [pageindex.ai](https://pageindex.ai)
