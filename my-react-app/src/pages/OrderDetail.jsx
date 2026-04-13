import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabase';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const DD = String(d.getDate()).padStart(2, '0');
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const YYYY = d.getFullYear();
  return `${DD}/${MM}/${YYYY}`;
};

const OrderDetail = () => {
    const { poNum } = useParams();
    const navigate = useNavigate();
    const [poItems, setPoItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [summary, setSummary] = useState(null);   // full API response object
    const [generating, setGenerating] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [summaryError, setSummaryError] = useState(null);
    const [headerStatus, setHeaderStatus] = useState('');
    const [headerDeliveryDate, setHeaderDeliveryDate] = useState('');
    const [savingHeader, setSavingHeader] = useState(false);

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

                if (data && data.length > 0) {
                    const sortedData = (data || []).sort((a, b) => Number(a.po_item) - Number(b.po_item));
                    setPoItems(sortedData);
                    setHeaderStatus(sortedData[0].status || 'Open');
                    setHeaderDeliveryDate(sortedData[0].delivery_date || '');
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPODetail();
    }, [poNum]);

    // ── Intent badge config ──────────────────────────────────────────────
    const INTENT_CONFIG = {
        confirmed:  { label: 'Confirmed',  cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
        delayed:    { label: 'Delayed',    cls: 'bg-amber-50  text-amber-600  border-amber-200'  },
        at_risk:    { label: 'At Risk',    cls: 'bg-red-50    text-red-600    border-red-200'    },
        unresolved: { label: 'Unresolved', cls: 'bg-slate-100 text-slate-600  border-slate-200' },
    };
    const RISK_CONFIG = {
        low:    { label: 'Low Risk',    dot: 'bg-emerald-500', text: 'text-emerald-600' },
        medium: { label: 'Medium Risk', dot: 'bg-amber-500',   text: 'text-amber-600'  },
        high:   { label: 'High Risk',   dot: 'bg-red-500',     text: 'text-red-600'    },
    };

    useEffect(() => {
        if (poNum) {
            handleGenerateSummary();
        }
    }, [poNum]);

    // ── AI Summary Helpers ──────────────────────────────────────────
    const renderInlineBold = (text) => {
        if (!text) return null;
        const parts = text.split(/\*\*(.+?)\*\*/g);
        return parts.map((part, i) =>
            i % 2 === 1 ? (
                <strong key={i} className="font-black text-slate-900 dark:text-white">
                    {part}
                </strong>
            ) : (
                <span key={i}>{part}</span>
            )
        );
    };

    const parseSummaryItems = (raw) => {
        if (!raw) return null;
        // Split on numbered items: "1. **Key**..."
        const items = raw.split(/(?=\d+\.\s+\*\*)/g).filter(Boolean);
        if (items.length <= 1) return null;
        return items.map(item => {
            const match = item.match(/^(\d+)\.\s+\*\*(.+?)\*\*\s*[:\-]?\s*(.*)/s);
            if (!match) return { num: '', label: '', body: item };
            return { num: match[1], label: match[2], body: match[3] };
        });
    };

    const handleGenerateSummary = async () => {
        setSummaryError(null);
        setGenerating(true);
        setSummary(null);
        try {
            const agentUrl = import.meta.env.VITE_AGENT_URL || 'http://localhost:8000';
            const res = await fetch(`${agentUrl}/api/summary/${poNum}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.detail || `Server error ${res.status}`);
            }
            const data = await res.json();
            setSummary(data);
        } catch (err) {
            console.error('AI Summary error:', err);
            setSummaryError(err.message || 'Failed to generate summary.');
        } finally {
            setGenerating(false);
        }
    };

    const handleHeaderUpdate = async () => {
        try {
            setSavingHeader(true);
            
            // 1. Update all rows in open_po_detail
            const { error: err1 } = await supabase
                .from('open_po_detail')
                .update({ 
                    status: headerStatus,
                    delivery_date: headerDeliveryDate 
                })
                .eq('po_num', poNum);

            if (err1) throw err1;

            // 2. Update tracking table
            const { error: err2 } = await supabase
                .from('selected_open_po_line_items')
                .update({ 
                    status: headerStatus,
                    delivery_date: headerDeliveryDate 
                })
                .eq('po_num', poNum);

            if (err2) throw err2;

            // 3. Update local state
            setPoItems(prev => prev.map(item => ({
                ...item,
                status: headerStatus,
                delivery_date: headerDeliveryDate
            })));

            // 4. Build bot notification message with fixed trigger logic
            const header = poItems[0] || {};
            const oldDate = header.delivery_date ? header.delivery_date.split('T')[0] : '';
            const newDate = headerDeliveryDate ? headerDeliveryDate.split('T')[0] : '';

            const changes = [];

            if (newDate !== oldDate) {
                const formattedDate = formatDate(headerDeliveryDate);
                changes.push(`Delivery date updated to *${formattedDate}*`);
            }

            if (headerStatus !== (header.status || 'Open')) {
                changes.push(`PO status changed to *${headerStatus}*`);
            }

            if (changes.length > 0) {
                const changeText = changes.join(' and ');
                const message =
                    `📋 *PO Update Notification — #${poNum}*\n\n` +
                    `The system has recorded an update: ${changeText}.\n\n` +
                    `Please review this change and confirm if you can accommodate it.`;

                await sendBotUpdateMessage(message);
            }

            alert('PO Header updated successfully across all items.');
        } catch (err) {
            console.error('Header update failed:', err);
            alert('Failed to update PO header: ' + err.message);
        } finally {
            setSavingHeader(false);
        }
    };

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
                            Return to Purchase Orders
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const header = poItems[0];
    
    const formatQty = (v) => Number(parseFloat(v || 0).toFixed(2));

    // KPI Calculations
    const totalLines = poItems.length;
    const totalOrdered = poItems.reduce((acc, item) => acc + formatQty(item.po_quantity), 0);
    const totalDelivered = poItems.reduce((acc, item) => acc + formatQty(item.delivered_quantity), 0);
    const pendingLinesCount = poItems.filter(item => formatQty(item.open_quantity) > 0).length;
    
    const fulfillmentRate = totalOrdered > 0 ? Math.round((totalDelivered / totalOrdered) * 100) : 0;

    const getFulfillmentRateColor = (rate) => {
        if (rate >= 100) return 'text-emerald-500';
        if (rate >= 90) return 'text-amber-500';
        return 'text-red-500';
    };

    const todayDate = new Date();
    todayDate.setHours(0,0,0,0);
    let daysDiff = 0;
    if (header?.delivery_date) {
        const etd = new Date(header.delivery_date);
        etd.setHours(0,0,0,0);
        daysDiff = Math.ceil((etd - todayDate) / (1000 * 60 * 60 * 24));
    }

    const sendBotUpdateMessage = async (messageText) => {
        const PILOT_POS = [
            '4100259330',
            '4100260294',
            '4100260367',
            '4100260584',
            '4100260654'
        ];

        if (!PILOT_POS.includes(poNum)) {
            console.log(`ℹ️ PO #${poNum} is not in Pilot list — skipping bot notification`);
            return;
        }

        try {
            const vendorBackendUrl = import.meta.env.VITE_VENDOR_BACKEND_URL;

            if (!vendorBackendUrl) {
                console.warn('⚠️ VITE_VENDOR_BACKEND_URL not set — skipping bot notification');
                return;
            }

            // fetch vendor phone from selected_open_po_line_items
            const { data: poRecord } = await supabase
                .from('selected_open_po_line_items')
                .select('vendor_phone, vendor_name')
                .eq('po_num', poNum)
                .single();

            const vendorPhone = poRecord?.vendor_phone || '';
            const supplierName = poRecord?.vendor_name || header?.vendor_name || '';

            const response = await fetch(`${vendorBackendUrl}/api/chat-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    po_id: poNum,
                    sender_type: 'bot',
                    sender_label: 'Compass Bot',
                    message_text: messageText,
                    vendor_phone: vendorPhone,
                    supplier_name: supplierName,
                    intent: 'PO_UPDATE',
                    escalate: false,
                    admin_message: ''
                })
            });

            if (!response.ok) {
                console.error('❌ Bot notification failed:', response.status);
            } else {
                console.log('✅ Bot notified vendor of PO update:', messageText.slice(0, 60));
            }
        } catch (err) {
            // never block the save — just log the error
            console.error('❌ sendBotUpdateMessage error:', err.message);
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {/* ━━ Header ━━ */}
                <header className="px-10 py-8 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 z-10">
                    <Link to="/orders" className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-widest mb-6 group">
                        <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">west</span>
                        Purchase Orders
                    </Link>
                    <div className="flex justify-between items-end">
                        <div className="flex items-center gap-6">
                            <h1 className="text-4xl font-black text-slate-900 dark:text-white font-headline tracking-tighter uppercase leading-none">PO #{poNum}</h1>
                            
                            <div className="flex items-center gap-3">
                            </div>
                        </div>
                        <div className="text-right">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Date: <span className="text-slate-900 dark:text-white ml-2">{formatDate(header.po_date)}</span></p>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Delivery Sync: <span className="text-emerald-500 ml-2">{formatDate(header.delivery_date)}</span></p>
                        </div>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden">
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
                                     <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest underline decoration-2 underline-offset-4">{formatDate(header.delivery_date)}</p>
                                </div>
                            </div>
                        </div>

                        {/* ━━ KPI Cards Row ━━ */}
                        <div className="grid grid-cols-4 gap-6">
                            {/* Card 1: Total Lines */}
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 text-center shadow-sm flex flex-col justify-center items-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Lines</p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{totalLines}</h3>
                                <div className="text-[10px] font-bold text-slate-400">Line items in this PO</div>
                            </div>
                            
                            {/* Card 2: Delivery Date */}
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 text-center shadow-sm flex flex-col justify-center items-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Delivery Date</p>
                                <h3 className={`text-2xl font-black leading-none py-2 ${daysDiff < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {formatDate(header?.delivery_date)}
                                </h3>
                            </div>

                            {/* Card 3: Pending Lines */}
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 text-center shadow-sm flex flex-col justify-center items-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Pending Lines</p>
                                {pendingLinesCount > 0 ? (
                                    <>
                                        <h3 className="text-2xl font-black text-red-500 mb-2">{pendingLinesCount}</h3>
                                        <div className="px-3 py-1 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-100 dark:border-red-800 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                            Awaiting fulfillment
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="text-2xl font-black text-emerald-500 mb-2">0</h3>
                                        <div className="px-3 py-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                            All fulfilled
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Card 4: Fulfillment Rate */}
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 text-center shadow-sm flex flex-col justify-center w-full">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Fulfillment Rate</p>
                                <h3 className={`text-2xl font-black mb-3 text-center ${getFulfillmentRateColor(fulfillmentRate)}`}>{fulfillmentRate}%</h3>
                                <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                                    <div className={`h-full rounded-full ${fulfillmentRate >= 100 ? 'bg-emerald-500' : fulfillmentRate >= 90 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${fulfillmentRate}%` }}></div>
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
                                            <th className="px-8 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Ordered</th>
                                            <th className="px-8 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Delivered</th>
                                            <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Open Qty</th>
                                            <th className="px-8 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">UOM</th>
                                            <th className="px-8 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-8 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {poItems.map((item, idx) => {
                                            const ordered = formatQty(item.po_quantity);
                                            const delivered = formatQty(item.delivered_quantity);
                                            const open = formatQty(item.open_quantity);
                                            
                                            const handleSave = async (rowData) => {
                                                try {
                                                    // 1. Save to open_po_detail (existing — do not change)
                                                    const { error } = await supabase
                                                        .from('open_po_detail')
                                                        .update({
                                                            po_quantity: rowData.po_quantity,
                                                            delivered_quantity: rowData.delivered_quantity,
                                                            status: rowData.status,
                                                            open_quantity: rowData.open_quantity
                                                        })
                                                        .eq('po_num', rowData.po_num)
                                                        .eq('po_item', rowData.po_item);
 
                                                    if (error) throw error;

                                                    // 2. Build bot notification message for this line item
                                                    const itemName = rowData.article_description || `Item #${Number(rowData.po_item) / 10}`;
                                                    const orderedQty = parseFloat(rowData.po_quantity || 0).toFixed(2);
                                                    const deliveredQty = parseFloat(rowData.delivered_quantity || 0).toFixed(2);
                                                    const openQty = parseFloat(rowData.open_quantity || 0).toFixed(2);
                                                    const uom = rowData.unit_of_measure || '';
                                                    const itemStatus = rowData.status || '';

                                                    const message =
                                                        `📦 *PO Line Item Update — #${rowData.po_num}*\n\n` +
                                                        `*Item:* ${itemName}\n` +
                                                        `*Ordered:* ${orderedQty} ${uom}\n` +
                                                        `*Delivered:* ${deliveredQty} ${uom}\n` +
                                                        `*Open Qty:* ${openQty} ${uom}\n` +
                                                        `*Status:* ${itemStatus}\n\n` +
                                                        `Please review and confirm if you can fulfil the remaining quantity.`;

                                                    await sendBotUpdateMessage(message);

                                                    alert('Row updated successfully');
                                                } catch (err) {
                                                    console.error('Error updating row:', err);
                                                    alert('Update failed: ' + err.message);
                                                }
                                            };
 
                                            const handleChange = (field, value) => {
                                                const newItems = [...poItems];
                                                const updatedItem = { ...newItems[idx], [field]: value };
                                                
                                                if (field === 'po_quantity' || field === 'delivered_quantity') {
                                                    const q = parseFloat(field === 'po_quantity' ? value : updatedItem.po_quantity) || 0;
                                                    const d = parseFloat(field === 'delivered_quantity' ? value : updatedItem.delivered_quantity) || 0;
                                                    updatedItem.open_quantity = q - d;
                                                }
                                                
                                                newItems[idx] = updatedItem;
                                                setPoItems(newItems);
                                            };
 
                                            return (
                                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-all group">
                                                    <td className="px-8 py-4">
                                                        <p className="text-sm font-black text-slate-900 dark:text-white leading-none">#{Number(item.po_item) / 10}</p>
                                                    </td>
                                                    <td className="px-8 py-4 max-w-[280px]">
                                                         <p 
                                                            className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-primary transition-colors"
                                                            title={item.article_description}
                                                         >
                                                            {item.article_description}
                                                         </p>
                                                    </td>
                                                    <td className="px-8 py-4 text-center">
                                                        <input 
                                                            type="number"
                                                            value={item.po_quantity}
                                                            onChange={(e) => handleChange('po_quantity', e.target.value)}
                                                            className="w-24 px-3 py-2 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                                        />
                                                    </td>
                                                    <td className="px-8 py-4 text-center">
                                                        <input 
                                                            type="number"
                                                            value={item.delivered_quantity}
                                                            onChange={(e) => handleChange('delivered_quantity', e.target.value)}
                                                            className="w-24 px-3 py-2 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-emerald-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                                        />
                                                    </td>
                                                    <td className="px-8 py-4 text-right">
                                                        <div className="inline-flex items-center gap-2">
                                                            {open > 0 && <span className="material-symbols-outlined text-sm text-red-500">warning</span>}
                                                            <span className={`font-black text-sm italic ${open > 0 ? 'text-red-500' : 'text-slate-400'}`}>{open.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-4 text-center">
                                                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.unit_of_measure}</span>
                                                    </td>
                                                    <td className="px-8 py-4 text-center">
                                                        {(() => {
                                                            const currentStatus = item.status || (open === 0 ? 'Fulfilled' : delivered > 0 ? 'Partial' : 'Pending');
                                                            const getStatusStyles = (status) => {
                                                                switch (status) {
                                                                    case 'Fulfilled': return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800';
                                                                    case 'Partial': return 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-800';
                                                                    case 'Pending': return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-800';
                                                                    case 'Confirm': return 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-800';
                                                                    case 'Cancelled': return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-800';
                                                                    default: return 'bg-slate-50 text-slate-600 border-slate-200';
                                                                }
                                                            };
 
                                                            return (
                                                                <select
                                                                    value={currentStatus}
                                                                    onChange={(e) => handleChange('status', e.target.value)}
                                                                    className={`px-3 py-1.5 border rounded-lg text-[9px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none text-center cursor-pointer ${getStatusStyles(currentStatus)}`}
                                                                >
                                                                    <option value="Confirm">Confirm</option>
                                                                    <option value="Pending">Pending</option>
                                                                    <option value="Partial">Partial</option>
                                                                    <option value="Fulfilled">Fulfilled</option>
                                                                    <option value="Cancelled">Cancelled</option>
                                                                </select>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-8 py-4 text-center">
                                                        <button 
                                                            onClick={() => handleSave(item)}
                                                            className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center mx-auto"
                                                        >
                                                            <span className="material-symbols-outlined text-lg font-bold">save</span>
                                                        </button>
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

                    {/* AI Summary Sidebar */}
                    <aside className="w-[380px] border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[18px]">psychology</span>
                                </div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">AI Analysis</h3>
                            </div>
                            <button 
                                onClick={handleGenerateSummary}
                                disabled={generating}
                                className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group relative"
                                title="Sync with real conversation"
                            >
                                <span className={`material-symbols-outlined text-[20px] text-slate-400 group-hover:text-primary transition-colors ${generating ? 'animate-spin text-primary' : ''}`}>sync</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                            {generating ? (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">Listening to conversation...</span>
                                    </div>
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="space-y-2 animate-pulse">
                                            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full w-1/4" />
                                            <div className="h-2 bg-slate-50 dark:bg-slate-800/50 rounded-full w-full" />
                                            <div className="h-2 bg-slate-50 dark:bg-slate-800/50 rounded-full w-5/6" />
                                        </div>
                                    ))}
                                </div>
                            ) : summary ? (() => {
                                const intent = INTENT_CONFIG[summary.key_intent] || INTENT_CONFIG.unresolved;
                                const risk   = RISK_CONFIG[summary.risk_level]   || RISK_CONFIG.medium;
                                
                                return (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 flex-wrap mb-2">
                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${intent.cls}`}>
                                                {intent.label}
                                            </span>
                                            <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${risk.dot}`} />
                                                <span className={risk.text}>{risk.label}</span>
                                            </span>
                                        </div>

                                        <div className="space-y-4">
                                            {(() => {
                                                const items = parseSummaryItems(summary.summary);
                                                if (!items) {
                                                    return (
                                                        <div className="p-5 bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100/50 dark:border-blue-500/10 rounded-2xl">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <span className="material-symbols-outlined text-blue-500 text-sm">info</span>
                                                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Executive Summary</span>
                                                            </div>
                                                            <p className="text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                                                {renderInlineBold(summary.summary)}
                                                            </p>
                                                        </div>
                                                    );
                                                }

                                                return items.map((item, i) => (
                                                    <div key={i} className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
                                                        <div className="flex items-start gap-4">
                                                            <div className="w-6 h-6 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                                                                {item.num || (i + 1)}
                                                            </div>
                                                            <div className="space-y-1">
                                                                {item.label && (
                                                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">{item.label}</p>
                                                                )}
                                                                <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                                                                    {renderInlineBold(item.body)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 bg-slate-900 dark:bg-slate-100 rounded-full" />
                                                Data Quality
                                            </h4>
                                            <div className="p-4 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl">
                                                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Analysis based on {summary.message_count} recent messages.</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })() : summaryError ? (
                                <div className="h-full flex flex-col items-center justify-center text-center px-6 space-y-4">
                                    <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-red-500 text-2xl">error</span>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Analysis Failed</h4>
                                        <p className="text-xs font-medium text-slate-400 leading-relaxed max-w-[200px] mx-auto">{summaryError}</p>
                                    </div>
                                    <button 
                                        onClick={handleGenerateSummary}
                                        className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center px-6">
                                    <span className="material-symbols-outlined text-4xl text-slate-200 mb-4">chat_bubble_outline</span>
                                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">No Conversations Found</h4>
                                    <p className="text-xs font-medium text-slate-400 leading-relaxed">Connect with the vendor to start generating real-time AI insights.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/30">
                            <button 
                                onClick={handleGenerateSummary}
                                disabled={generating}
                                className="w-full py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-900/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                            >
                                <span className={`material-symbols-outlined text-[18px] ${generating ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`}>sync</span>
                                {generating ? 'Analyzing Sync...' : 'Sync Conversation'}
                            </button>
                            <p className="text-[9px] font-bold text-slate-400 text-center mt-4 uppercase tracking-[0.2em]">Last synced: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </aside>
                </div>
            </main>
            <style dangerouslySetInnerHTML={{ __html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .font-headline { font-family: 'Outfit', sans-serif; }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.94) translateY(12px); }
                    to   { opacity: 1; transform: scale(1)    translateY(0);    }
                }
                .animate-scale-in { animation: scaleIn 0.35s cubic-bezier(0.16,1,0.3,1) both; }
            `}} />

        </div>
    );
};

export default OrderDetail;
