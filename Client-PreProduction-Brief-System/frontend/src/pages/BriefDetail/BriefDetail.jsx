import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getBriefById, patchStatus, createComment, deleteComment, uploadAttachment, deleteAttachment } from '../../services/briefService';
import API from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import Toast from '../../components/Common/Toast';
import Modal from '../../components/Common/Modal';
import './BriefDetail.css';

const BriefDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [brief, setBrief] = useState(null);
  const [toast, setToast] = useState(null);

  // UI Tabs Control
  const [activeTab, setActiveTab] = useState('specs'); // 'specs', 'files', 'audit'

  // Comments State
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState([]);
  const [reactingCommentId, setReactingCommentId] = useState(null);

  // File Upload State
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadType, setUploadType] = useState('additional_doc');

  // Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [targetStatusTransition, setTargetStatusTransition] = useState('');

  // Fetch full details
  const fetchDetails = useCallback(async () => {
    try {
      const data = await getBriefById(id);
      setBrief(data);
      setComments(data.comments || []);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to retrieve brief details.', type: 'error' });
      navigate('/briefs');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Handle comments submit
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const addedComment = await createComment(id, newComment);
      setComments((prev) => [...prev, addedComment]);
      setNewComment('');
      setToast({ message: 'Comment posted successfully!', type: 'success' });
      fetchDetails(); // Reload to refresh activity log
    } catch (err) {
      setToast({ message: 'Failed to post comment.', type: 'error' });
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setToast({ message: 'Comment deleted successfully.', type: 'success' });
      fetchDetails();
    } catch (err) {
      setToast({ message: 'Could not delete comment.', type: 'error' });
    }
  };

  const handleToggleReaction = async (commentId, emoji) => {
    try {
      const res = await API.post(`/briefs/comments/${commentId}/react`, { reaction: emoji });
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, reactions: res.data.reactions } : c
        )
      );
    } catch (err) {
      console.error('Error toggling reaction:', err);
      setToast({ message: 'Could not update reaction.', type: 'error' });
    }
  };

  // Handle file uploads on the fly
  const handleFileUpload = async (e) => {
    const uploadedFiles = e.target.files;
    if (uploadedFiles.length === 0) return;
    
    const file = uploadedFiles[0];
    if (file.size > 10 * 1024 * 1024) {
      setToast({ message: 'File size exceeds 10MB limit.', type: 'error' });
      return;
    }

    setUploadingFile(true);
    try {
      await uploadAttachment(id, file, uploadType);
      setToast({ message: 'File uploaded and added to brief!', type: 'success' });
      fetchDetails();
    } catch (err) {
      setToast({ message: 'File upload failed.', type: 'error' });
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleDeleteFile = async (attachmentId) => {
    try {
      await deleteAttachment(attachmentId);
      setToast({ message: 'Attachment removed successfully.', type: 'success' });
      fetchDetails();
    } catch (err) {
      setToast({ message: 'Could not remove attachment.', type: 'error' });
    }
  };

  // Status transitions
  const initiateTransition = (status) => {
    setTargetStatusTransition(status);
    setShowConfirmModal(true);
  };

  const handleTransitionConfirm = async () => {
    try {
      await patchStatus(id, targetStatusTransition);
      setToast({ message: `Status transitioned to "${targetStatusTransition}"`, type: 'success' });
      fetchDetails();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Workflow transition blocked.';
      setToast({ message: errMsg, type: 'error' });
    } finally {
      setShowConfirmModal(false);
      setTargetStatusTransition('');
    }
  };

  const allowedTransitions = (currentStatus) => {
    const transitions = {
      'Draft': ['Submitted'],
      'Submitted': ['Under Review'],
      'Under Review': ['Approved', 'Revision Requested', 'Rejected'],
      'Revision Requested': ['Submitted'],
      'Approved': ['Archived'],
      'Rejected': [],
      'Archived': []
    };
    
    const allowed = transitions[currentStatus] || [];
    
    // Clients can only submit drafts/revisions
    if (user.role === 'Client') {
      return allowed.includes('Submitted') ? ['Submitted'] : [];
    }
    
    return allowed;
  };

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (!brief) return null;

  return (
    <div className="page-container printable-brief">
      {/* Detail top-bar */}
      <div className="detail-top-bar flex-between hide-on-print">
        <div className="detail-header-info">
          <div className="detail-title-row">
            <h1>{brief.project_name}</h1>
            <span className={`badge badge-${brief.status.toLowerCase().replace(' ', '')}`}>
              {brief.status}
            </span>
            <span className={`badge badge-priority-${brief.priority.toLowerCase()}`}>
              {brief.priority}
            </span>
          </div>
          <p>
            Client Partner: <strong>{brief.company_name}</strong> | Created by {brief.creator_name || 'System'}
          </p>
        </div>

        <div className="detail-header-actions">
          {/* Action buttons */}
          <button className="btn btn-outline" onClick={() => window.print()}>
            🖨 Print / Export PDF
          </button>
          
          {(user.role !== 'Client' || ['Draft', 'Revision Requested'].includes(brief.status)) && (
            <Link to={`/briefs/${brief.id}/edit`} className="btn btn-secondary">
              ✏️ Modify Brief
            </Link>
          )}

          {allowedTransitions(brief.status).map((t) => (
            <button key={t} className="btn btn-primary" onClick={() => initiateTransition(t)}>
              Move to {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid specs layout */}
      <div className="detail-grid">
        <div className="detail-main-content">
          {/* Tabs header */}
          <div className="details-tabs hide-on-print">
            <button
              className={`tab-btn ${activeTab === 'specs' ? 'active' : ''}`}
              onClick={() => setActiveTab('specs')}
            >
              📄 Brief Specifications
            </button>
            <button
              className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
              onClick={() => setActiveTab('files')}
            >
              📎 Attachments ({brief.attachments?.length || 0})
            </button>
            <button
              className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
              onClick={() => setActiveTab('audit')}
            >
              📜 Audit History ({brief.activityHistory?.length || 0})
            </button>
          </div>

          {/* Specs Panel */}
          {activeTab === 'specs' && (
            <div className="specs-panel card-glass">
              {/* Section 1: Basic info */}
              <div className="spec-section">
                <h3>1. Project Information</h3>
                <div className="spec-grid">
                  <div className="spec-item">
                    <span className="spec-label">Project Name</span>
                    <span className="spec-value">{brief.project_name}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Project Type</span>
                    <span className="spec-value">{brief.project_type}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Client Company</span>
                    <span className="spec-value">{brief.company_name}</span>
                  </div>
                </div>
                <div className="spec-item-full" style={{ marginTop: '14px' }}>
                  <span className="spec-label">Project Description</span>
                  <p className="spec-textbox">{brief.project_description || 'No description provided.'}</p>
                </div>
              </div>

              {/* Section 2: Production details */}
              <div className="spec-section">
                <h3>2. Production Specifications</h3>
                <div className="spec-item-full">
                  <span className="spec-label">Project Objective</span>
                  <p className="spec-textbox">{brief.project_objective || 'No objective outlined.'}</p>
                </div>
                <div className="spec-item-full">
                  <span className="spec-label">Target Audience</span>
                  <p className="spec-textbox">{brief.target_audience || 'No target audience specified.'}</p>
                </div>
                <div className="spec-item-full">
                  <span className="spec-label">Script / Voiceover Guide</span>
                  <p className="spec-textbox">{brief.script || 'No script draft added.'}</p>
                </div>
                <div className="spec-item-full">
                  <span className="spec-label">References & Inspiration Links</span>
                  <p className="spec-textbox">{brief.references_text || 'No reference details provided.'}</p>
                </div>
                <div className="spec-grid">
                  <div className="spec-item">
                    <span className="spec-label">Delivery Aspect & Codec</span>
                    <span className="spec-value">{brief.delivery_format || 'Unspecified'}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Languages Required</span>
                    <span className="spec-value">{brief.languages_required || 'Unspecified'}</span>
                  </div>
                </div>
                <div className="spec-item-full" style={{ marginTop: '14px' }}>
                  <span className="spec-label">Brand Identity Constraints</span>
                  <p className="spec-textbox">{brief.brand_guidelines || 'No brand details added.'}</p>
                </div>
              </div>

              {/* Section 3: Timeline */}
              <div className="spec-section">
                <h3>3. Timeline & Priority</h3>
                <div className="spec-grid">
                  <div className="spec-item">
                    <span className="spec-label">Start Date</span>
                    <span className="spec-value">
                      {brief.start_date ? new Date(brief.start_date).toLocaleDateString() : 'Unscheduled'}
                    </span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Required Delivery</span>
                    <span className="spec-value">
                      {brief.delivery_date ? new Date(brief.delivery_date).toLocaleDateString() : 'Unscheduled'}
                    </span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Project Priority</span>
                    <span className="spec-value">{brief.priority}</span>
                  </div>
                </div>
              </div>

              {/* Section 4: Approval sign-off */}
              <div className="spec-section">
                <h3>4. Approval Sign-Off Information</h3>
                <div className="spec-grid">
                  <div className="spec-item">
                    <span className="spec-label">Contact Person Name</span>
                    <span className="spec-value">{brief.approval_contact_name || 'Not provided'}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Contact Email</span>
                    <span className="spec-value">{brief.approval_contact_email || 'Not provided'}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Contact Phone</span>
                    <span className="spec-value">{brief.approval_contact_phone || 'Not provided'}</span>
                  </div>
                </div>
              </div>

              {/* Section 5: Extra comments */}
              {(brief.special_instructions || brief.production_notes) && (
                <div className="spec-section">
                  <h3>5. Instructions & Crew Notes</h3>
                  {brief.special_instructions && (
                    <div className="spec-item-full" style={{ marginBottom: '14px' }}>
                      <span className="spec-label">Special Instructions</span>
                      <p className="spec-textbox">{brief.special_instructions}</p>
                    </div>
                  )}
                  {brief.production_notes && (
                    <div className="spec-item-full">
                      <span className="spec-label">Internal Production Notes</span>
                      <p className="spec-textbox">{brief.production_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Files Panel */}
          {activeTab === 'files' && (
            <div className="files-panel card-glass hide-on-print">
              <div className="flex-between" style={{ marginBottom: '20px' }}>
                <h3>File Attachments</h3>
                
                {/* Upload on the fly */}
                <div className="quick-upload-row">
                  <select value={uploadType} onChange={(e) => setUploadType(e.target.value)}>
                    <option value="script">Script</option>
                    <option value="brand_guideline">Brand Guideline</option>
                    <option value="reference_image">Reference Image</option>
                    <option value="additional_doc">Additional Document</option>
                  </select>
                  <label className="btn btn-primary" style={{ margin: 0, cursor: 'pointer' }}>
                    {uploadingFile ? 'Uploading...' : 'Upload File'}
                    <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploadingFile} />
                  </label>
                </div>
              </div>

              {brief.attachments?.length === 0 ? (
                <p className="no-activity">No uploaded files linked to this brief.</p>
              ) : (
                <ul className="file-attachments-list">
                  {brief.attachments.map((file) => (
                    <li key={file.id} className="file-attachment-item">
                      <div className="file-info">
                        <span className="file-icon-type">📎</span>
                        <div>
                          <p className="file-name">{file.file_name}</p>
                          <small>
                            Category: <strong>{file.attachment_type.replace('_', ' ')}</strong> | Size:{' '}
                            {(file.file_size / 1024 / 1024).toFixed(2)} MB
                          </small>
                        </div>
                      </div>
                      <div className="file-item-actions">
                        <a
                          href={`http://localhost:5000/uploads/${file.file_path.split('\\').pop().split('/').pop()}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline btn-sm-padding"
                          download={file.file_name}
                        >
                          Download
                        </a>
                        <button
                          className="btn btn-outline btn-sm-padding"
                          style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                          onClick={() => handleDeleteFile(file.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Audit History Panel */}
          {activeTab === 'audit' && (
            <div className="audit-panel card-glass hide-on-print">
              <h3>System Audit Trails</h3>
              {brief.activityHistory?.length === 0 ? (
                <p className="no-activity">No system events logged.</p>
              ) : (
                <ul className="audit-timeline">
                  {brief.activityHistory.map((log) => (
                    <li key={log.id} className="audit-timeline-item">
                      <div className="audit-dot" />
                      <div className="audit-content">
                        <p className="audit-action-msg">
                          <strong>{log.action}</strong> by {log.username || 'System'} ({log.role || 'Guest'})
                        </p>
                        {log.old_value && log.new_value && log.action === 'Status Changed' && (
                          <p className="audit-value-change">
                            Changed status from <span className="old-status">{log.old_value.status}</span> to{' '}
                            <span className="new-status">{log.new_value.status}</span>
                          </p>
                        )}
                        <span className="audit-timestamp">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar Comments */}
        <div className="detail-comments-sidebar card-glass hide-on-print">
          <h3>Collaborative Comments</h3>
          
          <div className="comments-feed-wrapper">
            {comments.length === 0 ? (
              <p className="no-activity">No comments posted yet. Begin onboarding collaboration here!</p>
            ) : (
              <div className="comments-scroll-list">
                {comments.map((c) => (
                  <div key={c.id} className="comment-bubble-wrapper">
                    <div className="comment-bubble-header flex-between">
                      <span className="comment-author">
                        {c.username} <small className="comment-role-tag">({c.role})</small>
                      </span>
                      {user.id === c.user_id && (
                        <button className="delete-comment-btn" onClick={() => handleDeleteComment(c.id)}>
                          &times;
                        </button>
                      )}
                    </div>
                    <p className="comment-bubble-content">{c.comment}</p>
                    
                    <div className="comment-reactions-row">
                      {c.reactions && Object.entries(c.reactions).map(([emoji, usersList]) => {
                        const hasReacted = usersList.includes(user.username);
                        return (
                          <button
                            key={emoji}
                            className={`reaction-badge ${hasReacted ? 'active' : ''}`}
                            onClick={() => handleToggleReaction(c.id, emoji)}
                            title={`Reacted by: ${usersList.join(', ')}`}
                            type="button"
                          >
                            <span>{emoji}</span>
                            <span className="reaction-count">{usersList.length}</span>
                          </button>
                        );
                      })}
                      
                      <div className="add-reaction-wrapper">
                        <button
                          type="button"
                          className="add-reaction-trigger"
                          onClick={() => setReactingCommentId(reactingCommentId === c.id ? null : c.id)}
                        >
                          ➕
                        </button>
                        {reactingCommentId === c.id && (
                          <div className="emoji-picker-inline card-glass">
                            {['👍', '❤️', '😄', '🎉', '🚀', '😮'].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                className="emoji-selector-btn"
                                onClick={() => {
                                  handleToggleReaction(c.id, emoji);
                                  setReactingCommentId(null);
                                }}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <span className="comment-time-label">
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleCommentSubmit} className="comment-submit-form">
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <textarea
                placeholder="Write a comment... Use @username to mention"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                required
              />
            </div>
            <div className="flex-between">
              <div className="quick-emojis-row">
                {['👍', '❤️', '😄', '🎉', '🚀', '😮'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="quick-emoji-btn"
                    onClick={() => setNewComment((prev) => prev + emoji)}
                    title={`Insert ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <button type="submit" className="btn btn-primary btn-sm-padding">
                Post Comment
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation transition workflow modal */}
      <Modal
        show={showConfirmModal}
        title="Confirm Status Change"
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleTransitionConfirm}
        confirmText={`Move to ${targetStatusTransition}`}
      >
        <p>Are you sure you want to transition the project brief status to <strong>{targetStatusTransition}</strong>?</p>
        <p style={{ marginTop: '10px', color: '#9ca3af' }}>
          This will trigger system audit logs and fire notifications to team partners automatically.
        </p>
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default BriefDetail;
