import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { createBoard } from '../../../api/boards';
import './CreatePopup.css';

// Matches the default VARCHAR(255) columns on the boards table
const NAME_MAX = 100;
const DESCRIPTION_MAX = 255;

export default function CreatePopup({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a board name.');
      return;
    }

    setLoading(true);
    try {
      const response = await createBoard(trimmedName, description.trim() || null);
      onCreated(response.data);
    } catch (err) {
      console.error(err);
      const data = err.response && err.response.data;
      const status = err.response && err.response.status;
      if (status === 401 || status === 403) {
        setError('Your session has expired. Please log in again.');
      } else if (data && (data.error || data.name || data.description)) {
        setError(data.error || data.name || data.description);
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
    <div className="popup-overlay" onMouseDown={handleOverlayClick}>
      <div className="popup-card" role="dialog" aria-modal="true" aria-labelledby="create-board-title">

        {/* Header */}
        <div className="popup-header">
          <div>
            <h2 id="create-board-title" className="popup-title">Create Board</h2>
            <p className="popup-subtitle">Give your new hive a name to get started.</p>
          </div>
          <button
            type="button"
            className="popup-close-btn"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form className="popup-form" onSubmit={handleSubmit}>
          {/* Board name */}
          <div className="popup-field">
            <label htmlFor="board-name" className="popup-label">
              Board name <span className="popup-required">*</span>
            </label>
            <input
              id="board-name"
              type="text"
              className="popup-input"
              placeholder="e.g. Project Roadmap"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX}
              autoFocus
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className="popup-field">
            <label htmlFor="board-description" className="popup-label">
              Description <span className="popup-optional">(optional)</span>
            </label>
            <textarea
              id="board-description"
              className="popup-input popup-textarea"
              placeholder="What is this board for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={DESCRIPTION_MAX}
              rows={4}
              disabled={loading}
            />
            <span className="popup-char-count">{description.length}/{DESCRIPTION_MAX}</span>
          </div>

          {error && <div className="popup-error">{error}</div>}

          {/* Actions */}
          <div className="popup-actions">
            <button type="button" className="popup-btn secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="popup-btn primary" disabled={loading || !name.trim()}>
              {loading ? 'Creating...' : 'Create Board'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
