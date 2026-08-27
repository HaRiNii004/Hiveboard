import React, { useState } from 'react';
import { Star, ChevronDown, Grid, List as ListIcon, Plus } from 'lucide-react';
import Sidebar from '../../components/Sidebar/Sidebar';
import Topbar from '../../components/Topbar/Topbar';
import Bee from '../../components/Bee/Bee';
import './Dashboard.css';

// Mock boards data matching the provided screenshot
const INITIAL_BOARDS = [
  {
    id: '1',
    title: 'Project Roadmap',
    updated: 'Updated 2h ago',
    type: 'roadmap',
    starred: false
  },
  {
    id: '2',
    title: 'Marketing Plan',
    updated: 'Updated yesterday',
    type: 'marketing',
    starred: false
  },
  {
    id: '3',
    title: 'Content Calendar',
    updated: 'Updated 2d ago',
    type: 'calendar',
    starred: false
  },
  {
    id: '4',
    title: 'Product Ideas',
    updated: 'Updated 3d ago',
    type: 'ideas',
    starred: false
  },
  {
    id: '5',
    title: 'Design Inspiration',
    updated: 'Updated 5d ago',
    type: 'design',
    starred: false
  },
  {
    id: '6',
    title: 'Personal Tasks',
    updated: 'Updated 1w ago',
    type: 'tasks',
    starred: false
  },
  {
    id: '7',
    title: 'Team OKRs',
    updated: 'Updated 1w ago',
    type: 'okrs',
    starred: false
  }
];

export default function Dashboard() {
  const [boards, setBoards] = useState(INITIAL_BOARDS);
  const [sortBy, setSortBy] = useState('Last opened');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

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

  const firstName = userName.split(' ')[0];

  const handleToggleStar = (boardId, e) => {
    e.stopPropagation();
    setBoards(boards.map(b => b.id === boardId ? { ...b, starred: !b.starred } : b));
  };

  // Render a tiny visual preview inside each card to match mockup layouts
  const renderBoardPreview = (type) => {
    switch (type) {
      case 'roadmap':
        return (
          <div className="preview-roadmap">
            <div className="preview-column">
              <span className="col-bar"></span>
              <span className="col-card"></span>
              <span className="col-card short"></span>
            </div>
            <div className="preview-column">
              <span className="col-bar"></span>
              <span className="col-card medium"></span>
            </div>
            <div className="preview-column">
              <span className="col-bar"></span>
              <span className="col-card"></span>
              <span className="col-card short"></span>
            </div>
          </div>
        );
      case 'marketing':
        return (
          <div className="preview-marketing">
            <div className="preview-lines">
              <span className="preview-line wide"></span>
              <span className="preview-line"></span>
              <span className="preview-line medium"></span>
              <span className="preview-line short"></span>
            </div>
            <svg className="preview-pie" viewBox="0 0 36 36">
              <path className="pie-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#ffe0b2" strokeWidth="6" />
              <path className="pie-slice" strokeDasharray="35, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="#f28f0f" strokeWidth="6" />
            </svg>
          </div>
        );
      case 'calendar':
        return (
          <div className="preview-calendar">
            <div className="calendar-header">
              <span className="cal-header-bar"></span>
            </div>
            <div className="calendar-grid">
              {Array.from({ length: 28 }).map((_, i) => (
                <div key={i} className="calendar-cell">
                  {i === 11 && <span className="calendar-dot yellow"></span>}
                  {i === 17 && <span className="calendar-dot orange"></span>}
                </div>
              ))}
            </div>
          </div>
        );
      case 'ideas':
        return (
          <div className="preview-ideas">
            <div className="idea-note"></div>
            <div className="idea-note"></div>
            <div className="idea-note"></div>
            <div className="idea-note"></div>
          </div>
        );
      case 'design':
        return (
          <div className="preview-design">
            <div className="design-layout">
              <div className="design-left">
                <span className="design-bar"></span>
                <span className="design-bar short"></span>
              </div>
              <div className="design-right">
                <svg className="design-artwork" viewBox="0 0 40 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="40" height="30" rx="4" fill="#fff5e6" />
                  <circle cx="12" cy="10" r="4" fill="#ffd080" />
                  <path d="M4 26 L16 14 L28 26 Z" fill="#ffb821" opacity="0.8" />
                  <path d="M14 26 L26 12 L38 26 Z" fill="#f58e14" />
                </svg>
              </div>
            </div>
          </div>
        );
      case 'tasks':
        return (
          <div className="preview-tasks">
            <div className="task-row">
              <span className="task-checkbox checked">✓</span>
              <span className="task-line"></span>
            </div>
            <div className="task-row">
              <span className="task-checkbox checked">✓</span>
              <span className="task-line"></span>
            </div>
            <div className="task-row">
              <span className="task-checkbox checked">✓</span>
              <span className="task-line short"></span>
            </div>
          </div>
        );
      case 'okrs':
        return (
          <div className="preview-okrs">
            <div className="okrs-left">
              <svg className="okrs-target" viewBox="0 0 36 36" fill="none">
                <circle cx="18" cy="18" r="16" stroke="#ffd79e" strokeWidth="2.5" />
                <circle cx="18" cy="18" r="11" stroke="#fca93b" strokeWidth="2.5" />
                <circle cx="18" cy="18" r="6" stroke="#f28f0f" strokeWidth="2.5" fill="#f28f0f" />
                <line x1="18" y1="18" x2="30" y2="6" stroke="#3c2415" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="okrs-right">
              <span className="okr-bar"></span>
              <span className="okr-bar"></span>
              <span className="okr-bar short"></span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getBoardIcon = (type) => {
    switch (type) {
      case 'roadmap':
        return <span className="board-emoji">📁</span>;
      case 'marketing':
        return <span className="board-emoji">📢</span>;
      case 'calendar':
        return <span className="board-emoji">📅</span>;
      case 'ideas':
        return <span className="board-emoji">💡</span>;
      case 'design':
        return <span className="board-emoji">🎨</span>;
      case 'tasks':
        return <span className="board-emoji">✓</span>;
      case 'okrs':
        return <span className="board-emoji">🎯</span>;
      default:
        return <span className="board-emoji">📋</span>;
    }
  };

  return (
    <div className="dashboard-page">
      <Sidebar />
      <div className="dashboard-main-content">
        <Topbar />

        {/* Dashboard Content Panel */}
        <main className="dashboard-content-panel">
          
          {/* Header decorative Honeycomb & Bee overlay */}
          <div className="header-decoration">
            <svg className="honeycomb-bg" width="300" height="240" viewBox="0 0 300 240" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Honeycomb Pattern Mesh */}
              <defs>
                <pattern id="honeycomb-pattern" width="36" height="62.4" patternUnits="userSpaceOnUse">
                  <path d="M 0 0 L 18 10.4 L 36 0 L 36 20.8 L 18 31.2 L 0 20.8 Z M 0 62.4 L 18 52 L 36 62.4 L 36 41.6 L 18 31.2 L 0 41.6 Z" fill="none" stroke="rgba(242, 143, 15, 0.12)" strokeWidth="1.5" />
                </pattern>
              </defs>
              <rect width="300" height="240" fill="url(#honeycomb-pattern)" />
              {/* Flight Path */}
              <path d="M 120 180 C 140 130, 200 120, 230 150" stroke="#f28f0f" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" opacity="0.6" />
              {/* Render Bee inside SVG */}
              <Bee x={230} y={150} rotate={45} type="idea" size={38} />
            </svg>
          </div>

          {/* Welcome greeting */}
          <div className="welcome-banner">
            <h1 className="welcome-title">Welcome back, {firstName}! 👋</h1>
            <p className="welcome-subtitle">Here's what's happening in your workspace.</p>
          </div>

          {/* All Boards Section */}
          <section className="boards-section">
            <div className="boards-header">
              <h2 className="section-title">All Boards</h2>
              
              <div className="boards-controls">
                <div className="sort-dropdown">
                  <span className="sort-label">Sort by:</span>
                  <button className="sort-btn">
                    {sortBy}
                    <ChevronDown size={16} />
                  </button>
                </div>

                <div className="view-toggle">
                  <button 
                    className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    aria-label="Grid View"
                  >
                    <Grid size={18} />
                  </button>
                  <button 
                    className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setViewMode('list')}
                    aria-label="List View"
                  >
                    <ListIcon size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Boards Grid */}
            <div className={`boards-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
              
              {/* Create Board Card */}
              <div className="board-card create-card">
                <div className="create-card-content">
                  <div className="hexagon-btn">
                    <svg className="hexagon-svg" viewBox="0 0 100 100">
                      <polygon points="50,5 95,25 95,75 50,95 5,75 5,25" fill="none" stroke="#f28f0f" strokeWidth="4" />
                    </svg>
                    <Plus className="plus-icon" size={28} />
                  </div>
                  <span className="create-label">Create Board</span>
                </div>
              </div>

              {/* Dynamic board list cards */}
              {boards.map(board => (
                <div key={board.id} className="board-card real-board">
                  
                  {/* Card Visual Preview */}
                  <div className="board-card-preview">
                    {renderBoardPreview(board.type)}
                  </div>

                  {/* Card Details */}
                  <div className="board-card-info">
                    <div className="board-card-header">
                      {getBoardIcon(board.type)}
                      <h3 className="board-card-title">{board.title}</h3>
                    </div>
                    
                    <div className="board-card-footer">
                      <span className="board-updated">{board.updated}</span>
                      <button 
                        className={`star-btn ${board.starred ? 'starred' : ''}`}
                        onClick={(e) => handleToggleStar(board.id, e)}
                        aria-label={board.starred ? 'Unstar Board' : 'Star Board'}
                      >
                        <Star size={16} fill={board.starred ? '#f28f0f' : 'transparent'} />
                      </button>
                    </div>
                  </div>

                </div>
              ))}

            </div>
          </section>

          {/* Bottom decorative looping Bee path */}
          <div className="footer-decoration">
            <svg className="footer-bee-path" width="220" height="120" viewBox="0 0 220 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M 20 100 C 60 100, 80 50, 110 50 C 140 50, 160 100, 200 80" stroke="#f28f0f" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" opacity="0.6" />
              <Bee x={200} y={80} rotate={-15} type="read" size={38} />
            </svg>
          </div>

        </main>
      </div>
    </div>
  );
}
