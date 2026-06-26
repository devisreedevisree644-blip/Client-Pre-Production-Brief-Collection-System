import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/Common/Toast';
import './Register.css';

const Register = () => {
  const { registerUser } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !email || !password || !companyName) {
      setToast({ message: 'Please fill in all required fields.', type: 'warning' });
      return;
    }

    if (password.length < 6) {
      setToast({ message: 'Password must be at least 6 characters.', type: 'warning' });
      return;
    }

    if (password !== confirmPassword) {
      setToast({ message: 'Passwords do not match.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        username,
        email,
        password,
        role: 'Client', // Default signup role
        company_name: companyName
      });
      setToast({ message: 'Registration successful! Onboarding workspace...', type: 'success' });
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Registration failed. Try again.';
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
          <h2>Partner Onboarding</h2>
          <p>Register your company and start submitting briefs</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Full Name *</label>
            <input
              type="text"
              id="username"
              placeholder="Jane Doe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Business Email *</label>
            <input
              type="email"
              id="email"
              placeholder="jane@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="companyName">Company Name *</label>
            <input
              type="text"
              id="companyName"
              placeholder="Acme Corp"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full-width" disabled={loading}>
            {loading ? 'Creating Account...' : 'Register Company'}
          </button>
        </form>

        <div className="auth-footer text-center">
          <p>Already registered? <Link to="/login">Log in here</Link></p>
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

export default Register;
