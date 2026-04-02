import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabase';

const Vendors = () => {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        try {
            setLoading(true);
            setError(null);
            // Select exact columns using snake_case names from the user's schema
            const { data, error } = await supabase
                .from('vendor_master')
                .select('vendor, vendor_name1, contact_person, contact_number, city, postal_code, gst_number, pan_number, msmed_statis, status, email_address_1');

            if (error) throw error;
            setVendors(data || []);
            if (data && data.length > 0) setSelectedVendor(data[0]);
        } catch (err) {
            console.error('Error fetching vendors:', err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredVendors = vendors.filter(vendor => 
        (vendor.vendor_name1?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (vendor.vendor?.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
        (vendor.city?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className="flex justify-between items-center h-16 px-8 w-full bg-white dark:bg-slate-900 z-40 border-b border-outline-variant/10 shadow-sm">
                    <div className="flex items-center gap-8">
                        <h1 className="text-lg font-bold tracking-tighter text-slate-900 dark:text-slate-100 font-headline">Enterprise Procurement</h1>
                        <div className="relative group">
                            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 group-focus-within:text-primary transition-colors">
                                <span className="material-symbols-outlined text-sm">search</span>
                            </span>
                            <input 
                                className="bg-slate-100 dark:bg-slate-800 border-none rounded-full pl-10 pr-4 py-1.5 text-sm w-72 focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-500" 
                                placeholder="Search by name, ID or city..." 
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold hover:bg-primary/20 transition-all active:scale-95">
                            <span className="material-symbols-outlined text-sm">add</span>
                            Onboard Vendor
                        </button>
                        <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
                        <div className="flex items-center gap-2">
                           <img alt="User profile avatar" className="w-8 h-8 rounded-full border-2 border-primary/20 shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBpRZ82Z9vlt8SyVdsbUz4q-XFlmZojEzyvWp90xVibsAElJPHW_meJckQWZJtoPzP5MJhSZLiW07y47QlgPdvId2zdjsImRevGIZD_iKx2C2yIoMsdsI26776buMmB2IZw_TcFkmbdrXj5d5ipKaIrZOei16-LsfiINHvvt43OGveovU-XUhhNDvQdJjJm6NRCjPfa6TU13zSUWI7Y-x_kXNhBC3H4m_Bn1Y5HZHFACgA_5nb0ORR6Upj4N-Mxe3xekbptlc3YMSes" />
                        </div>
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden">
                    {/* Main Content Area */}
                    <section className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-slate-950 p-8 no-scrollbar">
                        <div className="flex justify-between items-end mb-8">
                            <div>
                                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white font-headline tracking-tight">Vendor Ecosystem</h1>
                                <p className="text-slate-500 font-medium mt-1">Manage and monitor global supply chain partners.</p>
                            </div>
                            <div className="flex gap-3">
                                <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold hover:shadow-md transition-all active:scale-95">
                                    <span className="material-symbols-outlined text-sm">filter_list</span>
                                    Segment
                                </button>
                                <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:shadow-lg transition-all active:scale-95 shadow-md shadow-slate-900/10">
                                    <span className="material-symbols-outlined text-sm">file_download</span>
                                    Master Export
                                </button>
                            </div>
                        </div>

                        {/* Stats Summary */}
                        <div className="grid grid-cols-4 gap-6 mb-8">
                            {[
                                { label: 'Total Partnerships', value: vendors.length, trend: '↑ 4.2%', icon: 'hub', color: 'bg-blue-500' },
                                { label: 'Active Status', value: vendors.filter(v => v.status === 'Active').length || vendors.length, trend: '98%', icon: 'check_circle', color: 'bg-emerald-500' },
                                { label: 'MSMED Registered', value: vendors.filter(v => v.msmed_statis === 'Yes').length || '-', trend: 'Compliance', icon: 'verified', color: 'bg-indigo-500' },
                                { label: 'Cities Covered', value: [...new Set(vendors.map(v => v.city))].length || '-', trend: 'Global', icon: 'public', color: 'bg-amber-500' },
                            ].map((stat, i) => (
                                <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow cursor-default">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-2 rounded-xl ${stat.color} bg-opacity-10 text-${stat.color.split('-')[1]}-600 dark:text-${stat.color.split('-')[1]}-400`}>
                                            <span className="material-symbols-outlined">{stat.icon}</span>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.trend.includes('↑') ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                            {stat.trend}
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{stat.label}</p>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stat.value}</h3>
                                </div>
                            ))}
                        </div>

                        {/* Vendors Table */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-800 overflow-hidden">
                            <div className="table-container overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead className="bg-[#F8FAFC] dark:bg-slate-800/10 border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            <th className="text-left px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Vendor ID</th>
                                            <th className="text-left px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Vendor Name</th>
                                            <th className="text-left px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Primary Contact</th>
                                            <th className="text-left px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Location</th>
                                            <th className="text-left px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Postal Code</th>
                                            <th className="text-right px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {loading ? (
                                            [...Array(5)].map((_, i) => (
                                                <tr key={i} className="animate-pulse">
                                                    <td colSpan={6} className="px-6 py-4"><div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg"></div></td>
                                                </tr>
                                            ))
                                        ) : error ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <span className="material-symbols-outlined text-4xl text-error/30">error_outline</span>
                                                        <p className="text-error font-medium">{error}</p>
                                                        <button onClick={fetchVendors} className="text-primary font-bold text-sm underline">Retry Fetch</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredVendors.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">No vendors found matching your search.</td>
                                            </tr>
                                        ) : (
                                            filteredVendors.map((vendor, idx) => (
                                                <tr 
                                                    key={idx} 
                                                    onClick={() => setSelectedVendor(vendor)}
                                                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all cursor-pointer ${selectedVendor?.vendor === vendor.vendor ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-primary' : 'border-l-4 border-transparent'}`}
                                                >
                                                    <td className="px-6 py-5 text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">#{vendor.vendor}</td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 font-black text-xs border border-white/50 dark:border-slate-600 shadow-sm">
                                                                {vendor.vendor_name1?.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{vendor.vendor_name1}</p>
                                                                <span className="text-[10px] text-slate-500 font-medium">Enterprise Unit</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{vendor.contact_person || '---'}</p>
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-500 font-label">{vendor.contact_number || '---'}</p>
                                                    </td>
                                                    <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-400 font-medium">{vendor.city || 'N/A'}</td>
                                                    <td className="px-6 py-5 text-sm text-slate-500 font-mono tracking-tighter">{vendor.postal_code || '---'}</td>
                                                    <td className="px-6 py-5 text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-primary transition-all border border-transparent hover:border-slate-100 shadow-sm"><span className="material-symbols-outlined text-sm">visibility</span></button>
                                                            <button className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-emerald-500 transition-all border border-transparent hover:border-slate-100 shadow-sm"><span className="material-symbols-outlined text-sm">chat</span></button>
                                                        </div>
                                                        <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 scale-75 group-hover:hidden">more_vert</span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-6 bg-[#F8FAFC] dark:bg-slate-800/10 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 font-medium">
                                <span>Showing {filteredVendors.length} of {vendors.length} vendors</span>
                                <div className="flex gap-2">
                                    <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                                    <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-800 font-bold px-3">1</button>
                                    <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Detail Sidebar */}
                    <aside className="w-[420px] bg-white dark:bg-[#0F172A] border-l border-slate-200 dark:border-slate-800 z-30 flex flex-col shadow-2xl">
                        {selectedVendor ? (
                            <>
                                <div className="p-8 border-b border-slate-200 dark:border-slate-800 relative overflow-hidden group">
                                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700"></div>
                                    <div className="relative z-10 flex flex-col gap-4">
                                        <div className="flex justify-between items-start">
                                            <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-primary/20">
                                                {selectedVendor.vendor_name1?.substring(0, 1).toUpperCase()}
                                            </div>
                                            <div className="flex gap-2">
                                                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400"><span className="material-symbols-outlined">edit</span></button>
                                                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400"><span className="material-symbols-outlined">share</span></button>
                                            </div>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{selectedVendor.vendor_name1}</h2>
                                            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mt-1">Global Master ID: {selectedVendor.vendor}</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-200/50 dark:border-emerald-800/50 flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full pulse"></span> Active Partner
                                            </span>
                                            {selectedVendor.msmed_statis === 'Yes' && (
                                                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded-lg border border-blue-200/50 dark:border-blue-800/50">MSMED Reg.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
                                    {/* Primary Info */}
                                    <div className="space-y-6">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                            Partner Logistics <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800"></div>
                                        </h3>
                                        <div className="grid grid-cols-1 gap-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-700">
                                                    <span className="material-symbols-outlined text-[18px]">person</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-label leading-tight">Key Account Person</p>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">{selectedVendor.contact_person || 'Unassigned'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-slate-900 dark:text-white/90">
                                                <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-700">
                                                    <span className="material-symbols-outlined text-[18px]">call</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-label leading-tight">Direct Phone</p>
                                                    <p className="text-sm font-bold mt-1">{selectedVendor.contact_number || 'No contact provided'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-700">
                                                    <span className="material-symbols-outlined text-[18px]">location_on</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-label leading-tight">Base HQ</p>
                                                    <p className="text-sm font-bold mt-1">{selectedVendor.city || 'Not Specified'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-700">
                                                    <span className="material-symbols-outlined text-[18px]">alternate_email</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-label leading-tight">Official Email</p>
                                                    <p className="text-sm font-bold mt-1 text-primary hover:underline cursor-pointer">{selectedVendor.email_address_1 || 'No Email'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tax & Financials */}
                                    <div className="p-6 bg-[#F8FAFC] dark:bg-slate-800/40 rounded-3xl border border-slate-200/50 dark:border-slate-800/50">
                                        <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm text-primary">account_balance</span> 
                                            Regulatory & Financials
                                        </h3>
                                        <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                            <div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">GST Identification</p>
                                                <p className="text-xs font-black text-slate-700 dark:text-slate-300 mt-1 uppercase font-mono">{selectedVendor.gst_number || 'Not Filed'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">PAN Registry</p>
                                                <p className="text-xs font-black text-slate-700 dark:text-slate-300 mt-1 uppercase font-mono">{selectedVendor.pan_number || 'Not Filed'}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-sm text-indigo-500">verified_user</span>
                                                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Compliance Status</span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full dark:bg-emerald-950/30">VERIFIED</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-8 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] grid grid-cols-2 gap-4">
                                    <button className="py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-2xl text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">
                                        Vendor Ledger
                                    </button>
                                    <button className="py-3 px-4 bg-primary text-white font-bold rounded-2xl text-xs hover:shadow-lg shadow-primary/20 transition-all active:scale-95">
                                        Send Message
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-900/50">
                                <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-300 animate-pulse">
                                    <span className="material-symbols-outlined text-4xl">storefront</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Select a Vendor</h3>
                                <p className="text-slate-500 text-sm mt-2 max-w-[240px]">Select a supply chain partner to view their performance metrics and contact details.</p>
                            </div>
                        )}
                    </aside>
                </div>
            </main>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .pulse {
                    animation: pulse-animation 2s infinite;
                }
                @keyframes pulse-animation {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .font-label { font-family: 'Inter', sans-serif; }
                .font-headline { font-family: 'Outfit', sans-serif; }
                .bg-cta-gradient { background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); }
            `}} />
        </div>
    );
};

export default Vendors;
