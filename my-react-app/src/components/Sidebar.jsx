import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  return (
    <aside className="hidden md:flex flex-col p-4 gap-y-2 h-screen w-64 bg-[#f2f4f6] dark:bg-slate-900 border-r-0 z-50 flex-shrink-0">
      <div className="flex items-center gap-3 px-2 py-4 mb-4">
        <div className="w-10 h-10 bg-cta-gradient rounded-lg flex items-center justify-center text-white">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>architecture</span>
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-50 leading-none">ProcureOps</h1>
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mt-1">Enterprise Tier</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1">
        <NavLink to="/dashboard" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-transform duration-200 ease-in-out text-xs font-semibold font-label ${isActive ? 'bg-white dark:bg-slate-800 text-[#2563eb] shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
          Dashboard
        </NavLink>
        <NavLink to="/orders" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-transform duration-200 ease-in-out text-xs font-semibold font-label ${isActive ? 'bg-white dark:bg-slate-800 text-[#2563eb] shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}>
          <span className="material-symbols-outlined">receipt_long</span>
          Purchase Orders
        </NavLink>
        <NavLink to="/chats" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-transform duration-200 ease-in-out text-xs font-semibold font-label ${isActive ? 'bg-white dark:bg-slate-800 text-[#2563eb] shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}>
          <span className="material-symbols-outlined">forum</span>
          Chats
        </NavLink>
        <NavLink to="/uploads" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-transform duration-200 ease-in-out text-xs font-semibold font-label ${isActive ? 'bg-white dark:bg-slate-800 text-[#2563eb] shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}>
          <span className="material-symbols-outlined">cloud_upload</span>
          Uploads
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-transform duration-200 ease-in-out text-xs font-semibold font-label ${isActive ? 'bg-white dark:bg-slate-800 text-[#2563eb] shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}>
          <span className="material-symbols-outlined">settings</span>
          Settings
        </NavLink>
      </nav>
      <div className="mt-auto pt-4 border-t border-slate-200/50 dark:border-slate-800 space-y-1">
        <button className="w-full bg-cta-gradient text-white py-3 px-4 rounded-xl font-bold text-sm shadow-lg mb-4 hover:opacity-90 active:scale-95 transition-all">
          New Request
        </button>
        <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 font-label text-xs font-semibold">
          <span className="material-symbols-outlined">help</span>
          Help Center
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
