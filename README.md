# ReasonedAI

> Enterprise-grade document intelligence and reasoning platform — converting static organizational knowledge into explainable, actionable AI systems.

[![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## What Is ReasonedAI?

ReasonedAI is a middleware platform that sits between enterprise knowledge repositories and AI applications. It ingests unstructured documents — PDFs, DOCX, PPTX, scanned images, spreadsheets — and transforms them into a structured, semantically searchable, and reasoning-capable knowledge layer.

The platform does not replace human experts. It augments them by surfacing evidence-backed insights, generating agent blueprints from procedural documentation, and providing explainable confidence scores for every output.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    React Frontend                    │
│   Dashboard · Knowledge Explorer · Agent Studio ·   │
│   Document Viewer · Reports · Admin · Settings       │
└────────────────────┬────────────────────────────────┘
                     │ REST / WebSocket
┌────────────────────▼────────────────────────────────┐
│                   FastAPI Backend                    │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  Ingestion   │  │  Reasoning   │  │   Agent   │  │
│  │   Pipeline   │  │   Engine     │  │  Builder  │  │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘  │
│         │                 │                │         │
│  ┌──────▼─────────────────▼────────────────▼─────┐  │
│  │          Knowledge Layer (Vector + Graph)      │  │
│  │    FAISS · ChromaDB · Neo4j · Metadata Index   │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                     │
          ┌──────────▼──────────┐
          │   LLM Provider      │
          │  (OpenRouter/Azure) │
          └─────────────────────┘
```

---

## Key Capabilities

| Capability | Description |
|---|---|
| **Multi-Format Ingestion** | PDF, DOCX, PPTX, CSV, XLSX, TXT, scanned images |
| **OCR Recovery Engine** | Tesseract + layout reconstruction for legacy docs |
| **Structural Understanding** | Section, clause, table, and dependency extraction |
| **Semantic Decomposition** | Knowledge units: requirements, risks, policies, procedures |
| **Metadata Enrichment** | Entities, dates, responsibilities, thresholds |
| **Vector Knowledge Layer** | FAISS + ChromaDB embeddings with metadata indexes |
| **Context-Aware Retrieval** | Semantic + metadata + relationship-aware search |
| **Multi-Stage Reasoning** | Informational → Analytical → Advisory layers |
| **Agent Blueprint Generation** | Convert SOPs into structured AI agent architectures |
| **Deterministic Confidence Engine** | Explainable, auditable confidence scores |
| **Evidence-Based Outputs** | Every finding traced to source document and clause |
| **Human-in-the-Loop** | Review, approve, override, and feedback mechanisms |

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+ (or use SQLite for dev)
- Redis 7+ (for task queues)
- Tesseract OCR (for scanned documents)

### Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env with your OpenRouter API key and DB credentials

python -m alembic upgrade head
python scripts/seed_demo_data.py

uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Set VITE_API_BASE_URL=http://localhost:8000

npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Project Structure

```
ReasonedAI/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application entry point
│   │   ├── config.py                # Settings and environment config
│   │   ├── database.py              # SQLAlchemy engine and session
│   │   ├── models/                  # ORM models
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   ├── api/                     # Route handlers
│   │   │   ├── v1/
│   │   │   │   ├── documents.py
│   │   │   │   ├── knowledge.py
│   │   │   │   ├── reasoning.py
│   │   │   │   ├── agents.py
│   │   │   │   ├── reports.py
│   │   │   │   └── admin.py
│   │   ├── services/                # Business logic layer
│   │   │   ├── ingestion/
│   │   │   ├── extraction/
│   │   │   ├── reasoning/
│   │   │   ├── knowledge/
│   │   │   └── agents/
│   │   ├── core/                    # Core utilities
│   │   │   ├── llm_client.py
│   │   │   ├── embeddings.py
│   │   │   ├── vector_store.py
│   │   │   ├── confidence.py
│   │   │   └── security.py
│   │   └── workers/                 # Celery background tasks
│   ├── migrations/                  # Alembic migrations
│   ├── scripts/                     # Utility scripts
│   ├── tests/                       # Test suite
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   ├── pages/                   # Page-level components
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── stores/                  # Zustand state stores
│   │   ├── services/                # API client layer
│   │   ├── types/                   # TypeScript type definitions
│   │   └── utils/                   # Shared utilities
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
├── Makefile
└── README.md
```

---

## Environment Variables

### Backend (`.env`)

```env
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
DEFAULT_MODEL=anthropic/claude-3.5-sonnet
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

DATABASE_URL=postgresql+asyncpg://user:pass@localhost/reasonedai
REDIS_URL=redis://localhost:6379

SECRET_KEY=your-secret-key-here
ALLOWED_ORIGINS=http://localhost:5173

STORAGE_PATH=./storage
MAX_UPLOAD_SIZE_MB=100
OCR_ENABLED=true
TESSERACT_CMD=/usr/bin/tesseract
```

### Frontend (`.env.local`)

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_APP_NAME=ReasonedAI
```

---

## Running with Docker

```bash
docker-compose up --build
```

This starts the full stack: backend API, Celery workers, PostgreSQL, Redis, and the frontend dev server.

---

## Running Tests

```bash
# Backend
cd backend
pytest tests/ -v --cov=app --cov-report=html

# Frontend
cd frontend
npm run test
npm run test:e2e
```

---

## Output Types

ReasonedAI generates the following output artifacts:

- **Assessment Reports** — Structured evaluation of document compliance or quality
- **Knowledge Summaries** — Condensed, entity-linked summaries of document sets
- **Compliance Reports** — Gap analysis against standards or policies
- **Agent Blueprints** — Structured AI agent definitions from SOPs
- **Structured JSON** — Machine-readable knowledge extraction results
- **Annotated PDFs** — Source documents with highlighted evidence
- **Decision Support Reports** — Multi-factor recommendation outputs
- **Risk Assessments** — Identified risks with severity and source evidence
- **Workflow Maps** — Visual process flow extracted from procedural documents

---

## Industry Applications

- **Defence** — Technical document assessment, compliance validation, procurement review
- **Manufacturing** — SOP intelligence, process validation, quality audits
- **Healthcare** — Clinical documentation analysis, compliance review
- **Legal** — Contract analysis, risk identification
- **Government** — Policy analysis, tender evaluation, standards compliance
- **Enterprise** — Knowledge management, agent creation, process automation

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit changes (`git commit -m 'Add your feature'`)
4. Push to branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Acknowledgements

Built with FastAPI, React, LangChain, SentenceTransformers, FAISS, and the OpenRouter API gateway.
