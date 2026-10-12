import './LiveCursors.css';

// Other people's pointers, drawn in board-content coordinates. Render this inside the
// scrolling board container (position: relative) so cursors scroll with the content.
export default function LiveCursors({ cursors }) {
  return (
    <div className="live-cursors" aria-hidden="true">
      {cursors.map(cursor => (
        <div
          key={cursor.userId}
          className="live-cursor"
          style={{
            transform: `translate(${cursor.x}px, ${cursor.y}px)`,
            '--cursor-color': cursor.color
          }}
        >
          <svg width="18" height="20" viewBox="0 0 18 20" fill="none">
            <path
              d="M1.5 1.5 L16 10 L9.2 11.4 L6 18 Z"
              fill="var(--cursor-color)"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <span className="live-cursor-label">{cursor.fullName}</span>
        </div>
      ))}
    </div>
  );
}
