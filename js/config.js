/**
 * Configuration file for connecting to the backend API
 */

(function() {
  // Array of possible API URLs to try (for development/production)
  const API_URLS = [
    'http://localhost:9000',    // Primary port
    'http://localhost:3000',    // Alternative port
    'http://localhost:8080',    // Another alternative
    'http://127.0.0.1:5502',    // Added working endpoint
    window.location.origin      // Same origin as frontend (for production)
  ];

  // Add a fallback mock API option
  const USE_MOCK_API = true; // Set to true when real API is unavailable

  // Add mock API implementations for chat functionality
  function getMockChats() {
    return [
        {
            id: "mock-chat-1",
            recipient: {
                id: "user-123",
                name: "Jane Smith",
                avatar: "JS"
            },
            task: {
                id: "task-456",
                title: "Website Development Project"
            },
            lastMessage: {
                text: "I can help with your project",
                timestamp: new Date().toISOString(),
                isRead: true
            },
            unreadCount: 0
        },
        {
            id: "mock-chat-2",
            recipient: {
                id: "user-789",
                name: "Mike Johnson",
                avatar: "MJ"
            },
            task: {
                id: "task-101",
                title: "Graphic Design for Logo"
            },
            lastMessage: {
                text: "When can we discuss the design details?",
                timestamp: new Date().toISOString(),
                isRead: false
            },
            unreadCount: 2
        }
    ];
  }

  // Initialize API config
  window.API_CONFIG = {
    API_URL: window.location.hostname === 'victormain1.onrender.com' || 
            window.location.hostname === 'victormain1-1.onrender.com'
      ? 'https://victormain1.onrender.com'  // Production URL
      : 'http://localhost:9000',  // Development URL
    
    // Try to connect to each API URL until one works
    refreshConnection: async function() {
      let connected = false;
      
      for (const url of API_URLS) {
        try {
          console.log(`Trying to connect to API at: ${url}`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          
          const response = await fetch(`${url}/api/status`, {
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            console.log(`Connected successfully to: ${url}`);
            localStorage.setItem('api_url', url);
            window.API_CONFIG.API_URL = url;
            connected = true;
            
            // Dispatch success event
            window.dispatchEvent(new CustomEvent('apiConnectionSuccess', {
              detail: { apiUrl: url }
            }));
            
            break;
          }
        } catch (error) {
          console.warn(`Connection failed to: ${url}`, error);
        }
      }
      
      if (!connected) {
        console.error('Failed to connect to API on all URLs');
        // Dispatch failure event
        window.dispatchEvent(new Event('apiConnectionFailed'));
      }
      
      return connected;
    },
    
    // API version
    API_VERSION: 'v1',
    
    // App version
    APP_VERSION: '1.0.0',
    
    // Environment (development, production)
    ENV: 'development',
    
    // Feature flags
    FEATURES: {
      // Enable realtime notifications
      NOTIFICATIONS: true,
      
      // Enable payment processing
      PAYMENTS: false,
      
      // Enable chat functionality
      CHAT: false
    }
  };
  
  // Attempt to establish connection on page load
  document.addEventListener('DOMContentLoaded', function() {
    window.API_CONFIG.refreshConnection();
  });
  
  console.log('API_CONFIG loaded:', window.API_CONFIG.API_URL);
})();

// Modify the fetchAPI function to use mock data when needed
async function fetchAPI(endpoint, options = {}) {
  if (USE_MOCK_API) {
    console.log(`Using mock data for: ${endpoint}`);
    
    // Mock different API endpoints
    if (endpoint.includes('/api/chats')) {
      return getMockChats();
    }
    if (endpoint.includes('/api/status')) {
      return { status: "online", version: "1.0.0-mock" };
    }
    if (endpoint.includes('/api/notifications')) {
      return { notifications: [] };
    }
    
    // Default mock response
    return { success: true, message: "Mock API response" };
  }
  
  // Original API fetch code
  // ...existing code...
}

// Use production config if on GitHub Pages
if (window.location.hostname.includes('github.io')) {
  document.write('<script src="js/config.prod.js"><\/script>');
}
