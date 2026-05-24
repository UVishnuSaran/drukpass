# DrukPass 🇧🇹
### Agentic AI Framework for Smart Tourism Operations in Bhutan

> Built for the Omdena Challenge: *Building an Agentic AI Framework for Smart Tourism Operations in Bhutan*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.1-4A90E2)](https://langchain-ai.github.io/langgraph/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://python.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)](https://docker.com)

---

## What Is DrukPass?

Bhutan's tourism sector charges ~$250/day per tourist (Sustainable Development Fee) — one of the highest tourism fees in the world. Yet the regulatory back-office that supports this premium experience runs entirely on emails, PDFs, and phone calls.

**DrukPass replaces that** with an agentic AI system that automates the full regulatory workflow:

```
Operator submits booking
         │
         ▼
  ┌─────────────────────────────────────────────────────────┐
  │                  DRUKPASS AGENT CHAIN                    │
  │                                                          │
  │  🔍 Eligibility Agent                                    │
  │     Nationality × Purpose × Districts → Permit Type      │
  │                    │                                     │
  │                    ▼                                     │
  │  💰 SDF Agent                                            │
  │     Season × Duration × Waivers → Exact Fee             │
  │                    │                                     │
  │                    ▼                                     │
  │  📄 Permit Agent                                         │
  │     Generates permits + QR codes for all required types  │
  │                    │                                     │
  │                    ▼                                     │
  │  🏛️ Government Queue                                     │
  │     1-click approval dashboard for officers              │
  └─────────────────────────────────────────────────────────┘
         │
         ▼
  Operator notified, Guide assigned, Permit wallet updated
```

**Total processing time: < 10 seconds** (vs. 2–5 business days manual)

---

## Quick Start (Docker — recommended)

```bash
git clone https://github.com/UVishnuSaran/drukpass.git
cd drukpass

cp .env.example .env
# Optional: add your ANTHROPIC_API_KEY for LLM-enhanced features

docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000)

Demo credentials (seeded automatically):
| Role | Email | Password |
|------|-------|----------|
| 🏛️ Government Officer | pema@btc.gov.bt | Demo1234! |
| 🏢 Tour Operator | karma@himavatours.bt | Demo1234! |
| 🧭 Tourist Guide | tenzin@guides.bt | Demo1234! |

---

## Running Locally (without Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp ../.env.example .env
# Edit .env with your DATABASE_URL

# Run DB migrations
python -m alembic upgrade head

# Seed demo data
python scripts/seed_demo.py

# Start API server
uvicorn main:app --reload --port 8000
```

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### Frontend

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         DRUKPASS SYSTEM                          │
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │   Next.js 14     │    │    FastAPI        │                   │
│  │   Frontend       │◄──►│    Backend        │                   │
│  │                  │    │    (Python 3.11)  │                   │
│  │  • Gov Dashboard │    │                  │                   │
│  │  • Operator Portal│   │  ┌─────────────┐ │                   │
│  │  • Guide Wallet  │    │  │  LangGraph  │ │                   │
│  └──────────────────┘    │  │  Orchestrat │ │                   │
│                          │  └──────┬──────┘ │                   │
│                          │         │        │                   │
│                          │  ┌──────┼──────┐ │                   │
│                          │  │    Agents   │ │                   │
│                          │  │  ─────────  │ │   ┌────────────┐  │
│                          │  │  Eligibility│ │   │ PostgreSQL │  │
│                          │  │  SDF Calc  │◄────►│  Database  │  │
│                          │  │  Permit Gen│ │   └────────────┘  │
│                          │  │  Disruption│ │                   │
│                          │  └─────────────┘ │   ┌────────────┐  │
│                          │                  │   │   Redis    │  │
│                          └──────────────────┘   │  (Events)  │  │
│                                                 └────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **LangGraph for orchestration** | Graph-based state machine = auditable, resumable, testable agent chains |
| **Deterministic rules engine** | Permit rules are encoded as data (JSON), not LLM prompts — zero hallucination risk for regulatory decisions |
| **Event-sourced audit trail** | Every agent action is an immutable event — ISO 27001 compliance ready |
| **FastAPI async** | Handles concurrent bookings without blocking; key for demo scalability |
| **Three separate dashboards** | Each ICP (government/operator/guide) has radically different information needs |

---

## The Agent Chain in Detail

### 1. Eligibility Agent (`agents/eligibility_agent.py`)
- Loads Bhutan's permit rules from `data/permit_rules.json`
- Maps: nationality → regime (regional/international) → primary permit type
- Detects restricted districts → triggers Restricted Area Permit
- Detects trekking purpose → triggers Trekking Permit
- Checks guide requirements
- **Deterministic, no LLM** — auditable, instant

### 2. SDF Calculator (`agents/sdf_agent.py`)
- Implements Bhutan's 2023 SDF structure ($200–$250/day international, $15/day regional)
- Peak/low season detection from entry date
- Full waiver logic: under-5 (100%), 5–12 (50%), Bhutanese diaspora (100%)
- **Zero calculation errors** — exhaustively tested against fee schedule

### 3. Permit Generator (`agents/permit_agent.py`)
- Creates permit records for all required permit types
- Generates verifiable QR codes per permit
- Format: `BTG-2024-TV-XXXXXXXX` (Bhutan Tourism, year, type, unique ID)
- QR links to verification URL: `drukpass.bt/verify/{permit_number}`

### 4. Disruption Agent (`agents/disruption_agent.py`)
- Identifies all bookings affected by flight/weather/road disruption
- Generates targeted alerts per stakeholder (email + WhatsApp for operators, push for guides, dashboard for government)
- Suggests specific actions based on disruption type and severity
- **The competitive differentiator** — no existing system in the region does this

---

## Permit Rules Engine

Rules are data, not code. Edit `backend/data/permit_rules.json` to update:
- Nationality regimes (which countries = regional vs international)
- SDF rates per season
- District restrictions
- Waiver eligibility conditions
- Document requirements per permit type

This means **regulatory changes don't require code deployments** — update the JSON, restart.

---

## API Reference

Full interactive docs at: [http://localhost:8000/docs](http://localhost:8000/docs)

Key endpoints:

```
POST   /auth/register          Create operator/guide/gov account
POST   /auth/login             Get JWT token
GET    /auth/me                Current user profile

POST   /bookings               Submit booking → triggers agent chain immediately
GET    /bookings               List bookings (role-filtered)
GET    /bookings/{id}          Full booking detail with agent results + audit trail

PATCH  /permits/{id}/approve   Government 1-click approval
PATCH  /permits/{id}/reject    Government rejection with reason
GET    /permits/{id}/qr        QR code data for permit

POST   /disruptions            Log disruption → triggers disruption agent chain
GET    /government/dashboard   Aggregated government stats

GET    /guides/assignments     Guide's upcoming assignments
GET    /guides/permits         Guide's permit wallet
```

---

## Security

- JWT authentication (24-hour tokens)
- Role-based access control: OPERATOR | GOVERNMENT | GUIDE | ADMIN
- Government officers cannot access other operators' private data
- All actions logged to audit_events table (immutable, append-only)
- PII (passport numbers) stored encrypted at rest
- CORS restricted to registered frontend origins

---

## Contributing

This is an open-source Omdena project. Contributions welcome:

1. Fork the repo
2. Create feature branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "Add: your feature"`
4. Push + open PR

**Priority contribution areas:**
- Additional nationality rule sets (currently covers top 30 nationalities)
- Real flight API integration (Drukair API)
- WhatsApp notification delivery
- Mobile app (React Native) for guides
- Myanmar/Nepal port of the rules engine

---

## Built By

Omdena Challenge Team | Chapter: Smart Tourism Bhutan | 2026

> *"We do not build products that anyone could build."*

---

## License

MIT License — see [LICENSE](LICENSE)
