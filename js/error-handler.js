/**
 * Error Handler
 * Provides consistent error handling across the application
 */

const ErrorHandler = {
  /**
   * Process and handle API errors
   * @param {Error} error - The error object
   * @param {string} fallbackMessage - The fallback message if no specific error message is available
   * @returns {string} Formatted error message for display
   */
  handleApiError: function(error, fallbackMessage = 'An error occurred. Please try again.') {
    console.error('API Error:', error);
    
    // Network errors
    if (error.name === 'AbortError') {
      return 'Request timed out. Please check your internet connection and try again.';
    }
    
    if (error.message && error.message.includes('NetworkError')) {
      return 'Network error. Please check your internet connection and try again.';
    }
    
    // Try to extract message from error response
    if (error.response) {
      try {
        return error.response.data.message || error.response.data.error || fallbackMessage;
      } catch (e) {
        return fallbackMessage;
      }
    }
    
    // Use error message if available
    return error.message || fallbackMessage;
  },
  
  /**
   * Show error in UI (can be customized per page)
   * @param {string} message - Error message to display
   * @param {string} containerId - ID of container to show error in
   */
  showError: function(message, containerId = 'error-container') {
    const errorContainer = document.getElementById(containerId);
    if (!errorContainer) return;
    
    // Show error container
    errorContainer.classList.remove('hidden');
    
    // Find message element
    const messageEl = errorContainer.querySelector('p') || errorContainer.querySelector('.error-message');
    if (messageEl) {
      messageEl.textContent = message;
    }
    
    // Find retry button
    const retryButton = errorContainer.querySelector('button') || errorContainer.querySelector('a');
    if (retryButton) {
      retryButton.addEventListener('click', function() {
        window.location.reload();
      });
    }
    
    // Add diagnostics link if not present
    this.addDiagnosticsLink(errorContainer);
  },
  
  /**
   * Add a diagnostics link to help troubleshoot
   * @param {HTMLElement} container - Container to add the link to
   */
  addDiagnosticsLink: function(container) {
    if (!container) return;
    
    // Check if link already exists
    if (container.querySelector('.diagnostics-link')) return;
    
    const link = document.createElement('div');
    link.className = 'text-center mt-4 diagnostics-link';
    link.innerHTML = `
      <a href="loading-monitor.html" class="text-primary hover:underline text-sm">
        <i class="fas fa-stethoscope mr-1"></i> Run connection diagnostics
      </a>
    `;
    
    container.appendChild(link);
  },
  
  /**
   * Log error to console with additional context
   * @param {string} context - The context where the error occurred
   * @param {Error} error - The error object
   */
  logError: function(context, error) {
    console.group(`Error in ${context}`);
    console.error(error);
    console.trace();
    console.groupEnd();
  },
  
  /**
   * Try different API URLs until one works
   * @param {string} endpoint - API endpoint to try (without base URL)
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>} - Fetch response
   */
  tryDifferentApiUrls: async function(endpoint, options = {}) {
    // List of possible API URLs to try
    const apiUrls = [
      localStorage.getItem('apiUrl'), // User's preferred API URL
      window.API_CONFIG ? window.API_CONFIG.API_URL : null,
      window.API_CONFIG ? window.API_CONFIG.BACKUP_API_URL : null,
      'http://localhost:9000', // Default local development
      'http://127.0.0.1:9000', // Alternative local development
      'https://victormain1.onrender.com' // Production fallback
    ].filter(Boolean); // Remove null/undefined values
    
    // Add timeout to options if not present
    if (!options.signal) {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 10000); // 10 second timeout
      options.signal = controller.signal;
    }
    
    // Try each URL in sequence
    for (const apiUrl of apiUrls) {
      try {
        const url = `${apiUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        console.log(`Trying API URL: ${url}`);
        
        const response = await fetch(url, options);
        
        if (response.ok) {
          console.log(`Successful connection to ${apiUrl}`);
          // Store the working URL for future use
          localStorage.setItem('apiUrl', apiUrl);
          return response;
        }
      } catch (error) {
        console.warn(`Failed to connect to ${apiUrl}:`, error.message);
        // Continue to next URL
      }
    }
    
    // If all URLs fail, throw an error
    throw new Error('Failed to connect to any API server. Please check your internet connection and try again.');
  }
};

/**
 * Extended error handling for API connections
 */

// Add this at the end of the file
window.ErrorHandler = window.ErrorHandler || {};

// Add a new method to check server status
ErrorHandler.checkServerStatus = async function(apiUrl) {
  const urls = [
    apiUrl,
    localStorage.getItem('apiUrl'),
    'http://localhost:9000', 
    'http://127.0.0.1:9000',
    'https://victormain1.onrender.com'
  ].filter(Boolean);
  
  for (const url of urls) {
    try {
      console.log(`ErrorHandler: Testing API connectivity with ${url}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${url}/api/status`, {
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`ErrorHandler: Found working API at ${url}`);
        localStorage.setItem('apiUrl', url);
        return url;
      }
    } catch (error) {
      console.warn(`ErrorHandler: Failed connectivity test with ${url}:`, error.message);
    }
  }
  
  return null;
};

// Add a method to automatically recover from connection errors
ErrorHandler.recoverFromConnectionError = async function(callback) {
  try {
    const workingUrl = await this.checkServerStatus();
    if (workingUrl) {
      console.log(`ErrorHandler: Recovered with API URL ${workingUrl}`);
      if (typeof callback === 'function') {
        return callback(workingUrl);
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('ErrorHandler: Recovery failed:', error);
    return false;
  }
};

// Add this to the task-detail page in the HTML
document.addEventListener('DOMContentLoaded', function() {
  const errorContainer = document.getElementById('error-container');
  const retryButton = document.getElementById('retry-button');
  
  if (retryButton) {
    retryButton.addEventListener('click', async function() {
      // Show loading state
      const loadingContainer = document.getElementById('loading-container');
      if (loadingContainer) loadingContainer.classList.remove('hidden');
      if (errorContainer) errorContainer.classList.add('hidden');
      
      // Try to recover
      const recovered = await ErrorHandler.recoverFromConnectionError();
      
      if (recovered) {
        // Reload page or retry loading tasks
        if (typeof loadTasks === 'function') {
          loadTasks();
        } else {
          window.location.reload();
        }
      } else {
        // Show error again
        if (loadingContainer) loadingContainer.classList.add('hidden');
        if (errorContainer) errorContainer.classList.remove('hidden');
        
        // Add diagnostics link if not present
        ErrorHandler.addDiagnosticsLink(errorContainer);
      }
    });
  }
});

// If running in a browser environment, attach to window
if (typeof window !== 'undefined') {
  window.ErrorHandler = ErrorHandler;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorHandler;
}
