/**
 * Network Checker
 * Checks network connectivity and API availability
 */

// Run API check immediately before page fully loads
(function() {
  console.log('Network checker initialized');
  
  // Check for a stored API URL
  const storedApiUrl = localStorage.getItem('apiUrl');
  if (storedApiUrl) {
    console.log('Found stored API URL:', storedApiUrl);
  }
  
  // List of API endpoints to try
  const apiUrls = [
    storedApiUrl,
    'http://localhost:9000',
    'http://127.0.0.1:9000',
    'https://victormain1.onrender.com'
  ].filter(Boolean);
  
  // Check each endpoint in sequence
  checkApiEndpoints(apiUrls)
    .then(workingUrl => {
      if (workingUrl) {
        console.log(`Network checker found working API at ${workingUrl}`);
        localStorage.setItem('apiUrl', workingUrl);
        // Also set a global variable
        window.WORKING_API_URL = workingUrl;
      } else {
        console.warn('Network checker could not find a working API');
      }
    })
    .catch(error => {
      console.error('Error in network check:', error);
    });
    
  // Function to check API endpoints
  async function checkApiEndpoints(urls) {
    for (const url of urls) {
      try {
        console.log(`Testing API at ${url}`);
        
        // Use status endpoint for quick check
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased timeout
        
        const response = await fetch(`${url}/api/status`, {
          signal: controller.signal,
          mode: 'cors',
          cache: 'no-store',
          headers: { 
            'Accept': 'application/json'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          // Store the API URL to localStorage
          localStorage.setItem('apiUrl', url);
          console.log(`Successfully connected to API at ${url}`);
          
          // Try to check MongoDB status on this API
          try {
            const dbResponse = await fetch(`${url}/api/db-test`, {
              cache: 'no-store',
              headers: { 'Accept': 'application/json' }
            });
            
            if (dbResponse.ok) {
              const dbData = await dbResponse.json();
              console.log(`MongoDB status: ${dbData.status}, readyState: ${dbData.readyState}`);
            }
          } catch (dbError) {
            console.warn('Error checking MongoDB status:', dbError);
          }
          
          return url;
        } else {
          console.warn(`API at ${url} responded with status ${response.status}`);
        }
      } catch (error) {
        console.warn(`Failed to connect to API at ${url}:`, error.message);
      }
    }
    
    // No working API URL found
    return null;
  }
})();

// Provide a global function to get the API URL
window.getApiUrl = function() {
  return window.WORKING_API_URL || 
         localStorage.getItem('apiUrl') || 
         'http://localhost:9000';
};
