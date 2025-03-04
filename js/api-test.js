/**
 * API Connection Test
 * Tests connection to backend API server
 */

document.addEventListener('DOMContentLoaded', async function() {
  const resultContainer = document.getElementById('api-test-result');
  const statusText = document.getElementById('api-status');
  const messageText = document.getElementById('api-message');
  const retryButton = document.getElementById('api-retry-button');
  
  // Show loading state
  function showLoading() {
    statusText.textContent = 'Checking connection...';
    statusText.className = 'text-blue-500';
    messageText.textContent = '';
    resultContainer.className = 'p-6 bg-blue-50 border border-blue-200 rounded-lg animate-pulse';
  }
  
  // Test API connection
  async function testApiConnection() {
    showLoading();
    
    try {
      const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
      
      const response = await fetch(`${API_URL}/api/status`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Connection successful
        statusText.textContent = 'Connected';
        statusText.className = 'text-green-600 font-bold';
        messageText.textContent = data.message || 'API server is running';
        resultContainer.className = 'p-6 bg-green-50 border border-green-200 rounded-lg';
        
        // Show timestamp if available
        if (data.timestamp) {
          const date = new Date(data.timestamp);
          messageText.textContent += ` (as of ${date.toLocaleString()})`;
        }
      } else {
        // Connection failed with error response
        statusText.textContent = 'Not Connected';
        statusText.className = 'text-red-600 font-bold';
        messageText.textContent = data.message || 'API server connection failed';
        resultContainer.className = 'p-6 bg-red-50 border border-red-200 rounded-lg';
      }
    } catch (error) {
      // Network or other error
      statusText.textContent = 'Error';
      statusText.className = 'text-red-600 font-bold';
      messageText.textContent = `Failed to connect: ${error.message}`;
      resultContainer.className = 'p-6 bg-red-50 border border-red-200 rounded-lg';
    }
  }
  
  // Add retry button event listener
  if (retryButton) {
    retryButton.addEventListener('click', testApiConnection);
  }
  
  // Run test on page load
  testApiConnection();
  
  // Make function available globally
  window.testApiConnection = testApiConnection;
});