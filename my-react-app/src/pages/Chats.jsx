import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabase';
import useChatMessages from '../hooks/useChatMessages';
import { computeResponseSLA, getLatestCommunicationState } from '../lib/slaUtils';
import { useSLATimer } from '../hooks/useSLATimer';

// ── Yashoda Gas Service Mock Data ───────────────────────────────────────────
const YASHODA_MOCK_DATA = {
  vendor_name: 'Yashoda Gas Service',
  messages: [
    {
      id: 'y1',
      sender_type: 'bot',
      message_text: "System (Day -7): Initial outreach message sent regarding PO 4100260367.",
      sent_at: "2026-04-07T09:00:00Z",
    },
    {
      id: 'y2',
      sender_type: 'bot',
      message_text: "System (Day -5): First reminder — PO 4100260367 delivery is approaching. Please confirm status.",
      sent_at: "2026-04-09T10:30:00Z",
    },
    {
      id: 'y3',
      sender_type: 'bot',
      message_text: "System (Day -3): Second reminder — PO 4100260367 is due in 3 days. We haven't heard from you.",
      sent_at: "2026-04-11T14:15:00Z",
    },
    {
      id: 'y4',
      sender_type: 'bot',
      message_text: "System (Day -1): Final reminder — PO 4100260367 is due tomorrow. Please confirm IMMEDIATELY.",
      sent_at: "2026-04-13T16:45:00Z",
      escalation_required: true
    }
  ]
};


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

// Format a timestamp to h:mm AM/PM (with date if not today)
const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) return timeStr;

  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`;
};

const formatDateLabel = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

const formatDeliveryDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const DD = String(d.getDate()).padStart(2, '0');
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const YYYY = d.getFullYear();
  return `${DD} ${MM} ${YYYY}`;
};

// ── Compass opening message (pinned top of every chat) ──────────────────────
const CompassOpeningMessage = ({ vendor }) => {
  if (!vendor || !vendor.pos) return null;

  // Format the PO numbers: "PO-123, PO-456"
  const poListStr = vendor.pos.map(p => p.po_num).join(', ');

  return (
    <div className="compass-opening-wrap" style={{ marginBottom: '24px' }}>
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
                I'm tracking the deliveries for <strong>{vendor.vendor_name}</strong> 
                {vendor.pos.length > 1 ? (
                  <> across multiple orders: <strong>{poListStr}</strong>.</>
                ) : (
                  <> regarding order: <strong>{vendor.pos[0]?.po_num}</strong>.</>
                )}
              </p>
              <p style={{ marginTop: '8px' }}>Will you be able to deliver these on time? ✅</p>
            </div>
            <p className="compass-bubble-time">System Message</p>
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
            <span className="text-[10px] font-bold text-on-surface-variant ml-2 uppercase">Vendor</span>
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
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0 text-white font-bold text-[10px]">RK</div>
          <div className="flex flex-col items-end gap-1 max-w-[70%]">
            <span className="text-[10px] font-bold text-primary mr-2 uppercase">Ramesh Kumar (Admin)</span>
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
          <span className="text-[10px] font-bold text-on-surface-variant mr-2 uppercase">Bot</span>
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
  // Validation for backend URL
  useEffect(() => {
    const backendUrl = import.meta.env.VITE_VENDOR_BACKEND_URL;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (!backendUrl) {
      console.error('❌ VITE_VENDOR_BACKEND_URL is not defined in environment variables.');
    } else if (!isLocal && backendUrl.includes('localhost')) {
      console.warn(`🚨 WARNING: Your app is running at ${window.location.hostname} but pointing to a local backend: ${backendUrl}. This will likely fail for other users.`);
    }
  }, []);

  const [vendorData, setVendorData] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messagesByVendor, setMessagesByVendor] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [threadState, setThreadState] = useState('bot_active');
  const [takingOver, setTakingOver] = useState(false);
  const [handingBack, setHandingBack] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const tick = useSLATimer();
  const messagesEndRef = useRef(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Fetch chat messages for selected vendor using the custom hook
  const {
    messages: chatMessages,
    loading: chatLoading,
    error: chatError,
  } = useChatMessages(selectedVendor?.vendor_phone);

  // Auto scroll when messages change
  useEffect(() => {
    if (chatMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    const fetchVendorData = async () => {
      const { data, error } = await supabase
        .from('selected_open_po_line_items')
        .select('*');

      if (!error && data) {
        // Group by vendor name
        const vendors = {};
        data.forEach(item => {
          const vendorName = item.vendor_name || 'Unknown Vendor';
          if (!vendors[vendorName]) {
            vendors[vendorName] = {
              vendor_name: vendorName,
              vendor_phone: item.vendor_phone || '',
              vendor_code: item.vendor_code,
              pos: [item]
            };
          } else {
            vendors[vendorName].pos.push(item);
          }
        });
        
        const vendorList = Object.values(vendors).map(v => {
          if (v.vendor_name === YASHODA_MOCK_DATA.vendor_name) {
            return { ...v, ...YASHODA_MOCK_DATA };
          }
          return v;
        });
        setVendorData(vendorList);

        // Fetch chat messages for all vendors
        const vendorNames = vendorList.map(v => v.vendor_name);

        const { data: allMessages } = await supabase
          .from('chat_history')
          .select('vendor_phone, sender_type, sent_at, communication_state')
          .in('vendor_phone', vendorNames.map(name => 
            vendorList.find(v => v.vendor_name === name)?.vendor_phone
          ).filter(Boolean))
          .order('sent_at', { ascending: true });

        const grouped = {};
        allMessages?.forEach(msg => {
          const vendor = vendorList.find(v => v.vendor_phone === msg.vendor_phone);
          const vendorName = vendor?.vendor_name || 'Unknown';
          if (!grouped[vendorName]) grouped[vendorName] = [];
          grouped[vendorName].push(msg);
        });

        setMessagesByVendor(grouped);

        // Selection logic: check URL param first, then default to first vendor
        const requestedPo = searchParams.get('po');
        let initialVendor = null;
        if (requestedPo) {
          initialVendor = vendorList.find(v => v.pos.some(p => p.po_num === requestedPo));
        }
        setSelectedVendor(initialVendor || (vendorList.length > 0 ? vendorList[0] : null));
      }
      setLoading(false);
    };

    fetchVendorData();

    // fetch unread count on mount
    const fetchCount = async () => {
      const { count } = await supabase
        .from('escalations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open');
      setUnreadCount(count || 0);
    };
    fetchCount();

    // Realtime subscription for topbar badge
    const notificationChannel = supabase
      .channel('chats-topbar-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'escalations'
      }, () => {
        setUnreadCount(prev => prev + 1);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'escalations',
        filter: 'status=eq.resolved'
      }, () => {
        setUnreadCount(prev => Math.max(0, prev - 1));
      })
      .subscribe();

    // Subscribe to all chat history changes to keep sidebar live
    const globalChannel = supabase
      .channel('global-chat-history')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_history' },
        (payload) => {
          const msg = payload.new;
          setMessagesByVendor(prev => {
            const vendor = vendorData.find(v => v.vendor_phone === msg.vendor_phone);
            const vendorName = vendor?.vendor_name || 'Unknown';
            const current = prev[vendorName] || [];
            return {
              ...prev,
              [vendorName]: [...current, msg]
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
      supabase.removeChannel(notificationChannel);
    };
  }, [searchParams]);

  // Fetch thread_state when selected Vendor changes
  useEffect(() => {
    if (!selectedVendor?.pos?.length) return;

    // We check the first PO as a representative for the thread state
    // In a mature multi-PO system, we might have a vendor-level thread_state
    const mainPo = selectedVendor.pos[0].po_num;

    const fetchThreadState = async () => {
      const { data, error } = await supabase
        .from('selected_open_po_line_items')
        .select('thread_state')
        .eq('po_num', mainPo)
        .maybeSingle();

      if (data) {
        setThreadState(data.thread_state || 'bot_active');
      }
    };

    fetchThreadState();
  }, [selectedVendor?.vendor_phone]);

  // Real-time thread_state subscription
  useEffect(() => {
    if (!selectedVendor?.pos?.length) return;
    
    const channels = [];
    
    selectedVendor.pos.forEach(po => {
      const channel = supabase
        .channel(`thread-state-${po.po_num}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'selected_open_po_line_items',
            filter: `po_num=eq.${po.po_num}`
          },
          (payload) => {
            if (payload.new.thread_state) {
              setThreadState(payload.new.thread_state);
            }
          }
        )
        .subscribe();
      
      channels.push(channel);
    });

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [selectedVendor?.vendor_phone]);

  const handleTakeOver = async () => {
    if (!selectedVendor?.pos?.length) return;
    setTakingOver(true);
    const mainPo = selectedVendor.pos[0].po_num;

    try {
      const res = await fetch(`${import.meta.env.VITE_VENDOR_BACKEND_URL}/api/takeover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_num: mainPo,
          operator_name: 'Alex Rivera'
        })
      });

      if (!res.ok) throw new Error(`Takeover failed: ${res.status}`);
      
      setThreadState('human_controlled');
    } catch (err) {
      console.error('Takeover failed:', err);
      alert('Takeover failed. Check backend connection.');
    } finally {
      setTakingOver(false);
    }
  };

  const handleHandBack = async () => {
    if (!selectedVendor?.pos?.length) return;
    setHandingBack(true);
    const mainPo = selectedVendor.pos[0].po_num;

    try {
      const res = await fetch(`${import.meta.env.VITE_VENDOR_BACKEND_URL}/api/handback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_num: mainPo,
          operator_name: 'Alex Rivera'
        })
      });

      if (!res.ok) throw new Error(`Hand back failed: ${res.status}`);
      
      setThreadState('bot_active');
    } catch (err) {
      console.error('Hand back failed:', err);
      alert('Hand back failed.');
    } finally {
      setHandingBack(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedVendor || sending) return;
    
    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage(''); 

    try {
      const res = await fetch(`${import.meta.env.VITE_VENDOR_BACKEND_URL}/api/chat-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_id: selectedVendor.pos[0].po_num, // Targeted at the main PO for back-compat
          sender_type: 'operator',
          sender_label: 'Compass Procurement Team',
          message_text: messageText,
          vendor_phone: selectedVendor.vendor_phone,
          supplier_name: selectedVendor.vendor_name,
          intent: null,
          escalate: false
        })
      });

      if (!res.ok) throw new Error(`Send failed: ${res.status}`);
    } catch (err) {
      console.error('Error sending message:', err);
      setNewMessage(messageText);
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
      vendorData.forEach(vendor => {
        const messages = messagesByVendor[vendor.vendor_name] || [];
        const sla = computeResponseSLA(messages, 0.5);
        if (sla && sla.breached) {
          // coordinate auto-escalation for the main active PO
          const mainPo = vendor.pos[0];
          escalatePO(mainPo, sla);
        }
      });
    };

    const interval = setInterval(checkBreaches, 10000);
    return () => clearInterval(interval);
  }, [vendorData, messagesByVendor]);

  // Bot escalation sync watcher
  useEffect(() => {
    if (!selectedVendor?.pos?.length) return;
    const mainPo = selectedVendor.pos[0];
    const vendorName = selectedVendor.vendor_name;

    const messages = messagesByVendor[vendorName] || [];
    const latestBotMsg = [...messages].reverse().find(m => m.sender_type === 'bot' || m.sender_type === 'assistant');

    if (latestBotMsg && latestBotMsg.escalate === true && threadState !== 'escalated') {
      const syncEscalation = async () => {
        try {
          // 1. Update PO thread_state to escalated
          await supabase
            .from('selected_open_po_line_items')
            .update({ thread_state: 'escalated' })
            .eq('po_num', mainPo.po_num);

          // 2. Ensure record exists in escalations table
          const { data: existing } = await supabase
            .from('escalations')
            .select('id')
            .eq('po_num', mainPo.po_num)
            .eq('status', 'open')
            .maybeSingle();

          if (!existing) {
            const reasonMap = {
              'PARTIAL': 'partial_delivery',
              'DELAY': 'delivery_delay',
              'REJECTED': 'order_rejected',
              'PRICING': 'pricing_issue'
            };
            
            await supabase
              .from('escalations')
              .insert([{
                po_num: mainPo.po_num,
                vendor_code: mainPo.vendor_code,
                vendor_name: mainPo.vendor_name,
                delivery_site: mainPo.delivery_site || 'TBD',
                delivery_date: mainPo.delivery_date,
                escalation_reason: reasonMap[latestBotMsg.intent] || 'other',
                reason_detail: latestBotMsg.message_text,
                priority: latestBotMsg.intent === 'REJECTED' ? 'critical' : 'high',
                status: 'open',
                escalation_created_at: new Date().toISOString(),
                ai_summary: latestBotMsg.admin_message || latestBotMsg.message_text
              }]);
          }

          setThreadState('escalated');
        } catch (err) {
          console.error('Failed to sync bot escalation:', err);
        }
      };

      syncEscalation();
    }
  }, [selectedVendor, messagesByVendor, threadState]);

  return (
    <div className="flex h-screen overflow-hidden bg-background max-h-screen">
      <Sidebar />
      <main className="flex-1 flex overflow-hidden w-full">
        {/* Vendor List Sidebar */}
        <section className="w-80 flex flex-col bg-surface-container-low border-r border-outline-variant/20 h-full">
          <div className="p-6 flex-shrink-0">
            <h2 className="text-xl font-bold text-on-surface mb-4">Vendor Chats</h2>
            <div className="relative">
              <input className="w-full bg-surface-container-lowest border-none rounded-lg text-sm px-10 py-2.5 focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/50" placeholder="Search Vendors..." type="text" />
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant/50 text-sm">search</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 space-y-2 no-scrollbar pb-4">
            {loading ? (
              <div className="p-4 text-center text-on-surface-variant text-sm font-bold">Loading chats...</div>
            ) : vendorData.map((vendor) => {
              const vendorName = vendor.vendor_name;
              const isActive = selectedVendor?.vendor_name === vendorName;
              return (
                <div
                  key={vendorName}
                  onClick={() => setSelectedVendor(vendor)}
                  className={`p-4 rounded-xl cursor-pointer transition-all ${isActive
                    ? 'bg-surface-container-lowest border-l-4 border-primary shadow-sm group'
                    : 'hover:bg-surface-container-highest/30 border-l-4 border-transparent'
                    }`}
                >
                  <h3 className="font-bold text-sm text-on-surface truncate">{vendor.vendor_name}</h3>
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest mt-0.5">
                    {vendor.pos.length} {vendor.pos.length === 1 ? 'Active PO' : 'Active POs'}
                  </p>
                  
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
                      state={getLatestCommunicationState(messagesByVendor[vendorName] || [])}
                    />

                    {/* right: SLA timer — only show if vendor hasn't replied yet */}
                    {(() => {
                      const sla = computeResponseSLA(messagesByVendor[vendorName] || [], 0.5)
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
          {selectedVendor ? (
            <>
              <header className="h-16 flex items-center justify-between px-8 border-b border-outline-variant/10 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-lg bg-surface-variant flex items-center justify-center font-bold text-on-surface-variant text-lg">
                      {selectedVendor.vendor_name.charAt(0)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-on-surface">{selectedVendor.vendor_name}</h2>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${threadState === 'human_controlled' ? 'bg-blue-500' : 'bg-primary'}`}></span>
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                        {threadState === 'human_controlled' ? 'Human Intervention Mode' : 'AI Assistant Active'}
                      </span>
                    </div>
                  </div>
                </div>

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
                  className="hover:bg-slate-50 transition-colors"
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

                  {/* ── Compass opening message (pinned top) ── */}
                  <CompassOpeningMessage vendor={selectedVendor} />

                  {/* ── Chat Messages with Date Dividers ── */}
                  {(() => {
                    const messages = selectedVendor.messages || chatMessages;
                    let lastDate = null;
                    
                    return messages.map((msg) => {
                      const msgDate = new Date(msg.sent_at).toDateString();
                      const showDivider = msgDate !== lastDate;
                      lastDate = msgDate;
                      
                      return (
                        <React.Fragment key={msg.id}>
                          {showDivider && (
                            <div className="flex justify-center my-6">
                              <span className="px-4 py-1 bg-surface-container-low rounded-full text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                                {formatDateLabel(msg.sent_at)}
                              </span>
                            </div>
                          )}
                          <ChatBubble message={msg} />
                        </React.Fragment>
                      );
                    });
                  })()}

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
          {selectedVendor && (
            <>
              <div className="p-6 border-b border-outline-variant/10">
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">Vendor Context</h3>
                <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm space-y-5">
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Entity Name</p>
                    <p className="text-sm font-bold text-on-surface">{selectedVendor.vendor_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Vendor Code</p>
                    <p className="text-sm font-bold text-primary">{selectedVendor.vendor_code}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Contact Details</p>
                    <p className="text-sm font-medium text-on-surface">{selectedVendor.vendor_phone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Associated Orders</p>
                    <div className="flex flex-wrap gap-2">
                       {selectedVendor.pos.map(p => (
                         <span key={p.po_num} className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200">
                           {p.po_num}
                         </span>
                       ))}
                    </div>
                  </div>
                </div>
              </div>


              <div className="p-6 flex flex-col gap-3">
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Operator Controls</h3>
                
                {(threadState === 'bot_active' || threadState === 'pending' || threadState === 'escalated') && (
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
                      {handingBack ? 'Handing back...' : 'Hand Back to Bot'}
                    </span>
                  </button>
                )}
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
