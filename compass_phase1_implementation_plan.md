# AGENTIC PROCUREMENT SYSTEM

_PHASE 1 — IMPLEMENTATION PLAN_

_Architecture · Data Model · API Design · Build Sequence_

_Prepared by: Senior Technical Architecture & Product Strategy_

_Classification: Confidential — Internal Use Only_

# 1. Executive Summary

Compass Group is building an Agentic Procurement Communication System to fundamentally transform how it manages supplier coordination at scale. Phase 1 delivers a WhatsApp-first, AI-assisted platform that automates purchase order (PO) follow-up, interprets supplier responses using AI, detects exceptions early, and routes unresolved issues to human coordinators through a purpose-built operations dashboard.

## What We Are Building

A production-grade operational system that sits between Compass procurement operations, its supplier network, and SAP — the system of record for purchase orders. It replaces manual, reactive supplier follow-up with automated, proactive PO monitoring. When AI cannot safely resolve a situation, it hands off to a Single Point of Contact (SPOC) through a controlled human takeover workflow.

## Why It Matters

- 35,000 POs processed per month across 800 sites and 2,000 suppliers
- Current follow-up is manual, unscaled, and discovery of issues is reactive — often only surfaced after site escalation
- Supplier portals have failed in the past due to low adoption; WhatsApp meets suppliers where they already operate
- Perishable categories require earlier risk detection than the current process can provide
- Internal teams spend disproportionate time chasing updates rather than resolving real exceptions

## What Phase 1 Delivers

- SAP PO ingestion and normalization into an operational data store

- Automated WhatsApp outreach to suppliers for PO-level confirmation

- AI interpretation of supplier replies — structured intent, risk, and confidence scoring

- Exception detection: non-response, delay, rejection, shortage, ambiguity

- Case creation and assignment engine with SLA tracking

- SPOC dashboard with full conversation view and human takeover controls

- Audit trail across all PO events, messages, AI decisions, and human interventions

# 2. Problem Statement

Compass Group operates one of the most demanding procurement environments in the food services sector. At 35,000 POs per month, 2,000 active suppliers, and 800 sites, the current manual follow-up model has reached its operational ceiling.

| Pain Point | Operational Impact | How This System Solves It |
| --- | --- | --- |
| Manual supplier follow-up does not scale | Internal teams call or email thousands of suppliers every month with no structured tracking | Automated WhatsApp outreach with structured confirmation tracking and state management |
| Issues discovered late — at site escalation | By the time a site flags a missing delivery, there is little time to recover | AI detects risk at supplier response stage, hours or days before expected delivery |
| Supplier portal adoption was poor | Previous structured tools were not used; suppliers defaulted to informal channels | WhatsApp-first design meets suppliers in their natural environment |
| No PO-level communication state visibility | Procurement cannot see what is confirmed, at risk, or unresolved at any moment | Dashboard gives real-time visibility of every PO's communication state |
| Human coordinators lack context when intervening | SPOC teams engage suppliers without knowing what has already been said | Full AI-managed conversation thread is available in dashboard before any human takeover |
| Audit trail is incomplete or absent | No structured record of who said what, when, and what decision followed | Every message, AI classification, state change, and human action is logged |

## Scale Parameters Driving Architecture Decisions

| Parameter | Value | Architectural Implication |
| --- | --- | --- |
| Monthly PO volume | ~35,000 | Async job processing required; synchronous APIs cannot handle outreach at this scale |
| Active suppliers | ~2,000 | Supplier-contact mapping must be robust; multiple numbers per supplier are common |
| Sites | ~800 | Site-level SLA and category rules must be configurable, not hardcoded |
| Perishable PO share | Significant portion | Criticality-based SLA windows and faster escalation paths are required |
| Supplier WhatsApp contacts | Multiple per supplier | Thread binding logic must unify messages from different numbers per PO |

# 3. Phase 1 Use Cases

## 3.1 Use Case: Standard PO Confirmation (Happy Path)

| Step | Actor | Action / System Behaviour |
| --- | --- | --- |
| 1 | SAP | New PO created or updated. Ingestion service pulls PO data and normalises into internal schema. Supplier and site are linked. Communication eligibility is validated. |
| 2 | System (Orchestrator) | Workflow engine schedules outreach job. Message template rendered with PO number, supplier name, expected delivery date, and short item summary. |
| 3 | System (WhatsApp Gateway) | Outbound WhatsApp message sent to supplier primary contact. Message ID and timestamp stored. PO communication_state set to awaiting_response. |
| 4 | Supplier | Supplier reads the WhatsApp message and replies: 'Yes, we will deliver on Thursday as planned.' |
| 5 | System (Inbound Processor) | Inbound webhook fires. Message normalised and bound to active PO thread via phone number lookup. Message stored in messages table. |
| 6 | AI Interpretation Layer | AI classifies intent as 'confirmed', confidence_score 0.95, risk_level 'none', escalation_required false. |
| 7 | System | PO status updated to 'confirmed'. communication_state set to 'supplier_confirmed'. No case created. Audit event logged. |
| 8 | Outcome | PO confirmed. Procurement team has visibility. No human effort required. Full audit trail stored. |

## 3.2 Use Case: Delay Exception Detection and SPOC Escalation

| Step | Actor | Action / System Behaviour |
| --- | --- | --- |
| 1 | System | PO outreach sent as per standard flow. PO is a perishables category order. |
| 2 | Supplier | Supplier replies: 'Sorry, our truck broke down. We can deliver tomorrow morning, short on 2 items.' |
| 3 | AI | AI classifies: intent = 'delay', risk_level = 'high' (perishable + delay + shortage), confidence_score = 0.88, extracted_eta = next day, extracted_shortage_note = '2 items short'. escalation_required = true. |
| 4 | System | PO status updated to 'at_risk'. Case created with case_type = 'delay', priority = 'high'. Case assigned to SPOC based on site/category routing rules. SLA timer started. PO communication_state = 'exception_detected'. |
| 5 | SPOC Dashboard | SPOC receives case notification. Dashboard shows PO details, AI interpretation summary, full conversation thread, and delivery timeline. |
| 6 | SPOC | SPOC reviews the case. Decides whether to accept revised date or coordinate with site. Sends response via dashboard: 'We can accept delivery by 10 AM tomorrow. Please confirm and advise on the 2 short items.' |
| 7 | System | Message sent via WhatsApp from human sender. Thread state = 'human_controlled'. AI auto-reply locked. |
| 8 | Supplier | Supplier confirms revised time and names the 2 short items. |
| 9 | SPOC | SPOC logs resolution note and closes case. PO status updated accordingly. |
| 10 | Outcome | Delivery risk detected hours before it would have been discovered at site. SPOC resolves with context. Full audit trail preserved. |

## 3.3 Use Case: Non-Response Escalation with Reminders

| Step | Actor | Action / System Behaviour |
| --- | --- | --- |
| 1 | System | Initial outreach sent. Reminder cadence timer starts based on PO category and site rules. |
| 2 | System (Orchestrator) | First reminder sent after configured window (e.g. 4 hours for perishables, 24 hours for non-perishables). |
| 3 | Supplier | No reply received. |
| 4 | System | Second reminder sent. Retry count incremented. Each retry logged in audit_events. |
| 5 | System | Max retries reached. Case created with case_type = 'non_response', priority based on PO category and time-to-delivery. Assigned to SPOC. |
| 6 | SPOC | SPOC reviews non-response case. Checks if alternate supplier contact exists. May try calling directly or sending to secondary contact number. |
| 7 | System | If SPOC messages via dashboard, that message is sent through WhatsApp and logged. Thread is now human_controlled. |
| 8 | Outcome | Non-response escalated before delivery window closes. SPOC has time to arrange alternatives or confirm delivery through secondary contact. |

## 3.4 Use Case: Human Takeover from AI

| Step | Actor | Action / System Behaviour |
| --- | --- | --- |
| 1 | Supplier | Supplier sends a complex or ambiguous message: 'We are having problems with this order but we can talk about it, call us.' |
| 2 | AI | AI classifies: intent = 'ambiguity', confidence_score = 0.42 (below threshold), risk_level = 'medium', escalation_required = true. Raw model output stored. |
| 3 | System | Case created with case_type = 'ambiguity', priority = 'medium'. Thread not auto-replied. PO state = 'exception_detected'. |
| 4 | SPOC | SPOC opens case in dashboard. Sees AI summary: 'Supplier indicated an unspecified issue and requested a call. Low confidence on intent.' Full thread visible. |
| 5 | SPOC | Clicks Take Over Conversation. Thread state transitions to human_controlled. AI reply lock activated. |
| 6 | SPOC | Sends message: 'We noted your message. Can you clarify what the issue is with this order? We need a written update for our records.' |
| 7 | System | Message routed via WhatsApp. Logged under same thread and case. Sender type = 'human'. User ID recorded for audit. |
| 8 | Supplier | Supplier clarifies: delay due to production issue, 80% of order available. |
| 9 | SPOC | Coordinates internally with site. Logs resolution. Closes case. Thread can be released back to AI per policy. |
| 10 | Outcome | AI correctly identified its own uncertainty. Human handled with full context. No irreversible action taken on ambiguous input. |

## 3.5 Use Case: Supplier Rejection Handling

| Step | Actor | Action / System Behaviour |
| --- | --- | --- |
| 1 | Supplier | Supplier replies: 'We are unable to fulfil this order. Our facility has shut down this week.' |
| 2 | AI | AI classifies: intent = 'rejected', risk_level = 'critical', confidence_score = 0.91, escalation_required = true. |
| 3 | System | PO status = 'at_risk'. Case created with case_type = 'rejection', priority = 'critical'. SLA timer starts at compressed window. Case assigned to SPOC and optionally escalated to procurement manager. |
| 4 | SPOC + Procurement Manager | Case appears on dashboard with critical flag. AI summary shown. Full message thread visible. |
| 5 | SPOC | Takes over thread. Initiates internal coordination for alternative sourcing. May send message to supplier asking for timeline confirmation. |
| 6 | System | All actions — internal note, outbound messages, status changes — logged under case and audit trail. |
| 7 | Outcome | Rejection captured immediately. Critical case triggered. Procurement team can begin alternative sourcing well before delivery window. Site not surprised. |

# 4. Tech Stack Justification

| Component | Technology | Justification |
| --- | --- | --- |
| Backend API | FastAPI (Python) | Async-native with excellent performance for I/O-bound workloads like webhook processing. Native Pydantic validation for request/response schemas. Strong ecosystem for AI/ML integration. Type hints and OpenAPI generation included. Preferred by teams building LLM-integrated backends. |
| Primary Database | PostgreSQL | Fully relational data model — POs, threads, messages, cases — requires strong transactional consistency. JSONB support for AI model outputs. Advanced indexing for SLA queries. Row-level locking for concurrent state transitions. Excellent audit trail support with timestamps and constraints. |
| Cache / Ephemeral State | Redis | Used for deduplication of inbound webhook events, distributed locks on thread state transitions, rate limiting for outbound messages, and short-lived conversation session data. Sub-millisecond latency for lock acquisition. |
| Background Jobs | Celery with Redis broker | Mature async task framework. Supports scheduled tasks (reminder cadences), retries with exponential backoff, and priority queues. Scales horizontally by adding workers. Monitoring via Flower. |
| AI Workflow Orchestration | LangGraph | Used specifically for AI interpretation and decision graphs. Allows modelling multi-step reasoning paths where AI may classify, then request clarification, then re-classify. Scoped to AI interpretation layer only — not used for operational scheduling. |
| WhatsApp Channel | Meta WhatsApp Business API via BSP | Only enterprise-grade option for high-volume supplier messaging on WhatsApp. Supports template messages, webhook delivery, multi-number management. BSP layer adds reliability and compliance. |
| AI / LLM | OpenAI GPT-4o or equivalent | Best-in-class instruction following and structured JSON output. Used for supplier reply interpretation. Guarded by confidence thresholds and fallback rules. |
| Frontend | React / Next.js | Server-side rendering for fast initial dashboard load. Component ecosystem suitable for complex case management UI. Strong TypeScript support. Can share type contracts with FastAPI via OpenAPI. |
| Auth | Keycloak or Auth0 | Enterprise SSO integration, RBAC, OIDC/OAuth2. Supports role-based access for Admin, Procurement Manager, SPOC, Viewer personas. |
| Infrastructure | AWS or Azure — containerised | ECS or AKS for container orchestration. Managed PostgreSQL (RDS / Azure DB). Managed Redis. Autoscaling for webhook ingestion spikes. |
| Observability | OpenTelemetry + Grafana or Datadog | Distributed tracing across webhook → processor → AI → case services. Latency, error rate, and SLA breach alerting. |

## PostgreSQL vs MongoDB — Decision Rationale

This system is operationally stateful and relationally rich. Every PO links to a supplier, site, thread, messages, interpretations, cases, and audit events. These relationships must be enforced at the data layer, not application logic.

| Consideration | PostgreSQL | MongoDB |
| --- | --- | --- |
| Multi-entity transactional writes | ACID transactions across PO + case + thread state in a single commit | Multi-document transactions exist but are less natural and performant |
| SLA queries | Native datetime arithmetic, window functions, indexed timestamp queries | Requires aggregation pipelines with more complexity |
| Joins across PO, case, thread, message | Efficient JOIN-based queries | Requires denormalisation or application-level joins |
| AI output storage | JSONB columns for raw model output alongside typed fields | Document-native but no benefit for this hybrid model |
| Audit trail with constraints | Foreign keys, NOT NULL constraints, check constraints enforce integrity | Relies on application-layer enforcement |
| Decision | PostgreSQL | Not recommended for this use case |

## LangGraph Scope Boundary

LangGraph is scoped exclusively to the AI interpretation and decision layer. It is not used for operational scheduling, reminder cadences, SLA tracking, or case state management. Those workflows are handled by the application orchestrator and Celery workers.

- LangGraph manages: classify intent → assess confidence → determine escalation → output structured JSON

- Celery manages: schedule outreach → send reminder → trigger SLA breach → retry failed sends

- Application orchestrator manages: PO state machine transitions, case lifecycle, thread binding

This separation ensures AI workflow tooling is not misused for deterministic operational control, which must be reliable, auditable, and independent of model behaviour.

# 5. System Architecture

## 5.1 Major Components

| Component | Responsibility | Technology |
| --- | --- | --- |
| PO Ingestion Service | Pulls or receives PO data from SAP. Normalises fields. Links supplier contacts and sites. Sets initial communication eligibility. | FastAPI + Celery worker |
| Procurement Data Store | Source of truth for POs, threads, messages, cases, interpretations, audit events, templates, workflow jobs. | PostgreSQL |
| Workflow Orchestrator | Drives state machine: schedules outreach, manages reminder cadences, triggers SLA timers, detects timeout conditions. | Celery beat + workers |
| WhatsApp Gateway Adapter | Abstracts outbound message sending and inbound webhook normalisation from the BSP provider. | FastAPI route + BSP API |
| Inbound Message Processor | Receives normalised inbound messages. Binds to PO thread via phone number + context lookup. Stores message. Dispatches to AI. | Celery task |
| AI Interpretation Layer | Accepts raw message text and thread context. Returns structured JSON: intent, risk, confidence, ETA, escalation flag. | LangGraph + OpenAI |
| Case Management Service | Creates, prioritises, assigns, and tracks cases. Manages SLA timers. Handles status transitions. | FastAPI + PostgreSQL |
| Human Intervention Module | Allows SPOC to take over thread. Routes SPOC messages to supplier via WhatsApp. Locks AI auto-reply. | FastAPI + dashboard UI |
| SPOC Dashboard | Case queue, PO communication status, thread view, human message composer, SLA indicators, intervention history. | React / Next.js |
| Audit and Reporting Layer | Logs all events with timestamps, actors, and outcomes. Provides reporting views for management. | PostgreSQL + reporting queries |

## 5.2 Data Flow: PO Ingestion

- SAP creates or updates a PO (batch feed, event push, or API pull — TBD per open questions)

- PO Ingestion Service fetches and validates the PO

- Supplier ID resolved from ERP supplier code; supplier contacts fetched

- Site ID resolved from site code

- PO normalised and written to purchase_orders table

- Communication eligibility checked against category and site rules

- If eligible: workflow_jobs record created with type = 'initial_outreach', scheduled_at = now + configured offset

- Audit event logged: PO_IMPORTED

## 5.3 Data Flow: Outbound Outreach

- Orchestrator picks up pending outreach job from workflow_jobs

- Message template rendered with PO context (PO number, delivery date, supplier name, summary)

- WhatsApp Gateway sends message to supplier primary contact (and secondary contacts if configured)

- Outbound message stored in messages table. direction = outbound, sender_type = ai

- PO communication_state updated to awaiting_response

- Reminder job scheduled based on PO category SLA rules

- Audit event logged: OUTBOUND_SENT

## 5.4 Data Flow: Inbound Processing

- Supplier replies via WhatsApp

- WhatsApp provider sends webhook event to POST /api/v1/webhooks/whatsapp/inbound

- Webhook handler validates provider signature and deduplicates via Redis

- Inbound message normalised and dispatched to processing queue

- Inbound processor resolves PO thread via: (1) known phone number → active PO, (2) recent unresolved supplier thread, (3) PO reference in message text, (4) manual review fallback

- Message stored in messages table. direction = inbound, interpretation_status = pending

- AI interpretation task dispatched

## 5.5 Data Flow: AI Interpretation

- AI service receives: message text + thread context (summary, PO metadata, recent messages)

- LangGraph executes interpretation graph: classify → confidence check → risk assessment → output

- Structured JSON response stored in message_interpretations table

- System evaluates output against routing rules

- High confidence + no exception: PO state updated, no case created

- Exception detected or medium/low confidence: Case Management Service triggered

- Audit event logged: AI_CLASSIFICATION

## 5.6 Data Flow: Case Creation and Human Takeover

- Case Management Service creates case record with case_type, priority, SLA due timestamp

- Case assigned to SPOC per routing rules (by site, category, or workload)

- Case appears in SPOC dashboard

- SPOC opens case. Sees AI interpretation summary, full thread, PO metadata, SLA timer

- SPOC clicks Take Over. Thread current_owner transitions to human. AI auto-reply locked

- SPOC sends message via dashboard. Message routed to WhatsApp. Stored with sender_type = human

- When resolved: SPOC closes case. Resolution note logged. Thread can be released per policy

# 6. Data Model — Full PostgreSQL Schema

## suppliers

```sql
CREATE TABLE suppliers (
  supplier_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code      VARCHAR(64) NOT NULL UNIQUE,
  supplier_name      VARCHAR(255) NOT NULL,
  status             VARCHAR(20) NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','inactive','blocked')),
  primary_language   VARCHAR(10) NOT NULL DEFAULT 'en',
  metadata           JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_suppliers_code ON suppliers(supplier_code);
CREATE INDEX idx_suppliers_status ON suppliers(status);
```

## supplier_contacts

```sql
CREATE TABLE supplier_contacts (
  contact_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id        UUID NOT NULL REFERENCES suppliers(supplier_id),
  phone_number       VARCHAR(30) NOT NULL,
  contact_name       VARCHAR(255),
  role               VARCHAR(64),
  is_primary         BOOLEAN NOT NULL DEFAULT false,
  active             BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_supplier_contacts_phone ON supplier_contacts(phone_number)
  WHERE active = true;
CREATE INDEX idx_supplier_contacts_supplier ON supplier_contacts(supplier_id);
```

## sites

```sql
CREATE TABLE sites (
  site_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_code          VARCHAR(64) NOT NULL UNIQUE,
  site_name          VARCHAR(255) NOT NULL,
  region             VARCHAR(128),
  active             BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sites_code ON sites(site_code);
```

## users

```sql
CREATE TABLE users (
  user_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               VARCHAR(255) NOT NULL,
  email              VARCHAR(255) NOT NULL UNIQUE,
  role               VARCHAR(32) NOT NULL
                       CHECK (role IN ('admin','procurement_manager','spoc','viewer')),
  active             BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

## purchase_orders

```sql
CREATE TABLE purchase_orders (
  po_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number             VARCHAR(64) NOT NULL UNIQUE,
  supplier_id           UUID NOT NULL REFERENCES suppliers(supplier_id),
  site_id               UUID NOT NULL REFERENCES sites(site_id),
  po_date               DATE NOT NULL,
  expected_delivery_at  TIMESTAMPTZ NOT NULL,
  total_value           NUMERIC(12,2),
  currency              VARCHAR(3) DEFAULT 'GBP',
  category              VARCHAR(64) NOT NULL
                          CHECK (category IN ('perishables','non_perishables','other')),
  status                VARCHAR(32) NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open','confirmed','at_risk','closed','cancelled')),
  communication_state   VARCHAR(64) NOT NULL DEFAULT 'pending_outreach'
                          CHECK (communication_state IN (
                            'pending_outreach','awaiting_response','supplier_confirmed',
                            'exception_detected','human_controlled','resolved'
                          )),
  communication_eligible  BOOLEAN NOT NULL DEFAULT true,
  erp_raw_data           JSONB,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_site ON purchase_orders(site_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_comm_state ON purchase_orders(communication_state);
CREATE INDEX idx_po_delivery ON purchase_orders(expected_delivery_at);
CREATE INDEX idx_po_category ON purchase_orders(category);
```

## po_threads

```sql
CREATE TABLE po_threads (
  thread_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id              UUID NOT NULL UNIQUE REFERENCES purchase_orders(po_id),
  current_owner      VARCHAR(16) NOT NULL DEFAULT 'ai'
                       CHECK (current_owner IN ('ai','human')),
  last_inbound_at    TIMESTAMPTZ,
  last_outbound_at   TIMESTAMPTZ,
  summary_text       TEXT,
  outreach_count     INT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_thread_po ON po_threads(po_id);
CREATE INDEX idx_thread_owner ON po_threads(current_owner);
```

## messages

```sql
CREATE TABLE messages (
  message_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id              UUID NOT NULL REFERENCES po_threads(thread_id),
  direction              VARCHAR(8) NOT NULL CHECK (direction IN ('inbound','outbound')),
  channel                VARCHAR(16) NOT NULL DEFAULT 'whatsapp',
  sender_number          VARCHAR(30),
  receiver_number        VARCHAR(30),
  sender_type            VARCHAR(16) NOT NULL
                           CHECK (sender_type IN ('supplier','ai','human')),
  body_text              TEXT,
  media_type             VARCHAR(32),
  media_url              TEXT,
  provider_message_id    VARCHAR(128) UNIQUE,
  delivery_status        VARCHAR(32) DEFAULT 'sent'
                           CHECK (delivery_status IN ('sent','delivered','read','failed')),
  interpretation_status  VARCHAR(16) NOT NULL DEFAULT 'pending'
                           CHECK (interpretation_status IN ('pending','processed','skipped','failed')),
  sent_at                TIMESTAMPTZ,
  received_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_messages_direction ON messages(direction);
CREATE INDEX idx_messages_sender_number ON messages(sender_number);
CREATE INDEX idx_messages_received ON messages(received_at DESC);
```

## message_interpretations

```sql
CREATE TABLE message_interpretations (
  interpretation_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id              UUID NOT NULL UNIQUE REFERENCES messages(message_id),
  intent                  VARCHAR(32) NOT NULL
                            CHECK (intent IN (
                              'confirmed','rejected','partial','delay',
                              'clarification','unrelated','unknown'
                            )),
  risk_level              VARCHAR(16) NOT NULL
                            CHECK (risk_level IN ('none','low','medium','high','critical')),
  confidence_score        NUMERIC(4,3) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  extracted_eta           TIMESTAMPTZ,
  extracted_shortage_note TEXT,
  escalation_required     BOOLEAN NOT NULL DEFAULT false,
  reasoning               TEXT,
  raw_model_output        JSONB,
  model_version           VARCHAR(64),
  processing_ms           INT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_interp_message ON message_interpretations(message_id);
CREATE INDEX idx_interp_intent ON message_interpretations(intent);
CREATE INDEX idx_interp_escalation ON message_interpretations(escalation_required);
```

## cases

```sql
CREATE TABLE cases (
  case_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id              UUID NOT NULL REFERENCES purchase_orders(po_id),
  thread_id          UUID NOT NULL REFERENCES po_threads(thread_id),
  case_type          VARCHAR(32) NOT NULL
                       CHECK (case_type IN (
                         'non_response','delay','rejection','shortage',
                         'ambiguity','manual_review','other'
                       )),
  priority           VARCHAR(16) NOT NULL DEFAULT 'medium'
                       CHECK (priority IN ('low','medium','high','critical')),
  status             VARCHAR(32) NOT NULL DEFAULT 'open'
                       CHECK (status IN (
                         'open','in_progress','waiting_supplier','resolved','closed'
                       )),
  assigned_user_id   UUID REFERENCES users(user_id),
  due_at             TIMESTAMPTZ,
  resolved_at        TIMESTAMPTZ,
  resolution_note    TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cases_po ON cases(po_id);
CREATE INDEX idx_cases_assigned ON cases(assigned_user_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_priority ON cases(priority);
CREATE INDEX idx_cases_due ON cases(due_at) WHERE status NOT IN ('resolved','closed');
```

## case_events

```sql
CREATE TABLE case_events (
  event_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id            UUID NOT NULL REFERENCES cases(case_id),
  actor_user_id      UUID REFERENCES users(user_id),
  actor_type         VARCHAR(16) NOT NULL CHECK (actor_type IN ('system','human','ai')),
  event_type         VARCHAR(64) NOT NULL,
  event_payload      JSONB,
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_case_events_case ON case_events(case_id);
CREATE INDEX idx_case_events_time ON case_events(created_at DESC);
```

## audit_events

```sql
CREATE TABLE audit_events (
  audit_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type         VARCHAR(64) NOT NULL,
  entity_type        VARCHAR(32) NOT NULL,
  entity_id          UUID NOT NULL,
  actor_user_id      UUID REFERENCES users(user_id),
  actor_type         VARCHAR(16) NOT NULL CHECK (actor_type IN ('system','human','ai')),
  before_state       JSONB,
  after_state        JSONB,
  metadata           JSONB,
  ip_address         INET,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_event_type ON audit_events(event_type);
CREATE INDEX idx_audit_time ON audit_events(created_at DESC);
CREATE INDEX idx_audit_actor ON audit_events(actor_user_id);
```

## workflow_jobs

```sql
CREATE TABLE workflow_jobs (
  job_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type           VARCHAR(64) NOT NULL,
  po_id              UUID REFERENCES purchase_orders(po_id),
  case_id            UUID REFERENCES cases(case_id),
  status             VARCHAR(16) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','running','completed','failed','cancelled')),
  scheduled_at       TIMESTAMPTZ NOT NULL,
  executed_at        TIMESTAMPTZ,
  retry_count        INT NOT NULL DEFAULT 0,
  max_retries        INT NOT NULL DEFAULT 3,
  error_message      TEXT,
  payload            JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_jobs_pending ON workflow_jobs(scheduled_at)
  WHERE status = 'pending';
CREATE INDEX idx_jobs_po ON workflow_jobs(po_id);
CREATE INDEX idx_jobs_type ON workflow_jobs(job_type);
```

## templates

```sql
CREATE TABLE templates (
  template_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name      VARCHAR(128) NOT NULL UNIQUE,
  channel            VARCHAR(16) NOT NULL DEFAULT 'whatsapp',
  language           VARCHAR(10) NOT NULL DEFAULT 'en',
  template_type      VARCHAR(64) NOT NULL,
  subject            VARCHAR(255),
  body_template      TEXT NOT NULL,
  variables          JSONB,
  active             BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_templates_type ON templates(template_type, language);
```

# 7. API Design

## 7.1 PO Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /api/v1/pos | List POs with filters: status, communication_state, site_id, supplier_id, category, date range. Paginated. |
| GET | /api/v1/pos/{po_id} | Single PO detail with supplier, site, communication state, linked thread summary |
| POST | /api/v1/pos/import | Trigger PO import job from SAP (or accept batch payload). Returns job ID. |
| GET | /api/v1/pos/{po_id}/thread | Full thread for a PO including all messages, interpretations, sender info |
| GET | /api/v1/pos/{po_id}/cases | All cases linked to a PO |

## 7.2 Case Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /api/v1/cases | List cases with filters: status, priority, case_type, assigned_user_id, due_at range. Paginated. |
| GET | /api/v1/cases/{case_id} | Single case with PO summary, thread context, event history, SLA status |
| POST | /api/v1/cases/{case_id}/assign | Assign case to a SPOC user. Logs case event. |
| POST | /api/v1/cases/{case_id}/takeover | SPOC takes over the thread. Sets thread current_owner = human. Locks AI reply. |
| POST | /api/v1/cases/{case_id}/resolve | Mark case resolved. Accepts resolution_note. Logs case event. |

## 7.3 Messaging Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | /api/v1/messages/outbound | Trigger manual outbound message (system-initiated or admin test). Requires po_id or thread_id and body. |
| POST | /api/v1/webhooks/whatsapp/inbound | Receive inbound messages from WhatsApp BSP. Validates signature. Deduplicates. Enqueues for processing. |
| GET | /api/v1/threads/{thread_id}/messages | Paginated message list for a thread including sender, direction, delivery status, interpretation badge |
| POST | /api/v1/threads/{thread_id}/human-reply | SPOC sends a message from dashboard. Requires user_id. Thread must be human_controlled. |

## 7.4 Admin / Config Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /api/v1/config/templates | List message templates with language, type, active status |
| POST | /api/v1/config/templates | Create or update a message template |
| GET | /api/v1/config/sla-rules | List SLA rules by case_type and category |
| POST | /api/v1/config/sla-rules | Create or update SLA rules |
| GET | /api/v1/health | Service health check for infrastructure monitoring |

## 7.5 Example: Human Reply Request and Response

```
POST /api/v1/threads/{thread_id}/human-reply

Request:
{
  "body": "We can accept revised delivery by 10 AM. Please confirm and advise on the 2 short items.",
  "user_id": "2b0f8c2e-5f36-4f57-9c0f-2a6ab5d8a9b0"
}

Response (200):
{
  "status": "sent",
  "thread_id": "a88c3d3e-c6da-4f40-a41d-3d16d0c2a111",
  "message_id": "84f31fa8-c0f2-4708-b10d-3e56f83f1102",
  "owner": "human",
  "sent_at": "2025-11-08T09:14:22Z"
}
```

## 7.6 Example: PO Detail Response

```
GET /api/v1/pos/{po_id}

Response (200):
{
  "po_id": "c12f4a8b-...",
  "po_number": "PO-2025-048291",
  "supplier_name": "Fresh Fields Ltd",
  "site_name": "Site 42 - London Heathrow",
  "category": "perishables",
  "expected_delivery_at": "2025-11-09T06:00:00Z",
  "status": "at_risk",
  "communication_state": "exception_detected",
  "thread_id": "a88c3d3e-...",
  "open_cases": 1
}
```

# 8. Business Rules

## 8.1 PO Communication Eligibility Rules

- PO status must be 'open' — confirmed, closed, or cancelled POs must not receive outreach

- PO must have at least one active supplier contact with a valid phone number

- communication_eligible flag on the PO must be true (allows manual override)

- PO must be within the configured outreach window relative to expected_delivery_at

- Supplier status must be 'active' — blocked suppliers must not receive automated messages

## 8.2 Thread Binding Logic

When an inbound message arrives, the system must bind it to the correct PO thread using the following priority order:

- Exact match: phone number maps to a known supplier_contact AND that supplier has a single active thread with communication_state not in (resolved, closed)

- Recent unresolved thread: phone number maps to a supplier with a recent open thread (within configured window)

- PO reference extraction: AI extracts a PO number from the message text and matches to an active PO

- Fallback: message routed to manual review queue for SPOC binding

All binding decisions must be logged in audit_events for traceability.

## 8.3 AI Confidence Thresholds and Routing

| Confidence Band | Range | Routing Decision |
| --- | --- | --- |
| High confidence | 0.80 – 1.00 | System may take automated action. For confirmed intent: update PO state, no case. For high-confidence exception: create case automatically. |
| Medium confidence | 0.55 – 0.79 | Case created. SPOC reviews AI interpretation and confirms or overrides. No irreversible state change before human confirmation. |
| Low confidence | 0.00 – 0.54 | No automated action. Case created as 'ambiguity' type. Thread flagged for SPOC review. AI reply locked pending human decision. |

## 8.4 Exception Trigger Conditions

| Trigger | Case Type | Minimum Priority |
| --- | --- | --- |
| No response within configured SLA window | non_response | Medium (High for perishables) |
| Supplier explicitly states delay | delay | High |
| Supplier states partial supply or shortage | shortage | Medium |
| Supplier rejects order or states inability to fulfil | rejection | Critical |
| Supplier message is ambiguous or low confidence | ambiguity | Medium |
| Repeated failed messages (3+ delivery failures) | manual_review | Medium |
| Supplier requests a call or escalation | manual_review | High |
| Abusive, sensitive, or compliance-relevant message | manual_review | High |

## 8.5 SLA Windows by Priority and Category

| Case Type | Category | Priority | First Response SLA | Resolution SLA |
| --- | --- | --- | --- | --- |
| rejection | perishables | critical | 30 minutes | 2 hours |
| rejection | non_perishables | high | 1 hour | 4 hours |
| delay | perishables | high | 1 hour | 4 hours |
| delay | non_perishables | medium | 4 hours | 24 hours |
| non_response | perishables | high | 2 hours | 4 hours |
| non_response | non_perishables | medium | 8 hours | 24 hours |
| shortage | any | medium | 4 hours | 8 hours |
| ambiguity | any | medium | 4 hours | 8 hours |

Note: exact SLA windows are configurable in the sla_rules table. Values above are defaults pending confirmation in open questions.

## 8.6 Human Takeover and Release Policy

- While thread current_owner = 'human', AI must not send any outbound messages

- AI may still process inbound messages for internal summarisation and case event logging, but must not reply

- Human takeover requires explicit SPOC action via POST /api/v1/cases/{case_id}/takeover

- Release back to AI requires: case closed or resolved AND explicit policy permission (configurable)

- Default policy: once human-controlled, thread remains human-controlled until case is closed by SPOC

- All takeover and release events must be logged in audit_events with actor_user_id

# 9. Build Sequence

## Phase A — Foundation (Weeks 1–4)

Goal: All core data infrastructure, SAP integration, WhatsApp provider setup, and audit logging baseline in place. Nothing is built on top until this is complete.

| Task | Details | Dependency |
| --- | --- | --- |
| Database schema deployment | All tables from Section 6 deployed to dev and staging with migrations (Alembic) | None |
| FastAPI project scaffolding | Project structure, router layout, middleware, health check, base auth integration | None |
| SAP PO ingestion service | Connect to SAP (batch / API / event — confirm mode). Normalise PO fields. Store to purchase_orders. Link supplier and site. | Schema, SAP access |
| Supplier and site master sync | Initial and delta sync of supplier, supplier_contacts, sites tables from SAP or manual import | Schema |
| WhatsApp BSP account setup | Provision BSP account, obtain WABA credentials, configure webhook URL, set up number(s), register templates | None |
| Audit logging base | audit_events table. Log all entity-level changes via service layer hooks. | Schema |
| Redis and Celery setup | Redis instance, Celery worker config, beat scheduler, task registration baseline | Infrastructure |
| Environment configuration | Secret management, environment variables, CI/CD pipeline baseline, staging deploy | None |

Exit criteria: POs can be ingested from SAP and stored correctly. Supplier contacts are linked. WhatsApp test message can be sent and received. Audit events are written.

## Phase B — Communication Engine (Weeks 5–9)

Goal: Outbound outreach, inbound processing, thread binding, and AI interpretation fully operational. Cases created automatically for exceptions.

| Task | Details | Dependency |
| --- | --- | --- |
| Outbound outreach engine | Template rendering. Celery task to send outbound WhatsApp messages. workflow_jobs scheduling. Retry logic. | Phase A complete |
| Inbound webhook endpoint | POST /api/v1/webhooks/whatsapp/inbound. Signature validation. Redis deduplication. Enqueue for processing. | Phase A, WhatsApp setup |
| Thread binding logic | Phone number → supplier → active PO thread resolution chain. Fallback to manual review queue. | Schema, supplier contacts |
| AI interpretation service | LangGraph graph. OpenAI integration. Structured JSON output. message_interpretations write. Confidence routing. | Thread binding |
| Case creation engine | Rules-based case creation from AI output. Priority calculation. SLA window assignment. workflow_jobs for SLA timers. | AI interpretation |
| Reminder cadence engine | Celery beat tasks. Non-response detection. Escalation after max retries. | Outbound engine, workflow_jobs |
| PO state machine | State transition logic for all communication_state and status values. Validated transitions only. | Schema, AI interpretation |
| Integration tests | End-to-end test: PO ingested → outreach sent → mock supplier reply → AI classified → case created | All above |

Exit criteria: Full end-to-end flow works for happy path, delay exception, non-response, and rejection scenarios. Cases are created correctly and SLA timers start.

## Phase C — Human Operations Layer (Weeks 10–14)

Goal: SPOC dashboard fully operational. Human takeover controls work. Case management UI is complete. Internal teams can operate the system.

| Task | Details | Dependency |
| --- | --- | --- |
| Case dashboard UI | Case queue with filters (status, priority, type, site, age). SLA countdown indicators. Assignment controls. | Phase B complete |
| Thread view UI | Full message thread per PO. Sender type indicators. AI interpretation badges. Takeover boundary marker. | Case dashboard |
| Human takeover controls | Take over button. POST /api/v1/cases/{case_id}/takeover. Message composer in dashboard. Lock enforcement on AI. | Thread view, cases API |
| Human reply API and routing | POST /api/v1/threads/{thread_id}/human-reply. Route to WhatsApp. Store as sender_type = human. | Human takeover |
| Case assignment and SLA UI | Assign to SPOC, view SLA timer, mark in_progress, resolve with note | Case dashboard |
| PO operational view | Table of POs with communication_state, open case count, last message time, category, site filters | APIs complete |
| Role-based access control | Keycloak/Auth0 integration. Route guards by role. SPOC cannot access admin config. | Auth setup |
| User acceptance testing | SPOC team walkthrough. Procurement manager review. Feedback cycle. | All above |

Exit criteria: SPOC team can take over a thread, send a message, and resolve a case entirely through the dashboard. Procurement managers can review PO status and case volumes.

## Phase D — Production Hardening (Weeks 15–18)

Goal: System is production-safe. Observability, load testing, security hardening, and go-live readiness complete.

| Task | Details | Dependency |
| --- | --- | --- |
| Idempotency and deduplication | Idempotency keys on all critical mutations. Redis-based deduplication for webhooks and job execution. | Phase B + C |
| OpenTelemetry tracing | Trace: webhook → processor → AI → case creation. Latency dashboards. Error rate alerting. | Infrastructure |
| Load testing | Simulate 35,000 POs/month outreach volume plus 10x inbound webhook spike. Identify bottlenecks. | All services |
| Security review | Webhook signature enforcement. Secret rotation. TLS everywhere. Least-privilege DB roles. | Infrastructure |
| SLA breach alerting | Grafana/Datadog alerts for cases breaching SLA. Slack/email notifications to managers. | Observability |
| Database performance tuning | Index review under load. Query explain plans for dashboard filters. Connection pooling via PgBouncer. | Load test results |
| Operational runbooks | Incident response for: webhook failure, AI service outage, SLA breach spike, database failover | All services |
| Go/no-go production review | Review against launch checklist in Section 12. Sign-off from Procurement and IT. | All above |

# 10. AI Interpretation Design

## 10.1 System Prompt

```
You are a procurement AI assistant for Compass Group. Your job is to interpret
supplier WhatsApp messages in the context of a purchase order (PO) follow-up.

You will receive:
- The supplier's message
- The PO context (PO number, expected delivery date, category, total value)
- The thread summary so far (recent messages and current state)

Your task is to extract the supplier's intent and any operational risk signals,
and return a structured JSON object. Do not return any text outside the JSON.

Output this exact JSON structure:
{
  "intent": "<one of: confirmed | rejected | partial | delay | clarification | unrelated | unknown>",
  "risk_level": "<one of: none | low | medium | high | critical>",
  "confidence_score": <decimal between 0.0 and 1.0>,
  "extracted_eta": "<ISO8601 datetime if supplier mentions a revised date, else null>",
  "extracted_shortage_note": "<text description of shortage/partial supply if mentioned, else null>",
  "escalation_required": <true | false>,
  "reasoning": "<1-2 sentences explaining your classification decision>"
}

Classification rules:
- confirmed: supplier clearly states they will fulfil on time
- rejected: supplier states they cannot or will not fulfil the order
- partial: supplier indicates they can fulfil some but not all items
- delay: supplier indicates delivery will be late or rescheduled
- clarification: supplier is asking a question or needs more information
- unrelated: message is not about this PO
- unknown: message is too ambiguous to classify

Risk rules:
- none: confirmed, no issues
- low: minor delay but within acceptable window
- medium: delay outside acceptable window OR partial supply
- high: significant delay OR shortage on perishables OR rejection
- critical: full rejection OR catastrophic supply failure on perishables

escalation_required = true if risk_level is medium, high, or critical,
OR if confidence_score is below 0.55.

If the message is in a language other than English, interpret it and classify
in English. Do not translate the message — classify the intent directly.
```

## 10.2 Routing Logic by Confidence Band

| Condition | System Action | State Change |
| --- | --- | --- |
| intent = confirmed AND confidence >= 0.80 | PO communication_state = supplier_confirmed. No case. Audit event logged. | PO confirmed |
| intent = delay AND confidence >= 0.80 | Case created (case_type = delay, priority = high/critical based on category). PO status = at_risk. | Exception |
| intent = rejected AND confidence >= 0.80 | Case created (case_type = rejection, priority = critical). PO status = at_risk. Notify manager. | Critical exception |
| intent = partial AND confidence >= 0.80 | Case created (case_type = shortage, priority = medium). PO status = at_risk. | Exception |
| Any intent AND 0.55 <= confidence < 0.80 | Case created with AI interpretation attached. SPOC confirms or overrides. No irreversible PO state change. | Pending SPOC review |
| Any intent AND confidence < 0.55 | Case created as ambiguity. Thread flagged. AI reply locked. SPOC handles entirely. | Human controlled |
| intent = clarification | AI may respond with a clarification template if confidence >= 0.80. Otherwise case created. | Awaiting supplier |
| intent = unrelated | Message logged. No state change. SPOC notified if pattern repeats. | No change |

## 10.3 Context Input Format

```
User message to AI:
{
  "message": "We have a problem with your order, can deliver maybe next week",
  "po_context": {
    "po_number": "PO-2025-048291",
    "expected_delivery_at": "2025-11-09T06:00:00Z",
    "category": "perishables",
    "total_value": 4250.00,
    "supplier_name": "Fresh Fields Ltd"
  },
  "thread_summary": "Initial outreach sent 2025-11-07. No prior supplier response."
}

Expected AI output:
{
  "intent": "delay",
  "risk_level": "high",
  "confidence_score": 0.81,
  "extracted_eta": null,
  "extracted_shortage_note": null,
  "escalation_required": true,
  "reasoning": "Supplier indicates an unspecified problem and a delivery of next week,
                which is significantly past the expected perishables delivery date."
}
```

# 11. Open Questions

The following decisions must be resolved before or during Phase A of the build. Each one has a direct implementation impact.

| # | Question | Why It Matters to Implementation |
| --- | --- | --- |
| 1 | What is the SAP integration mode for Phase 1: batch feed, event push, or API pull? | Determines ingestion service architecture. Batch = scheduled Celery job. Event push = webhook endpoint. API pull = polling with delta tracking. Different reliability and latency profiles. |
| 2 | Which WhatsApp BSP provider will be used? | Different BSPs have different webhook formats, template approval processes, API authentication, and reliability SLAs. Must be selected before Phase A is complete. |
| 3 | What languages must supplier messaging support in the pilot? | Affects template creation, AI interpretation prompting, and whether multilingual confidence logic is needed in Phase 1. |
| 4 | What are the exact reminder cadences by PO category? | Required to configure SLA rules, workflow_jobs scheduling, and reminder templates. Without these, the non-response flow cannot be finalised. |
| 5 | What are the exact SLA thresholds by case type? | SLA windows in Section 8 are defaults. These must be confirmed by procurement operations before they are loaded as configuration. |
| 6 | Will one PO always map to one active thread, or is controlled re-open logic needed? | Affects po_threads schema uniqueness constraint and thread binding fallback logic. If POs can re-open, thread history continuity rules must be defined. |
| 7 | How do unresolved threads age out? | Must define a policy: after X days with no activity, what happens to open threads? Are they auto-closed? Escalated? This affects workflow_jobs cleanup and SLA reporting. |
| 8 | What is the policy for switching a thread back from human to AI? | Affects human takeover release logic. Can a SPOC release manually? Does case closure always release? Is there a time-based rule? This must be a policy decision, not an engineering one. |
| 9 | Are voice notes and images in scope for inbound handling in Phase 1? | Media_type field is in schema. If in scope, AI interpretation must handle audio transcription or image analysis before classification. Significantly increases complexity. |
| 10 | What reporting dimensions are mandatory for procurement leadership at launch? | Determines whether reporting views and dashboard filters for Phase 1 are sufficient, or whether a separate analytics layer must be delivered before go-live. |

# 12. Success Metrics and Launch Checklist

## 12.1 Phase 1 Success Metrics

| Metric | Baseline (pre-system) | Phase 1 Target | Measurement Method |
| --- | --- | --- | --- |
| Supplier response rate | Low — portal adoption was poor | >65% of outreached POs receive structured response via WhatsApp | supplier_confirmed + exception responses / total outreached POs |
| Time to first supplier response | Days (manual chasing) | <4 hours from outreach to supplier reply for perishables | received_at – last_outbound_at per thread |
| Exception detection lead time | Detected at site escalation (day of or after delivery) | Issues surfaced >24 hours before expected delivery | Case created_at vs expected_delivery_at |
| Manual follow-up effort per PO | High — manual calls and emails | >60% of POs resolved without SPOC intervention | POs closed without case creation / total POs |
| SPOC intervention rate | 100% (all manual) | Target <25% of POs require SPOC involvement | Cases created / total POs |
| SLA adherence on cases | No formal SLA | >80% of cases resolved within SLA window | resolved_at <= due_at / total resolved cases |
| Audit completeness | Partial or none | 100% of PO events, messages, and state changes logged | Audit event coverage check |
| OTIF improvement | Baseline TBD with procurement | Measurable improvement vs pre-system cohort | Site delivery records vs PO expected dates |

## 12.2 Go / No-Go Launch Checklist

All items below must be confirmed before production launch. Any open item is a blocker unless formally risk-accepted.

### Infrastructure and Integration

- SAP integration tested with live PO data in staging — supplier and site links verified

- WhatsApp BSP account fully provisioned — templates approved, webhook verified, test messages confirmed

- All environment variables and secrets in vault — no hardcoded credentials in codebase

- PostgreSQL production instance provisioned — backups configured, RTO/RPO defined

- Redis production instance provisioned — eviction policy set, connection pooling verified

- Celery workers deployed — beat scheduler running, queue backlog monitoring active

### Core Functionality

- PO ingestion end-to-end test passed in staging with 100 real POs

- Outbound WhatsApp message delivered to test supplier numbers — delivery receipts confirmed

- Inbound webhook receives and processes supplier replies — thread binding verified for all four binding scenarios

- AI interpretation tested on 50+ real supplier message samples — confidence distributions reviewed

- Case creation verified for all five exception types with correct priority and SLA assignment

- Human takeover flow tested end-to-end — AI lock confirmed, SPOC message delivered via WhatsApp

- Case resolution flow tested — audit trail complete

### Security and Compliance

- WhatsApp webhook signature validation enabled in production

- RBAC roles configured — SPOC cannot access admin config, Viewer cannot send messages

- Audit event coverage verified — all critical state changes produce audit records

- TLS enforced on all ingress and inter-service communication

- GDPR / data residency requirements reviewed and confirmed for supplier message storage

### Observability and Reliability

- OpenTelemetry tracing active — end-to-end spans visible in Grafana/Datadog

- SLA breach alerts configured and tested

- Webhook failure alerting configured — dead letter queue visible

- Load test passed at 2x projected peak volume — no degradation above defined thresholds

- Runbooks written and reviewed for: webhook failure, AI service outage, database failover, SLA spike

### Operations Readiness

- SPOC team trained on dashboard — case management, takeover, resolution workflow signed off

- Procurement managers briefed on reporting views and case volume expectations

- Open questions from Section 11 either resolved or formally accepted as post-launch items

- Rollback plan documented — ability to disable outreach without disrupting existing threads

- Phase 1 pilot scope confirmed — sites, suppliers, and PO categories included in launch cohort

- Post-launch review date set — 2-week operational review with procurement and IT

— END OF DOCUMENT —

Compass Group \| Agentic Procurement System \| Phase 1 Implementation Plan
