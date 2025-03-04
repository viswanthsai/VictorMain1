/**
 * Database Connection Test
 * Tests connection to MongoDB database
 */

document.addEventListener('DOMContentLoaded', async function() {
  const resultContainer = document.getElementById('db-test-result');
  const statusText = document.getElementById('db-status');
  const messageText = document.getElementById('db-message');
  const detailsElement = document.getElementById('db-details');
  const retryButton = document.getElementById('retry-button');
  
  // Make function available globally for other scripts
  window.testDatabaseConnection = testDatabaseConnection;
  
  // Show loading state
  function showLoading() {
    statusText.textContent = 'Checking connection...';
    statusText.className = 'text-blue-500';
    messageText.textContent = '';
    if (detailsElement) {
      detailsElement.textContent = '';
      detailsElement.classList.add('hidden');
    }
    resultContainer.className = 'p-6 bg-blue-50 border border-blue-200 rounded-lg animate-pulse';
  }
  
  // Test database connection
  async function testDatabaseConnection() {
    showLoading();
    
    try {
      // Get API URL from config or localStorage
      const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 
                     localStorage.getItem('api_url') || 'http://localhost:9000';
      
      console.log(`Testing database connection to ${API_URL}/api/db-test`);
      
      // Add cache-busting query parameter to avoid cached responses
      const cacheBuster = `?nocache=${Date.now()}`;
      
      // Fetch with timeout to avoid long waiting periods
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${API_URL}/api/db-test${cacheBuster}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Log the complete response for debugging
      console.log('DB Test Response:', response);
      console.log('DB Test Status:', response.status);
      console.log('DB Test Headers:', [...response.headers.entries()]);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Try to show the HTML response for debugging
        const textResponse = await response.text();
        console.error('Non-JSON response received:', textResponse.substring(0, 500));
        throw new Error(`Expected JSON response but got ${contentType || 'unknown content type'}`);
      }
      
      const data = await response.json();
      
      if (response.ok) {
        // Connection successful
        statusText.textContent = 'Connected';
        statusText.className = 'text-green-600 font-bold';
        messageText.textContent = data.message || 'MongoDB connection successful';
        resultContainer.className = 'p-6 bg-green-50 border border-green-200 rounded-lg';
        
        // Show MongoDB details if available
        if (data.details && detailsElement) {
          detailsElement.textContent = JSON.stringify(data.details, null, 2);
          detailsElement.classList.remove('hidden');
        }
      } else {
        // Connection failed but server responded
        statusText.textContent = 'Not Connected';
        statusText.className = 'text-red-600 font-bold';
        messageText.textContent = data.message || 'Database connection failed';
        resultContainer.className = 'p-6 bg-red-50 border border-red-200 rounded-lg';
        
        if (detailsElement && data.readyState !== undefined) {
          const readyStateMap = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting',
            99: 'uninitialized'
          };
          
          detailsElement.textContent = `MongoDB ReadyState: ${data.readyState} (${readyStateMap[data.readyState] || 'unknown'})`;
          detailsElement.classList.remove('hidden');
        }
      }
    } catch (error) {
      // Network or other error
      console.error("Database connection test error:", error);
      
      statusText.textContent = 'Error';
      statusText.className = 'text-red-600 font-bold';
      
      if (error.name === 'AbortError') {
        messageText.textContent = 'Connection timed out. Server may be down or unreachable.';
      } else if (error.message.includes('Unexpected token')) {
        messageText.textContent = 'Received invalid response format. Endpoint may be misconfigured.';
      } else {
        messageText.textContent = `Failed to connect: ${error.message}`;
      }
      
      resultContainer.className = 'p-6 bg-red-50 border border-red-200 rounded-lg';
    }
  }
  
  // Add retry button event listener
  if (retryButton) {
    retryButton.addEventListener('click', testDatabaseConnection);
  }
  
  // Run test on page load
  testDatabaseConnection();
});