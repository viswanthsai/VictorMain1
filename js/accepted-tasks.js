/**
 * Accepted Tasks Module
 * Handles loading and displaying tasks accepted by the user
 */

const AcceptedTasks = {
  // Reference to loaded tasks data
  tasks: [],
  
  /**
   * Initialize the module
   */
  init() {
    // Setup event listeners for filters if they exist
    const statusFilter = document.getElementById('filter-status');
    const sortBy = document.getElementById('sort-by');
    
    if (statusFilter) {
      statusFilter.addEventListener('change', () => this.filterAndSortTasks());
    }
    
    if (sortBy) {
      sortBy.addEventListener('change', () => this.filterAndSortTasks());
    }
  },
  
  /**
   * Load tasks accepted by the current user
   * @param {Object} filters - Optional filters to apply
   * @returns {Promise} Promise that resolves when tasks are loaded
   */
  async loadAcceptedTasks(filters = {}) {
    const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    
    if (!userId || !token) {
      throw new Error('Authentication required');
    }
    
    // Show loading state
    this.showLoading();
    
    try {
      // Try to get tasks from my-tasks endpoint first
      try {
        const response = await fetch(`${API_URL}/api/my-tasks`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch tasks');
        }
        
        // Filter tasks to only show those accepted by current user
        const allMyTasks = await response.json();
        this.tasks = allMyTasks.filter(task => 
          task.acceptedById == userId && 
          (task.status === 'In Progress' || task.status === 'Completed')
        );
      } catch (error) {
        console.warn('Failed to fetch from my-tasks endpoint, trying alternative:', error);
        
        // Fallback to getting all tasks and filtering client-side
        const response = await fetch(`${API_URL}/api/tasks`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch tasks');
        }
        
        const allTasks = await response.json();
        this.tasks = allTasks.filter(task => 
          task.acceptedById == userId && 
          (task.status === 'In Progress' || task.status === 'Completed')
        );
      }
      
      // Apply filters and render tasks
      this.filterAndSortTasks(filters);
      
    } catch (error) {
      console.error('Error loading accepted tasks:', error);
      this.showError(error.message || 'Failed to load tasks');
    }
  },
  
  /**
   * Apply filters and sorting to tasks
   * @param {Object} filters - Filters to apply
   */
  filterAndSortTasks(filters = {}) {
    // Get filter values from inputs or passed filters
    const statusFilter = filters.status || 
      (document.getElementById('filter-status')?.value || '');
    
    const sortBy = filters.sort || 
      (document.getElementById('sort-by')?.value || 'newest');
    
    const searchTerm = filters.search || 
      (document.getElementById('search-input')?.value || '').toLowerCase();
    
    // Apply filters
    let filteredTasks = [...this.tasks];
    
    if (statusFilter) {
      filteredTasks = filteredTasks.filter(task => task.status === statusFilter);
    }
    
    if (searchTerm) {
      filteredTasks = filteredTasks.filter(task => 
        task.title.toLowerCase().includes(searchTerm) ||
        task.description.toLowerCase().includes(searchTerm) ||
        task.category.toLowerCase().includes(searchTerm) ||
        (task.location && task.location.toLowerCase().includes(searchTerm))
      );
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'newest':
        filteredTasks.sort((a, b) => new Date(b.acceptedAt || b.updatedAt || b.createdAt) - new Date(a.acceptedAt || a.updatedAt || a.createdAt));
        break;
      case 'oldest':
        filteredTasks.sort((a, b) => new Date(a.acceptedAt || a.updatedAt || a.createdAt) - new Date(b.acceptedAt || b.updatedAt || b.createdAt));
        break;
      case 'deadline':
        filteredTasks.sort((a, b) => {
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline) - new Date(b.deadline);
        });
        break;
      case 'price-high':
        filteredTasks.sort((a, b) => (b.budget || 0) - (a.budget || 0));
        break;
      case 'price-low':
        filteredTasks.sort((a, b) => (a.budget || 0) - (b.budget || 0));
        break;
    }
    
    // Render filtered and sorted tasks
    this.renderTasks(filteredTasks);
  },
  
  /**
   * Render tasks in the container
   * @param {Array} tasks - Tasks to render
   */
  renderTasks(tasks) {
    // Find task container elements (for different pages)
    const tasksContainer = document.getElementById('tasks-container') || 
                           document.getElementById('accepted-tasks-grid');
                         
    const emptyContainer = document.getElementById('empty-container') || 
                           document.getElementById('no-accepted-tasks');
    
    const loadingContainer = document.getElementById('loading-container') || 
                             document.getElementById('accepted-tasks-loading');
    
    if (!tasksContainer) return;
    
    // Hide loading
    if (loadingContainer) {
      loadingContainer.style.display = 'none';
    }
    
    // Show empty state if no filtered tasks
    if (tasks.length === 0) {
      tasksContainer.style.display = 'none';
      if (emptyContainer) {
        emptyContainer.classList.remove('hidden');
        emptyContainer.style.display = 'block';
      }
      return;
    }
    
    // Hide empty state, show task container
    if (emptyContainer) {
      emptyContainer.classList.add('hidden');
      emptyContainer.style.display = 'none';
    }
    
    tasksContainer.style.display = tasksContainer.classList.contains('grid') ? 'grid' : 'block';
    
    // Clear container
    tasksContainer.innerHTML = '';
    
    // Create and add task cards
    tasks.forEach(task => {
      // Use TaskUtils if available, otherwise use internal method
      const card = window.TaskUtils 
        ? window.TaskUtils.createTaskCard(task)
        : this.createTaskCard(task);
        
      tasksContainer.appendChild(card);
    });
  },
  
  /**
   * Show loading state
   */
  showLoading() {
    const loadingContainer = document.getElementById('loading-container') || 
                             document.getElementById('accepted-tasks-loading');
                             
    const tasksContainer = document.getElementById('tasks-container') || 
                           document.getElementById('accepted-tasks-grid');
                           
    const emptyContainer = document.getElementById('empty-container') || 
                           document.getElementById('no-accepted-tasks');
    
    if (loadingContainer) {
      loadingContainer.style.display = 'block';
    }
    
    if (tasksContainer) {
      tasksContainer.style.display = 'none';
    }
    
    if (emptyContainer) {
      emptyContainer.classList.add('hidden');
      emptyContainer.style.display = 'none';
    }
  },
  
  /**
   * Show error state
   * @param {string} message - Error message to display
   */
  showError(message) {
    const loadingContainer = document.getElementById('loading-container') || 
                             document.getElementById('accepted-tasks-loading');
    
    if (!loadingContainer) return;
    
    loadingContainer.innerHTML = `
      <div class="bg-red-50 rounded-lg p-6 text-center">
        <i class="fas fa-exclamation-circle text-red-500 text-4xl mb-4"></i>
        <h2 class="text-xl font-bold mb-2">Error Loading Tasks</h2>
        <p class="text-gray-600 mb-4">${message}</p>
        <button id="retry-btn" class="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition">
          Try Again
        </button>
      </div>
    `;
    
    // Add retry button functionality
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.loadAcceptedTasks());
    }
  },
  
  /**
   * Fallback method to create a task card when TaskUtils is not available
   * @param {Object} task - Task data
   * @returns {HTMLElement} Task card element
   */
  createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow-sm overflow-hidden task-card transition-all hover:-translate-y-1';
    
    // Determine status classes
    let statusClass = 'bg-green-50 text-green-600';
    let statusIcon = 'fa-door-open';
    
    if (task.status === 'In Progress') {
      statusClass = 'bg-yellow-50 text-yellow-600';
      statusIcon = 'fa-spinner';
    } else if (task.status === 'Completed') {
      statusClass = 'bg-gray-50 text-gray-600';
      statusIcon = 'fa-check-circle';
    }
    
    // Format date
    const createdDate = task.acceptedAt ? 
      this.formatDate(task.acceptedAt, true) : 
      'Recently';
      
    const deadline = task.deadline ? 
      this.formatDate(task.deadline) : 
      'No deadline';
    
    // Create card HTML
    card.innerHTML = `
      <div class="p-6">
        <div class="flex justify-between items-start mb-4">
          <h3 class="font-semibold text-lg">
            <a href="task-detail.html?id=${task.id}" class="hover:text-primary transition-colors">${task.title}</a>
          </h3>
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusClass}">
            <i class="fas ${statusIcon} mr-1.5"></i>${task.status}
          </span>
        </div>
        
        <p class="text-gray-600 text-sm mb-4 line-clamp-2">${task.description}</p>
        
        <div class="flex items-center text-sm text-gray-500 mb-2">
          <i class="fas fa-tag mr-2 opacity-70 w-4"></i>
          <span>${task.category}</span>
        </div>
        
        <div class="flex items-center text-sm text-gray-500 mb-2">
          <i class="fas fa-map-marker-alt mr-2 opacity-70 w-4"></i>
          <span>${task.location || 'Remote'}</span>
        </div>
        
        <div class="flex items-center text-sm text-gray-500 mb-2">
          <i class="fas fa-user mr-2 opacity-70 w-4"></i>
          <span>Posted by ${task.createdBy || 'Anonymous'}</span>
        </div>
        
        <div class="flex items-center text-sm text-gray-500 mb-4">
          <i class="fas fa-rupee-sign mr-2 opacity-70 w-4"></i>
          <span>${task.budget ? `₹${task.budget}` : 'Negotiable'}</span>
        </div>
        
        <hr class="my-4 border-gray-100">
        
        <div class="flex justify-between items-center">
          <div>
            <div class="text-xs text-gray-500">Accepted ${createdDate}</div>
            ${task.deadline ? `<div class="text-xs text-gray-500 mt-1">Due by ${deadline}</div>` : ''}
          </div>
          <a href="task-detail.html?id=${task.id}" class="text-primary hover:underline text-sm">
            View Details
          </a>
        </div>
      </div>
    `;
    
    return card;
  },
  
  /**
   * Fallback date formatter when TaskUtils is not available
   * @param {string} dateString - ISO date string
   * @param {boolean} relative - Whether to use relative dates
   * @returns {string} Formatted date
   */
  formatDate(dateString, relative = false) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (relative) {
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return date.toLocaleDateString();
    } else {
      return date.toLocaleDateString();
    }
  }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  AcceptedTasks.init();
});

// Make the module globally available
window.AcceptedTasks = AcceptedTasks;
