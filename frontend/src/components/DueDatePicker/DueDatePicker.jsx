import { X } from 'lucide-react';
import './DueDatePicker.css';

// Due date with an optional time.
// value: { date: 'yyyy-MM-dd' | '', time: 'HH:mm' | '' }
// onChange(nextValue). The time can only be set once a date is picked,
// and clearing the date clears the time too.
export default function DueDatePicker({ value, onChange, disabled = false, label = 'Due date' }) {
  const { date, time } = value;

  const setDate = (nextDate) => {
    onChange({ date: nextDate, time: nextDate ? time : '' });
  };

  const setTime = (nextTime) => {
    onChange({ date, time: nextTime });
  };

  return (
    <div className="due-picker">
      <span className="due-picker-label" id="due-picker-label">{label}</span>

      <div className="due-picker-row" role="group" aria-labelledby="due-picker-label">
        <input
          type="date"
          className="due-picker-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={disabled}
          aria-label="Due date"
        />
        <input
          type="time"
          className="due-picker-input time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          disabled={disabled || !date}
          aria-label="Due time (optional)"
          title={date ? 'Optional time' : 'Pick a date first'}
        />
        {(date || time) && (
          <button
            type="button"
            className="due-picker-clear"
            onClick={() => onChange({ date: '', time: '' })}
            disabled={disabled}
            aria-label="Clear due date"
            title="Clear due date"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <span className="due-picker-hint">
        {date ? (time ? 'Due at this time' : 'Add a time, or leave it empty for all day') : 'No due date'}
      </span>
    </div>
  );
}
