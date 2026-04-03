import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabase';

const Orders = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  // Filter states
  const [filterVendor, setFilterVendor] = useState('All Vendors');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Effect to handle incoming vendor filter from navigation state
  useEffect(() => {
    if (location.state?.vendorFilter) {
      setFilterVendor(location.state.vendorFilter);
      setCurrentPage(1);
    }
  }, [location.state]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.from('open_po_detail').select('*');

      if (error) throw error;

      const poMap = new Map();

      (data || []).forEach(item => {
        const po_num = item.po_num;
        if (!poMap.has(po_num)) {
           poMap.set(po_num, {
             po_num,
             vendor: item.vendor_name,
             delivery_date: item.delivery_date,
             status: item.status || 'Open',
             po_date: item.po_date,
             itemsCount: 0
           });
        }
        poMap.get(po_num).itemsCount++;
      });

      setOrders(Array.from(poMap.values()));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const vendorsList = ['All Vendors', ...new Set(orders.map(o => o.vendor))];

  const filteredOrders = orders.filter(po => {
    const matchesSearch = (po.po_num?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        (po.vendor?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesVendor = filterVendor === 'All Vendors' || po.vendor === filterVendor;
    
    let matchesDate = true;
    if (filterDateFrom && po.po_date) {
      matchesDate = matchesDate && (new Date(po.po_date) >= new Date(filterDateFrom));
    }
    if (filterDateTo && po.po_date) {
      matchesDate = matchesDate && (new Date(po.po_date) <= new Date(filterDateTo));
    }

    return matchesSearch && matchesVendor && matchesDate;
  });

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="flex justify-between items-center h-16 px-8 w-full bg-white dark:bg-slate-900 border-b border-outline-variant/10 shadow-sm z-10">
          <div className="flex items-center gap-8">
            <h1 className="text-lg font-bold tracking-tighter text-slate-900 dark:text-slate-100 font-headline uppercase leading-none">Enterprise Procurement</h1>
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
            <img alt="Profile" className="w-8 h-8 rounded-full border-2 border-primary/20 shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBpRZ82Z9vlt8SyVdsbUz4q-XFlmZojEzyvWp90xVibsAElJPHW_meJckQWZJtoPzP5MJhSZLiW07y47QlgPdvId2zdjsImRevGIZD_iKx2C2yIoMsdsI26776buMmB2IZw_TcFkmbdrXj5d5ipKaIrZOei16-LsfiINHvvt43OGveovU-XUhhNDvQdJjJm6NRCjPfa6TU13zSUWI7Y-x_kXNhBC3H4m_Bn1Y5HZHFACgA_5nb0ORR6Upj4N-Mxe3xekbptlc3YMSes" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-slate-950 p-8 no-scrollbar">
          <div className="max-w-6xl mx-auto w-full">
            <div className="flex justify-between items-end mb-8">
              <div className="space-y-1">
                <h2 className="text-4xl font-black text-slate-900 dark:text-white font-headline tracking-tighter uppercase leading-none">Active Pipeline</h2>
                <p className="text-slate-500 font-medium tracking-tight">Real-time inventory synchronization for open purchase orders.</p>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-5 gap-4 mb-8 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="space-y-1.5 col-span-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-label">Search Partners</label>
                <select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs py-3 px-4 focus:ring-0 cursor-pointer" value={filterVendor} onChange={(e) => {setFilterVendor(e.target.value); setCurrentPage(1);}}>
                  {vendorsList.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 col-span-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-label">Timeline Start</label>
                <input className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs py-3 px-4 focus:ring-0" type="date" value={filterDateFrom} onChange={(e) => {setFilterDateFrom(e.target.value); setCurrentPage(1);}} />
              </div>
              <div className="space-y-1.5 col-span-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-label">Timeline End</label>
                <input className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs py-3 px-4 focus:ring-0" type="date" value={filterDateTo} onChange={(e) => {setFilterDateTo(e.target.value); setCurrentPage(1);}} />
              </div>
              <div className="flex items-end col-span-2">
                <button onClick={() => {setFilterVendor('All Vendors'); setFilterDateFrom(''); setFilterDateTo(''); setSearchTerm(''); setCurrentPage(1);}} className="w-full h-[46px] bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all">Reset Analysis Filters</button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <table className="w-full border-collapse">
                <thead className="bg-[#F8FAFC]/50 dark:bg-slate-800/10 border-b border-slate-50 dark:border-slate-800">
                  <tr>
                    <th className="text-left px-10 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400">PO Number</th>
                    <th className="text-left px-10 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Supplier Entity</th>
                    <th className="text-left px-10 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Delivery ETD</th>
                    <th className="text-right px-10 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {loading ? (
                    [...Array(6)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={4} className="px-10 py-6"><div className="h-10 bg-slate-50 dark:bg-slate-800/50 rounded-2xl"></div></td></tr>)
                  ) : error ? (
                    <tr><td colSpan={4} className="px-10 py-16 text-center text-red-500 font-black uppercase tracking-widest text-xs">{error}</td></tr>
                  ) : paginatedOrders.length === 0 ? (
                    <tr><td colSpan={4} className="px-10 py-16 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No document telemetry found for this context.</td></tr>
                  ) : (
                    paginatedOrders.map((po, idx) => (
                      <tr 
                        key={po.po_num + idx} 
                        onClick={() => navigate('/orders/' + po.po_num)} 
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/5 transition-all cursor-pointer group border-l-4 border-transparent hover:border-primary active:bg-slate-100"
                      >
                        <td className="px-10 py-8">
                             <Link 
                                to={`/orders/${po.po_num}`} 
                                className="text-sm font-black text-slate-900 dark:text-white tracking-widest hover:text-primary transition-colors underline decoration-2 underline-offset-4 decoration-primary/20 hover:decoration-primary"
                                onClick={(e) => e.stopPropagation()}
                             >
                                 #{po.po_num}
                             </Link>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-700 dark:text-slate-200 tracking-tight">{po.vendor}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Verified Partner</span>
                          </div>
                        </td>
                        <td className="px-10 py-8 text-sm font-black text-slate-400 italic">{po.delivery_date || 'TBD'}</td>
                        <td className="px-10 py-8 text-right">
                             <div className="inline-flex items-center gap-3 px-5 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-100 dark:border-blue-800/50 text-[10px] font-black uppercase tracking-widest">
                                 {po.itemsCount} Items
                             </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {!loading && (
                <div className="p-10 bg-[#F8FAFC]/50 dark:bg-slate-800/5 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-300">
                  <span>Document Records: {filteredOrders.length}</span>
                  <div className="flex gap-4">
                    <button disabled={currentPage === 1} onClick={(e) => {e.stopPropagation(); setCurrentPage(p => p - 1)}} className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:text-primary transition-all disabled:opacity-20 disabled:cursor-not-allowed group">
                        <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">west</span> Previous
                    </button>
                    <button disabled={currentPage >= totalPages} onClick={(e) => {e.stopPropagation(); setCurrentPage(p => p + 1)}} className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:text-primary transition-all disabled:opacity-20 disabled:cursor-not-allowed group">
                        Next <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">east</span>
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
      `}} />
    </div>
  );
};

export default Orders;
