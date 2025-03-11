const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    default: 'Other'
  },
  location: {
    type: String,
    default: 'Remote'
  },
  specificLocation: {
    type: String,
    default: null
  },
  contactDetails: {
    phone: {
      type: String,
      default: null
    },
    email: {
      type: String,
      default: null
    },
    preferredMethod: {
      type: String,
      default: 'platform',
      enum: ['phone', 'email', 'platform']
    }
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Open'
  },
  budget: {
    type: Number,
    default: null
  },
  deadline: {
    type: Date,
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: String,
    required: true
  },
  acceptedById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  acceptedBy: {
    type: String,
    default: null
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  urgent: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const TaskModel = mongoose.model('Task', taskSchema);

module.exports = TaskModel;

/**
 * Task Model
 * Handles operations related to tasks including data normalization
 */

class Task {
  /**
   * Create a new Task instance
   * @param {Object} taskData - The raw task data from API
   */
  constructor(taskData = {}) {
    // Required fields
    this.id = taskData.id || taskData._id || null;
    this.title = taskData.title || 'Untitled Task';
    this.description = taskData.description || '';
    this.status = taskData.status || 'Open';
    
    // User-related fields
    this.userId = taskData.userId || taskData.createdBy || null;
    this.createdBy = taskData.createdBy || taskData.userId || null;
    this.performerId = taskData.performerId || null;
    
    // Dates
    this.createdAt = taskData.createdAt || new Date().toISOString();
    this.updatedAt = taskData.updatedAt || taskData.createdAt || new Date().toISOString();
    this.deadline = taskData.deadline || null;
    this.completedAt = taskData.completedAt || null;
    
    // Task details
    this.category = taskData.category || 'Miscellaneous';
    this.location = taskData.location || 'Remote';
    this.specificLocation = taskData.specificLocation || null;
    this.budget = taskData.budget || null;
    this.urgent = taskData.urgent || false;
    
    // Contact details
    this.contactDetails = taskData.contactDetails || {
      phone: null,
      email: null,
      preferredMethod: 'platform'
    };
    
    // Statistics
    this.viewCount = taskData.viewCount || 0;
    this.offersCount = taskData.offersCount || 0;
    this.savedCount = taskData.savedCount || 0;
  }
  
  /**
   * Format task data for display
   * @returns {Object} Formatted task data
   */
  format() {
    return {
      ...this,
      formattedCreatedAt: this.formatDate(this.createdAt, true),
      formattedDeadline: this.formatDate(this.deadline),
      formattedBudget: this.formatBudget(),
      statusClass: this.getStatusClass(),
      isCompleted: this.status === 'Completed',
      isInProgress: this.status === 'In Progress',
      isOpen: this.status === 'Open',
      isCancelled: this.status === 'Cancelled',
      hasDeadline: !!this.deadline,
      daysLeft: this.getDaysLeft()
    };
  }
  
  /**
   * Format date for display
   * @param {string} dateString - ISO date string
   * @param {boolean} relative - Whether to show relative time
   * @returns {string} Formatted date string
   */
  formatDate(dateString, relative = false) {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      if (relative) {
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        
        if (diffMinutes < 5) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
      }
      
      return date.toLocaleDateString();
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Unknown date';
    }
  }
  
  /**
   * Format budget for display
   * @returns {string} Formatted budget
   */
  formatBudget() {
    if (!this.budget && this.budget !== 0) return 'Negotiable';
    return `₹${parseInt(this.budget).toLocaleString()}`;
  }
  
  /**
   * Get CSS classes for task status
   * @returns {Object} CSS classes
   */
  getStatusClass() {
    const statusMap = {
      'Open': { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', icon: 'fa-door-open' },
      'In Progress': { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200', icon: 'fa-spinner' },
      'Completed': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', icon: 'fa-check-circle' },
      'Cancelled': { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', icon: 'fa-ban' }
    };
    
    return statusMap[this.status] || statusMap['Open'];
  }
  
  /**
   * Get days left until deadline
   * @returns {number|null} Days left or null if no deadline
   */
  getDaysLeft() {
    if (!this.deadline) return null;
    
    const now = new Date();
    const deadline = new Date(this.deadline);
    
    // Reset time part for accurate day calculation
    now.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }
  
  /**
   * Save task to local storage cache for offline access
   * @returns {Task} Current task instance for chaining
   */
  saveToCache() {
    try {
      const taskCache = JSON.parse(localStorage.getItem('taskCache') || '{}');
      taskCache[this.id] = this;
      localStorage.setItem('taskCache', JSON.stringify(taskCache));
      
      // Also update the lastViewed list
      const lastViewed = JSON.parse(localStorage.getItem('lastViewedTasks') || '[]');
      const index = lastViewed.findIndex(id => id === this.id);
      
      if (index !== -1) {
        lastViewed.splice(index, 1);
      }
      
      lastViewed.unshift(this.id);
      
      // Keep only the last 10 tasks
      while (lastViewed.length > 10) {
        lastViewed.pop();
      }
      
      localStorage.setItem('lastViewedTasks', JSON.stringify(lastViewed));
    } catch (error) {
      console.error('Error saving task to cache:', error);
    }
    
    return this;
  }
  
  /**
   * Create a Task instance from raw data
   * @param {Object} taskData - Raw task data
   * @returns {Task} Task instance
   */
  static fromJson(taskData) {
    return new Task(taskData);
  }
  
  /**
   * Create multiple Task instances from raw data array
   * @param {Array} tasksData - Array of raw task data
   * @returns {Array<Task>} Array of Task instances
   */
  static fromJsonArray(tasksData) {
    if (!Array.isArray(tasksData)) return [];
    return tasksData.map(taskData => Task.fromJson(taskData));
  }
  
  /**
   * Get a task from cache by ID
   * @param {string} taskId - Task ID to get
   * @returns {Task|null} Task instance or null if not in cache
   */
  static getFromCache(taskId) {
    try {
      const taskCache = JSON.parse(localStorage.getItem('taskCache') || '{}');
      const taskData = taskCache[taskId];
      
      if (taskData) {
        console.log('Found task in cache:', taskId);
        return new Task(taskData);
      }
    } catch (error) {
      console.error('Error getting task from cache:', error);
    }
    
    return null;
  }
  
  /**
   * Fetch a task from API by ID with robust error handling
   * @param {string} taskId - Task ID to fetch
   * @returns {Promise<Task>} Task instance
   */
  static async fetchById(taskId) {
    // Try multiple API endpoints to ensure the task loads
    const apiUrls = [
      localStorage.getItem('apiUrl'),
      window.API_CONFIG?.API_URL,
      window.API_CONFIG?.BACKUP_API_URL,
      'http://localhost:9000',
      'http://127.0.0.1:9000',
      'https://victormain1.onrender.com',
      // Add IP address if available
      window.location.hostname !== 'localhost' ? `${window.location.protocol}//${window.location.hostname}:9000` : null
    ].filter(Boolean);
    
    let lastError = null;
    
    // Try each endpoint until one works
    for (const url of apiUrls) {
      try {
        console.log(`Trying to fetch task ${taskId} from ${url}`);
        
        // Set up timeout to avoid hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(`${url}/api/tasks/${taskId}`, {
          headers: {
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.warn(`API response not OK from ${url}: ${response.status}`);
          throw new Error(`HTTP error: ${response.status}`);
        }
        
        const taskData = await response.json();
        
        // Store successful API URL for future use
        localStorage.setItem('apiUrl', url);
        console.log(`Successfully loaded task from ${url}`);
        
        return new Task(taskData);
      } catch (error) {
        console.warn(`Failed to fetch task from ${url}:`, error.message);
        lastError = error;
        // Continue to next URL
      }
    }
    
    // If all endpoints failed, throw the last error
    console.error('All API endpoints failed when fetching task');
    throw lastError || new Error('Failed to fetch task from any API endpoint');
  }

  /**
   * Fetch all tasks with robust error handling
   * @returns {Promise<Task[]>} Array of Task instances
   */
  static async fetchAll() {
    // Try multiple API endpoints to ensure tasks load
    const apiUrls = [
      localStorage.getItem('apiUrl'),
      window.API_CONFIG?.API_URL,
      window.API_CONFIG?.BACKUP_API_URL,
      'http://localhost:9000',
      'http://127.0.0.1:9000',
      'https://victormain1.onrender.com',
      // Add IP address if available
      window.location.hostname !== 'localhost' ? `${window.location.protocol}//${window.location.hostname}:9000` : null
    ].filter(Boolean);
    
    let lastError = null;
    
    // Try each endpoint until one works
    for (const url of apiUrls) {
      try {
        console.log(`Trying to fetch all tasks from ${url}`);
        
        // Set up timeout to avoid hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${url}/api/tasks`, {
          headers: {
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.warn(`API response not OK from ${url}: ${response.status}`);
          throw new Error(`HTTP error: ${response.status}`);
        }
        
        const tasksData = await response.json();
        
        // Store successful API URL for future use
        localStorage.setItem('apiUrl', url);
        console.log(`Successfully loaded ${tasksData.length} tasks from ${url}`);
        
        return tasksData.map(taskData => new Task(taskData));
      } catch (error) {
        console.warn(`Failed to fetch tasks from ${url}:`, error.message);
        lastError = error;
        // Continue to next URL
      }
    }
    
    // If all endpoints failed, throw the last error
    console.error('All API endpoints failed when fetching tasks');
    throw lastError || new Error('Failed to fetch tasks from any API endpoint');
  }
  
  /**
   * Clear the task cache
   */
  static clearCache() {
    localStorage.removeItem('taskCache');
    localStorage.removeItem('lastViewedTasks');
  }
  
  /**
   * Fetch similar tasks based on category
   * @param {string} category - Category to match
   * @param {string} excludeId - Task ID to exclude
   * @param {number} limit - Maximum number of tasks to return
   * @returns {Promise<Array<Task>>} Array of similar tasks
   */
  static async fetchSimilar(category, excludeId, limit = 3) {
    try {
      const apiUrl = localStorage.getItem('apiUrl') || 
                     (window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000');
      
      const response = await fetch(`${apiUrl}/api/tasks?category=${encodeURIComponent(category)}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const tasksData = await response.json();
      
      // Filter out the excluded task
      const filteredTasks = tasksData.filter(task => 
        (task.id !== excludeId && task._id !== excludeId)
      );
      
      return Task.fromJsonArray(filteredTasks);
    } catch (error) {
      console.error('Error fetching similar tasks:', error);
      
      // If ErrorHandler exists, try with it
      if (window.ErrorHandler) {
        try {
          const response = await ErrorHandler.tryDifferentApiUrls(
            `api/tasks?category=${encodeURIComponent(category)}&limit=${limit}`
          );
          
          const tasksData = await response.json();
          
          // Filter out the excluded task
          const filteredTasks = tasksData.filter(task => 
            (task.id !== excludeId && task._id !== excludeId)
          );
          
          return Task.fromJsonArray(filteredTasks);
        } catch (handlerError) {
          console.error('ErrorHandler also failed:', handlerError);
          return [];
        }
      }
      
      return [];
    }
  }
}

// Make Task available globally in browser environments
if (typeof window !== 'undefined') {
  window.Task = Task;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Task;
}
