import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/Common/Toast';
import './Login.css';

const Login = () => {
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);



  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setToast({ message: 'Please enter both email and password.', type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await loginUser(email, password);
      setToast({ message: 'Login successful! Redirecting...', type: 'success' });
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Invalid email or password.';
      setToast({ message: errMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-root">
      <div className="auth-card card-glass">
        <div className="auth-header text-center">
          <Link to="/" className="auth-logo">⚡ DigiQuest</Link>
          <h2>Welcome Back</h2>
          <p>Login to manage your pre-production briefs</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <div className="label-forgot-wrapper">
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" style={{ fontSize: '0.8rem' }}>Forgot password?</Link>
            </div>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full-width" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>



        <div className="auth-footer text-center">
          <p>Don't have an account? <Link to="/register">Onboard your company</Link></p>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Login;
