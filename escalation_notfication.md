PROMPT 2 — compass_procurement Admin React
Files to paste into Antigravity context

src/App.jsx
src/components/Sidebar.jsx
src/lib/supabase.js
src/pages/Escalations.jsx (so it knows the existing escalation detail route)


Make the following changes to the admin React frontend.
Do not change any existing pages. Do not touch .env file.
Match existing code style and Tailwind patterns exactly.

New file — src/pages/Notifications.jsx
Create this new page at src/pages/Notifications.jsx:
jsximport { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', bg: '#FEF2F2', color: '#DC2626', dot: '#EF4444' },
  high:     { label: 'High',     bg: '#FFFBEB', color: '#D97706', dot: '#F59E0B' },
  medium:   { label: 'Medium',   bg: '#EFF6FF', color: '#2563EB', dot: '#3B82F6' },
  low:      { label: 'Low',      bg: '#F9FAFB', color: '#6B7280', dot: '#9CA3AF' },
}

const REASON_LABELS = {
  partial_delivery: 'Partial Delivery',
  order_rejected:   'Order Rejected',
  delivery_delay:   'Delivery Delay',
  pricing_issue:    'Pricing Issue',
  payment_issue:    'Payment Issue',
  quality_issue:    'Quality Issue',
  no_response:      'No Response',
  other:            'Other',
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs  < 24) return `${hrs}h ago`
  return `${days}d ago`
}

export default function Notifications() {
  const navigate = useNavigate()
  const [escalations, setEscalations] = useState([])
  const [loading, setLoading]         = useState(true)
  const [filter, setFilter]           = useState('all')
  const [unreadIds, setUnreadIds]     = useState(new Set())
  const [tick, setTick]               = useState(0)
  const channelRef = useRef(null)

  // live clock for timeAgo
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30000)
    return () => clearInterval(t)
  }, [])

  // fetch escalations on mount
  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('escalations')
        .select(`
          id, po_num, vendor_name, vendor_code,
          escalation_reason, reason_detail, category,
          priority, status, ai_summary,
          escalation_created_at, delivery_date
        `)
        .eq('status', 'open')
        .order('escalation_created_at', { ascending: false })

      if (data) {
        setEscalations(data)
        // mark all current as unread on first load
        setUnreadIds(new Set(data.map(e => e.id)))
      }
      setLoading(false)
    }
    fetch()
  }, [])

  // Supabase Realtime — new escalations appear instantly
  useEffect(() => {
    const channel = supabase
      .channel('notifications-escalations')
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'escalations'
        },
        (payload) => {
          console.log('🔔 New escalation received:', payload.new)
          setEscalations(prev => [payload.new, ...prev])
          setUnreadIds(prev => new Set([...prev, payload.new.id]))
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => supabase.removeChannel(channel)
  }, [])

  const markAllRead = () => setUnreadIds(new Set())

  const handleClick = (escalation) => {
    // mark as read
    setUnreadIds(prev => {
      const next = new Set(prev)
      next.delete(escalation.id)
      return next
    })
    // navigate to escalation detail page
    navigate(`/escalations/${escalation.id}`)
  }

  const filtered = filter === 'all'
    ? escalations
    : escalations.filter(e => e.priority === filter)

  const unreadCount = unreadIds.size

  return (
    <div style={{ padding: '24px 28px', maxWidth: '900px' }}>

      {/* page header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div>
          <h1 style={{
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.3px',
            margin: 0
          }}>
            Notifications
          </h1>
          <p style={{
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
            marginTop: '3px'
          }}>
            Bot-escalated POs requiring operator attention · real-time
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              style={{
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '0.5px solid #D1D5DB',
                background: '#fff',
                color: '#374151',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Mark all read
            </button>
          )}
          <div style={{
            fontSize: '12px',
            background: '#F3F4F6',
            color: '#6B7280',
            padding: '4px 10px',
            borderRadius: '20px',
            fontWeight: 500
          }}>
            {escalations.length} open
          </div>
        </div>
      </div>

      {/* filter tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '16px',
        borderBottom: '0.5px solid #E5E7EB',
        paddingBottom: '12px'
      }}>
        {['all', 'critical', 'high', 'medium'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              fontSize: '12px',
              padding: '5px 12px',
              borderRadius: '6px',
              border: filter === f ? 'none' : '0.5px solid #E5E7EB',
              background: filter === f ? '#111827' : '#fff',
              color: filter === f ? '#fff' : '#6B7280',
              cursor: 'pointer',
              fontWeight: filter === f ? 600 : 400,
              textTransform: 'capitalize'
            }}
          >
            {f === 'all'
              ? `All (${escalations.length})`
              : `${f.charAt(0).toUpperCase() + f.slice(1)} (${escalations.filter(e => e.priority === f).length})`
            }
          </button>
        ))}
      </div>

      {/* loading state */}
      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          color: '#9CA3AF',
          fontSize: '13px'
        }}>
          Loading escalations...
        </div>
      )}

      {/* empty state */}
      {!loading && filtered.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          background: '#fff',
          border: '0.5px solid #E5E7EB',
          borderRadius: '10px'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>✓</div>
          <div style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#374151',
            marginBottom: '4px'
          }}>
            No open escalations
          </div>
          <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
            New escalations from the bot will appear here in real time
          </div>
        </div>
      )}

      {/* notification list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map(esc => {
          const isUnread    = unreadIds.has(esc.id)
          const pConfig     = PRIORITY_CONFIG[esc.priority] || PRIORITY_CONFIG.medium
          const reasonLabel = REASON_LABELS[esc.escalation_reason] || esc.escalation_reason

          return (
            <div
              key={esc.id}
              onClick={() => handleClick(esc)}
              style={{
                background: isUnread ? '#FAFBFF' : '#fff',
                border: isUnread
                  ? '0.5px solid #BFDBFE'
                  : '0.5px solid #E5E7EB',
                borderRadius: '10px',
                padding: '14px 16px',
                cursor: 'pointer',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
              onMouseLeave={e => e.currentTarget.style.background = isUnread ? '#FAFBFF' : '#fff'}
            >
              {/* unread dot */}
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isUnread ? pConfig.dot : 'transparent',
                flexShrink: 0,
                marginTop: '5px'
              }} />

              {/* main content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px',
                  flexWrap: 'wrap'
                }}>
                  {/* PO number */}
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#111827'
                  }}>
                    #{esc.po_num}
                  </span>

                  {/* priority badge */}
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: pConfig.bg,
                    color: pConfig.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {pConfig.label}
                  </span>

                  {/* reason badge */}
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: '#F3F4F6',
                    color: '#374151'
                  }}>
                    {reasonLabel}
                  </span>

                  {/* time */}
                  <span style={{
                    fontSize: '11px',
                    color: '#9CA3AF',
                    marginLeft: 'auto'
                  }}>
                    {timeAgo(esc.escalation_created_at)}
                  </span>
                </div>

                {/* vendor name */}
                <div style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  {esc.vendor_name}
                </div>

                {/* reason detail / ai summary */}
                <div style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {esc.reason_detail || esc.ai_summary || 'No details available'}
                </div>

                {/* delivery date */}
                <div style={{
                  fontSize: '11px',
                  color: '#9CA3AF',
                  marginTop: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <rect x="1" y="2" width="9" height="8" rx="1.5"
                      stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M3.5 1v2M7.5 1v2M1 5h9"
                      stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  Delivery: {esc.delivery_date
                    ? new Date(esc.delivery_date).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })
                    : '—'
                  }
                  <span style={{ marginLeft: '8px' }}>
                    Category: {esc.category || '—'}
                  </span>
                </div>
              </div>

              {/* arrow icon */}
              <svg
                width="16" height="16" viewBox="0 0 16 16" fill="none"
                style={{ flexShrink: 0, color: '#D1D5DB', marginTop: '2px' }}
              >
                <path d="M6 4l4 4-4 4"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                  strokeLinejoin="round"/>
              </svg>
            </div>
          )
        })}
      </div>

    </div>
  )
}

Change 1 — Add route in App.jsx
In the existing App.jsx, add this route alongside the existing escalations routes:
jsximport Notifications from './pages/Notifications'

// add inside your Routes/Switch:
<Route path="/notifications" element={<Notifications />} />

Change 2 — Add Notifications nav item to Sidebar.jsx
In Sidebar.jsx, find where the Escalations nav item is rendered.
Add a Notifications item directly above it.
The nav item needs:

A bell icon (SVG)
Label: "Notifications"
Route: /notifications
A red badge showing unread count — fetch this from Supabase

Add this state and fetch inside Sidebar.jsx:
jsxconst [unreadCount, setUnreadCount] = useState(0)

useEffect(() => {
  // fetch unread count on mount
  const fetchCount = async () => {
    const { count } = await supabase
      .from('escalations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open')
    setUnreadCount(count || 0)
  }
  fetchCount()

  // subscribe to new escalations
  const channel = supabase
    .channel('sidebar-notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'escalations'
    }, () => {
      setUnreadCount(prev => prev + 1)
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'escalations',
      filter: 'status=eq.resolved'
    }, () => {
      setUnreadCount(prev => Math.max(0, prev - 1))
    })
    .subscribe()

  return () => supabase.removeChannel(channel)
}, [])
Render the Notifications nav item with a badge:
jsx{/* Notifications nav item — add above Escalations */}
<div
  className={`nav-item ${location.pathname === '/notifications' ? 'active' : ''}`}
  onClick={() => navigate('/notifications')}
>
  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
      className="nav-icon">
      <path d="M7 1.5a4 4 0 014 4v2.5l1 1.5H2L3 8V5.5a4 4 0 014-4z"
        stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5.5 11.5a1.5 1.5 0 003 0"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
    {unreadCount > 0 && (
      <span style={{
        position: 'absolute',
        top: '-5px',
        right: '-8px',
        background: '#DC2626',
        color: '#fff',
        fontSize: '9px',
        fontWeight: 700,
        minWidth: '14px',
        height: '14px',
        borderRadius: '7px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 3px',
        lineHeight: 1
      }}>
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    )}
  </div>
  Notifications
</div>

Change 3 — Add bell icon with badge to topbar
In whichever component renders the topbar (check if it's inside Sidebar.jsx,
App.jsx, or a separate Topbar.jsx component), add a bell icon with badge
next to the user avatar on the right side:
jsx{/* Bell icon in topbar — add before user avatar */}
<div
  onClick={() => navigate('/notifications')}
  style={{
    position: 'relative',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center'
  }}
>
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
    style={{ color: '#6B7280' }}>
    <path d="M9 2a5 5 0 015 5v3l1.5 2H2.5L4 10V7a5 5 0 015-5z"
      stroke="currentColor" strokeWidth="1.3"/>
    <path d="M7 14.5a2 2 0 004 0"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
  {unreadCount > 0 && (
    <span style={{
      position: 'absolute',
      top: '2px',
      right: '2px',
      background: '#DC2626',
      color: '#fff',
      fontSize: '9px',
      fontWeight: 700,
      minWidth: '14px',
      height: '14px',
      borderRadius: '7px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 3px'
    }}>
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )}
</div>
For the topbar bell to work, unreadCount state needs to be accessible there.
If Sidebar and Topbar are separate components, lift unreadCount state to
App.jsx and pass it as a prop to both, OR use a simple React context.
The simplest approach: duplicate the Supabase subscription in both components.

Do NOT change

Existing Escalations.jsx page
Existing EscalationDetail.jsx page
Dashboard.jsx
Orders.jsx
Chats.jsx
Vendors.jsx
supabase.js
.env file
tailwind.config.js


How to test after building
1. Open admin panel → you should see "Notifications" in sidebar
   with a bell icon and a red badge showing open escalation count

2. Trigger an escalation from server.js test:
   curl -X POST http://localhost:5001/api/chat-message \
     -H "Content-Type: application/json" \
     -d '{
       "po_id": "4100260367",
       "sender_type": "bot",
       "message_text": "I have flagged this order",
       "vendor_phone": "9910603920",
       "supplier_name": "Yashoda Gas Service",
       "intent": "PARTIAL",
       "reason": "Only 70kg available out of 100kg ordered",
       "escalate": true,
       "admin_message": "Partial Delivery escalation"
     }'

3. Badge on bell icon should increment in real time without refresh

4. Click Notifications in sidebar
   → see the escalated PO card with PO number, vendor, reason, priority, time

5. Click the notification card
   → should redirect to /escalations/:id (escalation detail page)

Summary of what each file does
FileWhat changescompass_chat/backend/server.jsInserts into escalations table when escalate=true. Broadcasts new_escalation WebSocket event.compass_procurement/src/pages/Notifications.jsxNew page — shows escalated POs in real time. Click redirects to /escalations/:id.compass_procurement/src/components/Sidebar.jsxAdds Notifications nav item with live red badge.compass_procurement/src/App.jsxAdds /notifications route.
Supabase Realtime to enable
Go to Supabase dashboard → Database → Replication.
Make sure escalations table is enabled under supabase_realtime publication.
Without this the real-time badge and live notifications will not work.