import { useEffect, useRef } from 'react';
import { Search, HelpCircle, ChevronDown, X } from 'lucide-react';
import NotificationBell from '../Notifications/NotificationBell';
import './Topbar.css';
import { getStoredUser } from '../../utils/authSession';

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

// searchValue / onSearchChange: the page owns the search text (the dashboard filters its boards)
export default function Topbar({ showSearch = true, searchValue = '', onSearchChange }) {
  const searchRef = useRef(null);

  // Ctrl+K (⌘K on Mac) jumps to the search box from anywhere on the page
  useEffect(() => {
    if (!showSearch) return undefined;
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (searchRef.current) {
          searchRef.current.focus();
          searchRef.current.select();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

  const handleSearchKeyDown = (e) => {
    // Esc clears the search; a second Esc leaves the box
    if (e.key === 'Escape') {
      if (searchValue) {
        onSearchChange && onSearchChange('');
      } else {
        e.currentTarget.blur();
      }
    }
  };

  const storedUser = getStoredUser();
  const userName = storedUser && storedUser.fullName ? storedUser.fullName : 'Harini Selvaraj';

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
      {/* Search Input bar (dashboard only) */}
      {showSearch && (
        <div className="topbar-search">
          <Search className="search-icon" size={18} />
          <input
            ref={searchRef}
            type="search"
            placeholder="Search boards..."
            className="search-input"
            value={searchValue}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            aria-label="Search boards by name, description or creator"
            autoComplete="off"
          />
          {searchValue ? (
            <button
              type="button"
              className="search-clear"
              onClick={() => {
                onSearchChange && onSearchChange('');
                if (searchRef.current) searchRef.current.focus();
              }}
              aria-label="Clear search"
              title="Clear search (Esc)"
            >
              <X size={14} />
            </button>
          ) : (
            <div className="search-shortcut" aria-hidden="true">
              <kbd className="shortcut-key">{IS_MAC ? '⌘K' : 'Ctrl K'}</kbd>
            </div>
          )}
        </div>
      )}

      {/* Right Quick Actions & User Profile */}
      <div className="topbar-actions">
        <NotificationBell />
        
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
