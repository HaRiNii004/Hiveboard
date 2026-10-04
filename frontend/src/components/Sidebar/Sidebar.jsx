import { useLayoutEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Star,
  CheckSquare,
  Calendar as CalendarIcon,
  Plus,
  ChevronRight,
  ChevronLeft,
  Settings,
  LogOut
} from 'lucide-react';
import logo from '../../assets/logo.svg';
import './Sidebar.css';

const COLLAPSED_KEY = 'sidebarCollapsed';

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);

  // Pages offset their content by --sidebar-width, which this class switches
  // (see variables.css). Runs before paint so there's no flash on page load.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('sidebar-collapsed', collapsed);
    try {
      localStorage.setItem(COLLAPSED_KEY, String(collapsed));
    } catch {
      // Storage unavailable (e.g. private mode): collapse still works for this page
    }
  }, [collapsed]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Labels are hidden when collapsed, so show them as hover tooltips instead
  const tooltip = (label) => (collapsed ? label : undefined);

  return (
    <>
      <aside className={`sidebar-container ${collapsed ? 'collapsed' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand" onClick={() => navigate('/dashboard')} title={tooltip('hiveboard')}>
          <img src={logo} alt="Hiveboard Logo" className="brand-logo" />
          <span className="brand-text">hiveboard</span>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav">
          <ul className="nav-list">
            <li
              className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
              onClick={() => navigate('/dashboard')}
              title={tooltip('Dashboard')}
            >
              <LayoutDashboard size={20} className="nav-icon" />
              <span className="nav-label">Dashboard</span>
            </li>
            <li className="nav-item" title={tooltip('Starred')}>
              <Star size={20} className="nav-icon" />
              <span className="nav-label">Starred</span>
            </li>
            <li className="nav-item" title={tooltip('My Tasks')}>
              <CheckSquare size={20} className="nav-icon" />
              <span className="nav-label">My Tasks</span>
            </li>
            <li className="nav-item" title={tooltip('Calendar')}>
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
          <div className="workspace-item active" title={tooltip('My Workspace')}>
            <div className="workspace-logo">
              <span>W</span>
            </div>
            <span className="workspace-label">My Workspace</span>
            <ChevronRight size={16} className="workspace-chevron" />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sidebar-footer">
          <div className="footer-item" title={tooltip('Settings')}>
            <Settings size={20} className="footer-icon" />
            <span className="footer-label">Settings</span>
          </div>
          <div className="footer-item logout" onClick={handleLogout} title={tooltip('Logout')}>
            <LogOut size={20} className="footer-icon" />
            <span className="footer-label">Logout</span>
          </div>
        </div>
      </aside>

      {/* Collapse / expand arrow, sitting on the sidebar's right edge.
          Rendered outside <aside> so the sidebar's scroll area doesn't clip it. */}
      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setCollapsed(c => !c)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </>
  );
}
