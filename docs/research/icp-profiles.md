# DrukPass — ICP Profiles & Empathy Maps
*Iris (Design Thinker) | Session 1 | 2026-05-24*

---

## ICP 1: The Government Tourism Officer (Pema)

**Profile:**
- Mid-level civil servant at Bhutan Tourism Council or district office
- 35–50 years old, moderate digital literacy, comfortable with phones/WhatsApp
- Manages permit approvals, compliance verification, operator communications
- Works 8–5, handles 20–60 permit-related emails per day
- Accountable to ministry KPIs she cannot currently measure

**Current Tuesday Afternoon:**
1. Opens inbox: 47 emails. 12 are permit applications as PDF attachments.
2. Opens each PDF, cross-checks against a spreadsheet. Some are missing fields.
3. Calls operator to ask for missing info — gets voicemail.
4. Approves 8 permits, defers 4 pending info, misses 2 deadlines.
5. Has no idea what the SDF revenue for today looks like.
6. Leaves at 5:30pm with 11 emails unanswered.

**Real Pain (not the stated pain):**
> "I'm always behind and I never know if I'm making the right call.
> The information I need to approve a permit is spread across 6 places
> and I have to assemble it manually every single time."

**Hypotheses:**
- H1: Pema would accept AI-assisted approvals IF she can always override them. She needs to feel in control.
- H2: The killer feature for Pema is a consolidated approval queue — one screen, all info, one click.
- H3: She will NOT read documentation. Onboarding must be < 3 minutes, guided by the system itself.
- H4: She fears data errors leading to compliance incidents. Trust is built through audit trails she can read.

**Design Implications:**
- One dashboard, minimal navigation. She should not need to search for anything.
- Permit approval: one card per application. All relevant info surfaced. One-click approve/reject/defer.
- Compliance alerts must be prominent, not buried.
- Mobile-friendly — she often approves from her phone between meetings.

---

## ICP 2: The Tour Operator / Hotel Manager (Karma)

**Profile:**
- Owner-operator of a small-to-medium tourism business in Bhutan
- 28–45 years old, very comfortable with smartphones, uses WhatsApp constantly
- Manages 5–40 traveler bookings/month, each requiring permit coordination
- Time pressure is acute — late permits = unhappy high-value clients
- Revenue depends on getting approvals right and fast

**Current Tuesday Afternoon:**
1. Gets a new booking inquiry from a Japanese traveler wanting restricted-zone access.
2. Spends 30 minutes calculating the SDF (wrong version of the fee table).
3. Submits permit application via email. CC's the district office. No tracking.
4. Follows up by WhatsApp 2 days later. Gets a reply 1 day after that.
5. Calls the guide to hold the dates — guide isn't sure yet if certified for that route.
6. Tells the traveler "should be fine" while knowing it might not be.

**Real Pain:**
> "Every booking is a coordination puzzle and I never know where anything stands.
> My reputation is on the line if a permit doesn't come through in time."

**Hypotheses:**
- H1: Karma wants instant status visibility above everything else. Not speed — certainty.
- H2: WhatsApp integration would be adopted immediately. He lives in WhatsApp.
- H3: He will submit bookings more frequently if he can get instant permit eligibility
  feedback before committing to a client.
- H4: SDF calculation is a recurring pain point — he's made errors that cost him money.

**Design Implications:**
- Booking submission must be a fast form — not a long government portal.
- Status tracking: one page, one traveler, all linked permits/SDF/guide status.
- Instant eligibility check before full submission (saves wasted applications).
- Notifications via WhatsApp or push (not email — he doesn't check email).
- SDF calculator should be explicit: show the math, show the rule applied.

---

## ICP 3: The Tourist Guide (Tenzin)

**Profile:**
- Licensed guide, 22–40 years old, works freelance across multiple operators
- Very mobile, often in the field. Smartphone is their primary device.
- Manages district permits, route authorizations, and certification renewals
- Last to know about itinerary changes — currently notified by WhatsApp from operator

**Current Tuesday Afternoon:**
1. Working a 5-day trek. Gets a WhatsApp: "New booking, can you do Haa district next week?"
2. Doesn't know if his route permit covers Haa. Calls the district office — wrong number.
3. Messages another guide who might know. Waits.
4. Commits tentatively. Permit comes through 2 days before — or doesn't.
5. Has no single place to see his upcoming assignments, route auths, and cert status.

**Real Pain:**
> "I'm always the last to know and the first to be blamed when permits don't
> come through. I need someone to just tell me: yes you can go, here's the proof."

**Hypotheses:**
- H1: Tenzin's killer feature is a personal permit wallet — all his authorizations,
  one screen, shareable QR for checkpoint verification.
- H2: He will check the app daily if assignment notifications are reliable.
- H3: Route permit generation for guides (not just for operators) would be the feature
  that earns word-of-mouth adoption in the guide community.
- H4: He is a secondary user — the operator is the primary actor, but Tenzin needs
  visibility into what the operator has done on his behalf.

**Design Implications:**
- Guide-specific mobile view: assignment card + permit status + route authorization + cert expiry.
- Shareable permit QR code for checkpoint verification (this is the wow moment for guides).
- Push notification when operator submits on their behalf — "New booking: Paro, 3 days, Fri–Sun."
- Cert renewal reminders before expiry (guides lose business to this constantly).

---

## Cross-ICP User Journey Map

```
TRAVELER BOOKS
     │
     ▼
Karma (Operator) submits booking in DrukPass
     │
     ├─── INSTANT: Nationality check → permit type identified → SDF calculated
     │
     ├─── AUTO: Route permit queued for district approval
     │
     ├─── NOTIFIED: Tenzin (Guide) receives assignment notification
     │
     └─── NOTIFIED: Pema (Government) sees new application in her queue
                │
                ▼
           Pema approves (1-click) → All parties notified simultaneously
                │
                └─── Karma: booking confirmed to traveler
                └─── Tenzin: permit appears in his wallet
                └─── Ministry: SDF revenue logged + compliance audit trail created
```

**The demo should walk this entire chain in under 60 seconds.**

---

## Frontier Watch (Comparable Systems)

| System | What it does well | What DrukPass must do better |
|--------|------------------|------------------------------|
| Nepal's TAAN portal | Basic permit submission | Real-time status, agent orchestration |
| India e-Visa | Fast eligibility check | Multi-stakeholder visibility |
| New Zealand RealMe | Identity + permit stack | Tourism-specific rule engine |
| Maldives Tourist Portal | Resort permit + SDF | Multi-district complexity, guide management |

**Key insight:** No system in the region does end-to-end agentic orchestration across
government + operators + guides simultaneously. DrukPass is the first.
