import React from 'react';
import Bee from '../Bee/Bee';
import './HiveVisual.css';

export default function HiveVisual() {
  // Static flight trail paths matching the screenshot loops
  const bee1Path = "M 300,300 C 260,360 160,260 60,80";
  const bee2Path = "M 200,850 C 210,750 260,820 280,780 C 300,740 380,720 460,690";

  // Generate Honeycomb elements programmatically
  // Radius R = 62. Horizontal step W = R * sqrt(3) ~ 107.4. Vertical step H = 1.5 * R = 93.
  // Anchored to the right side of the viewport (x = 600 is the right edge).
  const generateHoneycombCells = () => {
    const R = 62;
    const dx = 107.4;
    const dy = 93;
    const cells = [];
    
    for (let row = -1; row < 12; row++) {
      for (let col = 0; col < 6; col++) {
        const isEvenRow = row % 2 === 0;
        
        // Col 0 is rightmost, Col 5 is leftmost.
        const x = 600 - (col * dx) - (isEvenRow ? dx / 2 : 0);
        const y = row * dy;
        
        let opacity = 1;
        let shouldRender = true;
        
        if (col === 0) {
          shouldRender = true; 
          opacity = 1;
        } else if (col === 1) {
          shouldRender = (row % 5 !== 0);
          opacity = 0.95;
        } else if (col === 2) {
          shouldRender = (row % 3 !== 1);
          opacity = 0.85;
        } else if (col === 3) {
          shouldRender = (row % 2 === 0 || row % 3 === 0);
          opacity = 0.6;
        } else if (col === 4) {
          shouldRender = (row % 4 === 1);
          opacity = 0.35;
        } else {
          shouldRender = (row === 3 || row === 7);
          opacity = 0.15;
        }
        
        if (!shouldRender) continue;

        let cellType = 'normal';
        if ((row + col) % 6 === 0 && col < 3) {
          cellType = 'glow';
        } else if ((row * col) % 5 === 2 && col < 4) {
          cellType = 'deep';
        } else if ((row + col) % 4 === 1 && col > 2) {
          cellType = 'empty';
        }
        
        const halfW = dx / 2;
        const points = `${x},${y - R} ${x + halfW},${y - R / 2} ${x + halfW},${y + R / 2} ${x},${y + R} ${x - halfW},${y + R / 2} ${x - halfW},${y - R / 2}`;
        
        cells.push({
          id: `cell-${row}-${col}`,
          points,
          type: cellType,
          opacity,
          row,
          col,
          delay: (col * 0.12) + (Math.abs(row - 4) * 0.04),
        });
      }
    }
    return cells;
  };

  const cells = generateHoneycombCells();

  return (
    <div className="hive-visual-panel">
      {/* Background Decorative Faint Honeycomb Grids with Opacity */}
      <div className="bg-faint-grid">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-pattern-bg" width="104" height="180" patternUnits="userSpaceOnUse">
              <path d="M 52,0 L 104,30 L 104,90 L 52,120 L 0,90 L 0,30 Z M 52,180 L 104,150 L 104,90 L 52,120 L 0,90 L 0,150 Z" fill="none" stroke="rgba(242, 143, 15, 0.08)" strokeWidth="1.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern-bg)" />
        </svg>
      </div>

      {/* Right Column: 3D Honeycomb Vector Graphics & Bee flight paths */}
      <div className="visual-column">
        <svg className="honeycomb-svg" width="100%" height="100%" viewBox="0 0 600 1000" preserveAspectRatio="xMaxYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Cell Fill Gradients */}
            <linearGradient id="honey-normal-visual" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffb821" />
              <stop offset="100%" stopColor="#f58e14" />
            </linearGradient>
            
            <linearGradient id="honey-glow-visual" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffea4d" />
              <stop offset="60%" stopColor="#ffb821" />
              <stop offset="100%" stopColor="#e57c00" />
            </linearGradient>
            
            <linearGradient id="honey-deep-visual" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c2410c" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>

            <linearGradient id="honey-empty-visual" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#fef3c7" stopOpacity="0.02" />
            </linearGradient>

            {/* 3D Drop Shadows */}
            <filter id="shadow-3d-visual" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="-8" dy="12" stdDeviation="6" floodColor="#7c2d12" floodOpacity="0.25" />
            </filter>
            
            <filter id="shadow-glow-visual-cell" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#ffb821" floodOpacity="0.45" />
            </filter>

            {/* Inset shadow for recessed cells */}
            <filter id="inset-shadow-visual" x="-20%" y="-20%" width="140%" height="140%">
              <feOffset dx="-3" dy="4"/>
              <feGaussianBlur stdDeviation="3" result="offset-blur"/>
              <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
              <feFlood floodColor="#3f1a04" floodOpacity="0.5" result="color"/>
              <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
              <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
            </filter>
          </defs>

          {/* Render static trails */}
          <path d={bee1Path} stroke="#f28f0f" strokeWidth="2.5" strokeDasharray="6 6" fill="none" opacity="0.95" strokeLinecap="round" />
          <path d={bee2Path} stroke="#f28f0f" strokeWidth="2.5" strokeDasharray="6 6" fill="none" opacity="0.9" strokeLinecap="round" />

          {/* Honeycomb Cells */}
          {cells.map((cell) => {
            const isRaised = cell.type === 'glow' || cell.type === 'normal';
            const isDeep = cell.type === 'deep';
            const isGlow = cell.type === 'glow';
            const isEmpty = cell.type === 'empty';

            let fillUrl = 'url(#honey-normal-visual)';
            let filter = 'none';
            let strokeColor = '#ffe3b3';
            let strokeWidth = '3.5';

            if (isGlow) {
              fillUrl = 'url(#honey-glow-visual)';
              filter = 'url(#shadow-glow-visual-cell)';
              strokeColor = '#ffffff';
              strokeWidth = '4';
            } else if (isDeep) {
              fillUrl = 'url(#honey-deep-visual)';
              filter = 'url(#inset-shadow-visual)';
              strokeColor = '#f97316';
              strokeWidth = '3';
            } else if (isEmpty) {
              fillUrl = 'url(#honey-empty-visual)';
              strokeColor = 'rgba(242, 143, 15, 0.2)';
              strokeWidth = '2';
            }

            if (isRaised && !isGlow) {
              filter = 'url(#shadow-3d-visual)';
            }

            return (
              <g key={cell.id} style={{ opacity: cell.opacity }}>
                <polygon
                  points={cell.points}
                  fill={fillUrl}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  filter={filter}
                  className={`hex-cell ${isRaised ? 'cell-raised' : ''} ${isDeep ? 'cell-deep' : ''} ${isEmpty ? 'cell-empty' : ''}`}
                  style={{
                    animationDelay: `${cell.delay}s`,
                  }}
                />
              </g>
            );
          })}

          {/* Place static bees matching the mockup locations and rotations */}
          <Bee x={60} y={80} rotate={-120} type="idea" size={75} />
          <Bee x={380} y={420} rotate={-15} type="read" size={75} />
          <Bee x={460} y={690} rotate={-35} type="chainsaw" size={75} />

        </svg>

      </div>
    </div>
  );
}
