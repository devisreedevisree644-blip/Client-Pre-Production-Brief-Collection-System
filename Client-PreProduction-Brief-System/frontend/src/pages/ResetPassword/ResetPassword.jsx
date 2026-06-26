import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { resetPassword } from '../../services/authService';
import Toast from '../../components/Common/Toast';
import './ResetPassword.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setToast({ message: 'Missing password reset token in URL.', type: 'error' });
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      setToast({ message: 'Invalid or missing token. Cannot reset password.', type: 'error' });
      return;
    }

    if (!password || !confirmPassword) {
      setToast({ message: 'Please enter and confirm your new password.', type: 'warning' });
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
      await resetPassword(token, password);
      setToast({ message: 'Password reset successful! Redirecting...', type: 'success' });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Token is invalid or expired.';
      setToast({ message: errMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-root">
      <Link to="/login" className="auth-floating-back-btn">
        &larr; Back to Login
      </Link>
      <div className="auth-card card-glass">
        <div className="auth-header text-center">
          <Link to="/" className="auth-logo">⚡ DigiQuest</Link>
          <h2>New Password</h2>
          <p>Create a secure new password for your account</p>
        </div>

        {!success ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="password">New Password</label>
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
              <label htmlFor="confirmPassword">Confirm Password</label>
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
              {loading ? 'Updating Password...' : 'Save New Password'}
            </button>
          </form>
        ) : (
          <div className="auth-success-message text-center">
            <div className="success-icon">✓</div>
            <p>Your password has been successfully updated. Redirecting to the login screen...</p>
          </div>
        )}
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

export default ResetPassword;
