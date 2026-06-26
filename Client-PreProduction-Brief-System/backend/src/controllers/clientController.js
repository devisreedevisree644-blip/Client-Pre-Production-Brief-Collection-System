const db = require('../config/db');
const { logAction } = require('../services/auditService');

// GET /api/clients
const getClients = async (req, res, next) => {
  const { search } = req.query;

  try {
    let query = 'SELECT * FROM clients';
    let params = [];

    if (search) {
      query += ' WHERE company_name ILIKE $1 OR contact_person ILIKE $1 OR email ILIKE $1';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY company_name ASC';
    const clientsRes = await db.query(query, params);
    res.json(clientsRes.rows);
  } catch (error) {
    next(error);
  }
};

// GET /api/clients/:id
const getClientById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const clientRes = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
    if (clientRes.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.json(clientRes.rows[0]);
  } catch (error) {
    next(error);
  }
};

// POST /api/clients
const createClient = async (req, res, next) => {
  const { company_name, contact_person, email, phone, address, website } = req.body;

  try {
    // Check if email already registered for a client
    const emailRes = await db.query('SELECT id FROM clients WHERE email = $1', [email]);
    if (emailRes.rows.length > 0) {
      return res.status(400).json({ message: 'Client with this email already exists' });
    }

    const query = `
      INSERT INTO clients (company_name, contact_person, email, phone, address, website)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const newClientRes = await db.query(query, [
      company_name,
      contact_person,
      email,
      phone || null,
      address || null,
      website || null
    ]);
    const newClient = newClientRes.rows[0];

    // Log Action
    await logAction(req.user.id, 'Client Created', 'client', newClient.id, null, newClient);

    res.status(201).json(newClient);
  } catch (error) {
    next(error);
  }
};

// PUT /api/clients/:id
const updateClient = async (req, res, next) => {
  const { id } = req.params;
  const { company_name, contact_person, email, phone, address, website } = req.body;

  try {
    const clientRes = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
    if (clientRes.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const oldClient = clientRes.rows[0];

    const query = `
      UPDATE clients
      SET company_name = $1, contact_person = $2, email = $3, phone = $4, address = $5, website = $6
      WHERE id = $7
      RETURNING *
    `;
    const updatedClientRes = await db.query(query, [
      company_name || oldClient.company_name,
      contact_person || oldClient.contact_person,
      email || oldClient.email,
      phone !== undefined ? phone : oldClient.phone,
      address !== undefined ? address : oldClient.address,
      website !== undefined ? website : oldClient.website,
      id
    ]);

    const updatedClient = updatedClientRes.rows[0];

    // Log Action
    await logAction(req.user.id, 'Client Updated', 'client', id, oldClient, updatedClient);

    res.json(updatedClient);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/clients/:id
const deleteClient = async (req, res, next) => {
  const { id } = req.params;

  try {
    const clientRes = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
    if (clientRes.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const client = clientRes.rows[0];
    await db.query('DELETE FROM clients WHERE id = $1', [id]);

    // Log Action
    await logAction(req.user.id, 'Client Deleted', 'client', id, client, null);

    res.json({ message: 'Client company deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient
};
