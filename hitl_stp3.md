# STEP 3 — Admin Chats.jsx (Updated)
## compass_procurement/src/pages/Chats.jsx

---

## Files to paste into Antigravity context
1. `src/pages/Chats.jsx`
2. `src/lib/supabase.js`
3. `src/.env` (variable names only)

---

## Overview

Wire the existing Take Over Chat, Hand Back to Bot, and Pause Bot Completely
buttons to the HITL system. All HITL actions call `compass_chat/backend/server.js`
endpoints — no AI keys, no direct Supabase writes for HITL in this file.

Admin React only needs:
- `VITE_VENDOR_BACKEND_URL` — points to server.js (compass_chat backend)
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — for Realtime subscription only

---

## Change 1 — Add new state variables

Inside the main Chats component, add alongside existing state:

```js
const [threadState, setThreadState] = useState('bot_active')
const [takingOver, setTakingOver] = useState(false)
const [handingBack, setHandingBack] = useState(false)
const [operatorInput, setOperatorInput] = useState('')
const [sendingOperatorMsg, setSendingOperatorMsg] = useState(false)
```

---

## Change 2 — Fetch thread_state when selected PO changes

When admin selects a PO in the sidebar, fetch its current thread_state:

```js
useEffect(() => {
  if (!selectedPO) return

  const fetchThreadState = async () => {
    const { data } = await supabase
      .from('selected_open_po_line_items')
      .select('thread_state')
      .eq('po_num', selectedPO)
      .single()

    if (data) {
      setThreadState(data.thread_state || 'bot_active')
    }
  }

  fetchThreadState()
}, [selectedPO])
```

---

## Change 3 — Supabase Realtime subscription for thread_state

Add this useEffect so the UI updates the moment thread_state changes in
Supabase — triggered by server.js or Python backend writing to it:

```js
useEffect(() => {
  if (!selectedPO) return

  const channel = supabase
    .channel(`thread-state-${selectedPO}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'selected_open_po_line_items',
        filter: `po_num=eq.${selectedPO}`
      },
      (payload) => {
        if (payload.new.thread_state) {
          setThreadState(payload.new.thread_state)
          console.log(`🔄 Thread state updated: ${payload.new.thread_state}`)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [selectedPO])
```

---

## Change 4 — Take Over handler

Calls `server.js /api/takeover`.
Server.js writes to Supabase and logs system message.
threadState updates automatically via Realtime — no manual setThreadState needed.

```js
const handleTakeOver = async () => {
  if (!selectedPO) return
  setTakingOver(true)

  try {
    const res = await fetch(
      `${import.meta.env.VITE_VENDOR_BACKEND_URL}/api/takeover`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_num: selectedPO,
          operator_name: 'Alex Rivera'
        })
      }
    )

    if (!res.ok) {
      throw new Error(`Takeover failed: ${res.status}`)
    }

    console.log(`✅ Took over PO ${selectedPO}`)
    // threadState will update via Supabase Realtime automatically
  } catch (err) {
    console.error('Takeover failed:', err)
  } finally {
    setTakingOver(false)
  }
}
```

---

## Change 5 — Hand Back to Bot handler

Calls `server.js /api/handback`.
Server.js calls Python backend_agent which:
- fetches chat history
- generates context summary via OpenAI (key stays in Python .env)
- saves summary to Supabase
- sets thread_state back to bot_active

threadState updates automatically via Realtime.

```js
const handleHandBack = async () => {
  if (!selectedPO) return
  setHandingBack(true)

  try {
    const res = await fetch(
      `${import.meta.env.VITE_VENDOR_BACKEND_URL}/api/handback`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_num: selectedPO,
          operator_name: 'Alex Rivera'
        })
      }
    )

    if (!res.ok) {
      throw new Error(`Hand back failed: ${res.status}`)
    }

    console.log(`✅ Bot resumed for PO ${selectedPO}`)
    // threadState will update via Supabase Realtime automatically
    // context summary is generated and saved by Python backend
  } catch (err) {
    console.error('Hand back failed:', err)
  } finally {
    setHandingBack(false)
  }
}
```

---

## Change 6 — Operator send message handler

Calls `server.js /api/chat-message` with sender_type = 'operator'.
Server.js saves to DB and broadcasts via WebSocket to vendor frontend.
No AI keys needed. No direct Supabase write needed.

```js
const handleOperatorSend = async () => {
  if (!operatorInput.trim() || !selectedPO) return
  setSendingOperatorMsg(true)

  const messageText = operatorInput.trim()
  setOperatorInput('') // clear input immediately for better UX

  try {
    const res = await fetch(
      `${import.meta.env.VITE_VENDOR_BACKEND_URL}/api/chat-message`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_id: selectedPO,
          sender_type: 'operator',
          sender_label: 'Compass Procurement Team',
          message_text: messageText,
          vendor_phone: '',
          supplier_name: '',
          intent: null,
          escalate: false
        })
      }
    )

    if (!res.ok) {
      throw new Error(`Send failed: ${res.status}`)
    }

    // server.js handles:
    // 1. saving to chat_history in DB
    // 2. broadcasting via WebSocket to vendor frontend
    // nothing more needed here
  } catch (err) {
    console.error('Operator message send failed:', err)
    // restore input so admin can retry
    setOperatorInput(messageText)
  } finally {
    setSendingOperatorMsg(false)
  }
}
```

---

## Change 7 — Human controlled banner

Add this inside the chat panel, above the message list.
Only visible when admin has taken over:

```jsx
{threadState === 'human_controlled' && (
  <div style={{
    background: '#EFF6FF',
    border: '0.5px solid #BFDBFE',
    borderRadius: '6px',
    padding: '8px 14px',
    marginBottom: '12px',
    fontSize: '12px',
    color: '#1D4ED8',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0
  }}>
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle
        cx="6.5" cy="6.5" r="5.5"
        stroke="#1D4ED8" strokeWidth="1.2"
      />
      <path
        d="M6.5 4v3M6.5 9v.4"
        stroke="#1D4ED8" strokeWidth="1.2" strokeLinecap="round"
      />
    </svg>
    You are in control — bot is paused. Messages you send go directly to the vendor.
  </div>
)}
```

---

## Change 8 — Replace operator controls buttons

Find the existing Take Over Chat, Hand Back to Bot, and Pause Bot Completely
buttons in the OPERATOR CONTROLS section. Replace all three with:

```jsx
{/* OPERATOR CONTROLS */}

{/* Take Over — only when bot is running */}
{(threadState === 'bot_active' || threadState === 'pending') && (
  <button
    onClick={handleTakeOver}
    disabled={takingOver}
    // keep existing className/style from current Take Over Chat button
  >
    {takingOver ? 'Taking over...' : 'Take Over Chat'}
  </button>
)}

{/* Hand Back — only when human is in control */}
{threadState === 'human_controlled' && (
  <button
    onClick={handleHandBack}
    disabled={handingBack}
    // keep existing className/style from current Hand Back to Bot button
  >
    {handingBack ? 'Generating context...' : 'Hand Back to Bot'}
  </button>
)}

{/* Pause Bot — only when bot is running */}
{(threadState === 'bot_active' || threadState === 'pending') && (
  <button
    onClick={async () => {
      await fetch(
        `${import.meta.env.VITE_VENDOR_BACKEND_URL}/api/takeover`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            po_num: selectedPO,
            operator_name: 'Alex Rivera'
          })
        }
      )
      // reuse takeover endpoint — sets thread_state to human_controlled
      // which effectively pauses the bot
    }}
    // keep existing className/style from current Pause Bot Completely button
  >
    Pause Bot Completely
  </button>
)}
```

---

## Change 9 — Replace message input and send button

Find the existing message input and send button at the bottom of the chat
panel. Replace with a state-aware version:

```jsx
<div style={{
  display: 'flex',
  gap: '8px',
  padding: '12px',
  borderTop: '0.5px solid #E5E7EB',
  flexShrink: 0
}}>
  <input
    type="text"
    value={operatorInput}
    onChange={e => setOperatorInput(e.target.value)}
    onKeyDown={e => {
      if (
        e.key === 'Enter' &&
        !e.shiftKey &&
        threadState === 'human_controlled' &&
        !sendingOperatorMsg
      ) {
        e.preventDefault()
        handleOperatorSend()
      }
    }}
    disabled={threadState !== 'human_controlled'}
    placeholder={
      threadState === 'human_controlled'
        ? 'Type a message to the vendor...'
        : 'Take over chat to send messages manually'
    }
    style={{
      flex: 1,
      opacity: threadState !== 'human_controlled' ? 0.5 : 1,
      cursor: threadState !== 'human_controlled' ? 'not-allowed' : 'text'
    }}
    // keep existing className for input styling
  />
  <button
    onClick={handleOperatorSend}
    disabled={
      threadState !== 'human_controlled' ||
      !operatorInput.trim() ||
      sendingOperatorMsg
    }
    style={{
      opacity: threadState !== 'human_controlled' ? 0.4 : 1
    }}
    // keep existing className for button styling
  >
    {sendingOperatorMsg ? '...' : 'Send'}
  </button>
</div>
```

---

## Change 10 — Add to compass_procurement/.env

```
VITE_VENDOR_BACKEND_URL=http://localhost:5001
```

No AI keys needed here.
No Supabase service key needed here — anon key is enough for Realtime.

---

## What this file does NOT do (intentionally)

- Does NOT call OpenAI or Anthropic directly
- Does NOT write thread_state to Supabase directly
- Does NOT generate context summaries
- Does NOT use a service role key

All of that is handled by `compass_chat/backend_agent/main.py` (Python).
Admin React only calls `server.js` endpoints and subscribes to Supabase
Realtime for live updates.

---

## Do NOT change
- Sidebar component
- Left PO list sidebar rendering
- Chat message display and rendering logic
- Supabase client setup in `src/lib/supabase.js`
- Any other pages
- Routing in `App.jsx`
- `tailwind.config.js`

---

## How to test after building

```
1. Open compass_procurement admin panel → Conversations
2. Select a PO from the sidebar
3. Check browser console — should log current thread_state

4. Click "Take Over Chat"
   → button should disappear
   → "Hand Back to Bot" should appear
   → blue banner should appear: "You are in control"
   → message input should become active
   → check Supabase: thread_state should be 'human_controlled'
   → check compass_chat Python logs: "Bot paused" for next vendor message

5. Type a message and click Send
   → message should appear in vendor frontend immediately
   → compass_chat Python logs should NOT show any bot response

6. Click "Hand Back to Bot"
   → button shows "Generating context..."
   → after a few seconds, "Take Over Chat" button reappears
   → blue banner disappears
   → message input disables
   → check Supabase: thread_state = 'bot_active', bot_context_summary has text
   → send a test vendor message — bot should respond with context awareness
```