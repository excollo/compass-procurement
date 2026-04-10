# SLA Timer Feature — Antigravity Build Prompt

## Files to paste into context before sending this prompt

1. `src/pages/Chats.jsx`
2. `src/pages/Orders.jsx`
3. `src/lib/supabase.js`

---

## Overview

Make the following changes to two existing pages. Do not create new pages. Do not modify any other files. Match existing code style, Tailwind classes, and component patterns exactly.

---

## Database schema reference

### chat_history table
```sql
create table public.chat_history (
  id uuid not null default gen_random_uuid(),
  po_num text not null,
  sender_type text not null,       -- values: 'bot' | 'vendor' | 'operator'
  message_text text not null,
  direction text null,             -- 'inbound' | 'outbound'
  escalation_required boolean null default false,
  vendor_phone text null,
  sent_at timestamp with time zone null default CURRENT_TIMESTAMP,
  intent text null,
  communication_state text null default 'awaiting'
);
```

### selected_open_po_line_items table (pilot POs — 5 records)
```sql
create table public.selected_open_po_line_items (
  po_num text not null,
  po_item text null,
  po_date text null,
  unit text null,
  unit_description text null,
  article_code text null,
  article_description text null,
  po_quantity text null,
  delivered_quantity text null,
  open_quantity text null,
  unit_of_measure text null,
  delivery_date date null,
  vendor_code text null,
  vendor_name text null,
  reason text null,
  vendor_phone text null,
  status text null,
  response_sla_hours integer default 24
);
```

### open_po_detail table (full PO list)
```sql
create table public.open_po_detail (
  po_num text null,
  po_item text null,
  vendor_code text null,
  vendor_name text null,
  delivery_date text null,
  status text null default 'Open'
  -- other columns exist but not needed for this feature
);
```

---

## New utility files to create

### `src/lib/slaUtils.js`

Create this file with the following content exactly:

```js
export function formatElapsed(ms) {
  if (!ms || ms <= 0) return null
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

export function computeResponseSLA(messages, slaHours = 24) {
  if (!messages || messages.length === 0) return null

  const sorted = [...messages].sort(
    (a, b) => new Date(b.sent_at) - new Date(a.sent_at)
  )

  const lastBotMsg = sorted.find(m => m.sender_type === 'bot')
  if (!lastBotMsg) return null

  const lastBotTime = new Date(lastBotMsg.sent_at)

  const vendorRepliedAfterBot = messages.some(
    m => m.sender_type === 'vendor' && new Date(m.sent_at) > lastBotTime
  )

  if (vendorRepliedAfterBot) return null

  const elapsedMs = Date.now() - lastBotTime
  const windowMs = slaHours * 3600000
  const breached = elapsedMs > windowMs
  const progress = Math.min((elapsedMs / windowMs) * 100, 100)

  let color = 'green'
  if (breached) color = 'red'
  else if (progress > 75) color = 'amber'

  return {
    elapsedMs,
    breached,
    progress,
    color,
    label: formatElapsed(elapsedMs),
    lastBotFormatted: lastBotTime.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

export function getLatestCommunicationState(messages) {
  if (!messages || messages.length === 0) return 'awaiting'
  const sorted = [...messages].sort(
    (a, b) => new Date(b.sent_at) - new Date(a.sent_at)
  )
  return sorted[0].communication_state || 'awaiting'
}
```

### `src/hooks/useSLATimer.js`

Create this file with the following content exactly:

```js
import { useState, useEffect } from 'react'

export function useSLATimer() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])
  return tick
}
```

---

## Change 1 — Chats.jsx

### 1.1 Add a CommunicationStateBadge component

Add this component at the top of the file, outside the main component:

```jsx
function CommunicationStateBadge({ state }) {
  const config = {
    awaiting: {
      label: 'Awaiting',
      bg: '#F3F4F6',
      color: '#6B7280'
    },
    responded: {
      label: 'Responded',
      bg: '#F0FDF4',
      color: '#16A34A'
    },
    human_controlled: {
      label: 'Human Controlled',
      bg: '#EFF6FF',
      color: '#2563EB'
    },
    escalated: {
      label: 'Escalated',
      bg: '#FEF2F2',
      color: '#DC2626'
    },
    resolved: {
      label: 'Resolved',
      bg: '#F0FDF4',
      color: '#16A34A'
    },
  }
  const c = config[state] || config.awaiting
  return (
    <span style={{
      fontSize: '10px',
      fontWeight: 700,
      padding: '2px 7px',
      borderRadius: '4px',
      background: c.bg,
      color: c.color,
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }}>
      {c.label}
    </span>
  )
}
```

### 1.2 Add imports

Add these imports at the top of Chats.jsx:

```js
import { computeResponseSLA, getLatestCommunicationState } from '../lib/slaUtils'
import { useSLATimer } from '../hooks/useSLATimer'
```

### 1.3 Add useSLATimer hook inside the component

Add this line inside the main Chats component, near the top with other hooks:

```js
const tick = useSLATimer()
```

`tick` is not used directly — it exists only to trigger a re-render every second so SLA times stay live.

### 1.4 Fetch chat messages for all sidebar POs

After the existing PO list fetch, add this data fetch. Store `messagesByPO` in component state using `useState({})`:

```js
// after poList is loaded
const poNums = poList.map(p => p.po_num)

const { data: allMessages } = await supabase
  .from('chat_history')
  .select('po_num, sender_type, sent_at, communication_state')
  .in('po_num', poNums)
  .order('sent_at', { ascending: true })

const grouped = {}
allMessages?.forEach(msg => {
  if (!grouped[msg.po_num]) grouped[msg.po_num] = []
  grouped[msg.po_num].push(msg)
})

setMessagesByPO(grouped)
```

### 1.5 Remove HIGH RISK badge

Find wherever the `HIGH RISK` badge or tag is rendered inside the PO sidebar card and delete it completely, including its wrapper element. Do not replace it with anything — the bottom row (step 1.6) replaces its position.

### 1.6 Remove LIVE THREAD indicator

Find wherever `LIVE THREAD` or `● LIVE THREAD` is rendered in the PO card and delete it completely.

### 1.7 Remove "Status update check..." text

Find wherever `Status update check...` is rendered in the PO card and delete it.

### 1.8 Replace card bottom section

After the vendor name line in each PO card, add this new bottom row:

```jsx
<div style={{
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '8px',
  paddingTop: '8px',
  borderTop: '0.5px solid #F3F4F6'
}}>

  {/* left: communication state */}
  <CommunicationStateBadge
    state={getLatestCommunicationState(messagesByPO[po.po_num] || [])}
  />

  {/* right: SLA timer — only show if vendor hasn't replied yet */}
  {(() => {
    const sla = computeResponseSLA(messagesByPO[po.po_num] || [], 24)
    if (!sla) return null

    const color = sla.color === 'red'
      ? '#DC2626'
      : sla.color === 'amber'
      ? '#D97706'
      : '#16A34A'

    return (
      <span style={{
        fontSize: '11px',
        fontWeight: 600,
        color,
        display: 'flex',
        alignItems: 'center',
        gap: '3px'
      }}>
        <svg
          width="11"
          height="11"
          viewBox="0 0 11 11"
          fill="none"
          style={{ flexShrink: 0 }}
        >
          <circle
            cx="5.5"
            cy="5.5"
            r="4.5"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M5.5 3v2.5L7 7"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
        {sla.label}
      </span>
    )
  })()}

</div>
```

### Final card structure should look like this

```
┌─────────────────────────────────┐
│ PO-4100260367                   │
│ Yashoda Gas Service             │
│ ─────────────────────────────── │
│ AWAITING              🕐 6h 24m │
└─────────────────────────────────┘
```

---

## Change 2 — Orders.jsx

### 2.1 Add imports

```js
import { computeResponseSLA } from '../lib/slaUtils'
import { useSLATimer } from '../hooks/useSLATimer'
```

### 2.2 Add useSLATimer hook inside the component

```js
const tick = useSLATimer()
```

### 2.3 Fetch chat_history for all POs

After the PO list is loaded, add this fetch. Store `messagesByPO` in state:

```js
const poNums = orders.map(o => o.po_num)

const { data: allMessages } = await supabase
  .from('chat_history')
  .select('po_num, sender_type, sent_at')
  .in('po_num', poNums)

const grouped = {}
allMessages?.forEach(msg => {
  if (!grouped[msg.po_num]) grouped[msg.po_num] = []
  grouped[msg.po_num].push(msg)
})

setMessagesByPO(grouped)
```

### 2.4 Fix AWAITING RESPONSE KPI card

Find where AWAITING RESPONSE card renders its number (currently hardcoded `0`). Replace that value with a computed count:

```js
const awaitingCount = orders.filter(o =>
  computeResponseSLA(messagesByPO[o.po_num] || []) !== null
).length
```

Render `{awaitingCount}` in that card instead of `0`.

### 2.5 Add RESPONSE SLA column header

In the table header row, add after the last existing `<th>` (COMMUNICATION STATE):

```jsx
<th>RESPONSE SLA</th>
```

Match the existing `<th>` styling exactly — same font size, weight, uppercase, letter spacing, padding.

### 2.6 Add RESPONSE SLA cell in each table row

In each table `<tr>`, after the Communication State `<td>`, add:

```jsx
{(() => {
  const sla = computeResponseSLA(messagesByPO[row.po_num] || [], 24)

  if (!sla) {
    return (
      <td style={{ color: '#9CA3AF', fontSize: '13px' }}>
        —
      </td>
    )
  }

  const color = sla.color === 'red'
    ? '#DC2626'
    : sla.color === 'amber'
    ? '#D97706'
    : '#16A34A'

  return (
    <td>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color }}>
            {sla.label} elapsed
          </span>
          <div style={{
            width: '60px',
            height: '3px',
            background: '#F3F4F6',
            borderRadius: '2px',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            <div style={{
              height: '100%',
              width: `${Math.round(sla.progress)}%`,
              background: color,
              borderRadius: '2px'
            }} />
          </div>
        </div>
        <span style={{ fontSize: '10px', color: '#9CA3AF' }}>
          Last msg: {sla.lastBotFormatted}
        </span>
      </div>
    </td>
  )
})()}
```

---

## What the final output should look like

### Chats sidebar card
```
PO-4100260367
Yashoda Gas Service
─────────────────────────────
AWAITING              🕐 6h 24m
```

- No HIGH RISK badge
- No LIVE THREAD indicator
- No "Status update check..." text
- Bottom row: state badge on left, SLA timer on right
- SLA timer only appears when bot has messaged and vendor has not yet replied
- Timer color: green under 75% of window, amber 75-100%, red when breached
- Timer ticks live every second

### Orders table new column
```
RESPONSE SLA
──────────────
6h 24m elapsed  ████░░
Last msg: 10:30 AM
```

- Shows `—` for POs where no bot message sent or vendor already replied
- Progress bar fills red as time runs out
- AWAITING RESPONSE KPI card shows real count instead of 0

---

## Do NOT change

- `src/components/Sidebar.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/Vendors.jsx`
- `src/pages/OrderDetail.jsx`
- `src/pages/Escalations.jsx`
- `src/pages/EscalationDetail.jsx`
- `src/lib/supabase.js`
- `App.jsx` routing
- `tailwind.config.js`
- `App.css` or `index.css`
- Existing table column order in Orders.jsx (only append new column at end)
- Existing filter bar in Orders.jsx
- Existing KPI card layout (only change the number value inside AWAITING RESPONSE)
- Chat message input, send button, or right panel in Chats.jsx