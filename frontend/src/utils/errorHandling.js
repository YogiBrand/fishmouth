/**
 * Utility functions for handling API errors, especially FastAPI validation errors
 */

/**
 * Formats error messages from API responses, handling FastAPI validation errors
 * @param {any} error - The error data from API response
 * @param {string} defaultMessage - Default message to use if error can't be formatted
 * @returns {string} - Formatted error message string safe for React rendering
 */
export const formatErrorMessage = (error, defaultMessage = 'An error occurred') => {
  if (!error) return defaultMessage;

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Handle FastAPI validation errors (array of error objects)
  if (Array.isArray(error)) {
    return error
      .map(err => {
        if (typeof err === 'string') return err;
        if (typeof err === 'object' && err.msg) {
          // Include field location in error message if available
          const location = err.loc ? ` (${err.loc.join(' -> ')})` : '';
          return `${err.msg}${location}`;
        }
        return JSON.stringify(err);
      })
      .join(', ');
  }

  // Handle single error objects
  if (typeof error === 'object') {
    // FastAPI single validation error
    if (error.msg) {
      const location = error.loc ? ` (${error.loc.join(' -> ')})` : '';
      return `${error.msg}${location}`;
    }

    // Generic error object with message property
    if (error.message) {
      return error.message;
    }

    // Try to extract meaningful information from error object
    if (error.detail) {
      return formatErrorMessage(error.detail, defaultMessage);
    }

    // Last resort: stringify the object
    try {
      return JSON.stringify(error);
    } catch {
      return defaultMessage;
    }
  }

  return defaultMessage;
};

/**
 * Formats API response errors from axios or fetch responses
 * @param {any} errorResponse - Error response from API call
 * @param {string} defaultMessage - Default message to use
 * @returns {string} - Formatted error message
 */
export const formatApiError = (errorResponse, defaultMessage = 'API request failed') => {
  // Handle axios errors
  if (errorResponse.response?.data) {
    return formatErrorMessage(errorResponse.response.data.detail || errorResponse.response.data, defaultMessage);
  }

  // Handle fetch response errors
  if (errorResponse.data) {
    return formatErrorMessage(errorResponse.data.detail || errorResponse.data, defaultMessage);
  }

  // Handle direct error objects
  return formatErrorMessage(errorResponse, defaultMessage);
};