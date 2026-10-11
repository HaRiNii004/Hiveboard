import { useEffect, useState } from 'react';
import { X, MessageSquare } from 'lucide-react';
import { getComments, addComment } from '../../api/comments';
import { timeAgo } from '../../utils/timeAgo';
import { getApiErrorMessage } from '../../utils/apiError';
import './CommentsPopup.css';

const TEXT_MAX = 2000; // matches @Size(max = 2000) on the backend

const initials = (name) =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

// Resolves (never rejects) with the comments or an error message to show
const fetchComments = (cardId) => {
  return getComments(cardId)
    .then(response => ({ comments: response.data, error: '' }))
    .catch(err => {
      console.error(err);
      return { comments: [], error: getApiErrorMessage(err, 'Could not load comments. Please try again.') };
    });
};

// Add a comment to a card, with every comment listed below (newest first).
// Viewers (canComment = false) can read comments but not post.
export default function CommentsPopup({ card, canComment = true, onClose, onCommentAdded }) {
  const [result, setResult] = useState(null); // null while loading
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchComments(card.id).then(res => {
      if (!cancelled) setResult(res);
    });
    return () => {
      cancelled = true;
    };
  }, [card.id]);

  // Close on Escape (but not while a comment is being posted)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !posting) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [posting, onClose]);

  const trimmed = text.trim();

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!trimmed || posting) return;

    setPosting(true);
    setPostError('');
    try {
      const response = await addComment(card.id, trimmed);
      setResult(prev => (prev ? { ...prev, comments: [response.data, ...prev.comments] } : prev));
      setText('');
      onCommentAdded(response.data);
    } catch (err) {
      console.error(err);
      setPostError(getApiErrorMessage(err, 'Could not add your comment. Please try again.'));
    } finally {
      setPosting(false);
    }
  };

  // Ctrl/Cmd + Enter posts, plain Enter makes a new line
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  const handleRetry = () => {
    setResult(null);
    fetchComments(card.id).then(setResult);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !posting) onClose();
  };

  const comments = result ? result.comments : [];

  return (
    <div className="comments-popup-overlay" onMouseDown={handleOverlayClick}>
      <div className="comments-popup-card" role="dialog" aria-modal="true" aria-labelledby="comments-popup-title">

        {/* Header */}
        <div className="comments-popup-header">
          <div className="comments-popup-heading">
            <h2 id="comments-popup-title" className="comments-popup-title">
              <MessageSquare size={20} />
              Comments
            </h2>
            <p className="comments-popup-subtitle" title={card.title}>On "{card.title}"</p>
          </div>
          <button
            type="button"
            className="comments-popup-close-btn"
            onClick={onClose}
            disabled={posting}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* New comment (Members and Admins) */}
        {canComment ? (
          <form className="comments-popup-form" onSubmit={handleSubmit}>
            <textarea
              className="comments-popup-input"
              placeholder="Write a comment..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={TEXT_MAX}
              rows={3}
              disabled={posting}
              aria-label="Write a comment"
              autoFocus
            />
            <div className="comments-popup-form-footer">
              <span className="comments-popup-shortcut">Ctrl + Enter to post</span>
              <button type="submit" className="comments-popup-btn" disabled={!trimmed || posting}>
                {posting ? 'Posting...' : 'Comment'}
              </button>
            </div>
            {postError && <div className="comments-popup-error">{postError}</div>}
          </form>
        ) : (
          <p className="comments-popup-readonly">
            You're a viewer on this board, so you can read comments but not add them.
          </p>
        )}

        {/* All comments */}
        <div className="comments-popup-list-header">
          {result && !result.error && (
            <span>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
          )}
        </div>

        {!result && <p className="comments-popup-status">Loading comments...</p>}

        {result && result.error && (
          <div className="comments-popup-status error">
            <span>{result.error}</span>
            <button type="button" className="comments-popup-retry-btn" onClick={handleRetry}>Retry</button>
          </div>
        )}

        {result && !result.error && comments.length === 0 && (
          <p className="comments-popup-status">
            {canComment ? 'No comments yet. Be the first to add one.' : 'No comments yet.'}
          </p>
        )}

        {comments.length > 0 && (
          <ul className="comments-popup-list">
            {comments.map(comment => (
              <li key={comment.id} className="comment-item">
                <span className="comment-avatar" aria-hidden="true">{initials(comment.authorName)}</span>
                <div className="comment-body">
                  <div className="comment-meta">
                    <span className="comment-author">{comment.authorName}</span>
                    <time
                      className="comment-time"
                      dateTime={comment.createdAt}
                      title={comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}
                    >
                      {timeAgo(comment.createdAt)}
                    </time>
                  </div>
                  <p className="comment-text">{comment.text}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

      </div>
    </div>
  );
}
