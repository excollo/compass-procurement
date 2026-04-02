import React from 'react';
import Sidebar from '../components/Sidebar';

const Orders = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="flex justify-between items-center h-16 px-8 w-full bg-white dark:bg-slate-900 z-40 border-b border-outline-variant/10">
          <div className="flex items-center gap-8">
            <h1 className="text-lg font-bold tracking-tighter text-slate-900 dark:text-slate-100 font-headline">Architect Intelligence</h1>
            <div className="relative group">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <span className="material-symbols-outlined text-sm">search</span>
              </span>
              <input className="bg-surface-container-low border-none rounded-full pl-10 pr-4 py-1.5 text-sm w-64 focus:ring-2 focus:ring-primary/20 transition-all" placeholder="Search POs..." type="text" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button className="p-2 text-slate-500 hover:bg-slate-200/50 rounded-full transition-colors">
                <span className="material-symbols-outlined">notifications</span>
              </button>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900">Alex Chen</p>
                <p className="text-[10px] text-slate-500">Sr. Procurement</p>
              </div>
              <img alt="User profile avatar" className="w-8 h-8 rounded-full border-2 border-primary-fixed shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBpRZ82Z9vlt8SyVdsbUz4q-XFlmZojEzyvWp90xVibsAElJPHW_meJckQWZJtoPzP5MJhSZLiW07y47QlgPdvId2zdjsImRevGIZD_iKx2C2yIoMsdsI26776buMmB2IZw_TcFkmbdrXj5d5ipKaIrZOei16-LsfiINHvvt43OGveovU-XUhhNDvQdJjJm6NRCjPfa6TU13zSUWI7Y-x_kXNhBC3H4m_Bn1Y5HZHFACgA_5nb0ORR6Upj4N-Mxe3xekbptlc3YMSes" />
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <section className="flex-1 overflow-y-auto bg-surface p-8 no-scrollbar">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-extrabold text-on-surface font-headline tracking-tight">Purchase Orders</h2>
                <p className="text-on-surface-variant font-medium mt-1">Manage global procurement cycles and vendor logistics.</p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30 rounded-lg text-xs font-semibold hover:bg-white shadow-sm transition-all">
                  <span className="material-symbols-outlined text-sm">filter_list</span>
                  Advanced Filters
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30 rounded-lg text-xs font-semibold hover:bg-white shadow-sm transition-all">
                  <span className="material-symbols-outlined text-sm">download</span>
                  Export CSV
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-4 mb-6 bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/10">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-label">Vendor</label>
                <select className="w-full bg-surface-container-low border-none rounded text-xs py-1.5 focus:ring-0">
                  <option>All Vendors</option>
                  <option>Apex Logistics</option>
                  <option>Zenith Corp</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-label">Site</label>
                <select className="w-full bg-surface-container-low border-none rounded text-xs py-1.5 focus:ring-0">
                  <option>All Sites</option>
                  <option>Berlin HUB</option>
                  <option>Austin HQ</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-label">Status</label>
                <select className="w-full bg-surface-container-low border-none rounded text-xs py-1.5 focus:ring-0">
                  <option>Any Status</option>
                  <option>Open</option>
                  <option>Closed</option>
                  <option>Delayed</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-label">Delivery</label>
                <select className="w-full bg-surface-container-low border-none rounded text-xs py-1.5 focus:ring-0">
                  <option>Next 30 Days</option>
                  <option>Overdue</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-label">Risk</label>
                <select className="w-full bg-surface-container-low border-none rounded text-xs py-1.5 focus:ring-0">
                  <option>High Risk Only</option>
                  <option>All Risks</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-label">Date Range</label>
                <input className="w-full bg-surface-container-low border-none rounded text-xs py-1.5 focus:ring-0" type="date" />
              </div>
              <div className="flex items-end">
                <button className="w-full bg-primary text-white py-1.5 rounded text-xs font-bold hover:opacity-90">Apply</button>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden">
              <table className="w-full border-collapse">
                <thead className="bg-surface-container-low/50">
                  <tr>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-label">PO#</th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-label">Summary</th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-label">Vendor</th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-label">Qty</th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-label">Recv.</th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-label">Delivery</th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-label">Status</th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-label">Risk</th>
                    <th className="text-right px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-label">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  <tr className="bg-primary/5 border-l-4 border-primary group transition-all cursor-pointer">
                    <td className="px-6 py-4 text-sm font-bold text-primary">PO-2024-884</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-900">500x Circuit Boards</p>
                      <p className="text-[10px] text-slate-500">Tier-1 Components</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">Apex Logistics</td>
                    <td className="px-6 py-4 text-sm">500</td>
                    <td className="px-6 py-4 text-sm">450</td>
                    <td className="px-6 py-4 text-sm font-semibold">2024-10-25</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">DELAYED</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="material-symbols-outlined text-error text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button className="text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined">forum</span></button>
                      <button className="text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined">visibility</span></button>
                    </td>
                  </tr>
                  
                  <tr className="hover:bg-surface-container-low transition-all cursor-pointer">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">PO-2024-912</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-900">1200x LED Arrays</p>
                      <p className="text-[10px] text-slate-500">Display Units</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">Zenith Corp</td>
                    <td className="px-6 py-4 text-sm">1,200</td>
                    <td className="px-6 py-4 text-sm">0</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-500">2024-11-05</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">Open</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="material-symbols-outlined text-slate-300 text-xl">check_circle</span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button className="text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined">forum</span></button>
                      <button className="text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined">visibility</span></button>
                    </td>
                  </tr>

                  <tr className="hover:bg-surface-container-low transition-all cursor-pointer">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">PO-2024-773</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-900">80x Rack Chassis</p>
                      <p className="text-[10px] text-slate-500">Infrastructure</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">Titan Steel</td>
                    <td className="px-6 py-4 text-sm">80</td>
                    <td className="px-6 py-4 text-sm">80</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-500">2024-09-12</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-800 uppercase">Closed</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="material-symbols-outlined text-slate-300 text-xl">check_circle</span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button className="text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined">forum</span></button>
                      <button className="text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined">visibility</span></button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="p-6 bg-surface-container-low/30 border-t border-outline-variant/10 flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500">Showing 1-12 of 156 purchase orders</span>
                <div className="flex gap-1">
                  <button className="w-8 h-8 rounded border border-outline-variant/30 flex items-center justify-center hover:bg-white"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                  <button className="w-8 h-8 rounded bg-primary text-white text-xs font-bold">1</button>
                  <button className="w-8 h-8 rounded border border-outline-variant/30 flex items-center justify-center hover:bg-white text-xs">2</button>
                  <button className="w-8 h-8 rounded border border-outline-variant/30 flex items-center justify-center hover:bg-white text-xs">3</button>
                  <button className="w-8 h-8 rounded border border-outline-variant/30 flex items-center justify-center hover:bg-white"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
                </div>
              </div>
            </div>
          </section>

          <aside className="w-96 bg-white shadow-[-8px_0_24px_rgba(0,0,0,0.02)] z-30 flex flex-col border-l border-outline-variant/10">
            <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-lowest">
              <div>
                <h3 className="font-bold text-slate-900 font-headline">Order Details</h3>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest font-label mt-0.5">PO-2024-884</p>
              </div>
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
              <div className="space-y-4">
                <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">local_shipping</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Vendor</p>
                      <p className="text-sm font-bold text-slate-900">Apex Logistics</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase font-label">Item</p>
                      <p className="text-xs font-semibold mt-1">Circuit Boards</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase font-label">Delivery Date</p>
                      <p className="text-xs font-semibold mt-1">2024-10-25</p>
                    </div>
                  </div>
                </div>
                
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase font-label mb-4">Lifecycle Events</h4>
                <div className="space-y-4">
                  <div className="flex gap-4 relative">
                    <div className="absolute left-[11px] top-6 bottom-[-16px] w-[2px] bg-slate-100"></div>
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 z-10">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Order Delayed</p>
                      <p className="text-[10px] text-slate-500">Today, 09:42 AM</p>
                      <p className="text-xs text-slate-600 mt-1">Carrier reported port congestion in South China terminal.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 relative">
                    <div className="absolute left-[11px] top-6 bottom-[-16px] w-[2px] bg-slate-100"></div>
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 z-10">
                      <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Partial Receipt (450 Units)</p>
                      <p className="text-[10px] text-slate-500">Oct 12, 02:15 PM</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 z-10">
                      <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">PO Created</p>
                      <p className="text-[10px] text-slate-500">Oct 01, 10:00 AM</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase font-label">Conversation</h4>
                  <button className="text-[10px] font-bold text-primary hover:underline">OPEN CHAT</button>
                </div>
                <div className="bg-surface-container-low rounded-xl p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <img alt="Vendor Avatar" className="w-6 h-6 rounded-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBgy87wQEZZOmnNpIilPxLfPxToCkVAjLcHs9B8GaCnAV2WrCvPwIYA8nxrhkWpgACKzgpLsfYLFE0CvAP79R5WlcFKmcTTN7Dy-e7d2P5FwHn_kBGDtf7wKwhccpG2X1IhLu3WSI4G4bEZNEeRSkNatnmTROOGOt0-ui8sPlTiSCXotd0mJ3h7j7BNc_VVJ_aVgQ4LkxZ5e00MWSeMw0ALyKcdx1oeuQ05gM_p7ZoIIzan-uyOcdBoKBBuZoTSSm_sY0IdKEGhFbBZ" />
                    <div className="flex-1 bg-white p-2 rounded-lg text-xs shadow-sm">
                      <p className="font-bold text-slate-900 text-[10px]">Mark (Apex)</p>
                      <p className="text-slate-600 mt-1">We are tracking the delay. Shipment is currently at dock.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 justify-end">
                    <div className="flex-1 bg-primary p-2 rounded-lg text-xs text-white shadow-sm text-right">
                      <p className="font-bold text-[10px]">You</p>
                      <p className="mt-1">Can we expedite the remaining 50 units?</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-outline-variant/10 grid grid-cols-2 gap-3 bg-surface-container-lowest">
              <button className="py-2.5 px-4 bg-surface-container-high text-primary font-bold rounded-lg text-xs hover:bg-slate-200 transition-colors">
                View Full History
              </button>
              <button className="py-2.5 px-4 bg-primary text-white font-bold rounded-lg text-xs hover:opacity-90 shadow-lg shadow-primary/20 transition-all">
                Update Priority
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Orders;
