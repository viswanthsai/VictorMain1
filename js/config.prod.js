/**
 * Production configuration file for connecting to the deployed backend API
 */

(function() {
  // Your Render URL with correct HTTPS protocol
  const RENDER_URL = 'https://victormain1.onrender.com'; // Remove any extra "-1"
  
  // Initialize API config
  window.API_CONFIG = {
    API_URL: RENDER_URL,
    
    // Method to check connection
    refreshConnection: async function() {
      try {
        const response = await fetch(`${RENDER_URL}/api/status`);
        return response.ok;
      } catch (error) {
        console.error('Error connecting to API:', error);
        return false;
      }
    }
  };
  
  console.log('Production config loaded, using API at:', window.API_CONFIG.API_URL);
})();