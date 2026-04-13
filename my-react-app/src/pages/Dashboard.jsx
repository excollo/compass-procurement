import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabase';

/* ─── helpers ─────────────────────────────────────────── */
const todayD = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const todayStr = () => new Date().toISOString().slice(0, 10);

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date)) return d;
  const DD = String(date.getDate()).padStart(2, '0');
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const YYYY = date.getFullYear();
  return `${DD}/${MM}/${YYYY}`;
};
const fmtTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const getCategory = (msg) => {
  if (!msg) return 'Operation';
  const text = msg.toLowerCase();
  if (text.match(/delay|late|postpone|strike|halt/)) return 'Delay';
  if (text.match(/short|missing|quantity|stock|partial/)) return 'Shortage';
  if (text.match(/quality|damage|broken|poor|reject|defective/)) return 'Quality';
  if (text.match(/price|cost|invoice|payment|commercial|fee/)) return 'Commercial';
  return 'Operation';
};

const CategoryBadge = ({ msg }) => {
  const cat = getCategory(msg);
  let styles = "bg-slate-100 text-slate-600 border-slate-200";
  if (cat === 'Delay') styles = "bg-amber-50 text-amber-600 border-amber-200";
  else if (cat === 'Shortage') styles = "bg-orange-50 text-orange-600 border-orange-200";
  else if (cat === 'Quality') styles = "bg-purple-50 text-purple-600 border-purple-200";
  else if (cat === 'Commercial') styles = "bg-emerald-50 text-emerald-600 border-emerald-200";
  else if (cat === 'Operation') styles = "bg-blue-50 text-blue-600 border-blue-200";

  return <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border ${styles}`}>{cat}</span>;
};
const ETD_COLOR = (dateStr) => {
  if (!dateStr) return 'text-slate-400';
  const etd = new Date(dateStr);
  etd.setHours(0, 0, 0, 0);
  const diff = Math.ceil((etd - todayD()) / 86400000);
  if (diff < 0) return 'text-red-500 font-black';
  if (diff === 0) return 'text-amber-500 font-black';
  if (diff <= 3) return 'text-amber-400 font-black';
  return 'text-emerald-500 font-medium';
};

/* ─── Fixed PO list ────────────────────────────────────── */
const FIXED_POS = ['4100259330', '4100260294', '4100260367', '4100260584', '4100260654'];

/* ─── Dummy escalation rows (distinct from FIXED_POS) ──────── */
const DUMMY_ESCALATIONS = [
  {
    id: 'dum-1', po_num: '4100261001', vendor_code: 'VND-082', vendor_name: 'Apex Manufacturing', spoc: 'Priya Sharma',
    message_text: 'Material not available at source warehouse',
    delivery_date: '2026-04-09', created_at: '2026-04-07T05:14:00Z', escalation: true,
  },
  {
    id: 'dum-2', po_num: '4100261088', vendor_code: 'VND-115', vendor_name: 'Global Logistics', spoc: 'Priya Sharma',
    message_text: 'Shipment delayed due to port congestion',
    delivery_date: '2026-04-07', created_at: '2026-04-07T04:52:00Z', escalation: true,
  },
  {
    id: 'dum-3', po_num: '4100261173', vendor_code: 'VND-034', vendor_name: 'TechFlow Corp', spoc: 'Priya Sharma',
    message_text: 'Partial quantity dispatched, balance pending',
    delivery_date: '2026-04-10', created_at: '2026-04-07T03:30:00Z', escalation: true,
  },
  {
    id: 'dum-4', po_num: '4100261240', vendor_code: 'VND-209', vendor_name: 'Nexus Materials', spoc: 'Priya Sharma',
    message_text: 'Quality inspection failed, re-work in progress',
    delivery_date: '2026-04-08', created_at: '2026-04-06T22:10:00Z', escalation: true,
  },
  {
    id: 'dum-5', po_num: '4100261319', vendor_code: 'VND-057', vendor_name: 'Summit Supply', spoc: 'Priya Sharma',
    message_text: 'Vendor requesting delivery date extension by 3 days',
    delivery_date: '2026-04-12', created_at: '2026-04-06T18:45:00Z', escalation: true,
  },
  {
    id: 'dum-6', po_num: '4100261402', vendor_code: 'VND-143', vendor_name: 'Prime Industrial', spoc: 'Priya Sharma',
    message_text: 'Raw material price revision — approval needed',
    delivery_date: '2026-04-11', created_at: '2026-04-06T15:20:00Z', escalation: true,
  },
  {
    id: 'dum-7', po_num: '4100261475', vendor_code: 'VND-061', vendor_name: 'Continental Cargo', spoc: 'Priya Sharma',
    message_text: 'Truck breakdown on highway, ETA uncertain',
    delivery_date: '2026-04-07', created_at: '2026-04-06T12:05:00Z', escalation: true,
  },
  {
    id: 'dum-8', po_num: '4100261530', vendor_code: 'VND-198', vendor_name: 'Swift Shipping', spoc: 'Priya Sharma',
    message_text: 'Custom duty hold at port of entry',
    delivery_date: '2026-04-13', created_at: '2026-04-06T09:40:00Z', escalation: true,
  },
  {
    id: 'dum-9', po_num: '4100261612', vendor_code: 'VND-022', vendor_name: 'Echo Packaging', spoc: 'Priya Sharma',
    message_text: 'Packing list mismatch with invoice — rejected at gate',
    delivery_date: '2026-04-08', created_at: '2026-04-06T07:15:00Z', escalation: true,
  },
  {
    id: 'dum-10', po_num: '4100261700', vendor_code: 'VND-174', vendor_name: 'Vanguard Co', spoc: 'Priya Sharma',
    message_text: 'Labour strike at vendor facility, production halted',
    delivery_date: '2026-04-14', created_at: '2026-04-05T20:30:00Z', escalation: true,
  },
];

/* ─── KPI cards ─────────────────────────────────────────── */

const VendorKpiCard = ({ value }) => (
  <div
    className="p-5 rounded-[var(--radius-card-lg)] flex flex-col justify-between h-[120px] transition-all cursor-default border-l-[4px]"
    style={{
      background: 'var(--color-surface)',
      boxShadow: 'var(--shadow-card)',
      border: '1px solid var(--color-border-light)',
      borderLeftWidth: '4px',
      borderLeftColor: 'var(--color-brand-primary)',
    }}
  >
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: 'var(--color-brand-light)' }}>
        <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--color-brand-primary)' }}>group</span>
      </div>
      <span className="text-[12px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Vendors</span>
    </div>
    <div>
      <div className="flex items-baseline">
        <h3 className="text-[28px] font-semibold leading-none" style={{ color: 'var(--color-text-primary)' }}>
          {value === null ? '-' : value}
        </h3>
        <span className="text-[18px] font-normal ml-0.5" style={{ color: 'var(--color-text-muted)' }}>
          /{value === null ? '-' : value}
        </span>
      </div>
      <p className="text-[12px] font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>Responding</p>
    </div>
  </div>
);

const MetricCard = ({ icon, label, value, sub, colorClass, isDimmed, borderColor, iconBg, iconColor }) => (
  <div
    className={`p-5 rounded-[var(--radius-card-lg)] flex flex-col justify-between h-[120px] transition-all cursor-default ${isDimmed ? 'opacity-50' : ''}`}
    style={{
      background: 'var(--color-surface)',
      boxShadow: 'var(--shadow-card)',
      border: '1px solid var(--color-border-light)',
      borderLeftWidth: '4px',
      borderLeftColor: borderColor || 'var(--color-border)',
    }}
  >
    <div className="flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-[10px] flex items-center justify-center"
        style={{ background: iconBg || 'var(--color-neutral-bg)' }}
      >
        <span
          className="material-symbols-outlined text-[18px]"
          style={{ color: iconColor || 'var(--color-neutral)' }}
        >{icon}</span>
      </div>
      <span className="text-[12px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{label}</span>
    </div>
    <div>
      <div className="flex items-baseline">
        <h3 className="text-[28px] font-semibold leading-none" style={{ color: isDimmed ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>
          {value === null ? '-' : value}
        </h3>
      </div>
      <p className="text-[12px] font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>{sub}</p>
    </div>
  </div>
);

/* ─── Dashboard ─────────────────────────────────────────── */
const Dashboard = () => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  /* conversations list for the 5 fixed POs */
  const [convos, setConvos] = useState([]);
  const [convosLoading, setConvosLoading] = useState(true);

  /* escalations */
  const [escalations, setEscalations] = useState([]);
  const [escalLoading, setEscalLoading] = useState(true);
  const [newEscalCount, setNewEscalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [escPage, setEscPage] = useState(1);
  const ESCAL_PER_PAGE = 5;

  /* KPIs */
  const [kpis, setKpis] = useState({
    totalPOs: null,
    openPOs: null,
    totalVendors: null,
    activeChats: null,
    dueToday: null,
    overdue: null,
  });

  /* caches */
  const poDateCache = useRef({});

  /* ─── helpers: try schema fallback ────────────────────── */
  const queryChat = async (buildQuery) => {
    try {
      const base = supabase.from('chat_history');
      const r = await buildQuery(base);
      if (!r.error) return r.data;
      throw r.error;
    } catch (err) {
      console.error('queryChat Error:', err);
      return null;
    }
  };


  /* ─── fetch KPIs ──────────────────────────────────────── */
  const fetchKPIs = useCallback(async () => {
    try {
      const todayIso = todayStr();
      let allPOData = [], from = 0;
      const limit = 1000;
      let more = true;
      while (more) {
        const { data, error } = await supabase
          .from('open_po_detail')
          .select('po_num, delivery_date, status, vendor_name')
          .range(from, from + limit - 1);
        if (error) throw error;
        if (data?.length) { allPOData = [...allPOData, ...data]; from += limit; }
        if (!data || data.length < limit) more = false;
      }

      const seen = new Set();
      let openCount = 0, dueCount = 0, overdueCount = 0;
      const tDate = todayD();
      for (const row of allPOData) {
        if (!seen.has(row.po_num)) {
          seen.add(row.po_num);
          if (row.delivery_date) poDateCache.current[row.po_num] = row.delivery_date;
          const s = (row.status || '').toLowerCase();
          if (s !== 'closed' && s !== 'delivered' && s !== 'completed') {
            openCount++;
            if (row.delivery_date) {
               const etd = new Date(row.delivery_date);
               if (etd < tDate) overdueCount++;
            }
          }
          if (row.delivery_date?.slice(0, 10) === todayIso) dueCount++;
        }
      }

      const { count: vendorCount } = await supabase
        .from('vendor_master').select('vendor', { count: 'exact', head: true });

      setKpis({ totalPOs: seen.size, openPOs: openCount, totalVendors: vendorCount ?? 0, activeChats: 5, dueToday: dueCount, overdue: overdueCount });
    } catch (err) { console.error('KPI fetch', err); }
  }, []); // eslint-disable-line

  /* ─── fetch convos (5 fixed POs) ───────────────────────── */
  const fetchConvos = useCallback(async () => {
    setConvosLoading(true);
    try {
      const { data, error } = await supabase
        .from('open_po_detail')
        .select('po_num, vendor_name, delivery_date')
        .in('po_num', FIXED_POS);
      if (error) throw error;
      // deduplicate by po_num, preserve FIXED_POS order
      const map = {};
      (data || []).forEach(row => {
        if (!map[row.po_num]) map[row.po_num] = row;
      });
      setConvos(FIXED_POS.map(p => map[p]).filter(Boolean));
    } catch (err) {
      console.error('Convos fetch', err);
    } finally { setConvosLoading(false); }
  }, []);

  /* ─── fetch escalations ────────────────────────────────── */
  const fetchEscalations = useCallback(async () => {
    setEscalLoading(true);
    try {
      const { data, error } = await supabase
        .from('escalations')
        .select('*')
        .order('escalation_created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      const real = (data || []).map(row => ({
        ...row,
        message_text: row.reason_detail || row.escalation_reason || '—'
      }));
      // Merge real data with dummy rows (dummy rows always appended)
      setEscalations([...real, ...DUMMY_ESCALATIONS]);
      setEscPage(1);
    } catch (err) {
      console.error('Escalations fetch', err);
      setEscalations([...DUMMY_ESCALATIONS]);
    } finally { setEscalLoading(false); }
  }, []); // eslint-disable-line

  /* ─── initial load ──────────────────────────────────────── */
  useEffect(() => {
    fetchKPIs();
    fetchConvos();
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
  }, [fetchKPIs, fetchConvos, fetchEscalations]);

  /* ─── realtime escalations ──────────────────────────────── */
  useEffect(() => {
    const channel = supabase.channel('dash-escal-public')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'escalations' },
        (payload) => {
          const newMsg = { ...payload.new, message_text: payload.new.reason_detail || payload.new.escalation_reason || '—' };
          setEscalations(prev => [newMsg, ...prev]);
          setNewEscalCount(c => c + 1);
        })
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, []);

  /* ─── pagination ───────────────────────────────────────── */
  const totalEscalPages = Math.ceil(escalations.length / ESCAL_PER_PAGE) || 1;
  const paginatedEscal = escalations.slice((escPage - 1) * ESCAL_PER_PAGE, escPage * ESCAL_PER_PAGE);

  /* ─── sync ──────────────────────────────────────────────── */
  const handleSync = async () => {
    setSyncing(true);
    setNewEscalCount(0);
    await Promise.all([fetchKPIs(), fetchConvos(), fetchEscalations()]);
    setSyncing(false);
  };

  /* ─── render ────────────────────────────────────────────── */
  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">

        {/* ── Header ── */}
        <header className="flex justify-between items-center h-16 px-8 w-full bg-white border-b border-slate-100 shadow-sm z-40 flex-shrink-0">
          <div className="flex items-center gap-6">
            <h1 className="text-base font-black tracking-tighter text-slate-900 uppercase font-headline">
              Procurement&nbsp;Ops
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-btn)] transition-all disabled:opacity-50"
              style={{
                background: 'var(--color-surface-muted)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <span className={`material-symbols-outlined text-[16px] ${syncing ? 'animate-spin' : ''}`}>sync</span>
              {syncing ? 'Syncing…' : 'Sync'}
            </button>

            <button onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-white text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-btn)] transition-all"
              style={{
                background: 'var(--color-brand-primary)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <span className="material-symbols-outlined text-[16px]">upload_file</span>
              Import POs
            </button>

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
                  background: 'var(--color-danger)',
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

            <div className="flex items-center gap-3 ml-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>Ramesh Kumar</p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Admin</p>
              </div>
              <img alt="User profile" className="w-9 h-9 rounded-full shadow-sm"
                style={{ border: '2px solid var(--color-border)' }}
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8ov37m6Ru1jtLXavUm2Wv7-q8IqttbDcSU5OJzUCKT6ZmPdV8o10Gkm2bzBBlUkUAfR7nPEInOWhBPKK0JB-n56VPQC2sJvCZVr9a9eqzujzWSusoB7Pqo3Zl5PSfDCMpzoPbo0JZh5CHcjqc7lATQ1qKELXGJ7WeD5DB3SN3FaTJ4H9VBzP_Fvv51A3UPXtSYL_rtKoK2k8LRfiEklf60DY9c3Hul2Ue3yIjaHQmSa85wLfALExg-6xFvgM8lPDR6WQOIutN4I6d" />
            </div>
          </div>
        </header>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
          <div className="max-w-[1600px] mx-auto w-full space-y-8">

            {/* Page title */}
            <div>
              <h2 className="text-[28px] font-bold font-headline tracking-tight leading-none" style={{ color: 'var(--color-text-primary)' }}>
                Operations Dashboard
              </h2>
              <p className="font-medium mt-2 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                Real-time monitoring of vendor purchase order conversations.
              </p>
            </div>

            {/* ── KPI Grid ── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
              <VendorKpiCard value={kpis.totalVendors} />
              <MetricCard label="Critical" value={escalations.length} icon="warning" sub="Escalations"
                borderColor="var(--color-danger)" iconBg="var(--color-danger-bg)" iconColor="var(--color-danger)" />
              <MetricCard label="Overdue" value={kpis.overdue} icon="inventory_2" sub="Late POs"
                borderColor="var(--color-warning)" iconBg="var(--color-warning-bg)" iconColor="var(--color-warning)" />
              <MetricCard label="Active Chats" value={kpis.activeChats} icon="forum" sub="Last 30 minutes"
                borderColor="var(--color-success)" iconBg="var(--color-success-bg)" iconColor="var(--color-success)" />
              <MetricCard label="Due Today" value={kpis.dueToday} icon="calendar_today" sub="Delivery date = today"
                borderColor={kpis.dueToday > 0 ? 'var(--color-warning)' : 'var(--color-border)'}
                iconBg={kpis.dueToday > 0 ? 'var(--color-warning-bg)' : 'var(--color-neutral-bg)'}
                iconColor={kpis.dueToday > 0 ? 'var(--color-warning)' : 'var(--color-neutral)'} />
            </div>

            {/* ── Bottom row: Escalations (left) + Conversations (right) ── */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

              {/* ── Escalations table ── */}
              <div
                className="xl:col-span-3 rounded-[var(--radius-card-lg)] overflow-hidden h-full flex flex-col"
                style={{
                  background: 'var(--color-surface)',
                  boxShadow: 'var(--shadow-card)',
                  border: '1px solid var(--color-border-light)',
                }}
              >
                <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-danger-bg)' }}>
                      <span className="material-symbols-outlined text-lg" style={{ color: 'var(--color-danger)' }}>notification_important</span>
                    </div>
                    <div>
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--color-text-primary)' }}>Escalations</h3>
                      <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>Real-time · messages with escalation flag</p>
                    </div>
                    {newEscalCount > 0 && (
                      <span className="px-2.5 py-0.5 text-white text-[9px] font-bold rounded-full animate-pulse" style={{ background: 'var(--color-danger)' }}>+{newEscalCount} new</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[9px] font-semibold px-2.5 py-1.5 rounded-full" style={{ color: 'var(--color-success)', background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)' }}>
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--color-success)' }} />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: 'var(--color-success)' }} />
                      </span>
                      Live
                    </span>
                    <span className="text-[9px] font-semibold px-2.5 py-1.5 rounded-full" style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-surface-muted)', border: '1px solid var(--color-border-light)' }}>
                      {escalations.length} row{escalations.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full border-collapse min-w-[800px]">
                    <thead style={{ background: 'var(--color-surface-muted)', borderBottom: '1px solid var(--color-border-light)' }}>
                      <tr>
                        {['PO #', 'Vendor Name', 'SPOC', 'Delivery', 'Reason / Message', 'Category'].map(h => (
                          <th key={h} className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {escalLoading ? (
                        [...Array(4)].map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td colSpan={6} className="px-6 py-3.5"><div className="h-7 bg-slate-50 rounded-xl" /></td>
                          </tr>
                        ))
                      ) : paginatedEscal.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-16 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <span className="material-symbols-outlined text-3xl text-slate-200">check_circle</span>
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">No escalations detected</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedEscal.map((row, idx) => (
                          <tr key={row.id || idx} className="transition-all" style={{ borderLeft: '4px solid var(--color-danger-border)' }}>
                            <td className="px-6 py-3.5 w-[120px] flex-shrink-0"><span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>{row.po_num || '—'}</span></td>
                            <td className="px-6 py-3.5 whitespace-nowrap min-w-[140px]">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{row.vendor_name || '—'}</span>
                                {row.vendor_code && <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--color-text-tertiary)' }}>{row.vendor_code}</span>}
                              </div>
                            </td>
                            <td className="px-6 py-3.5 whitespace-nowrap min-w-[100px]">
                               <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>{row.spoc || 'Priya Sharma'}</span>
                            </td>
                            <td className={`px-6 py-3.5 text-[10px] font-bold whitespace-nowrap ${ETD_COLOR(row.delivery_date)}`}>{fmtDate(row.delivery_date)}</td>
                            <td className="px-6 py-3.5 min-w-[180px]">
                              <p className="text-xs font-medium leading-snug" style={{ color: 'var(--color-text-secondary)' }}>{row.message_text || '—'}</p>
                            </td>
                            <td className="px-6 py-3.5 whitespace-nowrap">
                              <CategoryBadge msg={row.message_text} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {!escalLoading && (
                  <div className="px-6 py-4 flex justify-between items-center text-[10px] font-semibold uppercase tracking-wider" style={{ background: 'var(--color-surface-muted)', borderTop: '1px solid var(--color-border-light)', color: 'var(--color-text-tertiary)' }}>
                    <span>
                      {escalations.length > 0
                        ? `${(escPage - 1) * ESCAL_PER_PAGE + 1}–${Math.min(escPage * ESCAL_PER_PAGE, escalations.length)} of ${escalations.length}`
                        : '0 escalations'}
                    </span>
                    <div className="flex gap-1.5 items-center">
                      <button disabled={escPage === 1} onClick={() => setEscPage(p => p - 1)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-btn)] transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                        style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                        <span className="material-symbols-outlined text-[10px]">west</span> Prev
                      </button>
                      <span className="px-2.5 py-1 font-semibold rounded-[var(--radius-btn)]" style={{ color: 'var(--color-text-secondary)', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>{escPage}/{totalEscalPages}</span>
                      <button disabled={escPage >= totalEscalPages} onClick={() => setEscPage(p => p + 1)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-btn)] transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                        style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                        Next <span className="material-symbols-outlined text-[10px]">east</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Recent Conversations panel ── */}
              <div
                className="xl:col-span-1 rounded-[var(--radius-card-lg)] overflow-hidden h-full flex flex-col"
                style={{
                  background: 'var(--color-surface)',
                  boxShadow: 'var(--shadow-card)',
                  border: '1px solid var(--color-border-light)',
                }}
              >
                <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-brand-light)' }}>
                      <span className="material-symbols-outlined text-lg" style={{ color: 'var(--color-brand-primary)' }}>forum</span>
                    </div>
                    <div>
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--color-text-primary)' }}>Recent Conversations</h3>
                      <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>Click a row to open the chat</p>
                    </div>
                  </div>
                </div>

                {/* list */}
                <div className="divide-y divide-slate-50 flex-1">
                  {convosLoading ? (
                    [...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse flex items-center gap-4 px-6 py-3.5">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-slate-100 rounded-full w-1/4" />
                          <div className="h-2 bg-slate-50 rounded-full w-1/3" />
                        </div>
                      </div>
                    ))
                  ) : convos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 flex-1">
                      <span className="material-symbols-outlined text-4xl text-slate-200">inbox</span>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">No conversations found</p>
                    </div>
                  ) : (
                    convos.map((po) => (
                      <div
                        key={po.po_num}
                        onClick={() => navigate(`/chats?po=${po.po_num}`)}
                        className="flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-all group"
                        style={{ ':hover': { background: 'var(--color-brand-light)' } }}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm flex-shrink-0" style={{ background: 'var(--color-brand-light)', color: 'var(--color-brand-primary)' }}>
                          {(po.vendor_name || po.po_num).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>PO-{po.po_num}</p>
                          <p className="text-[10px] font-medium truncate mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{po.vendor_name || '—'}</p>
                          {po.delivery_date && (
                            <p className={`text-[9px] font-bold mt-0.5 ${ETD_COLOR(po.delivery_date)}`}>
                              ETD: {fmtDate(po.delivery_date)}
                            </p>
                          )}
                        </div>
                        <span className="material-symbols-outlined transition-all text-[18px]" style={{ color: 'var(--color-text-muted)' }}>chevron_right</span>
                      </div>
                    ))
                  )}
                </div>
              </div>{/* end conversations panel */}

            </div>{/* end bottom grid */}

          </div>
        </div>
      </main>

      {/* ── Upload Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                  <span className="material-symbols-outlined">upload_file</span>
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base font-headline">Import Purchase Orders</h4>
                  <p className="text-xs text-slate-400">Upload your Excel or CSV file to import PO data</p>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
                onClick={() => setModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-8">
              <div className="border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-12 text-center group hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer relative">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-blue-500 text-3xl">cloud_upload</span>
                </div>
                <p className="text-slate-700 font-black text-lg">Drag and drop your file here</p>
                <p className="text-slate-400 text-sm mt-1">Accepts .xlsx, .csv formats up to 50MB</p>
                <div className="flex justify-center gap-3 mt-6">
                  {['Vendor List', 'Open PO Data', 'Inventory Manifest'].map(t => (
                    <span key={t} className="px-4 py-1.5 bg-white rounded-full text-[11px] font-black shadow-sm border border-slate-100 text-slate-500">{t}</span>
                  ))}
                </div>
                <input accept=".xlsx,.csv" className="absolute inset-0 opacity-0 cursor-pointer" type="file" />
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button className="px-6 py-2.5 rounded-xl font-black text-sm text-slate-500 hover:bg-slate-100 transition-all"
                onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-black text-sm hover:bg-slate-700 active:scale-95 transition-all">
                Process Data
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .font-headline { font-family: 'Outfit', sans-serif; }
      `}</style>
    </div>
  );
};

export default Dashboard;
