import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabase';

const Orders = () => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLineItems, setShowLineItems] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  // Filter states
  const [filterVendor, setFilterVendor] = useState('All Vendors');
  const [filterStatus, setFilterStatus] = useState('Any Status');
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

      const { data: openData, error: e1 } = await supabase.from('open_po_detail').select('*');
      const { data: closedData, error: e2 } = await supabase.from('purchase_order_data').select('*');

      if (e1 || e2) throw e1 || e2;

      const poMap = new Map();

      (closedData || []).forEach(item => {
        const po_num = item.purchasing_document;
        if (!poMap.has(po_num)) {
          poMap.set(po_num, {
            po_num,
            vendor: item.vendor_name,
            delivery_date: item.delivery_date,
            status: item.status || 'Close',
            po_date: item.document_date,
            origin: 'purchase_order_data',
            items: []
          });
        }
        poMap.get(po_num).items.push({
          item_num: item.item,
          article: item.article,
          description: item.short_text,
          quantity: item.order_quantity,
          received: item.quantity_received,
          unit: item.uom
        });
      });

      (openData || []).forEach(item => {
        const po_num = item.po_num;
        if (!poMap.has(po_num) || poMap.get(po_num).status === 'Close') {
           poMap.set(po_num, {
             po_num,
             vendor: item.vendor_name,
             delivery_date: item.delivery_date,
             status: item.status || 'Open',
             po_date: item.po_date,
             origin: 'open_po_detail',
             items: []
           });
        }
        poMap.get(po_num).items.push({
          item_num: item.po_item,
          article: item.article_code,
          description: item.article_description,
          quantity: item.po_quantity,
          received: item.delivered_quantity,
          unit: item.unit
        });
      });

      setOrders(Array.from(poMap.values()));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedOrder) {
      setIsSidebarOpen(true);
      setShowLineItems(false); // Reset dropdown when selecting new PO
    } else {
      setIsSidebarOpen(false);
    }
  }, [selectedOrder]);

  const vendorsList = ['All Vendors', ...new Set(orders.map(o => o.vendor))];
  const statusList = ['Any Status', 'Open', 'Close', 'Delayed'];

  const filteredOrders = orders.filter(po => {
    const matchesSearch = (po.po_num?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        (po.vendor?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesVendor = filterVendor === 'All Vendors' || po.vendor === filterVendor;
    const matchesStatus = filterStatus === 'Any Status' || po.status === filterStatus;
    
    let matchesDate = true;
    if (filterDateFrom && po.po_date) {
      matchesDate = matchesDate && (new Date(po.po_date) >= new Date(filterDateFrom));
    }
    if (filterDateTo && po.po_date) {
      matchesDate = matchesDate && (new Date(po.po_date) <= new Date(filterDateTo));
    }

    return matchesSearch && matchesVendor && matchesStatus && matchesDate;
  });

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="flex justify-between items-center h-16 px-8 w-full bg-white dark:bg-slate-900 border-b border-outline-variant/10">
          <div className="flex items-center gap-8">
            <h1 className="text-lg font-bold tracking-tighter text-slate-900 dark:text-slate-100 font-headline">Enterprise Procurement</h1>
            <div className="relative group">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <span className="material-symbols-outlined text-sm">search</span>
              </span>
              <input 
                className="bg-surface-container-low border-none rounded-full pl-10 pr-4 py-1.5 text-sm w-72 focus:ring-2 focus:ring-primary/20 transition-all font-medium" 
                placeholder="Search PO or Vendor..." 
                type="text" 
                value={searchTerm}
                onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <img alt="Profile" className="w-8 h-8 rounded-full border-2 border-primary-fixed shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBpRZ82Z9vlt8SyVdsbUz4q-XFlmZojEzyvWp90xVibsAElJPHW_meJckQWZJtoPzP5MJhSZLiW07y47QlgPdvId2zdjsImRevGIZD_iKx2C2yIoMsdsI26776buMmB2IZw_TcFkmbdrXj5d5ipKaIrZOei16-LsfiINHvvt43OGveovU-XUhhNDvQdJjJm6NRCjPfa6TU13zSUWI7Y-x_kXNhBC3H4m_Bn1Y5HZHFACgA_5nb0ORR6Upj4N-Mxe3xekbptlc3YMSes" />
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden relative">
          <section className="flex-1 overflow-y-auto bg-surface p-8 no-scrollbar">
            <div className="max-w-6xl mx-auto w-full">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white font-headline tracking-tighter uppercase">Purchase Orders</h2>
                  <p className="text-slate-500 font-medium mt-1">Refined list of procurement documents and delivery status.</p>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-6 gap-4 mb-6 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 font-label">Vendor</label>
                  <select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs py-2.5 focus:ring-0" value={filterVendor} onChange={(e) => {setFilterVendor(e.target.value); setCurrentPage(1);}}>
                    {vendorsList.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 font-label">Status</label>
                  <select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs py-2.5 focus:ring-0" value={filterStatus} onChange={(e) => {setFilterStatus(e.target.value); setCurrentPage(1);}}>
                    {statusList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 font-label">From Date</label>
                  <input className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs py-2.5 focus:ring-0" type="date" value={filterDateFrom} onChange={(e) => {setFilterDateFrom(e.target.value); setCurrentPage(1);}} />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 font-label">To Date</label>
                  <input className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs py-2.5 focus:ring-0" type="date" value={filterDateTo} onChange={(e) => {setFilterDateTo(e.target.value); setCurrentPage(1);}} />
                </div>
                <div className="flex items-end col-span-2">
                  <button onClick={() => {setFilterVendor('All Vendors'); setFilterStatus('Any Status'); setFilterDateFrom(''); setFilterDateTo(''); setSearchTerm(''); setCurrentPage(1);}} className="w-full bg-primary/10 text-primary py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-primary/20 transition-all">Clear All</button>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <table className="w-full border-collapse">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/10">
                    <tr>
                      <th className="text-left px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">PO Number</th>
                      <th className="text-left px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Vendor Entity</th>
                      <th className="text-left px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Delivery</th>
                      <th className="text-left px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loading ? (
                      [...Array(5)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={4} className="px-8 py-6 flex gap-4"><div className="h-10 grow bg-slate-50 dark:bg-slate-800/50 rounded-2xl"></div></td></tr>)
                    ) : error ? (
                      <tr><td colSpan={4} className="px-8 py-12 text-center text-error font-bold">{error}</td></tr>
                    ) : paginatedOrders.length === 0 ? (
                      <tr><td colSpan={4} className="px-8 py-12 text-center text-slate-400 font-medium">No records found.</td></tr>
                    ) : (
                      paginatedOrders.map((po, idx) => (
                        <tr key={po.po_num + idx} onClick={() => setSelectedOrder(po)} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/5 transition-all cursor-pointer group ${selectedOrder?.po_num === po.po_num ? 'bg-primary/[0.03] dark:bg-primary/[0.07] border-l-4 border-primary' : 'border-l-4 border-transparent'}`}>
                          <td className="px-8 py-6 font-black text-slate-900 dark:text-white text-sm tracking-tighter">#{po.po_num}</td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{po.vendor}</span>
                              <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest">{po.origin.replace(/_/g, ' ')}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-sm font-bold text-slate-500">{po.delivery_date || 'N/A'}</td>
                          <td className="px-8 py-6">
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${po.status === 'Open' ? 'bg-blue-50 text-blue-600 border-blue-100' : po.status === 'Delayed' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>{po.status}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {!loading && (
                  <div className="p-8 bg-slate-50/30 dark:bg-slate-800/5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>Showing {paginatedOrders.length} of {filteredOrders.length} Units</span>
                    <div className="flex gap-3">
                      <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2.5 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-20 active:scale-90"><span className="material-symbols-outlined text-sm">west</span></button>
                      <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2.5 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-20 active:scale-90"><span className="material-symbols-outlined text-sm">east</span></button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Sidebar */}
          <aside className={`fixed right-0 top-0 h-full w-[480px] bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 z-[70] flex flex-col shadow-2xl transition-transform duration-500 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            {selectedOrder && (
              <>
                <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/30">
                  <div className="space-y-4">
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-[9px] font-black uppercase tracking-widest">Document Intelligence</span>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white font-headline leading-tight tracking-tighter">Order Context</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">PO: {selectedOrder.po_num}</p>
                  </div>
                  <button onClick={() => setSelectedOrder(null)} className="p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-primary rounded-2xl shadow-sm transition-all active:scale-90"><span className="material-symbols-outlined">close</span></button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-10 space-y-10">
                  <div className="grid grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/10 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SKU Count</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white">{selectedOrder.items.length}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pipeline State</p>
                      <p className={`text-lg font-black uppercase tracking-tight ${selectedOrder.status === 'Open' ? 'text-primary' : 'text-emerald-500'}`}>{selectedOrder.status}</p>
                    </div>
                  </div>

                  {/* Line Items Accordion */}
                  <div className="space-y-4">
                    <button 
                      onClick={() => setShowLineItems(!showLineItems)}
                      className="w-full flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 group hover:border-primary/30 transition-all active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${showLineItems ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                          <span className="material-symbols-outlined">list_alt</span>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-black text-slate-900 dark:text-white">View Line Items</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{selectedOrder.items.length} item(s) found</p>
                        </div>
                      </div>
                      <span className={`material-symbols-outlined transition-transform duration-300 ${showLineItems ? 'rotate-180' : ''}`}>expand_more</span>
                    </button>

                    <div className={`space-y-4 overflow-hidden transition-all duration-500 ${showLineItems ? 'max-h-[600px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="p-6 bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800 rounded-[1.5rem]">
                          <div className="flex justify-between items-start mb-4">
                            <p className="text-xs font-black text-slate-900 dark:text-white">Line #{item.item_num || idx + 1}</p>
                            <span className="text-[9px] font-black px-2 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm">{item.unit || 'EA'}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{item.article || 'Ref: No Code'}</p>
                          <p className="text-[10px] font-medium text-slate-500 mb-4">{item.description}</p>
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div><p className="text-[9px] text-slate-400 font-bold uppercase">Ordered</p><p className="text-xs font-black">{item.quantity}</p></div>
                            <div><p className="text-[9px] text-slate-400 font-bold uppercase">Received</p><p className="text-xs font-black text-emerald-500">{item.received}</p></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-10 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
                  <button className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm tracking-tight">Sync Data Now</button>
                </div>
              </>
            )}
          </aside>

          {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-[65]" onClick={() => setSelectedOrder(null)}></div>}
        </div>
      </main>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .font-headline { font-family: 'Outfit', sans-serif; }
      `}</style>
    </div>
  );
};

export default Orders;
