import React from 'react';
import { NavLink } from 'react-router-dom';

const NavItem = ({ to, icon, label, badge }) => {
  const innerContent = (isActive) => (
    <>
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-md"></div>}
      <div className="flex items-center gap-3">
        <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>{icon}</span>
        <span>{label}</span>
      </div>
      {badge && (
        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
          {badge}
        </span>
      )}
    </>
  );

  const baseClasses = "flex justify-between items-center px-4 py-2 rounded-[0.75rem] transition-colors text-[13px] font-medium relative overflow-hidden group ";

  if (to) {
    return (
      <NavLink 
        to={to} 
        className={({ isActive }) => baseClasses + (isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}
      >
        {({ isActive }) => innerContent(isActive)}
      </NavLink>
    );
  }

  return (
    <div className={baseClasses + 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 cursor-default'}>
      {innerContent(false)}
    </div>
  );
};

const Sidebar = () => {
  return (
    <aside className="hidden md:flex flex-col h-screen w-64 bg-white border-r border-slate-100 z-50 flex-shrink-0">

      {/* Search & Ask Agent */}
      <div className="p-4 space-y-3">

        <button className="w-full flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2.5 rounded-xl transition-colors text-[13px] font-semibold">
          <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
          Ask Agent
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 space-y-6 pb-6 no-scrollbar">
        {/* COMMAND */}
        <div>
          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-4 mb-2">Command</h4>
          <div className="space-y-0.5">
            <NavItem to="/dashboard" icon="grid_view" label="Dashboard" />
            <NavItem to="/data-explorer" icon="layers" label="Data Explorer" />
          </div>
        </div>

        {/* OPERATIONS */}
        <div>
          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-4 mb-2">Operations</h4>
          <div className="space-y-0.5">
            <NavItem to="/orders" icon="inventory_2" label="Purchase Orders" />
            <NavItem to="/vendors" icon="group" label="Vendors" />
            <NavItem to="/chats" icon="chat_bubble_outline" label="Conversations" />
            <NavItem to="/escalations" icon="warning" label="Escalations" />
          </div>
        </div>

        {/* SYSTEM */}
        <div className="pt-2">
          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-4 mb-2">System</h4>
          <div className="space-y-0.5">
            <NavItem icon="settings" label="Settings" />
            <NavItem icon="help_outline" label="Help" />
          </div>
        </div>
      </nav>

      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}} />
    </aside>
  );
};

export default Sidebar;
