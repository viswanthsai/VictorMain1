/**
 * Authentication Guard for Victor
 * Protects pages that require user login by redirecting to the login page
 * 
 * Usage: Add <script src="js/auth-guard.js" data-require-auth="true"></script> to any page that requires authentication
 */

(function() {
  document.addEventListener('DOMContentLoaded', function() {
    // Get the script tag
    const scriptTag = document.currentScript || (function() {
      const scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();
    
    // Check if auth protection is required
    const requireAuth = scriptTag?.getAttribute('data-require-auth') === 'true';
    
    if (requireAuth) {
      checkAuthentication();
    }
  });
  
  /**
   * Check if user is authenticated
   * If not, redirect to login page
   */
  function checkAuthentication() {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    
    if (!token || !userId) {
      // User is not authenticated, redirect to login
      const currentPage = encodeURIComponent(window.location.href);
      window.location.replace(`login.html?redirect=${currentPage}&message=Please log in to access this page`);
    } else {
      // User is authenticated, continue
      console.log('User authenticated, continuing...');
      
      // Validate token with server if needed
      validateToken(token).catch(error => {
        console.error('Token validation failed:', error);
        // If token is invalid, clear authentication and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        
        const currentPage = encodeURIComponent(window.location.href);
        window.location.replace(`login.html?redirect=${currentPage}&message=Your session has expired. Please log in again`);
      });
    }
  }
  
  /**
   * Validate the user's token with the server
   * @param {string} token - The user's authentication token 
   * @returns {Promise} Promise resolving if the token is valid
   */
  async function validateToken(token) {
    const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
    
    const response = await fetch(`${API_URL}/api/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Invalid token');
    }
    
    return await response.json();
  }
})();

