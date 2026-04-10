import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabase';
import useChatMessages from '../hooks/useChatMessages';
import { computeResponseSLA, getLatestCommunicationState } from '../lib/slaUtils';
import { useSLATimer } from '../hooks/useSLATimer';

function CommunicationStateBadge({ state }) {
  const config = {
    pending: {
      label: 'Awaiting Start',
      bg: '#F9FAFB',
      color: '#9CA3AF'
    },
    waiting_vendor: {
      label: 'Waiting on Vendor',
      bg: '#F3F4F6',
      color: '#6B7280'
    },
    action_required: {
      label: 'Action Required',
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
  const c = config[state] || config.pending
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

// Format a timestamp to h:mm AM/PM
const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatDeliveryDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const normalized = String(dateStr).replace(/[\.\/]/g, '-');
  const parts = normalized.split('-');
  let d;
  if (parts.length === 3 && parts[2].length === 4) {
    d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  } else {
    d = new Date(normalized);
  }
  if (isNaN(d)) return dateStr;
  const DD = String(d.getDate()).padStart(2, '0');
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const YYYY = d.getFullYear();
  return `${DD}-${MM}-${YYYY}`;
};

// ── Compass opening message (pinned top of every chat) ──────────────────────
const CompassOpeningMessage = ({ po }) => {
  if (!po) return null;
  const deliveryDate = formatDeliveryDate(po.delivery_date);
  return (
    <div className="compass-opening-wrap">
      {/* Compass brand row */}
      <div className="compass-opening-inner">
        {/* pin badge */}
        <div className="compass-pin-badge">
          <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>push_pin</span>
          Compass · Opening Message
        </div>

        {/* bubble row — right aligned (from us) */}
        <div className="flex items-end gap-3 flex-row-reverse">
          {/* Avatar */}
          <div className="compass-avatar">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#fff' }}>explore</span>
          </div>

          {/* Bubble */}
          <div className="compass-bubble">
            <p className="compass-bubble-sender">Compass Assistant</p>
            <div className="compass-bubble-body">
              <p>Hi there! 👋 I'm your <strong>Compass</strong> procurement assistant.</p>
              <p style={{ marginTop: '8px' }}>
                I see you have <strong>Order #{po.po_num}</strong> scheduled for delivery on{' '}
                <strong>{deliveryDate}</strong>.
              </p>
              <p style={{ marginTop: '8px' }}>Will you be able to deliver this order on time? ✅</p>
            </div>
            <p className="compass-bubble-time">Opening message</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Chat bubble component per sender_type
const ChatBubble = ({ message }) => {
  const { sender_type, message_text, sent_at, escalation_required } = message;

  if (sender_type === 'vendor') {
    // Left-aligned, blue bubble (incoming from vendor)
    return (
      <>
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden text-blue-800 font-bold text-[10px]">
            V
          </div>
          <div className="flex flex-col gap-1 max-w-[70%]">
            <span className="text-[10px] font-bold text-on-surface-variant ml-2 uppercase">Vendor Rep</span>
            <div className="p-4 bg-primary text-white rounded-2xl rounded-tl-none shadow-md shadow-primary/10 text-sm leading-relaxed">
              {message_text}
            </div>
            <span className="text-[10px] text-on-surface-variant/60 ml-2">{formatTime(sent_at)}</span>
          </div>
        </div>
        {escalation_required && <EscalationBanner />}
      </>
    );
  }

  if (sender_type === 'operator') {
    // Right-aligned, white bubble with border (outgoing from operator)
    return (
      <>
        <div className="flex items-start gap-4 flex-row-reverse">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0 text-white font-bold text-[10px]">SC</div>
          <div className="flex flex-col items-end gap-1 max-w-[70%]">
            <span className="text-[10px] font-bold text-primary mr-2 uppercase">Sarah (Operator)</span>
            <div className="p-4 bg-white border border-outline-variant/30 rounded-2xl rounded-tr-none shadow-sm text-sm leading-relaxed text-on-surface">
              {message_text}
            </div>
            <span className="text-[10px] text-on-surface-variant/60 mr-2">{formatTime(sent_at)}</span>
          </div>
        </div>
        {escalation_required && <EscalationBanner />}
      </>
    );
  }

  // Default: bot — right-aligned, grey neutral bubble (outgoing from bot)
  return (
    <>
      <div className="flex items-start gap-4 flex-row-reverse">
        <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-sm text-on-surface-variant">smart_toy</span>
        </div>
        <div className="flex flex-col items-end gap-1 max-w-[70%]">
          <span className="text-[10px] font-bold text-on-surface-variant mr-2 uppercase">Architect Bot</span>
          <div className="p-4 bg-white/60 border border-outline-variant/30 backdrop-blur-md rounded-2xl rounded-tr-none shadow-sm text-sm leading-relaxed">
            {message_text}
          </div>
          <span className="text-[10px] text-on-surface-variant/60 mr-2">{formatTime(sent_at)}</span>
        </div>
      </div>
      {escalation_required && <EscalationBanner />}
    </>
  );
};

// Escalation warning banner
const EscalationBanner = () => (
  <div className="flex justify-center">
    <div className="px-6 py-2 bg-error-container/30 border border-error-container rounded-lg flex items-center gap-3">
      <span className="material-symbols-outlined text-error text-lg">warning</span>
      <span className="text-xs font-bold text-on-error-container">
        ⚠️ Bot detected high-risk delay. Requesting human operator...
      </span>
    </div>
  </div>
);

// Loading skeleton for chat area
const ChatSkeleton = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
    <div className="animate-spin w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full"></div>
    <p className="text-sm text-on-surface-variant font-medium animate-pulse">Loading messages...</p>
  </div>
);

const Chats = () => {
  const [poData, setPoData] = useState([]);
  const [selectedPo, setSelectedPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messagesByPO, setMessagesByPO] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [threadState, setThreadState] = useState('bot_active');
  const [takingOver, setTakingOver] = useState(false);
  const [handingBack, setHandingBack] = useState(false);
  const tick = useSLATimer();
  const messagesEndRef = useRef(null);
  const [searchParams] = useSearchParams();

  // Fetch chat messages for selected PO using the custom hook
  const {
    messages: chatMessages,
    loading: chatLoading,
    error: chatError,
  } = useChatMessages(selectedPo?.po_num);

  // Auto scroll when messages change
  useEffect(() => {
    if (chatMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    const fetchPOData = async () => {
      const posToFetch = [
        '4100259330',
        '4100260294',
        '4100260367',
        '4100260584',
        '4100260654'
      ];

      const { data, error } = await supabase
        .from('open_po_detail')
        .select('*')
        .in('po_num', posToFetch);

      if (!error && data) {
        // Just take the first row per PO for the header
        const uniquePOs = [];
        const seen = new Set();
        data.forEach(item => {
          if (!seen.has(item.po_num)) {
            seen.add(item.po_num);
            uniquePOs.push(item);
          }
        });
        setPoData(uniquePOs);

        // Fetch chat messages for all sidebar POs
        const poNums = uniquePOs.map(p => p.po_num);

        const { data: allMessages } = await supabase
          .from('chat_history')
          .select('po_num, sender_type, sent_at, communication_state')
          .in('po_num', poNums)
          .order('sent_at', { ascending: true });

        const grouped = {};
        allMessages?.forEach(msg => {
          if (!grouped[msg.po_num]) grouped[msg.po_num] = [];
          grouped[msg.po_num].push(msg);
        });

        setMessagesByPO(grouped);

        // If coming from Dashboard with ?po=XXXX, open that PO
        const requestedPo = searchParams.get('po');
        const match = requestedPo && uniquePOs.find(p => p.po_num === requestedPo);
        setSelectedPo(match || (uniquePOs.length > 0 ? uniquePOs[0] : null));
      }
      setLoading(false);
    };

    fetchPOData();

    // Subscribe to all chat history changes to keep sidebar live
    const globalChannel = supabase
      .channel('global-chat-history')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_history' },
        (payload) => {
          const msg = payload.new;
          setMessagesByPO(prev => {
            const current = prev[msg.po_num] || [];
            return {
              ...prev,
              [msg.po_num]: [...current, msg]
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, [searchParams]);

  // Fetch thread_state when selected PO changes
  useEffect(() => {
    if (!selectedPo?.po_num) return;

    const fetchThreadState = async () => {
      const { data, error } = await supabase
        .from('selected_open_po_line_items')
        .select('thread_state')
        .eq('po_num', selectedPo.po_num)
        .maybeSingle();

      if (data) {
        setThreadState(data.thread_state || 'bot_active');
      }
    };

    fetchThreadState();
  }, [selectedPo?.po_num]);

  // Real-time thread_state subscription
  useEffect(() => {
    if (!selectedPo?.po_num) return;

    const channel = supabase
      .channel(`thread-state-${selectedPo.po_num}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'selected_open_po_line_items',
          filter: `po_num=eq.${selectedPo.po_num}`
        },
        (payload) => {
          if (payload.new.thread_state) {
            setThreadState(payload.new.thread_state);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPo?.po_num]);

  const handleTakeOver = async () => {
    if (!selectedPo?.po_num) return;
    setTakingOver(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_VENDOR_BACKEND_URL}/api/takeover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_num: selectedPo.po_num,
          operator_name: 'Alex Rivera'
        })
      });

      if (!res.ok) throw new Error(`Takeover failed: ${res.status}. Check if your backend is running.`);
      
      // Optimistic update for better UX
      setThreadState('human_controlled');
      console.log(`✅ Took over PO ${selectedPo.po_num}`);
    } catch (err) {
      console.error('Takeover failed:', err);
      alert(`Takeover failed. Please ensure VITE_VENDOR_BACKEND_URL is set in .env and the backend is running at ${import.meta.env.VITE_VENDOR_BACKEND_URL}`);
    } finally {
      setTakingOver(false);
    }
  };

  const handleHandBack = async () => {
    if (!selectedPo?.po_num) return;
    setHandingBack(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_VENDOR_BACKEND_URL}/api/handback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_num: selectedPo.po_num,
          operator_name: 'Alex Rivera'
        })
      });

      if (!res.ok) throw new Error(`Hand back failed: ${res.status}`);
      
      setThreadState('bot_active');
      console.log(`✅ Bot resumed for PO ${selectedPo.po_num}`);
    } catch (err) {
      console.error('Hand back failed:', err);
      alert('Hand back failed. Check backend logs.');
    } finally {
      setHandingBack(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedPo || sending) return;
    
    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage(''); // Clear immediately for UX

    try {
      const res = await fetch(`${import.meta.env.VITE_VENDOR_BACKEND_URL}/api/chat-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_id: selectedPo.po_num,
          sender_type: 'operator',
          sender_label: 'Compass Procurement Team',
          message_text: messageText,
          vendor_phone: selectedPo.vendor_phone || '',
          supplier_name: selectedPo.vendor_name || '',
          intent: null,
          escalate: false
        })
      });

      if (!res.ok) throw new Error(`Send failed: ${res.status}`);
    } catch (err) {
      console.error('Error sending message:', err);
      setNewMessage(messageText); // Restore on failure
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Auto-escalation logic
  const escalatePO = async (po, sla) => {
    try {
      // Check if already escalated
      const { data: existing } = await supabase
        .from('escalations')
        .select('id')
        .eq('po_num', po.po_num)
        .eq('status', 'open')
        .limit(1);

      if (existing && existing.length > 0) return; // Already escalated

      // Insert new escalation
      await supabase
        .from('escalations')
        .insert([{
          po_num: po.po_num,
          vendor_code: po.vendor_code,
          vendor_name: po.vendor_name,
          delivery_site: po.delivery_site || 'TBD',
          delivery_date: po.delivery_date,
          escalation_reason: 'no_response',
          reason_detail: `Vendor has not responded for ${sla.label}. Automatically escalated by Compass.`,
          priority: 'critical',
          status: 'open',
          vendor_sla_applies: true,
          vendor_sla_hours: 0.5,
          last_bot_message_at: new Date(Date.now() - sla.elapsedMs).toISOString(),
          category: 'Communication',
          operator_sla_hours: 2, // Default operator SLA
          escalation_created_at: new Date().toISOString(),
          ai_summary: `PO-${po.po_num} has a severe communication delay. The vendor, ${po.vendor_name}, has not responded to the last bot outreach within the required 30-minute window.`
        }]);

      console.log(`Auto-escalated PO-${po.po_num}`);
    } catch (err) {
      console.error('Auto-escalation error:', err);
    }
  };

  // Check for breaches every 10 seconds
  useEffect(() => {
    const checkBreaches = () => {
      poData.forEach(po => {
        const messages = messagesByPO[po.po_num] || [];
        const sla = computeResponseSLA(messages, 0.5);
        if (sla && sla.breached) {
          escalatePO(po, sla);
        }
      });
    };

    const interval = setInterval(checkBreaches, 10000);
    return () => clearInterval(interval);
  }, [poData, messagesByPO]);

  return (
    <div className="flex h-screen overflow-hidden bg-background max-h-screen">
      <Sidebar />
      <main className="flex-1 flex overflow-hidden w-full">
        {/* PO List Sidebar */}
        <section className="w-80 flex flex-col bg-surface-container-low border-r border-outline-variant/20 h-full">
          <div className="p-6 flex-shrink-0">
            <h2 className="text-xl font-bold text-on-surface mb-4">Vendor Chats</h2>
            <div className="relative">
              <input className="w-full bg-surface-container-lowest border-none rounded-lg text-sm px-10 py-2.5 focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/50" placeholder="Search POs..." type="text" />
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant/50 text-sm">search</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 space-y-2 no-scrollbar pb-4">
            {loading ? (
              <div className="p-4 text-center text-on-surface-variant text-sm font-bold">Loading chats...</div>
            ) : poData.map((po) => {
              const isActive = selectedPo?.po_num === po.po_num;
              return (
                <div
                  key={po.po_num}
                  onClick={() => setSelectedPo(po)}
                  className={`p-4 rounded-xl cursor-pointer transition-all ${isActive
                    ? 'bg-surface-container-lowest border-l-4 border-primary shadow-sm group'
                    : 'hover:bg-surface-container-highest/30 border-l-4 border-transparent'
                    }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
                      PO-{po.po_num}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-on-surface truncate">{po.vendor_name}</h3>
                  
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
                      const sla = computeResponseSLA(messagesByPO[po.po_num] || [], 0.5)
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
                          <span style={{ opacity: 0.5, marginLeft: '2px', fontWeight: 500 }}>
                            / {sla.windowLabel}
                          </span>
                        </span>
                      )
                    })()}

                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Main Chat Area */}
        <section className="flex-1 flex flex-col bg-surface-container-lowest h-full overflow-hidden">
          {selectedPo ? (
            <>
              <header className="h-16 flex items-center justify-between px-8 border-b border-outline-variant/10 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-lg bg-surface-variant flex items-center justify-center font-bold text-on-surface-variant text-lg">
                      {selectedPo.vendor_name.charAt(0)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-on-surface">{selectedPo.vendor_name} - Support</h2>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${threadState === 'human_controlled' ? 'bg-blue-500' : 'bg-primary'}`}></span>
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                        {threadState === 'human_controlled' ? 'Human Intervention Mode' : 'AI Assistant Active'}
                      </span>
                    </div>
                  </div>
                </div>
              </header>

              {/* Chat messages area */}
              {chatLoading ? (
                <ChatSkeleton />
              ) : chatError ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center space-y-3">
                    <span className="material-symbols-outlined text-4xl text-error/60">error</span>
                    <p className="text-sm font-medium text-on-surface-variant">Could not load messages. Please try again.</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#fafbfd]">
                  {/* Human Controlled Banner */}
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
                        <circle cx="6.5" cy="6.5" r="5.5" stroke="#1D4ED8" strokeWidth="1.2"/>
                        <path d="M6.5 4v3M6.5 9v.4" stroke="#1D4ED8" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                      You are in control — bot is paused. Messages you send go directly to the vendor.
                    </div>
                  )}

                  {/* ── Compass opening message (always first) ── */}
                  <CompassOpeningMessage po={selectedPo} />

                  <div className="flex justify-center">
                    <span className="px-4 py-1 bg-surface-container-low rounded-full text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Today</span>
                  </div>

                  {chatMessages.length === 0 && !chatLoading && (
                    <div className="flex justify-center py-12">
                      <p className="text-sm text-on-surface-variant/60 italic">No messages yet. The conversation will appear here once the vendor responds.</p>
                    </div>
                  )}

                  {chatMessages.map((msg) => (
                    <ChatBubble key={msg.id} message={msg} />
                  ))}

                  {/* Auto-scroll anchor */}
                  <div ref={messagesEndRef} />
                </div>
              )}

              <footer className="p-6 bg-white border-t border-outline-variant/10 flex-shrink-0 mt-auto">
                <div className="flex items-end gap-4 max-w-5xl mx-auto">
                  <div className="flex-1 relative">
                    <textarea 
                      className="w-full bg-surface-container-low border-none rounded-2xl px-6 py-4 pr-12 focus:ring-2 focus:ring-primary/20 resize-none text-sm" 
                      placeholder={
                        threadState === 'human_controlled'
                          ? "Type a message..."
                          : "Take over chat to send messages manually"
                      }
                      rows="1"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && threadState === 'human_controlled') {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={sending || threadState !== 'human_controlled'}
                      style={{
                        opacity: threadState !== 'human_controlled' ? 0.6 : 1,
                        cursor: threadState !== 'human_controlled' ? 'not-allowed' : 'text'
                      }}
                    />
                    <div className="absolute right-4 bottom-3.5 flex gap-2">
                      <button className="text-on-surface-variant/60 hover:text-primary transition-all">
                        <span className="material-symbols-outlined text-xl">attach_file</span>
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim()}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-all ${sending || !newMessage.trim() ? 'bg-slate-300 shadow-none' : 'bg-primary shadow-primary/30 hover:scale-105 active:scale-95'}`}
                  >
                    <span className="material-symbols-outlined">{sending ? 'sync' : 'send'}</span>
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-on-surface-variant font-medium">Select a chat to view</p>
            </div>
          )}
        </section>

        {/* Right Context Panel */}
        <section className="w-80 bg-surface-container-low flex flex-col border-l border-outline-variant/20 h-full overflow-y-auto">
          {selectedPo && (
            <>
              <div className="p-6 border-b border-outline-variant/10">
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">Case Overview</h3>
                <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">Purchase Order</p>
                    <p className="text-sm font-bold text-on-surface">PO-{selectedPo.po_num}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">Vendor</p>
                    <p className="text-sm font-bold text-on-surface underline underline-offset-4 decoration-primary/30">{selectedPo.vendor_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">Delivery Date</p>
                    <p className="text-sm font-medium text-on-surface">
                      {formatDeliveryDate(selectedPo.delivery_date)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 flex flex-col gap-3">
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Operator Controls</h3>
                
                {(threadState === 'bot_active' || threadState === 'pending') && (
                  <button 
                    onClick={handleTakeOver}
                    disabled={takingOver}
                    className="w-full py-3.5 px-4 bg-surface-container-highest/50 text-on-surface font-bold text-xs rounded-xl flex items-center justify-between group hover:bg-surface-container-highest transition-all disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">pan_tool</span>
                      {takingOver ? 'Taking over...' : 'Take Over Chat'}
                    </span>
                    <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-all">chevron_right</span>
                  </button>
                )}

                {threadState === 'human_controlled' && (
                  <button 
                    onClick={handleHandBack}
                    disabled={handingBack}
                    className="w-full py-3.5 px-4 bg-primary text-white font-bold text-xs rounded-xl flex items-center justify-between shadow-lg shadow-primary/20 hover:bg-primary-container transition-all disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">smart_toy</span>
                      {handingBack ? 'Generating context...' : 'Hand Back to Bot'}
                    </span>
                  </button>
                )}

                {(threadState === 'bot_active' || threadState === 'pending') && (
                  <button 
                    onClick={handleTakeOver}
                    disabled={takingOver}
                    className="w-full py-3.5 px-4 bg-surface-container-highest/50 text-error font-bold text-xs rounded-xl flex items-center gap-2 hover:bg-error-container transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-lg">pause_circle</span>
                    {takingOver ? 'Pausing Bot...' : 'Pause Bot Completely'}
                  </button>
                )}
                <div className="mt-4 pt-4 border-t border-outline-variant/10">
                  <button className="w-full py-3.5 px-4 bg-green-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-600/10 hover:bg-green-700 transition-all">
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    Mark Resolved
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default Chats;

/* ── Scoped styles for Compass opening message ───────────────────────────── */
const _styles = (() => {
  if (typeof document === 'undefined') return;
  const id = 'compass-opening-styles';
  if (document.getElementById(id)) return;
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `
    .compass-opening-wrap {
      margin-bottom: 0;
    }
    .compass-opening-inner {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
    }
    .compass-pin-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: #6366f1;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      padding: 3px 10px;
      border-radius: 999px;
      margin-right: 44px;
    }
    .compass-avatar {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(99,102,241,.35);
    }
    .compass-bubble {
      max-width: 72%;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }
    .compass-bubble-sender {
      font-size: 10px;
      font-weight: 800;
      color: #6366f1;
      text-transform: uppercase;
      letter-spacing: .06em;
      margin-right: 4px;
    }
    .compass-bubble-body {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: #fff;
      padding: 14px 18px;
      border-radius: 18px 4px 18px 18px;
      font-size: 13.5px;
      line-height: 1.65;
      box-shadow: 0 6px 20px rgba(99,102,241,.28);
      text-align: left;
    }
    .compass-bubble-body strong {
      font-weight: 800;
    }
    .compass-bubble-time {
      font-size: 9px;
      color: rgba(99,102,241,.55);
      font-weight: 600;
      margin-right: 4px;
    }
  `;
  document.head.appendChild(s);
})();
