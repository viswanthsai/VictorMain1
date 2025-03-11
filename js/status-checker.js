/**
 * Status Checker
 * Monitors and displays the status of server components
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('Status checker initialized');
  
  // Initialize status checks
  checkAllStatuses();
  
  // Setup refresh button
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
      checkAllStatuses();
    });
  }
});

/**
 * Check all service statuses
 */
async function checkAllStatuses() {
  // Update last checked time
  updateLastCheckedTime();
  
  // Set initial loading states
  setComponentCheckingState('api');
  setComponentCheckingState('mongodb');
  setComponentCheckingState('network');
  
  // Get client info immediately
  updateClientInfo();
  
  // Check API status
  const apiStatus = await checkApiStatus();
  updateApiStatus(apiStatus);
  
  // Check MongoDB status separately
  const mongoStatus = await checkMongoDBStatus();
  updateMongoDBStatus(mongoStatus);
  
  // Check network status
  const networkStatus = await checkNetworkStatus();
  updateNetworkStatus(networkStatus);
  
  // Update overall status
  updateOverallStatus(apiStatus.ok, mongoStatus.ok, networkStatus.ok);
  
  // Update troubleshooting section
  updateTroubleshooting(apiStatus.ok, mongoStatus.ok, networkStatus.ok);
}

/**
 * Set component to checking state
 */
function setComponentCheckingState(component) {
  const statusEl = document.getElementById(`${component}-status`);
  if (statusEl) {
    statusEl.innerHTML = `
      <div class="animate-pulse h-3 w-3 rounded-full bg-gray-300 mr-2"></div>
      <span class="text-gray-500">Checking...</span>
    `;
  }
}

/**
 * Update last checked time
 */
function updateLastCheckedTime() {
  const lastCheckedEl = document.getElementById('last-checked');
  if (lastCheckedEl) {
    const now = new Date();
    lastCheckedEl.textContent = now.toLocaleTimeString();
  }
}

/**
 * Check API status
 */
async function checkApiStatus() {
  try {
    const startTime = performance.now();
    
    // Get API URL with fallback
    let apiUrl = window.getApiUrl ? window.getApiUrl() : 'http://localhost:9000';
    
    // Try multiple API endpoints if needed
    const apiEndpoints = [
      apiUrl,
      'http://localhost:9000',
      'http://127.0.0.1:9000',
      'https://victormain1.onrender.com'
    ].filter(Boolean);
    
    let latency = 0;
    let responseCode = 0;
    let responseOk = false;
    let activeUrl = '';
    
    // Try each endpoint
    for (const url of apiEndpoints) {
      try {
        console.log(`Checking API status at ${url}/api/status`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(`${url}/api/status`, {
          signal: controller.signal,
          cache: 'no-store'
        });
        
        clearTimeout(timeoutId);
        
        const endTime = performance.now();
        latency = Math.round(endTime - startTime);
        responseCode = response.status;
        responseOk = response.ok;
        activeUrl = url;
        
        if (responseOk) {
          // Try to get JSON status data
          const data = await response.json();
          
          // Store for later use
          localStorage.setItem('apiUrl', url);
          
          console.log('API status data:', data);
          
          // Return successful result
          return {
            ok: true,
            url: activeUrl,
            latency,
            responseCode,
            data
          };
        }
      } catch (error) {
        console.warn(`API check failed for ${url}:`, error);
      }
    }
    
    // If we get here, all endpoints failed
    return {
      ok: false,
      url: activeUrl || apiEndpoints[0],
      latency,
      responseCode,
      error: 'Failed to connect to API'
    };
  } catch (error) {
    console.error('API status check failed:', error);
    return {
      ok: false,
      error: error.message,
      latency: 0,
      responseCode: 0
    };
  }
}

/**
 * Check MongoDB status
 */
async function checkMongoDBStatus() {
  try {
    // Start timer
    const startTime = performance.now();
    
    // Get API URL with fallback
    let apiUrl = window.getApiUrl ? window.getApiUrl() : 'http://localhost:9000';
    
    // Try multiple API endpoints if needed
    const apiEndpoints = [
      apiUrl,
      'http://localhost:9000',
      'http://127.0.0.1:9000',
      'https://victormain1.onrender.com'
    ].filter(Boolean);
    
    let responseTime = 0;
    let mongoState = 0;
    let connection = 'disconnected';
    let mongoOk = false;
    let errorMessage = '';
    
    // Try each endpoint
    for (const url of apiEndpoints) {
      try {
        console.log(`Checking MongoDB status at ${url}/api/db-test`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(`${url}/api/db-test`, {
          signal: controller.signal,
          cache: 'no-store'
        });
        
        clearTimeout(timeoutId);
        
        const endTime = performance.now();
        responseTime = Math.round(endTime - startTime);
        
        if (response.ok) {
          // Get detailed status
          const data = await response.json();
          console.log('MongoDB status data:', data);
          
          mongoOk = data.status === 'connected';
          mongoState = data.readyState || 0;
          connection = data.status || 'unknown';
          
          // Return success result
          return {
            ok: mongoOk,
            connection,
            state: mongoState,
            responseTime,
            data
          };
        } else {
          // Try to get error message
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || `HTTP error: ${response.status}`;
          } catch (e) {
            errorMessage = `HTTP error: ${response.status}`;
          }
        }
      } catch (error) {
        console.warn(`MongoDB check failed for ${url}:`, error);
        errorMessage = error.message;
      }
    }
    
    // If we get here, all endpoints failed
    return {
      ok: false,
      connection: 'disconnected',
      state: 0,
      responseTime,
      error: errorMessage || 'Failed to check MongoDB status'
    };
  } catch (error) {
    console.error('MongoDB status check failed:', error);
    return {
      ok: false,
      connection: 'error',
      state: 0,
      responseTime: 0,
      error: error.message
    };
  }
}

/**
 * Check network status
 */
async function checkNetworkStatus() {
  try {
    const startTime = performance.now();
    
    // Check if navigator.onLine is available
    const isOnline = navigator.onLine;
    
    // Try to fetch Google favicon as connectivity test
    let pingTime = 0;
    let pingOk = false;
    let connectionType = 'unknown';
    
    try {
      if (navigator.connection) {
        connectionType = navigator.connection.effectiveType || 'unknown';
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://www.google.com/favicon.ico', {
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const endTime = performance.now();
      pingTime = Math.round(endTime - startTime);
      pingOk = true;
    } catch (error) {
      console.warn('Network ping test failed:', error);
      pingOk = false;
    }
    
    return {
      ok: isOnline && pingOk,
      isOnline,
      pingOk,
      pingTime,
      connectionType
    };
  } catch (error) {
    console.error('Network status check failed:', error);
    return {
      ok: false,
      isOnline: false,
      pingOk: false,
      pingTime: 0,
      connectionType: 'error',
      error: error.message
    };
  }
}

/**
 * Update API status in UI
 */
function updateApiStatus(status) {
  const statusEl = document.getElementById('api-status');
  const endpointEl = document.getElementById('api-endpoint');
  const latencyEl = document.getElementById('api-latency');
  const responseCodeEl = document.getElementById('api-response-code');
  
  if (status.ok) {
    // API is online
    if (statusEl) {
      statusEl.innerHTML = `
        <div class="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
        <span class="text-green-600">Online</span>
      `;
    }
    
    if (endpointEl) endpointEl.textContent = status.url;
    if (latencyEl) latencyEl.textContent = `${status.latency} ms`;
    if (responseCodeEl) responseCodeEl.textContent = status.responseCode;
  } else {
    // API is offline
    if (statusEl) {
      statusEl.innerHTML = `
        <div class="h-3 w-3 rounded-full bg-red-500 mr-2"></div>
        <span class="text-red-600">Offline</span>
      `;
    }
    
    if (endpointEl) endpointEl.textContent = status.url || 'Unknown';
    if (latencyEl) latencyEl.textContent = status.latency ? `${status.latency} ms` : 'Timeout';
    if (responseCodeEl) responseCodeEl.textContent = status.responseCode || 'No response';
    
    const apiCard = document.getElementById('api-card');
    if (apiCard) {
      apiCard.classList.add('border', 'border-red-300');
    }
  }
}

/**
 * Update MongoDB status in UI
 */
function updateMongoDBStatus(status) {
  const statusEl = document.getElementById('mongodb-status');
  const connectionEl = document.getElementById('mongodb-connection');
  const stateEl = document.getElementById('mongodb-state');
  const responseTimeEl = document.getElementById('mongodb-response-time');
  const errorEl = document.getElementById('mongodb-error');
  
  if (status.ok) {
    // MongoDB is connected
    if (statusEl) {
      statusEl.innerHTML = `
        <div class="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
        <span class="text-green-600">Connected</span>
      `;
    }
    
    if (connectionEl) connectionEl.textContent = status.connection;
    if (stateEl) stateEl.textContent = getMongoStateText(status.state);
    if (responseTimeEl) responseTimeEl.textContent = `${status.responseTime} ms`;
    
    if (errorEl) errorEl.classList.add('hidden');
    
    const mongoCard = document.getElementById('mongodb-card');
    if (mongoCard) {
      mongoCard.classList.remove('border', 'border-red-300');
    }
  } else {
    // MongoDB is disconnected
    if (statusEl) {
      statusEl.innerHTML = `
        <div class="h-3 w-3 rounded-full bg-red-500 mr-2"></div>
        <span class="text-red-600">Disconnected</span>
      `;
    }
    
    if (connectionEl) connectionEl.textContent = status.connection;
    if (stateEl) stateEl.textContent = getMongoStateText(status.state);
    if (responseTimeEl) responseTimeEl.textContent = status.responseTime ? `${status.responseTime} ms` : '-';
    
    if (errorEl && status.error) {
      errorEl.textContent = status.error;
      errorEl.classList.remove('hidden');
    }
    
    const mongoCard = document.getElementById('mongodb-card');
    if (mongoCard) {
      mongoCard.classList.add('border', 'border-red-300');
    }
  }
}

/**
 * Get MongoDB state as text
 */
function getMongoStateText(state) {
  switch (state) {
    case 0:
      return 'Disconnected';
    case 1:
      return 'Connected';
    case 2:
      return 'Connecting';
    case 3:
      return 'Disconnecting';
    default:
      return 'Unknown';
  }
}

/**
 * Update network status in UI
 */
function updateNetworkStatus(status) {
  const statusEl = document.getElementById('network-status');
  const connectivityEl = document.getElementById('network-connectivity');
  const typeEl = document.getElementById('network-type');
  const pingEl = document.getElementById('network-ping');
  
  if (status.ok) {
    // Network is online
    if (statusEl) {
      statusEl.innerHTML = `
        <div class="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
        <span class="text-green-600">Online</span>
      `;
    }
    
    if (connectivityEl) connectivityEl.textContent = 'Connected';
    if (typeEl) typeEl.textContent = status.connectionType.toUpperCase();
    if (pingEl) pingEl.textContent = `${status.pingTime} ms`;
  } else {
    // Network has issues
    if (statusEl) {
      statusEl.innerHTML = `
        <div class="h-3 w-3 rounded-full bg-red-500 mr-2"></div>
        <span class="text-red-600">Issues Detected</span>
      `;
    }
    
    if (connectivityEl) connectivityEl.textContent = status.isOnline ? 'Limited' : 'Disconnected';
    if (typeEl) typeEl.textContent = status.connectionType.toUpperCase();
    if (pingEl) pingEl.textContent = status.pingOk ? `${status.pingTime} ms` : 'Failed';
    
    const networkCard = document.getElementById('network-card');
    if (networkCard) {
      networkCard.classList.add('border', 'border-red-300');
    }
  }
}

/**
 * Update client info in UI
 */
function updateClientInfo() {
  const browserEl = document.getElementById('client-browser');
  const agentEl = document.getElementById('client-agent');
  const platformEl = document.getElementById('client-platform');
  
  if (browserEl) browserEl.textContent = getBrowserName();
  if (agentEl) agentEl.textContent = navigator.userAgent.substring(0, 50) + (navigator.userAgent.length > 50 ? '...' : '');
  if (platformEl) platformEl.textContent = navigator.platform;
}

/**
 * Get browser name
 */
function getBrowserName() {
  const userAgent = navigator.userAgent;
  let browserName;
  
  if (userAgent.match(/chrome|chromium|crios/i)) {
    browserName = "Chrome";
  } else if (userAgent.match(/firefox|fxios/i)) {
    browserName = "Firefox";
  } else if (userAgent.match(/safari/i)) {
    browserName = "Safari";
  } else if (userAgent.match(/opr\//i)) {
    browserName = "Opera";
  } else if (userAgent.match(/edg/i)) {
    browserName = "Edge";
  } else if (userAgent.match(/msie|trident/i)) {
    browserName = "Internet Explorer";
  } else {
    browserName = "Unknown";
  }
  
  return browserName;
}

/**
 * Update overall system status
 */
function updateOverallStatus(apiOk, mongoOk, networkOk) {
  const statusIconEl = document.getElementById('overall-status-icon');
  const statusTextEl = document.getElementById('overall-status-text');
  const statusMessageEl = document.getElementById('overall-status-message');
  
  if (apiOk && networkOk) {
    // All essential services are up
    if (statusIconEl) {
      statusIconEl.className = 'h-12 w-12 rounded-full flex items-center justify-center mr-4 bg-green-100';
      statusIconEl.innerHTML = '<i class="fas fa-check text-green-500 text-xl"></i>';
    }
    
    if (statusTextEl) {
      statusTextEl.textContent = mongoOk ? 
        'All Systems Operational' : 
        'System Operational with Minor Issues';
    }
    
    if (statusMessageEl) {
      statusMessageEl.textContent = mongoOk ? 
        'All systems are working normally.' : 
        'Core services are running. MongoDB has connectivity issues but the system is using local fallbacks.';
    }
  } else {
    // There are issues with essential services
    if (statusIconEl) {
      statusIconEl.className = 'h-12 w-12 rounded-full flex items-center justify-center mr-4 bg-red-100';
      statusIconEl.innerHTML = '<i class="fas fa-exclamation-triangle text-red-500 text-xl"></i>';
    }
    
    if (statusTextEl) {
      statusTextEl.textContent = 'System Experiencing Issues';
    }
    
    if (statusMessageEl) {
      const issues = [];
      if (!networkOk) issues.push('network connectivity');
      if (!apiOk) issues.push('API server');
      if (!mongoOk) issues.push('database');
      
      statusMessageEl.textContent = `There are issues with your ${issues.join(', ')}. Check the troubleshooting section for help.`;
    }
  }
}

/**
 * Update troubleshooting section
 */
function updateTroubleshooting(apiOk, mongoOk, networkOk) {
  const networkTroubleshoot = document.getElementById('network-troubleshoot');
  const apiTroubleshoot = document.getElementById('api-troubleshoot');
  const mongodbTroubleshoot = document.getElementById('mongodb-troubleshoot');
  const allOk = document.getElementById('all-ok');
  
  // Hide all sections first
  networkTroubleshoot?.classList.add('hidden');
  apiTroubleshoot?.classList.add('hidden');
  mongodbTroubleshoot?.classList.add('hidden');
  allOk?.classList.add('hidden');
  
  // Show relevant sections based on status
  if (!networkOk) {
    networkTroubleshoot?.classList.remove('hidden');
  }
  
  if (!apiOk) {
    apiTroubleshoot?.classList.remove('hidden');
  }
  
  if (!mongoOk) {
    mongodbTroubleshoot?.classList.remove('hidden');
  }
  
  // If everything is ok, show that section
  if (apiOk && mongoOk && networkOk) {
    allOk?.classList.remove('hidden');
  }
}
