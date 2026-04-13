import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'

const PRIORITY_CONFIG = {
// ... (rest of the constants)
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
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="flex justify-between items-center h-16 px-8 w-full bg-white border-b border-slate-100 shadow-sm z-40 flex-shrink-0">
          <div className="flex items-center gap-6">
            <h1 className="text-base font-black tracking-tighter text-slate-900 uppercase font-headline">
              Procurement&nbsp;Ops
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-slate-800">Ramesh Kumar</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Admin</p>
            </div>
            <img alt="User profile" className="w-9 h-9 rounded-full border-2 border-slate-200 shadow-sm"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8ov37m6Ru1jtLXavUm2Wv7-q8IqttbDcSU5OJzUCKT6ZmPdV8o10Gkm2bzBBlUkUAfR7nPEInOWhBPKK0JB-n56VPQC2sJvCZVr9a9eqzujzWSusoB7Pqo3Zl5PSfDCMpzoPbo0JZh5CHcjqc7lATQ1qKELXGJ7WeD5DB3SN3FaTJ4H9VBzP_Fvv51A3UPXtSYL_rtKoK2k8LRfiEklf60DY9c3Hul2Ue3yIjaHQmSa85wLfALExg-6xFvgM8lPDR6WQOIutN4I6d" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-[#F8FAFC]">
          <div className="max-w-[1000px] mx-auto w-full space-y-6">
            
            {/* page header */}
            <div className="flex items-start justify-between mb-2">
              <div>
                <h2 className="text-4xl font-black text-slate-900 font-headline tracking-tighter uppercase leading-none">
                  Notifications
                </h2>
                <p className="text-slate-500 font-medium mt-2 text-sm">
                  Bot-escalated POs requiring operator attention · real-time
                </p>
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
                  >
                    Mark all read
                  </button>
                )}
                <span className="text-[10px] font-bold text-slate-400 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm">
                  {escalations.length} open
                </span>
              </div>
            </div>

            {/* filter tabs */}
            <div className="flex gap-2 pb-2">
              {['all', 'critical', 'high', 'medium'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    filter === f 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                      : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200 shadow-sm'
                  }`}
                >
                  {f === 'all'
                    ? `All (${escalations.length})`
                    : `${f} (${escalations.filter(e => e.priority === f).length})`
                  }
                </button>
              ))}
            </div>

            {/* loading state */}
            {loading && (
              <div className="py-20 text-center animate-pulse">
                <span className="material-symbols-outlined text-4xl text-slate-200">sync</span>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mt-2">Syncing escalations...</p>
              </div>
            )}

            {/* empty state */}
            {!loading && filtered.length === 0 && (
              <div className="bg-white p-20 rounded-[2rem] border border-slate-100 shadow-sm text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-emerald-500 text-3xl">check_circle</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 uppercase font-headline">No Open Escalations</h3>
                <p className="text-sm text-slate-400 mt-1 font-medium">Everything is currently under control.</p>
              </div>
            )}

            {/* notification list */}
            <div className="flex flex-col gap-3 pb-8">
              {filtered.map(esc => {
                const isUnread    = unreadIds.has(esc.id)
                const pConfig     = PRIORITY_CONFIG[esc.priority] || PRIORITY_CONFIG.medium
                const reasonLabel = REASON_LABELS[esc.escalation_reason] || esc.escalation_reason

                return (
                  <div
                    key={esc.id}
                    onClick={() => handleClick(esc)}
                    className={`group bg-white rounded-[1.5rem] border transition-all cursor-pointer flex gap-4 p-5 hover:translate-x-1 ${
                      isUnread ? 'border-blue-200 shadow-md shadow-blue-500/5' : 'border-slate-100 shadow-sm'
                    }`}
                  >
                    {/* priority vertical bar */}
                    <div style={{ width: '4px', background: pConfig.dot, borderRadius: '4px' }} className="flex-shrink-0" />

                    {/* main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="text-sm font-black text-slate-900 tracking-tighter">
                          {esc.po_num}
                        </span>
                        <span style={{ background: pConfig.bg, color: pConfig.color }} className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg">
                          {pConfig.label}
                        </span>
                        <span className="bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-slate-100">
                          {reasonLabel}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 ml-auto">
                          {timeAgo(esc.escalation_created_at)}
                        </span>
                      </div>

                      <div className="text-sm font-black text-slate-800 mb-1">
                        {esc.vendor_name}
                      </div>

                      <div className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                        {esc.reason_detail || esc.ai_summary || 'No details available'}
                      </div>

                      <div className="flex items-center gap-4 mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                          ETD: {(() => {
                            if (!esc.delivery_date) return '—';
                            const d = new Date(esc.delivery_date);
                            if (isNaN(d)) return esc.delivery_date;
                            const DD = String(d.getDate()).padStart(2, '0');
                            const MM = String(d.getMonth() + 1).padStart(2, '0');
                            const YYYY = d.getFullYear();
                            return `${DD}/${MM}/${YYYY}`;
                          })()}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">folder</span>
                          {esc.category || 'Operation'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center text-slate-300 group-hover:text-blue-500 transition-colors">
                      <span className="material-symbols-outlined">chevron_right</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .font-headline { font-family: 'Outfit', sans-serif; }
      `}} />
    </div>
  )
}
