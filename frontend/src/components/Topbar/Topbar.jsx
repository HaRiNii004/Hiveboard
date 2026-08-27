import React from 'react';
import { Search, Bell, HelpCircle, ChevronDown } from 'lucide-react';
import './Topbar.css';

export default function Topbar() {
  const storedUser = localStorage.getItem('user');
  let userName = 'Harini Selvaraj';
  
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      if (parsed && parsed.fullName) {
        userName = parsed.fullName;
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Get initials for profile placeholder
  const getInitials = (name) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header className="topbar-container">
      {/* Search Input bar */}
      <div className="topbar-search">
        <Search className="search-icon" size={18} />
        <input 
          type="text" 
          placeholder="Search boards..." 
          className="search-input"
        />
        <div className="search-shortcut">
          <kbd className="shortcut-key">⌘K</kbd>
        </div>
      </div>

      {/* Right Quick Actions & User Profile */}
      <div className="topbar-actions">
        <button className="action-btn notifications-btn" aria-label="Notifications">
          <Bell size={20} />
          <span className="notification-badge"></span>
        </button>
        
        <button className="action-btn help-btn" aria-label="Help">
          <HelpCircle size={20} />
        </button>

        <div className="user-profile-menu">
          <div className="avatar-wrapper">
            {/* If there's initials, style with our orange theme */}
            <span className="avatar-initials">{getInitials(userName)}</span>
          </div>
          <span className="user-name">{userName}</span>
          <ChevronDown size={14} className="dropdown-chevron" />
        </div>
      </div>
    </header>
  );
}
