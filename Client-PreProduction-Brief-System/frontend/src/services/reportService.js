import API from './api';

export const getReportSummary = async (params = {}) => {
  const response = await API.get('/reports/summary', { params });
  return response.data;
};

export const getReportTrends = async (params = {}) => {
  const response = await API.get('/reports/trends', { params });
  return response.data;
};

export const exportReportCSV = async (params = {}) => {
  const response = await API.get('/reports/export', {
    params,
    responseType: 'blob', // Important for handling file downloads
  });
  
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'digiquest_briefs_report.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// Dashboard summary stats
export const getDashboardSummary = async () => {
  const response = await API.get('/dashboard/summary');
  return response.data;
};
