import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getApiErrorMessage } from '../../utils/apiError';
import './CreateItemPopup.css';

// Reusable create/edit popup for the board view (used for the board, lists and cards).
// `fields` describes the inputs, e.g.
//   { name: 'title', label: 'Card title', required: true, maxLength: 150, multiline: false }
// `type: 'date'` gives a date picker whose value is "yyyy-MM-dd" (or null when empty).
// A field with `type: 'custom'` renders its own input via
//   render({ value, onChange, disabled })  — onChange accepts a value or an updater (prev) => next
// and keeps a non-string value (e.g. an array of label ids), starting from `defaultValue`.
// `initialValues` pre-fills the inputs when editing.
// `readOnly` shows the values without letting them change (e.g. for board Viewers).
// `extraActions` is shown on the left of the buttons (e.g. "Duplicate").
// `wide` makes the popup wider (cards). `aside` is shown in a column next to the form
// (e.g. a card's activity); on small screens it goes below the form.
// `onSubmit(values)` must return a promise; if it rejects, the error is shown in the popup.
export default function CreateItemPopup({
  heading,
  subheading,
  fields,
  initialValues = {},
  submitLabel,
  submittingLabel = 'Creating...',
  readOnly = false,
  extraActions = null,
  moreActions = null,
  wide = false,
  aside = null,
  onSubmit,
  onClose
}) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map(field => [
      field.name,
      initialValues[field.name] ?? (field.type === 'custom' ? field.defaultValue : '')
    ]))
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
    setValues(prev => ({
      ...prev,
      [name]: typeof value === 'function' ? value(prev[name]) : value
    }));
  };

  const missingRequired = fields.some(field => field.required && !values[field.name].trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (readOnly) return;
    setError('');

    const missing = fields.find(field => field.required && !values[field.name].trim());
    if (missing) {
      setError(`Please enter a ${missing.label.toLowerCase()}.`);
      return;
    }

    // Trim text; send empty optional text fields as null; custom values as-is
    const trimmed = Object.fromEntries(
      fields.map(field => [
        field.name,
        field.type === 'custom' ? values[field.name] : values[field.name].trim() || null
      ])
    );

    setLoading(true);
    try {
      await onSubmit(trimmed);
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err));
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
      <div
        className={`item-popup-card ${wide ? 'wide' : ''} ${aside ? 'with-aside' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-popup-title"
      >

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

        <div className="item-popup-layout">
        <form className="item-popup-form" onSubmit={handleSubmit}>
          {fields.map((field, index) => {
            if (field.type === 'custom') {
              return (
                <div key={field.name} className="item-popup-field">
                  {field.render({
                    value: values[field.name],
                    onChange: (value) => handleChange(field.name, value),
                    disabled: loading || readOnly
                  })}
                </div>
              );
            }

            const inputId = `item-popup-${field.name}`;
            const inputProps = {
              id: inputId,
              className: `item-popup-input ${field.multiline ? 'item-popup-textarea' : ''}`,
              placeholder: field.placeholder,
              value: values[field.name],
              onChange: (e) => handleChange(field.name, e.target.value),
              maxLength: field.maxLength,
              autoFocus: index === 0,
              disabled: loading || readOnly,
              readOnly
            };

            return (
              <div key={field.name} className="item-popup-field">
                <label htmlFor={inputId} className="item-popup-label">
                  {field.label}
                  {field.required && <> <span className="item-popup-required">*</span></>}
                </label>
                {field.multiline
                  ? <textarea {...inputProps} rows={4} />
                  : <input {...inputProps} type={field.type === 'date' ? 'date' : 'text'} />}
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
            {(extraActions || moreActions) && (
              <div className="item-popup-actions-extra">{extraActions}{moreActions}</div>
            )}
            {readOnly ? (
              <button type="button" className="item-popup-btn secondary" onClick={onClose}>
                Close
              </button>
            ) : (
              <>
                <button type="button" className="item-popup-btn secondary" onClick={onClose} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="item-popup-btn primary" disabled={loading || missingRequired}>
                  {loading ? submittingLabel : submitLabel}
                </button>
              </>
            )}
          </div>
        </form>

        {aside && <div className="item-popup-aside">{aside}</div>}
        </div>
      </div>
    </div>
  );
}
