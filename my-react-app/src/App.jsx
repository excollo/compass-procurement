import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Chats from './pages/Chats';
import Vendors from './pages/Vendors';
import Escalations from './pages/Escalations';
import EscalationDetail from './pages/EscalationDetail';
import DataExplorer from './pages/DataExplorer';
import Notifications from './pages/Notifications';
import { supabase } from './lib/supabase';

function ToastsContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-4 w-[380px] pointer-events-none">
      {toasts.map(toast => (
        <div 
          key={toast.id}
          className="bg-white/90 backdrop-blur-xl border border-slate-200/50 shadow-2xl rounded-[1.5rem] p-5 flex gap-4 animate-toast-in pointer-events-auto group"
          role="alert"
        >
          <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center ${toast.priority === 'critical' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
            <span className="material-symbols-outlined text-2xl animate-pulse">
              {toast.priority === 'critical' ? 'emergency_home' : 'warning'}
            </span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">New Escalation</p>
              <button 
                onClick={() => removeToast(toast.id)}
                className="text-slate-300 hover:text-slate-500 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <h4 className="text-sm font-black text-slate-900 truncate mb-0.5">
              PO #{toast.po_num}
            </h4>
            <p className="text-[11px] font-medium text-slate-500 truncate mb-3">
              {toast.vendor_name} · {toast.reason.replace('_', ' ')}
            </p>
            
            <Link 
              to={`/escalations/${toast.id}`}
              onClick={() => removeToast(toast.id)}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
            >
              View Detail
              <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(20px) scale(0.95); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        .animate-toast-in {
          animation: toast-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}

function App() {
  const [toasts, setToasts] = useState([]);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    const channel = supabase
      .channel('global-escalations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'escalations' },
        (payload) => {
          const newEsc = payload.new;
          const toastId = newEsc.id;
          
          setToasts(prev => [
            {
              id: toastId,
              po_num: newEsc.po_num,
              vendor_name: newEsc.vendor_name,
              reason: newEsc.escalation_reason,
              priority: newEsc.priority,
              created_at: newEsc.escalation_created_at
            },
            ...prev
          ].slice(0, 3)); // show max 3 latest

          // Auto remove after 8s
          setTimeout(() => removeToast(toastId), 8000);
          
          // Play sound if possible (optional)
          // new Audio('/notification-pop.mp3').play().catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <BrowserRouter>
      <ToastsContainer toasts={toasts} removeToast={removeToast} />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:poNum" element={<OrderDetail />} />
        <Route path="/chats" element={<Chats />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/escalations" element={<Escalations />} />
        <Route path="/escalations/:id" element={<EscalationDetail />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/data-explorer" element={<DataExplorer />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
