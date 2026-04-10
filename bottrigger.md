# PO Update Bot Notification — Antigravity Prompt

## File to paste into Antigravity context
1. `src/pages/OrderDetail.jsx` — full file

---

## Overview

When an admin saves changes on the PO detail page, the bot should
automatically notify the vendor via chat about what changed.

Two triggers:
1. **Header save** — delivery date or PO status changed
2. **Line item save** — ordered qty, delivered qty, or item status changed

The notification goes to `compass_chat/backend/server.js` via a POST to
`/api/chat-message` with `sender_type: 'bot'` so it appears in the vendor
chat frontend automatically.

Do not change any existing save logic. Do not change .env file.
Just add the bot notification call after each successful save.

---

## ENV variable needed

Add to `compass_procurement/.env` — do not change existing values:

```
VITE_VENDOR_BACKEND_URL=http://localhost:5001
```

---

## Change 1 — Add sendBotUpdateMessage helper function

Add this function inside the `OrderDetail` component, before the `return`
statement. Place it after the existing KPI calculations:

```js
const sendBotUpdateMessage = async (messageText) => {
  try {
    const vendorBackendUrl = import.meta.env.VITE_VENDOR_BACKEND_URL

    if (!vendorBackendUrl) {
      console.warn('⚠️ VITE_VENDOR_BACKEND_URL not set — skipping bot notification')
      return
    }

    // fetch vendor phone from selected_open_po_line_items
    const { data: poRecord } = await supabase
      .from('selected_open_po_line_items')
      .select('vendor_phone, vendor_name')
      .eq('po_num', poNum)
      .single()

    const vendorPhone  = poRecord?.vendor_phone  || ''
    const supplierName = poRecord?.vendor_name   || header?.vendor_name || ''

    const response = await fetch(`${vendorBackendUrl}/api/chat-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        po_id:         poNum,
        sender_type:   'bot',
        sender_label:  'Compass Bot',
        message_text:  messageText,
        vendor_phone:  vendorPhone,
        supplier_name: supplierName,
        intent:        'PO_UPDATE',
        escalate:      false,
        admin_message: ''
      })
    })

    if (!response.ok) {
      console.error('❌ Bot notification failed:', response.status)
    } else {
      console.log('✅ Bot notified vendor of PO update:', messageText.slice(0, 60))
    }
  } catch (err) {
    // never block the save — just log the error
    console.error('❌ sendBotUpdateMessage error:', err.message)
  }
}
```

---

## Change 2 — Trigger bot notification in handleHeaderUpdate

Find the existing `handleHeaderUpdate` function. After the line:

```js
alert('PO Header updated successfully across all items.');
```

Add the bot notification call. Replace the entire `try` block inside
`handleHeaderUpdate` with this updated version:

```js
const handleHeaderUpdate = async () => {
  try {
    setSavingHeader(true)

    // 1. Update all rows in open_po_detail (existing — do not change)
    const { error: err1 } = await supabase
      .from('open_po_detail')
      .update({
        status:        headerStatus,
        delivery_date: headerDeliveryDate
      })
      .eq('po_num', poNum)

    if (err1) throw err1

    // 2. Update tracking table (existing — do not change)
    const { error: err2 } = await supabase
      .from('selected_open_po_line_items')
      .update({
        status:        headerStatus,
        delivery_date: headerDeliveryDate
      })
      .eq('po_num', poNum)

    if (err2) throw err2

    // 3. Update local state (existing — do not change)
    setPoItems(prev => prev.map(item => ({
      ...item,
      status:        headerStatus,
      delivery_date: headerDeliveryDate
    })))

    // 4. Build bot notification message based on what changed
    const changes = []

    if (headerDeliveryDate !== header.delivery_date) {
      const formattedDate = headerDeliveryDate
        ? new Date(headerDeliveryDate).toLocaleDateString('en-IN', {
            day:   '2-digit',
            month: 'short',
            year:  'numeric'
          })
        : headerDeliveryDate
      changes.push(`Delivery date updated to *${formattedDate}*`)
    }

    if (headerStatus !== header.status) {
      changes.push(`PO status changed to *${headerStatus}*`)
    }

    if (changes.length > 0) {
      const changeText = changes.join(' and ')
      const message =
        `📋 *PO Update — #${poNum}*\n\n` +
        `${changeText}.\n\n` +
        `Please confirm you can accommodate this update. ` +
        `Reply with any concerns.`

      await sendBotUpdateMessage(message)
    }

    alert('PO Header updated successfully across all items.')
  } catch (err) {
    console.error('Header update failed:', err)
    alert('Failed to update PO header: ' + err.message)
  } finally {
    setSavingHeader(false)
  }
}
```

---

## Change 3 — Trigger bot notification in handleSave

Find the existing `handleSave` function inside the `poItems.map()` render.
It currently looks like:

```js
const handleSave = async (rowData) => {
  try {
    const { error } = await supabase
      .from('open_po_detail')
      .update({
        po_quantity:        rowData.po_quantity,
        delivered_quantity: rowData.delivered_quantity,
        status:             rowData.status,
        open_quantity:      rowData.open_quantity
      })
      .eq('po_num', rowData.po_num)
      .eq('po_item', rowData.po_item)

    if (error) throw error
    alert('Row updated successfully')
  } catch (err) {
    console.error('Error updating row:', err)
    alert('Update failed: ' + err.message)
  }
}
```

Replace it entirely with:

```js
const handleSave = async (rowData) => {
  try {
    // 1. Save to open_po_detail (existing — do not change)
    const { error } = await supabase
      .from('open_po_detail')
      .update({
        po_quantity:        rowData.po_quantity,
        delivered_quantity: rowData.delivered_quantity,
        status:             rowData.status,
        open_quantity:      rowData.open_quantity
      })
      .eq('po_num', rowData.po_num)
      .eq('po_item', rowData.po_item)

    if (error) throw error

    // 2. Build bot notification message for this line item
    const itemName    = rowData.article_description || `Item #${Number(rowData.po_item) / 10}`
    const orderedQty  = parseFloat(rowData.po_quantity        || 0).toFixed(2)
    const deliveredQty= parseFloat(rowData.delivered_quantity || 0).toFixed(2)
    const openQty     = parseFloat(rowData.open_quantity      || 0).toFixed(2)
    const uom         = rowData.unit_of_measure || ''
    const itemStatus  = rowData.status || ''

    const message =
      `📦 *PO Line Item Update — #${rowData.po_num}*\n\n` +
      `*Item:* ${itemName}\n` +
      `*Ordered:* ${orderedQty} ${uom}\n` +
      `*Delivered:* ${deliveredQty} ${uom}\n` +
      `*Open Qty:* ${openQty} ${uom}\n` +
      `*Status:* ${itemStatus}\n\n` +
      `Please review and confirm if you can fulfil the remaining quantity.`

    await sendBotUpdateMessage(message)

    alert('Row updated successfully')
  } catch (err) {
    console.error('Error updating row:', err)
    alert('Update failed: ' + err.message)
  }
}
```

---

## What the vendor sees in chat

### When delivery date changes:
```
📋 PO Update — #4100260367

Delivery date updated to 15 Apr 2026.

Please confirm you can accommodate this update.
Reply with any concerns.
```

### When status changes:
```
📋 PO Update — #4100260367

PO status changed to Confirmed.

Please confirm you can accommodate this update.
Reply with any concerns.
```

### When both change together:
```
📋 PO Update — #4100260367

Delivery date updated to 15 Apr 2026 and PO status
changed to Confirmed.

Please confirm you can accommodate this update.
Reply with any concerns.
```

### When a line item is saved:
```
📦 PO Line Item Update — #4100260367

Item: Supply of M.S Conduct Pipe
Ordered: 350.00 EA
Delivered: 300.00 EA
Open Qty: 50.00 EA
Status: Partial

Please review and confirm if you can fulfil
the remaining quantity.
```

---

## Do NOT change
- Any existing Supabase save logic
- `handleChange` function
- All rendering / UI code
- `formatDate`, `formatQty` helpers
- KPI calculations
- Loading and error states
- Sidebar component
- .env file

---

## How to test after building

```
1. Open PO detail page for one of the 5 pilot POs
   e.g. localhost:5173/orders/4100260367

2. Change the delivery date to tomorrow's date
   → click Save Header
   → check vendor chat frontend
   → should see bot message about delivery date change

3. Change ordered qty on a line item
   → click the green save icon on that row
   → check vendor chat frontend
   → should see bot message about that specific item

4. Check compass_chat backend logs (server.js)
   → should show: 📩 [BACKEND] Message received from bot for PO: 4100260367
   → and WebSocket broadcast to vendor frontend
```

---

## Flow summary

```
Admin changes delivery date or line item → clicks Save
        ↓
Existing Supabase update runs (unchanged)
        ↓
sendBotUpdateMessage() called with change details
        ↓
POST to compass_chat server.js /api/chat-message
with sender_type = 'bot'
        ↓
server.js saves to chat_history + broadcasts WebSocket
        ↓
Vendor frontend receives message via WebSocket ✓
        ↓
Python backend_agent receives it via n8n/webhook
but thread_state check will allow it through
since this is an outbound bot message, not
a vendor reply — no AI processing needed
```