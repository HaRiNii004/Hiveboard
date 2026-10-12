import { EyeOff } from 'lucide-react';
import './HideFromViewersToggle.css';

// "Hide from viewers" on/off switch for a card. When on, board members with the
// Viewer role can't see the card at all (the backend leaves it out for them).
export default function HideFromViewersToggle({ value, onChange, disabled = false }) {
  return (
    <div className="hide-toggle">
      <span className="hide-toggle-label" id="hide-toggle-label">Visibility</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-labelledby="hide-toggle-label"
        className={`hide-toggle-btn ${value ? 'on' : ''}`}
        onClick={() => onChange(!value)}
        disabled={disabled}
      >
        <EyeOff size={15} />
        <span className="hide-toggle-text">
          {value ? 'Hidden from viewers' : 'Hide from viewers'}
        </span>
        <span className="hide-toggle-track" aria-hidden="true">
          <span className="hide-toggle-thumb" />
        </span>
      </button>
      <span className="hide-toggle-hint">
        {value
          ? "People with the Viewer role won't see this card. Members and admins still can."
          : 'Everyone on the board can see this card.'}
      </span>
    </div>
  );
}
