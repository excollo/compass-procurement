import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';

const Dashboard = () => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="flex justify-between items-center h-16 px-8 w-full bg-white dark:bg-slate-900 sticky top-0 z-40 transition-all flex-shrink-0 border-b border-surface-container/50">
          <div className="flex items-center gap-8">
            <span className="text-lg font-bold tracking-tighter text-slate-900 dark:text-slate-100 font-headline">Architect Intelligence</span>
            {/* <div className="hidden lg:flex items-center gap-6">
              <nav className="flex items-center gap-6 h-16">
                <a className="text-[#2563eb] font-semibold border-b-2 border-[#2563eb] h-full flex items-center px-1" href="#">Overview</a>
              </nav>
            </div> */}
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <span className="material-symbols-outlined p-2 text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-full cursor-pointer transition-colors">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
            </div>
            <div className="h-8 w-[1px] bg-outline-variant/20 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-on-surface">Alex Rivera</p>
                <p className="text-[10px] text-on-surface-variant font-label">OPS MANAGER</p>
              </div>
              <img alt="User profile avatar" className="w-10 h-10 rounded-full border-2 border-surface-container" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8ov37m6Ru1jtLXavUm2Wv7-q8IqttbDcSU5OJzUCKT6ZmPdV8o10Gkm2bzBBlUkUAfR7nPEInOWhBPKK0JB-n56VPQC2sJvCZVr9a9eqzujzWSusoB7Pqo3Zl5PSfDCMpzoPbo0JZh5CHcjqc7lATQ1qKELXGJ7WeD5DB3SN3FaTJ4H9VBzP_Fvv51A3UPXtSYL_rtKoK2k8LRfiEklf60DY9c3Hul2Ue3yIjaHQmSa85wLfALExg-6xFvgM8lPDR6WQOIutN4I6d" />
            </div>
          </div>
        </header>

        <div className="p-8 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="text-[2.25rem] font-extrabold font-headline leading-tight tracking-tight text-on-surface">Procurement Operations Dashboard</h2>
              <p className="text-on-surface-variant text-lg mt-2 max-w-2xl font-body">Monitor purchase orders, vendor communication, and operational exceptions with high-precision tracking.</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="bg-surface-container-high text-primary px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-surface-container-highest transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">list_alt</span>
                View All POs
              </button>
              <button onClick={() => setModalOpen(true)} className="bg-cta-gradient text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">upload_file</span>
                Upload Excel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface-container-lowest p-6 rounded-xl custom-shadow">
              <p className="text-[10px] font-bold font-label text-on-surface-variant tracking-widest uppercase">Total POs</p>
              <div className="flex items-end justify-between mt-2">
                <h3 className="text-3xl font-extrabold font-headline">1,450</h3>
                <span className="text-xs font-bold text-[#008a00] bg-[#008a001a] px-2 py-1 rounded-lg flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span> 12%
                </span>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl custom-shadow">
              <p className="text-[10px] font-bold font-label text-on-surface-variant tracking-widest uppercase">Open POs</p>
              <div className="flex items-end justify-between mt-2">
                <h3 className="text-3xl font-extrabold font-headline">320</h3>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">Active</span>
              </div>
            </div>
            <div className="bg-error-container p-6 rounded-xl custom-shadow">
              <p className="text-[10px] font-bold font-label text-on-error-container tracking-widest uppercase">Delayed POs</p>
              <div className="flex items-end justify-between mt-2">
                <h3 className="text-3xl font-extrabold font-headline text-on-error-container">42</h3>
                <span className="material-symbols-outlined text-on-error-container">warning</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl custom-shadow border-l-4 border-error">
              <p className="text-[10px] font-bold font-label text-on-surface-variant tracking-widest uppercase">At-Risk POs</p>
              <div className="flex items-end justify-between mt-2">
                <h3 className="text-3xl font-extrabold font-headline">18</h3>
                <div className="flex -space-x-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white"></div>
                  <div className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface-container-lowest p-8 rounded-xl custom-shadow flex flex-col h-80">
                  <div className="flex justify-between items-start mb-6">
                    <h4 className="font-bold font-headline text-on-surface">PO Status Distribution</h4>
                    <span className="material-symbols-outlined text-on-surface-variant">more_horiz</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center relative">
                    <div className="w-40 h-40 rounded-full border-[20px] border-primary border-r-secondary border-b-secondary-container relative flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-2xl font-extrabold leading-none">78%</p>
                        <p className="text-[10px] font-bold font-label text-on-surface-variant uppercase mt-1">On Time</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center gap-6 mt-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                      <span className="text-xs font-semibold text-on-surface-variant">Completed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-secondary"></div>
                      <span className="text-xs font-semibold text-on-surface-variant">In-Transit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-secondary-container"></div>
                      <span className="text-xs font-semibold text-on-surface-variant">Delayed</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-8 rounded-xl custom-shadow flex flex-col h-80">
                  <div className="flex justify-between items-start mb-6">
                    <h4 className="font-bold font-headline text-on-surface">Order Volume Trend</h4>
                    <div className="flex gap-2">
                      <span className="text-[10px] font-bold font-label bg-surface-container-high px-2 py-1 rounded">WEEKLY</span>
                    </div>
                  </div>
                  <div className="flex-1 flex items-end gap-3 pb-2 border-b border-outline-variant/20">
                    <div className="flex-1 bg-surface-container-low h-[40%] rounded-t-sm"></div>
                    <div className="flex-1 bg-surface-container-low h-[65%] rounded-t-sm"></div>
                    <div className="flex-1 bg-primary h-[85%] rounded-t-sm"></div>
                    <div className="flex-1 bg-surface-container-low h-[55%] rounded-t-sm"></div>
                    <div className="flex-1 bg-surface-container-low h-[70%] rounded-t-sm"></div>
                    <div className="flex-1 bg-primary h-[95%] rounded-t-sm"></div>
                    <div className="flex-1 bg-surface-container-low h-[60%] rounded-t-sm"></div>
                  </div>
                  <div className="flex justify-between mt-3 px-1 text-[10px] font-bold font-label text-on-surface-variant">
                    <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-surface-container-lowest p-6 rounded-xl custom-shadow">
                  <p className="text-[10px] font-bold font-label text-on-surface-variant tracking-widest uppercase">Completed POs</p>
                  <div className="flex items-end justify-between mt-2">
                    <h3 className="text-2xl font-extrabold font-headline">1,130</h3>
                    <span className="material-symbols-outlined text-[#008a00]">check_circle</span>
                  </div>
                </div>
                <div className="bg-surface-container-lowest p-6 rounded-xl custom-shadow">
                  <p className="text-[10px] font-bold font-label text-on-surface-variant tracking-widest uppercase">Active Vendor Chats</p>
                  <div className="flex items-end justify-between mt-2">
                    <h3 className="text-2xl font-extrabold font-headline">24</h3>
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </span>
                  </div>
                </div>
                <div className="bg-surface-container-lowest p-6 rounded-xl custom-shadow">
                  <p className="text-[10px] font-bold font-label text-on-surface-variant tracking-widest uppercase">Manual Interventions</p>
                  <div className="flex items-end justify-between mt-2">
                    <h3 className="text-2xl font-extrabold font-headline">5</h3>
                    <span className="material-symbols-outlined text-on-surface-variant">back_hand</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-surface-container-lowest rounded-xl custom-shadow overflow-hidden">
                <div className="bg-error-container p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-on-error-container">
                    <span className="material-symbols-outlined">notification_important</span>
                    <h4 className="font-bold font-headline text-sm">Critical Exceptions</h4>
                  </div>
                  <span className="bg-error text-white text-[10px] font-bold px-2 py-0.5 rounded-full">12</span>
                </div>
                <div className="p-2">
                  <div className="space-y-1">
                    <div className="p-4 hover:bg-surface-container-low transition-colors rounded-lg cursor-pointer">
                      <div className="flex justify-between">
                        <p className="text-sm font-bold text-on-surface">Global Logistics Ltd</p>
                        <span className="text-[10px] font-bold text-error">DELAYED</span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1">PO #45091 - Shipment stuck at port</p>
                    </div>
                    <div className="p-4 hover:bg-surface-container-low transition-colors rounded-lg cursor-pointer">
                      <div className="flex justify-between">
                        <p className="text-sm font-bold text-on-surface">TechSystems Inc.</p>
                        <span className="text-[10px] font-bold text-primary">WAITING</span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1">Vendor requested manual review of terms</p>
                    </div>
                  </div>
                  <button className="w-full text-primary font-bold text-xs py-4 hover:bg-surface-container-low transition-colors rounded-b-xl">View All Exceptions</button>
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-xl custom-shadow overflow-hidden">
                <div className="p-6 border-b border-outline-variant/10">
                  <h4 className="font-bold font-headline text-on-surface text-sm uppercase tracking-wider">Recent Conversations</h4>
                </div>
                <div className="p-2 space-y-1">
                  <div className="p-4 bg-surface-container-low rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-300"></div>
                        <p className="text-xs font-bold">Horizon Supply</p>
                      </div>
                      <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">BOT ACTIVE</span>
                    </div>
                    <p className="text-xs font-medium text-on-surface italic truncate">"Estimated arrival is now Friday morning..."</p>
                  </div>
                  <div className="p-4 hover:bg-surface-container-low transition-colors rounded-xl cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-400"></div>
                        <p className="text-xs font-bold">Delta Group</p>
                      </div>
                      <span className="text-[10px] font-bold text-on-surface-variant px-2 py-0.5 bg-surface-container-high rounded">MANUAL</span>
                    </div>
                    <p className="text-xs text-on-surface-variant truncate">"Please review the revised invoice attached."</p>
                  </div>
                </div>
                <button className="w-full text-center py-4 border-t border-outline-variant/10 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors">Open Message Center</button>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Upload Modal Popup */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden zoom-in-95 duration-200">
            <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-lowest">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">upload_file</span>
                </div>
                <div>
                  <h4 className="font-extrabold font-headline text-on-surface text-lg">Data Integration Engine</h4>
                  <p className="text-xs text-on-surface-variant">Bulk upload purchase orders and vendor manifests.</p>
                </div>
              </div>
              <button className="text-on-surface-variant hover:text-on-surface transition-colors" onClick={() => setModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-8">
              <div className="border-2 border-dashed border-primary/30 rounded-2xl bg-primary/5 p-12 text-center group hover:border-primary/50 transition-colors cursor-pointer relative">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-md group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary text-3xl">cloud_upload</span>
                </div>
                <p className="text-on-surface font-bold text-lg">Drag and drop your Excel file here</p>
                <p className="text-on-surface-variant text-sm mt-1">Accepts .xlsx, .csv formats up to 50MB</p>
                <div className="flex justify-center gap-4 mt-8">
                  <span className="px-4 py-1.5 bg-white rounded-full text-[11px] font-bold font-label shadow-sm border border-outline-variant/20 text-on-surface-variant">Vendor List</span>
                  <span className="px-4 py-1.5 bg-white rounded-full text-[11px] font-bold font-label shadow-sm border border-outline-variant/20 text-on-surface-variant">Open PO Data</span>
                  <span className="px-4 py-1.5 bg-white rounded-full text-[11px] font-bold font-label shadow-sm border border-outline-variant/20 text-on-surface-variant">Inventory Manifest</span>
                </div>
                <input accept=".xlsx, .csv" className="absolute inset-0 opacity-0 cursor-pointer" type="file" />
              </div>
            </div>
            <div className="p-6 bg-surface-container-lowest border-t border-outline-variant/10 flex justify-end gap-3">
              <button className="px-6 py-2.5 rounded-xl font-bold text-sm text-on-surface-variant hover:bg-surface-container-high transition-all" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="bg-cta-gradient text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:opacity-90 active:scale-95 transition-all">
                Process Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
