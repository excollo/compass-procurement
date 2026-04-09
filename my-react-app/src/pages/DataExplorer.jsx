import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip as ChartTooltip, Legend as ChartLegend, DoughnutController, BarController } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

const MOCK_DATA = {
  overview: {
    total_po_lines: 9603, unique_pos: 1277, unique_suppliers: 99, unique_sites: 35,
    overall_fill_rate: 88.9, full_lines: 7552, partial_lines: 1202,
    zero_lines: 849, zero_pct: 8.8, overdue_lines: 1404, avg_days_overdue: 23.6,
    open_pos_count: 311, open_vendors_count: 30, emergency_fill_rate: 90.4, regular_fill_rate: 88.9
  },
  deliveryStatus: { full: 7552, partial: 1202, zero: 849 },
  fillRateByType: [ { po_type: "Emergency", fill_rate: 90.4, line_count: 771 }, { po_type: "Regular", fill_rate: 89.0, line_count: 8584 }, { po_type: "Manual", fill_rate: 86.2, line_count: 188 }, { po_type: "Service", fill_rate: 74.0, line_count: 60 } ],
  regionComparison: [ { region: "NCR", fill_rate: 86.9, lines: 5997, suppliers: 98, sites: 2 }, { region: "KN", fill_rate: 73.2, lines: 3606, suppliers: 1, sites: 33 } ],
  openPoAging: [ { bucket: "8-14d", count: 284 }, { bucket: "15-30d", count: 748 }, { bucket: "31-60d", count: 372 } ],
  supplierFillDst: [ { bucket: "0%", supplier_count: 12 }, { bucket: "1-50%", supplier_count: 4 }, { bucket: "51-75%", supplier_count: 8 }, { bucket: "76-90%", supplier_count: 15 }, { bucket: "91-95%", supplier_count: 9 }, { bucket: "96-100%", supplier_count: 51 } ],
  topVendorsQty: [ { vendor_name: "Raj Enterprises", open_qty: 132460, avg_days_overdue: 23.8, open_lines: 58 }, { vendor_name: "Roti Factory", open_qty: 129200, avg_days_overdue: 23.9, open_lines: 29 }, { vendor_name: "R-S Enterprises", open_qty: 20199, avg_days_overdue: 20.2, open_lines: 9 }, { vendor_name: "Organicut Fresh Pvt Ltd", open_qty: 16547, avg_days_overdue: 27.6, open_lines: 64 }, { vendor_name: "At Overseas", open_qty: 13518, avg_days_overdue: 15.3, open_lines: 8 }, { vendor_name: "N.K.Enterprises", open_qty: 10822, avg_days_overdue: 23.8, open_lines: 902 }, { vendor_name: "Galaxy Distribution", open_qty: 5732, avg_days_overdue: 15.6, open_lines: 14 }, { vendor_name: "Mehta Saras Suppliers", open_qty: 5444, avg_days_overdue: 22.5, open_lines: 193 } ],
  siteFillRate: [ { site_code: "124A", site_name: "Google Connect Services India", fill_rate: 10.5, zero_pct: 28.0, line_count: 25 }, { site_code: "120X", site_name: "Google_CARINA", fill_rate: 20.9, zero_pct: 16.9, line_count: 77 }, { site_code: "147Q", site_name: "Google Connect Services India", fill_rate: 34.9, zero_pct: 16.9, line_count: 136 }, { site_code: "154Y", site_name: "Google India Private Ltd", fill_rate: 39.7, zero_pct: 14.9, line_count: 134 }, { site_code: "121I", site_name: "JPMC-ETV", fill_rate: 46.8, zero_pct: 13.6, line_count: 140 }, { site_code: "159A", site_name: "SAP Labs India Pvt. Ltd", fill_rate: 52.9, zero_pct: 16.8, line_count: 107 }, { site_code: "138M", site_name: "Euroschool Foundation", fill_rate: 53.1, zero_pct: 10.3, line_count: 29 }, { site_code: "146Z", site_name: "J P Morgan Services India Pvt", fill_rate: 60.4, zero_pct: 5.9, line_count: 222 }, { site_code: "158Y", site_name: "Arm Embedded Technologies", fill_rate: 65.9, zero_pct: 15.7, line_count: 83 }, { site_code: "147R", site_name: "OPAL", fill_rate: 67.1, zero_pct: 23.3, line_count: 116 } ],
  groupPerf: [ { group_id: "111", fill_rate: 69.1, line_count: 70, po_count: 36 }, { group_id: "102", fill_rate: 82.0, line_count: 225, po_count: 36 }, { group_id: "101", fill_rate: 83.8, line_count: 579, po_count: 92 }, { group_id: "106", fill_rate: 85.1, line_count: 824, po_count: 157 }, { group_id: "105", fill_rate: 87.3, line_count: 3324, po_count: 430 }, { group_id: "103", fill_rate: 88.0, line_count: 117, po_count: 33 }, { group_id: "108", fill_rate: 88.1, line_count: 146, po_count: 66 }, { group_id: "114", fill_rate: 88.3, line_count: 191, po_count: 39 }, { group_id: "113", fill_rate: 91.4, line_count: 742, po_count: 121 }, { group_id: "107", fill_rate: 92.5, line_count: 3220, po_count: 218 }, { group_id: "112", fill_rate: 96.9, line_count: 97, po_count: 37 }, { group_id: "109", fill_rate: 98.3, line_count: 65, po_count: 9 } ],
  aiSignals: [ { severity: "critical", title: "Single supplier controls entire KN region", description: "Shree Maruti Integrated is the only vendor across all 33 KN sites — 3,606 lines at 73.2% fill rate. Any disruption causes simultaneous failure across the region.", metric: "33 sites at risk" }, { severity: "critical", title: "Two vendors hold 73% of open quantity", description: "Raj Enterprises (132K units) and Roti Factory (129K units) together account for 261,660 undelivered units. Both are at maximum overdue age.", metric: "261K units" }, { severity: "critical", title: "1,403 open lines have no reason code", description: "99.9% of overdue open PO lines have zero structured explanation. The WhatsApp system will be the first time this data is ever captured.", metric: "1,403 lines" }, { severity: "warning", title: "Google cluster is a client-level risk", description: "Four of the five worst-performing sites are Google accounts with fill rates of 10.5%, 20.9%, 34.9%, and 39.7%. This is a relationship risk, not just an ops issue.", metric: "4 Google sites" }, { severity: "warning", title: "Purchasing group 111 underperforming by 20 points", description: "Group 111 fill rate is 69.1% — 20 points below the best-performing groups. Spread across 26 suppliers, suggesting a coordinator process gap.", metric: "69.1% fill rate" }, { severity: "warning", title: "12 suppliers have delivered nothing", description: "KAAPI Machines, Bizchef Ventures, Handy Online Solutions and 9 others have 0% fill across all PO lines. Relationship status unknown.", metric: "12 suppliers" }, { severity: "insight", title: "Service POs are structurally underperforming", description: "Service POs fill at 74% — 16 points below emergency POs. They receive the same follow-up as regular orders but likely need a different escalation path.", metric: "74% fill rate" }, { severity: "insight", title: "Emergency POs outperform regular POs", description: "Emergency POs achieve 90.4% fill vs 88.9% for regular. The gap is in routine follow-up discipline, not supplier capability.", metric: "+1.5% vs regular" }, { severity: "ready", title: "Phone numbers exist for 98 of 99 vendors", description: "WhatsApp number mapping and vendor classification are the only remaining blockers. Infrastructure is nearly ready for pilot launch.", metric: "98/99 vendors" } ],
  dataReadiness: [ { field: "WhatsApp numbers", status: "missing", detail: "Not collected for any vendor" }, { field: "Vendor classification", status: "missing", detail: "Perishable/non-perishable not maintained" }, { field: "SPOC mapping", status: "missing", detail: "Vendor to coordinator mapping absent" }, { field: "Exception / reason codes", status: "missing", detail: "99.97% blank in open PO data" }, { field: "GRN confirmed flag", status: "missing", detail: "Not present in PO data feed" }, { field: "Language preference", status: "missing", detail: "No field maintained in vendor master" }, { field: "Contact phone numbers", status: "partial", detail: "98 of 99 vendors have numbers" }, { field: "Email addresses", status: "ready", detail: "All 99 vendors have email" }, { field: "Vendor active status", status: "ready", detail: "All 99 confirmed active" } ]
};

const barLabelsPlugin = {
  id: 'barLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#334155'; // Dark text for light mode UI
    if (chart.config.type === 'bar') {
        chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            meta.data.forEach((bar, index) => {
                const data = dataset.data[index];
                if(data !== null && data !== undefined) {
                   let text = String(data);
                   const isPct = chart.options?.plugins?.barLabels?.isPercentage;
                   if (isPct) text += '%';
                   ctx.fillText(text, bar.x, bar.y - 4);
                }
            });
        });
    }
  }
};
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, ChartTooltip, ChartLegend, DoughnutController, BarController, barLabelsPlugin);

/* KPI Bar Block */
const KPI_SKELETON = () => (
  <div className="bg-white p-5 rounded-[1.25rem] shadow-sm border border-slate-100 flex flex-col justify-between h-[120px] animate-pulse">
    <div className="flex items-center gap-2">
      <div className="w-[18px] h-[18px] bg-slate-100 rounded text-transparent">_</div>
      <div className="w-20 h-4 bg-slate-100 rounded"></div>
    </div>
    <div>
      <div className="w-16 h-8 bg-slate-100 rounded mb-2"></div>
      <div className="w-24 h-3 bg-slate-100 rounded"></div>
    </div>
  </div>
);

const ErrorCard = ({ onRetry }) => (
  <div className="bg-white p-5 rounded-[1.25rem] shadow-sm border border-red-500/20 flex flex-col justify-center items-center h-[120px] gap-2">
    <div className="flex items-center gap-1.5 text-red-500">
      <span className="material-symbols-outlined text-[18px]">warning</span>
      <span className="text-sm font-semibold">Failed to load</span>
    </div>
    <button onClick={onRetry} className="mt-1 px-4 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg transition-colors border border-red-200 hover:bg-red-100">
      Retry
    </button>
  </div>
);

const KPI = ({ icon, iconColor, bgShape, label, value, valueColor, subLabel, isDimmed }) => (
  <div className={`bg-white p-5 rounded-[1.25rem] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.02)] border border-slate-100/80 flex flex-col justify-between h-[120px] transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 cursor-default ${isDimmed ? 'opacity-50 hover:translate-y-0 hover:shadow-sm' : ''}`}>
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center ${bgShape}`}>
          <span className={`material-symbols-outlined text-[18px] ${iconColor}`}>{icon}</span>
      </div>
      <span className="text-[13px] font-bold text-slate-500 tracking-tight">{label}</span>
    </div>
    <div>
      <div className="flex items-baseline">
        <h3 className={`text-[32px] font-black tracking-tight leading-none ${valueColor}`}>
          {value}
        </h3>
      </div>
      <p className="text-[12px] font-medium text-slate-400 mt-1">{subLabel}</p>
    </div>
  </div>
);

/* LIGHT CARD WRAPPER FOR CHARTS (Match App UI) */
const LightCard = ({ title, subtitle, state, onRetry, heightClass = 'h-[380px]', noPad = false, children }) => {
   return (
      <div className={`bg-white rounded-[1.25rem] shadow-sm border border-slate-100 flex flex-col overflow-hidden ${heightClass}`}>
         <div className="p-5 border-b border-slate-100 shrink-0">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{title}</h3>
            {subtitle && <p className="text-[10px] font-bold text-slate-500 tracking-wider mt-1">{subtitle}</p>}
         </div>
         <div className={`flex-1 relative flex flex-col ${noPad ? '!p-0' : 'p-6'}`}>
            {state.loading && (
               <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex items-center justify-center p-6">
                  <div className="w-full h-full bg-slate-100 animate-pulse rounded-xl border border-slate-200/50"></div>
               </div>
            )}
            {state.error && !state.loading && (
               <div className="absolute inset-0 bg-white z-20 flex flex-col items-center justify-center p-6 gap-3 border border-red-500/20 rounded-b-[1.25rem]">
                  <div className="flex items-center gap-1.5 text-red-500">
                     <span className="material-symbols-outlined text-[20px]">warning</span>
                     <span className="text-sm font-semibold">Failed to load</span>
                  </div>
                  <button onClick={onRetry} className="px-5 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-black uppercase tracking-widest rounded-xl transition-colors border border-red-200">
                     Retry
                  </button>
               </div>
            )}
            {!state.loading && !state.error && state.data && children}
         </div>
      </div>
   );
};

/* CHARTS & COMPONENTS */
const DeliveryChart = ({ data }) => {
   const total = data.full + data.partial + data.zero;
   const cData = {
      labels: ['Full', 'Partial', 'Zero'],
      datasets: [{
         data: [data.full, data.partial, data.zero],
         backgroundColor: ['#0f172a', '#475569', '#94a3b8'],
         borderColor: '#ffffff',
         borderWidth: 2,
         hoverOffset: 4
      }]
   };
   return (
      <div className="flex flex-col h-full">
         <div className="relative h-[160px] flex-1">
             <Doughnut data={cData} options={{ cutout: '75%', plugins: { legend: { display: false } }, maintainAspectRatio: false }} />
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-3xl font-black text-slate-900 leading-none">{total}</span>
                 <span className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">total lines</span>
             </div>
         </div>
         <div className="flex flex-wrap justify-between gap-2 mt-6 border-t border-slate-100 pt-5">
             {cData.labels.map((L, i) => {
                 const pct = Math.round((cData.datasets[0].data[i]/total)*100);
                 return (
                     <div key={L} className="flex items-center gap-2">
                         <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor: cData.datasets[0].backgroundColor[i]}}></div>
                         <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">{L}</span>
                         <span className="text-xs text-slate-900 font-black">{cData.datasets[0].data[i]} ({pct}%)</span>
                     </div>
                 )
             })}
         </div>
      </div>
   );
}

const FillRatePoTypeChart = ({ data }) => {
   const cData = {
      labels: data.map(d => [d.po_type, `${d.line_count} lines`]),
      datasets: [{
         data: data.map(d => d.fill_rate),
         backgroundColor: ['#020617', '#0f172a', '#1e293b', '#334155'],
         borderRadius: 6,
         borderSkipped: false
      }]
   };
   const opts = {
      plugins: { legend: { display: false }, barLabels: { isPercentage: true } },
      maintainAspectRatio: false,
      scales: {
         y: { min: 60, max: 100, ticks: { color: '#64748b', font: { size: 10, weight: 'bold' }, callback: v => v + '%' }, grid: { color: '#f1f5f9' } },
         x: { ticks: { color: '#64748b', font: { size: 10, weight: 'bold' } }, grid: { display: false } }
      }
   };
   return <Bar data={cData} options={opts} />;
}

const RegionFillChart = ({ data }) => {
  return (
    <div className="flex flex-col gap-6 overflow-y-auto pr-2 no-scrollbar h-full justify-center">
       {data.map(d => {
          let color = 'bg-slate-800 drop-shadow-sm';
          if(d.fill_rate < 75) color = 'bg-slate-900 drop-shadow-sm';
          else if(d.fill_rate < 90) color = 'bg-slate-700 drop-shadow-sm';

          return (
             <div key={d.region} className="flex flex-col">
                <div className="flex justify-between items-end mb-2">
                   <div className="flex items-center gap-3 relative">
                       <span className="text-slate-900 font-black text-sm uppercase">{d.region}</span>
                       {d.region === 'KN' && d.suppliers === 1 && <span className="absolute -top-1 left-12 px-2 py-0.5 bg-red-50 text-red-600 text-[8px] font-black tracking-widest rounded border border-red-200 uppercase shrink-0 whitespace-nowrap">SINGLE SUPPLIER RISK</span>}
                   </div>
                   <span className="text-slate-900 font-black text-sm">{d.fill_rate}%</span>
                </div>
                <div className="w-full bg-slate-100/80 rounded-full h-2 mb-2 overflow-hidden border border-slate-200/40">
                   <div className={`${color} h-full rounded-full transition-all`} style={{width: `${d.fill_rate}%`}}></div>
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{d.lines} lines &middot; {d.suppliers} suppliers &middot; {d.sites} sites</p>
             </div>
          )
       })}
    </div>
  )
}

const PoAgingChart = ({ data }) => {
   const cData = {
      labels: data.map(d => d.bucket.replace('d', ' days')),
      datasets: [{
         data: data.map(d => d.count),
         backgroundColor: ['#475569', '#334155', '#1e293b'],
         borderRadius: 6,
         borderSkipped: false
      }]
   };
   const opts = {
      plugins: { legend: { display: false }, barLabels: { isPercentage: false } },
      maintainAspectRatio: false,
      scales: {
         y: { ticks: { color: '#64748b', font: { size: 10, weight: 'bold' } }, grid: { color: '#f1f5f9' } },
         x: { ticks: { color: '#64748b', font: { size: 10, weight: 'bold' } }, grid: { display: false } }
      }
   }
   return (
     <div className="relative h-full min-h-[220px]">
        <Bar data={cData} options={opts} />
        <div className="absolute top-[25%] left-[50%] -translate-x-[40%] text-center pointer-events-none">
           <span className="text-[10px] italic text-slate-500 font-medium">&larr; critical recovery window</span>
        </div>
     </div>
   )
}

const SupplierPerfChart = ({ data }) => {
   const cData = {
      labels: data.map(d => {
         if (d.bucket === '0%') return ['0%', 'zero deliveries'];
         return d.bucket;
      }),
      datasets: [{
         data: data.map(d => d.supplier_count),
         backgroundColor: ['#ef4444', '#0f172a', '#1e293b', '#334155', '#475569', '#64748b'],
         borderRadius: 6,
         borderSkipped: false
      }]
   };
   const opts = {
      plugins: { legend: { display: false }, barLabels: { isPercentage: false } },
      maintainAspectRatio: false,
      scales: {
         y: { ticks: { color: '#64748b', font: { size: 10, weight: 'bold' } }, grid: { color: '#f1f5f9' } },
         x: { ticks: { color: (ctx) => ctx.index === 0 ? '#ef4444' : '#64748b', font: { size: 10, weight: 'bold' } }, grid: { display: false } }
      }
   }
   return <Bar data={cData} options={opts} />
}

const TopVendors = ({ data, navigate }) => {
   const maxQty = Math.max(...data.map(d => d.open_qty));
   return (
      <div className="flex flex-col flex-1 divide-y divide-slate-100 overflow-y-auto no-scrollbar">
         {data.map((d, i) => {
            let color = 'bg-slate-700';
            if(i < 2) color = 'bg-slate-900 shadow-sm';
            else if(i < 5) color = 'bg-slate-800';

            return (
               <div key={d.vendor_name} onClick={() => navigate('/vendors')} className="py-4 px-6 hover:bg-slate-50 cursor-pointer transition-colors group">
                  <div className="flex justify-between items-center mb-2">
                     <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-slate-900 font-bold text-sm truncate">{d.vendor_name}</span>
                        {i < 2 && <span className="px-2.5 py-1 bg-red-50 text-red-600 text-[9px] font-black tracking-widest rounded-lg border border-red-200 uppercase shrink-0">HIGH RISK</span>}
                     </div>
                     <span className="text-slate-900 font-black text-sm shrink-0">
                        {d.open_qty >= 1000 ? (d.open_qty/1000).toFixed(1) + 'K' : d.open_qty}
                     </span>
                  </div>
                  <div className="w-full bg-slate-100/80 rounded-full h-[6px] mb-2 overflow-hidden border border-slate-200/40">
                     <div className={`${color} h-full group-hover:brightness-110 transition-all rounded-full drop-shadow-sm`} style={{width: `${(d.open_qty/maxQty)*100}%`}}></div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                     <span>avg {d.avg_days_overdue}d overdue</span>
                     <span>{d.open_lines} lines</span>
                  </div>
               </div>
            )
         })}
      </div>
   )
}

const SitesAttention = ({ data }) => {
   const navigate = useNavigate();
   return (
      <div className="flex flex-col flex-1 divide-y divide-slate-100 overflow-y-auto no-scrollbar">
         {data.map((d, i) => {
            const rank = i + 1;
            let rankColor = 'bg-slate-100 text-slate-500';
            if(rank <= 3) rankColor = 'bg-slate-900 text-white shadow-md';
            else if(rank <= 7) rankColor = 'bg-slate-800 text-white shadow-md';

            let fillBadge = 'bg-slate-100 text-slate-700 border-slate-200/60 shadow-sm';
            if(d.fill_rate < 50) fillBadge = 'bg-slate-800 text-white shadow-sm';
            else if(d.fill_rate <= 75) fillBadge = 'bg-slate-700 text-white shadow-sm';

            const needsBorder = d.fill_rate < 40;

            return (
               <div key={d.site_code} onClick={() => navigate('/orders')} className={`py-4 px-6 hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-5 ${needsBorder ? 'border-l-[4px] border-l-rose-500 pl-[20px]' : 'border-l-[4px] border-l-transparent pl-[20px]'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${rankColor}`}>
                     {rank}
                  </div>
                  <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2.5 mb-1">
                        <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest">{d.site_code}</span>
                        <span className="text-slate-900 font-bold text-sm truncate">{d.site_name}</span>
                     </div>
                     <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{d.zero_pct}% zero delivery &middot; {d.line_count} lines</span>
                  </div>
                  <span className={`px-2.5 py-1 text-[11px] font-black rounded border ${fillBadge} shrink-0`}>
                     {d.fill_rate}%
                  </span>
               </div>
            )
         })}
      </div>
   )
}



const AiSignalsPanel = ({ data, navigate }) => {
  const [expanded, setExpanded] = useState({});
  const toggle = (i) => setExpanded(prev => ({...prev, [i]: !prev[i]}));
  
  const getSeverityConf = (s) => {
     if(s==='critical') return { dot: 'bg-red-500', pill: 'bg-red-50 text-red-600 border-red-200', label: 'CRITICAL', border: 'border-l-[3px] border-red-500' };
     if(s==='warning')  return { dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-600 border-amber-200', label: 'WARNING', border: 'border-l-[3px] border-transparent' };
     if(s==='insight')  return { dot: 'bg-blue-500', pill: 'bg-blue-50 text-blue-600 border-blue-200', label: 'INSIGHT', border: 'border-l-[3px] border-transparent' };
     if(s==='ready')    return { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-600 border-emerald-200', label: 'READY', border: 'border-l-[3px] border-transparent' };
     return { dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-600 border-slate-200', label: 'NOTE', border: 'border-l-[3px] border-transparent' };
  }

  return (
     <div className="flex flex-col py-2">
       {data.map((sig, i) => {
           const conf = getSeverityConf(sig.severity);
           const prev = i > 0 ? data[i-1].severity : sig.severity;
           let showDivider = prev !== sig.severity;
           
           return (
              <React.Fragment key={i}>
                {showDivider && <div className="h-[1px] bg-slate-100 my-3 mx-6"></div>}
                <div onClick={() => toggle(i)} className={`py-4 pr-6 pl-5 mx-3 hover:bg-slate-50 transition-colors cursor-pointer rounded-xl select-none ${conf.border}`}>
                   <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
                      <div className={`w-2 h-2 rounded-full ${conf.dot} shrink-0 hidden md:block ml-2`}></div>
                      <span className={`px-2 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg border ${conf.pill} shrink-0 w-[80px] text-center shadow-sm`}>{conf.label}</span>
                      <span className="text-slate-900 font-bold text-[13px] shrink-0">{sig.title}</span>
                      <span className="text-slate-500 text-[13px] truncate flex-1 block md:inline-block font-medium">{!expanded[i] ? sig.description : ''}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0 bg-white shadow-sm">{sig.metric}</span>
                   </div>
                   {expanded[i] && (
                      <div className="mt-4 md:ml-[132px] pr-4 pb-2">
                         <p className="text-slate-600 text-[13px] leading-relaxed font-medium">{sig.description}</p>
                         <button onClick={(e) => { e.stopPropagation(); navigate(sig.severity === 'critical' ? '/orders' : '/dashboard') }} className="mt-4 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors shadow-sm">
                             Take Action &rarr;
                         </button>
                      </div>
                   )}
                </div>
              </React.Fragment>
           )
       })}
     </div>
  );
}


/* MAIN DASHBOARD PAGE */
export default function DataExplorer() {
  const navigate = useNavigate();

  const [lastUpdated, setLastUpdated] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialise directly from mock data — Edge Functions not yet deployed on Supabase.
  // Swap this back to API calls once the /functions/v1/analytics/* endpoints are live.
  const [apis, setApis] = useState(() => {
    const entries = {};
    Object.keys(MOCK_DATA).forEach(k => {
      entries[k] = { data: MOCK_DATA[k], loading: false, error: false };
    });
    return entries;
  });

  const fetchEndpoint = (key) => {
    // Re-load from mock data on individual retry
    setApis(prev => ({...prev, [key]: { data: MOCK_DATA[key] ?? null, loading: false, error: !MOCK_DATA[key] }}));
  };

  const fetchAll = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate a brief refresh animation
    await new Promise(r => setTimeout(r, 600));
    setApis(() => {
      const entries = {};
      Object.keys(MOCK_DATA).forEach(k => {
        entries[k] = { data: MOCK_DATA[k], loading: false, error: false };
      });
      return entries;
    });
    setIsRefreshing(false);
    setLastUpdated(new Date().toLocaleTimeString('en-US', { hour12: false }));
  }, []);

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString('en-US', { hour12: false }));
  }, []);

  const kpiData = apis.overview.data;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* App Shell Header */}
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

          <div className="flex items-center gap-3 ml-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-slate-800">Alex Rivera</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Ops Manager</p>
            </div>
            <img 
               alt="User profile" 
               className="w-9 h-9 rounded-full border-2 border-slate-200 shadow-sm" 
               src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8ov37m6Ru1jtLXavUm2Wv7-q8IqttbDcSU5OJzUCKT6ZmPdV8o10Gkm2bzBBlUkUAfR7nPEInOWhBPKK0JB-n56VPQC2sJvCZVr9a9eqzujzWSusoB7Pqo3Zl5PSfDCMpzoPbo0JZh5CHcjqc7lATQ1qKELXGJ7WeD5DB3SN3FaTJ4H9VBzP_Fvv51A3UPXtSYL_rtKoK2k8LRfiEklf60DY9c3Hul2Ue3yIjaHQmSa85wLfALExg-6xFvgM8lPDR6WQOIutN4I6d" 
            />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8 no-scrollbar pb-24">
          <div className="max-w-[1600px] mx-auto w-full space-y-8">
            
            {/* Page Title & Top actions */}
            <div className="flex justify-between items-end">
               <div>
                  <h2 className="text-3xl font-black text-slate-900 font-headline tracking-tighter uppercase leading-none">
                     DATA EXPLORER
                  </h2>
                  <p className="text-slate-400 font-medium mt-1.5 text-sm">
                     AI-powered procurement intelligence · Live data
                  </p>
               </div>
               
               <div className="flex items-center gap-4">
                  {lastUpdated && (
                     <span className="text-xs font-medium text-slate-500">
                        Last updated: {lastUpdated}
                     </span>
                  )}
                  
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 shadow-sm">
                      <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      Live
                  </span>
                  
                  <button 
                     onClick={fetchAll} 
                     disabled={isRefreshing}
                     className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all disabled:opacity-50 ml-2 shadow-sm"
                  >
                     <span className={`material-symbols-outlined text-[16px] ${isRefreshing ? 'animate-spin' : ''}`}>sync</span>
                     {isRefreshing ? 'Syncing…' : 'Refresh'}
                  </button>

               </div>
            </div>

            {/* SECTION 1: KPI Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {(apis.overview.loading || apis.overview.error) ? (
                 <>
                   {[1, 2, 3, 4, 5].map(i => apis.overview.error && !apis.overview.loading ? <ErrorCard key={i} onRetry={() => fetchEndpoint('overview')} /> : <KPI_SKELETON key={i} />)}
                 </>
              ) : apis.overview.data ? (
                <>
                  <KPI 
                    icon="check_circle" iconColor="text-white" bgShape="bg-slate-900"
                    label="Fill Rate" value={`${kpiData.overall_fill_rate}%`} valueColor="text-slate-900" 
                    subLabel={`${kpiData.full_lines} full · ${kpiData.partial_lines} partial`} 
                  />
                  <KPI 
                    icon="alarm" iconColor="text-white" bgShape="bg-slate-900"
                    label="Overdue Lines" value={kpiData.overdue_lines} valueColor="text-slate-900" 
                    subLabel={`avg ${kpiData.avg_days_overdue} days late`} 
                  />
                  <KPI 
                    icon="file_copy" iconColor="text-white" bgShape="bg-slate-900"
                    label="Open POs" value={kpiData.open_pos_count} valueColor="text-slate-900" 
                    subLabel={`across ${kpiData.open_vendors_count} vendors`} 
                  />
                  <KPI 
                    icon="warning" iconColor="text-white" bgShape="bg-slate-900"
                    label="Zero Deliveries" value={kpiData.zero_lines} valueColor="text-slate-900" 
                    subLabel={`${kpiData.zero_pct}% of all lines`} 
                  />
                  <KPI 
                    icon="chat_bubble" iconColor="text-slate-400" bgShape="bg-slate-800"
                    label="Response Rate" value="—" valueColor="text-slate-400" 
                    subLabel="Activates with WhatsApp" isDimmed={true} 
                  />
                </>
              ) : null}
            </div>

            {/* SECTION 2: Three Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <LightCard title="Delivery status" state={apis.deliveryStatus} onRetry={() => fetchEndpoint('deliveryStatus')}>
                   <DeliveryChart data={apis.deliveryStatus.data} />
               </LightCard>
               <LightCard title="Fill rate by PO type" state={apis.fillRateByType} onRetry={() => fetchEndpoint('fillRateByType')}>
                   <FillRatePoTypeChart data={apis.fillRateByType.data} />
               </LightCard>
               <LightCard title="Region fill rate" state={apis.regionComparison} onRetry={() => fetchEndpoint('regionComparison')}>
                   <RegionFillChart data={apis.regionComparison.data} />
               </LightCard>
            </div>

            {/* SECTION 3: Two Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
               <div className="lg:col-span-3">
                   <LightCard title="Open PO aging" subtitle="All lines past delivery date · no GRN received" state={apis.openPoAging} onRetry={() => fetchEndpoint('openPoAging')}>
                       <PoAgingChart data={apis.openPoAging.data} />
                   </LightCard>
               </div>
               <div className="lg:col-span-2">
                   <LightCard title="Supplier performance tiers" state={apis.supplierFillDst} onRetry={() => fetchEndpoint('supplierFillDst')}>
                       <SupplierPerfChart data={apis.supplierFillDst.data} />
                   </LightCard>
               </div>
            </div>

            {/* SECTION 4: Two Panels Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <LightCard title="Vendors with highest open quantity" subtitle="Undelivered stock · past delivery date" noPad state={apis.topVendorsQty} onRetry={() => fetchEndpoint('topVendorsQty')} heightClass="h-[420px]">
                   <TopVendors data={apis.topVendorsQty.data} navigate={navigate} />
               </LightCard>
               <LightCard title="Sites needing attention" subtitle="Ranked by fill rate · bottom 10" noPad state={apis.siteFillRate} onRetry={() => fetchEndpoint('siteFillRate')} heightClass="h-[420px]">
                   <SitesAttention data={apis.siteFillRate.data} navigate={navigate} />
               </LightCard>
            </div>



            {/* SECTION 6: Insights Panel */}
            <LightCard title="Insights" subtitle="Automatically detected patterns and risk alerts" noPad state={apis.aiSignals} onRetry={() => fetchEndpoint('aiSignals')} heightClass="auto">
                <AiSignalsPanel data={apis.aiSignals.data} navigate={navigate} />
            </LightCard>


          </div>
        </div>
      </main>


      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .font-headline { font-family: 'Outfit', sans-serif; }
      `}</style>
    </div>
  );
}
