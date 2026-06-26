const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { sendEmail } = require('../services/emailService');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, client_id: user.client_id },
    process.env.JWT_SECRET || 'digiquest_preprod_brief_jwt_secret_key_2026_super_secure',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// POST /api/auth/register
const register = async (req, res, next) => {
  const { username, email, password, role, client_id, company_name } = req.body;
  const normalizedEmail = email ? email.toLowerCase().trim() : '';

  try {
    // 1. Check if user already exists
    const userExists = await db.query('SELECT id FROM users WHERE email = $1 OR username = $2', [normalizedEmail, username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }

    let finalClientId = client_id || null;

    // 2. If client role and company_name is provided, create the client company first
    if (role === 'Client' && !finalClientId && company_name) {
      const clientRes = await db.query(
        'INSERT INTO clients (company_name, contact_person, email) VALUES ($1, $2, $3) RETURNING id',
        [company_name, username, normalizedEmail]
      );
      finalClientId = clientRes.rows[0].id;
    }

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create user
    const newUserRes = await db.query(
      'INSERT INTO users (username, email, password, role, client_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, role, client_id',
      [username, normalizedEmail, hashedPassword, role, finalClientId]
    );

    const newUser = newUserRes.rows[0];
    const token = generateToken(newUser);

    res.status(201).json({
      token,
      user: newUser
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  const { email, password } = req.body;
  const normalizedEmail = email ? email.toLowerCase().trim() : '';

  try {
    // 1. Find user
    const userRes = await db.query(
      'SELECT id, username, email, password, role, client_id FROM users WHERE email = $1',
      [normalizedEmail]
    );
    if (userRes.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = userRes.rows[0];

    // 2. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 3. Generate Token
    const token = generateToken(user);

    // Get company name if Client
    let companyName = null;
    if (user.client_id) {
      const clientRes = await db.query('SELECT company_name FROM clients WHERE id = $1', [user.client_id]);
      if (clientRes.rows.length > 0) {
        companyName = clientRes.rows[0].company_name;
      }
    }

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        client_id: user.client_id,
        company_name: companyName
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  const normalizedEmail = email ? email.toLowerCase().trim() : '';

  try {
    const userRes = await db.query('SELECT id, username FROM users WHERE email = $1', [normalizedEmail]);
    if (userRes.rows.length === 0) {
      // Don't leak user existence details, just say checked
      return res.json({ message: 'If that email exists in our system, we have sent a reset link.' });
    }

    const user = userRes.rows[0];
    const resetToken = jwt.sign(
      { id: user.id }, 
      process.env.JWT_SECRET || 'digiquest_preprod_brief_jwt_secret_key_2026_super_secure', 
      { expiresIn: '1h' }
    );
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await db.query(
      'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3',
      [resetToken, expires, user.id]
    );

    // Trigger email send
    const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;
    const subject = 'Password Reset Request - DigiQuest Studio';
    const emailBodyHtml = `
      <h2>Password Reset Request</h2>
      <p>Hello ${user.username},</p>
      <p>We received a request to reset your password. Click the button below to set a new password. This link will expire in 1 hour.</p>
      <div class="button-container">
        <a href="${resetUrl}" class="button" style="color: #ffffff;">Reset Password</a>
      </div>
      <p>If you did not request this, please ignore this email.</p>
    `;

    await sendEmail({
      to: email,
      subject,
      text: `Hello ${user.username}, Reset your password here: ${resetUrl}`,
      html: emailBodyHtml
    });

    res.json({ message: 'Password reset link sent to email' });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  const { token, password } = req.body;

  try {
    const userRes = await db.query(
      'SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
      [token]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
    }

    const user = userRes.rows[0];
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await db.query(
      'UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
      [hashedPassword, user.id]
    );

    res.json({ message: 'Password has been successfully updated' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword
};
