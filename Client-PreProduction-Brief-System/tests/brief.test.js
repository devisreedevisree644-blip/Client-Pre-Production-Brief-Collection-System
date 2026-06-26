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

describe('Pre-Production Brief API CRUD Tests', () => {
  let clientToken;
  let adminToken;

  beforeAll(() => {
    // Generate valid mock JWT tokens
    clientToken = jwt.sign(
      { id: 3, username: 'client_jane', role: 'Client', client_id: 1 },
      process.env.JWT_SECRET || 'digiquest_preprod_brief_jwt_secret_key_2026_super_secure'
    );
    adminToken = jwt.sign(
      { id: 1, username: 'admin', role: 'Admin', client_id: null },
      process.env.JWT_SECRET || 'digiquest_preprod_brief_jwt_secret_key_2026_super_secure'
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default implementation for user lookup query
    db.query.mockImplementation((sql, params) => {
      if (sql.includes('SELECT id, username, email, role, client_id FROM users') || sql.includes('users WHERE id =')) {
        // Return a mock user matching the clientToken id
        return Promise.resolve({
          rows: [{ id: 3, username: 'client_jane', role: 'Client', client_id: 1 }]
        });
      }
      return Promise.resolve({ rows: [] });
    });
  });

  describe('GET /api/briefs', () => {
    it('should list all briefs for Admin user', async () => {
      db.query.mockResolvedValueOnce({ id: 1, username: 'admin', role: 'Admin' }); // User session protection lookup
      db.query.mockResolvedValueOnce({
        rows: [
          { id: 1, project_name: 'Fashion Campaign', company_name: 'Acme Corp' },
          { id: 2, project_name: 'Logistics Demo', company_name: 'Globex' }
        ]
      }); // Briefs fetch query
      db.query.mockResolvedValueOnce({ rows: [{ count: '2' }] }); // Count query

      const res = await request(app)
        .get('/api/briefs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('should restrict Client users to only their company briefs', async () => {
      db.query.mockResolvedValueOnce({ id: 3, username: 'client_jane', role: 'Client', client_id: 1 }); // User lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, project_name: 'Fashion Campaign', client_id: 1, company_name: 'Acme Corp' }]
      }); // Client brief list
      db.query.mockResolvedValueOnce({ rows: [{ count: '1' }] }); // Count query

      const res = await request(app)
        .get('/api/briefs')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.statusCode).toEqual(200);
      // Verify first query parameter binds client_id
      expect(db.query.mock.calls[1][1][0]).toEqual(1);
    });
  });

  describe('POST /api/briefs', () => {
    it('should allow Client to create a brief in Draft status', async () => {
      db.query.mockResolvedValueOnce({ id: 3, username: 'client_jane', role: 'Client', client_id: 1 }); // User lookup
      db.query.mockResolvedValueOnce({ rows: [{ company_name: 'Acme Corp' }] }); // Client verify
      db.query.mockResolvedValueOnce({
        rows: [{ id: 10, project_name: 'New Commercial', client_id: 1, status: 'Draft' }]
      }); // Insert query

      const res = await request(app)
        .post('/api/briefs')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          project_name: 'New Commercial',
          project_type: 'TV Commercial',
          client_id: 1,
          status: 'Draft'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toEqual('Draft');
    });

    it('should reject creation if required project_name is missing', async () => {
      const res = await request(app)
        .post('/api/briefs')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          project_type: 'TV Commercial',
          client_id: 1
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.errors[0].msg).toContain('Name is required');
    });
  });
});
