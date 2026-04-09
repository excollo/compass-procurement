import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Chats from './pages/Chats';
import Vendors from './pages/Vendors';
import Escalations from './pages/Escalations';
import EscalationDetail from './pages/EscalationDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:poNum" element={<OrderDetail />} />
        <Route path="/chats" element={<Chats />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/escalations" element={<Escalations />} />
        <Route path="/escalations/:id" element={<EscalationDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
