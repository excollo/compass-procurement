import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabase';

const isMSMERegistered = (status) => {
    if (!status) return false;
    const s = String(status).trim().toLowerCase();
    return s === 'yes' || s === 'y' || s === 'true' || s === 'registered';
};

const Vendors = () => {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [error, setError] = useState(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 25;

    useEffect(() => {
        fetchVendors();
    }, []);

    useEffect(() => {
        if (selectedVendor) {
            setIsSidebarOpen(true);
        } else {
            setIsSidebarOpen(false);
        }
    }, [selectedVendor]);

    const fetchVendors = async () => {
        try {
            setLoading(true);
            setError(null);
            const { data, error } = await supabase
                .from('vendor_master')
                .select('vendor, vendor_name1, contact_person, contact_number, city, postal_code, gst_number, pan_number, msmed_status, status, email_address_1');

            if (error) throw error;
            setVendors(data || []);
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

    // Pagination logic
    const totalPages = Math.ceil(filteredVendors.length / ITEMS_PER_PAGE) || 1;
    const paginatedVendors = filteredVendors.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {/* Header */}
                <header className="flex justify-between items-center h-16 px-8 w-full bg-white dark:bg-slate-900 border-b border-outline-variant/10 shadow-sm z-40">
                    <div className="flex items-center gap-8">
                        <h1 className="text-lg font-bold tracking-tighter text-slate-900 dark:text-slate-100 font-headline uppercase">Enterprise Procurement</h1>
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
                        <div className="flex items-center gap-2">
                           <img alt="Profile" className="w-8 h-8 rounded-full border-2 border-primary/20 shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBpRZ82Z9vlt8SyVdsbUz4q-XFlmZojEzyvWp90xVibsAElJPHW_meJckQWZJtoPzP5MJhSZLiW07y47QlgPdvId2zdjsImRevGIZD_iKx2C2yIoMsdsI26776buMmB2IZw_TcFkmbdrXj5d5ipKaIrZOei16-LsfiINHvvt43OGveovU-XUhhNDvQdJjJm6NRCjPfa6TU13zSUWI7Y-x_kXNhBC3H4m_Bn1Y5HZHFACgA_5nb0ORR6Upj4N-Mxe3xekbptlc3YMSes" />
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-hidden flex">
                    <section className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-slate-950 p-8 no-scrollbar">
                        <div className="max-w-6xl mx-auto">
                            <div className="flex justify-between items-end mb-8">
                                <div>
                                    <h1 className="text-3xl font-black text-slate-900 dark:text-white font-headline tracking-tighter uppercase">Vendor Ecosystem</h1>
                                    <p className="text-slate-500 font-medium mt-1">Manage and monitor global supply chain partners.</p>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-4 gap-6 mb-8">
                                {[
                                    { label: 'Total Partnerships', value: vendors.length, icon: 'hub', color: 'bg-blue-500' },
                                    { label: 'Active Status', value: vendors.filter(v => v.status === 'Active').length || vendors.length, icon: 'check_circle', color: 'bg-emerald-500' },
                                    { label: 'MSMED Registered', value: vendors.filter(v => isMSMERegistered(v.msmed_status)).length || 0, icon: 'verified', color: 'bg-indigo-500' },
                                    { label: 'Cities Covered', value: [...new Set(vendors.map(v => v.city))].length || 0, icon: 'public', color: 'bg-amber-500' },
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all cursor-default overflow-hidden relative group">
                                        <div className={`absolute top-0 right-0 w-24 h-24 ${stat.color} opacity-[0.03] rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110`}></div>
                                        <div className="relative z-10">
                                            <div className={`w-12 h-12 rounded-xl ${stat.color} bg-opacity-10 text-${stat.color.split('-')[1]}-600 dark:text-${stat.color.split('-')[1]}-400 flex items-center justify-center mb-4`}>
                                                <span className="material-symbols-outlined text-2xl">{stat.icon}</span>
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                                            <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1 leading-none">
                                                {loading ? '...' : stat.value}
                                            </h3>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Vendors Table */}
                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                                <table className="w-full border-collapse">
                                    <thead className="bg-[#F8FAFC]/50 dark:bg-slate-800/10 border-b border-slate-100 dark:border-slate-800">
                                        <tr>
                                            <th className="text-left px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor ID</th>
                                            <th className="text-left px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor Name</th>
                                            <th className="text-left px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Primary Contact</th>
                                            <th className="text-left px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Location</th>
                                            <th className="text-right px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Postal Code</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {loading ? (
                                            [...Array(5)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={5} className="px-8 py-5"><div className="h-10 bg-slate-50 dark:bg-slate-800/50 rounded-2xl"></div></td></tr>)
                                        ) : error ? (
                                            <tr><td colSpan={5} className="px-8 py-12 text-center text-error font-bold">{error}</td></tr>
                                        ) : filteredVendors.length === 0 ? (
                                            <tr><td colSpan={5} className="px-8 py-12 text-center text-slate-400">No vendors found matches your criteria.</td></tr>
                                        ) : (
                                            paginatedVendors.map((vendor, idx) => (
                                                <tr key={idx} onClick={() => setSelectedVendor(vendor)} className={`hover:bg-slate-50 dark:hover:bg-slate-800/10 transition-all cursor-pointer border-l-4 ${selectedVendor?.vendor === vendor.vendor ? 'bg-primary/[0.03] border-primary' : 'border-transparent'}`}>
                                                    <td className="px-8 py-6 text-sm font-black text-slate-900 dark:text-white tracking-tighter">#{vendor.vendor}</td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-extrabold text-xs">
                                                                {vendor.vendor_name1?.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <p className="text-sm font-black text-slate-800 dark:text-white leading-tight">{vendor.vendor_name1}</p>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Active Entity</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{vendor.contact_person || ''}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">{vendor.contact_number || ''}</p>
                                                    </td>
                                                    <td className="px-8 py-6 text-sm font-bold text-slate-600 dark:text-slate-400">{vendor.city || ''}</td>
                                                    <td className="px-8 py-6 text-right text-xs font-black text-slate-400 uppercase tracking-tighter">{vendor.postal_code || ''}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                                <div className="p-8 bg-slate-50/50 dark:bg-slate-800/5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span>Showing {paginatedVendors.length} of {filteredVendors.length} Partner Profiles</span>
                                    <div className="flex gap-2">
                                        <button disabled={currentPage === 1} onClick={(e) => {e.stopPropagation(); setCurrentPage(p => Math.max(1, p - 1))}} className="p-2.5 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-primary/10 hover:text-primary transition-all active:scale-90 disabled:opacity-20"><span className="material-symbols-outlined text-sm">west</span></button>
                                        <button disabled={currentPage >= totalPages} onClick={(e) => {e.stopPropagation(); setCurrentPage(p => p + 1)}} className="p-2.5 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-primary/10 hover:text-primary transition-all active:scale-90 disabled:opacity-20"><span className="material-symbols-outlined text-sm">east</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Animated Detail Sidebar */}
                    <aside className={`fixed right-0 top-0 h-full w-[480px] bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 z-[70] flex flex-col shadow-2xl transition-transform duration-500 ease-in-out transform ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                        {selectedVendor && (
                            <>
                                <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/30">
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-3xl shadow-xl shadow-primary/30">
                                            {selectedVendor.vendor_name1?.substring(0, 1).toUpperCase()}
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-black text-slate-900 dark:text-white font-headline leading-tight tracking-tighter uppercase">{selectedVendor.vendor_name1}</h2>
                                            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.4em] mt-1">MASTER ID: {selectedVendor.vendor}</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-black rounded-xl border border-emerald-200/50 dark:border-emerald-800/50 uppercase tracking-tight">Active Partner</span>
                                            {isMSMERegistered(selectedVendor.msmed_status) && (
                                                <span className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-black rounded-xl border border-blue-200/50 dark:border-blue-800/50 uppercase tracking-tight">MSMED REDIRECTION</span>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedVendor(null)} className="p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-primary rounded-2xl shadow-sm transition-all active:scale-90"><span className="material-symbols-outlined">close</span></button>
                                </div>

                                <div className="flex-1 overflow-y-auto no-scrollbar p-10 space-y-10">
                                    <div className="space-y-8">
                                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-4">
                                            Logistic Parameters <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800"></div>
                                        </h3>
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-800 shadow-sm">
                                                    <span className="material-symbols-outlined text-xl">person</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Stakeholder Lead</p>
                                                    <p className="text-sm font-black text-slate-900 dark:text-white mt-1">{selectedVendor.contact_person || 'Unassigned'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-800 shadow-sm">
                                                    <span className="material-symbols-outlined text-xl">call</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hotline</p>
                                                    <p className="text-sm font-black text-slate-900 dark:text-white mt-1">{selectedVendor.contact_number || ''}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-800 shadow-sm">
                                                    <span className="material-symbols-outlined text-xl">location_on</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nexus Location</p>
                                                    <p className="text-sm font-black text-slate-900 dark:text-white mt-1">{selectedVendor.city || 'Not Specified'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-800 shadow-sm">
                                                    <span className="material-symbols-outlined text-xl">alternate_email</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Enterprise Inbound</p>
                                                    <p className="text-sm font-black text-primary hover:underline cursor-pointer mt-1">{selectedVendor.email_address_1 || 'No Registry'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 bg-slate-50 dark:bg-slate-800/20 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                                        <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase mb-8 flex items-center gap-3">
                                            <span className="w-2 h-2 bg-primary rounded-full"></span> 
                                            Regulatory Index
                                        </h3>
                                        <div className="grid grid-cols-2 gap-8">
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">GSTID Reference</p>
                                                <p className="text-xs font-black text-slate-800 dark:text-white mt-2 font-mono">{selectedVendor.gst_number || ''}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PAN Portfolio</p>
                                                <p className="text-xs font-black text-slate-800 dark:text-white mt-2 font-mono">{selectedVendor.pan_number || ''}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-10 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
                                    <button 
                                        onClick={() => navigate('/orders', { state: { vendorFilter: selectedVendor.vendor_name1 } })}
                                        className="w-full py-5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-black rounded-3xl shadow-xl shadow-slate-900/10 hover:scale-[1.02] active:scale-95 transition-all text-sm tracking-tight uppercase"
                                    >
                                        View Purchase Orders
                                    </button>
                                </div>
                            </>
                        )}
                    </aside>

                    {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-[65]" onClick={() => setSelectedVendor(null)}></div>}
                </div>
            </main>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .font-label { font-family: 'Inter', sans-serif; }
                .font-headline { font-family: 'Outfit', sans-serif; }
            `}} />
        </div>
    );
};

export default Vendors;
