/**
 * Task Detail Page Functionality
 * Handles the display and interaction with a single task
 */

document.addEventListener('DOMContentLoaded', async function() {
  // Initialize UI elements
  updateAuthUI();
  setupEventHandlers();
  
  // Extract task ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const taskId = urlParams.get('id');
  
  if (!taskId) {
    showError('No task ID provided');
    return;
  }
  
  // Load task details
  await loadTaskDetails(taskId);
});

// Handle auth state changes
function updateAuthUI() {
  const isLoggedIn = localStorage.getItem('token') !== null;
  
  const loginMenuItem = document.getElementById('login-menu-item');
  const signupMenuItem = document.getElementById('signup-menu-item');
  const userMenuItem = document.getElementById('user-menu-item');
  const mobileLoginLinks = document.getElementById('mobile-login-links');
  const mobileUserLinks = document.getElementById('mobile-user-links');
  
  if (isLoggedIn) {
    if (loginMenuItem) loginMenuItem.classList.add('hidden');
    if (signupMenuItem) signupMenuItem.classList.add('hidden');
    if (mobileLoginLinks) mobileLoginLinks.classList.add('hidden');
    
    const username = localStorage.getItem('username') || 'User';
    const usernameDisplay = document.getElementById('username-display');
    const userNameDropdown = document.getElementById('user-name-dropdown');
    const userAvatar = document.getElementById('user-avatar');
    
    if (usernameDisplay) usernameDisplay.textContent = username;
    if (userNameDropdown) userNameDropdown.textContent = username;
    if (userAvatar) userAvatar.textContent = username.charAt(0).toUpperCase();
    
    if (userMenuItem) userMenuItem.classList.remove('hidden');
    if (mobileUserLinks) mobileUserLinks.classList.remove('hidden');
    
    // Setup user dropdown
    const userMenuButton = document.getElementById('user-menu-button');
    const userDropdown = document.getElementById('user-dropdown');
    
    if (userMenuButton && userDropdown) {
      userMenuButton.addEventListener('click', function(e) {
        e.stopPropagation();
        userDropdown.classList.toggle('hidden');
      });
      
      document.addEventListener('click', function(event) {
        if (!userMenuButton.contains(event.target) && !userDropdown.contains(event.target)) {
          userDropdown.classList.add('hidden');
        }
      });
    }
  } else {
    if (loginMenuItem) loginMenuItem.classList.remove('hidden');
    if (signupMenuItem) signupMenuItem.classList.remove('hidden');
    if (mobileLoginLinks) mobileLoginLinks.classList.remove('hidden');
    
    if (userMenuItem) userMenuItem.classList.add('hidden');
    if (mobileUserLinks) mobileUserLinks.classList.add('hidden');
  }
}

// Setup event handlers
function setupEventHandlers() {
  // Mobile menu toggle
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileNav = document.getElementById('mobile-nav');
  
  if (mobileMenuButton && mobileNav) {
    mobileMenuButton.addEventListener('click', function() {
      mobileNav.classList.toggle('hidden');
    });
  }
  
  // Logout button
  const logoutButton = document.getElementById('logout-button');
  const mobileLogoutButton = document.getElementById('mobile-logout-button');
  
  if (logoutButton) {
    logoutButton.addEventListener('click', function(e) {
      e.preventDefault();
      logout();
    });
  }
  
  if (mobileLogoutButton) {
    mobileLogoutButton.addEventListener('click', function(e) {
      e.preventDefault();
      logout();
    });
  }
  
  // Post similar task button
  const postSimilarBtn = document.getElementById('post-similar-btn');
  if (postSimilarBtn) {
    postSimilarBtn.addEventListener('click', function() {
      // Store current task details for use in post-task page
      if (window.currentTask) {
        localStorage.setItem('similarTask', JSON.stringify(window.currentTask));
        window.location.href = 'post-task.html?mode=similar';
      }
    });
  }
  
  // Accept task button
  const acceptTaskBtn = document.getElementById('accept-task-btn');
  if (acceptTaskBtn) {
    acceptTaskBtn.addEventListener('click', openAcceptModal);
  }
  
  // Accept task modal buttons
  const cancelAcceptBtn = document.getElementById('cancel-accept');
  if (cancelAcceptBtn) {
    cancelAcceptBtn.addEventListener('click', closeAcceptModal);
  }
  
  const confirmAcceptBtn = document.getElementById('confirm-accept');
  if (confirmAcceptBtn) {
    confirmAcceptBtn.addEventListener('click', acceptTask);
  }
  
  // Success modal close button
  const closeSuccessModalBtn = document.getElementById('close-success-modal');
  if (closeSuccessModalBtn) {
    closeSuccessModalBtn.addEventListener('click', function() {
      document.getElementById('success-modal').classList.add('hidden');
    });
  }
}

// Logout function
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('username');
  window.location.href = 'login.html?message=You have been logged out';
}

// Show error message
function showError(message) {
  document.getElementById('loading-container').classList.add('hidden');
  const errorContainer = document.getElementById('error-container');
  errorContainer.classList.remove('hidden');
  
  // Add error message if provided
  if (message) {
    const errorMessage = errorContainer.querySelector('p');
    if (errorMessage) {
      errorMessage.textContent = message;
    }
  }
}

// Global variable to store task data
window.currentTask = null;

// Load task details
async function loadTaskDetails(taskId) {
  try {
    const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
    
    // Fetch task data
    const response = await fetch(`${API_URL}/api/tasks/${taskId}`);
    
    if (!response.ok) {
      throw new Error('Failed to load task details');
    }
    
    const task = await response.json();
    window.currentTask = task;
    
    // Hide loading, show task details
    document.getElementById('loading-container').classList.add('hidden');
    document.getElementById('task-details-container').classList.remove('hidden');
    
    // Update breadcrumb
    const titleBreadcrumb = document.getElementById('task-title-breadcrumb');
    if (titleBreadcrumb) {
      titleBreadcrumb.textContent = task.title;
    }
    
    // Update page title
    document.title = `${task.title} - Victor`;
    
    // Fill in task details
    document.getElementById('task-title').textContent = task.title;
    document.getElementById('task-description').textContent = task.description;
    document.getElementById('task-location').textContent = task.location || 'Remote';
    document.getElementById('task-category').textContent = task.category || 'Other';
    document.getElementById('task-budget').textContent = task.budget ? `₹${task.budget}` : 'Negotiable';
    document.getElementById('task-posted-date').textContent = TaskUtils.formatDate(task.createdAt, false);
    
    // Update status badge
    const statusBadge = document.getElementById('task-status-badge');
    const statusText = document.getElementById('task-status');
    const statusClasses = TaskUtils.getStatusClasses(task.status);
    
    statusBadge.className = `inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusClasses.bg} ${statusClasses.text}`;
    statusText.textContent = task.status;
    
    // Set poster information
    if (task.createdBy) {
      document.getElementById('task-poster-name').textContent = task.createdBy;
      const posterInitials = task.createdBy.split(' ').map(part => part[0].toUpperCase()).join('');
      document.getElementById('poster-avatar').textContent = posterInitials;
      document.getElementById('task-poster-initials').textContent = posterInitials;
    }
    
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('token') !== null;
    const userId = localStorage.getItem('userId');
    
    if (isLoggedIn && userId) {
      // User is logged in, determine relationship to task
      
      if (task.userId == userId) {
        // User is the task poster
        document.getElementById('own-task-indicator').classList.remove('hidden');
        document.getElementById('accept-task-btn').classList.add('hidden');
      } else if (task.acceptedById == userId) {
        // User has already accepted this task
        document.getElementById('already-accepted-indicator').classList.remove('hidden');
        document.getElementById('accept-task-btn').classList.add('hidden');
      } else if (task.status === 'Open') {
        // User can accept this task
        document.getElementById('accept-task-btn').classList.remove('hidden');
      }
    } else {
      // User is not logged in, show login prompt if they try to accept
      const acceptTaskBtn = document.getElementById('accept-task-btn');
      if (task.status === 'Open') {
        acceptTaskBtn.classList.remove('hidden');
        acceptTaskBtn.addEventListener('click', function(e) {
          e.preventDefault();
          window.location.href = `login.html?redirect=task-detail.html?id=${taskId}&message=Please login to accept this task`;
        });
      }
    }
    
    // Load similar tasks
    await loadSimilarTasks(task);
    
  } catch (error) {
    console.error('Error loading task details:', error);
    showError('Failed to load task details. Please try again later.');
  }
}

// Load similar tasks based on category
async function loadSimilarTasks(currentTask) {
  try {
    const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
    const response = await fetch(`${API_URL}/api/tasks`);
    
    if (!response.ok) {
      throw new Error('Failed to load similar tasks');
    }
    
    const tasks = await response.json();
    
    // Filter to get similar tasks (same category, excluding current)
    const similarTasks = tasks
      .filter(task => task.id !== currentTask.id && task.status === 'Open')
      .filter(task => task.category === currentTask.category || Math.random() > 0.5) // Include some random ones if not enough in same category
      .slice(0, 3);
    
    const container = document.getElementById('similar-tasks-container');
    container.innerHTML = '';
    
    if (similarTasks.length === 0) {
      container.innerHTML = '<p class="text-gray-500 text-center">No similar tasks found</p>';
      return;
    }
    
    // Display similar tasks
    similarTasks.forEach(task => {
      const taskElement = document.createElement('div');
      taskElement.className = 'py-3 border-b border-gray-100 last:border-0';
      
      taskElement.innerHTML = `
        <a href="task-detail.html?id=${task.id}" class="block">
          <h3 class="text-gray-800 font-medium hover:text-primary truncate">${task.title}</h3>
          <div class="flex justify-between items-center mt-1">
            <div>
              <span class="text-xs inline-block bg-gray-100 rounded-full px-2 py-1 text-gray-600">${task.category}</span>
            </div>
            <span class="text-sm text-primary font-medium">${task.budget ? `₹${task.budget}` : 'Negotiable'}</span>
          </div>
          <div class="text-xs text-gray-500 mt-1">${TaskUtils.formatDate(task.createdAt, true)}</div>
        </a>
      `;
      
      container.appendChild(taskElement);
    });
  } catch (error) {
    console.error('Error loading similar tasks:', error);
    const container = document.getElementById('similar-tasks-container');
    container.innerHTML = '<p class="text-gray-500 text-center">Failed to load similar tasks</p>';
  }
}

// Open accept task modal
function openAcceptModal() {
  const acceptModal = document.getElementById('accept-task-modal');
  if (acceptModal) acceptModal.classList.remove('hidden');
}

// Close accept task modal
function closeAcceptModal() {
  const acceptModal = document.getElementById('accept-task-modal');
  if (acceptModal) acceptModal.classList.add('hidden');
}

// Accept the current task
async function acceptTask() {
  try {
    const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
    const token = localStorage.getItem('token');
    const taskId = window.currentTask?.id;
    
    if (!taskId) {
      throw new Error('Task not found');
    }
    
    if (!token) {
      // Redirect to login if not logged in
      window.location.href = `login.html?redirect=task-detail.html?id=${taskId}&message=Please login to accept this task`;
      return;
    }
    
    // Close the accept modal
    closeAcceptModal();
    
    // Show loading state
    const acceptBtn = document.getElementById('accept-task-btn');
    if (acceptBtn) {
      acceptBtn.disabled = true;
      acceptBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Accepting...';
    }
    
    // Make API call to accept task
    const response = await fetch(`${API_URL}/api/tasks/${taskId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to accept task');
    }
    
    // Success
    const successModal = document.getElementById('success-modal');
    if (successModal) {
      successModal.classList.remove('hidden');
    }
    
    // Update UI
    if (acceptBtn) {
      acceptBtn.classList.add('hidden');
    }
    
    const alreadyAcceptedIndicator = document.getElementById('already-accepted-indicator');
    if (alreadyAcceptedIndicator) {
      alreadyAcceptedIndicator.classList.remove('hidden');
    }
    
  } catch (error) {
    console.error('Error accepting task:', error);
    
    // Reset button state
    const acceptBtn = document.getElementById('accept-task-btn');
    if (acceptBtn) {
      acceptBtn.disabled = false;
      acceptBtn.innerHTML = '<i class="fas fa-handshake mr-2"></i> Accept Task';
    }
    
    // Show error notification
    if (window.showNotification) {
      window.showNotification(error.message || 'Failed to accept task', 'error');
    } else {
      alert(error.message || 'Failed to accept task');
    }
  }
}
