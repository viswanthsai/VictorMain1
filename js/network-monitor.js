/**
 * Network Monitor
 * Detects network issues and helps with recovery
 */

class NetworkMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = [];
    this.connectionType = this.getConnectionType();
    this.lastCheckTime = 0;
    this.checkInterval = 30000; // 30 seconds
    
    // Set up event listeners for online/offline events
    window.addEventListener('online', this.handleOnlineStatus.bind(this));
    window.addEventListener('offline', this.handleOnlineStatus.bind(this));
    
    // Set up periodic connection checking
    setInterval(this.checkConnection.bind(this), this.checkInterval);
  }
  
  /**
   * Get current connection type (if available)
   * @returns {string} Connection type
   */
  getConnectionType() {
    if (navigator.connection) {
      return navigator.connection.effectiveType || 'unknown';
    }
    return navigator.onLine ? 'online' : 'offline';
  }
  
  /**
   * Handle online/offline status changes
   */
  handleOnlineStatus() {
    const wasOnline = this.isOnline;
    this.isOnline = navigator.onLine;
    this.connectionType = this.getConnectionType();
    
    if (wasOnline !== this.isOnline) {
      console.log(`Network status changed: ${this.isOnline ? 'online' : 'offline'}`);
      
      // Notify listeners
      this.notifyListeners({
        isOnline: this.isOnline,
        connectionType: this.connectionType,
        timestamp: new Date()
      });
      
      // If we're back online, try to test API connections
      if (this.isOnline && window.ApiManager) {
        window.ApiManager.findWorkingEndpoint()
          .then(url => {
            console.log(`Network restored. Working API endpoint: ${url || 'none found'}`);
          })
          .catch(error => {
            console.warn('Failed to find working API endpoint:', error);
          });
      }
      
      // Show notification to user
      this.showNetworkNotification(this.isOnline);
    }
  }
  
  /**
   * Actively check connection by making a network request
   */
  async checkConnection() {
    // Don't check too often
    const now = Date.now();
    if (now - this.lastCheckTime < this.checkInterval) {
      return;
    }
    
    this.lastCheckTime = now;
    const wasOnline = this.isOnline;
    
    try {
      // Make a lightweight request to test connection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      await fetch('https://www.google.com/favicon.ico', {
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      this.isOnline = true;
    } catch (error) {
      console.warn('Active connection check failed:', error.message);
      this.isOnline = false;
    }
    
    // Update connection type
    this.connectionType = this.getConnectionType();
    
    // If status changed, notify listeners
    if (wasOnline !== this.isOnline) {
      console.log(`Network status changed (active check): ${this.isOnline ? 'online' : 'offline'}`);
      
      // Notify listeners
      this.notifyListeners({
        isOnline: this.isOnline,
        connectionType: this.connectionType,
        timestamp: new Date(),
        source: 'activeCheck'
      });
      
      // Show notification to user
      this.showNetworkNotification(this.isOnline);
    }
  }
  
  /**
   * Test API connection and find working endpoint
   */
  async testApiConnection() {
    if (!this.isOnline) {
      return null;
    }
    
    if (window.ApiManager) {
      return window.ApiManager.findWorkingEndpoint();
    }
    
    if (window.TaskUtils && window.TaskUtils.testApiConnection) {
      return window.TaskUtils.testApiConnection();
    }
    
    // Fallback implementation
    const urls = [
      localStorage.getItem('apiUrl'),
      window.API_CONFIG ? window.API_CONFIG.API_URL : null,
      window.API_CONFIG ? window.API_CONFIG.BACKUP_API_URL : null,
      'http://localhost:9000',
      'https://victormain1.onrender.com'
    ].filter(Boolean);
    
    for (const url of urls) {
      try {
        console.log(`Testing API connection to: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${url}/api/status`, {
          signal: controller.signal,
          cache: 'no-cache'
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log(`API connection successful to: ${url}`);
          localStorage.setItem('apiUrl', url);
          return url;
        }
      } catch (error) {
        console.warn(`Failed to connect to API at ${url}:`, error.message);
      }
    }
    
    return null;
  }
  
  /**
   * Add a listener for network status changes
   * @param {Function} listener - Callback function to call when network status changes
   */
  addListener(listener) {
    if (typeof listener === 'function' && !this.listeners.includes(listener)) {
      this.listeners.push(listener);
    }
  }
  
  /**
   * Remove a network status listener
   * @param {Function} listener - Listener to remove
   */
  removeListener(listener) {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  /**
   * Notify all listeners of a network status change
   * @param {Object} status - Network status object
   */
  notifyListeners(status) {
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }
  
  /**
   * Show network status notification to user
   * @param {boolean} isOnline - Whether network is online
   */
  showNetworkNotification(isOnline) {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('network-notification');
    
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'network-notification';
      notification.className = 'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-xs p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-y-full opacity-0';
      
      // Add close button
      notification.innerHTML = `
        <div class="flex justify-between items-center">
          <div class="flex items-center">
            <i class="fas mr-3"></i>
            <span id="network-notification-message"></span>
          </div>
          <button class="ml-4 text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.classList.add('translate-y-full', 'opacity-0');">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
      
      document.body.appendChild(notification);
    }
    
    // Update notification content and style based on status
    const icon = notification.querySelector('i.fas');
    const message = notification.querySelector('#network-notification-message');
    
    if (isOnline) {
      notification.className = 'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-xs p-4 rounded-lg shadow-lg transition-all duration-300 bg-green-50 text-green-700';
      icon.className = 'fas fa-wifi mr-3';
      message.textContent = 'You are back online';
    } else {
      notification.className = 'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-xs p-4 rounded-lg shadow-lg transition-all duration-300 bg-red-50 text-red-700';
      icon.className = 'fas fa-exclamation-triangle mr-3';
      message.textContent = 'You are offline. Some features may not work.';
    }
    
    // Show notification
    setTimeout(() => {
      notification.classList.remove('translate-y-full', 'opacity-0');
    }, 100);
    
    // Hide notification after 5 seconds
    setTimeout(() => {
      notification.classList.add('translate-y-full', 'opacity-0');
    }, 5000);
  }
}

// Initialize network monitor when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Don't create multiple instances
  if (!window.NetworkMonitor) {
    window.NetworkMonitor = new NetworkMonitor();
    console.log('Network monitor initialized');
  }
});
