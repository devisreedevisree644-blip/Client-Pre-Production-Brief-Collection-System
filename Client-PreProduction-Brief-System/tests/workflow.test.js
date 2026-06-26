const request = require('supertest');
const app = require('../backend/src/app');
const db = require('../backend/src/config/db');
const jwt = require('jsonwebtoken');

jest.mock('mime', () => {
  const actual = jest.requireActual('mime');
  if (typeof actual.define !== 'function') {
    actual.define = () => {};
  }
  if (typeof actual.getType !== 'function') {
    actual.getType = (path) => actual.lookup(path);
  }
  if (typeof actual.getExtension !== 'function') {
    actual.getExtension = (ext) => actual.extension(ext);
  }
  return actual;
});

// Mock Database
jest.mock('../backend/src/config/db', () => ({
  query: jest.fn(),
}));

describe('Pre-Production Workflow Business Logic Tests', () => {
  let clientToken;
  let pmToken;

  beforeAll(() => {
    clientToken = jwt.sign(
      { id: 3, username: 'client_jane', role: 'Client', client_id: 1 },
      process.env.JWT_SECRET || 'digiquest_preprod_brief_jwt_secret_key_2026_super_secure'
    );
    pmToken = jwt.sign(
      { id: 2, username: 'pm_sarah', role: 'Project Manager', client_id: null },
      process.env.JWT_SECRET || 'digiquest_preprod_brief_jwt_secret_key_2026_super_secure'
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockResolvedValue({ rows: [] });
  });

  describe('PATCH /api/briefs/:id/status', () => {
    it('should allow Client to transition Draft to Submitted if all fields are complete', async () => {
      // 1. Session check
      db.query.mockResolvedValueOnce({ id: 3, username: 'client_jane', role: 'Client', client_id: 1 });
      // 2. Fetch existing brief fields (complete brief)
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          project_name: 'Acme Fall Fashion Campaign',
          client_id: 1,
          status: 'Draft',
          project_description: 'Fashion shoot info',
          script: 'Walk runway, close-up cuts',
          brand_guidelines: 'Montserrat, Navy Blue',
          delivery_format: 'MP4 4K',
          languages_required: 'English',
          target_audience: 'Young Adults',
          project_objective: 'Drive online orders',
          approval_contact_name: 'Jane Doe',
          approval_contact_email: 'jane.doe@acme.com',
          approval_contact_phone: '+1-555-0199',
          created_by: 3
        }]
      });
      // 3. Update status query
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, project_name: 'Acme Fall Fashion Campaign', status: 'Submitted', client_id: 1, created_by: 3 }]
      });
      // 4. Client check for notification
      db.query.mockResolvedValueOnce({ rows: [{ company_name: 'Acme Corp' }] });
      // 5. Staff check query for notification center inserts
      db.query.mockResolvedValueOnce({ rows: [{ id: 2, email: 'pm@digiqueststudio.com' }] });
      // 6. Staff notification insert
      db.query.mockResolvedValueOnce({ rows: [{ id: 101 }] });
      // 7. Creator check query inside notifyBriefSubmission
      db.query.mockResolvedValueOnce({ rows: [{ id: 3, email: 'jane.doe@acme.com', username: 'client_jane' }] });
      // 8. Creator notification insert
      db.query.mockResolvedValueOnce({ rows: [{ id: 102 }] });

      const res = await request(app)
        .patch('/api/briefs/1/status')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ status: 'Submitted' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('Submitted');
    });

    it('should reject transition to Submitted if mandatory production fields are empty', async () => {
      db.query.mockResolvedValueOnce({ id: 3, username: 'client_jane', role: 'Client', client_id: 1 }); // Session
      // Empty fields in brief
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          project_name: 'Acme Fall Fashion Campaign',
          client_id: 1,
          status: 'Draft',
          project_description: '', // Missing
          script: '', // Missing
          created_by: 3
        }]
      });

      const res = await request(app)
        .patch('/api/briefs/1/status')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ status: 'Submitted' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Missing mandatory requirements');
    });

    it('should reject invalid transition jumps (e.g. Draft directly to Approved)', async () => {
      db.query.mockResolvedValueOnce({ id: 2, username: 'pm_sarah', role: 'Project Manager' }); // PM session
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, project_name: 'Acme Fall', status: 'Draft', client_id: 1 }]
      }); // Existing status is Draft

      const res = await request(app)
        .patch('/api/briefs/1/status')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ status: 'Approved' }); // Transitioning Draft -> Approved is invalid

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Invalid workflow transition');
    });

    it('should reject Client from transitioning Submitted to Under Review', async () => {
      db.query.mockResolvedValueOnce({ id: 3, username: 'client_jane', role: 'Client', client_id: 1 }); // Client session
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, project_name: 'Acme Fall', status: 'Submitted', client_id: 1 }]
      });

      const res = await request(app)
        .patch('/api/briefs/1/status')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ status: 'Under Review' }); // Submitted -> Under Review only allowed for Staff

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Invalid workflow transition');
    });
  });
});
