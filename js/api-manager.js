/**
 * API Manager
 * Handles API connections, retries, and fallbacks
 */

class ApiManager {
  constructor() {
    this.config = window.API_CONFIG || {
      API_URL: 'http://localhost:9000',
      BACKUP_API_URL: 'https://victormain1.onrender.com'
    };
    
    // List of potential API endpoints to try (in order)
    this.apiEndpoints = [
      localStorage.getItem('apiUrl'),
      this.config.API_URL,
      this.config.BACKUP_API_URL,
      'http://localhost:9000',
      'http://127.0.0.1:9000',
      'https://victormain1.onrender.com',
      // Add the current hostname with port 9000 for local networks
      window.location.hostname !== 'localhost' ? `${window.location.protocol}//${window.location.hostname}:9000` : null
    ].filter(Boolean); // Remove null/undefined
    
    // Keep track of working endpoints
    this.workingEndpoint = localStorage.getItem('apiUrl') || this.apiEndpoints[0];
    this.lastCheckedTime = 0;
    this.checkInterval = 60000; // 1 minute
    this.connectionFailed = false;
  }
  
  /**
   * Get the most reliable API endpoint
   * @returns {string} API endpoint URL
   */
  getApiUrl() {
    return this.workingEndpoint;
  }
  
  /**
   * Test if an API endpoint is working
   * @param {string} url - API endpoint to test
   * @returns {Promise<boolean>} Whether endpoint is working
   */
  async testEndpoint(url) {
    try {
      console.log(`Testing API endpoint: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${url}/api/status`, {
        signal: controller.signal,
        cache: 'no-cache',
        mode: 'cors',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`API endpoint ${url} is working`);
        return true;
      }
      
      console.warn(`API endpoint ${url} returned status: ${response.status}`);
      return false;
    } catch (error) {
      console.warn(`API endpoint ${url} is not responding:`, error.message);
      return false;
    }
  }
  
  /**
   * Find a working API endpoint and update it
   * @returns {Promise<string|null>} Working API endpoint or null if none found
   */
  async findWorkingEndpoint() {
    // Don't check too often
    const now = Date.now();
    if (now - this.lastCheckedTime < this.checkInterval && !this.connectionFailed) {
      return this.workingEndpoint;
    }
    
    this.lastCheckedTime = now;
    
    // Include current hostname with port 9000 for local networks
    if (window.location.hostname !== 'localhost') {
      const localNetworkUrl = `${window.location.protocol}//${window.location.hostname}:9000`;
      if (!this.apiEndpoints.includes(localNetworkUrl)) {
        this.apiEndpoints.push(localNetworkUrl);
      }
    }
    
    for (const url of this.apiEndpoints) {
      const isWorking = await this.testEndpoint(url);
      if (isWorking) {
        console.log(`Found working API endpoint: ${url}`);
        this.workingEndpoint = url;
        localStorage.setItem('apiUrl', url);
        this.connectionFailed = false;
        return url;
      }
    }
    
    this.connectionFailed = true;
    console.error('No working API endpoint found');
    return null;
  }
  
  /**
   * Make an API request with automatic retries and endpoint fallbacks
   * @param {string} path - API path (e.g. "/api/tasks")
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>} Fetch response
   */
  async request(path, options = {}) {
    // Ensure path starts with a slash
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    // Add default headers
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    // Add authentication if available
    const token = localStorage.getItem('token');
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Set up retry logic
    const retries = options.retries || 2;
    let lastError = null;
    
    // If we've had connection failures, refresh our API endpoint list
    if (this.connectionFailed) {
      await this.findWorkingEndpoint();
    }
    
    // Try each endpoint
    for (const url of this.apiEndpoints) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          // Add timeout to avoid hanging requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), options.timeout || 8000);
          const signal = options.signal || controller.signal;
          
          console.log(`Requesting ${url}${path} (Attempt ${attempt + 1}/${retries + 1})`);
          
          const response = await fetch(`${url}${path}`, {
            ...options,
            headers,
            signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            // Update working endpoint
            if (this.workingEndpoint !== url) {
              console.log(`Updating working endpoint to ${url}`);
              this.workingEndpoint = url;
              localStorage.setItem('apiUrl', url);
              this.connectionFailed = false;
            }
            
            return response;
          }
          
          console.warn(`Request failed with status: ${response.status}`);
          
          // If error response, parse it and throw
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            try {
              const errorData = await response.json();
              throw new Error(errorData.message || `HTTP error: ${response.status}`);
            } catch (parseError) {
              throw new Error(`HTTP error: ${response.status}`);
            }
          } else {
            throw new Error(`HTTP error: ${response.status}`);
          }
        } catch (error) {
          console.warn(`Request attempt failed: ${error.message}`);
          lastError = error;
          
          // If we've reached the max retries for this endpoint, continue to next endpoint
          if (attempt === retries) {
            break;
          }
          
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    // All endpoints failed
    this.connectionFailed = true;
    console.error('All API endpoints failed');
    throw lastError || new Error('Failed to connect to API');
  }
  
  /**
   * Get data from API
   * @param {string} path - API path
   * @param {Object} options - Additional options
   * @returns {Promise<any>} Response data
   */
  async get(path, options = {}) {
    const response = await this.request(path, { 
      ...options,
      method: 'GET' 
    });
    
    return await response.json();
  }
  
  /**
   * Post data to API
   * @param {string} path - API path
   * @param {Object} data - Data to post
   * @param {Object} options - Additional options
   * @returns {Promise<any>} Response data
   */
  async post(path, data, options = {}) {
    const response = await this.request(path, { 
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    return await response.json();
  }
  
  /**
   * Update data via API
   * @param {string} path - API path
   * @param {Object} data - Data to update
   * @param {Object} options - Additional options
   * @returns {Promise<any>} Response data
   */
  async put(path, data, options = {}) {
    const response = await this.request(path, { 
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
    
    return await response.json();
  }
  
  /**
   * Delete resource via API
   * @param {string} path - API path
   * @param {Object} options - Additional options
   * @returns {Promise<any>} Response data
   */
  async delete(path, options = {}) {
    const response = await this.request(path, { 
      ...options,
      method: 'DELETE' 
    });
    
    return await response.json();
  }
}

// Create a global instance
window.ApiManager = new ApiManager();

// Add convenient global function for getting current API URL
window.getApiUrl = function() {
  return window.ApiManager.getApiUrl();
};

// Start by trying to find a working API endpoint
setTimeout(async () => {
  try {
    const url = await window.ApiManager.findWorkingEndpoint();
    console.log(`Initial API connection check: ${url || 'No working endpoint found'}`);
  } catch (error) {
    console.error('Failed to check API connections', error);
  }
}, 1000);

// Export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiManager;
}
