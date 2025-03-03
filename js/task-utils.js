/**
 * TaskUtils - Helper functions for handling tasks
 */
const TaskUtils = {
  /**
   * Format a date string 
   * @param {string} dateString - The date string to format
   * @param {boolean} relative - Whether to display relative dates (e.g. "2 days ago")
   * @returns {string} Formatted date string
   */
  formatDate: function(dateString, relative = false) {
    if (!dateString) return 'Recently';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    
    if (relative) {
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? 's' : ''} ago`;
      return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) !== 1 ? 's' : ''} ago`;
    }
    
    // Return full date format
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },
  
  /**
   * Get CSS classes for task status
   * @param {string} status - Task status
   * @returns {object} Object containing CSS classes and icon for the status
   */
  getStatusClasses: function(status) {
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
      case 'Cancelled':
        return {
          bg: 'bg-red-50',
          text: 'text-red-600',
          icon: 'fa-times-circle'
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-600',
          icon: 'fa-question-circle'
        };
    }
  },
  
  /**
   * Create a task card element
   * @param {object} task - Task data
   * @param {object} options - Options for customizing the card
   * @returns {HTMLElement} Task card element
   */
  createTaskCard: function(task, options = {}) {
    const { showButtons = false, showStatus = true } = options;
    
    // Create card element
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:shadow transition-shadow';
    
    // Get status classes
    const statusClasses = this.getStatusClasses(task.status);
    
    // Format dates
    const postedDate = this.formatDate(task.createdAt, true);
    const deadline = task.deadline ? this.formatDate(task.deadline) : null;
    
    // Card HTML content
    let cardContent = `
      <div class="p-5">
        <div class="flex justify-between items-start mb-3">
          <h3 class="font-semibold text-lg">
            <a href="task-detail.html?id=${task.id}" class="hover:text-primary transition-colors">${task.title}</a>
          </h3>
          ${showStatus ? `
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusClasses.bg} ${statusClasses.text}">
              <i class="fas ${statusClasses.icon} mr-1.5"></i>${task.status}
            </span>
          ` : ''}
        </div>
        
        <p class="text-gray-600 text-sm mb-4 line-clamp-2">${task.description || 'No description provided'}</p>
        
        <div class="flex items-center text-sm text-gray-500 mb-2">
          <i class="fas fa-tag mr-2 opacity-70"></i>
          <span>${task.category || 'Uncategorized'}</span>
        </div>
        
        <div class="flex items-center text-sm text-gray-500 mb-2">
          <i class="fas fa-map-marker-alt mr-2 opacity-70"></i>
          <span>${task.location || 'Remote'}</span>
        </div>
        
        <div class="flex items-center text-sm text-gray-500 mb-3">
          <i class="fas fa-rupee-sign mr-2 opacity-70"></i>
          <span>${task.budget ? `₹${task.budget}` : 'Negotiable'}</span>
        </div>
        
        <div class="border-t border-gray-100 mt-4 pt-4 flex justify-between items-center">
          <span class="text-xs text-gray-500">Posted ${postedDate}</span>
          <a href="task-detail.html?id=${task.id}" class="text-primary hover:underline text-sm">View Details</a>
        </div>
    `;
    
    // Add buttons if required
    if (showButtons) {
      if (task.status === 'In Progress') {
        cardContent += `
          <div class="flex gap-2 mt-3">
            <button class="complete-task-btn w-full bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm flex items-center justify-center" data-task-id="${task.id}">
              <i class="fas fa-check-circle mr-1"></i> Mark Complete
            </button>
          </div>
        `;
      }
    }
    
    // Close the div
    cardContent += `</div>`;
    
    // Set the HTML content
    card.innerHTML = cardContent;
    
    // Add event listeners for buttons
    if (showButtons) {
      const completeBtn = card.querySelector('.complete-task-btn');
      if (completeBtn) {
        completeBtn.addEventListener('click', function() {
          const taskId = this.getAttribute('data-task-id');
          if (confirm('Are you sure you want to mark this task as complete?')) {
            updateTaskStatus(taskId, 'Completed');
          }
        });
      }
    }
    
    return card;
    
    // Helper function for updating task status
    function updateTaskStatus(taskId, newStatus) {
      const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('You must be logged in to update task status.');
        return;
      }
      
      fetch(`${API_URL}/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      })
      .then(response => {
        if (!response.ok) throw new Error('Failed to update task status');
        return response.json();
      })
      .then(() => {
        // Reload the page to reflect changes
        window.location.reload();
      })
      .catch(error => {
        console.error('Error updating task status:', error);
        alert('Failed to update task status. Please try again.');
      });
    }
  }
};

// Make TaskUtils available globally
window.TaskUtils = TaskUtils;
