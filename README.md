# AI Learning OS — Personal AI Second Brain

A complete AI-powered learning platform that helps students **store,
organize, understand, revise, and manage** all of their study materials in
one permanent, searchable personal knowledge base — not just another
"upload a PDF and chat" tool.

Built entirely with **free, open-source technology** — no paid APIs, no
paid cloud AI services. Everything (embeddings, summarization, chat) runs
locally through **Ollama**.

> Final-year CSE project — designed to be portfolio/resume-ready: clear
> architecture, separated backend/frontend, and a documented free
> deployment path.

---

## Why this is more than a chatbot

| Traditional "chat with PDF" tool          | AI Learning OS                                                       |
|--------------------------------------------|------------------------------------------------------------------------|
| One PDF, one throwaway session             | Permanent library — every upload is searchable months/years later     |
| Generic Q&A                                | AI Chat scoped strictly to materials you select, so answers stay accurate |
| No structure                               | Auto-organized by subject/topic with a prerequisite graph              |
| No revision plan                           | Spaced-repetition **Revision Center** (SM-2 algorithm)                 |
| LLM-guessed quiz questions                 | **Exam Center** uses a custom NLP engine (spaCy + TF-IDF), not an LLM  |
| No progress tracking                       | Learning Analytics, streaks, and a day-by-day **Learning Timeline**    |
| Studies alone                              | **Share Center** — links, QR codes, exported notes                    |

---

## Feature overview

- **Personal Library** — upload PDFs, DOCX, PPTX, notes, papers; auto
  extracted, summarized, and embedded into a permanent vector index
- **AI Chat** — Retrieval-Augmented Generation restricted to the documents
  you select, so it only answers from *your* material
- **Smart Notes** — auto-generated key concepts, definitions, formulas
- **Daily Summary / Learning Timeline** — an automatic study journal
- **Recommendation Engine** — rule-based "what to study next," using
  prerequisite relationships, mastery scores, and revision due-dates
- **Exam Center** — a from-scratch **Question Generation Engine**
  (no LLM) that builds MCQ, true/false, fill-in-the-blank, short-answer,
  and coding questions directly from your material using spaCy NER,
  TF-IDF sentence ranking, and template-based generation; auto-grades
  and identifies weak concepts
- **Revision Center** — SM-2 spaced-repetition scheduling
- **Share Center** — shareable links + QR codes for notes/summaries/quizzes
- **Learning Analytics** — study time, scores, streaks, completed topics

---

## Architecture

```
ai-learning-os/
├── backend/                 # FastAPI + LangChain + Ollama + ChromaDB + SQLite
│   ├── app/
│   │   ├── main.py          # FastAPI app, router wiring
│   │   ├── config.py        # Settings (env-driven)
│   │   ├── database.py      # SQLAlchemy engine/session
│   │   ├── models.py        # ORM models (Users, Subjects, Topics, Documents,
│   │   │                      Notes, Chat, Quizzes, Revision, Share)
│   │   ├── schemas.py       # Pydantic request/response models
│   │   ├── auth.py          # JWT auth
│   │   ├── routers/         # One router per feature area
│   │   ├── services/
│   │   │   ├── ingestion.py     # upload -> extract -> summarize -> index pipeline
│   │   │   ├── summarizer.py    # LangChain + Ollama: summaries, smart notes, RAG chat
│   │   │   ├── vectorstore.py   # ChromaDB (via LangChain) semantic search
│   │   │   ├── qgen.py          # Custom NLP Question Generation Engine (no LLM)
│   │   │   ├── spaced_repetition.py  # SM-2 algorithm
│   │   │   └── recommender.py   # Rule-based recommendation engine
│   │   └── utils/text_extract.py    # pdf/docx/pptx/txt extraction
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                 # React 18 + Vite + Tailwind CSS
│   └── src/
│       ├── pages/            # Dashboard, Library, Chat, ExamCenter,
│       │                       RevisionCenter, Analytics, Auth, ShareView
│       ├── components/       # Layout, shared UI primitives
│       ├── context/          # Auth context
│       └── api/client.js     # Axios API layer
│
├── docker-compose.yml         # One command: backend + frontend + Ollama
├── Dockerfile.huggingface     # Single-container build for free HF Spaces
└── HOSTING_ON_HUGGINGFACE.md  # Step-by-step free deployment guide
```

**Tech stack:** React, FastAPI, SQLite, ChromaDB, LangChain, Ollama, spaCy,
scikit-learn — all free and open-source.

---

## Running locally

### Prerequisites
- Python 3.11+
- Node.js 20+
- [Ollama](https://ollama.com) installed

### 1. Pull the local models (one-time)
```bash
ollama pull llama3.1:8b
ollama pull nomic-embed-text
ollama serve
```

### 2. Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
cp .env.example .env
uvicorn app.main:app --reload
```
API docs available at `http://localhost:8000/docs`.

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
App available at `http://localhost:5173`.

### Troubleshooting: What if Ollama goes offline?
Sometimes the Ollama background service stops running, which will cause the AI features (like chat, summarization, and smart notes) to fail or timeout. If Ollama goes offline, you can bring it back online by doing the following:
1. Open a new terminal or command prompt window.
2. Run the command: `ollama serve`
3. Leave that terminal window running in the background while you use the application.

### Or: everything with Docker
```bash
docker compose up --build
```

---

## Free deployment

See **[HOSTING_ON_HUGGINGFACE.md](./HOSTING_ON_HUGGINGFACE.md)** for a full,
step-by-step guide to deploying the entire platform on a free Hugging Face
Space (Docker SDK) — including how to run a CPU-friendly Ollama model on
the free tier.

---

## Notes for reviewers / resume use

- Every major feature described in the project spec maps to a real,
  working route + service module (see the Architecture section above) —
  nothing is a placeholder.
- The Exam Center is intentionally LLM-free: it's a good talking point in
  interviews (TF-IDF ranking, spaCy NER, rule-based distractor generation).
- The Recommendation Engine and Revision Center are both classic,
  explainable algorithms (rule-based scoring, SM-2) rather than black boxes
  — easy to explain and defend in a viva/interview.
- The architecture is intentionally split (separate `backend/` and
  `frontend/`, a documented REST API) so the same backend can later serve
  a Flutter mobile client, as described in the original spec.
