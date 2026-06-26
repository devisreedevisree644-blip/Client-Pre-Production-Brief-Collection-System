const request = require('supertest');
const app = require('../backend/src/app');
const db = require('../backend/src/config/db');
const bcrypt = require('bcryptjs');

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

// Mock the database queries
jest.mock('../backend/src/config/db', () => ({
  query: jest.fn(),
}));

describe('Authentication API Endpoint Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should successfully register a new Client user and return a JWT', async () => {
      // Setup mock queries
      db.query.mockResolvedValueOnce({ rows: [] }); // User query
      db.query.mockResolvedValueOnce({ rows: [{ id: 10 }] }); // Client insert
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, username: 'testclient', email: 'test@client.com', role: 'Client', client_id: 10 }]
      }); // User insert

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testclient',
          email: 'test@client.com',
          password: 'Password123!',
          role: 'Client',
          company_name: 'Test Acme Co'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.username).toEqual('testclient');
    });

    it('should return 400 if user email already exists', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // User duplicate found

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testclient',
          email: 'duplicate@client.com',
          password: 'Password123!',
          role: 'Client'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate user and return JWT with correct password', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, username: 'testclient', email: 'test@client.com', password: hashedPassword, role: 'Client', client_id: 10 }]
      }); // User query
      db.query.mockResolvedValueOnce({ rows: [{ company_name: 'Test Acme Co' }] }); // Client company select

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@client.com',
          password: 'Password123!'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.company_name).toEqual('Test Acme Co');
    });

    it('should reject login if password is incorrect', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, username: 'testclient', email: 'test@client.com', password: hashedPassword, role: 'Client' }]
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@client.com',
          password: 'WrongPassword'
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toContain('Invalid');
    });
  });
});
