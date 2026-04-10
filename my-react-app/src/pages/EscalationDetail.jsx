import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabase';

const REASON_LABELS = {
  no_response: 'No Response',
  partial_delivery: 'Partial Delivery',
  order_rejected: 'Order Rejected',
  delivery_delay: 'Delivery Delay',
  pricing_issue: 'Pricing Issue',
  payment_issue: 'Payment Issue',
  quality_issue: 'Quality Issue'
};

const ACTION_CONFIG = {
  no_response:      { primary: 'Take over chat',        secondary: 'Try alternate contact' },
  partial_delivery: { primary: 'Accept partial supply', secondary: 'Source remainder' },
  order_rejected:   { primary: 'Cancel PO',             secondary: 'Reassign vendor' },
  delivery_delay:   { primary: 'Accept new date',       secondary: 'Reject — find alternate' },
  pricing_issue:    { primary: 'Escalate to category',  secondary: 'Amend PO price' },
  payment_issue:    { primary: 'Escalate to finance',   secondary: 'Check payment status' },
  quality_issue:    { primary: 'Request replacement',   secondary: 'Cancel and reassign' },
};

const PRIORITY_COLORS = {
  critical: 'bg-red-50 text-red-600 border-red-100',
  high: 'bg-amber-50 text-amber-600 border-amber-100',
  medium: 'bg-blue-50 text-blue-600 border-blue-100',
  low: 'bg-slate-50 text-slate-600 border-slate-100'
};

const formatElapsed = (ms) => {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

const EscalationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [escalation, setEscalation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [saving, setSaving] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [noteText, setNoteText] = useState('');

  const fetchEscalation = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('escalations')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      setEscalation(data);
      setSelectedStatus(data.po_status);
      setNoteText(data.resolution_note || '');
    } catch (err) {
      console.error('Error fetching escalation:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEscalation();

    const channel = supabase
      .channel(`escalation_${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'escalations', filter: `id=eq.${id}` }, (payload) => {
        setEscalation(payload.new);
      })
      .subscribe();

    const interval = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchEscalation, id]);

  const handleSaveStatus = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('escalations')
        .update({
          po_status: selectedStatus,
          resolution_note: noteText,
          updated_at: new Date().toISOString(),
          spoc_first_action_at: escalation.spoc_first_action_at ?? new Date().toISOString(),
          spoc_name: 'Alex Rivera'
        })
        .eq('id', id);

      if (error) throw error;
      await fetchEscalation();
      alert('Status updated successfully');
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex bg-slate-50 dark:bg-slate-950 h-screen">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    </div>
  );

  if (!escalation) return (
    <div className="flex bg-slate-50 dark:bg-slate-950 h-screen">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center flex-col gap-4">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase">Escalation Not Found</h2>
        <button onClick={() => navigate('/escalations')} className="px-6 py-2 bg-slate-900 text-white rounded-xl">Back to List</button>
      </div>
    </div>
  );

  const actions = ACTION_CONFIG[escalation.escalation_reason] || ACTION_CONFIG.no_response;

  // SLA Computations
  const vElapsed = escalation.vendor_replied_at 
    ? (new Date(escalation.vendor_replied_at) - new Date(escalation.last_bot_message_at))
    : (now - new Date(escalation.last_bot_message_at));
  const vBreached = escalation.vendor_sla_applies && (vElapsed > escalation.vendor_sla_hours * 3600000);

  const oElapsed = escalation.spoc_first_action_at
    ? (new Date(escalation.spoc_first_action_at) - new Date(escalation.escalation_created_at))
    : (now - new Date(escalation.escalation_created_at));
  const oBreached = !escalation.spoc_first_action_at && (oElapsed > escalation.operator_sla_hours * 3600000);

  const renderConditionalCard = () => {
    const reason = escalation.escalation_reason;
    if (reason === 'no_response') return null;

    if (reason === 'partial_delivery') {
      const items = Array.isArray(escalation.partial_items) ? escalation.partial_items : [];
      return (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 flex items-center gap-3">
            <span className="material-symbols-outlined text-orange-500">inventory_2</span>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Partial supply details</h3>
          </div>
          <div className="p-6 overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="text-slate-400 font-black uppercase tracking-widest border-b border-slate-50 dark:border-slate-800">
                <tr>
                  <th className="text-left py-2">Item Code</th>
                  <th className="text-left py-2">Description</th>
                  <th className="text-right py-2">Ordered</th>
                  <th className="text-right py-2">Confirmed</th>
                  <th className="text-right py-2">Shortfall</th>
                  <th className="text-center py-2">UOM</th>
                  <th className="text-left py-2">Issue Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {items.map((item, idx) => {
                  const shortfall = item.ordered_qty - item.confirmed_qty;
                  return (
                    <tr key={idx}>
                      <td className="py-3 font-mono font-bold">{item.item_code}</td>
                      <td className="py-3 text-slate-600 dark:text-slate-400 font-medium">{item.description}</td>
                      <td className="py-3 text-right font-bold">{item.ordered_qty}</td>
                      <td className="py-3 text-right font-bold">{item.confirmed_qty}</td>
                      <td className={`py-3 text-right font-black ${shortfall > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {shortfall > 0 ? shortfall : 'Fulfilled'}
                      </td>
                      <td className="py-3 text-center">{item.uom}</td>
                      <td className="py-3 text-slate-400">{item.issue_reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (reason === 'order_rejected') {
      return (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500">cancel</span>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Rejection details</h3>
          </div>
          <div className="p-6">
            <div className="border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10 p-4">
              <p className="text-sm font-medium text-red-900 dark:text-red-200">{escalation.reason_detail}</p>
            </div>
          </div>
        </div>
      );
    }

    if (reason === 'delivery_delay') {
      return (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-500">schedule</span>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Delivery delay</h3>
          </div>
          <div className="p-8 flex items-center justify-around">
             <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Original Date</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{new Date(escalation.original_delivery_date).toLocaleDateString()}</p>
             </div>
             <span className="material-symbols-outlined text-3xl text-slate-200">arrow_forward</span>
             <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Revised ETA</p>
                <p className="text-lg font-bold text-amber-500">{new Date(escalation.vendor_revised_eta).toLocaleDateString()}</p>
             </div>
             <div className="h-12 w-[1px] bg-slate-100 dark:bg-slate-800" />
             <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Days Delayed</p>
                <p className="text-2xl font-black text-red-500">{escalation.delay_days} <span className="text-xs">days</span></p>
             </div>
          </div>
        </div>
      );
    }

    if (reason === 'pricing_issue') {
      const diff = escalation.vendor_quoted_price - escalation.po_unit_price;
      const diffPct = ((diff / escalation.po_unit_price) * 100).toFixed(1);
      return (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 flex items-center gap-3">
            <span className="material-symbols-outlined text-indigo-500">payments</span>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Price dispute</h3>
          </div>
          <div className="p-8 grid grid-cols-4 gap-8">
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">PO Price</p>
                <p className="text-xl font-bold">{escalation.po_unit_price} <span className="text-xs font-medium text-slate-400">{escalation.price_currency}</span></p>
             </div>
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Vendor Price</p>
                <p className={`text-xl font-bold ${escalation.vendor_quoted_price > escalation.po_unit_price ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                  {escalation.vendor_quoted_price} <span className="text-xs font-medium text-slate-400">{escalation.price_currency}</span>
                </p>
             </div>
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Difference</p>
                <p className="text-xl font-black text-red-500">+{diff.toFixed(2)}</p>
             </div>
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Impact %</p>
                <p className="text-xl font-black text-red-500">{diffPct}%</p>
             </div>
          </div>
        </div>
      );
    }

    if (reason === 'payment_issue') {
        return (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-500">account_balance_wallet</span>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Payment details</h3>
            </div>
            <div className="p-8 grid grid-cols-3 gap-8">
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Outstanding Amount</p>
                  <p className="text-2xl font-black text-emerald-600">₹{Number(escalation.outstanding_amount).toLocaleString('en-IN')}</p>
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Invoice Due Date</p>
                  <p className="text-lg font-bold">{new Date(escalation.invoice_due_date).toLocaleDateString()}</p>
                  <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-widest">
                    {Math.max(0, Math.floor((now - new Date(escalation.invoice_due_date)) / 86400000))} Days Overdue
                  </p>
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Pending Invoices</p>
                  <p className="text-2xl font-bold">{escalation.pending_invoice_count}</p>
               </div>
            </div>
          </div>
        );
      }

      if (reason === 'quality_issue') {
        return (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 flex items-center gap-3">
              <span className="material-symbols-outlined text-purple-500">verified_user</span>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Quality rejection</h3>
            </div>
            <div className="p-6">
              <div className="border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10 p-4">
                <p className="text-sm font-medium text-red-900 dark:text-red-200">{escalation.reason_detail}</p>
              </div>
            </div>
          </div>
        );
      }

      return null;
  };

  const renderTimeline = () => {
    const events = [];
    const lastBotAt = new Date(escalation.last_bot_message_at);
    const createdAt = new Date(escalation.escalation_created_at);

    // Initial event
    events.push({
      actor: 'BOT',
      text: 'Initial PO confirmation sent to vendor',
      time: new Date(lastBotAt.getTime() - 7200000), // -2h
      color: 'blue'
    });

    if (escalation.escalation_reason === 'no_response') {
      events.push({
        actor: 'BOT',
        text: 'Follow-up reminder sent — no reply received',
        time: lastBotAt,
        color: 'blue'
      });
    } else {
      events.push({
        actor: 'VENDOR',
        text: `Vendor replied with ${REASON_LABELS[escalation.escalation_reason]}`,
        time: lastBotAt,
        color: 'green'
      });
    }

    events.push({
      actor: 'SYSTEM',
      text: 'Escalation case created automatically',
      time: createdAt,
      color: 'red'
    });

    events.push({
      actor: 'SYSTEM',
      text: `Operator action SLA started · ${escalation.operator_sla_hours}h window`,
      time: createdAt,
      color: 'amber'
    });

    const oBreachTime = createdAt.getTime() + escalation.operator_sla_hours * 3600000;
    if (now > oBreachTime && !escalation.spoc_first_action_at) {
        events.push({
            actor: 'SYSTEM',
            text: 'Operator SLA breached',
            time: new Date(oBreachTime),
            color: 'red'
        });
    }

    if (!escalation.spoc_first_action_at) {
        events.push({
            actor: 'SYSTEM',
            text: 'Awaiting operator action',
            time: new Date(now),
            color: 'gray',
            italic: true
        });
    } else {
        events.push({
            actor: 'OPERATOR',
            text: `Manual action taken by ${escalation.spoc_name}`,
            time: new Date(escalation.spoc_first_action_at),
            color: 'emerald'
        });
    }

    return (
      <div className="space-y-6">
        {events.map((ev, i) => {
            let dotColor = "bg-gray-400";
            if (ev.color === 'blue') dotColor = "bg-blue-500";
            else if (ev.color === 'green') dotColor = "bg-emerald-500";
            else if (ev.color === 'red') dotColor = "bg-red-500";
            else if (ev.color === 'amber') dotColor = "bg-amber-500";
            else if (ev.color === 'emerald') dotColor = "bg-emerald-500";

            // calc gap
            let gap = null;
            if (i > 0) {
               const diff = ev.time - events[i-1].time;
               if (diff > 60000) gap = formatElapsed(diff);
            }

            return (
              <div key={i} className="relative pl-8">
                {i !== events.length - 1 && <div className="absolute left-[11px] top-6 bottom-[-24px] w-[2px] bg-slate-100 dark:bg-slate-800" />}
                <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-950 ${dotColor}`}>
                   <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
                {gap && (
                   <div className="absolute left-[-40px] top-[-10px] transform rotate-[-90deg]">
                      <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-[8px] font-black text-slate-400 rounded-full border border-slate-100 dark:border-slate-700">+{gap}</span>
                   </div>
                )}
                <div className="flex flex-col gap-1">
                   <div className="flex items-center gap-3">
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${dotColor} text-white`}>{ev.actor}</span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {ev.time.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} · {ev.time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                   </div>
                   <p className={`text-sm ${ev.italic ? 'italic text-slate-400' : 'font-medium text-slate-700 dark:text-slate-200'}`}>{ev.text}</p>
                </div>
              </div>
            );
        })}
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] dark:bg-slate-950">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header */}
        <header className="flex justify-between items-center h-16 px-8 w-full bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm z-40 shrink-0">
          <div className="flex items-center gap-4">
            <Link to="/escalations" className="text-slate-400 hover:text-blue-600 transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2" />
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Escalations /</span>
              <span className="text-lg font-black text-slate-900 dark:text-white font-mono">PO #{escalation.po_num}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/chats?po=' + escalation.po_num)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all"
            >
              View conversation
            </button>
            <button className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              {actions.secondary}
            </button>
            <button className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all">
              {actions.primary}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 no-scrollbar pb-24">
          <div className="max-w-[1600px] mx-auto w-full space-y-6">
            
            {/* Action Meta */}
            <div className="flex items-center gap-3 mb-6">
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${PRIORITY_COLORS[escalation.priority]}`}>
                  {escalation.priority}
                </span>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white`}>
                  {REASON_LABELS[escalation.escalation_reason]}
                </span>
                <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                  {escalation.po_status}
                </span>
            </div>

            {/* Top Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {/* Col 1 */}
               <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between">
                     <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">PO & Vendor Details</h3>
                     <span className="material-symbols-outlined text-slate-200">store</span>
                  </div>
                  <div className="space-y-4">
                     <div className="flex flex-col">
                        <span className="text-xl font-black text-slate-900 dark:text-white">{escalation.vendor_name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{escalation.vendor_code} · {escalation.vendor_phone}</span>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                           <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Delivery Site</p>
                           <p className="text-xs font-bold">{escalation.delivery_site}</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                           <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Doc Date</p>
                           <p className="text-xs font-bold">{new Date(escalation.document_date).toLocaleDateString()}</p>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                           <span className="text-slate-400">Fulfillment Rate</span>
                           <span className="text-blue-600">{escalation.fulfillment_rate}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                           <div className="h-full bg-blue-500 rounded-full" style={{ width: `${escalation.fulfillment_rate}%` }} />
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {escalation.pending_lines} of {escalation.total_lines} lines pending
                        </p>
                     </div>
                  </div>
               </div>

               {/* Col 2 */}
               <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 flex flex-col gap-6 relative overflow-hidden">
                  <div className="flex items-center justify-between z-10">
                     <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Dual SLA Tracker</h3>
                     <div className="flex gap-1.5 translate-y-[-2px]">
                        <span className="animate-pulse w-2 h-2 bg-emerald-500 rounded-full" />
                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Tracking Live</span>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 flex-1 z-10">
                     <div className="space-y-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Vendor SLA</p>
                        {!escalation.vendor_sla_applies ? (
                          <div className="h-24 flex items-center text-center">
                            <p className="text-xs italic text-slate-300">Not applicable for this escalation type</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                             <h4 className={`text-2xl font-black ${vBreached ? 'text-red-500' : 'text-emerald-500'}`}>
                                {formatElapsed(vElapsed)}
                             </h4>
                             <div className="space-y-1">
                                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                   <div className={`h-full ${vBreached ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (vElapsed/(escalation.vendor_sla_hours*3600000))*100)}%` }} />
                                </div>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                   {vBreached ? `Breached by ${formatElapsed(vElapsed - escalation.vendor_sla_hours*3600000)}` : `${formatElapsed(escalation.vendor_sla_hours*3600000 - vElapsed)} remaining`}
                                </p>
                             </div>
                             <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Last: {new Date(escalation.last_bot_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                             </div>
                          </div>
                        )}
                     </div>

                     <div className="absolute left-1/2 top-12 bottom-6 w-[1px] bg-slate-100 dark:bg-slate-800" />

                     <div className="space-y-4 pl-6">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Operator SLA</p>
                        <div className="space-y-3">
                           <h4 className={`text-2xl font-black ${escalation.spoc_first_action_at ? 'text-emerald-500' : oBreached ? 'text-red-500' : 'text-amber-500'}`}>
                              {formatElapsed(oElapsed)}
                           </h4>
                           <div className="space-y-1">
                              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                 <div className={`h-full ${escalation.spoc_first_action_at ? 'bg-emerald-500' : oBreached ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, (oElapsed/(escalation.operator_sla_hours*3600000))*100)}%` }} />
                              </div>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                 {escalation.spoc_first_action_at ? 'Action captured' : oBreached ? 'Breached' : 'Within window'}
                              </p>
                           </div>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              Escalated: {new Date(escalation.escalation_created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </p>
                        </div>
                     </div>
                  </div>

                  {/* Warning Banner */}
                  {(vBreached || oBreached) && (
                    <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 z-10 ${vBreached && oBreached ? 'bg-amber-50 border border-amber-100' : 'bg-red-50 border border-red-100'}`}>
                       <span className="material-symbols-outlined text-[18px] text-amber-600">warning</span>
                       <p className="text-[10px] font-bold text-amber-900 uppercase tracking-tight">
                         {vBreached && oBreached && `Both SLAs breached. Vendor unresponsive ${formatElapsed(vElapsed)}. No operator action in ${formatElapsed(oElapsed)}.`}
                         {oBreached && !vBreached && `Operator action overdue by ${formatElapsed(oElapsed - escalation.operator_sla_hours*3600000)}. No SPOC has acted.`}
                         {vBreached && !oBreached && `Vendor response overdue by ${formatElapsed(vElapsed - escalation.vendor_sla_hours*3600000)}.`}
                       </p>
                    </div>
                  )}
               </div>

               {/* Col 3 */}
               <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-6">
                  <div className="flex items-center justify-between">
                     <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Vendor Performance</h3>
                     <span className="material-symbols-outlined text-slate-200">analytics</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Fill Rate</p>
                        <p className="text-2xl font-black text-emerald-500">{escalation.fulfillment_rate}%</p>
                     </div>
                     <div className="text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Open Cases</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">3</p>
                     </div>
                  </div>
                  <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                     <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">Fill rate by category (Phase 2 preview)</p>
                     {[
                       { l: 'Chemicals', v: 82, c: 'bg-blue-500' },
                       { l: 'Supplies', v: 68, c: 'bg-orange-500' },
                       { l: 'Equipment', v: 91, c: 'bg-emerald-500' }
                     ].map(row => (
                       <div key={row.l} className="space-y-1">
                          <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                             <span className="text-slate-500">{row.l}</span>
                             <span className="text-slate-900 dark:text-white">{row.v}%</span>
                          </div>
                          <div className="w-full h-1 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                             <div className={`h-full ${row.c}`} style={{ width: `${row.v}%` }} />
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* Middle Section — Conditional Card */}
            {renderConditionalCard()}

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
               {/* Timeline (Left) */}
               <div className="lg:col-span-3 space-y-6">
                  {/* AI Summary */}
                  <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 border-l-4 border-l-blue-500">
                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-2">COMPASS AI · generated on escalation</p>
                    <p className="text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-200">{escalation.ai_summary}</p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white mb-8">Event Timeline</h3>
                    {renderTimeline()}
                  </div>
               </div>

               {/* Right Stack */}
               <div className="lg:col-span-2 space-y-6">
                  {/* Status Card */}
                  <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Update PO Status</h3>
                    <div className="space-y-4">
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">New Status</label>
                          <select 
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs py-3 px-4 focus:ring-0"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                          >
                             {['open', 'confirmed', 'partial_supply', 'short_supply', 'cancelled', 'closed'].map(s => (
                               <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
                             ))}
                          </select>
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Resolution Note</label>
                          <textarea 
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs py-3 px-4 focus:ring-0 min-h-[100px]"
                            placeholder="Describe action taken..."
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                          />
                       </div>
                       <button 
                         onClick={handleSaveStatus}
                         disabled={saving}
                         className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
                        >
                          {saving ? <div className="w-4 h-4 border-2 border-white dark:border-slate-900 border-t-transparent animate-spin rounded-full" /> : 'Save Update'}
                       </button>
                    </div>
                  </div>

                  {/* Info Card */}
                  <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white mb-6">Escalation Info</h3>
                    <div className="space-y-4">
                       <div className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-800">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reason</span>
                          <span className="text-xs font-bold">{REASON_LABELS[escalation.escalation_reason]}</span>
                       </div>
                       <div className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-800">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</span>
                          <span className="text-xs font-bold">{escalation.category}</span>
                       </div>
                       <div className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-800">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Created At</span>
                          <span className="text-xs font-bold font-mono">{new Date(escalation.escalation_created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                       </div>
                       <div className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-800">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Priority</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${PRIORITY_COLORS[escalation.priority]}`}>{escalation.priority}</span>
                       </div>
                       <div className="flex justify-between items-center py-3">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned To</span>
                          <span className={`text-xs font-bold ${!escalation.spoc_name ? 'text-amber-500 italic' : ''}`}>{escalation.spoc_name || 'Unassigned'}</span>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Bar */}
        <div className="fixed bottom-0 left-64 right-0 h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 px-8 flex items-center justify-between z-50">
           <div className="flex items-center gap-4">
              <span className="text-sm font-black text-slate-900 dark:text-white font-mono">#{escalation.po_num}</span>
              <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />
              <div className="flex flex-col">
                 <span className="text-xs font-bold">{escalation.vendor_name}</span>
                 <span className="text-[10px] font-medium text-slate-400">Delivery: {new Date(escalation.delivery_date).toLocaleDateString()}</span>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/chats?po=' + escalation.po_num)}
                className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all"
              >
                View conversation
              </button>
              <button className="px-6 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                {actions.secondary}
              </button>
              <button className="px-8 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg">
                {actions.primary}
              </button>
           </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .font-headline { font-family: 'Outfit', sans-serif; }
      `}} />
    </div>
  );
};

export default EscalationDetail;
