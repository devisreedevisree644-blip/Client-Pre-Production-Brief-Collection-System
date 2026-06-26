const db = require('../config/db');

// GET /api/dashboard/summary
const getDashboardSummary = async (req, res, next) => {
  const user = req.user;

  try {
    let whereClause = 'WHERE 1=1';
    let params = [];
    if (user.role === 'Client') {
      whereClause += ' AND client_id = $1';
      params.push(user.client_id);
    }

    // 1. Core Card Metrics (Draft, Submitted, Under Review, Revision Requested, Approved, Rejected, Archived, and Total)
    const countsQuery = `
      SELECT status, COUNT(*) as count
      FROM briefs
      ${whereClause}
      GROUP BY status
    `;
    const countsRes = await db.query(countsQuery, params);

    const cards = {
      total: 0,
      draft: 0,
      submitted: 0,
      underReview: 0,
      revisionRequested: 0,
      approved: 0,
      rejected: 0,
      archived: 0
    };

    countsRes.rows.forEach(row => {
      const cnt = parseInt(row.count, 10);
      cards.total += cnt;
      if (row.status === 'Draft') cards.draft = cnt;
      else if (row.status === 'Submitted') cards.submitted = cnt;
      else if (row.status === 'Under Review') cards.underReview = cnt;
      else if (row.status === 'Revision Requested') cards.revisionRequested = cnt;
      else if (row.status === 'Approved') cards.approved = cnt;
      else if (row.status === 'Rejected') cards.rejected = cnt;
      else if (row.status === 'Archived') cards.archived = cnt;
    });

    // 2. Recent activity lists
    // A. Latest submissions
    let submissionQuery = `
      SELECT b.id, b.project_name, b.created_at, c.company_name as client_name, b.status, b.priority
      FROM briefs b
      JOIN clients c ON b.client_id = c.id
      ${user.role === 'Client' ? `WHERE b.client_id = ${user.client_id}` : ''}
      ORDER BY b.created_at DESC
      LIMIT 5
    `;
    const submissionsRes = await db.query(submissionQuery);

    // B. Latest approvals
    let approvalQuery = `
      SELECT b.id, b.project_name, b.updated_at, c.company_name as client_name, b.status
      FROM briefs b
      JOIN clients c ON b.client_id = c.id
      WHERE b.status = 'Approved' ${user.role === 'Client' ? `AND b.client_id = ${user.client_id}` : ''}
      ORDER BY b.updated_at DESC
      LIMIT 5
    `;
    const approvalsRes = await db.query(approvalQuery);

    // C. Latest comments
    let commentsQuery = `
      SELECT c.id, c.comment, c.created_at, u.username, u.role, b.project_name, b.id as brief_id
      FROM comments c
      JOIN users u ON c.user_id = u.id
      JOIN briefs b ON c.brief_id = b.id
      ${user.role === 'Client' ? `WHERE b.client_id = ${user.client_id}` : ''}
      ORDER BY c.created_at DESC
      LIMIT 5
    `;
    const commentsRes = await db.query(commentsQuery);

    res.json({
      cards,
      recentSubmissions: submissionsRes.rows,
      recentApprovals: approvalsRes.rows,
      recentComments: commentsRes.rows
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardSummary
};
