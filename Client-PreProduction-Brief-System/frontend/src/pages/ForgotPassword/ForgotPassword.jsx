import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../services/authService';
import Toast from '../../components/Common/Toast';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setToast({ message: 'Please enter your email address.', type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email);
      setToast({ message: 'Recovery link generated successfully.', type: 'success' });
      setSubmitted(true);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to send recovery email.';
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
          <h2>Reset Password</h2>
          <p>We'll send you instructions to reset your password</p>
        </div>

        {!submitted ? (
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

            <button type="submit" className="btn btn-primary btn-full-width" disabled={loading}>
              {loading ? 'Sending Link...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div className="auth-success-message text-center">
            <div className="success-icon">✓</div>
            <p>If that email exists in our records, we've sent instructions to reset your password. Please check your inbox (and spam folder).</p>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '10px' }}>
              (Note: For local testing, check your server console log or see the generated mock HTML file in the backend uploads/mock_emails folder!)
            </p>
          </div>
        )}

        <div className="auth-footer text-center" style={{ marginTop: '20px' }}>
          <p>Remember your password? <Link to="/login">Back to log in</Link></p>
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

export default ForgotPassword;
