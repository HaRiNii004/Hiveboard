import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import './CreateItemPopup.css';

// Reusable "create" popup for the board view (used for lists and cards).
// `fields` describes the inputs, e.g.
//   { name: 'title', label: 'Card title', required: true, maxLength: 150, multiline: false }
// `onSubmit(values)` must return a promise; if it rejects, the error is shown in the popup.
export default function CreateItemPopup({ heading, subheading, fields, submitLabel, onSubmit, onClose }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map(field => [field.name, '']))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Close on Escape (but not while a request is in flight)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [loading, onClose]);

  const handleChange = (name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const missingRequired = fields.some(field => field.required && !values[field.name].trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const missing = fields.find(field => field.required && !values[field.name].trim());
    if (missing) {
      setError(`Please enter a ${missing.label.toLowerCase()}.`);
      return;
    }

    // Trim everything; send empty optional fields as null
    const trimmed = Object.fromEntries(
      fields.map(field => [field.name, values[field.name].trim() || null])
    );

    setLoading(true);
    try {
      await onSubmit(trimmed);
    } catch (err) {
      console.error(err);
      const data = err.response && err.response.data;
      const status = err.response && err.response.status;
      if (status === 401 || status === 403) {
        setError('Your session has expired. Please log in again.');
      } else if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        // Backend sends { error: "..." } or a field -> message map for validation errors
        setError(data.error || Object.values(data)[0]);
      } else {
        setError('Connection to backend failed. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  return (
    <div className="item-popup-overlay" onMouseDown={handleOverlayClick}>
      <div className="item-popup-card" role="dialog" aria-modal="true" aria-labelledby="item-popup-title">

        {/* Header */}
        <div className="item-popup-header">
          <div>
            <h2 id="item-popup-title" className="item-popup-title">{heading}</h2>
            {subheading && <p className="item-popup-subtitle">{subheading}</p>}
          </div>
          <button
            type="button"
            className="item-popup-close-btn"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form className="item-popup-form" onSubmit={handleSubmit}>
          {fields.map((field, index) => {
            const inputId = `item-popup-${field.name}`;
            const inputProps = {
              id: inputId,
              className: `item-popup-input ${field.multiline ? 'item-popup-textarea' : ''}`,
              placeholder: field.placeholder,
              value: values[field.name],
              onChange: (e) => handleChange(field.name, e.target.value),
              maxLength: field.maxLength,
              autoFocus: index === 0,
              disabled: loading
            };

            return (
              <div key={field.name} className="item-popup-field">
                <label htmlFor={inputId} className="item-popup-label">
                  {field.label}{' '}
                  {field.required
                    ? <span className="item-popup-required">*</span>
                    : <span className="item-popup-optional">(optional)</span>}
                </label>
                {field.multiline
                  ? <textarea {...inputProps} rows={4} />
                  : <input {...inputProps} type="text" />}
                {field.multiline && field.maxLength && (
                  <span className="item-popup-char-count">
                    {values[field.name].length}/{field.maxLength}
                  </span>
                )}
              </div>
            );
          })}

          {error && <div className="item-popup-error">{error}</div>}

          {/* Actions */}
          <div className="item-popup-actions">
            <button type="button" className="item-popup-btn secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="item-popup-btn primary" disabled={loading || missingRequired}>
              {loading ? 'Creating...' : submitLabel}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
