const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { logAction } = require('../services/auditService');
const { notifyBriefSubmission, notifyStatusChange } = require('../services/notificationService');

// Helper to validate status transitions
const isValidTransition = (oldStatus, newStatus, role) => {
  if (oldStatus === newStatus) return true;

  const transitions = {
    'Draft': ['Submitted'],
    'Submitted': ['Under Review'],
    'Under Review': ['Approved', 'Revision Requested', 'Rejected'],
    'Revision Requested': ['Submitted'],
    'Approved': ['Archived'],
    'Rejected': [],
    'Archived': []
  };

  const allowed = transitions[oldStatus] || [];
  if (!allowed.includes(newStatus)) {
    return false;
  }

  // Client-specific limits: Clients can only submit drafts or revised briefs
  if (role === 'Client') {
    const clientAllowed = ['Submitted'];
    if (!clientAllowed.includes(newStatus)) {
      return false;
    }
  }

  return true;
};

// GET /api/briefs
const getBriefs = async (req, res, next) => {
  const { search, status, priority, client_id, start_date, delivery_date, sort_by, order, page, limit } = req.query;
  const user = req.user;

  try {
    let query = `
      SELECT b.*, c.company_name, u.username as creator_name
      FROM briefs b
      JOIN clients c ON b.client_id = c.id
      LEFT JOIN users u ON b.created_by = u.id
      WHERE 1=1
    `;
    let params = [];
    let paramIndex = 1;

    // RBAC check: Clients can only see their own company's briefs
    if (user.role === 'Client') {
      query += ` AND b.client_id = $${paramIndex++}`;
      params.push(user.client_id);
    } else if (client_id) {
      query += ` AND b.client_id = $${paramIndex++}`;
      params.push(client_id);
    }

    if (search) {
      query += ` AND (b.project_name ILIKE $${paramIndex} OR b.project_description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      query += ` AND b.status = $${paramIndex++}`;
      params.push(status);
    }

    if (priority) {
      query += ` AND b.priority = $${paramIndex++}`;
      params.push(priority);
    }

    if (start_date) {
      query += ` AND b.start_date >= $${paramIndex++}`;
      params.push(start_date);
    }

    if (delivery_date) {
      query += ` AND b.delivery_date <= $${paramIndex++}`;
      params.push(delivery_date);
    }

    // Sort order
    const allowedSortFields = ['created_at', 'start_date', 'delivery_date', 'project_name', 'priority', 'status'];
    const activeSortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const activeOrder = order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY b.${activeSortField} ${activeOrder}`;

    // Pagination
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    const offset = (pageNum - 1) * limitNum;

    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limitNum, offset);

    const briefsRes = await db.query(query, params);

    // Count query for metadata
    let countQuery = `SELECT COUNT(*) FROM briefs b WHERE 1=1`;
    let countParams = [];
    let countParamIndex = 1;

    if (user.role === 'Client') {
      countQuery += ` AND b.client_id = $${countParamIndex++}`;
      countParams.push(user.client_id);
    } else if (client_id) {
      countQuery += ` AND b.client_id = $${countParamIndex++}`;
      countParams.push(client_id);
    }

    if (search) {
      countQuery += ` AND (b.project_name ILIKE $${countParamIndex} OR b.project_description ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND b.status = $${countParamIndex++}`;
      countParams.push(status);
    }

    if (priority) {
      countQuery += ` AND b.priority = $${countParamIndex++}`;
      countParams.push(priority);
    }

    const countRes = await db.query(countQuery, countParams);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    res.json({
      data: briefsRes.rows,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/briefs/:id
const getBriefById = async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  try {
    const briefQuery = `
      SELECT b.*, c.company_name, u.username as creator_name
      FROM briefs b
      JOIN clients c ON b.client_id = c.id
      LEFT JOIN users u ON b.created_by = u.id
      WHERE b.id = $1
    `;
    const briefRes = await db.query(briefQuery, [id]);

    if (briefRes.rows.length === 0) {
      return res.status(404).json({ message: 'Brief not found' });
    }

    const brief = briefRes.rows[0];

    // RBAC: Client can only view their own company's briefs
    if (user.role === 'Client' && brief.client_id !== user.client_id) {
      return res.status(403).json({ message: 'Forbidden: Access to this brief is restricted' });
    }

    // Fetch attachments
    const attachmentsRes = await db.query(
      'SELECT id, file_name, file_path, file_type, file_size, attachment_type, upload_date FROM attachments WHERE brief_id = $1',
      [id]
    );

    // Fetch comments
    const commentsQuery = `
      SELECT c.id, c.comment, c.created_at, u.username, u.role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.brief_id = $1
      ORDER BY c.created_at ASC
    `;
    const commentsRes = await db.query(commentsQuery, [id]);

    // Fetch activity logs (Audit Logs)
    const auditQuery = `
      SELECT a.id, a.action, a.timestamp, u.username, u.role, a.old_value, a.new_value
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.entity = 'brief' AND a.entity_id = $1
      ORDER BY a.timestamp DESC
    `;
    const auditRes = await db.query(auditQuery, [id]);

    res.json({
      ...brief,
      attachments: attachmentsRes.rows,
      comments: commentsRes.rows,
      activityHistory: auditRes.rows
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/briefs
const createBrief = async (req, res, next) => {
  const user = req.user;
  const {
    project_name, project_type, client_id, project_description,
    script, references_text, brand_guidelines, delivery_format,
    languages_required, target_audience, project_objective,
    start_date, delivery_date, priority,
    approval_contact_name, approval_contact_email, approval_contact_phone,
    special_instructions, production_notes, status
  } = req.body;

  try {
    let finalClientId = client_id;
    if (user.role === 'Client') {
      finalClientId = user.client_id;
    }

    if (!finalClientId) {
      return res.status(400).json({ message: 'Client ID is required' });
    }

    // Verify client exists
    const clientCheck = await db.query('SELECT company_name FROM clients WHERE id = $1', [finalClientId]);
    if (clientCheck.rows.length === 0) {
      return res.status(400).json({ message: 'Client not found' });
    }
    const clientName = clientCheck.rows[0].company_name;

    const initialStatus = status || 'Draft';

    const insertQuery = `
      INSERT INTO briefs (
        project_name, project_type, client_id, project_description,
        script, references_text, brand_guidelines, delivery_format,
        languages_required, target_audience, project_objective,
        start_date, delivery_date, priority,
        approval_contact_name, approval_contact_email, approval_contact_phone,
        special_instructions, production_notes, status, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *
    `;

    const params = [
      project_name, project_type, finalClientId, project_description || null,
      script || null, references_text || null, brand_guidelines || null, delivery_format || null,
      languages_required || null, target_audience || null, project_objective || null,
      start_date || null, delivery_date || null, priority || 'Medium',
      approval_contact_name || null, approval_contact_email || null, approval_contact_phone || null,
      special_instructions || null, production_notes || null, initialStatus, user.id
    ];

    const result = await db.query(insertQuery, params);
    const newBrief = result.rows[0];

    // Log Action
    await logAction(user.id, 'Brief Created', 'brief', newBrief.id, null, newBrief);

    // If initial status is Submitted, trigger notification
    if (initialStatus === 'Submitted') {
      await notifyBriefSubmission(newBrief, clientName);
    }

    res.status(201).json(newBrief);
  } catch (error) {
    next(error);
  }
};

// PUT /api/briefs/:id
const updateBrief = async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;
  const {
    project_name, project_type, client_id, project_description,
    script, references_text, brand_guidelines, delivery_format,
    languages_required, target_audience, project_objective,
    start_date, delivery_date, priority,
    approval_contact_name, approval_contact_email, approval_contact_phone,
    special_instructions, production_notes, status
  } = req.body;

  try {
    const briefRes = await db.query('SELECT * FROM briefs WHERE id = $1', [id]);
    if (briefRes.rows.length === 0) {
      return res.status(404).json({ message: 'Brief not found' });
    }

    const oldBrief = briefRes.rows[0];

    // RBAC: Client can only update their own briefs
    if (user.role === 'Client' && oldBrief.client_id !== user.client_id) {
      return res.status(403).json({ message: 'Forbidden: Access to this brief is restricted' });
    }

    // Workflow permission: Clients can only update Draft and Revision Requested briefs
    if (user.role === 'Client' && !['Draft', 'Revision Requested'].includes(oldBrief.status)) {
      return res.status(400).json({
        message: `Forbidden: Clients cannot modify briefs once they are in "${oldBrief.status}" status.`
      });
    }

    // If status transition is requested, validate it
    const newStatus = status || oldBrief.status;
    if (newStatus !== oldBrief.status) {
      if (!isValidTransition(oldBrief.status, newStatus, user.role)) {
        return res.status(400).json({
          message: `Invalid workflow transition from "${oldBrief.status}" to "${newStatus}"`
        });
      }
    }

    // Determine final client ID
    let finalClientId = oldBrief.client_id;
    if (user.role !== 'Client' && client_id) {
      finalClientId = client_id;
    }

    const updateQuery = `
      UPDATE briefs
      SET project_name = $1, project_type = $2, client_id = $3, project_description = $4,
          script = $5, references_text = $6, brand_guidelines = $7, delivery_format = $8,
          languages_required = $9, target_audience = $10, project_objective = $11,
          start_date = $12, delivery_date = $13, priority = $14,
          approval_contact_name = $15, approval_contact_email = $16, approval_contact_phone = $17,
          special_instructions = $18, production_notes = $19, status = $20
      WHERE id = $21
      RETURNING *
    `;

    const updatedRes = await db.query(updateQuery, [
      project_name || oldBrief.project_name,
      project_type || oldBrief.project_type,
      finalClientId,
      project_description !== undefined ? project_description : oldBrief.project_description,
      script !== undefined ? script : oldBrief.script,
      references_text !== undefined ? references_text : oldBrief.references_text,
      brand_guidelines !== undefined ? brand_guidelines : oldBrief.brand_guidelines,
      delivery_format !== undefined ? delivery_format : oldBrief.delivery_format,
      languages_required !== undefined ? languages_required : oldBrief.languages_required,
      target_audience !== undefined ? target_audience : oldBrief.target_audience,
      project_objective !== undefined ? project_objective : oldBrief.project_objective,
      start_date !== undefined ? start_date : oldBrief.start_date,
      delivery_date !== undefined ? delivery_date : oldBrief.delivery_date,
      priority || oldBrief.priority,
      approval_contact_name !== undefined ? approval_contact_name : oldBrief.approval_contact_name,
      approval_contact_email !== undefined ? approval_contact_email : oldBrief.approval_contact_email,
      approval_contact_phone !== undefined ? approval_contact_phone : oldBrief.approval_contact_phone,
      special_instructions !== undefined ? special_instructions : oldBrief.special_instructions,
      production_notes !== undefined ? production_notes : oldBrief.production_notes,
      newStatus,
      id
    ]);

    const updatedBrief = updatedRes.rows[0];

    // Log Action
    await logAction(user.id, 'Brief Updated', 'brief', id, oldBrief, updatedBrief);

    // Notifications
    if (newStatus !== oldBrief.status) {
      await logAction(user.id, 'Status Changed', 'brief', id, { status: oldBrief.status }, { status: newStatus });
      
      const clientCheck = await db.query('SELECT company_name FROM clients WHERE id = $1', [updatedBrief.client_id]);
      const clientName = clientCheck.rows[0]?.company_name || 'Client';

      if (oldBrief.status === 'Draft' && newStatus === 'Submitted') {
        await notifyBriefSubmission(updatedBrief, clientName);
      } else {
        await notifyStatusChange(updatedBrief, oldBrief.status, newStatus, user);
      }
    }

    res.json(updatedBrief);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/briefs/:id/status
const patchBriefStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;
  const user = req.user;

  try {
    const briefRes = await db.query('SELECT * FROM briefs WHERE id = $1', [id]);
    if (briefRes.rows.length === 0) {
      return res.status(404).json({ message: 'Brief not found' });
    }

    const brief = briefRes.rows[0];

    // RBAC: Client can only update status of their own briefs
    if (user.role === 'Client' && brief.client_id !== user.client_id) {
      return res.status(403).json({ message: 'Forbidden: Access to this brief is restricted' });
    }

    if (!isValidTransition(brief.status, status, user.role)) {
      return res.status(400).json({
        message: `Invalid workflow transition from "${brief.status}" to "${status}"`
      });
    }

    // Verify submission rule if moving from Draft -> Submitted
    if (status === 'Submitted') {
      const missingFields = [];
      const prodFields = ['project_description', 'script', 'brand_guidelines', 'delivery_format', 'languages_required', 'target_audience', 'project_objective'];
      for (const field of prodFields) {
        if (!brief[field] || brief[field].toString().trim() === '') {
          missingFields.push(field.replace('_', ' '));
        }
      }
      if (!brief.approval_contact_name) missingFields.push('Approval Contact Name');
      if (!brief.approval_contact_email) missingFields.push('Approval Contact Email');
      if (!brief.approval_contact_phone) missingFields.push('Approval Contact Phone');

      if (missingFields.length > 0) {
        return res.status(400).json({
          message: `Cannot transition status to Submitted. Missing mandatory requirements: ${missingFields.join(', ')}`
        });
      }
    }

    const updatedRes = await db.query(
      'UPDATE briefs SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    const updatedBrief = updatedRes.rows[0];

    // Log Action
    await logAction(user.id, 'Status Changed', 'brief', id, { status: brief.status }, { status });

    // Notifications
    const clientCheck = await db.query('SELECT company_name FROM clients WHERE id = $1', [updatedBrief.client_id]);
    const clientName = clientCheck.rows[0]?.company_name || 'Client';

    if (brief.status === 'Draft' && status === 'Submitted') {
      await notifyBriefSubmission(updatedBrief, clientName);
    } else {
      await notifyStatusChange(updatedBrief, brief.status, status, user);
    }

    res.json(updatedBrief);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/briefs/:id
const deleteBrief = async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  try {
    const briefRes = await db.query('SELECT * FROM briefs WHERE id = $1', [id]);
    if (briefRes.rows.length === 0) {
      return res.status(404).json({ message: 'Brief not found' });
    }

    const brief = briefRes.rows[0];

    // RBAC check: Client can only delete their own briefs, and only in Draft status
    if (user.role === 'Client') {
      if (brief.client_id !== user.client_id) {
        return res.status(403).json({ message: 'Forbidden: Access is restricted' });
      }
      if (brief.status !== 'Draft') {
        return res.status(400).json({ message: 'Forbidden: Clients can only delete briefs in Draft status' });
      }
    }

    // Delete associated files on disk
    const attachmentsRes = await db.query('SELECT file_path FROM attachments WHERE brief_id = $1', [id]);
    for (const attachment of attachmentsRes.rows) {
      try {
        if (fs.existsSync(attachment.file_path)) {
          fs.unlinkSync(attachment.file_path);
        }
      } catch (err) {
        console.error('Error deleting attachment file on disk:', err);
      }
    }

    await db.query('DELETE FROM briefs WHERE id = $1', [id]);

    // Log Action
    await logAction(user.id, 'Brief Deleted', 'brief', id, brief, null);

    res.json({ message: 'Brief deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// POST /api/briefs/:id/attachments
const uploadAttachment = async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;
  const { attachment_type } = req.body; // 'script', 'brand_guideline', 'reference_image', 'additional_doc'

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const briefRes = await db.query('SELECT client_id, status FROM briefs WHERE id = $1', [id]);
    if (briefRes.rows.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Brief not found' });
    }

    const brief = briefRes.rows[0];

    // RBAC checks
    if (user.role === 'Client' && brief.client_id !== user.client_id) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'Forbidden' });
    }

    const insertQuery = `
      INSERT INTO attachments (brief_id, file_name, file_path, file_type, file_size, attachment_type, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, file_name, file_type, file_size, attachment_type, upload_date
    `;

    const newAttachmentRes = await db.query(insertQuery, [
      id,
      req.file.originalname,
      req.file.path,
      req.file.mimetype,
      req.file.size,
      attachment_type || 'additional_doc',
      user.id
    ]);

    const newAttachment = newAttachmentRes.rows[0];

    // Log Action
    await logAction(user.id, 'File Uploaded', 'brief', id, null, { file_name: req.file.originalname, attachment_type });

    res.status(201).json(newAttachment);
  } catch (error) {
    // Delete file from disk if upload failed in DB
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// DELETE /api/briefs/attachments/:id
const deleteAttachment = async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  try {
    const attachmentRes = await db.query(
      `SELECT a.file_path, a.brief_id, b.client_id 
       FROM attachments a
       JOIN briefs b ON a.brief_id = b.id
       WHERE a.id = $1`,
      [id]
    );

    if (attachmentRes.rows.length === 0) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    const attachment = attachmentRes.rows[0];

    // RBAC
    if (user.role === 'Client' && attachment.client_id !== user.client_id) {
      return res.status(403).json({ message: 'Forbidden: Access restricted' });
    }

    // Delete from DB first
    await db.query('DELETE FROM attachments WHERE id = $1', [id]);

    // Delete from Disk
    try {
      if (fs.existsSync(attachment.file_path)) {
        fs.unlinkSync(attachment.file_path);
      }
    } catch (err) {
      console.error('Error removing file from disk:', err);
    }

    // Log Action
    await logAction(user.id, 'Attachment Deleted', 'brief', attachment.brief_id, { attachment_id: id }, null);

    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBriefs,
  getBriefById,
  createBrief,
  updateBrief,
  patchBriefStatus,
  deleteBrief,
  uploadAttachment,
  deleteAttachment
};
