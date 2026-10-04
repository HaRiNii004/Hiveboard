import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Star, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronRight, 
  Settings, 
  LogOut
} from 'lucide-react';
import logo from '../../assets/logo.svg';
import './Sidebar.css';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <aside className="sidebar-container">
      {/* Brand Header */}
      <div className="sidebar-brand" onClick={() => navigate('/dashboard')}>
        <img src={logo} alt="Hiveboard Logo" className="brand-logo" />
        <span className="brand-text">hiveboard</span>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        <ul className="nav-list">
          <li className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`} onClick={() => navigate('/dashboard')}>
            <LayoutDashboard size={20} className="nav-icon" />
            <span className="nav-label">Dashboard</span>
          </li>
          <li className="nav-item">
            <Star size={20} className="nav-icon" />
            <span className="nav-label">Starred</span>
          </li>
          <li className="nav-item">
            <CheckSquare size={20} className="nav-icon" />
            <span className="nav-label">My Tasks</span>
          </li>
          <li className="nav-item">
            <CalendarIcon size={20} className="nav-icon" />
            <span className="nav-label">Calendar</span>
          </li>
        </ul>
      </nav>

      {/* Workspaces Section */}
      <div className="sidebar-workspaces">
        <div className="section-header">
          <span className="section-title">WORKSPACES</span>
          <button className="add-workspace-btn" aria-label="Add Workspace">
            <Plus size={16} />
          </button>
        </div>
        <div className="workspace-item active">
          <div className="workspace-logo">
            <span>W</span>
          </div>
          <span className="workspace-label">My Workspace</span>
          <ChevronRight size={16} className="workspace-chevron" />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="sidebar-footer">
        <div className="footer-item">
          <Settings size={20} className="footer-icon" />
          <span className="footer-label">Settings</span>
        </div>
        <div className="footer-item logout" onClick={handleLogout}>
          <LogOut size={20} className="footer-icon" />
          <span className="footer-label">Logout</span>
        </div>
      </div>
    </aside>
  );
}
