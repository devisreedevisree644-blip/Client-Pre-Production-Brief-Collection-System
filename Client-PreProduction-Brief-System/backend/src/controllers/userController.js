const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { logAction } = require('../services/auditService');

// GET /api/users
const getUsers = async (req, res, next) => {
  try {
    const query = `
      SELECT u.id, u.username, u.email, u.role, u.client_id, c.company_name, u.created_at
      FROM users u
      LEFT JOIN clients c ON u.client_id = c.id
      ORDER BY u.created_at DESC
    `;
    const usersRes = await db.query(query);
    res.json(usersRes.rows);
  } catch (error) {
    next(error);
  }
};

// POST /api/users
const createUser = async (req, res, next) => {
  const { username, email, password, role, client_id } = req.body;

  try {
    const userExists = await db.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const query = `
      INSERT INTO users (username, email, password, role, client_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, role, client_id, created_at
    `;
    const newUserRes = await db.query(query, [username, email, hashedPassword, role, client_id || null]);
    const newUser = newUserRes.rows[0];

    // Log Action
    await logAction(req.user.id, 'User Created', 'user', newUser.id, null, { username, email, role });

    res.status(201).json(newUser);
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/:id
const updateUser = async (req, res, next) => {
  const { id } = req.params;
  const { username, email, password, role, client_id } = req.body;

  try {
    const userRes = await db.query('SELECT id, username, email, role, client_id FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const oldUser = userRes.rows[0];
    let updateFields = [];
    let params = [];
    let index = 1;

    if (username) {
      updateFields.push(`username = $${index++}`);
      params.push(username);
    }
    if (email) {
      updateFields.push(`email = $${index++}`);
      params.push(email);
    }
    if (role) {
      updateFields.push(`role = $${index++}`);
      params.push(role);
    }
    
    // Explicit client_id mapping to allow clearing client links
    updateFields.push(`client_id = $${index++}`);
    params.push(client_id !== undefined ? (client_id === '' ? null : client_id) : oldUser.client_id);

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateFields.push(`password = $${index++}`);
      params.push(hashedPassword);
    }

    params.push(id);
    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')} 
      WHERE id = $${index}
      RETURNING id, username, email, role, client_id, updated_at
    `;

    const updatedUserRes = await db.query(query, params);
    const updatedUser = updatedUserRes.rows[0];

    // Log Action
    await logAction(req.user.id, 'User Updated', 'user', id, oldUser, { username, email, role, client_id });

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/:id
const deleteUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    const userRes = await db.query('SELECT id, username, email, role FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userRes.rows[0];
    
    if (req.user.id === parseInt(id, 10)) {
      return res.status(400).json({ message: 'Self-deletion is forbidden' });
    }

    await db.query('DELETE FROM users WHERE id = $1', [id]);

    // Log Action
    await logAction(req.user.id, 'User Deleted', 'user', id, user, null);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/audit-logs
const getAuditLogs = async (req, res, next) => {
  try {
    const query = `
      SELECT a.id, a.action, a.entity, a.entity_id, a.old_value, a.new_value, a.timestamp, u.username, u.role
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.timestamp DESC
    `;
    const auditRes = await db.query(query);
    res.json(auditRes.rows);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getAuditLogs
};

