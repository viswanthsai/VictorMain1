/**
 * Task Utility Functions
 * Helper functions for task-related operations
 */

const TaskUtils = {
  // Format date helper function for consistent display across devices
  formatDate: function(dateString, relative = false) {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return 'Invalid date';
      }
      
      // For relative dates (e.g. "2 days ago")
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
        
        // More than a week ago, use absolute date
        return date.toLocaleDateString();
      }
      
      // For absolute dates
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return date.toLocaleDateString(undefined, options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date error';
    }
  },
  
  // Get CSS classes for different task statuses
  getStatusClasses: function(status) {
    const statusMap = {
      'Open': { bg: 'bg-green-50', text: 'text-green-600' },
      'In Progress': { bg: 'bg-yellow-50', text: 'text-yellow-600' },
      'Completed': { bg: 'bg-blue-50', text: 'text-blue-600' },
      'Cancelled': { bg: 'bg-gray-50', text: 'text-gray-600' }
    };
    
    return statusMap[status] || { bg: 'bg-gray-50', text: 'text-gray-600' };
  },
  
  // Strip HTML tags from text for safety
  stripHtml: function(html) {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  },
  
  // Format currency amount
  formatCurrency: function(amount) {
    if (!amount && amount !== 0) return 'Negotiable';
    return `₹${parseFloat(amount).toLocaleString()}`;
  },
  
  // Create safe and consistent task URL
  getTaskUrl: function(taskId) {
    if (!taskId) return '#';
    return `task-detail.html?id=${encodeURIComponent(taskId)}`;
  },
  
  // Test API connection and return working URL
  testApiConnection: async function() {
    const urls = [
      window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000',
      window.API_CONFIG ? window.API_CONFIG.BACKUP_API_URL : null,
      // Add more fallbacks if needed
    ].filter(Boolean);
    
    for (const url of urls) {
      try {
        console.log(`Testing API connection to: ${url}`);
        const response = await fetch(`${url}/api/status`, { 
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          mode: 'cors',
          cache: 'no-cache',
          timeout: 5000
        });
        
        if (response.ok) {
          console.log(`API connection successful to: ${url}`);
          return url;
        }
      } catch (error) {
        console.warn(`Failed to connect to API at ${url}:`, error.message);
      }
    }
    
    // If all failed, return the first URL as default
    return urls[0];
  },

  /**
   * Load tasks with error handling and retries
   * @param {Object} options - Options for loading tasks
   * @returns {Promise<Array>} Array of tasks
   */
  loadTasks: async function({
    category = null,
    status = null,
    search = null,
    userId = null,
    endpoint = 'tasks',
    maxRetries = 2,
    showErrorCallback = null,
    useMockData = false // Changed default to false to prevent mock data usage
  } = {}) {
    let attempts = 0;
    let lastError = null;
    
    // First try to get tasks from API
    while (attempts <= maxRetries) {
      try {
        attempts++;
        console.log(`Loading tasks attempt ${attempts}/${maxRetries + 1}`);
        
        // Build query string
        const queryParams = new URLSearchParams();
        if (category) queryParams.append('category', category);
        if (status) queryParams.append('status', status);
        if (search) queryParams.append('search', search);
        if (userId) queryParams.append('userId', userId);
        
        // Get API URL with priority
        let apiUrls = [];
        
        if (window.ApiManager && typeof ApiManager.getApiUrl === 'function') {
          apiUrls.push(ApiManager.getApiUrl());
        }
        
        // Add stored URL if not already included
        const storedUrl = localStorage.getItem('apiUrl');
        if (storedUrl && !apiUrls.includes(storedUrl)) {
          apiUrls.push(storedUrl);
        }
        
        // Add fallback URLs
        apiUrls = [...apiUrls, 
          'http://localhost:9000',
          'http://127.0.0.1:9000',
          'https://victormain1.onrender.com'
        ].filter(Boolean);
        
        // Try each URL until one works
        for (const url of apiUrls) {
          try {
            console.log(`Trying API at: ${url}/api/${endpoint}`);
            
            // Set up request with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased timeout
            
            const queryString = queryParams.toString();
            const requestUrl = `${url}/api/${endpoint}${queryString ? '?' + queryString : ''}`;
            
            const headers = {
              'Accept': 'application/json'
            };
            
            // Add auth token if available
            const token = localStorage.getItem('token');
            if (token) {
              headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(requestUrl, {
              headers,
              signal: controller.signal,
              cache: 'no-store'
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.message || `Server error`);
            }
            
            // Parse JSON response
            const tasks = await response.json();
            
            // If successful, store the working URL
            localStorage.setItem('apiUrl', url);
            console.log(`Successfully loaded ${tasks.length} tasks from ${url}`);
            
            // Return the tasks array
            return tasks;
          } catch (error) {
            console.warn(`Failed to load tasks from ${url}:`, error.message);
            lastError = error;
            // Continue to next URL
          }
        }
        
        // If we get here, all URLs failed in this attempt
        throw lastError || new Error('Failed to connect to any API endpoint');
      } catch (error) {
        lastError = error;
        console.error(`Error loading tasks (attempt ${attempts}/${maxRetries + 1}):`, error);
        
        // If we've used all retries, throw the error
        if (attempts > maxRetries) {
          if (showErrorCallback && typeof showErrorCallback === 'function') {
            showErrorCallback(error.message);
          }
          
          // Before giving up completely, try to load local mock data ONLY if explicitly allowed
          if (useMockData) {
            console.log('Trying to load mock task data...');
            
            // First try to load from local file
            const localTasks = await TaskUtils.checkLocalTasksFile();
            if (localTasks && localTasks.length > 0) {
              console.log('Using local tasks file with', localTasks.length, 'tasks');
              return localTasks;
            }
            
            // If that fails, use hardcoded mock data
            console.log('Using hardcoded mock task data');
            return TaskUtils.getMockTasks();
          }
          
          throw error;
        }
        
        // Wait before retrying - exponential backoff
        const retryDelay = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
        console.log(`Waiting ${retryDelay}ms before retrying...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    // If we get here, all attempts failed
    throw lastError || new Error('Failed to load tasks after all retry attempts');
  },

  /**
   * Check if the tasks.json file exists and is accessible
   * This is a fallback when API fails
   */
  checkLocalTasksFile: async function() {
    try {
      const response = await fetch('data/tasks.json', { 
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        console.log('Local tasks.json file found');
        return await response.json();
      }
      return null;
    } catch (error) {
      console.warn('Could not load local tasks file:', error);
      return null;
    }
  },

  /**
   * Get mock task data as a fallback
   * @returns {Array} Mock task data
   */
  getMockTasks: function() {
    return [
      {
        id: 1,
        title: "Need help with moving furniture",
        description: "I need someone to help me move furniture from my apartment to a new place about 2 miles away. The items include a sofa, bed, table, and a few boxes.",
        category: "Moving",
        location: "Bangalore",
        budget: 1500,
        status: "Open",
        userId: "mock1",
        createdBy: "Rahul Kumar",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        title: "Need a tutor for Mathematics",
        description: "Looking for a tutor to help with 10th grade mathematics, particularly algebra and geometry. Sessions would be twice a week, 1.5 hours each.",
        category: "Tutoring",
        location: "Remote",
        budget: 1000,
        status: "Open",
        userId: "mock2",
        createdBy: "Priya Singh",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        title: "Website development for small business",
        description: "Need a simple website for my bakery business. Requirements: homepage, product gallery, about us, and contact page with a form. Should be mobile responsive.",
        category: "Web Development",
        location: "Remote",
        budget: 8000,
        status: "Open",
        userId: "mock3",
        createdBy: "Amit Patel",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        urgent: true
      }
    ];
  },

  /**
   * Create HTML for a task card
   * @param {Object} task - Task object
   * @returns {HTMLElement} Task card element
   */
  createTaskCard: function(task) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow-sm overflow-hidden task-card';
    card.setAttribute('data-task-id', task._id || task.id);
    
    // Format date
    const dateFormatted = TaskUtils.formatDate(task.createdAt, true);
    
    // Truncate description
    const description = task.description || '';
    const shortDescription = description.length > 150
      ? description.substring(0, 150) + '...'
      : description;
      
    // Format budget
    const budget = TaskUtils.formatCurrency(task.budget);
  
    // Urgent flag
    const urgentBadge = task.urgent ? 
      `<span class="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-2 py-1 m-2 rounded-md">URGENT</span>` : '';
    
    card.innerHTML = `
      <div class="p-5 relative">
        ${urgentBadge}
        <div class="flex justify-between items-start mb-3">
          <h3 class="font-semibold text-lg">
            <a href="task-detail.html?id=${task._id || task.id}" class="hover:text-primary transition-colors">
              ${task.title || 'Untitled Task'}
            </a>
          </h3>
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${TaskUtils.getStatusClass(task.status)}">
            <i class="fas fa-circle text-xs mr-1"></i>${task.status || 'Open'}
          </span>
        </div>
        
        <p class="text-gray-600 text-sm mb-4">${shortDescription}</p>
        
        <div class="flex items-center text-sm text-gray-500 mb-3">
          <i class="fas fa-tag mr-2 opacity-70"></i>
          <span>${task.category || 'Other'}</span>
        </div>
        
        <div class="flex items-center text-sm text-gray-500 mb-3">
          <i class="fas fa-map-marker-alt mr-2 opacity-70"></i>
          <span>${task.location || 'Remote'}</span>
        </div>
        
        <div class="flex items-center text-sm text-gray-500">
          <i class="fas fa-rupee-sign mr-2 opacity-70"></i>
          <span>${budget}</span>
        </div>
        
        <div class="border-t border-gray-100 mt-4 pt-4 flex justify-between items-center">
          <div class="text-xs text-gray-500">Posted ${dateFormatted}</div>
          <a href="task-detail.html?id=${task._id || task.id}" class="text-primary hover:underline text-sm">
            View Details
          </a>
        </div>
      </div>
    `;
    
    return card;
  }
};

/**
 * Helper functions for task management
 */

// Format date for display
function formatDate(dateString, includeTime = false) {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return date.toLocaleDateString('en-IN', options);
}

// Calculate days left for deadline
function getDaysLeft(deadlineString) {
  if (!deadlineString) return null;
  
  const deadline = new Date(deadlineString);
  const now = new Date();
  
  // Reset hours to compare only dates
  deadline.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  
  // Calculate difference in days
  const diffTime = deadline - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

// Get human-readable time remaining text
function getTimeRemainingText(deadlineString) {
  if (!deadlineString) return 'No deadline set';
  
  const daysLeft = getDaysLeft(deadlineString);
  
  if (daysLeft === null) return 'Invalid deadline';
  
  if (daysLeft < 0) {
    return `${Math.abs(daysLeft)} days overdue`;
  } else if (daysLeft === 0) {
    return 'Due today!';
  } else if (daysLeft === 1) {
    return '1 day left';
  } else {
    return `${daysLeft} days left`;
  }
}

// Get human-readable time elapsed text since date
function getTimeElapsedText(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now - date;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  
  if (diffDays > 30) {
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

// Mark a task as complete (for task performer)
async function markTaskAsComplete(taskId) {
  try {
    const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Make API request to mark task as complete
    const response = await fetch(`${API_URL}/api/tasks/${taskId}/request-completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to mark task as complete');
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error marking task as complete:', error);
    throw error;
  }
}

// Verify task completion (for task poster)
async function verifyTaskCompletion(taskId, isApproved) {
  try {
    const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Make API request to verify task completion
    const response = await fetch(`${API_URL}/api/tasks/${taskId}/verify-completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ approved: isApproved })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to verify task completion');
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error verifying task completion:', error);
    throw error;
  }
}

// Make TaskUtils available globally
window.TaskUtils = TaskUtils;

/**
 * Task Utilities
 * Common functions for working with tasks
 */

// Create TaskUtils global object if it doesn't exist
window.TaskUtils = window.TaskUtils || {};

/**
 * Format date in a user-friendly way
 * @param {string} dateString - ISO date string
 * @param {boolean} includeRelative - Whether to include relative time (e.g., "2 days ago")
 * @returns {string} Formatted date string
 */
TaskUtils.formatDate = function(dateString, includeRelative = false) {
  if (!dateString) return 'Recently';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    
    // Check for invalid date
    if (isNaN(date.getTime())) return 'Recently';
    
    // Calculate time difference
    const diffTime = now - date;
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // If less than 24 hours ago
    if (diffHours < 24) {
      if (diffMinutes < 5) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
      if (diffHours === 1) return '1 hour ago';
      return `${diffHours} hours ago`;
    }
    
    // If within past week
    if (diffDays < 7) {
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays} days ago`;
    }
    
    // If more than a week ago, show actual date
    const formatted = date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    return includeRelative ? `${formatted} (${diffDays} days ago)` : formatted;
  } catch (e) {
    console.error('Error formatting date:', e);
    return 'Recently';
  }
};

/**
 * Get appropriate CSS classes for task status
 * @param {string} status - Task status
 * @returns {string} CSS class string
 */
TaskUtils.getStatusClass = function(status) {
  switch (status) {
    case 'Open':
      return 'bg-green-50 text-green-600';
    case 'In Progress':
      return 'bg-yellow-50 text-yellow-600';
    case 'Completed':
      return 'bg-blue-50 text-blue-600';
    case 'Cancelled':
      return 'bg-gray-50 text-gray-500';
    default:
      return 'bg-green-50 text-green-600';
  }
};

/**
 * Format currency (primarily INR)
 * @param {number|string} amount - Amount to format
 * @returns {string} Formatted currency string
 */
TaskUtils.formatCurrency = function(amount) {
  if (amount === null || amount === undefined || amount === '') {
    return 'Negotiable';
  }
  
  try {
    const num = parseFloat(amount);
    return '₹' + num.toLocaleString('en-IN');
  } catch (e) {
    console.error('Error formatting currency:', e);
    return '₹' + amount;
  }
};

/**
 * Check if the tasks.json file exists and is accessible
 * This is a fallback when API fails
 */
TaskUtils.checkLocalTasksFile = async function() {
  try {
    const response = await fetch('data/tasks.json', { 
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.ok) {
      console.log('Local tasks.json file found');
      return await response.json();
    }
    return null;
  } catch (error) {
    console.warn('Could not load local tasks file:', error);
    return null;
  }
};

/**
 * Load tasks with error handling and retries
 * @param {Object} options - Options for loading tasks
 * @returns {Promise<Array>} Array of tasks
 */
TaskUtils.loadTasks = async function({
  category = null,
  status = null,
  search = null,
  userId = null,
  endpoint = 'tasks',
  maxRetries = 2,
  showErrorCallback = null,
  useMockData = false // Changed default to false to prevent mock data usage
} = {}) {
  let attempts = 0;
  let lastError = null;
  
  // First try to get tasks from API
  while (attempts <= maxRetries) {
    try {
      attempts++;
      console.log(`Loading tasks attempt ${attempts}/${maxRetries + 1}`);
      
      // Build query string
      const queryParams = new URLSearchParams();
      if (category) queryParams.append('category', category);
      if (status) queryParams.append('status', status);
      if (search) queryParams.append('search', search);
      if (userId) queryParams.append('userId', userId);
      
      // Get API URL with priority
      let apiUrls = [];
      
      if (window.ApiManager && typeof ApiManager.getApiUrl === 'function') {
        apiUrls.push(ApiManager.getApiUrl());
      }
      
      // Add stored URL if not already included
      const storedUrl = localStorage.getItem('apiUrl');
      if (storedUrl && !apiUrls.includes(storedUrl)) {
        apiUrls.push(storedUrl);
      }
      
      // Add fallback URLs
      apiUrls = [...apiUrls, 
        'http://localhost:9000',
        'http://127.0.0.1:9000',
        'https://victormain1.onrender.com'
      ].filter(Boolean);
      
      // Try each URL until one works
      for (const url of apiUrls) {
        try {
          console.log(`Trying API at: ${url}/api/${endpoint}`);
          
          // Set up request with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased timeout
          
          const queryString = queryParams.toString();
          const requestUrl = `${url}/api/${endpoint}${queryString ? '?' + queryString : ''}`;
          
          const headers = {
            'Accept': 'application/json'
          };
          
          // Add auth token if available
          const token = localStorage.getItem('token');
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const response = await fetch(requestUrl, {
            headers,
            signal: controller.signal,
            cache: 'no-store'
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Server error`);
          }
          
          // Parse JSON response
          const tasks = await response.json();
          
          // If successful, store the working URL
          localStorage.setItem('apiUrl', url);
          console.log(`Successfully loaded ${tasks.length} tasks from ${url}`);
          
          // Return the tasks array
          return tasks;
        } catch (error) {
          console.warn(`Failed to load tasks from ${url}:`, error.message);
          lastError = error;
          // Continue to next URL
        }
      }
      
      // If we get here, all URLs failed in this attempt
      throw lastError || new Error('Failed to connect to any API endpoint');
    } catch (error) {
      lastError = error;
      console.error(`Error loading tasks (attempt ${attempts}/${maxRetries + 1}):`, error);
      
      // If we've used all retries, throw the error
      if (attempts > maxRetries) {
        if (showErrorCallback && typeof showErrorCallback === 'function') {
          showErrorCallback(error.message);
        }
        
        // Before giving up completely, try to load local mock data ONLY if explicitly allowed
        if (useMockData) {
          console.log('Trying to load mock task data...');
          
          // First try to load from local file
          const localTasks = await TaskUtils.checkLocalTasksFile();
          if (localTasks && localTasks.length > 0) {
            console.log('Using local tasks file with', localTasks.length, 'tasks');
            return localTasks;
          }
          
          // If that fails, use hardcoded mock data
          console.log('Using hardcoded mock task data');
          return TaskUtils.getMockTasks();
        }
        
        throw error;
      }
      
      // Wait before retrying - exponential backoff
      const retryDelay = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
      console.log(`Waiting ${retryDelay}ms before retrying...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  // If we get here, all attempts failed
  throw lastError || new Error('Failed to load tasks after all retry attempts');
};

/**
 * Get mock task data as a fallback
 * @returns {Array} Mock task data
 */
TaskUtils.getMockTasks = function() {
  return [
    {
      id: 1,
      title: "Need help with moving furniture",
      description: "I need someone to help me move furniture from my apartment to a new place about 2 miles away. The items include a sofa, bed, table, and a few boxes.",
      category: "Moving",
      location: "Bangalore",
      budget: 1500,
      status: "Open",
      userId: "mock1",
      createdBy: "Rahul Kumar",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 2,
      title: "Need a tutor for Mathematics",
      description: "Looking for a tutor to help with 10th grade mathematics, particularly algebra and geometry. Sessions would be twice a week, 1.5 hours each.",
      category: "Tutoring",
      location: "Remote",
      budget: 1000,
      status: "Open",
      userId: "mock2",
      createdBy: "Priya Singh",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 3,
      title: "Website development for small business",
      description: "Need a simple website for my bakery business. Requirements: homepage, product gallery, about us, and contact page with a form. Should be mobile responsive.",
      category: "Web Development",
      location: "Remote",
      budget: 8000,
      status: "Open",
      userId: "mock3",
      createdBy: "Amit Patel",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      urgent: true
    }
  ];
};

/**
 * Create HTML for a task card
 * @param {Object} task - Task object
 * @returns {HTMLElement} Task card element
 */
TaskUtils.createTaskCard = function(task) {
  const card = document.createElement('div');
  card.className = 'bg-white rounded-lg shadow-sm overflow-hidden task-card';
  card.setAttribute('data-task-id', task._id || task.id);
  
  // Format date
  const dateFormatted = TaskUtils.formatDate(task.createdAt, true);
  
  // Truncate description
  const description = task.description || '';
  const shortDescription = description.length > 150
    ? description.substring(0, 150) + '...'
    : description;
    
  // Format budget
  const budget = TaskUtils.formatCurrency(task.budget);

  // Urgent flag
  const urgentBadge = task.urgent ? 
    `<span class="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-2 py-1 m-2 rounded-md">URGENT</span>` : '';
  
  card.innerHTML = `
    <div class="p-5 relative">
      ${urgentBadge}
      <div class="flex justify-between items-start mb-3">
        <h3 class="font-semibold text-lg">
          <a href="task-detail.html?id=${task._id || task.id}" class="hover:text-primary transition-colors">
            ${task.title || 'Untitled Task'}
          </a>
        </h3>
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${TaskUtils.getStatusClass(task.status)}">
          <i class="fas fa-circle text-xs mr-1"></i>${task.status || 'Open'}
        </span>
      </div>
      
      <p class="text-gray-600 text-sm mb-4">${shortDescription}</p>
      
      <div class="flex items-center text-sm text-gray-500 mb-3">
        <i class="fas fa-tag mr-2 opacity-70"></i>
        <span>${task.category || 'Other'}</span>
      </div>
      
      <div class="flex items-center text-sm text-gray-500 mb-3">
        <i class="fas fa-map-marker-alt mr-2 opacity-70"></i>
        <span>${task.location || 'Remote'}</span>
      </div>
      
      <div class="flex items-center text-sm text-gray-500">
        <i class="fas fa-rupee-sign mr-2 opacity-70"></i>
        <span>${budget}</span>
      </div>
      
      <div class="border-t border-gray-100 mt-4 pt-4 flex justify-between items-center">
        <div class="text-xs text-gray-500">Posted ${dateFormatted}</div>
        <a href="task-detail.html?id=${task._id || task.id}" class="text-primary hover:underline text-sm">
          View Details
        </a>
      </div>
    </div>
  `;
  
  return card;
};

// Add testing API connection function
TaskUtils.testApiConnection = async function() {
  const apiUrls = [
    localStorage.getItem('apiUrl'),
    'http://localhost:9000',
    'http://127.0.0.1:9000',
    'https://victormain1.onrender.com'
  ].filter(Boolean);
  
  for (const url of apiUrls) {
    try {
      console.log(`Testing API connection to ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${url}/api/status`, {
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`API connection successful to ${url}`);
        localStorage.setItem('apiUrl', url);
        return url;
      }
    } catch (error) {
      console.warn(`API connection test failed for ${url}:`, error.message);
    }
  }
  
  return null;
};
