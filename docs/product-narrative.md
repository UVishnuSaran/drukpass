# DrukPass — Product Narrative
*Written by Vish (Chief of Product) | Session 1 | 2026-05-24*

---

## The World Before

It is Tuesday afternoon in Thimphu. A tour operator named Karma has just received
a booking from a Japanese traveler arriving in 3 days. Karma opens his email, his
WhatsApp, a government portal that times out half the time, and a printed binder
of SDF fee schedules from 2023. He calls the Tourism Council on the phone. He calls
the district office for the route permit. He manually calculates the SDF. He emails
the hotel confirmation, the guide assignment, and the permit status to three
different people — none of whom can see what the others have received.

A government officer named Pema checks her inbox: 47 emails. She approves permits
by reading PDFs and typing into a spreadsheet. She has no idea whether the SDF has
been paid, whether the guide is certified, or whether the traveler's nationality
creates a visa complication. She finds out when something goes wrong.

This is Bhutan's $100/day premium tourism experience. The paradox is absurd.

---

## What's Broken

Bhutan sells scarcity and exclusivity. But the back-office that supports that
experience is built for a country that doesn't care about either. The result:

- **Permit delays** make "high-value" travelers wait for paperwork
- **SDF calculation errors** create refund disputes and revenue leakage
- **No real-time visibility** means nobody knows the operational picture until it's too late
- **Disconnected stakeholders** means the right hand never knows what the left hand approved
- **Zero predictive capability** — a flight cancellation ripples into permit chaos with no warning

The problem is not that Bhutan is behind. The problem is that the gap between
the premium the country charges and the experience it delivers is entirely visible
in the back-office — and fixable with technology.

---

## What This Makes Possible

For the first time:

- A **government officer** can see every traveler, every permit, every SDF status
  on one live dashboard — and never touch a PDF for approval again
- A **tour operator** gets instant permit confirmation the moment a booking is made —
  and is notified automatically when disruptions affect their traveler's itinerary
- A **tourist guide** sees their assignments, route authorizations, and district
  permits on their phone before they leave the hotel
- **Bhutan's tourism ministry** gets real-time analytics: revenue by district,
  permit throughput, compliance rates — data they've never had

The traveler's experience becomes what the $100/day promises: seamless, dignified,
and invisible in its efficiency.

---

## Why Only We Can Build This

The rule engine for Bhutan's permits is complex: nationality × entry point × travel
purpose × district × duration × companion count → specific permit type + SDF tier +
waiver eligibility. Nobody outside Bhutan's tourism sector has mapped this. We are
mapping it, encoding it, and automating it — in 8 weeks.

The architecture is agentic AI purpose-built for regulatory orchestration. This is
not a CRUD app with a government skin. It is an autonomous agent network that
mirrors how Bhutan's tourism governance actually works — stakeholder by stakeholder,
rule by rule — and replaces manual coordination with real-time intelligence.

The competitive moat: once the rule engine is trained on Bhutan's regulatory corpus
and integrated with district permit systems, nobody replaces it without rebuilding
the institutional knowledge from scratch.

---

## The Feeling

When Karma the tour operator submits a booking and sees the full permit chain
resolve in under 10 seconds — permit type confirmed, SDF calculated, route permit
queued, guide notified — he feels what no government system has ever given him:

**Relief. And a little bit of wonder.**

When Pema the government officer opens her dashboard and sees the entire day's
tourism activity mapped — who's where, what's approved, what's pending, what
needs her eyes — she feels:

**In control. For the first time.**

---

## The Moat

1. **Regulatory knowledge graph** — Bhutan's permit rules encoded as a machine-readable
   ontology. Months of domain work. Cannot be copied without the source material.
2. **Multi-stakeholder real-time graph** — The live operational picture across operators,
   guides, government, and travelers. Network effects: more users → better intelligence.
3. **Agentic workflow chains** — LangGraph-orchestrated agents that mirror actual
   government approval workflows. Deeply integrated, not bolt-on.

---

## The Acquisition Story (ENTERPRISE mode)

**Buyer 1 — Bhutan's Tourism Ministry (Direct):** This IS the product for them.
Moving from Excel and email to a real-time national tourism OS. Deal value: national
licensing. Makes DrukPass the official GovTech partner.

**Buyer 2 — Regional Tourism Regulators (ASEAN, South Asia):** Every country in
the region has a version of this problem. Bhutan becomes the proof case. Nepal,
Bhutan, Maldives, Indonesia's protected zones — all have permit + fee + guide
complexity. DrukPass is the platform; they buy the regulatory-domain adaptation.

**Buyer 3 — Global Regulatory AI Platform (e.g., Microsoft, Salesforce GovCloud):**
The underlying agentic regulatory orchestration layer has enterprise value far
beyond tourism. Permits, licenses, compliance chains — every regulated industry
has this problem. DrukPass is the domain-specific instantiation of a general capability.

---

## Wow List (Demo Script Targets)

1. **The Chain Demo**: A tour operator submits one traveler booking. In under 10 seconds,
   the screen shows: nationality rule matched → permit type determined → SDF calculated →
   route permit queued → guide notified → government dashboard updated. Zero human input.

2. **The Disruption Demo**: A flight cancellation arrives. DrukPass identifies every
   affected traveler, their linked permits, their guides' schedules, their hotels'
   allocations — and sends coordinated alerts to all stakeholders with suggested
   rebooking windows. In 15 seconds.

3. **The Government View**: Pema opens the live operations dashboard. She sees a
   map of Bhutan with traveler flows, a permit queue requiring her signature, a
   compliance alert on one operator, and yesterday's SDF revenue — all on one screen.
   She approves 3 permits with one click each.

---
*This narrative is the decision-making lens for the entire team.*
*If a story doesn't serve one of these three ICPs or advance one Wow List moment — it gets cut.*
