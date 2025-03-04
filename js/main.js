/**
 * Victor - Main JavaScript
 * Contains shared functionality used across the platform
 */

// Global object to hold shared functionality
const Victor = {
  // API Configuration
  api: {
    // Get the current API URL
    getBaseUrl() {
      return window.API_CONFIG 
        ? window.API_CONFIG.API_URL 
        : localStorage.getItem('api_url') || 'http://localhost:9000';
    },
    
    // Make an API request with authentication
    async request(endpoint, options = {}) {
      const baseUrl = this.getBaseUrl();
      const url = `${baseUrl}${endpoint}`;
      
      // Setup default headers
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };
      
      // Add authentication token if available
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Configure request
      const config = {
        ...options,
        headers,
      };
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      config.signal = controller.signal;
      
      try {
        const response = await fetch(url, config);
        clearTimeout(timeoutId);
        
        // Handle responses
        if (response.ok) {
          // For DELETE requests or when no content is expected
          if (response.status === 204 || config.method === 'DELETE') {
            return { success: true };
          }
          
          // For other successful responses, parse the JSON
          return await response.json();
        }
        
        // Handle error responses
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `Request failed with status ${response.status}`,
          response.status,
          errorData
        );
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new ApiError('Request timed out', 408);
        }
        
        // Re-throw API errors
        if (error instanceof ApiError) {
          throw error;
        }
        
        // Convert other errors to API errors
        throw new ApiError(error.message || 'Network error', 0);
      }
    },
    
    // Convenience methods for different HTTP verbs
    async get(endpoint, options = {}) {
      return this.request(endpoint, { ...options, method: 'GET' });
    },
    
    async post(endpoint, data, options = {}) {
      return this.request(endpoint, {
        ...options,
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    
    async put(endpoint, data, options = {}) {
      return this.request(endpoint, {
        ...options,
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    
    async delete(endpoint, options = {}) {
      return this.request(endpoint, {
        ...options,
        method: 'DELETE'
      });
    }
  },
  
  // Authentication
  auth: {
    // Check if user is logged in
    isLoggedIn() {
      return localStorage.getItem('token') !== null;
    },
    
    // Get current user info
    getCurrentUser() {
      return {
        userId: localStorage.getItem('userId'),
        username: localStorage.getItem('username')
      };
    },
    
    // Update UI based on login status
    updateUI() {
      const isLoggedIn = this.isLoggedIn();
      const loginMenuItem = document.getElementById('login-menu-item');
      const signupMenuItem = document.getElementById('signup-menu-item');
      const userMenuItem = document.getElementById('user-menu-item');
      
      if (!loginMenuItem || !signupMenuItem || !userMenuItem) {
        return; // Skip if elements don't exist
      }
      
      if (isLoggedIn) {
        loginMenuItem.classList.add('hidden');
        signupMenuItem.classList.add('hidden');
        userMenuItem.classList.remove('hidden');
        
        // Set username
        const username = localStorage.getItem('username') || 'User';
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay) {
          usernameDisplay.textContent = username;
        }
        
        // Setup user menu dropdown
        const userMenuButton = document.getElementById('user-menu-button');
        const userDropdown = document.getElementById('user-dropdown');
        
        if (userMenuButton && userDropdown) {
          userMenuButton.addEventListener('click', function() {
            userDropdown.classList.toggle('hidden');
          });
          
          // Close dropdown when clicking outside
          document.addEventListener('click', function(event) {
            if (!userMenuButton.contains(event.target) && !userDropdown.contains(event.target)) {
              userDropdown.classList.add('hidden');
            }
          });
        }
        
        // Setup logout button
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
          logoutButton.addEventListener('click', this.logout.bind(this));
        }
      } else {
        loginMenuItem.classList.remove('hidden');
        signupMenuItem.classList.remove('hidden');
        userMenuItem.classList.add('hidden');
      }
    },
    
    // Login user
    async login(email, password) {
      try {
        const result = await Victor.api.post('/api/login', { email, password });
        
        // Store auth data
        localStorage.setItem('token', result.token);
        localStorage.setItem('userId', result.userId);
        localStorage.setItem('username', result.username);
        
        return result;
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },
    
    // Register user
    async signup(userData) {
      try {
        const result = await Victor.api.post('/api/signup', userData);
        
        // Store auth data
        localStorage.setItem('token', result.token);
        localStorage.setItem('userId', result.userId);
        localStorage.setItem('username', result.username);
        
        return result;
      } catch (error) {
        console.error('Signup error:', error);
        throw error;
      }
    },
    
    // Logout user
    logout(e) {
      if (e) e.preventDefault();
      
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      
      // Update UI immediately before redirect
      if (window.updateUserDisplay) {
        window.updateUserDisplay();
      }
      
      // Redirect to home page or login page
      window.location.href = 'index.html';
    },
    
    // Check if token is valid
    async validateToken() {
      if (!this.isLoggedIn()) return false;
      
      try {
        await Victor.api.get('/api/users/me');
        return true;
      } catch (error) {
        // If unauthorized, clear token
        if (error.status === 401 || error.status === 403) {
          this.logout();
        }
        return false;
      }
    }
  },
  
  // Task management
  tasks: {
    // Format date in a readable way
    formatDate(dateString, relative = false) {
      if (!dateString) return 'N/A';
      
      const date = new Date(dateString);
      const now = new Date();
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      
      if (relative) {
        // Relative format
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return date.toLocaleDateString();
      } else {
        // Full format
        return date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    },
    
    // Get status badge classes for task status
    getStatusClasses(status) {
      switch (status) {
        case 'Open':
          return {
            bg: 'bg-green-50',
            text: 'text-green-600',
            icon: 'fa-door-open'
          };
        case 'In Progress':
          return {
            bg: 'bg-yellow-50',
            text: 'text-yellow-600',
            icon: 'fa-spinner'
          };
        case 'Completed':
          return {
            bg: 'bg-gray-50',
            text: 'text-gray-600',
            icon: 'fa-check-circle'
          };
        default:
          return {
            bg: 'bg-gray-50',
            text: 'text-gray-600',
            icon: 'fa-question-circle'
          };
      }
    },
    
    // Get all tasks
    async getAllTasks() {
      return await Victor.api.get('/api/tasks');
    },
    
    // Get task by ID
    async getTask(id) {
      return await Victor.api.get(`/api/tasks/${id}`);
    },
    
    // Get user tasks
    async getUserTasks() {
      return await Victor.api.get('/api/my-tasks');
    },
    
    // Create task
    async createTask(taskData) {
      return await Victor.api.post('/api/tasks', taskData);
    },
    
    // Update task
    async updateTask(id, taskData) {
      return await Victor.api.put(`/api/tasks/${id}`, taskData);
    },
    
    // Delete task
    async deleteTask(id) {
      return await Victor.api.delete(`/api/tasks/${id}`);
    },
    
    // Accept task
    async acceptTask(id) {
      return await Victor.api.post(`/api/tasks/${id}/accept`, {});
    },
    
    // Complete task
    async completeTask(id) {
      return await Victor.api.post(`/api/tasks/${id}/complete`, {});
    }
  },
  
  // UI utilities
  ui: {
    // Show notification
    showNotification(message, type = 'info', duration = 5000) {
      // Use the standalone notification module if available
      if (window.showNotification) {
        return window.showNotification(message, type, duration);
      }
      
      // Create notification container if it doesn't exist
      let notificationContainer = document.getElementById('notification-container');
      
      if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.className = 'fixed bottom-4 right-4 z-50 flex flex-col items-end';
        document.body.appendChild(notificationContainer);
      }
      
      // Create notification element
      const notification = document.createElement('div');
      notification.className = 'mb-3 p-4 rounded-lg shadow-lg flex items-center max-w-xs animate-fade-in';
      
      // Set style based on type
      switch (type) {
        case 'success':
          notification.classList.add('bg-green-50', 'text-green-800', 'border', 'border-green-200');
          break;
        case 'error':
          notification.classList.add('bg-red-50', 'text-red-800', 'border', 'border-red-200');
          break;
        case 'warning':
          notification.classList.add('bg-yellow-50', 'text-yellow-800', 'border', 'border-yellow-200');
          break;
        default: // info
          notification.classList.add('bg-blue-50', 'text-blue-800', 'border', 'border-blue-200');
      }
      
      // Set icon based on type
      const icon = 
        type === 'success' ? 'fas fa-check-circle text-green-500' :
        type === 'error' ? 'fas fa-exclamation-circle text-red-500' :
        type === 'warning' ? 'fas fa-exclamation-triangle text-yellow-500' :
        'fas fa-info-circle text-blue-500';
      
      // Build notification content
      notification.innerHTML = `
        <i class="${icon} mr-2 text-lg"></i>
        <div class="flex-1">${message}</div>
        <button class="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none">
          <i class="fas fa-times"></i>
        </button>
      `;
      
      // Add to container
      notificationContainer.appendChild(notification);
      
      // Add close button functionality
      notification.querySelector('button').addEventListener('click', () => {
        this.closeNotification(notification);
      });
      
      // Auto-close after duration
      if (duration > 0) {
        setTimeout(() => {
          this.closeNotification(notification);
        }, duration);
      }
      
      return notification;
    },
    
    // Close notification with animation
    closeNotification(notification) {
      notification.classList.add('opacity-0', 'transition-opacity', 'duration-300');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }
};

// API Error class
class ApiError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Update UI based on authentication status
  Victor.auth.updateUI();
  
  // Add fade-in animation styles
  if (!document.getElementById('victor-animations')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'victor-animations';
    styleElement.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .animate-fade-in {
        animation: fadeIn 0.3s ease-in-out forwards;
      }
    `;
    document.head.appendChild(styleElement);
  }

  // Apply location filter if present in URL
  const locationParam = urlParams.get('location');
  if (locationParam) {
    const locationFilter = document.getElementById('location-filter');
    if (locationFilter) {
      locationFilter.value = locationParam;
    }
  }

  // Setup location chips
  document.querySelectorAll('.location-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      const location = this.getAttribute('data-location');
      const locationFilter = document.getElementById('location-filter');
      if (locationFilter) {
        locationFilter.value = location;
        // Trigger the change event to apply the filter
        locationFilter.dispatchEvent(new Event('change'));
      }
    });
  });
});

// Make Victor globally available
window.Victor = Victor;