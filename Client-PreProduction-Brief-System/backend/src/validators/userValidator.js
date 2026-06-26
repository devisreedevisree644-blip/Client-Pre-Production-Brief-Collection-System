const { body, validationResult } = require('express-validator');

const validateUserRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_\s\-\.]+$/)
    .withMessage('Username can only contain letters, numbers, spaces, underscores, hyphens, and periods'),
    
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address'),
    
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
    
  body('role')
    .isIn(['Admin', 'Project Manager', 'Client'])
    .withMessage('Role must be Admin, Project Manager, or Client'),

  body('client_id')
    .optional({ checkFalsy: true })
    .isInt()
    .withMessage('client_id must be an integer'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstErrorMsg = errors.array()[0].msg;
      return res.status(400).json({ 
        message: firstErrorMsg,
        errors: errors.array() 
      });
    }
    next();
  }
];

const validateUserLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address'),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstErrorMsg = errors.array()[0].msg;
      return res.status(400).json({ 
        message: firstErrorMsg,
        errors: errors.array() 
      });
    }
    next();
  }
];

module.exports = {
  validateUserRegistration,
  validateUserLogin
};
