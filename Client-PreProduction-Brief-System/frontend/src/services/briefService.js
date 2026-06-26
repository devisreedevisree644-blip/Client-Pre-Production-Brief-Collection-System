import API from './api';

export const getBriefs = async (params = {}) => {
  const response = await API.get('/briefs', { params });
  return response.data;
};

export const getBriefById = async (id) => {
  const response = await API.get(`/briefs/${id}`);
  return response.data;
};

export const createBrief = async (briefData) => {
  const response = await API.post('/briefs', briefData);
  return response.data;
};

export const updateBrief = async (id, briefData) => {
  const response = await API.put(`/briefs/${id}`, briefData);
  return response.data;
};

export const deleteBrief = async (id) => {
  const response = await API.delete(`/briefs/${id}`);
  return response.data;
};

export const patchStatus = async (id, status) => {
  const response = await API.patch(`/briefs/${id}/status`, { status });
  return response.data;
};

export const uploadAttachment = async (briefId, file, attachmentType) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('attachment_type', attachmentType);

  const response = await API.post(`/briefs/${briefId}/attachments`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteAttachment = async (attachmentId) => {
  const response = await API.delete(`/briefs/attachments/${attachmentId}`);
  return response.data;
};

// Comment Service endpoints
export const getComments = async (briefId) => {
  const response = await API.get(`/briefs/${briefId}/comments`);
  return response.data;
};

export const createComment = async (briefId, commentText) => {
  const response = await API.post(`/briefs/${briefId}/comments`, { comment: commentText });
  return response.data;
};

export const updateComment = async (commentId, commentText) => {
  const response = await API.put(`/briefs/comments/${commentId}`, { comment: commentText });
  return response.data;
};

export const deleteComment = async (commentId) => {
  const response = await API.delete(`/briefs/comments/${commentId}`);
  return response.data;
};
