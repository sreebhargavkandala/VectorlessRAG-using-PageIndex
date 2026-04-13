# VectorlessRAG (Powered by PageIndex)

A document Q&A app that does Retrieval-Augmented Generation (RAG) **without embeddings**.

Upload a PDF, ask questions, and get **fully cited answers** without vector databases, chunking, or embedding models.

Instead of the traditional *embed → chunk → similarity search* pipeline, this system uses **PageIndex** to construct a hierarchical document tree, then leverages **GPT-4o** to intelligently navigate that structure and retrieve precise sections.

---

## 🚀 Core Idea

Traditional RAG is brute force.

VectorlessRAG is **structure-aware reasoning**.

You are not searching text.
You are navigating a **document like a human would**.

---

🌐 Live Demo  
👉 [Try it here](https://vectorlessragusingpageindex.netlify.app)  


---

## 🧠 How It Works

```
PDF Upload
    │
    ▼
PageIndex API ──► Builds hierarchical document tree
                  (chapters → sections → subsections)
    │
    ▼
User Question
    │
    ▼
Step 1 — Tree Search
  GPT-4o reads compressed tree (like a TOC)
  and selects relevant node IDs
    │
    ▼
Step 2 — Node Retrieval
  Full text of selected nodes is fetched
    │
    ▼
Step 3 — Cited Answer
  GPT-4o generates answer using ONLY retrieved context
  with section + page citations
    │
    ▼
UI highlights sources in the document tree
```

---

## ⚙️ Tech Stack

| Layer             | Tech                                 |
| ----------------- | ------------------------------------ |
| Frontend          | React 18 + TypeScript + Tailwind CSS |
| Backend           | FastAPI + Python 3.11                |
| Document Indexing | PageIndex                            |
| LLM               | GPT-4o                               |
| Database          | SQLite (WAL mode)                    |
| Auth              | Bearer Token                         |
| Rate Limiting     | slowapi                              |

---

## ✨ Features

* **No embeddings**
  Zero vector DB. Zero embedding API calls.

* **Tree-based retrieval**
  LLM navigates document structure instead of similarity search.

* **Streaming responses**
  Token-by-token output via SSE.

* **Source highlighting**
  Retrieved sections glow in the UI tree.

* **Session-only storage**
  No persistent user data. Everything resets on refresh.

* **Strict file validation**

  * PDF only
  * Magic byte check
  * 20MB cap

* **Structured logging**
  Full server-side request + error logging.

---

## 📁 Project Structure

```
VectorlessRAG/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── components/ui/
│   │       ├── ai-loader.tsx
│   │       └── ai-loader.css
│   ├── .env
│   └── .env.example
├── .gitignore
└── README.md
```

---

## 🧪 Running Locally

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
API_SECRET_KEY=your_secret_key
```

Run:

```bash
uvicorn main:app --reload
```

---

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```
REACT_APP_API_URL=http://localhost:8000
REACT_APP_API_KEY=your_secret_key
```

Run:

```bash
npm start
```

Open:

```
http://localhost:3000
```

---

## 🌐 Deployment

### Live Setup

* **Frontend:** Hosted on Netlify
* **Backend:** Hosted on Render

---

### Backend → Render

* Root Directory: `backend`
* Build:

```bash
pip install -r requirements.txt
```

* Start:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Environment Variables:**

```
OPENAI_API_KEY=your_openai_key
PAGEINDEX_API_KEY=your_pageindex_key
API_SECRET_KEY=your_secret_key
ALLOWED_ORIGINS=https://vectorlessragusingpageindex.netlify.app

```

---

### Frontend → Netlify

* Base Directory: `frontend`
* Build:

```bash
npm run build
```

* Publish:

```
frontend/build
```

**Environment Variables:**

```
REACT_APP_API_URL=https://your-backend.onrender.com
REACT_APP_API_KEY=your_secret_key
```

---

## 🔐 Security

* Bearer token authentication on all endpoints
* Strict file validation (PDF + magic bytes + size cap)
* Pydantic schema validation
* Prompt injection protection via role separation
* Error masking (full logs server-side only)
* CORS locked via `ALLOWED_ORIGINS`
* SQLite WAL mode for safe concurrency
* Auto-recovery of failed indexing jobs

---

## 📜 License

MIT — see `LICENSE`

---

## 🔑 Getting API Keys

* OpenAI → [https://platform.openai.com](https://platform.openai.com)
* PageIndex → [https://pageindex.ai](https://pageindex.ai)

---
