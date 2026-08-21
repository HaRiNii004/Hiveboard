import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import './styles/variables.css';
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';

// Simple placeholder so /login has somewhere to redirect to after auth.
// Swap this out once you build the real dashboard page.
function Dashboard() {
  return (
    <div style={{ padding: 40, fontFamily: 'var(--font-body)' }}>
      <h1>Dashboard</h1>
      <p>You're logged in. Board list goes here (Phase 2).</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}