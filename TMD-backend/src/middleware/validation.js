// Input validation middleware
const validateRequestBody = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (!req.body[field] || (typeof req.body[field] === 'string' && req.body[field].trim() === '')) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: "Validation failed",
        message: `Missing or empty required fields: ${missingFields.join(", ")}`,
        requiredFields: missingFields,
      });
    }

    next();
  };
};

// Sanitize input strings (remove leading/trailing whitespace)
const sanitizeInputs = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  next();
};

// Validate email format
const validateEmail = (req, res, next) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (req.body.email && !emailRegex.test(req.body.email)) {
    return res.status(400).json({
      error: "Validation failed",
      message: "Invalid email format",
    });
  }
  next();
};

// Validate password strength
const validatePasswordStrength = (req, res, next) => {
  const { newPassword } = req.body;
  if (newPassword && newPassword.length < 8) {
    return res.status(400).json({
      error: "Validation failed",
      message: "Password must be at least 8 characters long",
    });
  }
  // Optionally check for complexity (uppercase, numbers, symbols)
  if (newPassword) {
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumbers = /[0-9]/.test(newPassword);
    if (!hasUppercase || !hasNumbers) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Password must contain uppercase letters and numbers",
      });
    }
  }
  next();
};

module.exports = {
  validateRequestBody,
  sanitizeInputs,
  validateEmail,
  validatePasswordStrength,
};
