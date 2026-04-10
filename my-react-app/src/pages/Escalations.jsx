import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const DD = String(d.getDate()).padStart(2, '0');
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const YYYY = d.getFullYear();
  return `${DD} ${MM} ${YYYY}`;
};

const PRIORITY_COLORS = {
  critical: 'bg-red-50 text-red-600 border-red-100',
  high: 'bg-amber-50 text-amber-600 border-amber-100',
  medium: 'bg-blue-50 text-blue-600 border-blue-100',
  low: 'bg-slate-50 text-slate-600 border-slate-100'
};

const REASON_COLORS = {
  no_response: 'bg-slate-100 text-slate-700',
  partial_delivery: 'bg-orange-50 text-orange-700',
  order_rejected: 'bg-red-50 text-red-700',
  delivery_delay: 'bg-amber-50 text-amber-700',
  pricing_issue: 'bg-indigo-50 text-indigo-700',
  payment_issue: 'bg-emerald-50 text-emerald-700',
  quality_issue: 'bg-purple-50 text-purple-700'
};

const formatElapsed = (ms) => {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

const SlaIndicator = ({ elapsed, windowHours, actedAt }) => {
  const windowMs = windowHours * 3600000;
  const isBreached = elapsed > windowMs;
  const progress = Math.min((elapsed / windowMs) * 100, 100);
  
  let color = 'bg-emerald-500';
  if (isBreached) color = 'bg-red-500';
  else if (progress > 75) color = 'bg-amber-500';

  return (
    <div className="flex flex-col gap-1 min-w-[120px]">
      <div className="flex justify-between items-center text-[10px] font-bold">
        <span className={isBreached ? 'text-red-600' : actedAt ? 'text-emerald-600' : 'text-slate-500'}>
          {actedAt ? `Acted ${formatElapsed(elapsed)} ago` : formatElapsed(elapsed)}
        </span>
        {!actedAt && <span className="text-slate-400">{windowHours}h</span>}
      </div>
      {!actedAt && (
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${color}`} 
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

const Escalations = () => {
  const navigate = useNavigate();
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [unreadCount, setUnreadCount] = useState(0);

  // Filter states
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterReason, setFilterReason] = useState('All');
  const [filterSla, setFilterSla] = useState('All');

  const fetchEscalations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('escalations')
        .select('*')
        .order('escalation_created_at', { ascending: false });
      
      if (error) throw error;
      setEscalations(data || []);
    } catch (err) {
      console.error('Error fetching escalations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEscalations();

    // fetch unread count on mount
    const fetchCount = async () => {
      const { count } = await supabase
        .from('escalations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open');
      setUnreadCount(count || 0);
    };
    fetchCount();

    // Realtime subscription for escalations list
    const channel = supabase
      .channel('escalations_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escalations' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setEscalations(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setEscalations(prev => prev.map(item => item.id === payload.new.id ? payload.new : item));
        } else if (payload.eventType === 'DELETE') {
          setEscalations(prev => prev.filter(item => item.id !== payload.old.id));
        }
      })
      .subscribe();

    // Realtime subscription for topbar badge
    const notificationChannel = supabase
      .channel('escalations-topbar-notifications')
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

    const interval = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(notificationChannel);
      clearInterval(interval);
    };
  }, [fetchEscalations]);

  const filteredData = escalations.filter(item => {
    const matchesSearch = item.po_num?.toLowerCase().includes(search.toLowerCase()) || 
                         item.vendor_name?.toLowerCase().includes(search.toLowerCase());
    const matchesPriority = filterPriority === 'All' || item.priority === filterPriority;
    const matchesReason = filterReason === 'All' || item.escalation_reason === filterReason;
    
    // SLA state logic
    const vElapsed = item.vendor_replied_at 
      ? (new Date(item.vendor_replied_at) - new Date(item.last_bot_message_at))
      : (now - new Date(item.last_bot_message_at));
    const vBreached = item.vendor_sla_applies && (vElapsed > item.vendor_sla_hours * 3600000);

    const oElapsed = item.spoc_first_action_at
      ? (new Date(item.spoc_first_action_at) - new Date(item.escalation_created_at))
      : (now - new Date(item.escalation_created_at));
    const oBreached = !item.spoc_first_action_at && (oElapsed > item.operator_sla_hours * 3600000);

    let matchesSla = true;
    if (filterSla === 'Vendor SLA breached') matchesSla = vBreached;
    else if (filterSla === 'Operator SLA breached') matchesSla = oBreached;
    else if (filterSla === 'Both breached') matchesSla = vBreached && oBreached;
    else if (filterSla === 'Within SLA') matchesSla = !vBreached && !oBreached;

    return matchesSearch && matchesPriority && matchesReason && matchesSla;
  });

  const stats = {
    totalOpen: escalations.filter(e => e.status === 'open').length,
    vendorBreached: escalations.filter(e => {
      if (!e.vendor_sla_applies || e.vendor_replied_at) return false;
      const elapsed = now - new Date(e.last_bot_message_at);
      return elapsed > e.vendor_sla_hours * 3600000;
    }).length,
    operatorBreached: escalations.filter(e => {
      if (e.spoc_first_action_at) return false;
      const elapsed = now - new Date(e.escalation_created_at);
      return elapsed > e.operator_sla_hours * 3600000;
    }).length,
    critical: escalations.filter(e => e.priority === 'critical').length,
    avgResponse: (() => {
      const acted = escalations.filter(e => e.spoc_first_action_at);
      if (acted.length === 0) return '0h 0m';
      const total = acted.reduce((sum, e) => {
        return sum + (new Date(e.spoc_first_action_at) - new Date(e.escalation_created_at));
      }, 0);
      return formatElapsed(total / acted.length);
    })()
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] dark:bg-slate-950">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="flex justify-between items-center h-16 px-8 w-full bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm z-40">
          <div className="flex items-center gap-6">
            <h1 className="text-base font-black tracking-tighter text-slate-900 dark:text-white uppercase font-headline">
              Procurement Ops
            </h1>
          </div>
          <div className="flex items-center gap-3">
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
             <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-800 dark:text-slate-200">Alex Rivera</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Ops Manager</p>
              </div>
              <img alt="User profile" className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-700 shadow-sm"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8ov37m6Ru1jtLXavUm2Wv7-q8IqttbDcSU5OJzUCKT6ZmPdV8o10Gkm2bzBBlUkUAfR7nPEInOWhBPKK0JB-n56VPQC2sJvCZVr9a9eqzujzWSusoB7Pqo3Zl5PSfDCMpzoPbo0JZh5CHcjqc7lATQ1qKELXGJ7WeD5DB3SN3FaTJ4H9VBzP_Fvv51A3UPXtSYL_rtKoK2k8LRfiEklf60DY9c3Hul2Ue3yIjaHQmSa85wLfALExg-6xFvgM8lPDR6WQOIutN4I6d" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
          <div className="max-w-[1600px] mx-auto w-full space-y-8">
            <div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white font-headline tracking-tighter uppercase leading-none">
                Escalations
              </h2>
              <p className="text-slate-500 font-medium mt-2">Manage critical exceptions and SLA-breached procurement tasks.</p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[
                { label: 'Total Escalations', value: stats.totalOpen, color: 'text-slate-900 dark:text-white' },
                { label: 'Vendor SLA Breached', value: stats.vendorBreached, color: 'text-red-500' },
                { label: 'Operator SLA Breached', value: stats.operatorBreached, color: 'text-amber-500' },
                { label: 'Critical Priority', value: stats.critical, color: 'text-red-600' },
                { label: 'Avg Operator Response', value: stats.avgResponse, color: 'text-blue-500' }
              ].map((kpi, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{kpi.label}</p>
                  <h3 className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</h3>
                </div>
              ))}
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm lg:items-end">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Search</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                  <input 
                    type="text" 
                    placeholder="PO or Vendor..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs py-2.5 pl-9 pr-4 focus:ring-2 focus:ring-blue-500/20"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Priority</label>
                <select 
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs py-2.5 px-4 focus:ring-2 focus:ring-blue-500/20"
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                >
                  <option value="All">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Reason</label>
                <select 
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs py-2.5 px-4 focus:ring-2 focus:ring-blue-500/20"
                  value={filterReason}
                  onChange={(e) => setFilterReason(e.target.value)}
                >
                  <option value="All">All Reasons</option>
                  {Object.entries(REASON_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">SLA State</label>
                <select 
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs py-2.5 px-4 focus:ring-2 focus:ring-blue-500/20"
                  value={filterSla}
                  onChange={(e) => setFilterSla(e.target.value)}
                >
                  <option value="All">All States</option>
                  <option value="Vendor SLA breached">Vendor SLA breached</option>
                  <option value="Operator SLA breached">Operator SLA breached</option>
                  <option value="Both breached">Both breached</option>
                  <option value="Within SLA">Within SLA</option>
                </select>
              </div>

              <button 
                onClick={() => { setSearch(''); setFilterPriority('All'); setFilterReason('All'); setFilterSla('All'); }}
                className="w-full h-[38px] bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Reset Filters
              </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <th className="text-left px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">PO Number</th>
                      <th className="text-left px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Vendor</th>
                      <th className="text-left px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Delivery</th>
                      <th className="text-left px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Priority</th>
                      <th className="text-left px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Reason</th>
                      <th className="text-left px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Vendor SLA</th>
                      <th className="text-left px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Operator SLA</th>
                      <th className="text-right px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {loading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={8} className="px-6 py-6"><div className="h-8 bg-slate-50 dark:bg-slate-800 rounded-lg" /></td>
                        </tr>
                      ))
                    ) : filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                          No escalations found for the current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((item) => {
                        const deliveryDate = new Date(item.delivery_date);
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        let dateColor = "text-emerald-500 font-black";
                        if (deliveryDate < today) dateColor = "text-red-500 font-black";
                        else if (deliveryDate.getTime() === today.getTime()) dateColor = "text-amber-500 font-black";

                        const vElapsed = item.vendor_replied_at 
                          ? (new Date(item.vendor_replied_at) - new Date(item.last_bot_message_at))
                          : (now - new Date(item.last_bot_message_at));
                        
                        const oElapsed = item.spoc_first_action_at
                          ? (new Date(item.spoc_first_action_at) - new Date(item.escalation_created_at))
                          : (now - new Date(item.escalation_created_at));

                        return (
                          <tr 
                            key={item.id}
                            onClick={() => navigate(`/escalations/${item.id}`)}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group"
                          >
                            <td className="px-6 py-5">
                              <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono tracking-tighter hover:underline">
                                #{item.po_num}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-900 dark:text-white">{item.vendor_name}</span>
                                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{item.vendor_code}</span>
                              </div>
                            </td>
                            <td className={`px-6 py-5 text-xs ${dateColor}`}>
                              {formatDate(item.delivery_date)}
                            </td>
                            <td className="px-6 py-5">
                              <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${PRIORITY_COLORS[item.priority]}`}>
                                {item.priority}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col gap-1">
                                <span className={`w-fit px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${REASON_COLORS[item.escalation_reason]}`}>
                                  {REASON_LABELS[item.escalation_reason]}
                                </span>
                                <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{item.reason_detail}</p>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              {item.vendor_sla_applies ? (
                                <SlaIndicator 
                                  elapsed={vElapsed} 
                                  windowHours={item.vendor_sla_hours} 
                                  actedAt={item.vendor_replied_at} 
                                />
                              ) : (
                                <span className="text-slate-300 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-6 py-5">
                              <SlaIndicator 
                                elapsed={oElapsed} 
                                windowHours={item.operator_sla_hours} 
                                actedAt={item.spoc_first_action_at} 
                              />
                            </td>
                            <td className="px-6 py-5 text-right">
                              <button className="px-4 py-1.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:opacity-80 transition-all shadow-sm">
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
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
  );
};

export default Escalations;
