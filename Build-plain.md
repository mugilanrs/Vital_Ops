# Vital-Ops: Agentic AI Operations Center — Build Plan

## Context

Building a PoC for an AI/ML-Ops ITSM solution called **Vital-Ops** for an insurance company. The product receives incidents from external trigger systems (Xurrent, Dynatrace simulators) and orchestrates AI agents to triage, correlate, recommend resolutions, and validate ticket quality. The goal is a polished, demo-ready product that impresses an audience.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend (main) | Next.js + Tailwind CSS + TypeScript |
| Frontend (trigger) | Separate Next.js app |
| Backend | Python FastAPI |
| Database | PostgreSQL (viewable via DBeaver locally) |
| ORM | SQLAlchemy + Alembic migrations |
| Vector DB | Qdrant |
| Embeddings | Sentence Transformers (all-MiniLM-L6-v2) |
| LLM | Groq API |
| Real-time | SSE (Server-Sent Events) |
| Containerization | Docker Compose |

---

## UI Design System (from stitch sample)

- **Theme**: Light only, primary brand color `#F41C5E`
- **Fonts**: Inter (UI) + JetBrains Mono (metadata/IDs/timestamps)
- **Cards**: 24px border-radius, subtle ambient shadows (`0 4px 20px rgba(0,0,0,0.04)`)
- **Aesthetic**: Premium SaaS, large whitespace, minimal, "AI command center" feel
- **Sidebar**: 260px fixed — Dashboard, Tickets, Incident Pipeline, Auto-Triage Agent, Incident Intelligence, IRR Agent, DQ Agent, Analytics, Settings

---

## Project Structure

```
D:\section 18\ML-Ops-V2\
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py
│   ├── api/
│   │   ├── schemas.py                   # All Pydantic models
│   │   ├── dependencies.py
│   │   └── routes/
│   │       ├── incidents.py             # POST/GET incidents
│   │       ├── triage.py
│   │       ├── intelligence.py
│   │       ├── irr.py
│   │       ├── resolve.py
│   │       ├── dq.py
│   │       ├── pipeline.py              # Full auto-pipeline
│   │       ├── analytics.py
│   │       ├── teams.py
│   │       └── sse.py                   # SSE stream
│   ├── agents/
│   │   ├── triage_agent.py
│   │   ├── intelligence_agent.py
│   │   ├── irr_agent.py
│   │   └── dq_agent.py
│   ├── rag/
│   │   ├── embeddings.py                # SentenceTransformer singleton
│   │   └── search.py                    # Qdrant similarity search
│   ├── llm/
│   │   ├── groq_client.py
│   │   └── prompts/
│   │       ├── irr_summary.txt
│   │       └── triage_reasoning.txt
│   ├── dq/
│   │   └── rules.py                     # 10 static DQ rules
│   ├── sse/
│   │   └── manager.py                   # SSE connection manager
│   └── db/
│       ├── database.py                  # SQLAlchemy engine + session factory
│       ├── models.py                    # ORM models (Ticket, Team, Engineer, TriageResult, etc.)
│       └── seed.py                      # Seed 50K tickets into PostgreSQL
├── frontend/                             # Main Vital-Ops app
│   ├── Dockerfile
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                 # Dashboard
│   │   │   ├── tickets/page.tsx         # Tickets list (Tab 1: Live, Tab 2: Historical)
│   │   │   ├── incident-pipeline/page.tsx
│   │   │   ├── auto-triage/page.tsx
│   │   │   ├── incident-intelligence/page.tsx
│   │   │   ├── irr-agent/page.tsx
│   │   │   ├── human-resolver/page.tsx
│   │   │   ├── dq-agent/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── components/
│   │   │   ├── layout/ (Sidebar, Topbar, PageContainer)
│   │   │   ├── shared/ (KpiCard, StatusChip, ConfidenceGauge, PipelineNode, etc.)
│   │   │   ├── dashboard/ (HeroSection, KpiGrid, LivePipeline, etc.)
│   │   │   ├── triage/ (TicketDetail, TriageRecommendation, etc.)
│   │   │   ├── intelligence/ (SearchAnimation, SimilarIncidentCard, etc.)
│   │   │   ├── irr/ (IrrReport, KbArticleChips, etc.)
│   │   │   ├── resolver/ (ResolutionEditor, AiRecommendationPanel)
│   │   │   ├── dq/ (PassFailBadge, RuleChecklist, QualityScore)
│   │   │   └── analytics/ (TrendChart, SummaryCards)
│   │   ├── hooks/ (useSSE, usePipeline, useIncident)
│   │   ├── lib/ (api.ts, types.ts, constants.ts)
│   │   └── styles/globals.css
├── trigger/                              # Standalone trigger app
│   ├── Dockerfile
│   └── src/app/
│       ├── page.tsx                     # Landing (two trigger options)
│       ├── xurrent/page.tsx             # ITSM ticket form
│       └── dynatrace/page.tsx           # Incident simulator
└── scripts/
    ├── generate_tickets.py
    ├── generate_teams.py
    ├── seed_qdrant.py
    └── data/ (scenario_catalog.json, variable_pool.json, team_roster.json, tickets_50k.jsonl)
```

---

## API Contract

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/events` | GET | SSE event stream |
| `/incidents` | POST | Receive new incident (from trigger app) |
| `/incidents` | GET | List incidents (`?status=&limit=`) |
| `/incidents/{id}` | GET | Get incident detail |
| `/incidents/{id}/triage` | POST | Run auto-triage agent |
| `/incidents/{id}/intelligence` | POST | Run intelligence search |
| `/incidents/{id}/irr` | POST | Generate IRR report |
| `/incidents/{id}/resolve` | PUT | Submit human resolution notes |
| `/incidents/{id}/dq` | POST | Run DQ validation |
| `/incidents/{id}/run-pipeline` | POST | Run full pipeline (streams SSE) |
| `/teams` | GET | List all teams |
| `/teams/{id}/engineers` | GET | Engineers for a team |
| `/analytics/summary` | GET | KPI summary |
| `/analytics/trends` | GET | Historical trends |

### SSE Event Flow
```
incident_received → triage_started → triage_completed → intelligence_started →
intelligence_completed → irr_started → irr_completed → human_review_pending →
dq_started → dq_completed → pipeline_complete
```

---

## Solution Pipeline Flow

1. **Trigger app** submits ticket → hits backend `POST /incidents` → ticket stored in **PostgreSQL**
2. Ticket appears on the **Tickets page** (Live tab) in the vital-ops frontend via SSE
3. User **clicks a ticket** → sees ticket detail → clicks **"Run Pipeline"** button to start processing
4. **Auto-Triage Agent**: Searches top-5 similar resolved tickets in Qdrant → tallies historical team ownership → ranks engineers by availability/load/skill → recommends team + engineer with confidence score
5. **Incident Intelligence Agent**: Embeds ticket → searches Qdrant for top-5 similar historical (Resolved/Closed) tickets → searches for correlated open tickets (same service_instance, status=New/In Progress)
6. **IRR Agent**: Displays the resolution notes from the top-5 similar tickets (same ones from Intelligence step) + sends incident + similar ticket context to Groq LLM → LLM synthesizes a combined recommended resolution with Summary, Business Impact, Resolution Steps, KB Articles, Confidence, Estimated Resolution Time. Page shows BOTH the raw similar ticket resolutions AND the LLM-generated recommendation.
7. **Human Resolver**: User reviews AI recommendation + similar ticket resolutions → writes/edits resolution notes → submits
8. **DQ Agent**: Validates resolution notes against 10 static rules → returns PASS/FAIL with rule-by-rule breakdown

Each stage emits SSE events so the frontend animates through the pipeline in real-time. All agent outputs are persisted to PostgreSQL.

---

## DQ Rules (10 Static Rules)

| # | Rule | Pass Condition |
|---|------|---------------|
| 1 | Minimum Length | Resolution notes >= 100 characters |
| 2 | Root Cause Identified | Contains "root cause", "caused by", "due to", "because" |
| 3 | Resolution Steps Present | Contains "resolved by", "fix applied", "steps taken", or numbered steps |
| 4 | No Placeholder Text | Absence of "TODO", "TBD", "PLACEHOLDER", "xxx", "lorem ipsum" |
| 5 | Customer-Friendly Language | No profanity, no "RTFM", "PEBKAC", "user error" |
| 6 | Service Instance Referenced | Ticket's service_instance appears in notes |
| 7 | Timestamp/Timeline Present | Contains date/time patterns or temporal words |
| 8 | No Copy-Paste Artifacts | No repeated lines, HTML tags, or oversized stack traces |
| 9 | Impact Acknowledged | Contains "impact", "affected", "downtime", "users impacted" |
| 10 | Preventive Measures | Contains "prevent", "going forward", "recommendation", "monitoring" |

**Scoring**: `(rules_passed / 10) * 100`. Overall PASS requires score >= 70.

---

## Mock Data Design

**Teams**: 20 teams, ~250 engineers mapped to 13 service instances (including HEAL)
- Key teams: Cloud Ops, Salesforce Admin, API Gateway, Claims Platform, Policy Platform, Duck Creek Engineering, SAP Basis, HEAL Engineering, IAM Security, Network Engineering, etc.
- Each engineer: name, team, specializations, status (Available 60% / Busy 30% / On Leave 10%), current_load (0-8), seniority

**Tickets**: 50,000 in JSONL format
- Adapted from user's script architecture: scenario_catalog + variable_pool + team_roster
- 13 service instances (12 existing + HEAL)
- Quality tiers: golden 15%, acceptable 50%, poor 25%, bad 10%
- Status distribution: Resolved 60%, Closed 20%, In Progress 10%, New 5%, Cancelled 5%

---

## Phased Build Order

### Phase 0 — Data Generation (~4h)
Generate scenario_catalog.json, variable_pool.json, team_roster.json, tickets_50k.jsonl. Adapt user's existing script structure for insurance context + add HEAL scenarios.

### Phase 1 — Backend Scaffold + PostgreSQL + SSE (~8h)
FastAPI app with CORS. PostgreSQL database with SQLAlchemy ORM models (Ticket, Team, Engineer, TriageResult, IntelligenceResult, IrrResult, DqResult). Alembic migration setup. SSE manager. Incident CRUD endpoints. Team endpoints. Seed 50K tickets + teams into PostgreSQL. DB accessible via DBeaver on `localhost:5432`. Stub all agent routes.

### Phase 2 — Qdrant Embedding Pipeline (~5h)
SentenceTransformer embeddings, seed_qdrant.py script to embed and upsert 50K tickets into Qdrant. Collection: `itsm_incidents`, vector dim 384.

### Phase 3 — Auto-Triage Agent (~5h)
Vector search for similar tickets → historical team ownership scoring → engineer ranking by availability/load/skill → confidence score + SLA estimate.

### Phase 4 — Incident Intelligence Agent (~4h)
Top-5 similar historical incidents (status=Resolved/Closed) + correlated open ticket search (same service_instance, status=New/In Progress).

### Phase 5 — IRR Agent (~5h)
Groq client, IRR prompt. Takes the top-5 similar ticket resolution notes from the Intelligence step. Displays those 5 resolutions as cards AND sends them to Groq LLM to synthesize a combined recommended resolution with Summary, Business Impact, Resolution Steps, KB Articles, Confidence, Estimated Resolution Time. Both raw resolutions and LLM synthesis stored in PostgreSQL.

### Phase 6 — DQ Agent (~3h)
10 static rule functions, quality score computation, PASS/FAIL logic.

### Phase 7 — Pipeline Orchestrator (~3h)
Single endpoint runs all agents sequentially, streaming SSE events at each stage transition.

### Phase 8 — Frontend Shell + Design System (~6h) [parallel with Phases 3-7]
Next.js scaffold, Tailwind config with full stitch design tokens, layout components (Sidebar, Topbar), all shared components (KpiCard, PipelineNode, ConfidenceGauge, etc.), SSE hook.

### Phase 9 — Dashboard Page (~5h)
Hero section, 5 KPI cards with sparklines, Live AI Pipeline visualization (7 animated nodes), Live Incident Feed, Agent Status cards, Operational Insights charts.

### Phase 10 — Tickets Page + Agent Pages (7 pages, ~10h)
**Tickets Page**: Two tabs — "Live" (tickets from trigger, newest first) and "Historical" (50K tickets, paginated, searchable). Clicking a ticket navigates to the Incident Pipeline page with a "Run Pipeline" button.
**Agent Pages** (6): Incident Pipeline (with pipeline tracker + "Run Pipeline" button), Auto-Triage, Incident Intelligence, IRR Agent (shows 5 similar ticket resolutions + LLM-synthesized recommendation), Human Resolver, DQ Agent — each wired to backend APIs and SSE events.

### Phase 11 — Analytics + Settings (~4h) [parallel with Phase 12]
7 analytics charts (Recharts) + static settings page.

### Phase 12 — Trigger App (~4h) [parallel with Phase 11]
Standalone Next.js app with Xurrent ticket form + Dynatrace incident simulator.

### Phase 13 — Docker Compose + E2E Polish (~4h)
Dockerfiles, docker-compose.yml, seed script integration, E2E smoke test, loading/empty states, error boundaries.

**Total: ~14 days, ~72 hours**

---

## Key Architectural Decisions

1. **PostgreSQL** for all persistent data — tickets (50K historical + live), teams, engineers, agent results (triage, intelligence, IRR, DQ). Viewable via DBeaver locally on `localhost:5432`.
2. **SQLAlchemy ORM** with Alembic migrations — structured models for Ticket, Team, Engineer, TriageResult, IntelligenceResult, IrrResult, DqResult. All agent outputs stored as related records.
3. **Qdrant** holds the same 50K tickets as vectors for similarity search. PostgreSQL is the source of truth for all data; Qdrant is the search index.
4. **SSE over WebSockets** — simpler, sufficient for unidirectional server-to-client pipeline updates.
5. **Triage is deterministic** (vector search + scoring), NOT LLM-based — faster, more explainable.
6. **IRR Agent uses the LLM** (Groq) to synthesize resolutions, but also displays the raw resolution notes from the top-5 similar tickets. Both the similar ticket cards and the LLM recommendation are shown on the IRR page.
7. **DQ is purely rule-based** — demonstrates contrast between AI agents and static validation.
8. **Embedding field**: `subject + description + resolution_notes` concatenated for richest semantic signal.
9. **Next.js App Router** with server components where possible, client components for interactive elements.
10. **Tickets page** has two tabs: "Live" (tickets from trigger app, most recent first) and "Historical" (50K tickets, paginated + searchable). Clicking a ticket opens the incident pipeline view with a "Run Pipeline" button.

---

## Docker Compose Services

```
services:
  postgres      — PostgreSQL 16, port 5432, viewable via DBeaver
  qdrant        — Qdrant latest, ports 6333/6334
  backend       — FastAPI, depends on postgres + qdrant, port 8000
  frontend      — Next.js main app, port 3000
  trigger       — Next.js trigger app, port 3001
```

Backend `.env`:
```
DATABASE_URL=postgresql+asyncpg://vitalops:vitalops@postgres:5432/vitalops
QDRANT_URL=http://qdrant:6333
GROQ_API_KEY=<user's key>
GROQ_MODEL=llama-3.1-8b-instant
EMBEDDING_MODEL=all-MiniLM-L6-v2
```

---

## Verification Plan

1. **PostgreSQL**: Connect via DBeaver to `localhost:5432` → verify `tickets` table has 50K rows, `teams` and `engineers` tables populated
2. **Qdrant**: Verify collection has 50K vectors via Qdrant dashboard (`localhost:6333/dashboard`)
3. **Backend**: `curl POST /incidents` → verify ticket stored in PostgreSQL + SSE event received
4. **Tickets Page**: Verify Live tab shows new trigger tickets, Historical tab shows 50K tickets with pagination/search
5. **Pipeline E2E**: Click a ticket → click "Run Pipeline" → watch pipeline animate through all stages in real-time
6. **Agent outputs**: Verify triage recommends correct team/engineer, intelligence returns 5 similar tickets, IRR shows both raw resolutions + LLM synthesis, DQ correctly passes/fails
7. **UI**: Visual comparison against stitch screenshots — verify color tokens, spacing, typography, animations match
8. **Docker**: `docker-compose up` starts all 5 services, seed scripts populate PostgreSQL + Qdrant, full demo works

