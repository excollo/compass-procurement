# Escalations Feature — Antigravity Build Prompt

## Context to paste alongside this prompt

Before sending this prompt, paste these 4 files directly into Antigravity context:

1. `src/App.jsx`
2. `src/lib/supabase.js`
3. `src/components/Sidebar.jsx`
4. `src/pages/Orders.jsx`

---

## Prompt

Build two new pages for the Escalations feature. The project is React + Vite + Tailwind. Supabase client is at `src/lib/supabase.js`. Sidebar is already built in `src/components/Sidebar.jsx` and is fixed across all pages. Follow the exact same theme, layout, and code style as the existing pages — dark navy/charcoal cards, white text, bold uppercase headings, clean minimal style as seen in the existing Data Explorer screen.

---

## Files to create

- `src/pages/Escalations.jsx` — list page
- `src/pages/EscalationDetail.jsx` — detail page

Add both routes in `App.jsx`:

```
/escalations        →  Escalations.jsx
/escalations/:id    →  EscalationDetail.jsx
```

The Escalations nav item already exists in the sidebar — just make sure clicking it routes to `/escalations`.

---

## Supabase table

Table name: `escalations`

Fields used across both pages:

```
id, po_num, vendor_code, vendor_name, vendor_phone, delivery_site,
escalation_reason, reason_detail, category, priority, status, po_status, resolution_note,
delivery_date, document_date, total_lines, pending_lines, fulfillment_rate,
vendor_sla_applies, vendor_sla_hours, last_bot_message_at, vendor_replied_at, bot_attempt_count,
operator_sla_hours, escalation_created_at, spoc_first_action_at, spoc_name,
partial_items (jsonb array),
original_delivery_date, vendor_revised_eta, delay_days,
po_unit_price, vendor_quoted_price, price_currency,
outstanding_amount, invoice_due_date, pending_invoice_count,
ai_summary, created_at, updated_at
```

---

## Page 1 — Escalations.jsx (list page)

### Layout

Full width content area with fixed sidebar on left. Match the Data Explorer page layout exactly — dark theme, same topbar with "PROCUREMENT OPS" + Live green pill.

### KPI cards row (5 cards)

Fetch from escalations table and compute:

| Card | Logic |
|---|---|
| Total open | count where `status = 'open'` |
| Vendor SLA breached | count where `vendor_sla_applies = true` AND `vendor_replied_at IS NULL` AND `(now - last_bot_message_at) > vendor_sla_hours` |
| Operator SLA breached | count where `spoc_first_action_at IS NULL` AND `(now - escalation_created_at) > operator_sla_hours` |
| Critical priority | count where `priority = 'critical'` |
| Avg operator response | average of `(spoc_first_action_at - escalation_created_at)` for rows where `spoc_first_action_at IS NOT NULL`, displayed as `Xh Ym` |

### Filters bar

- Priority dropdown: All / critical / high / medium / low
- Reason dropdown: All / no_response / partial_delivery / order_rejected / delivery_delay / pricing_issue / payment_issue / quality_issue
- SLA state dropdown: All / Vendor SLA breached / Operator SLA breached / Both breached / Within SLA
- Text search input: searches po_num and vendor_name

### Table columns

| Column | Details |
|---|---|
| PO number | monospace font, blue color |
| Vendor | vendor_name bold + vendor_code muted below |
| Delivery date | red if past, amber if today, green if future |
| Priority | colored badge — critical=red, high=amber, medium=blue, low=gray |
| Reason | colored badge based on escalation_reason value |
| Reason detail | muted small text, truncated to 1 line |
| Vendor SLA | show only if `vendor_sla_applies = true`. Show elapsed time + mini progress bar. Red if breached, amber if >75% window used, green if within. If `vendor_sla_applies = false` show "—" |
| Operator SLA | always show. Same elapsed time + mini progress bar. If `spoc_first_action_at` is set show "Acted Xh Ym ago" in green |
| Action | "View" button — navigates to `/escalations/:id` |

### Row click

Clicking anywhere on a row navigates to `/escalations/${row.id}`

### SLA timer logic (compute on frontend, not stored)

```js
// vendor SLA
const vendorElapsed = vendor_replied_at
  ? (new Date(vendor_replied_at) - new Date(last_bot_message_at))
  : (Date.now() - new Date(last_bot_message_at))
const vendorBreached = vendorElapsed > vendor_sla_hours * 3600000

// operator SLA
const operatorElapsed = spoc_first_action_at
  ? (new Date(spoc_first_action_at) - new Date(escalation_created_at))
  : (Date.now() - new Date(escalation_created_at))
const operatorBreached = operatorElapsed > operator_sla_hours * 3600000
```

Use `setInterval` every second to update elapsed times live on the list page. Format as `18h 24m` or `4h 12m`.

### Realtime

Subscribe to INSERT and UPDATE on the escalations table using Supabase Realtime so new escalations appear without refresh.

---

## Page 2 — EscalationDetail.jsx (detail page)

### Layout

Same dark theme. Fixed sidebar. Full page — NOT a drawer or modal.

### Breadcrumb

```
Escalations  /  PO #[po_num]
```

"Escalations" is clickable and goes back to `/escalations`.

### Page header

- Left: PO number in large monospace font + priority badge + reason badge + po_status badge
- Right: action buttons (see Action Buttons section below)

---

### Top section — 3 column grid

**Column 1 — PO & vendor details card**

Show: vendor_name, vendor_code, vendor_phone, delivery_site, delivery_date (colored red/amber/green), document_date, total_lines, pending_lines, fulfillment_rate with a small horizontal progress bar.

**Column 2 — Dual SLA tracker card**

Show two SLA timers side by side inside one card, separated by a vertical divider:

Left half — Vendor SLA:
- If `vendor_sla_applies = false`: show "Not applicable for this escalation type" in muted text
- If `vendor_sla_applies = true`: show live ticking elapsed time in large font, coloured red/amber/green based on breach state
- SLA window label e.g. "12h window · breached 6h ago" or "3h remaining"
- Progress bar filling red as time passes
- Status pill: "Unresponsive" if breached, "Awaiting reply" if not
- Meta line: "Last bot message: [formatted time]" and "Attempts: [bot_attempt_count]"

Right half — Operator SLA:
- Always render
- If `spoc_first_action_at` is NULL: live ticking from `escalation_created_at`, coloured red/amber/green
- If `spoc_first_action_at` is SET: show "Acted in Xh Ym" in green — clock is stopped
- Progress bar
- Status pill: "Action overdue" / "Within window" / "Acted on time"
- Meta line: "Escalated at: [formatted time]"

Below the two timers — warning banner (conditional):
- Both breached → amber background: "Both SLAs breached. Vendor unresponsive Xh Ym. No operator action in Yh Zm."
- Only operator breached → "Operator action overdue by Xh Ym. No SPOC has acted since escalation."
- All within SLA → hide banner entirely

**Column 3 — Vendor performance card**

Show: vendor_phone, delivery_site, pending_lines, fulfillment_rate. Below that show three hardcoded fill rate bar rows as Phase 2 preview data: Chemicals 82%, Supplies 68%, Equipment 91%. Label this section "Fill rate by category (Phase 2 preview)" in muted text.

---

### Middle section — reason-specific conditional card

Render exactly ONE card based on `escalation_reason`:

**`no_response`** — do not render any extra card. The vendor SLA already communicates the issue.

**`partial_delivery`** — render "Partial supply details" card:
- Parse `partial_items` jsonb as JS array
- Render a table with columns: Item code, Description, Ordered, Confirmed, Shortfall (computed as `ordered_qty - confirmed_qty` in JS), UOM, Issue reason
- Shortfall > 0 = red text
- Shortfall = 0 = green text "Fulfilled"

**`order_rejected`** — render "Rejection details" card:
- Show `reason_detail` in a highlighted box with a red left border

**`delivery_delay`** — render "Delivery delay" card:
- Original date field (original_delivery_date)
- Revised ETA field (vendor_revised_eta) in amber
- Days delayed (delay_days) in red with label "days delayed"
- Simple visual arrow: Original date → New date

**`pricing_issue`** — render "Price dispute" card:
- PO price: `po_unit_price` with `price_currency` label
- Vendor price: `vendor_quoted_price` with `price_currency` label, in red if higher
- Difference amount: computed in JS as `vendor_quoted_price - po_unit_price`
- Difference %: computed as `((vendor_quoted_price - po_unit_price) / po_unit_price * 100).toFixed(1)`

**`payment_issue`** — render "Payment details" card:
- Outstanding amount: `outstanding_amount` formatted as Indian currency (₹X,XX,XXX)
- Invoice due date: `invoice_due_date` formatted, with days overdue computed from today in red
- Pending invoices: `pending_invoice_count`

**`quality_issue`** — render "Quality rejection" card:
- Show `reason_detail` in a highlighted box with a red left border

---

### Bottom section — 2 column grid

**Left column — Event timeline**

At the top of this column show the AI summary box with a blue left border:
- Label: "COMPASS AI · generated on escalation"
- Body: `ai_summary` field value

Below that, build a timeline. Hardcode realistic events based on `escalation_reason`:

For `no_response`:
1. Bot — "Initial PO confirmation sent to vendor" — `last_bot_message_at - 2h`
2. Bot — "Follow-up reminder sent — no reply received" — `last_bot_message_at`
3. System — "Vendor SLA breached · escalation case created" — `escalation_created_at`
4. System — "Operator action SLA started · [operator_sla_hours]h window" — `escalation_created_at`
5. System — "Operator SLA breached" (only if actually breached) — `escalation_created_at + operator_sla_hours`
6. System — "Awaiting operator action" (italic, muted) — now

For all other reasons:
1. Bot — "Initial PO confirmation sent to vendor" — `last_bot_message_at - 2h`
2. Vendor — "Vendor replied with [reason label]" — `last_bot_message_at`
3. System — "Escalation case created automatically" — `escalation_created_at`
4. System — "Operator action SLA started · [operator_sla_hours]h window" — `escalation_created_at`
5. System — "Operator SLA breached" (only if actually breached) — `escalation_created_at + operator_sla_hours`
6. System — "Awaiting operator action" (italic, muted) — now

Each timeline item:
- Colored dot: blue=bot, green=vendor, red=breach event, amber=warning, gray=system/pending
- Small actor tag label: BOT / VENDOR / SYSTEM
- Event description text
- Timestamp formatted as "09-Apr · 10:48 AM"
- Time gap tag between items where meaningful (e.g. "+2h 30m") in amber or red pill

**Right column — two stacked cards**

Card 1 — Update PO status:
- Dropdown with: open / confirmed / partial_supply / short_supply / cancelled / closed
- Pre-select current value from `po_status`
- Textarea for resolution note, pre-filled with `resolution_note` if it exists
- Save button — on click run:
  ```js
  await supabase
    .from('escalations')
    .update({
      po_status: selectedStatus,
      resolution_note: noteText,
      updated_at: new Date().toISOString(),
      spoc_first_action_at: spoc_first_action_at ?? new Date().toISOString(),
      spoc_name: 'Alex Rivera'
    })
    .eq('id', escalation.id)
  ```
- Show success toast after save

Card 2 — Escalation info:
- Reason: `escalation_reason` formatted (e.g. "no_response" → "No Response", "partial_delivery" → "Partial Delivery")
- Category: `category`
- Created at: `escalation_created_at` formatted as "09-Apr-2026 · 10:48 AM"
- Priority: colored badge
- Assigned to: `spoc_name` or "Unassigned" in amber if null

---

### Action buttons

Render different buttons based on `escalation_reason` using this config:

```js
const actionConfig = {
  no_response:      { primary: 'Take over chat',        secondary: 'Try alternate contact' },
  partial_delivery: { primary: 'Accept partial supply', secondary: 'Source remainder' },
  order_rejected:   { primary: 'Cancel PO',             secondary: 'Reassign vendor' },
  delivery_delay:   { primary: 'Accept new date',       secondary: 'Reject — find alternate' },
  pricing_issue:    { primary: 'Escalate to category',  secondary: 'Amend PO price' },
  payment_issue:    { primary: 'Escalate to finance',   secondary: 'Check payment status' },
  quality_issue:    { primary: 'Request replacement',   secondary: 'Cancel and reassign' },
}
```

Show three buttons in the page header AND repeated in the sticky bottom bar:
- Primary action: dark filled button
- Secondary action: outlined button
- "View conversation": always shown, routes to `/chats`

### Sticky bottom actions bar

Fixed at bottom of viewport. Left side shows: "PO #[po_num] · [vendor_name] · Delivery [delivery_date]". Right side shows the same three action buttons as the header.

### Live SLA ticking

Use `useEffect` with `setInterval(1000)` to recompute and re-render both SLA elapsed times every second. Clear the interval on component unmount.

---

## Do NOT change

- `src/components/Sidebar.jsx`
- `src/lib/supabase.js`
- `src/pages/Dashboard.jsx`
- `src/pages/Orders.jsx`
- `src/pages/OrderDetail.jsx`
- `src/pages/Vendors.jsx`
- `src/pages/Chats.jsx`
- `App.css`, `index.css`
- `tailwind.config.js`
- `vite.config.js`