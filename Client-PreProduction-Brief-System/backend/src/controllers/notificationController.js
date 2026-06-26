const db = require('../config/db');

// GET /api/notifications
const getNotifications = async (req, res, next) => {
  const user = req.user;

  try {
    const query = `
      SELECT n.*, b.project_name
      FROM notifications n
      LEFT JOIN briefs b ON n.brief_id = b.id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
    `;
    const notificationsRes = await db.query(query, [user.id]);
    res.json(notificationsRes.rows);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/notifications/:id/read
const markAsRead = async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  try {
    const notificationCheck = await db.query('SELECT user_id FROM notifications WHERE id = $1', [id]);
    if (notificationCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notificationCheck.rows[0].user_id !== user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const query = 'UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *';
    const updatedRes = await db.query(query, [id]);
    res.json(updatedRes.rows[0]);
  } catch (error) {
    next(error);
  }
};

// POST /api/notifications/read-all
const markAllRead = async (req, res, next) => {
  const user = req.user;

  try {
    const query = 'UPDATE notifications SET is_read = TRUE WHERE user_id = $1';
    await db.query(query, [user.id]);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllRead
};
