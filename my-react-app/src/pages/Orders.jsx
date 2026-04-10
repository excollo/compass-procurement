import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabase';
import { computeResponseSLA } from '../lib/slaUtils';
import { useSLATimer } from '../hooks/useSLATimer';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const DD = String(d.getDate()).padStart(2, '0');
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const YYYY = d.getFullYear();
  return `${DD} ${MM} ${YYYY}`;
};

const convertToInputDate = (dateStr) => {
  if (!dateStr) return '';
  const normalized = dateStr.replace(/[\.\/]/g, '-');
  const parts = normalized.split('-');
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  const d = new Date(normalized);
  if (!isNaN(d)) {
    return d.toISOString().split('T')[0];
  }
  return '';
};

const COMM_STATES = [
  { value: 'pending', label: 'Pending', bg: 'bg-[#F1F5F9]', text: 'text-[#64748B]' },
  { value: 'contacted', label: 'Contacted', bg: 'bg-[#DBEAFE]', text: 'text-[#1D4ED8]' },
  { value: 'confirmed', label: 'Confirmed', bg: 'bg-[#DCFCE7]', text: 'text-[#15803D]' },
  { value: 'at_risk', label: 'At Risk', bg: 'bg-[#FEF9C3]', text: 'text-[#A16207]' },
  { value: 'escalated', label: 'Escalated', bg: 'bg-[#FFEDD5]', text: 'text-[#C2410C]' },
  { value: 'human_controlled', label: 'Human Controlled', bg: 'bg-[#FEE2E2]', text: 'text-[#B91C1C]' },
  { value: 'resolved', label: 'Resolved', bg: 'bg-[#CCFBF1]', text: 'text-[#0F766E]' },
  { value: 'unresponsive', label: 'Unresponsive', bg: 'bg-[#FCE7F3]', text: 'text-[#9D174D]' }
];

const getCommState = (val) => COMM_STATES.find(s => s.value === (val || '').toLowerCase()) || COMM_STATES[0];

const Orders = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messagesByPO, setMessagesByPO] = useState({});
  const tick = useSLATimer();
  const [searchTerm, setSearchTerm] = useState('');
  const [localEdits, setLocalEdits] = useState({});
  const [updatingPo, setUpdatingPo] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Filter states
  const [filterVendor, setFilterVendor] = useState('All Vendors');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterCommStates, setFilterCommStates] = useState([]);
  const [commDropdownOpen, setCommDropdownOpen] = useState(false);

  const toggleCommState = (val) => {
    setFilterCommStates(prev => 
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
    setCurrentPage(1);
  };

  // Effect to handle incoming vendor filter from navigation state
  useEffect(() => {
    if (location.state?.vendorFilter) {
      setFilterVendor(location.state.vendorFilter);
      setCurrentPage(1);
    }
  }, [location.state]);

  useEffect(() => {
    fetchOrders();

    // fetch unread count on mount
    const fetchCount = async () => {
      const { count } = await supabase
        .from('escalations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open');
      setUnreadCount(count || 0);
    };
    fetchCount();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      let allData = [];
      let limit = 1000;
      let from = 0;
      let fetchMore = true;

      while (fetchMore) {
        const { data, error } = await supabase
          .from('open_po_detail')
          .select('*')
          .range(from, from + limit - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += limit;
        }
        
        if (!data || data.length < limit) {
          fetchMore = false;
        }
      }

      const RANDOM_STATES = ['pending','contacted','confirmed','at_risk','escalated','human_controlled','resolved','unresponsive'];

      const uniquePOs = [];
      const seenPOs = new Set();
      for (const item of allData) {
        if (!seenPOs.has(item.po_num)) {
          seenPOs.add(item.po_num);
          // Seed random by po_num so state is stable per row
          if (!item.communication_state) {
            const seed = String(item.po_num).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
            item.communication_state = RANDOM_STATES[seed % RANDOM_STATES.length];
          }
          uniquePOs.push(item);
        }
      }

      setOrders(uniquePOs);

      // Fetch chat messages for all POs
      const poNums = uniquePOs.map(o => o.po_num);

      const { data: allMessages } = await supabase
        .from('chat_history')
        .select('po_num, sender_type, sent_at')
        .in('po_num', poNums);

      const grouped = {};
      allMessages?.forEach(msg => {
        if (!grouped[msg.po_num]) grouped[msg.po_num] = [];
        grouped[msg.po_num].push(msg);
      });

      setMessagesByPO(grouped);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePO = async (po_num) => {
    const edit = localEdits[po_num];
    if (!edit) return;
    
    try {
      setUpdatingPo(po_num);
      
      // Update both tables for data integrity
      const { error: err1 } = await supabase
        .from('open_po_detail')
        .update({ 
          status: edit.status, 
          delivery_date: edit.delivery_date 
        })
        .eq('po_num', po_num);

      if (err1) throw err1;

      const { error: err2 } = await supabase
        .from('selected_open_po_line_items')
        .update({ 
          status: edit.status, 
          delivery_date: edit.delivery_date 
        })
        .eq('po_num', po_num);

      if (err2) throw err2;

      // Update local master list
      setOrders(prev => prev.map(o => o.po_num === po_num ? { ...o, ...edit } : o));
      
      // Clear edit state
      const newEdits = { ...localEdits };
      delete newEdits[po_num];
      setLocalEdits(newEdits);
      
      alert(`PO #${po_num} updated successfully.`);
    } catch (err) {
      console.error('Update failed:', err);
      alert('Failed to update PO: ' + err.message);
    } finally {
      setUpdatingPo(null);
    }
  };

  const handleLocalChange = (po_num, field, value) => {
    const po = orders.find(o => o.po_num === po_num);
    setLocalEdits(prev => ({
      ...prev,
      [po_num]: {
        ...(prev[po_num] || { status: po.status, delivery_date: po.delivery_date }),
        [field]: value
      }
    }));
  };

  useEffect(() => {
    // Subscribe to all chat history changes to keep table live
    const globalChannel = supabase
      .channel('orders-chat-realtime')
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
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('orders-notifications')
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

    return () => supabase.removeChannel(channel);
  }, []);

  const vendorsList = ['All Vendors', ...new Set(orders.map(o => o.vendor_name).filter(Boolean))];

  const filteredOrders = orders.filter(po => {
    const matchesSearch = (po.po_num?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        (po.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesVendor = filterVendor === 'All Vendors' || po.vendor_name === filterVendor;
    
    let matchesDate = true;
    if (filterDateFrom && po.po_date) {
      matchesDate = matchesDate && (new Date(po.po_date) >= new Date(filterDateFrom));
    }
    if (filterDateTo && po.po_date) {
      matchesDate = matchesDate && (new Date(po.po_date) <= new Date(filterDateTo));
    }

    const commStateVal = (po.communication_state || 'pending').toLowerCase();
    const matchesCommState = filterCommStates.length === 0 || filterCommStates.includes(commStateVal);

    return matchesSearch && matchesVendor && matchesDate && matchesCommState;
  });

  const today = new Date();
  today.setHours(0,0,0,0);

  const stats = filteredOrders.reduce((acc, po) => {
    acc.total++;
    
    if (po.delivery_date) {
      const etd = new Date(po.delivery_date);
      etd.setHours(0,0,0,0);
      const diffTime = etd - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 3) {
        acc.dueWithin3Days++;
      }
    }
    
    const status = po.status?.toLowerCase() || '';
    const commState = po.communication_state?.toLowerCase() || '';
    
    if (status === 'at_risk' || status === 'at-risk' || commState === 'exception_detected') {
      acc.atRisk++;
    }
    
    if (computeResponseSLA(messagesByPO[po.po_num] || [], 0.5) !== null) {
      acc.awaitingResponse++;
    }
    
    return acc;
  }, { total: 0, dueWithin3Days: 0, atRisk: 0, awaitingResponse: 0 });

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="flex justify-between items-center h-16 px-8 w-full bg-white dark:bg-slate-900 border-b border-outline-variant/10 shadow-sm z-10">
          <div className="flex items-center gap-8">
            <h1 className="text-lg font-bold tracking-tighter text-slate-900 dark:text-slate-100 font-headline uppercase leading-none">Procurement Ops</h1>
            <div className="relative group">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <span className="material-symbols-outlined text-sm transition-colors group-focus-within:text-primary">search</span>
              </span>
              <input 
                className="bg-slate-50 dark:bg-slate-800 border-none rounded-full pl-10 pr-4 py-1.5 text-sm w-80 focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-slate-400" 
                placeholder="Search PO number or Vendor..." 
                type="text" 
                value={searchTerm}
                onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
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
            <img alt="Profile" className="w-8 h-8 rounded-full border-2 border-primary/20 shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBpRZ82Z9vlt8SyVdsbUz4q-XFlmZojEzyvWp90xVibsAElJPHW_meJckQWZJtoPzP5MJhSZLiW07y47QlgPdvId2zdjsImRevGIZD_iKx2C2yIoMsdsI26776buMmB2IZw_TcFkmbdrXj5d5ipKaIrZOei16-LsfiINHvvt43OGveovU-XUhhNDvQdJjJm6NRCjPfa6TU13zSUWI7Y-x_kXNhBC3H4m_Bn1Y5HZHFACgA_5nb0ORR6Upj4N-Mxe3xekbptlc3YMSes" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-slate-950 p-8 no-scrollbar">
          <div className="max-w-6xl mx-auto w-full">
            <div className="flex justify-between items-end mb-8">
              <div className="space-y-1">
                <h2 className="text-4xl font-black text-slate-900 dark:text-white font-headline tracking-tighter uppercase leading-none">Purchase Order</h2>
                <p className="text-slate-500 font-medium tracking-tight">Real-time inventory synchronization for open purchase orders.</p>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.25rem] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.02)] hover:-translate-y-0.5 transition-all cursor-default border border-slate-100 dark:border-slate-800 flex flex-col justify-between h-[120px]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-slate-900">
                    <span className="material-symbols-outlined text-[18px] text-white">receipt_long</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-500">Total Open POs</span>
                </div>
                <div>
                  <h3 className="text-[32px] font-black leading-none text-slate-900 dark:text-white">{stats.total}</h3>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.25rem] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.02)] hover:-translate-y-0.5 transition-all cursor-default border border-slate-100 dark:border-slate-800 flex flex-col justify-between h-[120px]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-slate-900">
                    <span className="material-symbols-outlined text-[18px] text-white">event</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-500">Due Within 3 Days</span>
                </div>
                <div>
                  <h3 className="text-[32px] font-black leading-none text-slate-900 dark:text-white">{stats.dueWithin3Days}</h3>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.25rem] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.02)] hover:-translate-y-0.5 transition-all cursor-default border border-slate-100 dark:border-slate-800 flex flex-col justify-between h-[120px]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-slate-900">
                    <span className="material-symbols-outlined text-[18px] text-white">warning</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-500">At-Risk POs</span>
                </div>
                <div>
                  <h3 className="text-[32px] font-black leading-none text-slate-900 dark:text-white">{stats.atRisk}</h3>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.25rem] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.02)] hover:-translate-y-0.5 transition-all cursor-default border border-slate-100 dark:border-slate-800 flex flex-col justify-between h-[120px]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-slate-900">
                    <span className="material-symbols-outlined text-[18px] text-white">forum</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-500">Awaiting Response</span>
                </div>
                <div>
                  <h3 className="text-[32px] font-black leading-none text-slate-900 dark:text-white">{stats.awaitingResponse}</h3>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-6 gap-4 mb-8 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm relative">
              <div className="space-y-1.5 col-span-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-label">Search Partners</label>
                <select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs py-3 px-4 focus:ring-0 cursor-pointer" value={filterVendor} onChange={(e) => {setFilterVendor(e.target.value); setCurrentPage(1);}}>
                  {vendorsList.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 col-span-1 relative">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-label">Communication State</label>
                <div 
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs py-3 px-4 focus:ring-0 cursor-pointer flex justify-between items-center h-[40px]"
                    onClick={() => setCommDropdownOpen(!commDropdownOpen)}
                >
                    <span className="truncate">
                        {filterCommStates.length === 0 ? 'All States' : `${filterCommStates.length} Selected`}
                    </span>
                    <span className="material-symbols-outlined text-[16px] text-slate-400">arrow_drop_down</span>
                </div>
                {commDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setCommDropdownOpen(false)}></div>
                      <div className="absolute top-[100%] mt-2 left-0 w-56 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xl rounded-xl p-2 z-50 max-h-64 overflow-y-auto">
                          {COMM_STATES.map(s => (
                              <label key={s.value} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer rounded-lg">
                                  <input 
                                      type="checkbox" 
                                      checked={filterCommStates.includes(s.value)}
                                      onChange={() => toggleCommState(s.value)}
                                      className="rounded text-primary focus:ring-0 border-slate-300 w-4 h-4"
                                  />
                                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{s.label}</span>
                              </label>
                          ))}
                      </div>
                    </>
                )}
              </div>
              <div className="space-y-1.5 col-span-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-label">Timeline Start</label>
                <input className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs py-3 px-4 focus:ring-0 h-[40px]" type="date" value={filterDateFrom} onChange={(e) => {setFilterDateFrom(e.target.value); setCurrentPage(1);}} />
              </div>
              <div className="space-y-1.5 col-span-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-label">Timeline End</label>
                <input className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs py-3 px-4 focus:ring-0 h-[40px]" type="date" value={filterDateTo} onChange={(e) => {setFilterDateTo(e.target.value); setCurrentPage(1);}} />
              </div>
              <div className="flex items-end col-span-2">
                <button onClick={() => {setFilterVendor('All Vendors'); setFilterDateFrom(''); setFilterDateTo(''); setSearchTerm(''); setFilterCommStates([]); setCurrentPage(1); setCommDropdownOpen(false);}} className="w-full h-[40px] bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all">Reset Analysis Filters</button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-x-auto">
              <table className="w-full border-collapse min-w-[1000px]">
                <thead className="bg-[#F8FAFC]/50 dark:bg-slate-800/10 border-b border-slate-50 dark:border-slate-800">
                  <tr>
                    <th className="text-left px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">PO Number</th>
                    {/* <th className="text-left px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Line</th> */}
                    <th className="text-left px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Supplier Entity</th>
                    {/* <th className="text-left px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Item Description</th>
                    <th className="text-right px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Qty Ordered</th>
                    <th className="text-right px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Qty Received</th> */}
                    <th className="text-left px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Delivery ETD</th>
                    <th className="text-center px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">PO Status</th>
                    <th className="text-center px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Communication State</th>
                    <th className="text-left px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Response SLA</th>
                    <th className="text-center px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {loading ? (
                    [...Array(10)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={5} className="px-6 py-4"><div className="h-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg"></div></td></tr>)
                  ) : error ? (
                    <tr><td colSpan={5} className="px-6 py-16 text-center text-red-500 font-black uppercase tracking-widest text-xs">{error}</td></tr>
                  ) : paginatedOrders.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No document telemetry found for this context.</td></tr>
                  ) : (
                    paginatedOrders.map((po, idx) => {
                      const currentEdit = localEdits[po.po_num];
                      const displayDate = currentEdit ? currentEdit.delivery_date : po.delivery_date;
                      const displayStatus = currentEdit ? currentEdit.status : (po.status || 'Open');

                      let etdColor = "text-slate-500 font-medium";
                      if (displayDate) {
                        const etd = new Date(displayDate);
                        etd.setHours(0,0,0,0);
                        const diffTime = etd - today;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays < 0) {
                          etdColor = "text-red-500 font-black";
                        } else if (diffDays <= 3) {
                          etdColor = "text-amber-500 font-black";
                        } else {
                          etdColor = "text-emerald-500 font-black";
                        }
                      }

                      const statusStr = displayStatus;
                      let statusBadge = "bg-slate-100 text-slate-500";
                      if (statusStr.toLowerCase() === 'confirmed') statusBadge = "bg-emerald-50 text-emerald-600 border-emerald-100";
                      else if (statusStr.toLowerCase() === 'at_risk' || statusStr.toLowerCase() === 'at-risk') statusBadge = "bg-amber-50 text-amber-600 border-amber-100";
                      else if (statusStr.toLowerCase() === 'cancelled') statusBadge = "bg-red-50 text-red-600 border-red-100";
                      
                      const cState = getCommState(po.communication_state);

                      return (
                        <tr 
                          key={po.po_num + '-' + idx} 
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/5 transition-all cursor-pointer group border-l-4 border-transparent hover:border-primary active:bg-slate-100"
                        >
                          <td className="px-6 py-4" onClick={() => navigate('/orders/' + po.po_num)}>
                               <Link 
                                  to={`/orders/${po.po_num}`} 
                                  className="text-sm font-black text-slate-900 dark:text-white tracking-widest hover:text-primary transition-colors underline decoration-2 underline-offset-4 decoration-primary/20 hover:decoration-primary"
                                  onClick={(e) => e.stopPropagation()}
                               >
                                   #{po.po_num}
                               </Link>
                          </td>
                          <td className="px-6 py-4" onClick={() => navigate('/orders/' + po.po_num)}>
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-slate-700 dark:text-slate-200 tracking-tight">{po.vendor_name}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Verified Partner</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="relative flex items-center gap-2 group/date max-w-fit cursor-pointer">
                              <input 
                                type="date"
                                value={convertToInputDate(displayDate)}
                                onChange={(e) => handleLocalChange(po.po_num, 'delivery_date', e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className={`bg-transparent border-none p-0 text-xs italic cursor-pointer focus:ring-0 z-10 ${etdColor} group-hover/date:underline [color-scheme:light] appearance-none`}
                                style={{ WebkitAppearance: 'none' }}
                              />
                              <span className="material-symbols-outlined text-sm text-slate-300 group-hover/date:text-primary transition-colors" onClick={(e) => {
                                e.stopPropagation();
                                const input = e.currentTarget.parentElement.querySelector('input');
                                if (input.showPicker) input.showPicker();
                              }}>calendar_month</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="relative inline-block group/status">
                              <select 
                                value={displayStatus}
                                onChange={(e) => handleLocalChange(po.po_num, 'status', e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className={`px-3 py-1 pr-6 rounded-lg text-[9px] font-black uppercase tracking-widest border focus:ring-2 focus:ring-primary/20 appearance-none text-center cursor-pointer transition-all ${statusBadge}`}
                              >
                                <option value="Open">Open</option>
                                <option value="Confirmed">Confirmed</option>
                                <option value="Partial">Partial</option>
                                <option value="Fulfilled">Fulfilled</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                              <span className="material-symbols-outlined text-[14px] absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-70">arrow_drop_down</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center" onClick={() => navigate('/orders/' + po.po_num)}>
                              <span className={`px-2.5 py-1 rounded-[6px] text-[11px] font-medium inline-flex items-center justify-center whitespace-nowrap ${cState.bg} ${cState.text}`}>
                                  {cState.label}
                              </span>
                          </td>
                          {(() => {
                            const sla = computeResponseSLA(messagesByPO[po.po_num] || [], 0.5)

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
                              <td className="px-6 py-4">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color }}>
                                      {sla.label}
                                      <span style={{ opacity: 0.5, fontWeight: 500, fontSize: '11px' }}> / {sla.windowLabel}</span>
                                      {' '}elapsed
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
                          <td className="px-6 py-4 text-center">
                            {currentEdit ? (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleUpdatePO(po.po_num); }}
                                disabled={updatingPo === po.po_num}
                                className="p-2 bg-primary text-white rounded-lg hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center mx-auto"
                              >
                                <span className={`material-symbols-outlined text-[18px] ${updatingPo === po.po_num ? 'animate-spin' : ''}`}>
                                  {updatingPo === po.po_num ? 'sync' : 'save'}
                                </span>
                              </button>
                            ) : (
                              <span className="material-symbols-outlined text-slate-200 text-sm">edit</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              {!loading && (
                <div className="p-8 bg-[#F8FAFC]/50 dark:bg-slate-800/5 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-300">
                  <span>Showing {filteredOrders.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length} purchase orders</span>
                  <div className="flex gap-2 items-center">
                    <button disabled={currentPage === 1} onClick={(e) => {e.stopPropagation(); setCurrentPage(p => p - 1)}} className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-white dark:hover:bg-slate-800 hover:text-primary transition-all disabled:opacity-20 disabled:cursor-not-allowed group">
                        <span className="material-symbols-outlined text-[10px] group-hover:-translate-x-1 transition-transform">west</span> Previous
                    </button>
                    <span className="px-3 py-1.5 font-bold text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">{currentPage} / {totalPages || 1}</span>
                    <button disabled={currentPage >= totalPages || totalPages === 0} onClick={(e) => {e.stopPropagation(); setCurrentPage(p => p + 1)}} className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-white dark:hover:bg-slate-800 hover:text-primary transition-all disabled:opacity-20 disabled:cursor-not-allowed group">
                        Next <span className="material-symbols-outlined text-[10px] group-hover:translate-x-1 transition-transform">east</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .font-headline { font-family: 'Outfit', sans-serif; }
        input[type="date"]::-webkit-calendar-picker-indicator {
          display: none;
          -webkit-appearance: none;
        }
      `}} />
    </div>
  );
};

export default Orders;
