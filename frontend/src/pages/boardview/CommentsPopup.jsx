import { useEffect, useState } from 'react';
import { X, MessageSquare, Reply } from 'lucide-react';
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
// Each comment can have replies (one level: replying to a reply joins the same thread).
// Viewers (canComment = false) can read comments and replies but not post.
export default function CommentsPopup({ card, canComment = true, onClose, onCommentAdded }) {
  const [result, setResult] = useState(null); // null while loading
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');

  // Inline reply box: which thread it's open under, and its draft
  const [replyTo, setReplyTo] = useState(null); // top-level comment id
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState('');

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
      if (e.key === 'Escape' && !posting && !replying) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [posting, replying, onClose]);

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

  // Open the reply box under a thread. Replying to a reply starts with an @mention.
  const startReply = (thread, replyingTo) => {
    setReplyTo(thread.id);
    setReplyText(replyingTo ? `@${replyingTo.authorName} ` : '');
    setReplyError('');
  };

  const cancelReply = () => {
    setReplyTo(null);
    setReplyText('');
    setReplyError('');
  };

  const handleReplySubmit = async (e) => {
    if (e) e.preventDefault();
    const trimmedReply = replyText.trim();
    if (!trimmedReply || replying) return;

    setReplying(true);
    setReplyError('');
    try {
      const response = await addComment(card.id, trimmedReply, replyTo);
      const reply = response.data;
      // Backend files it under the thread's top-level comment (reply.parentId)
      setResult(prev => (prev ? {
        ...prev,
        comments: prev.comments.map(c =>
          c.id === reply.parentId ? { ...c, replies: [...(c.replies || []), reply] } : c
        )
      } : prev));
      cancelReply();
      onCommentAdded(reply);
    } catch (err) {
      console.error(err);
      setReplyError(getApiErrorMessage(err, 'Could not add your reply. Please try again.'));
    } finally {
      setReplying(false);
    }
  };

  const handleReplyKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleReplySubmit();
    } else if (e.key === 'Escape') {
      e.stopPropagation(); // close the reply box, not the whole popup
      if (!replying) cancelReply();
    }
  };

  const handleRetry = () => {
    setResult(null);
    fetchComments(card.id).then(setResult);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !posting && !replying) onClose();
  };

  const comments = result ? result.comments : [];
  const totalCount = comments.reduce((sum, c) => sum + 1 + (c.replies ? c.replies.length : 0), 0);

  // One comment or reply: avatar, name, time, text and a Reply link
  const renderComment = (comment, thread, isReply) => (
    <>
      <span className={`comment-avatar ${isReply ? 'small' : ''}`} aria-hidden="true">
        {initials(comment.authorName)}
      </span>
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
        {canComment && (
          <button
            type="button"
            className="comment-reply-btn"
            onClick={() => startReply(thread, isReply ? comment : null)}
            disabled={replying}
          >
            <Reply size={13} />
            Reply
          </button>
        )}
      </div>
    </>
  );

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
            <span>{totalCount} {totalCount === 1 ? 'comment' : 'comments'}</span>
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
            {comments.map(thread => (
              <li key={thread.id} className="comment-thread">
                <div className="comment-item">{renderComment(thread, thread, false)}</div>

                {/* Replies, oldest first, indented under the comment */}
                {((thread.replies && thread.replies.length > 0) || replyTo === thread.id) && (
                  <div className="comment-replies">
                    {(thread.replies || []).map(reply => (
                      <div key={reply.id} className="comment-item reply">
                        {renderComment(reply, thread, true)}
                      </div>
                    ))}

                    {replyTo === thread.id && (
                      <form className="comment-reply-form" onSubmit={handleReplySubmit}>
                        <textarea
                          className="comments-popup-input reply"
                          placeholder={`Reply to ${thread.authorName}...`}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={handleReplyKeyDown}
                          maxLength={TEXT_MAX}
                          rows={2}
                          disabled={replying}
                          aria-label={`Reply to ${thread.authorName}`}
                          autoFocus
                          onFocus={(e) => {
                            // put the cursor after a prefilled @mention
                            const end = e.target.value.length;
                            e.target.setSelectionRange(end, end);
                          }}
                        />
                        <div className="comment-reply-actions">
                          <button type="button" className="comment-reply-cancel" onClick={cancelReply} disabled={replying}>
                            Cancel
                          </button>
                          <button type="submit" className="comments-popup-btn small" disabled={!replyText.trim() || replying}>
                            {replying ? 'Replying...' : 'Reply'}
                          </button>
                        </div>
                        {replyError && <div className="comments-popup-error">{replyError}</div>}
                      </form>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

      </div>
    </div>
  );
}
