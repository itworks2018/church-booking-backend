/**
 * Password Validation Utility
 * Ensures passwords meet security requirements
 */

export function validatePassword(password) {
  const errors = [];
  
  // Check minimum length
  if (!password || password.length < 12) {
    errors.push("At least 12 characters");
  }
  
  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push("At least 1 uppercase letter (A-Z)");
  }
  
  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push("At least 1 lowercase letter (a-z)");
  }
  
  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push("At least 1 number (0-9)");
  }
  
  // Check for special character
  if (!/[!@#$%^&*()_+=[\]{};':"\\|,.<>?/\-]/.test(password)) {
    errors.push("At least 1 special character (!@#$%^&* etc)");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
