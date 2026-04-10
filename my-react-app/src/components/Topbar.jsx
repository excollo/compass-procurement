import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Topbar = ({ title = "Procurement Ops" }) => {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // fetch unread count on mount
    const fetchCount = async () => {
      const { count } = await supabase
        .from('escalations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open');
      setUnreadCount(count || 0);
    };
    fetchCount();

    // subscribe to new escalations
    const channel = supabase
      .channel('topbar-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'escalations'
      }, () => {
        setUnreadCount(prev => prev + 1);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'escalations',
        filter: 'status=eq.resolved'
      }, () => {
        setUnreadCount(prev => Math.max(0, prev - 1));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return (
    <header className="flex justify-between items-center h-16 px-8 w-full bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm z-40 flex-shrink-0">
      <div className="flex items-center gap-6">
        <h1 className="text-base font-black tracking-tighter text-slate-900 dark:text-white uppercase font-headline">
          {title}
        </h1>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-700">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Bell icon in topbar */}
        <div
          onClick={() => navigate('/notifications')}
          style={{
            position: 'relative',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center'
          }}
          className="hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
            style={{ color: '#6B7280' }}>
            <path d="M9 2a5 5 0 015 5v3l1.5 2H2.5L4 10V7a5 5 0 015-5z"
              stroke="currentColor" strokeWidth="1.3"/>
            <path d="M7 14.5a2 2 0 004 0"
              stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              background: '#DC2626',
              color: '#fff',
              fontSize: '9px',
              fontWeight: 700,
              minWidth: '14px',
              height: '14px',
              borderRadius: '7px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px'
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 ml-2">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-black text-slate-800 dark:text-slate-200">Alex Rivera</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Ops Manager</p>
          </div>
          <img alt="User profile" className="w-9 h-9 rounded-full border-2 border-slate-200 dark:border-slate-700 shadow-sm"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8ov37m6Ru1jtLXavUm2Wv7-q8IqttbDcSU5OJzUCKT6ZmPdV8o10Gkm2bzBBlUkUAfR7nPEInOWhBPKK0JB-n56VPQC2sJvCZVr9a9eqzujzWSusoB7Pqo3Zl5PSfDCMpzoPbo0JZh5CHcjqc7lATQ1qKELXGJ7WeD5DB3SN3FaTJ4H9VBzP_Fvv51A3UPXtSYL_rtKoK2k8LRfiEklf60DY9c3Hul2Ue3yIjaHQmSa85wLfALExg-6xFvgM8lPDR6WQOIutN4I6d" />
        </div>
      </div>
    </header>
  );
};

export default Topbar;
