import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { signup } from '../../api/auth';
import HiveVisual from '../../components/HiveVisual/HiveVisual';
import logo from '../../assets/logo.svg';
import googleIcon from '../../assets/google.svg';
import './Signup.css';

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!fullName || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const response = await signup(fullName, email, password);

      const { token, email: resEmail, fullName: resName } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ email: resEmail, fullName: resName }));
      
      setSuccess('Account created successfully! Redirecting...');
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else if (err.response && err.response.data && typeof err.response.data === 'string') {
        setError(err.response.data);
      } else {
        setError('Signup failed. Email might already be in use or backend connection failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      {/* Visual illustration (faint grid, honeycomb SVG, bees) */}
      <HiveVisual />

      {/* Main Split Layout: Left Form Content */}
      <div className="signup-content">
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
              <Link to="/login" className="tab-btn inactive">Log In</Link>
              <button className="tab-btn active">Sign Up</button>
            </div>

            {/* Notifications */}
            {error && <div className="error-alert">{error}</div>}
            {success && <div className="success-alert">{success}</div>}

            {/* Form */}
            <form onSubmit={handleSignup} className="auth-form">
              <div className="input-group">
                <label htmlFor="fullName">Full Name</label>
                <div className="input-wrapper">
                  <User className="input-icon" size={18} />
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Alex Mercer"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
              </div>

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
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
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

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Creating account...' : 'Sign Up'}
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
              Already have an account? <Link to="/login">Log in</Link>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
