# DrukPass — Product Requirements Document
*John (Product Manager) | Session 1 | 2026-05-24*
*Reviewed against: product-narrative.md + icp-profiles.md*

---

## 1. Executive Summary

DrukPass is an agentic AI platform that automates Bhutan's tourism regulatory 
workflows — connecting tour operators, tourist guides, and government officers 
into a unified, real-time system. Built for the Omdena challenge (8 weeks), 
targeting GovTech Bhutan as the primary client audience.

---

## 2. Problem Statement

Bhutan's ~$100/day SDF premium tourism model runs on fragmented manual workflows:
- Permit approvals take 2–5 business days (should be minutes)
- SDF calculations are error-prone (no automated rules engine)
- Zero real-time visibility across the 3-stakeholder ecosystem
- Flight disruptions cause manual cascade of rebooking/permit changes

**Measurable impact of problem:** An estimated 15–20% of permit processing time 
is wasted on back-and-forth for missing information. SDF calculation errors 
affect an estimated 8–12% of bookings annually.

---

## 3. Target Users (from Iris's ICP Research)

| User | Role | Primary Device | Core Need |
|------|------|---------------|-----------|
| **Pema** (Gov Officer) | Permit approvals, compliance | Desktop + mobile | One-screen queue, 1-click approvals |
| **Karma** (Tour Operator) | Booking + permit coordination | Mobile + desktop | Instant eligibility + status certainty |
| **Tenzin** (Tourist Guide) | Route permits, assignments | Mobile only | Permit wallet + assignment notifications |

---

## 4. North Star Metric

**Permit-to-Approval Time**: Average time from operator booking submission to 
government-approved permit ready.

*Current baseline (manual): 2–5 business days*
*DrukPass target: < 10 minutes for pre-verified travelers*

---

## 5. KPI Framework

| Category | Metric | Target |
|----------|--------|--------|
| North Star | Permit-to-approval time | < 10 min for pre-verified |
| Activation | Operator submits first booking | Within 5 min of signup |
| Throughput | Permits processed/day (demo) | 50+ without degradation |
| Accuracy | SDF calculation error rate | 0% on demo scenarios |
| Agent chain | End-to-end chain completion rate | 95%+ in demo scenarios |
| Compliance | Audit trail coverage | 100% of all permit events |
| Demo | Wow chain demo completion (booking → gov dashboard) | < 10 seconds |

---

## 6. MVP Scope (8-Week Build)

### Epic 1: Core Agentic Workflow Engine (Sprint 1–2)
The backbone. Everything else depends on this.

| Story ID | Story | Acceptance Criteria |
|----------|-------|---------------------|
| E1-S1 | Permit Eligibility Agent | Given nationality + purpose + district → returns permit type + required docs in < 2s |
| E1-S2 | SDF Calculation Engine | Given traveler profile → returns correct SDF amount + waiver status (zero calculation errors) |
| E1-S3 | Route Permit Generator | Given approved eligibility → generates district permit document with QR code |
| E1-S4 | LangGraph Orchestration Layer | All 3 agents above chained: input → eligibility → SDF → permit, with retry logic + audit events |
| E1-S5 | Disruption Management Agent | Receives flight status event → identifies affected travelers → generates stakeholder alert payloads |

### Epic 2: Operator Portal (Sprint 2–3)
Karma's interface. The booking submission + status tracking surface.

| Story ID | Story | Acceptance Criteria |
|----------|-------|---------------------|
| E2-S1 | Operator Onboarding + Auth | Operator signs up, verified, dashboard accessible in < 3 min |
| E2-S2 | Booking Submission Form | Multi-step form: traveler details → instant eligibility check → submit. Auto-saves progress. |
| E2-S3 | SDF Pre-Calculator | Inline calculator shows breakdown before submission. Taps same engine as backend. |
| E2-S4 | Application Tracker | Per-booking status page: permit stage, SDF status, guide assignment, government approval status |
| E2-S5 | Disruption Alert Dashboard | Operator sees affected bookings when disruption agent fires. Suggested actions shown. |

### Epic 3: Government Dashboard (Sprint 2–3)
Pema's interface. The approval queue + compliance visibility surface.

| Story ID | Story | Acceptance Criteria |
|----------|-------|---------------------|
| E3-S1 | Gov Officer Auth + Role Management | Secure login, role-based access (reviewer vs approver vs ministry admin) |
| E3-S2 | Permit Approval Queue | Cards view: one card = one application. All info on card. 1-click approve/reject/defer with reason. |
| E3-S3 | Compliance Audit Trail | Per-permit: full event timeline, all agent actions, all human decisions, timestamped |
| E3-S4 | Live Operations Map | Real-time traveler positions by district. Permit status overlaid. SDF revenue for today. |
| E3-S5 | Government Reporting Export | CSV/PDF snapshot report: permits by period, SDF revenue, compliance rate, operator rankings |

### Epic 4: Guide Permit Wallet (Sprint 3)
Tenzin's interface. The mobile-first permit view.

| Story ID | Story | Acceptance Criteria |
|----------|-------|---------------------|
| E4-S1 | Guide Auth + Profile | Guide signs up, certifications entered, linked to operator bookings |
| E4-S2 | Assignment Notifications | Push notification when operator adds guide to booking. Deep-links to assignment card. |
| E4-S3 | Permit Wallet | All active + upcoming permits, QR code per permit for checkpoint scanning |
| E4-S4 | Cert Expiry Reminders | Automated alert 30/15/7 days before certification expiry |

### Epic 5: Infra, Observability, and Demo Hardening (Sprint 4)

| Story ID | Story | Acceptance Criteria |
|----------|-------|---------------------|
| E5-S1 | Azure deployment + CI/CD | Push to main → auto-deploy to Azure. 1 URL, always live. |
| E5-S2 | Demo seed data script | `npm run seed:demo` populates realistic data (3 operators, 10 travelers, 5 guides, 2 disruptions) |
| E5-S3 | End-to-end Playwright test suite | Full chain test: booking → agents → permit → gov approval. Passes in CI. |
| E5-S4 | Observability stack | Error tracking + latency dashboards + agent chain success rate visible |
| E5-S5 | Demo script validation | Stacey runs the 3 Wow List demos button-by-button. All pass. 0 broken flows. |

---

## 7. Out of Scope (This Build)

- Real flight API integration (mock with realistic data)
- Real district permit system integration (mock API with realistic response structure)
- Payment processing for SDF (calculation only, no actual payment collection)
- Tourist traveler interface (the traveler is a subject, not a user in this MVP)
- Multi-language support (English + Dzongkha labels in Phase 2)

---

## 8. Tech Stack (Preliminary — Winston confirms)

| Layer | Technology |
|-------|-----------|
| AI Orchestration | LangGraph (Python) |
| Backend API | FastAPI (Python) |
| Frontend | Next.js 14 (TypeScript) |
| Database | PostgreSQL (Azure Database) |
| Cloud | Azure (App Service + Azure Database + Blob Storage) |
| Auth | Auth0 or Azure AD B2C |
| Notifications | Azure Service Bus → WhatsApp Cloud API / FCM |
| CI/CD | GitHub Actions → Azure |
| Monitoring | Azure Application Insights |

---

## 9. Sprint Plan (aligned to Omdena structure)

| Sprint | Weeks | Focus | Deliverable |
|--------|-------|-------|-------------|
| Sprint 1 | 1–2 | Architecture + Epic 1 (Agent Engine) | Working agentic chain: eligibility → SDF → permit |
| Sprint 2 | 3–4 | Epic 2 + Epic 3 start | Operator portal live + Gov queue functional |
| Sprint 3 | 5–6 | Epic 3 complete + Epic 4 | Full 3-dashboard system + guide wallet |
| Sprint 4 | 7–8 | Epic 5 + polish | Demo-ready, Azure-deployed, 3 Wow demos passing |

---

## 10. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Bhutan permit rules complexity underestimated | High | High | Map top 10 nationality cases first. Stub the rest. |
| LangGraph orchestration bugs | Medium | High | Integration tests on chain from Sprint 1. Nova owns. |
| 3 dashboards too much for 8 weeks | Medium | High | Operator portal and Gov queue are P0. Guide wallet is P1 (can cut to read-only if needed). |
| Demo data looking fake | Low | High | Seed script with named Bhutanese operators, real district names, realistic SDF amounts. |

---

## 11. Success Criteria (for Omdena Submission)

The submission is judged on:
1. **Technical depth** — agentic AI, not just a form
2. **Real-world applicability** — does it actually solve the problem?
3. **Demo quality** — does it work live, impressively, without setup?
4. **Code quality** — clean, documented, deployable open-source repo

**We pass all 4 if:** The Wow Chain Demo runs flawlessly in < 10 seconds and the 
GitHub repo has a clean README with a working `docker-compose up` that anyone can run.
