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
