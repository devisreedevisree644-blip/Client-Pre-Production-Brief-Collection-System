const db = require('../config/db');

// GET /api/reports/summary
const getReportSummary = async (req, res, next) => {
  const { client_id, start_date, delivery_date } = req.query;

  try {
    let whereClause = 'WHERE 1=1';
    let params = [];
    let paramIndex = 1;

    if (req.user.role === 'Client') {
      whereClause += ` AND client_id = $${paramIndex++}`;
      params.push(req.user.client_id);
    } else if (client_id) {
      whereClause += ` AND client_id = $${paramIndex++}`;
      params.push(client_id);
    }

    if (start_date) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      params.push(start_date);
    }

    if (delivery_date) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      params.push(delivery_date);
    }

    // 1. Total Briefs by status
    const statusQuery = `
      SELECT status, COUNT(*) as count 
      FROM briefs
      ${whereClause}
      GROUP BY status
    `;
    const statusRes = await db.query(statusQuery, params);

    // 2. Average approval time (using audit logs transitions from Submitted/Under Review to Approved)
    const avgApprovalQuery = `
      SELECT AVG(EXTRACT(EPOCH FROM (al.timestamp - b.created_at))/3600) as avg_hours
      FROM briefs b
      JOIN audit_logs al ON b.id = al.entity_id 
        AND al.entity = 'brief' 
        AND al.action = 'Status Changed' 
        AND al.new_value->>'status' = 'Approved'
      ${req.user.role === 'Client' ? `WHERE b.client_id = ${req.user.client_id}` : (client_id ? `WHERE b.client_id = ${client_id}` : '')}
    `;
    const avgApprovalRes = await db.query(avgApprovalQuery);
    const avgHours = parseFloat(avgApprovalRes.rows[0].avg_hours || '0').toFixed(1);

    // 3. Priorities distribution
    const priorityQuery = `
      SELECT priority, COUNT(*) as count 
      FROM briefs
      ${whereClause}
      GROUP BY priority
    `;
    const priorityRes = await db.query(priorityQuery, params);

    // Form summary structure
    const summary = {
      totalBriefs: 0,
      approvedBriefs: 0,
      rejectedBriefs: 0,
      pendingReviews: 0,
      averageApprovalHours: parseFloat(avgHours),
      statusDistribution: {},
      priorityDistribution: {}
    };

    statusRes.rows.forEach(row => {
      const cnt = parseInt(row.count, 10);
      summary.totalBriefs += cnt;
      summary.statusDistribution[row.status] = cnt;
      
      if (row.status === 'Approved') summary.approvedBriefs = cnt;
      if (row.status === 'Rejected') summary.rejectedBriefs = cnt;
      if (['Submitted', 'Under Review'].includes(row.status)) {
        summary.pendingReviews += cnt;
      }
    });

    priorityRes.rows.forEach(row => {
      summary.priorityDistribution[row.priority] = parseInt(row.count, 10);
    });

    res.json(summary);
  } catch (error) {
    next(error);
  }
};

// GET /api/reports/trends
const getReportTrends = async (req, res, next) => {
  const { client_id } = req.query;

  try {
    let whereClause = 'WHERE created_at >= NOW() - INTERVAL \'6 months\'';
    let params = [];
    let paramIndex = 1;

    if (req.user.role === 'Client') {
      whereClause += ` AND client_id = $${paramIndex++}`;
      params.push(req.user.client_id);
    } else if (client_id) {
      whereClause += ` AND client_id = $${paramIndex++}`;
      params.push(client_id);
    }

    const trendsQuery = `
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
      FROM briefs
      ${whereClause}
      GROUP BY month
      ORDER BY month ASC
    `;
    const trendsRes = await db.query(trendsQuery, params);

    res.json(trendsRes.rows);
  } catch (error) {
    next(error);
  }
};

// GET /api/reports/export (Exports briefs list as CSV)
const exportReportCSV = async (req, res, next) => {
  const { client_id, start_date, delivery_date } = req.query;

  try {
    let query = `
      SELECT b.id, b.project_name, b.project_type, c.company_name as client, 
             b.status, b.priority, b.start_date, b.delivery_date, b.created_at
      FROM briefs b
      JOIN clients c ON b.client_id = c.id
      WHERE 1=1
    `;
    let params = [];
    let paramIndex = 1;

    if (req.user.role === 'Client') {
      query += ` AND b.client_id = $${paramIndex++}`;
      params.push(req.user.client_id);
    } else if (client_id) {
      query += ` AND b.client_id = $${paramIndex++}`;
      params.push(client_id);
    }

    if (start_date) {
      query += ` AND b.created_at >= $${paramIndex++}`;
      params.push(start_date);
    }

    if (delivery_date) {
      query += ` AND b.created_at <= $${paramIndex++}`;
      params.push(delivery_date);
    }

    query += ' ORDER BY b.created_at DESC';
    const briefsRes = await db.query(query, params);

    // Build CSV string
    const headers = ['ID', 'Project Name', 'Project Type', 'Client', 'Status', 'Priority', 'Start Date', 'Delivery Date', 'Created Date'];
    let csvContent = headers.join(',') + '\n';

    const formatDate = (val) => {
      if (!val) return '';
      if (val instanceof Date) return val.toISOString().split('T')[0];
      return String(val).split(/[ T]/)[0];
    };

    briefsRes.rows.forEach(row => {
      const line = [
        row.id,
        `"${row.project_name.replace(/"/g, '""')}"`,
        `"${row.project_type.replace(/"/g, '""')}"`,
        `"${row.client.replace(/"/g, '""')}"`,
        row.status,
        row.priority,
        formatDate(row.start_date),
        formatDate(row.delivery_date),
        formatDate(row.created_at)
      ];
      csvContent += line.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="digiquest_briefs_report.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReportSummary,
  getReportTrends,
  exportReportCSV
};
