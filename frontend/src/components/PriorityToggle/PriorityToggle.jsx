import { Flag } from 'lucide-react';
import './PriorityToggle.css';

// "High priority" on/off switch for a card. Flagged cards are listed at the top of their list.
export default function PriorityToggle({ value, onChange, disabled = false }) {
  return (
    <div className="priority-toggle">
      <span className="priority-toggle-label" id="priority-toggle-label">Priority</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-labelledby="priority-toggle-label"
        className={`priority-toggle-btn ${value ? 'on' : ''}`}
        onClick={() => onChange(!value)}
        disabled={disabled}
      >
        <Flag size={15} fill={value ? 'currentColor' : 'none'} />
        <span className="priority-toggle-text">
          {value ? 'High priority' : 'Flag as high priority'}
        </span>
        <span className="priority-toggle-track" aria-hidden="true">
          <span className="priority-toggle-thumb" />
        </span>
      </button>
      {value && !disabled && (
        <span className="priority-toggle-hint">This card will be shown at the top of its list.</span>
      )}
    </div>
  );
}
