import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabase';
import useChatMessages from '../hooks/useChatMessages';

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
  const messagesEndRef = useRef(null);

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
        if (uniquePOs.length > 0) {
          setSelectedPo(uniquePOs[0]);
        }
      }
      setLoading(false);
    };

    fetchPOData();
  }, []);

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
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isActive ? 'bg-error-container text-on-error-container' : 'bg-surface-container-highest text-on-surface-variant'
                      }`}>
                      {isActive ? 'HIGH RISK' : 'Awaiting'}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-on-surface truncate">{po.vendor_name}</h3>
                  <p className="text-xs text-on-surface-variant mt-1 line-clamp-1">Status update check...</p>
                  {isActive && (
                    <div className="flex items-center gap-2 mt-3">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                      <span className="text-[10px] font-semibold text-primary uppercase">Live Thread</span>
                    </div>
                  )}
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
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Human Intervention Mode</span>
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
                  <div className="flex justify-center">
                    <span className="px-4 py-1 bg-surface-container-low rounded-full text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Today</span>
                  </div>

                  {chatMessages.length === 0 && !chatLoading && (
                    <div className="flex justify-center py-12">
                      <p className="text-sm text-on-surface-variant/60 italic">No messages yet for this PO.</p>
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
                    <textarea className="w-full bg-surface-container-low border-none rounded-2xl px-6 py-4 pr-12 focus:ring-2 focus:ring-primary/20 resize-none text-sm" placeholder="Type a message..." rows="1"></textarea>
                    <div className="absolute right-4 bottom-3.5 flex gap-2">
                      <button className="text-on-surface-variant/60 hover:text-primary transition-all">
                        <span className="material-symbols-outlined text-xl">attach_file</span>
                      </button>
                    </div>
                  </div>
                  <button className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all">
                    <span className="material-symbols-outlined">send</span>
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
                      {selectedPo.delivery_date ? new Date(selectedPo.delivery_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 flex flex-col gap-3">
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Operator Controls</h3>
                <button className="w-full py-3.5 px-4 bg-surface-container-highest/50 text-on-surface font-bold text-xs rounded-xl flex items-center justify-between group hover:bg-surface-container-highest transition-all">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">pan_tool</span>
                    Take Over Chat
                  </span>
                  <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-all">chevron_right</span>
                </button>
                <button className="w-full py-3.5 px-4 bg-primary text-white font-bold text-xs rounded-xl flex items-center justify-between shadow-lg shadow-primary/20 hover:bg-primary-container transition-all">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">smart_toy</span>
                    Hand Back to Bot
                  </span>
                </button>
                <button className="w-full py-3.5 px-4 bg-surface-container-highest/50 text-error font-bold text-xs rounded-xl flex items-center gap-2 hover:bg-error-container transition-all">
                  <span className="material-symbols-outlined text-lg">pause_circle</span>
                  Pause Bot Completely
                </button>
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
