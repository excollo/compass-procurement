import React from 'react';
import Sidebar from '../components/Sidebar';

const Chats = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-background max-h-screen">
      <Sidebar />
      <main className="flex-1 flex overflow-hidden w-full">
        {/* PO List Sidebar */}
        <section className="w-80 flex flex-col bg-surface-container-low border-r border-outline-variant/20 h-full">
          <div className="p-6">
            <h2 className="text-xl font-bold text-on-surface mb-4">Vendor Chats</h2>
            <div className="relative">
              <input className="w-full bg-surface-container-lowest border-none rounded-lg text-sm px-10 py-2.5 focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/50" placeholder="Search POs..." type="text" />
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant/50 text-sm">search</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 space-y-2 no-scrollbar pb-4">
            <div className="p-4 bg-surface-container-lowest rounded-xl border-l-4 border-primary shadow-sm group cursor-pointer transition-all">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">PO-2024-884</span>
                <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[10px] font-bold">HIGH RISK</span>
              </div>
              <h3 className="font-bold text-sm text-on-surface truncate">Apex Logistics</h3>
              <p className="text-xs text-on-surface-variant mt-1 line-clamp-1">Human intervention active...</p>
              <div className="flex items-center gap-2 mt-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                <span className="text-[10px] font-semibold text-primary uppercase">Live Thread</span>
              </div>
            </div>

            <div className="p-4 hover:bg-surface-container-highest/30 rounded-xl cursor-pointer transition-all">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">PO-2024-912</span>
                <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase">On Track</span>
              </div>
              <h3 className="font-bold text-sm text-on-surface truncate">Global Circuitry Inc</h3>
              <p className="text-xs text-on-surface-variant mt-1 line-clamp-1">Bot: Shipping confirmation received.</p>
            </div>

            <div className="p-4 hover:bg-surface-container-highest/30 rounded-xl cursor-pointer transition-all">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">PO-2024-772</span>
                <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant text-[10px] font-bold uppercase">Awaiting Info</span>
              </div>
              <h3 className="font-bold text-sm text-on-surface truncate">Prime Materials Corp</h3>
              <p className="text-xs text-on-surface-variant mt-1 line-clamp-1">Vendor: Will update by EOD.</p>
            </div>
          </div>
        </section>

        {/* Main Chat Area */}
        <section className="flex-1 flex flex-col bg-surface-container-lowest h-full overflow-hidden">
          <header className="h-16 flex items-center justify-between px-8 border-b border-outline-variant/10 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img alt="Vendor Logo" className="w-10 h-10 rounded-lg object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDMZOEa2DXAQEdCh7i4MNWp4sq2dCUUumGj9rEtBBwxM1peMqyHHb64nzjv-fvic-IRySsnaGVhtjBusJmXCz876AXhfvrirI_JmyrhaPYIyx_D-s3CRyCKU_njBLDScfrzUWPHhn5vUnLEoFIlbut8Tan6AhHcW3CW0BcFoNHdQ0S4Eq6MSWrHnyQl19iqazHGif23gQa4sNfrucjhup3lNqZFSXQJ821v9o_imoE9h8xp8vRrxoCIAledagdQMe5um0iiRAyWIhaZ" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div>
                <h2 className="text-sm font-bold text-on-surface">Apex Logistics – Delivery Ops</h2>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Human Intervention Mode</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-all">
                <span className="material-symbols-outlined">search</span>
              </button>
              <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-all">
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#fafbfd]">
            <div className="flex justify-center">
              <span className="px-4 py-1 bg-surface-container-low rounded-full text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Today</span>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-sm text-on-surface-variant">smart_toy</span>
              </div>
              <div className="flex flex-col gap-1 max-w-[70%]">
                <span className="text-[10px] font-bold text-on-surface-variant ml-2 uppercase">Architect Bot</span>
                <div className="p-4 bg-white/60 border border-outline-variant/30 backdrop-blur-md rounded-2xl rounded-tl-none shadow-sm text-sm leading-relaxed">
                  Hello Apex Team, I am checking on the ETA for PO-2024-884. It was scheduled for delivery 2 hours ago. Could you please provide a status update?
                </div>
                <span className="text-[10px] text-on-surface-variant/60 ml-2">10:15 AM</span>
              </div>
            </div>

            <div className="flex items-start gap-4 flex-row-reverse">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img alt="Vendor Representative" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAh5hcGtHHsvCexKT50Kt9n5wN1t1kOltz7jA3S5sW_96KUI8zPHYtxBXYI9Mc_NZv9CMWgNJc-0GYNOnZZZxUKeNBOY7ZbFg3AwOcDfBcZP7jZKvRnQRrKON3SkhqBIK7D4mRVZy-VaWqI0vHKhWmY10k6F9dFPFi3icvx6QYCE_kfaVsaAn5TEmELqId4rxgAxoR-pK3xClVfeibZ1rY64SfUjhK0azwULWkeGqZtpVLUnJQ3CvtpxMN0Zn2bWfbBZ95pYjVZ1SDT" />
              </div>
              <div className="flex flex-col items-end gap-1 max-w-[70%]">
                <span className="text-[10px] font-bold text-on-surface-variant mr-2 uppercase">Marco (Vendor)</span>
                <div className="p-4 bg-primary text-white rounded-2xl rounded-tr-none shadow-md shadow-primary/10 text-sm leading-relaxed">
                  Hi there. We had a breakdown on the interstate with the transport vehicle. Currently dispatching a backup truck, but delivery is delayed by at least 6 hours. Apologies for the late notice.
                </div>
                <span className="text-[10px] text-on-surface-variant/60 mr-2 text-right">10:18 AM</span>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="px-6 py-2 bg-error-container/30 border border-error-container rounded-lg flex items-center gap-3">
                <span className="material-symbols-outlined text-error text-lg">warning</span>
                <span className="text-xs font-bold text-on-error-container">Bot detected high-risk delay. Requesting human operator...</span>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0 text-white font-bold text-[10px]">SC</div>
              <div className="flex flex-col gap-1 max-w-[70%]">
                <span className="text-[10px] font-bold text-primary ml-2 uppercase">Sarah (Operator)</span>
                <div className="p-4 bg-primary-container text-on-primary-container rounded-2xl rounded-tl-none shadow-sm text-sm leading-relaxed">
                  Hi Marco, this is Sarah from the operations team. We have a production shift starting at 2 PM that depends on this material. Can you confirm if the backup truck is already on-site or if we need to look for a local courier alternative?
                </div>
                <span className="text-[10px] text-on-surface-variant/60 ml-2">10:22 AM</span>
              </div>
            </div>
          </div>

          <footer className="p-6 bg-white border-t border-outline-variant/10 flex-shrink-0 mt-auto">
            <div className="flex items-end gap-4 max-w-5xl mx-auto">
              <div className="flex-1 relative">
                <textarea className="w-full bg-surface-container-low border-none rounded-2xl px-6 py-4 pr-12 focus:ring-2 focus:ring-primary/20 resize-none text-sm" placeholder="Type a message to Marco..." rows="1"></textarea>
                <div className="absolute right-4 bottom-3.5 flex gap-2">
                  <button className="text-on-surface-variant/60 hover:text-primary transition-all">
                    <span className="material-symbols-outlined text-xl">attach_file</span>
                  </button>
                </div>
              </div>
              <button className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all">
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
            <div className="mt-4 flex items-center justify-center gap-6">
              <button className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest hover:text-primary transition-all">
                <span className="material-symbols-outlined text-sm">alternate_email</span> Mention PO
              </button>
              <button className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest hover:text-primary transition-all">
                <span className="material-symbols-outlined text-sm">insert_drive_file</span> Attach Invoice
              </button>
              <button className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest hover:text-primary transition-all">
                <span className="material-symbols-outlined text-sm">schedule</span> Set Reminder
              </button>
            </div>
          </footer>
        </section>

        {/* Right Context Panel */}
        <section className="w-80 bg-surface-container-low flex flex-col border-l border-outline-variant/20 h-full overflow-y-auto">
          <div className="p-6 border-b border-outline-variant/10">
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">Case Overview</h3>
            <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm space-y-4">
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase">Purchase Order</p>
                <p className="text-sm font-bold text-on-surface">PO-2024-884</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase">Vendor</p>
                <p className="text-sm font-bold text-on-surface underline underline-offset-4 decoration-primary/30">Apex Logistics LLC</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase">Current Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container text-[10px] font-black uppercase">Manual Intervention</span>
                </div>
              </div>
              <div className="pt-2 border-t border-outline-variant/10">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase">Risk Level</p>
                <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-error h-full" style={{ width: "85%" }}></div>
                </div>
                <p className="text-[10px] text-error font-bold mt-1">85% - Severe Supply Chain Impact</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Operator Controls</h3>
            <button className="w-full py-3.5 px-4 bg-surface-container-highest/50 text-on-surface font-bold text-xs rounded-xl flex items-center justify-between group hover:bg-surface-container-highest transition-all">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">pan_tool</span>
                Take Over Chat
              </span>
              <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-all">chevron_right</span>
            </button>
            <button className="w-full py-3.5 px-4 bg-primary text-white font-bold text-xs rounded-xl flex items-center justify-between shadow-lg shadow-primary/20 hover:bg-primary-container transition-all">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">smart_toy</span>
                Hand Back to Bot
              </span>
            </button>
            <button className="w-full py-3.5 px-4 bg-surface-container-highest/50 text-error font-bold text-xs rounded-xl flex items-center gap-2 hover:bg-error-container transition-all">
              <span className="material-symbols-outlined text-lg">pause_circle</span>
              Pause Bot Completely
            </button>
            <div className="mt-6 pt-6 border-t border-outline-variant/10">
              <button className="w-full py-3.5 px-4 border border-outline-variant rounded-xl text-on-surface font-bold text-xs flex items-center gap-2 hover:bg-surface-container-lowest transition-all">
                <span className="material-symbols-outlined text-lg">note_add</span>
                Internal Note
              </button>
              <button className="w-full mt-3 py-3.5 px-4 bg-green-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-600/10 hover:bg-green-700 transition-all">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                Mark Resolved
              </button>
            </div>
          </div>
          
          <div className="mx-6 mb-6 mt-auto p-4 glass-insight border border-white/40 rounded-2xl shadow-xl flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
              <span className="text-[10px] font-black text-on-surface uppercase tracking-widest">AI Prediction</span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
              Apex has a 22% delay recurrence on this route. Recommend switching to <span className="font-bold text-on-surface">Swift Logistics</span> for Q4 shipments.
            </p>
            <button className="mt-3 text-[10px] font-bold text-primary hover:underline uppercase">View Full Analysis</button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Chats;
