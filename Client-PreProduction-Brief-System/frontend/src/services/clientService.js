import API from './api';

export const getClients = async (params = {}) => {
  const response = await API.get('/clients', { params });
  return response.data;
};

export const getClientById = async (id) => {
  const response = await API.get(`/clients/${id}`);
  return response.data;
};

export const createClient = async (clientData) => {
  const response = await API.post('/clients', clientData);
  return response.data;
};

export const updateClient = async (id, clientData) => {
  const response = await API.put(`/clients/${id}`, clientData);
  return response.data;
};

export const deleteClient = async (id) => {
  const response = await API.delete(`/clients/${id}`);
  return response.data;
};
