const { body, validationResult } = require('express-validator');

const validateBrief = [
  body('project_name')
    .trim()
    .notEmpty()
    .withMessage('Project Name is required')
    .isLength({ max: 100 })
    .withMessage('Project Name must not exceed 100 characters'),
    
  body('project_type')
    .trim()
    .notEmpty()
    .withMessage('Project Type is required'),
    
  body('client_id')
    .isInt()
    .withMessage('Valid Client ID is required'),
    
  body('start_date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Start Date must be a valid date'),
    
  body('delivery_date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Delivery Date must be a valid date')
    .custom((value, { req }) => {
      if (req.body.start_date && value) {
        const start = new Date(req.body.start_date);
        const delivery = new Date(value);
        if (delivery < start) {
          throw new Error('Delivery date cannot be earlier than project start date');
        }
      }
      return true;
    }),

  body('approval_contact_email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Approval Contact Email must be a valid email address'),

  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High', 'Urgent'])
    .withMessage('Priority must be Low, Medium, High, or Urgent'),

  // Validation middleware execution block
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Advanced Core Business Logic Check:
    // "1. Required production information must exist before submission."
    // "3. Approval contact information must be complete."
    // "4. Mandatory attachments must be validated."
    const isSubmitting = req.body.status === 'Submitted';
    
    if (isSubmitting) {
      const missingFields = [];
      const prodFields = [
        'project_description',
        'script',
        'brand_guidelines',
        'delivery_format',
        'languages_required',
        'target_audience',
        'project_objective'
      ];
      
      for (const field of prodFields) {
        if (!req.body[field] || req.body[field].toString().trim() === '') {
          missingFields.push(field.replace('_', ' '));
        }
      }

      // Check approval contact details are complete
      if (!req.body.approval_contact_name || req.body.approval_contact_name.trim() === '') {
        missingFields.push('Approval Contact Name');
      }
      if (!req.body.approval_contact_email || req.body.approval_contact_email.trim() === '') {
        missingFields.push('Approval Contact Email');
      }
      if (!req.body.approval_contact_phone || req.body.approval_contact_phone.trim() === '') {
        missingFields.push('Approval Contact Phone');
      }

      if (missingFields.length > 0) {
        return res.status(400).json({
          message: `Cannot submit brief. The following mandatory submission fields are missing or incomplete: ${missingFields.join(', ')}`
        });
      }
    }

    next();
  }
];

module.exports = { validateBrief };
