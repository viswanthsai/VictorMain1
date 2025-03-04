/**
 * Production configuration file for connecting to the deployed backend API
 */

(function() {
  // Your Render URL with correct HTTPS protocol
  const RENDER_URL = 'https://victormain1.onrender.com'; // Remove any extra "-1"
  
  // Initialize API config
  window.API_CONFIG = {
    API_URL: RENDER_URL
  };
  
  console.log('Production API_CONFIG loaded');
})();