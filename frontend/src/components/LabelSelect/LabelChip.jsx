import { X } from 'lucide-react';
import { getLabelColor } from './labelColors';
import './LabelChip.css';

// A single coloured label pill. Pass `onRemove` to show an × button.
export default function LabelChip({ label, onRemove, size = 'md' }) {
  const color = getLabelColor(label.color);

  return (
    <span
      className={`label-chip ${size}`}
      style={{ backgroundColor: color.bg, color: color.text }}
      title={label.name}
    >
      <span className="label-chip-text">{label.name}</span>
      {onRemove && (
        <button
          type="button"
          className="label-chip-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${label.name}`}
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
}
