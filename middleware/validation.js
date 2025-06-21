const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

/**
 * User registration validation
 */
const validateUserRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('phone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  
  body('referralCode')
    .optional()
    .trim()
    .isLength({ min: 8, max: 8 })
    .withMessage('Referral code must be exactly 8 characters'),
  
  handleValidationErrors
];

/**
 * User login validation
 */
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

/**
 * Purchase validation
 */
const validatePurchase = [
  body('userId')
    .isMongoId()
    .withMessage('Valid user ID is required'),
  
  body('purchaseAmount')
    .isFloat({ min: 0 })
    .withMessage('Purchase amount must be a positive number'),
  
  body('profitAmount')
    .isFloat({ min: 0 })
    .withMessage('Profit amount must be a positive number'),
  
  body('productName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Product name must be between 1 and 100 characters'),
  
  body('category')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category must be between 1 and 50 characters'),
  
  handleValidationErrors
];

/**
 * Referral code validation
 */
const validateReferralCode = [
  body('referralCode')
    .trim()
    .isLength({ min: 8, max: 8 })
    .withMessage('Referral code must be exactly 8 characters')
    .matches(/^[A-Z0-9]{8}$/)
    .withMessage('Referral code must contain only uppercase letters and numbers'),
  
  handleValidationErrors
];

/**
 * User ID parameter validation
 */
const validateUserId = [
  param('userId')
    .isMongoId()
    .withMessage('Valid user ID is required'),
  
  handleValidationErrors
];

/**
 * Date range validation
 */
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

/**
 * Notification validation
 */
const validateNotificationAction = [
  body('notificationIds')
    .optional()
    .isArray()
    .withMessage('Notification IDs must be an array'),
  
  body('notificationIds.*')
    .optional()
    .isMongoId()
    .withMessage('Each notification ID must be a valid MongoDB ID'),
  
  handleValidationErrors
];

/**
 * Profile update validation
 */
const validateProfileUpdate = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  
  body('phone')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  handleValidationErrors
];

/**
 * Password change validation
 */
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
  
  handleValidationErrors
];

/**
 * Transaction ID validation
 */
const validateTransactionId = [
  param('transactionId')
    .matches(/^TXN\d{13}[A-Z0-9]{6}$/)
    .withMessage('Invalid transaction ID format'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validatePurchase,
  validateReferralCode,
  validateUserId,
  validateDateRange,
  validateNotificationAction,
  validateProfileUpdate,
  validatePasswordChange,
  validateTransactionId
}; 