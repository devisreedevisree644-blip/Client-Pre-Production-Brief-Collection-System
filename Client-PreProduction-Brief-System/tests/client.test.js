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

describe('Client Company Management API Tests', () => {
  let adminToken;
  let clientToken;

  beforeAll(() => {
    adminToken = jwt.sign(
      { id: 1, username: 'admin', role: 'Admin' },
      process.env.JWT_SECRET || 'digiquest_preprod_brief_jwt_secret_key_2026_super_secure'
    );
    clientToken = jwt.sign(
      { id: 3, username: 'client_jane', role: 'Client', client_id: 1 },
      process.env.JWT_SECRET || 'digiquest_preprod_brief_jwt_secret_key_2026_super_secure'
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/clients', () => {
    it('should allow Admin to fetch all client profiles', async () => {
      db.query.mockResolvedValueOnce({ id: 1, username: 'admin', role: 'Admin' }); // Session user lookup
      db.query.mockResolvedValueOnce({
        rows: [
          { id: 1, company_name: 'Acme Corp', contact_person: 'Jane Doe' },
          { id: 2, company_name: 'Globex Co', contact_person: 'Hank Scorpio' }
        ]
      }); // Select query

      const res = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveLength(2);
    });

    it('should reject Client role from viewing client company indexes', async () => {
      db.query.mockResolvedValueOnce({ id: 3, username: 'client_jane', role: 'Client', client_id: 1 }); // Session lookup
      
      const res = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toContain('Forbidden');
    });
  });

  describe('POST /api/clients', () => {
    it('should allow Admin to create a new client company profile', async () => {
      db.query.mockResolvedValueOnce({ id: 1, username: 'admin', role: 'Admin' }); // Session check
      db.query.mockResolvedValueOnce({ rows: [] }); // Check duplicate email query
      db.query.mockResolvedValueOnce({
        rows: [{ id: 4, company_name: 'Vandelay Latex', contact_person: 'George Costanza', email: 'latex@vandelay.com' }]
      }); // Insert query
      db.query.mockResolvedValueOnce({ rows: [] }); // Audit log insert query (mock)

      const res = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          company_name: 'Vandelay Latex',
          contact_person: 'George Costanza',
          email: 'latex@vandelay.com',
          phone: '+1-555-9000',
          website: 'https://vandelay.com'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.company_name).toEqual('Vandelay Latex');
    });
  });
});
