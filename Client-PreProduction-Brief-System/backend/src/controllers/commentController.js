const db = require('../config/db');
const { logAction } = require('../services/auditService');
const { notifyCommentAdded, notify } = require('../services/notificationService');

// GET /api/briefs/:id/comments
const getComments = async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  try {
    // RBAC: If client, verify brief belongs to their client_id
    const briefCheck = await db.query('SELECT client_id FROM briefs WHERE id = $1', [id]);
    if (briefCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Brief not found' });
    }

    if (user.role === 'Client' && briefCheck.rows[0].client_id !== user.client_id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const query = `
      SELECT c.id, c.comment, c.created_at, u.username, u.role, u.id as user_id, c.reactions
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.brief_id = $1
      ORDER BY c.created_at ASC
    `;
    const commentsRes = await db.query(query, [id]);
    
    // Ensure reactions field is parsed as an object
    const processedComments = commentsRes.rows.map(c => {
      let parsedReactions = {};
      if (c.reactions) {
        parsedReactions = typeof c.reactions === 'string' ? JSON.parse(c.reactions) : c.reactions;
      }
      return { ...c, reactions: parsedReactions };
    });
    
    res.json(processedComments);
  } catch (error) {
    next(error);
  }
};

// POST /api/briefs/:id/comments
const createComment = async (req, res, next) => {
  const { id } = req.params;
  const { comment } = req.body;
  const user = req.user;

  try {
    const briefCheck = await db.query('SELECT * FROM briefs WHERE id = $1', [id]);
    if (briefCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Brief not found' });
    }

    const brief = briefCheck.rows[0];

    // RBAC
    if (user.role === 'Client' && brief.client_id !== user.client_id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const query = `
      INSERT INTO comments (brief_id, user_id, comment)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const commentRes = await db.query(query, [id, user.id, comment]);
    const newComment = commentRes.rows[0];

    // Log Action
    await logAction(user.id, 'Comment Added', 'comment', newComment.id, null, { comment });

    // Notify brief owners/collaborators
    await notifyCommentAdded(newComment, brief, user);

    // Mention system: parse @username in comment
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    let match;
    const mentionedUsernames = [];
    while ((match = mentionRegex.exec(comment)) !== null) {
      mentionedUsernames.push(match[1]);
    }

    if (mentionedUsernames.length > 0) {
      // Find matching users
      const usersQuery = `
        SELECT id, email, username 
        FROM users 
        WHERE username = ANY($1)
      `;
      const mentionedUsersRes = await db.query(usersQuery, [mentionedUsernames]);
      
      for (const mUser of mentionedUsersRes.rows) {
        // Only notify if it's not the comment author
        if (mUser.id !== user.id) {
          const mentionMsg = `${user.username} mentioned you in a comment on brief "${brief.project_name}"`;
          const mentionEmailSubject = `[Mention] ${user.username} mentioned you on ${brief.project_name}`;
          const mentionBodyHtml = `
            <h2>You Were Mentioned</h2>
            <p>Hello ${mUser.username},</p>
            <p><strong>${user.username}</strong> mentioned you in a comment on brief: <strong>"${brief.project_name}"</strong>.</p>
            <blockquote style="background-color: #f3f4f6; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; font-style: italic;">
              "${comment}"
            </blockquote>
            <div class="button-container">
              <a href="http://localhost:5173/briefs/${brief.id}" class="button" style="color: #ffffff;">View Brief Comment</a>
            </div>
          `;
          
          await notify({
            userId: mUser.id,
            message: mentionMsg,
            type: 'comment',
            briefId: brief.id,
            emailTo: mUser.email,
            emailSubject: mentionEmailSubject,
            emailBodyHtml: mentionBodyHtml
          });
        }
      }
    }

    // Return the comment with username and role
    const finalComment = {
      ...newComment,
      username: user.username,
      role: user.role,
      reactions: {}
    };

    res.status(201).json(finalComment);
  } catch (error) {
    next(error);
  }
};

// PUT /api/briefs/comments/:id
const updateComment = async (req, res, next) => {
  const { id } = req.params;
  const { comment } = req.body;
  const user = req.user;

  try {
    const commentRes = await db.query('SELECT * FROM comments WHERE id = $1', [id]);
    if (commentRes.rows.length === 0) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const oldComment = commentRes.rows[0];

    // Verify own comment ownership
    if (oldComment.user_id !== user.id) {
      return res.status(403).json({ message: 'Forbidden: You can only edit your own comments' });
    }

    const query = `
      UPDATE comments
      SET comment = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const updatedRes = await db.query(query, [comment, id]);
    const updatedComment = updatedRes.rows[0];

    // Log Action
    await logAction(user.id, 'Comment Updated', 'comment', id, oldComment, updatedComment);

    res.json({
      ...updatedComment,
      username: user.username,
      role: user.role
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/briefs/comments/:id
const deleteComment = async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  try {
    const commentRes = await db.query('SELECT * FROM comments WHERE id = $1', [id]);
    if (commentRes.rows.length === 0) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const comment = commentRes.rows[0];

    // Verify ownership (Admin role can bypass comment ownership delete)
    if (comment.user_id !== user.id && user.role !== 'Admin') {
      return res.status(403).json({ message: 'Forbidden: You can only delete your own comments' });
    }

    await db.query('DELETE FROM comments WHERE id = $1', [id]);

    // Log Action
    await logAction(user.id, 'Comment Deleted', 'comment', id, comment, null);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// POST /api/briefs/comments/:id/react
const reactToComment = async (req, res, next) => {
  const { id } = req.params;
  const { reaction } = req.body;
  const user = req.user;

  if (!reaction) {
    return res.status(400).json({ message: 'Reaction is required' });
  }

  try {
    const commentRes = await db.query('SELECT * FROM comments WHERE id = $1', [id]);
    if (commentRes.rows.length === 0) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const comment = commentRes.rows[0];
    let reactions = {};

    if (comment.reactions) {
      reactions = typeof comment.reactions === 'string' ? JSON.parse(comment.reactions) : comment.reactions;
    }

    if (!reactions[reaction]) {
      reactions[reaction] = [];
    }

    const index = reactions[reaction].indexOf(user.username);
    if (index > -1) {
      reactions[reaction].splice(index, 1);
      if (reactions[reaction].length === 0) {
        delete reactions[reaction];
      }
    } else {
      reactions[reaction].push(user.username);
    }

    const reactionsStr = JSON.stringify(reactions);
    await db.query('UPDATE comments SET reactions = $1 WHERE id = $2', [reactionsStr, id]);

    res.json({
      id: comment.id,
      reactions
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  reactToComment
};
