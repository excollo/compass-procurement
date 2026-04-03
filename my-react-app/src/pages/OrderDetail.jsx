import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabase';

const OrderDetail = () => {
    const { poNum } = useParams();
    const navigate = useNavigate();
    const [poItems, setPoItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPODetail = async () => {
            try {
                setLoading(true);
                setError(null);
                const { data, error } = await supabase
                    .from('open_po_detail')
                    .select('*')
                    .eq('po_num', poNum)
                    .order('po_item', { ascending: true });

                if (error) throw error;
                setPoItems(data || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPODetail();
    }, [poNum]);

    if (loading) {
        return (
            <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
                <Sidebar />
                <div className="flex-1 p-10 space-y-8 animate-pulse">
                    <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl w-1/4"></div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
                        <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
                    </div>
                    <div className="grid grid-cols-5 gap-4">
                        {[...Array(5)].map((_, i) => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>)}
                    </div>
                    <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-[3rem]"></div>
                </div>
            </div>
        );
    }

    if (error || poItems.length === 0) {
        return (
            <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
                <Sidebar />
                <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                    <div className="bg-white dark:bg-slate-900 p-12 rounded-[3rem] shadow-xl border border-slate-100 dark:border-slate-800 max-w-lg">
                        <span className="material-symbols-outlined text-red-500 text-6xl mb-6">inventory_2</span>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                            {error ? 'System Sync Failure' : 'Document Not Found'}
                        </h3>
                        <p className="text-slate-500 font-medium mt-4 mb-8">
                            {error || "We couldn't locate any line items indexed for this Purchase Order in our active pipeline."}
                        </p>
                        <Link to="/orders" className="block w-full py-4 bg-primary text-white font-black rounded-3xl uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                            ← Return to Purchase Orders
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const header = poItems[0];
    
    // KPI Calculations
    const totalLines = poItems.length;
    const totalOrdered = poItems.reduce((acc, item) => acc + (parseFloat(item.po_quantity) || 0), 0);
    const totalDelivered = poItems.reduce((acc, item) => acc + (parseFloat(item.delivered_quantity) || 0), 0);
    const totalOpen = poItems.reduce((acc, item) => acc + (parseFloat(item.open_quantity) || 0), 0);
    const fulfillmentRate = totalOrdered > 0 ? (totalDelivered / totalOrdered) * 100 : 0;

    const getFulfillmentColor = (rate) => {
        if (rate >= 100) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10';
        if (rate >= 50) return 'text-amber-500 bg-amber-50 dark:bg-amber-500/10';
        return 'text-red-500 bg-red-50 dark:bg-red-500/10';
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {/* ━━ Header ━━ */}
                <header className="px-10 py-8 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 z-10">
                    <Link to="/orders" className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-widest mb-6 group">
                        <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">west</span>
                        ← Purchase Orders
                    </Link>
                    <div className="flex justify-between items-end">
                        <div className="flex items-center gap-6">
                            <h1 className="text-4xl font-black text-slate-900 dark:text-white font-headline tracking-tighter uppercase leading-none">PO #{poNum}</h1>
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${header.status === 'Open' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                {header.status || 'N/A'}
                            </span>
                        </div>
                        <div className="text-right">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Date: <span className="text-slate-900 dark:text-white ml-2">{header.po_date || 'N/A'}</span></p>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Delivery Sync: <span className="text-emerald-500 ml-2">{header.delivery_date || 'N/A'}</span></p>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-12 no-scrollbar bg-slate-50/50 dark:bg-slate-950/20">
                    <div className="max-w-7xl mx-auto space-y-8 pb-20">
                        
                        {/* ━━ Info Cards Row ━━ */}
                        <div className="grid grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-6 relative overflow-hidden group">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 transition-colors group-hover:bg-primary group-hover:text-white">
                                    <span className="material-symbols-outlined text-3xl">corporate_fare</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Vendor</p>
                                    <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">{header.vendor_name || 'Unmapped Supplier'}</h4>
                                    <p className="text-xs font-bold text-slate-400">Vendor Code: {header.vendor_code || 'N/A'}</p>
                                </div>
                                <div className="absolute bottom-6 right-8">
                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest">#{header.vendor_code}</span>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-6 relative overflow-hidden group">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 transition-colors group-hover:bg-blue-500 group-hover:text-white">
                                    <span className="material-symbols-outlined text-3xl">location_on</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivery Site</p>
                                    <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">{header.unit_description || 'Unidentified Hub'}</h4>
                                    <p className="text-xs font-bold text-slate-400">Unit ID: {header.unit || 'N/A'}</p>
                                </div>
                                <div className="absolute bottom-6 right-8 text-right">
                                     <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest underline decoration-2 underline-offset-4">{header.delivery_date}</p>
                                </div>
                            </div>
                        </div>

                        {/* ━━ KPI Cards Row ━━ */}
                        <div className="grid grid-cols-5 gap-6">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Lines</p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{totalLines}</h3>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Units Ordered</p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{totalOrdered}</h3>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Delivered</p>
                                <h3 className="text-2xl font-black text-emerald-500">{totalDelivered}</h3>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Pending</p>
                                <h3 className={`text-2xl font-black ${totalOpen > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{totalOpen}</h3>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Fulfillment</p>
                                <div className={`inline-block px-3 py-1 rounded-lg font-black text-lg ${getFulfillmentColor(fulfillmentRate)}`}>
                                    {fulfillmentRate.toFixed(1)}%
                                </div>
                            </div>
                        </div>

                        {/* ━━ Line Items Table ━━ */}
                        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                            <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Line Item Ledger</h3>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-4">
                                     <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Synchronized Pipeline
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead className="bg-[#F8FAFC]/80 dark:bg-slate-800">
                                        <tr>
                                            <th className="px-8 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Item No</th>
                                            <th className="px-8 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                            <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Ordered</th>
                                            <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Delivered</th>
                                            <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Open Qty</th>
                                            <th className="px-8 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">UOM</th>
                                            <th className="px-8 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Progress</th>
                                            <th className="px-8 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {poItems.map((item, idx) => {
                                            const ordered = parseFloat(item.po_quantity) || 0;
                                            const delivered = parseFloat(item.delivered_quantity) || 0;
                                            const open = parseFloat(item.open_quantity) || 0;
                                            const rate = ordered > 0 ? (delivered / ordered) * 100 : 0;
                                            
                                            return (
                                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-all group">
                                                    <td className="px-8 py-6">
                                                        <p className="text-sm font-black text-slate-900 dark:text-white leading-none">#{item.po_item}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{item.article_code}</p>
                                                    </td>
                                                    <td className="px-8 py-6 max-w-[280px]">
                                                         <p 
                                                            className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-primary transition-colors cursor-help"
                                                            title={item.article_description}
                                                         >
                                                            {item.article_description}
                                                         </p>
                                                    </td>
                                                    <td className="px-8 py-6 text-right font-black text-slate-700 dark:text-slate-300 text-sm italic">{ordered}</td>
                                                    <td className="px-8 py-6 text-right font-black text-emerald-500 text-sm italic">{delivered}</td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="inline-flex items-center gap-2">
                                                            {open > 0 && <span className="material-symbols-outlined text-sm text-red-500 animate-bounce">warning</span>}
                                                            <span className={`font-black text-sm italic ${open > 0 ? 'text-red-500' : 'text-slate-400'}`}>{open}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.unit_of_measure}</span>
                                                    </td>
                                                    <td className="px-8 py-6 text-center w-32">
                                                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-1000 ${rate >= 100 ? 'bg-emerald-500' : rate > 0 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                                                style={{ width: `${rate}%` }}
                                                            ></div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        {open === 0 ? (
                                                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[9px] font-black uppercase tracking-widest">Fulfilled</span>
                                                        ) : delivered > 0 ? (
                                                            <span className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg text-[9px] font-black uppercase tracking-widest">Partial</span>
                                                        ) : (
                                                            <span className="px-3 py-1 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[9px] font-black uppercase tracking-widest">Pending</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-[#F8FAFC]/50 dark:bg-slate-900/50 text-center">
                                <p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.5em]">Inventory Sync Verified • Finalizing Document Ledger</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <style dangerouslySetInnerHTML={{ __html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .font-headline { font-family: 'Outfit', sans-serif; }
            `}} />
        </div>
    );
};

export default OrderDetail;
