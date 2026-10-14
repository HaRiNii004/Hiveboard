import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft, LinkIcon } from 'lucide-react';
import { checkResetToken, resetPassword } from '../../api/auth';
import HiveVisual from '../../components/HiveVisual/HiveVisual';
import { getApiErrorMessage } from '../../utils/apiError';
import { clearSession } from '../../utils/authSession';
import logo from '../../assets/logo.svg';
import '../Login/Login.css';
import './PasswordReset.css';

const MIN_LENGTH = 8; // matches the backend

// Resolves (never rejects): { email } or { error }
const fetchTokenInfo = (token) =>
  checkResetToken(token)
    .then(response => ({ email: response.data.email }))
    .catch(err => {
      console.error(err);
      return { error: getApiErrorMessage(err, 'Could not check this link. Please try again.') };
    });

// /reset-password/:token — the link from the email: choose a new password
export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null); // null while checking the link
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchTokenInfo(token).then(result => {
      if (!cancelled) setInfo(result);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters long.`);
      return;
    }
    if (password !== confirm) {
      setError("The passwords don't match.");
      return;
    }
    setError('');
    setSaving(true);
    try {
      await resetPassword(token, password);
      clearSession(); // every existing login for the account has just been signed out
      navigate('/login', {
        replace: true,
        state: { notice: 'Your password has been changed. Log in with your new password.', email: info.email }
      });
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Could not change your password. Please try again.'));
      setSaving(false);
    }
  };

  return (
    <div className="login-container">
      <HiveVisual />
      <div className="login-content">
        <div className="form-column">
          <div className="form-wrapper">
            <div className="brand-header">
              <div className="logo-wrapper">
                <img src={logo} alt="Hiveboard Logo" width="34" height="34" />
                <span className="brand-name">hiveboard</span>
              </div>
              <h1 className="brand-title">Choose a new password</h1>
              {info && info.email && (
                <p className="brand-subtitle">For <strong>{info.email}</strong></p>
              )}
            </div>

            {info === null && <p className="reset-status">Checking your link...</p>}

            {info && info.error && (
              <div className="reset-sent" role="alert">
                <LinkIcon size={30} className="reset-sent-icon error" />
                <p>{info.error}</p>
                <Link to="/forgot-password" className="submit-btn reset-link-btn">Get a new link</Link>
              </div>
            )}

            {info && info.email && (
              <>
                {error && <div className="error-alert" role="alert">{error}</div>}
                <form onSubmit={handleSubmit} className="auth-form">
                  {/* Lets password managers save the new password for the right account */}
                  <input type="email" value={info.email} autoComplete="username" readOnly hidden />
                  <div className="input-group">
                    <label htmlFor="new-password">New password</label>
                    <div className="input-wrapper">
                      <Lock className="input-icon" size={18} />
                      <input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={`At least ${MIN_LENGTH} characters`}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={MIN_LENGTH}
                        autoComplete="new-password"
                        autoFocus
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="input-group">
                    <label htmlFor="confirm-password">Confirm new password</label>
                    <div className="input-wrapper">
                      <Lock className="input-icon" size={18} />
                      <input
                        id="confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Type it again"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                  <p className="reset-note">Changing your password logs you out everywhere else.</p>
                  <button type="submit" className="submit-btn" disabled={saving}>
                    {saving ? 'Saving...' : 'Change password'}
                  </button>
                </form>
              </>
            )}

            <p className="form-footer">
              <Link to="/login" className="reset-back-link"><ArrowLeft size={14} /> Back to log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
