import { useState } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { login } from '../../api/auth';
import HiveVisual from '../../components/HiveVisual/HiveVisual';
import GoogleSignIn from '../../components/GoogleSignIn/GoogleSignIn';
import { getSafeRedirect, withRedirect } from '../../utils/redirect';
import { saveSession } from '../../utils/authSession';
import { getApiErrorMessage } from '../../utils/apiError';
import logo from '../../assets/logo.svg';
import './Login.css';

const REMEMBER_EMAIL_KEY = 'rememberEmail';

const rememberedEmail = () => {
  try {
    return localStorage.getItem(REMEMBER_EMAIL_KEY) || '';
  } catch {
    return '';
  }
};

export default function Login() {
  const location = useLocation();
  // After a password reset: { notice, email }
  const state = location.state || {};
  const [email, setEmail] = useState(() => state.email || rememberedEmail());
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => Boolean(rememberedEmail()));
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // e.g. back to /invite/<token> after logging in from an invite link
  const redirect = getSafeRedirect(searchParams);

  // Logged in (by password or Google): keep the session and go on
  const finishLogin = (auth) => {
    saveSession(auth, rememberMe);
    try {
      if (rememberMe) localStorage.setItem(REMEMBER_EMAIL_KEY, auth.email);
      else localStorage.removeItem(REMEMBER_EMAIL_KEY);
    } catch {
      // only a convenience
    }
    navigate(redirect || '/dashboard');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await login(email, password, rememberMe);
      finishLogin(response.data);
    } catch (err) {
      console.error(err);
      setError(err.response && err.response.status === 401
        ? 'Invalid email or password.'
        : getApiErrorMessage(err, 'Connection to backend failed. Please try again.'));
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Visual illustration (faint grid, honeycomb SVG, bees) */}
      <HiveVisual />

      {/* Main Split Layout: Left Form Content */}
      <div className="login-content">
        <div className="form-column">
          <div className="form-wrapper">

            {/* Brand Header */}
            <div className="brand-header">
              <div className="logo-wrapper">
                <img src={logo} alt="Hiveboard Logo" width="34" height="34" />
                <span className="brand-name">hiveboard</span>
              </div>
              <h1 className="brand-title">Plan. Organize. Thrive.</h1>
              <p className="brand-subtitle">Your projects, your way.</p>
            </div>

            {/* Auth Tab Switcher */}
            <div className="tab-switcher">
              <button className="tab-btn active">Log In</button>
              <Link to={withRedirect('/signup', redirect)} className="tab-btn inactive">Sign Up</Link>
            </div>

            {state.notice && !error && <div className="success-alert" role="status">{state.notice}</div>}
            {error && <div className="error-alert" role="alert">{error}</div>}

            {/* Form */}
            <form onSubmit={handleLogin} className="auth-form">
              <div className="input-group">
                <label htmlFor="email">Email</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={18} />
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
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

              <div className="form-actions">
                <label className="checkbox-label" title="Stay logged in on this device for 30 days">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="custom-checkbox"></span>
                  Remember me
                </label>
                <Link to="/forgot-password" state={{ email }} className="forgot-link">Forgot password?</Link>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Logging in...' : 'Log In'}
              </button>
            </form>

            {/* Only shown when Google sign-in is set up on the server */}
            <GoogleSignIn rememberMe={rememberMe} onSuccess={finishLogin} onError={setError} />

            {/* Form Footer */}
            <p className="form-footer">
              New to Hiveboard? <Link to={withRedirect('/signup', redirect)}>Sign up</Link>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
