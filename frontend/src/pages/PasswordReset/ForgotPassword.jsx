import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, ArrowLeft, MailCheck } from 'lucide-react';
import { requestPasswordReset } from '../../api/auth';
import HiveVisual from '../../components/HiveVisual/HiveVisual';
import { getApiErrorMessage } from '../../utils/apiError';
import logo from '../../assets/logo.svg';
import '../Login/Login.css';
import './PasswordReset.css';

// /forgot-password — ask for a reset link by email
export default function ForgotPassword() {
  const location = useLocation();
  const [email, setEmail] = useState(() => (location.state && location.state.email) || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(trimmed);
      setSentTo(trimmed);
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Could not send the reset link. Please try again.'));
    } finally {
      setLoading(false);
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
              <h1 className="brand-title">Forgot your password?</h1>
              <p className="brand-subtitle">
                {sentTo ? 'Check your inbox.' : "Enter your email and we'll send you a link to choose a new one."}
              </p>
            </div>

            {sentTo ? (
              <div className="reset-sent" role="status">
                <MailCheck size={32} className="reset-sent-icon" />
                <p>
                  If there's a HiveBoard account for <strong>{sentTo}</strong>, we've sent it a link
                  to reset the password. The link works once and expires in 1 hour.
                </p>
                <p className="reset-sent-hint">
                  Nothing arrived? Check your spam folder, or{' '}
                  <button type="button" className="reset-text-btn" onClick={() => setSentTo('')}>
                    try again
                  </button>.
                </p>
              </div>
            ) : (
              <>
                {error && <div className="error-alert" role="alert">{error}</div>}
                <form onSubmit={handleSubmit} className="auth-form">
                  <div className="input-group">
                    <label htmlFor="reset-email">Email</label>
                    <div className="input-wrapper">
                      <Mail className="input-icon" size={18} />
                      <input
                        id="reset-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        autoFocus
                      />
                    </div>
                  </div>
                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Sending...' : 'Send reset link'}
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
