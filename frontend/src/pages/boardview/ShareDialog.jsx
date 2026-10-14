import { useEffect, useState } from 'react';
import { X, Users, Copy, Check, Mail } from 'lucide-react';
import { getMembers, changeMemberRole, removeMember } from '../../api/members';
import { createInvitation, getPendingInvitations, revokeInvitation } from '../../api/invitations';
import { ROLE_OPTIONS, roleLabel } from '../../utils/boardPermissions';
import { getApiErrorMessage } from '../../utils/apiError';
import './ShareDialog.css';
import { getStoredUser } from '../../utils/authSession';

const initials = (name) =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const currentUserEmail = () => {
  try {
    const user = getStoredUser();
    return user && user.email ? user.email.toLowerCase() : '';
  } catch {
    return '';
  }
};

const expiresIn = (isoString) => {
  const days = Math.ceil((new Date(isoString).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'expires today';
  return days === 1 ? 'expires in 1 day' : `expires in ${days} days`;
};

// Resolves (never rejects) with members (+ pending invitations for admins)
const fetchSharing = (boardId, isAdmin) => {
  return Promise.all([
    getMembers(boardId),
    isAdmin ? getPendingInvitations(boardId) : Promise.resolve({ data: [] })
  ])
    .then(([members, invitations]) => ({ members: members.data, invitations: invitations.data, error: '' }))
    .catch(err => {
      console.error(err);
      return { members: [], invitations: [], error: getApiErrorMessage(err, 'Could not load members. Please try again.') };
    });
};

// Members of a board: everyone can see the list and leave; admins can also
// invite by email, change roles, remove people and revoke pending invites.
export default function ShareDialog({ boardId, boardName, isAdmin, onClose, onMyRoleChanged, onLeft }) {
  const [result, setResult] = useState(null); // null while loading
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [inviteLink, setInviteLink] = useState(null); // { email, url }
  const [copied, setCopied] = useState(false);

  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const myEmail = currentUserEmail();

  useEffect(() => {
    let cancelled = false;
    fetchSharing(boardId, isAdmin).then(res => {
      if (!cancelled) setResult(res);
    });
    return () => {
      cancelled = true;
    };
  }, [boardId, isAdmin]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [busy, onClose]);

  // Runs one change at a time and shows its error, if any
  const run = async (task) => {
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const updateResult = (updater) => setResult(prev => (prev ? updater(prev) : prev));

  const handleInvite = (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    run(async () => {
      const response = await createInvitation(boardId, trimmed, role);
      const { inviteUrl, ...invitation } = response.data;
      updateResult(r => ({ ...r, invitations: [invitation, ...r.invitations] }));
      setInviteLink({ email: invitation.email, url: inviteUrl });
      setCopied(false);
      setEmail('');
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink.url);
      setCopied(true);
    } catch {
      setError('Could not copy automatically. Select the link and copy it instead.');
    }
  };

  const handleRoleChange = (member, newRole) => {
    run(async () => {
      const response = await changeMemberRole(boardId, member.userId, newRole);
      updateResult(r => ({
        ...r,
        members: r.members.map(m => (m.userId === member.userId ? response.data : m))
      }));
      if (member.email.toLowerCase() === myEmail) onMyRoleChanged();
    });
  };

  const handleRemove = (member) => {
    if (confirmRemoveId !== member.userId) {
      setConfirmRemoveId(member.userId);
      return;
    }
    setConfirmRemoveId(null);
    run(async () => {
      await removeMember(boardId, member.userId);
      updateResult(r => ({ ...r, members: r.members.filter(m => m.userId !== member.userId) }));
    });
  };

  const handleLeave = () => {
    if (!confirmLeave) {
      setConfirmLeave(true);
      return;
    }
    const me = result.members.find(m => m.email.toLowerCase() === myEmail);
    if (!me) return;
    run(async () => {
      await removeMember(boardId, me.userId);
      onLeft();
    });
  };

  const handleRevoke = (invitation) => {
    run(async () => {
      await revokeInvitation(invitation.id);
      updateResult(r => ({ ...r, invitations: r.invitations.filter(i => i.id !== invitation.id) }));
      if (inviteLink && inviteLink.email === invitation.email) setInviteLink(null);
    });
  };

  const handleRetry = () => {
    setResult(null);
    fetchSharing(boardId, isAdmin).then(setResult);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !busy) onClose();
  };

  return (
    <div className="share-overlay" onMouseDown={handleOverlayClick}>
      <div className="share-card" role="dialog" aria-modal="true" aria-labelledby="share-title">

        {/* Header */}
        <div className="share-header">
          <div className="share-heading">
            <h2 id="share-title" className="share-title">
              <Users size={20} />
              {isAdmin ? 'Share board' : 'Board members'}
            </h2>
            <p className="share-subtitle" title={boardName}>{boardName}</p>
          </div>
          <button type="button" className="share-close-btn" onClick={onClose} disabled={busy} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Invite (admins) */}
        {isAdmin && (
          <form className="share-invite" onSubmit={handleInvite}>
            <label htmlFor="share-email" className="share-label">Invite by email</label>
            <div className="share-invite-row">
              <div className="share-email-wrapper">
                <Mail size={16} className="share-email-icon" />
                <input
                  id="share-email"
                  type="email"
                  className="share-input share-email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={busy}
                  autoFocus
                />
              </div>
              <select
                className="share-input share-role-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={busy}
                aria-label="Role for the invited person"
              >
                {ROLE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button type="submit" className="share-btn primary" disabled={busy || !email.trim()}>
                Invite
              </button>
            </div>
            <p className="share-hint">{ROLE_OPTIONS.find(o => o.value === role).description}.</p>

            {inviteLink && (
              <div className="share-link-box">
                <p className="share-link-text">
                  Invitation created for <strong>{inviteLink.email}</strong>. Email isn't set up yet, so send
                  them this link (it's also printed in the backend console). It works for 7 days, only when
                  they're logged in with that email.
                </p>
                <div className="share-link-row">
                  <input
                    className="share-input share-link-input"
                    value={inviteLink.url}
                    readOnly
                    onFocus={(e) => e.target.select()}
                    aria-label="Invite link"
                  />
                  <button type="button" className="share-btn secondary" onClick={handleCopy}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied' : 'Copy link'}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}

        {error && <div className="share-error">{error}</div>}

        {!result && <p className="share-status">Loading members...</p>}

        {result && result.error && (
          <div className="share-status error">
            <span>{result.error}</span>
            <button type="button" className="share-btn secondary small" onClick={handleRetry}>Retry</button>
          </div>
        )}

        {result && !result.error && (
          <>
            {/* Members */}
            <h3 className="share-section-title">Members · {result.members.length}</h3>
            <ul className="share-list">
              {result.members.map(member => {
                const isMe = member.email.toLowerCase() === myEmail;
                return (
                  <li key={member.userId} className="share-row">
                    <span className="share-avatar" aria-hidden="true">{initials(member.fullName)}</span>
                    <div className="share-person">
                      <span className="share-name">
                        {member.fullName}
                        {isMe && <span className="share-you">You</span>}
                      </span>
                      <span className="share-email-text">{member.email}</span>
                    </div>

                    {isAdmin ? (
                      <select
                        className="share-input share-member-role"
                        value={member.role}
                        onChange={(e) => handleRoleChange(member, e.target.value)}
                        disabled={busy}
                        aria-label={`Role of ${member.fullName}`}
                      >
                        {ROLE_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`share-role-badge ${member.role.toLowerCase()}`}>{roleLabel(member.role)}</span>
                    )}

                    {isAdmin && !isMe && (
                      <button
                        type="button"
                        className={`share-remove-btn ${confirmRemoveId === member.userId ? 'confirm' : ''}`}
                        onClick={() => handleRemove(member)}
                        onBlur={() => setConfirmRemoveId(null)}
                        disabled={busy}
                      >
                        {confirmRemoveId === member.userId ? 'Confirm' : 'Remove'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Pending invitations (admins) */}
            {isAdmin && result.invitations.length > 0 && (
              <>
                <h3 className="share-section-title">Pending invitations · {result.invitations.length}</h3>
                <ul className="share-list">
                  {result.invitations.map(invitation => (
                    <li key={invitation.id} className="share-row">
                      <span className="share-avatar pending" aria-hidden="true"><Mail size={14} /></span>
                      <div className="share-person">
                        <span className="share-name">{invitation.email}</span>
                        <span className="share-email-text">
                          {roleLabel(invitation.role)} · invited by {invitation.invitedByName} · {expiresIn(invitation.expiresAt)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="share-remove-btn"
                        onClick={() => handleRevoke(invitation)}
                        disabled={busy}
                      >
                        Revoke
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Leave */}
            <div className="share-footer">
              <button
                type="button"
                className={`share-leave-btn ${confirmLeave ? 'confirm' : ''}`}
                onClick={handleLeave}
                onBlur={() => setConfirmLeave(false)}
                disabled={busy}
              >
                {confirmLeave ? 'Click again to leave this board' : 'Leave board'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
