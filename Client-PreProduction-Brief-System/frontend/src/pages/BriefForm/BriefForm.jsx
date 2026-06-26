import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createBrief, updateBrief, getBriefById, uploadAttachment } from '../../services/briefService';
import { getClients } from '../../services/clientService';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import Toast from '../../components/Common/Toast';
import './BriefForm.css';

const BriefForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams(); // For edit page redirect
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [toast, setToast] = useState(null);
  const [step, setStep] = useState(1);

  // Form Field States
  const [formData, setFormData] = useState({
    project_name: '',
    project_type: '',
    client_id: user?.client_id || '',
    project_description: '',
    script: '',
    references_text: '',
    brand_guidelines: '',
    delivery_format: '',
    languages_required: '',
    target_audience: '',
    project_objective: '',
    start_date: '',
    delivery_date: '',
    priority: 'Medium',
    approval_contact_name: '',
    approval_contact_email: '',
    approval_contact_phone: '',
    special_instructions: '',
    production_notes: '',
  });

  // Local File States
  const [files, setFiles] = useState({
    script_file: null,
    brand_file: null,
    reference_file: null,
    additional_file: null
  });

  // Fetch clients if Admin or PM
  useEffect(() => {
    const fetchClients = async () => {
      if (['Admin', 'Project Manager'].includes(user?.role)) {
        try {
          const clientData = await getClients();
          setClients(clientData);
        } catch (err) {
          console.error('Failed to fetch clients:', err);
        }
      }
    };
    fetchClients();
  }, [user]);

  // Load brief details if editing
  useEffect(() => {
    const fetchBriefDetails = async () => {
      if (isEdit) {
        setLoading(true);
        try {
          const brief = await getBriefById(id);
          // Format dates
          const formattedStart = brief.start_date ? brief.start_date.split('T')[0] : '';
          const formattedDelivery = brief.delivery_date ? brief.delivery_date.split('T')[0] : '';
          
          setFormData({
            ...brief,
            start_date: formattedStart,
            delivery_date: formattedDelivery,
          });
        } catch (err) {
          setToast({ message: 'Failed to load brief data.', type: 'error' });
        } finally {
          setLoading(false);
        }
      }
    };
    fetchBriefDetails();
  }, [id, isEdit]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    if (selectedFiles.length > 0) {
      const file = selectedFiles[0];
      const allowedExtensions = ['.pdf', '.docx', '.jpg', '.jpeg', '.png', '.zip'];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (!allowedExtensions.includes(ext)) {
        setToast({ message: `Format error. Only PDF, DOCX, JPG, PNG, and ZIP files are accepted.`, type: 'error' });
        e.target.value = '';
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB
        setToast({ message: 'File size exceeds the 10MB limit.', type: 'error' });
        e.target.value = '';
        return;
      }
      
      setFiles((prev) => ({ ...prev, [name]: file }));
    }
  };

  // Step Navigations
  const nextStep = () => {
    // Basic validations per step
    if (step === 1) {
      if (!formData.project_name.trim()) {
        setToast({ message: 'Project Name is required.', type: 'warning' });
        return;
      }
      if (!formData.project_type.trim()) {
        setToast({ message: 'Project Type is required.', type: 'warning' });
        return;
      }
      if (!formData.client_id) {
        setToast({ message: 'Client profile assignment is required.', type: 'warning' });
        return;
      }
      if (formData.start_date && formData.delivery_date) {
        if (new Date(formData.delivery_date) < new Date(formData.start_date)) {
          setToast({ message: 'Delivery Date cannot be earlier than Start Date.', type: 'warning' });
          return;
        }
      }
    }
    
    setStep((s) => s + 1);
  };

  const prevStep = () => setStep((s) => s - 1);

  // Submit Brief
  const handleSaveBrief = async (submitStatus) => {
    setLoading(true);
    try {
      // 1. If Submitting, validate that all mandatory production info & approvals exist
      if (submitStatus === 'Submitted') {
        const requiredFields = [
          'project_description', 'script', 'brand_guidelines', 'delivery_format',
          'languages_required', 'target_audience', 'project_objective',
          'approval_contact_name', 'approval_contact_email', 'approval_contact_phone'
        ];
        const missing = [];
        requiredFields.forEach((field) => {
          if (!formData[field] || formData[field].toString().trim() === '') {
            missing.push(field.replace('_', ' '));
          }
        });

        // Email regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (formData.approval_contact_email && !emailRegex.test(formData.approval_contact_email)) {
          setToast({ message: 'Please enter a valid Approval Contact Email.', type: 'warning' });
          setLoading(false);
          return;
        }

        if (missing.length > 0) {
          setToast({
            message: `Cannot submit. Complete all details before formal submission. Missing: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}`,
            type: 'warning'
          });
          setLoading(false);
          return;
        }
      }

      const payload = { ...formData, status: submitStatus };
      let savedBrief;
      
      if (isEdit) {
        savedBrief = await updateBrief(id, payload);
      } else {
        savedBrief = await createBrief(payload);
      }

      // 2. Upload file attachments sequentially
      const uploadPromises = [];
      if (files.script_file) {
        uploadPromises.push(uploadAttachment(savedBrief.id, files.script_file, 'script'));
      }
      if (files.brand_file) {
        uploadPromises.push(uploadAttachment(savedBrief.id, files.brand_file, 'brand_guideline'));
      }
      if (files.reference_file) {
        uploadPromises.push(uploadAttachment(savedBrief.id, files.reference_file, 'reference_image'));
      }
      if (files.additional_file) {
        uploadPromises.push(uploadAttachment(savedBrief.id, files.additional_file, 'additional_doc'));
      }

      if (uploadPromises.length > 0) {
        await Promise.all(uploadPromises);
      }

      setToast({ message: `Brief successfully saved as ${submitStatus}!`, type: 'success' });
      setTimeout(() => navigate(`/briefs/${savedBrief.id}`), 1000);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to save Pre-Production Brief. Check inputs.';
      setToast({ message: errMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && step === 1) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <div className="page-container">
      <div className="form-wizard-card card-glass">
        {/* Wizard Header */}
        <div className="wizard-header">
          <h2>{isEdit ? 'Modify Pre-Production Brief' : 'New Pre-Production Brief'}</h2>
          <p>Submit complete project requirements before scheduled filming/kickoff</p>
          
          {/* Step Indicators */}
          <div className="wizard-steps-indicator">
            <div className={`step-dot ${step >= 1 ? 'active' : ''} ${step === 1 ? 'current' : ''}`}>
              <span className="dot-num">1</span>
              <span className="dot-label">Basic & Dates</span>
            </div>
            <div className="step-line" />
            <div className={`step-dot ${step >= 2 ? 'active' : ''} ${step === 2 ? 'current' : ''}`}>
              <span className="dot-num">2</span>
              <span className="dot-label">Production details</span>
            </div>
            <div className="step-line" />
            <div className={`step-dot ${step >= 3 ? 'active' : ''} ${step === 3 ? 'current' : ''}`}>
              <span className="dot-num">3</span>
              <span className="dot-label">Sign-offs & Notes</span>
            </div>
            <div className="step-line" />
            <div className={`step-dot ${step >= 4 ? 'active' : ''} ${step === 4 ? 'current' : ''}`}>
              <span className="dot-num">4</span>
              <span className="dot-label">Upload Assets</span>
            </div>
          </div>
        </div>

        {/* Wizard Step 1 */}
        {step === 1 && (
          <div className="wizard-step">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="project_name">Project Name *</label>
                <input
                  type="text"
                  id="project_name"
                  placeholder="e.g. Acme 2026 Promo Video"
                  value={formData.project_name}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="project_type">Project Type *</label>
                <select id="project_type" value={formData.project_type} onChange={handleInputChange}>
                  <option value="">-- Choose Type --</option>
                  <option value="Promo Video">Promo Video</option>
                  <option value="Product Demo">Product Demo</option>
                  <option value="TV Commercial">TV Commercial</option>
                  <option value="2D Animation">2D Animation</option>
                  <option value="Explainer Animation">Explainer Animation</option>
                  <option value="Social Media Ad">Social Media Ad</option>
                  <option value="Corporate Film">Corporate Film</option>
                  <option value="Movie / Feature Film">Movie / Feature Film</option>
                  <option value="Music Video">Music Video</option>
                  <option value="Short Film">Short Film</option>
                  <option value="Documentary">Documentary</option>
                  <option value="Podcast">Podcast</option>
                  <option value="Soundtrack / Audio Song">Soundtrack / Audio Song</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="client_id">Client Company *</label>
                {['Admin', 'Project Manager'].includes(user?.role) ? (
                  <select id="client_id" value={formData.client_id} onChange={handleInputChange}>
                    <option value="">-- Assign Client --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={user?.company_name || 'My Company'}
                    disabled
                    style={{ opacity: 0.7 }}
                  />
                )}
              </div>

              <div className="form-group">
                <label htmlFor="priority">Project Priority</label>
                <select id="priority" value={formData.priority} onChange={handleInputChange}>
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                  <option value="Urgent">Urgent Priority</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="start_date">Project Start Date</label>
                <input
                  type="date"
                  id="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="delivery_date">Required Delivery Date</label>
                <input
                  type="date"
                  id="delivery_date"
                  value={formData.delivery_date}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="project_description">Project Description</label>
              <textarea
                id="project_description"
                placeholder="Briefly describe the overall scope, styling notes, and main ideas..."
                value={formData.project_description}
                onChange={handleInputChange}
              />
            </div>

            <div className="wizard-actions flex-end">
              <button className="btn btn-primary" onClick={nextStep}>
                Next step: Details
              </button>
            </div>
          </div>
        )}

        {/* Wizard Step 2 */}
        {step === 2 && (
          <div className="wizard-step">
            <div className="form-group">
              <label htmlFor="project_objective">Project Objective</label>
              <textarea
                id="project_objective"
                placeholder="What is the goal of this video? What action should viewers take?"
                value={formData.project_objective}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="target_audience">Target Audience</label>
              <textarea
                id="target_audience"
                placeholder="Who is the primary demographic? (Age, interest, location, industry...)"
                value={formData.target_audience}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="script">Script Draft or Voiceover Concept</label>
              <textarea
                id="script"
                placeholder="Provide a written script draft, storyboard concept, or spoken cues description..."
                value={formData.script}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="references_text">Reference Links & Inspiration</label>
              <textarea
                id="references_text"
                placeholder="Links to YouTube reels, Vimeo campaigns, competitor spots, or mood boards..."
                value={formData.references_text}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="delivery_format">Delivery Format (Aspect Ratio / Codec)</label>
                <input
                  type="text"
                  id="delivery_format"
                  placeholder="e.g. MP4 1080p, Vertical 9:16, ProRes"
                  value={formData.delivery_format}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="languages_required">Languages Required</label>
                <input
                  type="text"
                  id="languages_required"
                  placeholder="e.g. English, French Subtitles"
                  value={formData.languages_required}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="brand_guidelines">Brand Identity Guidelines</label>
              <textarea
                id="brand_guidelines"
                placeholder="Fonts, hex color codes, logo overlay requirements, and styling limitations..."
                value={formData.brand_guidelines}
                onChange={handleInputChange}
              />
            </div>

            <div className="wizard-actions">
              <button className="btn btn-secondary" onClick={prevStep}>
                Back
              </button>
              <button className="btn btn-primary" onClick={nextStep}>
                Next step: Approvals
              </button>
            </div>
          </div>
        )}

        {/* Wizard Step 3 */}
        {step === 3 && (
          <div className="wizard-step">
            <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
              Final Approval Sign-Off Contact
            </h3>
            
            <div className="form-group">
              <label htmlFor="approval_contact_name">Approval Contact Name</label>
              <input
                type="text"
                id="approval_contact_name"
                placeholder="Name of person responsible for final project sign-off"
                value={formData.approval_contact_name}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="approval_contact_email">Approval Contact Email</label>
                <input
                  type="email"
                  id="approval_contact_email"
                  placeholder="approver@company.com"
                  value={formData.approval_contact_email}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="approval_contact_phone">Approval Contact Phone</label>
                <input
                  type="tel"
                  id="approval_contact_phone"
                  placeholder="+1-555-0100"
                  value={formData.approval_contact_phone}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <h3 style={{ margin: '24px 0 16px 0', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
              Additional Comments
            </h3>

            <div className="form-group">
              <label htmlFor="special_instructions">Special Instructions</label>
              <textarea
                id="special_instructions"
                placeholder="Specific visual directions, prop requirements, captions, or scheduling bounds..."
                value={formData.special_instructions}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="production_notes">Internal Production Notes</label>
              <textarea
                id="production_notes"
                placeholder="Camera lens wishes, studio rentals, crew rosters, editing priorities..."
                value={formData.production_notes}
                onChange={handleInputChange}
              />
            </div>

            <div className="wizard-actions">
              <button className="btn btn-secondary" onClick={prevStep}>
                Back
              </button>
              <button className="btn btn-primary" onClick={nextStep}>
                Next step: Attachments
              </button>
            </div>
          </div>
        )}

        {/* Wizard Step 4 */}
        {step === 4 && (
          <div className="wizard-step">
            <h3 style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
              Upload Asset Attachments (Max 10MB per file)
            </h3>

            <div className="file-upload-grid">
              <div className="file-field card-glass">
                <label>Script File (PDF/DOCX)</label>
                <input type="file" name="script_file" onChange={handleFileChange} accept=".pdf,.docx" />
                {files.script_file && <span className="file-name-label">✓ {files.script_file.name}</span>}
              </div>

              <div className="file-field card-glass">
                <label>Brand Guidelines (PDF)</label>
                <input type="file" name="brand_file" onChange={handleFileChange} accept=".pdf" />
                {files.brand_file && <span className="file-name-label">✓ {files.brand_file.name}</span>}
              </div>

              <div className="file-field card-glass">
                <label>Reference Images (PNG/JPG)</label>
                <input type="file" name="reference_file" onChange={handleFileChange} accept=".png,.jpg,.jpeg" />
                {files.reference_file && <span className="file-name-label">✓ {files.reference_file.name}</span>}
              </div>

              <div className="file-field card-glass">
                <label>Additional Documents (ZIP/PDF)</label>
                <input type="file" name="additional_file" onChange={handleFileChange} accept=".zip,.pdf,.docx" />
                {files.additional_file && <span className="file-name-label">✓ {files.additional_file.name}</span>}
              </div>
            </div>

            <div className="wizard-actions" style={{ marginTop: '30px' }}>
              <button className="btn btn-secondary" onClick={prevStep} disabled={loading}>
                Back
              </button>
              <div className="action-row">
                <button
                  className="btn btn-outline"
                  onClick={() => handleSaveBrief('Draft')}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleSaveBrief('Submitted')}
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit Pre-Prod Brief'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

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

export default BriefForm;
