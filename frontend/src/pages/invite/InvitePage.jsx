import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { previewInvitation, acceptInvitation } from '../../api/invitations';
import { roleLabel } from '../../utils/boardPermissions';
import { getApiErrorMessage } from '../../utils/apiError';
import logo from '../../assets/logo.svg';
import './InvitePage.css';
import { getStoredUser, isLoggedIn, clearSession } from '../../utils/authSession';

const loggedInEmail = () => {
  try {
    const user = getStoredUser();
    return user && user.email ? user.email : '';
  } catch {
    return '';
  }
};

// Resolves (never rejects): { invite } | { sessionExpired } | { error }
const fetchPreview = (token) => {
  return previewInvitation(token)
    .then(response => ({ invite: response.data }))
    .catch(err => {
      console.error(err);
      const status = err.response && err.response.status;
      const data = err.response && err.response.data;
      const hasMessage = data && typeof data === 'object' && Object.keys(data).length > 0;
      if ((status === 401 || status === 403) && !hasMessage) {
        // Stale login: forget it so the login page starts clean
        clearSession();
        return { sessionExpired: true };
      }
      if (status === 404) {
        return { error: 'This invitation link is invalid. Check that you copied the whole link.' };
      }
      return { error: getApiErrorMessage(err, 'Could not load this invitation. Please try again.') };
    });
};

// /invite/:token — "Join Board X as Member?"
// Logged-out visitors are sent to login (or sign up) and brought back here afterwards.
export default function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null); // null while loading
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState('');

  const loggedIn = isLoggedIn();
  const loginUrl = `/login?redirect=${encodeURIComponent(`/invite/${token}`)}`;

  useEffect(() => {
    if (!loggedIn) return undefined;
    let cancelled = false;
    fetchPreview(token).then(res => {
      if (!cancelled) setResult(res);
    });
    return () => {
      cancelled = true;
    };
  }, [token, loggedIn]);

  const switchAccount = () => {
    clearSession();
    navigate(loginUrl);
  };

  const handleAccept = async () => {
    setAccepting(true);
    setAcceptError('');
    try {
      const response = await acceptInvitation(token);
      navigate(`/boards/${response.data.boardId}`);
    } catch (err) {
      console.error(err);
      setAcceptError(getApiErrorMessage(err, 'Could not accept the invitation. Please try again.'));
      setAccepting(false);
    }
  };

  if (!loggedIn || (result && result.sessionExpired)) {
    return <Navigate to={loginUrl} replace />;
  }

  const invite = result && result.invite;

  const renderBody = () => {
    if (!result) {
      return <p className="invite-text muted">Loading invitation...</p>;
    }

    if (result.error) {
      return (
        <>
          <h1 className="invite-title">Invitation unavailable</h1>
          <p className="invite-text">{result.error}</p>
          <button className="invite-btn secondary" onClick={() => navigate('/dashboard')}>Go to dashboard</button>
        </>
      );
    }

    const heading = (
      <>
        <p className="invite-eyebrow">{invite.invitedByName} invited you to join</p>
        <h1 className="invite-title">{invite.boardName}</h1>
        <p className="invite-text">
          as a <span className={`invite-role ${invite.role.toLowerCase()}`}>{roleLabel(invite.role)}</span>
        </p>
      </>
    );

    if (invite.alreadyMember) {
      return (
        <>
          {heading}
          <p className="invite-note">You're already a member of this board.</p>
          <button className="invite-btn primary" onClick={() => navigate(`/boards/${invite.boardId}`)}>
            Open board
          </button>
        </>
      );
    }

    if (invite.status !== 'PENDING') {
      const reason = {
        ACCEPTED: 'This invitation has already been used.',
        REVOKED: 'This invitation was revoked by a board admin.',
        EXPIRED: 'This invitation has expired.'
      }[invite.status];
      return (
        <>
          {heading}
          <p className="invite-note warning">{reason} Ask a board admin to send you a new one.</p>
          <button className="invite-btn secondary" onClick={() => navigate('/dashboard')}>Go to dashboard</button>
        </>
      );
    }

    if (!invite.emailMatches) {
      return (
        <>
          {heading}
          <p className="invite-note warning">
            This invitation was sent to <strong>{invite.email}</strong>, but you're logged in as{' '}
            <strong>{loggedInEmail()}</strong>. Log in with the invited email to accept it.
          </p>
          <div className="invite-actions">
            <button className="invite-btn secondary" onClick={() => navigate('/dashboard')}>Not now</button>
            <button className="invite-btn primary" onClick={switchAccount}>Switch account</button>
          </div>
        </>
      );
    }

    return (
      <>
        {heading}
        {acceptError && <p className="invite-note warning">{acceptError}</p>}
        <div className="invite-actions">
          <button className="invite-btn secondary" onClick={() => navigate('/dashboard')} disabled={accepting}>
            Not now
          </button>
          <button className="invite-btn primary" onClick={handleAccept} disabled={accepting}>
            {accepting ? 'Joining...' : 'Accept invitation'}
          </button>
        </div>
        <p className="invite-text muted small">
          Expires {new Date(invite.expiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </>
    );
  };

  return (
    <div className="invite-page">
      <div className="invite-card">
        <div className="invite-brand">
          <img src={logo} alt="" width="28" height="28" />
          <span>hiveboard</span>
        </div>
        <div className="invite-icon" aria-hidden="true"><Users size={26} /></div>
        {renderBody()}
      </div>
    </div>
  );
}
