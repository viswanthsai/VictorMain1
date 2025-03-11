/**
 * Configuration settings for Victor application
 * Contains environment variables and global settings
 */

window.API_CONFIG = {
  // Use window.location.hostname to dynamically determine API URL
  // This ensures the application works on any device on the same network
  API_URL: detectApiUrl(),
  
  // Add a backup API URL in case the main one fails
  BACKUP_API_URL: 'https://victormain1.onrender.com',
  
  // Version information
  VERSION: '1.0.0',
  
  // Debug mode - set to true to enable additional logging
  DEBUG: true
};

/**
 * Detect the most appropriate API URL based on the current environment
 * @returns {string} The detected API URL
 */
function detectApiUrl() {
  // First check if there's a stored API URL from a previous successful connection
  const storedApiUrl = localStorage.getItem('apiUrl');
  if (storedApiUrl) {
    console.log('Using stored API URL:', storedApiUrl);
    return storedApiUrl;
  }
  
  // Check if we're on a local network or public site
  const hostname = window.location.hostname;
  
  // Production environments
  if (hostname === 'victortasks.site' || hostname === 'www.victortasks.site') {
    return 'https://victormain1.onrender.com';
  }
  
  // Render.com environments
  if (hostname === 'victormain1.onrender.com' || hostname.endsWith('.onrender.com')) {
    return 'https://victormain1.onrender.com';
  }
  
  // For mobile devices, use the host's IP instead of localhost
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    // For mobile devices on the same network, use the current hostname
    console.log('Mobile device detected, using current hostname');
    return `${window.location.protocol}//${window.location.hostname}:9000`;
  }
  
  // For computers in the same network as the server
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    // Check if this is a LAN IP address
    const isLanIp = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1]))/.test(hostname);
    if (isLanIp) {
      console.log('LAN environment detected');
      return `${window.location.protocol}//${window.location.hostname}:9000`;
    }
  }
  
  // Default case for desktop local development
  console.log('Using default localhost API URL');
  return 'http://localhost:9000';
}

/**
 * Get API URL with fallback mechanism
 * @returns {string} The API URL to use
 */
window.getApiUrl = function() {
  // Check for stored API URL first (from successful previous connections)
  const storedApiUrl = localStorage.getItem('apiUrl');
  if (storedApiUrl) {
    return storedApiUrl;
  }
  
  return window.API_CONFIG.API_URL;
};

/**
 * Handle API URL detection and refreshing
 */
window.refreshApiConnection = async function() {
  const possibleUrls = [
    window.API_CONFIG.API_URL,
    window.API_CONFIG.BACKUP_API_URL,
    'http://localhost:9000',
    'http://127.0.0.1:9000',
    'https://victormain1.onrender.com',
    // Try current hostname with different ports
    `${window.location.protocol}//${window.location.hostname}:9000`,
    `${window.location.protocol}//${window.location.hostname}:3000`
  ].filter(Boolean);
  
  // Remove duplicates
  const uniqueUrls = [...new Set(possibleUrls)];
  
  // Try each URL
  for (const url of uniqueUrls) {
    try {
      console.log(`Testing API connection to: ${url}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${url}/api/status`, { 
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`Found working API at: ${url}`);
        localStorage.setItem('apiUrl', url);
        window.API_CONFIG.API_URL = url;
        return url;
      }
    } catch (error) {
      console.warn(`Failed to connect to ${url}:`, error.message);
    }
  }
  
  console.error('No working API endpoint found');
  return null;
};

// When config loads, check for a working connection in the background
console.log('Config loaded, initiating API connection check');
setTimeout(() => {
  window.refreshApiConnection().then(url => {
    if (url) {
      console.log('Successfully connected to API at:', url);
    } else {
      console.warn('Unable to find working API connection');
    }
  }).catch(err => {
    console.error('Error during API connection check:', err);
  });
}, 500);
