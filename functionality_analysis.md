# Agentic Procurement System - Frontend Functionality Analysis

Based on the Phase 1 Implementation Plan, the frontend portion of this project revolves around building a comprehensive **SPOC (Single Point of Contact) Dashboard**. This dashboard allows procurement operators to monitor an AI-led, WhatsApp-based purchase order (PO) follow-up system and step in when human intervention is required.

## Core Objective
To provide real-time visibility into PO communication states and offer an intuitive interface for human coordinators (SPOCs) to resolve exceptions (delays, rejections, ambiguities) detected by the AI.

---

## Key Frontend Features & Screens

### 1. Case Management Dashboard (Queue View)
The primary workspace for SPOCs to manage actionable issues.
- **Queue/List View**: A detailed list of open cases generated when the AI detects exceptions.
- **Filtering & Sorting**: Ability to filter cases by:
  - Status (Open, In Progress, Waiting on Supplier, Resolved, Closed)
  - Priority (Low, Medium, High, Critical)
  - Case Type (Non-response, Delay, Rejection, Shortage, Ambiguity, Manual Review)
  - Site ID / Name
  - Supplier ID
  - Age / SLA Due Time
- **SLA Indicators**: Visual countdown timers or badges highlighting cases that are nearing or have breached their Service Level Agreement (SLA).

### 2. PO Operational View (PO Tracker)
A high-level view for procurement managers and SPOCs to see all POs, not just active cases.
- **PO List**: Table of POs displaying:
  - PO Number, Supplier, Expected Delivery Date, Category, Total Value.
  - Overall Communication State (e.g., Awaiting Response, Supplier Confirmed, Exception Detected, Human Controlled).
  - Open Case Count.
- **Filters**: Date range, site, supplier, category, communication state.

### 3. Thread View UI (Conversation Interface)
A detailed view that opens when a user interacts with a specific Case or PO.
- **Full Message Thread**: A chat-like interface displaying the complete WhatsApp conversation between the AI and the Supplier.
- **Message Badges**: 
  - **Sender Types**: Clear indicators of whether a message was sent by the `Supplier`, `AI`, or `Human`.
  - **AI Interpretation Badges**: Visibility into how the AI scored the message (Intent, Risk Level, Confidence Score).
- **Takeover Boundary Marker**: Visual separator indicating when a human took control of the conversation from the AI.
- **PO Metadata Panel**: A side panel showing the related PO details, assigned SPOC, and active SLA timers.

### 4. Human Intervention & Compose Module
The interaction controls that allow a SPOC to communicate with the supplier.
- **Take Over Controls**: A primary "Take Over Conversation" action button. Once clicked, it locks the AI out of auto-replying and transitions the thread to `human_controlled`.
- **Message Composer**: A text input area for the SPOC to draft and send a WhatsApp message directly to the supplier.
- **Case Actions**: Controls to:
  - Assign a case to a specific user.
  - Mark a case as "In Progress".
  - Resolve/Close a case.
  - Add internal "Resolution Notes" that are saved for audit purposes.

---

## User Roles & Access Control
The frontend must dynamically adjust based on the authenticated user's role:
- **Admin**: Full access, including configuring templates and SLA rules.
- **Procurement Manager**: View access to all dashboards and analytics, high-level PO tracking.
- **SPOC (Single Point of Contact)**: Primary operator. Has access to the Case Dashboard, Thread Views, and Human Takeover capabilities.
- **Viewer**: Read-only access to PO status and threads.

## Summary for UI/UX Demo Design
To build an effective demo, the screens should showcase a modern, data-rich B2B operational tool. The design needs to emphasize **urgency (SLAs)**, **clarity (AI vs Human messages)**, and **efficiency (quick filters and chat interfaces)**. 
