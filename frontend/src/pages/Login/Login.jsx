import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { login } from '../../api/auth';
import HiveVisual from '../../components/HiveVisual/HiveVisual';
import logo from '../../assets/logo.svg';
import googleIcon from '../../assets/google.svg';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await login(email, password);
      const { token, fullName } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ email, fullName }));
      
      if (rememberMe) {
        localStorage.setItem('rememberEmail', email);
      } else {
        localStorage.removeItem('rememberEmail');
      }

      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else if (err.response && err.response.status === 401) {
        setError('Invalid email or password.');
      } else {
        setError('Connection to backend failed. Please try again.');
      }
    } finally {
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
              <Link to="/signup" className="tab-btn inactive">Sign Up</Link>
            </div>

            {/* Error Notification */}
            {error && <div className="error-alert">{error}</div>}

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
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="custom-checkbox"></span>
                  Remember me
                </label>
                <a href="#forgot" className="forgot-link">Forgot password?</a>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Logging in...' : 'Log In'}
              </button>
            </form>

            <div className="divider">
              <span>or continue with</span>
            </div>

            {/* Social Authentication */}
            <button type="button" className="social-btn google">
              <img src={googleIcon} alt="Google Logo" width="18" height="18" />
              <span>Google</span>
            </button>

            {/* Form Footer */}
            <p className="form-footer">
              New to Hiveboard? <Link to="/signup">Sign up</Link>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
