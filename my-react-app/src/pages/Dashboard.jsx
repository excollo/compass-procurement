import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabase';

/* ─── helpers ─────────────────────────────────────────── */
const todayD = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const todayStr = () => new Date().toISOString().slice(0, 10);

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};
const ETD_COLOR = (dateStr) => {
  if (!dateStr) return 'text-slate-400';
  const etd = new Date(dateStr);
  etd.setHours(0,0,0,0);
  const diff = Math.ceil((etd - todayD()) / 86400000);
  if (diff < 0) return 'text-red-500 font-black';
  if (diff === 0) return 'text-amber-500 font-black';
  if (diff <= 3) return 'text-amber-400 font-black';
  return 'text-emerald-500 font-medium';
};

/* ─── Stage config ─────────────────────────────────────── */
const STAGES = [
  {
    key: 'discussion',
    label: 'Discussion',
    sub: 'Bot actively conversing with vendor',
    icon: 'forum',
    color: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
    match: (s) => ['prompt_sent','discussion','awaiting_response','initial'].includes(s),
  },
  {
    key: 'first_escalation',
    label: 'First Escalation',
    sub: 'Vendor raised first issue flag',
    icon: 'priority_high',
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a',
    match: (s) => ['first_escalation','escalation','exception_detected'].includes(s),
  },
  {
    key: 'human_intervention',
    label: 'Human Intervention',
    sub: 'Ops team manually involved',
    icon: 'support_agent',
    color: '#ef4444',
    bg: '#fef2f2',
    border: '#fecaca',
    match: (s) => ['human_intervention','manual_intervention','manual','exception'].includes(s),
  },
  {
    key: 'resolved',
    label: 'Resolved',
    sub: 'Issue closed successfully',
    icon: 'check_circle',
    color: '#10b981',
    bg: '#f0fdf4',
    border: '#a7f3d0',
    match: (s) => ['resolved','completed','closed','delivered'].includes(s),
  },
];

const categoriseStage = (commState, status) => {
  const s = (commState || status || '').toLowerCase().replace(/ /g, '_');
  for (const stage of STAGES) {
    if (stage.match(s)) return stage.key;
  }
  return 'discussion';
};

/* ─── KPI card ─────────────────────────────────────────── */
const KpiCard = ({ label, value, icon, accent, sub }) => (
  <div className={`db-kpi-card ${accent}`}>
    <div className="db-kpi-icon">
      <span className="material-symbols-outlined">{icon}</span>
    </div>
    <p className="db-kpi-label">{label}</p>
    <h3 className="db-kpi-value">{value === null ? <span className="db-kpi-loading" /> : value}</h3>
    {sub && <p className="db-kpi-sub">{sub}</p>}
  </div>
);

/* ─── Dashboard ─────────────────────────────────────────── */
const Dashboard = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [syncing, setSyncing]     = useState(false);

  /* KPIs */
  const [kpis, setKpis] = useState({
    totalPOs: null, openPOs: null, totalVendors: null, activeChats: null, dueToday: null,
  });

  /* escalations */
  const [escalations, setEscalations] = useState([]);
  const [escalLoading, setEscalLoading] = useState(true);
  const [newEscalCount, setNewEscalCount] = useState(0);
  const [escPage, setEscPage] = useState(1);
  const ESCAL_PER_PAGE = 8;

  /* stages */
  const [stageData, setStageData] = useState(null);
  const [stagesLoading, setStagesLoading] = useState(true);

  /* caches */
  const poDateCache  = useRef({});
  const poStateCache = useRef({});

  /* ─── helpers: try schema fallback ────────────────────── */
  const queryChat = async (buildQuery) => {
    for (const schema of ['procurement', 'public']) {
      try {
        const base = schema === 'procurement'
          ? supabase.schema('procurement').from('chat_messages')
          : supabase.from('chat_messages');
        const r = await buildQuery(base);
        if (!r.error) return r.data;
      } catch (_) {}
    }
    return null;
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
      let openCount = 0, dueCount = 0;
      for (const row of allPOData) {
        if (!seen.has(row.po_num)) {
          seen.add(row.po_num);
          if (row.delivery_date) poDateCache.current[row.po_num] = row.delivery_date;
          poStateCache.current[row.po_num] = { status: row.status, vendorName: row.vendor_name };
          const s = (row.status || '').toLowerCase();
          if (s !== 'closed' && s !== 'delivered' && s !== 'completed') openCount++;
          if (row.delivery_date?.slice(0,10) === todayIso) dueCount++;
        }
      }

      const { count: vendorCount } = await supabase
        .from('vendor_master').select('vendor', { count: 'exact', head: true });

      const thirtyMinAgo = new Date(Date.now() - 30*60*1000).toISOString();
      const chatRows = await queryChat(q => q.select('po_num').gte('created_at', thirtyMinAgo));
      const activeChats = new Set((chatRows||[]).map(r => r.po_num)).size;

      setKpis({ totalPOs: seen.size, openPOs: openCount, totalVendors: vendorCount ?? 0, activeChats, dueToday: dueCount });
    } catch (err) { console.error('KPI fetch', err); }
  }, []); // eslint-disable-line

  /* ─── fetch stages ─────────────────────────────────────── */
  const fetchStages = useCallback(async () => {
    setStagesLoading(true);
    try {
      const msgs = await queryChat(q =>
        q.select('po_num, communication_state, stage, created_at')
          .order('created_at', { ascending: false })
          .limit(500)
      );

      const poStageMap = {};
      const poMeta = {};
      const seen = new Set();
      for (const msg of (msgs || [])) {
        if (!seen.has(msg.po_num)) {
          seen.add(msg.po_num);
          const cs = msg.communication_state || msg.stage || '';
          const fb = poStateCache.current[msg.po_num]?.status || '';
          poStageMap[msg.po_num] = categoriseStage(cs, fb);
          poMeta[msg.po_num] = {
            vendorName: poStateCache.current[msg.po_num]?.vendorName || '—',
            delivery_date: poDateCache.current[msg.po_num] || null,
          };
        }
      }

      // fallback: bucket all POs by their status if no chat data
      if (!msgs || msgs.length === 0) {
        for (const [poNum, info] of Object.entries(poStateCache.current)) {
          poStageMap[poNum] = categoriseStage('', info.status);
          poMeta[poNum] = { vendorName: info.vendorName || '—', delivery_date: poDateCache.current[poNum] || null };
        }
      }

      const grouped = {};
      STAGES.forEach(s => { grouped[s.key] = []; });
      for (const [poNum, stageKey] of Object.entries(poStageMap)) {
        grouped[stageKey]?.push({ poNum, ...poMeta[poNum] });
      }
      setStageData(grouped);
    } catch (err) {
      console.error('Stages fetch', err);
      setStageData(null);
    } finally { setStagesLoading(false); }
  }, []); // eslint-disable-line

  /* ─── fetch escalations ─────────────────────────────────── */
  const fetchEscalations = useCallback(async () => {
    setEscalLoading(true);
    try {
      const data = await queryChat(q =>
        q.select('*').eq('escalation', true)
          .order('created_at', { ascending: false }).limit(200)
      );
      setEscalations((data||[]).map(msg => ({
        ...msg, delivery_date: poDateCache.current[msg.po_num] || null,
      })));
      setEscPage(1);
    } catch (err) {
      console.error('Escalations fetch', err);
      setEscalations([]);
    } finally { setEscalLoading(false); }
  }, []); // eslint-disable-line

  /* ─── initial load ──────────────────────────────────────── */
  useEffect(() => {
    fetchKPIs().then(() => Promise.all([fetchEscalations(), fetchStages()]));
  }, [fetchKPIs, fetchEscalations, fetchStages]);

  /* ─── realtime ──────────────────────────────────────────── */
  useEffect(() => {
    const channels = ['procurement', 'public'].map(schema =>
      supabase.channel(`dash-escal-${schema}`)
        .on('postgres_changes', { event: 'INSERT', schema, table: 'chat_messages', filter: 'escalation=eq.true' },
          (payload) => {
            const newMsg = { ...payload.new, delivery_date: poDateCache.current[payload.new.po_num] || null };
            setEscalations(prev => [newMsg, ...prev]);
            setNewEscalCount(c => c + 1);
          })
        .subscribe()
    );
    return () => channels.forEach(ch => supabase.removeChannel(ch));
  }, []);

  /* ─── sync ──────────────────────────────────────────────── */
  const handleSync = async () => {
    setSyncing(true);
    setNewEscalCount(0);
    await fetchKPIs();
    await Promise.all([fetchEscalations(), fetchStages()]);
    setSyncing(false);
  };

  /* ─── pagination ────────────────────────────────────────── */
  const totalEscalPages = Math.ceil(escalations.length / ESCAL_PER_PAGE) || 1;
  const paginatedEscal  = escalations.slice((escPage-1)*ESCAL_PER_PAGE, escPage*ESCAL_PER_PAGE);

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
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Live
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all disabled:opacity-50">
              <span className={`material-symbols-outlined text-[16px] ${syncing ? 'animate-spin' : ''}`}>sync</span>
              {syncing ? 'Syncing…' : 'Sync'}
            </button>

            <button onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-all shadow-sm">
              <span className="material-symbols-outlined text-[16px]">upload_file</span>
              Import POs
            </button>

            <div className="flex items-center gap-3 ml-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-800">Alex Rivera</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Ops Manager</p>
              </div>
              <img alt="User profile" className="w-9 h-9 rounded-full border-2 border-slate-200 shadow-sm"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8ov37m6Ru1jtLXavUm2Wv7-q8IqttbDcSU5OJzUCKT6ZmPdV8o10Gkm2bzBBlUkUAfR7nPEInOWhBPKK0JB-n56VPQC2sJvCZVr9a9eqzujzWSusoB7Pqo3Zl5PSfDCMpzoPbo0JZh5CHcjqc7lATQ1qKELXGJ7WeD5DB3SN3FaTJ4H9VBzP_Fvv51A3UPXtSYL_rtKoK2k8LRfiEklf60DY9c3Hul2Ue3yIjaHQmSa85wLfALExg-6xFvgM8lPDR6WQOIutN4I6d" />
            </div>
          </div>
        </header>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
          <div className="max-w-[1600px] mx-auto w-full space-y-6">

            {/* Page title */}
            <div>
              <h2 className="text-3xl font-black text-slate-900 font-headline tracking-tighter uppercase leading-none">
                Operations Dashboard
              </h2>
              <p className="text-slate-400 font-medium mt-1.5 text-sm">
                Real-time monitoring of purchase orders, vendor communication, and escalations.
              </p>
            </div>

            {/* ── KPI Grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <KpiCard label="Total POs"     value={kpis.totalPOs}     icon="receipt_long"    accent="kpi-neutral"                                         sub="All purchase orders"  />
              <KpiCard label="Open POs"      value={kpis.openPOs}      icon="pending_actions" accent="kpi-blue"                                             sub="Active & in-transit"  />
              <KpiCard label="Total Vendors" value={kpis.totalVendors} icon="hub"             accent="kpi-indigo"                                           sub="Registered partners"  />
              <KpiCard label="Active Chats"  value={kpis.activeChats}  icon="forum"           accent="kpi-green"                                            sub="Last 30 minutes"      />
              <KpiCard label="Due Today"     value={kpis.dueToday}     icon="calendar_today"  accent={kpis.dueToday > 0 ? 'kpi-amber' : 'kpi-neutral'}     sub="Delivery date = today" />
            </div>

            {/* ── Bottom row: Escalations (3/5) + Stages (2/5) ── */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">

              {/* ── Escalations table ── */}
              <div className="xl:col-span-3 bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                {/* header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-red-500 text-lg">notification_important</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Escalations</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        Real-time · messages with escalation flag
                      </p>
                    </div>
                    {newEscalCount > 0 && (
                      <span className="px-2.5 py-0.5 bg-red-500 text-white text-[9px] font-black rounded-full animate-pulse">
                        +{newEscalCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-full border border-emerald-100">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                      </span>
                      Live
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1.5 rounded-full border border-slate-100">
                      {escalations.length} row{escalations.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[520px]">
                    <thead className="bg-slate-50/60 border-b border-slate-100">
                      <tr>
                        {['PO #','Vendor Code','Delivery','Reason / Message','Time'].map(h => (
                          <th key={h} className="text-left px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {escalLoading ? (
                        [...Array(4)].map((_,i) => (
                          <tr key={i} className="animate-pulse">
                            <td colSpan={5} className="px-6 py-3"><div className="h-7 bg-slate-50 rounded-xl" /></td>
                          </tr>
                        ))
                      ) : paginatedEscal.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-16 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <span className="material-symbols-outlined text-3xl text-slate-200">check_circle</span>
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">No escalations detected</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedEscal.map((row, idx) => (
                          <tr key={row.id||idx} className="hover:bg-red-50/20 transition-all border-l-4 border-red-400">
                            <td className="px-6 py-3">
                              <span className="text-xs font-black text-slate-900">#{row.po_num||'—'}</span>
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 text-[9px] font-black flex-shrink-0">
                                  {(row.vendor_code||row.po_num||'??').toString().slice(0,2).toUpperCase()}
                                </div>
                                <span className="text-[10px] font-black text-slate-700 truncate max-w-[80px]">{row.vendor_code||'—'}</span>
                              </div>
                            </td>
                            <td className={`px-6 py-3 text-[10px] font-bold ${ETD_COLOR(row.delivery_date)}`}>
                              {fmtDate(row.delivery_date)}
                            </td>
                            <td className="px-6 py-3 max-w-[160px]">
                              <p className="text-[10px] text-slate-500 truncate" title={row.message_text}>{row.message_text||'—'}</p>
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-500">{fmtDate(row.created_at)}</span>
                                <span className="text-[9px] text-slate-400">{fmtTime(row.created_at)}</span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* pagination */}
                {!escalLoading && (
                  <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>
                      {escalations.length > 0
                        ? `${(escPage-1)*ESCAL_PER_PAGE+1}–${Math.min(escPage*ESCAL_PER_PAGE, escalations.length)} of ${escalations.length}`
                        : '0 escalations'}
                    </span>
                    <div className="flex gap-1.5 items-center">
                      <button disabled={escPage===1} onClick={() => setEscPage(p=>p-1)}
                        className="flex items-center gap-1 px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white hover:text-blue-600 transition-all disabled:opacity-20 disabled:cursor-not-allowed">
                        <span className="material-symbols-outlined text-[10px]">west</span> Prev
                      </button>
                      <span className="px-2.5 py-1 font-bold text-slate-500 bg-white border border-slate-200 rounded-lg">
                        {escPage}/{totalEscalPages}
                      </span>
                      <button disabled={escPage>=totalEscalPages} onClick={() => setEscPage(p=>p+1)}
                        className="flex items-center gap-1 px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white hover:text-blue-600 transition-all disabled:opacity-20 disabled:cursor-not-allowed">
                        Next <span className="material-symbols-outlined text-[10px]">east</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Conversation Stages panel ── */}
              <div className="xl:col-span-2 bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                {/* header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-violet-500 text-lg">account_tree</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Conversation Stages</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Current PO pipeline states</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1.5 rounded-full border border-slate-100">
                    {stageData ? Object.values(stageData).reduce((a,b)=>a+b.length,0) : '—'} POs
                  </span>
                </div>

                {/* stages */}
                <div className="p-5 space-y-3">
                  {stagesLoading ? (
                    [...Array(4)].map((_,i) => (
                      <div key={i} className="animate-pulse h-[72px] bg-slate-50 rounded-2xl" />
                    ))
                  ) : (
                    STAGES.map((stage, sIdx) => {
                      const pos = stageData?.[stage.key] || [];
                      const count = pos.length;
                      const isLast = sIdx === STAGES.length - 1;
                      return (
                        <div key={stage.key} className="relative">
                          {!isLast && (
                            <div className="absolute left-[28px] top-[72px] w-[2px] h-3 z-0"
                              style={{ background: `linear-gradient(${stage.color}55, ${STAGES[sIdx+1].color}55)` }} />
                          )}
                          <div className="stage-card" style={{ borderColor: stage.border, background: stage.bg }}>
                            <div className="flex items-start gap-3">
                              <div className="stage-icon flex-shrink-0" style={{ background: `${stage.color}18`, color: stage.color }}>
                                <span className="material-symbols-outlined text-base">{stage.icon}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-black text-slate-800">{stage.label}</p>
                                  <span className="stage-badge flex-shrink-0" style={{ background: stage.color }}>{count}</span>
                                </div>
                                <p className="text-[9px] text-slate-400 font-medium mt-0.5 leading-tight">{stage.sub}</p>
                                {count > 0 ? (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {pos.slice(0,4).map(po => (
                                      <span key={po.poNum} className="po-chip"
                                        style={{ color: stage.color, borderColor: `${stage.color}30`, background: `${stage.color}0f` }}>
                                        #{po.poNum}
                                      </span>
                                    ))}
                                    {count > 4 && (
                                      <span className="po-chip" style={{ color:'#94a3b8', borderColor:'#e2e8f0', background:'#f8fafc' }}>
                                        +{count - 4} more
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-[9px] text-slate-300 font-bold mt-2 italic">No POs at this stage</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

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
                  {['Vendor List','Open PO Data','Inventory Manifest'].map(t => (
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

        /* ── KPI cards ── */
        .db-kpi-card {
          position: relative; padding: 1.25rem; border-radius: 1.25rem;
          border: 1px solid #f1f5f9; background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,.06); overflow: hidden;
          transition: transform .15s, box-shadow .15s; cursor: default;
        }
        .db-kpi-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,.08); }
        .db-kpi-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 2.25rem; height: 2.25rem; border-radius: .75rem; margin-bottom: .75rem;
        }
        .db-kpi-label { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: .12em; color: #94a3b8; margin-bottom: .2rem; }
        .db-kpi-value { font-size: 1.875rem; font-weight: 900; line-height: 1; font-family: 'Outfit', sans-serif; color: #0f172a; }
        .db-kpi-sub   { font-size: 9px; font-weight: 700; color: #cbd5e1; margin-top: .3rem; }
        .db-kpi-loading {
          display: inline-block; width: 2.5rem; height: 1.5rem;
          background: linear-gradient(90deg, #f1f5f9, #e2e8f0, #f1f5f9);
          background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: .5rem;
        }
        @keyframes shimmer { 0%{ background-position: 200% 0 } 100%{ background-position: -200% 0 } }

        .kpi-neutral .db-kpi-icon { background: #f8fafc; color: #64748b; }
        .kpi-blue    .db-kpi-icon { background: #eff6ff; color: #2563eb; }
        .kpi-blue    .db-kpi-value { color: #2563eb; }
        .kpi-indigo  .db-kpi-icon { background: #eef2ff; color: #4f46e5; }
        .kpi-indigo  .db-kpi-value { color: #4f46e5; }
        .kpi-green   .db-kpi-icon { background: #f0fdf4; color: #16a34a; }
        .kpi-green   .db-kpi-value { color: #16a34a; }
        .kpi-amber   .db-kpi-icon { background: #fffbeb; color: #d97706; }
        .kpi-amber   .db-kpi-value { color: #d97706; }

        /* ── Stage cards ── */
        .stage-card {
          padding: .875rem 1rem; border-radius: 1.125rem; border: 1px solid;
          transition: transform .12s, box-shadow .12s; cursor: default;
        }
        .stage-card:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,.07); }
        .stage-icon {
          width: 2.25rem; height: 2.25rem; border-radius: .75rem;
          display: flex; align-items: center; justify-content: center;
        }
        .stage-badge {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 1.5rem; height: 1.5rem; padding: 0 .375rem;
          border-radius: .5rem; font-size: 11px; font-weight: 900; color: white; line-height: 1;
        }
        .po-chip {
          display: inline-flex; align-items: center;
          padding: 2px 7px; border-radius: 6px; border: 1px solid;
          font-size: 9px; font-weight: 900; letter-spacing: .03em;
          transition: opacity .1s; cursor: default;
        }
        .po-chip:hover { opacity: .65; }
      `}</style>
    </div>
  );
};

export default Dashboard;
