const db = require('../config/db');

/**
 * Log an action to the audit logs.
 * @param {number|null} userId - The ID of the user performing the action.
 * @param {string} action - The action string (e.g., 'Brief Created', 'Status Changed').
 * @param {string} entity - The target entity table name ('brief', 'comment', etc.).
 * @param {number} entityId - The specific record ID.
 * @param {object|null} oldValue - The old state of the record (before change).
 * @param {object|null} newValue - The new state of the record (after change).
 */
const logAction = async (userId, action, entity, entityId, oldValue = null, newValue = null) => {
  try {
    const query = `
      INSERT INTO audit_logs (user_id, action, entity, entity_id, old_value, new_value)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const params = [
      userId,
      action,
      entity,
      entityId,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null
    ];
    
    await db.query(query, params);
  } catch (error) {
    console.error('Audit Log Service Error:', error);
  }
};

module.exports = { logAction };
