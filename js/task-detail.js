/**
 * Task Detail Page Controller
 * Handles loading and displaying task details
 */

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Task Detail page loaded');
  
  // Check browser compatibility
  const isCompatible = checkBrowserCompatibility();
  if (!isCompatible) {
    showCompatibilityWarning();
  }
  
  // Setup page components
  setupPage();
  
  // Load task data
  const taskId = getTaskIdFromUrl();
  if (taskId) {
    loadTaskDetails(taskId);
  } else {
    showErrorState("No task ID provided in the URL");
  }
});

/**
 * Check if browser is compatible with all features
 */
function checkBrowserCompatibility() {
  return typeof fetch !== 'undefined' && 
         typeof Promise !== 'undefined' &&
         typeof localStorage !== 'undefined';
}

/**
 * Show browser compatibility warning
 */
function showCompatibilityWarning() {
  const container = document.createElement('div');
  container.className = 'bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4';
  container.innerHTML = `
    <div class="flex items-center">
      <div class="flex-shrink-0 text-yellow-600">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <div class="ml-3">
        <p class="text-sm text-yellow-700">
          Your browser may not support all features of this application.
          Please consider updating your browser for the best experience.
        </p>
      </div>
    </div>
  `;
  
  const main = document.querySelector('main');
  if (main && main.firstChild) {
    main.insertBefore(container, main.firstChild);
  }
}

/**
 * Get task ID from URL parameters
 */
function getTaskIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

/**
 * Setup page event handlers and UI components
 */
function setupPage() {
  // Setup mobile menu toggle
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', function() {
      mobileMenu.classList.toggle('hidden');
    });
  }
  
  // Setup user dropdown toggle
  setupUserDropdown();
  
  // Setup notifications dropdown toggle
  setupNotificationsDropdown();
  
  // Setup modals
  setupModals();
  
  // Call user display handler if available
  if (typeof window.UserDisplay !== 'undefined') {
    window.UserDisplay.updateUserInfo();
  }
}

/**
 * Setup user dropdown menu
 */
function setupUserDropdown() {
  const userMenuButton = document.getElementById('user-menu-button');
  const userDropdown = document.getElementById('user-dropdown');
  
  if (userMenuButton && userDropdown) {
    userMenuButton.addEventListener('click', function(e) {
      e.stopPropagation();
      userDropdown.classList.toggle('hidden');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
      if (!userMenuButton.contains(event.target) && !userDropdown.contains(event.target)) {
        userDropdown.classList.add('hidden');
      }
    });
    
    // Setup logout button
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.addEventListener('click', logout);
    }
  }
}

/**
 * Setup notifications dropdown
 */
function setupNotificationsDropdown() {
  const notificationsButton = document.getElementById('notifications-button');
  const notificationsDropdown = document.getElementById('notifications-dropdown');
  
  if (notificationsButton && notificationsDropdown) {
    notificationsButton.addEventListener('click', function(e) {
      e.stopPropagation();
      notificationsDropdown.classList.toggle('hidden');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
      if (!notificationsButton.contains(event.target) && !notificationsDropdown.contains(event.target)) {
        notificationsDropdown.classList.add('hidden');
      }
    });
  }
}

/**
 * Setup offer, contact and call modals
 */
function setupModals() {
  // Offer modal
  setupModal('offer-modal', 'make-offer-btn', 'close-offer-modal', 'offer-modal-overlay');
  setupModal('offer-modal', 'close-offer-btn', null, null, true);
  
  // Call modal
  setupModal('call-modal', 'call-poster-btn', 'cancel-call-btn', null);
  
  // Setup offer form submission
  const offerForm = document.getElementById('offer-form');
  if (offerForm) {
    offerForm.addEventListener('submit', function(e) {
      e.preventDefault();
      submitOffer();
    });
  }
  
  // Setup copy phone number button
  const callPhoneLink = document.getElementById('call-phone-link');
  if (callPhoneLink) {
    callPhoneLink.addEventListener('click', function() {
      const phoneNumber = document.getElementById('call-poster-phone').textContent;
      
      // Create a temporary input element
      const tempInput = document.createElement('input');
      tempInput.value = phoneNumber;
      document.body.appendChild(tempInput);
      
      // Select and copy the text
      tempInput.select();
      document.execCommand('copy');
      
      // Remove the temporary element
      document.body.removeChild(tempInput);
      
      // Change button text temporarily
      const originalText = this.innerHTML;
      this.innerHTML = '<i class="fas fa-check mr-2"></i> Copied!';
      
      // Restore original text after 2 seconds
      setTimeout(() => {
        this.innerHTML = originalText;
      }, 2000);
    });
  }
}

/**
 * Setup a modal with open/close functionality
 */
function setupModal(modalId, triggerId, closeId, overlayId, isCloseButton = false) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  // Setup trigger button if provided
  if (triggerId) {
    const trigger = document.getElementById(triggerId);
    if (trigger) {
      trigger.addEventListener('click', function() {
        if (isCloseButton) {
          modal.classList.add('hidden');
        } else {
          modal.classList.remove('hidden');
        }
      });
    }
  }
  
  // Setup close button if provided
  if (closeId) {
    const closeButton = document.getElementById(closeId);
    if (closeButton) {
      closeButton.addEventListener('click', function() {
        modal.classList.add('hidden');
      });
    }
  }
  
  // Setup overlay click to close if provided
  if (overlayId) {
    const overlay = document.getElementById(overlayId);
    if (overlay) {
      overlay.addEventListener('click', function() {
        modal.classList.add('hidden');
      });
    }
  }
  
  // Setup escape key to close
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      modal.classList.add('hidden');
    }
  });
}

/**
 * Load task details from API with robust error handling and retries
 */
async function loadTaskDetails(taskId) {
  try {
    // Show loading state
    showLoadingState();
    
    // Get API URL with fallback mechanism
    const apiUrl = window.getApiUrl ? window.getApiUrl() : 
                  (window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000');
    
    console.log(`Loading task with ID: ${taskId} from API: ${apiUrl}`);
    
    let attempts = 0;
    const maxAttempts = 3;
    const apiUrls = [
      apiUrl,
      window.API_CONFIG && window.API_CONFIG.BACKUP_API_URL,
      'http://localhost:9000',
      'http://127.0.0.1:9000',
      'https://victormain1.onrender.com'
    ].filter(Boolean);
    
    let task = null;
    let successful = false;
    
    // Try multiple API endpoints until one works
    for (let i = 0; i < apiUrls.length && !successful && attempts < maxAttempts; i++) {
      const currentUrl = apiUrls[i];
      attempts++;
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        console.log(`Attempt ${attempts} with ${currentUrl}/api/tasks/${taskId}`);
        
        const response = await fetch(`${currentUrl}/api/tasks/${taskId}`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          task = await response.json();
          console.log('Task loaded successfully:', task);
          
          // Store successful API URL for future use
          localStorage.setItem('apiUrl', currentUrl);
          successful = true;
          break;
        } else {
          console.warn(`Attempt ${attempts} failed with status: ${response.status}`);
        }
      } catch (attemptError) {
        console.warn(`Attempt ${attempts} error:`, attemptError.message);
        // Continue to next API URL
      }
    }
    
    // If all attempts failed, try with ErrorHandler if available
    if (!successful && window.ErrorHandler) {
      console.log('Trying with ErrorHandler as last resort');
      try {
        const response = await ErrorHandler.tryDifferentApiUrls(`api/tasks/${taskId}`);
        task = await response.json();
        successful = true;
      } catch (errorHandlerError) {
        console.error('ErrorHandler also failed:', errorHandlerError);
      }
    }
    
    // If we couldn't load the task after all attempts
    if (!task) {
      throw new Error('Failed to load task after multiple attempts. Please check your internet connection and try again.');
    }
    
    // Handle ID format differences (_id vs id)
    if (!task.id && task._id) {
      task.id = task._id;
    }
    
    // Hide loading, show task details
    hideLoadingState();
    showTaskDetails();
    
    // Populate task details
    populateTaskDetails(task);
    
    // Check if user is the task poster
    const currentUserId = localStorage.getItem('userId');
    const isTaskPoster = currentUserId && (task.userId == currentUserId || task.createdBy == currentUserId);
    
    // Show appropriate action buttons based on user role and task status
    updateActionButtons(task, isTaskPoster);
    
    // Load similar tasks
    loadSimilarTasks(task.category, taskId);
    
    // Load offers if user is the task poster
    if (isTaskPoster) {
      loadOffers(taskId);
    }
    
  } catch (error) {
    console.error('Error loading task details:', error);
    
    // Use ErrorHandler for consistent error display if available
    if (window.ErrorHandler) {
      ErrorHandler.logError('loadTaskDetails', error);
      
      const errorMessage = ErrorHandler.handleApiError(
        error, 
        'Failed to load task details. Please check your internet connection and try again.'
      );
      
      showErrorState(errorMessage);
    } else {
      showErrorState(error.message || 'Failed to load task details');
    }
  }
}

/**
 * Show loading state while task loads
 */
function showLoadingState() {
  document.getElementById('loading-container').classList.remove('hidden');
  document.getElementById('task-details-container').classList.add('hidden');
  document.getElementById('error-container').classList.add('hidden');
}

/**
 * Hide loading state
 */
function hideLoadingState() {
  document.getElementById('loading-container').classList.add('hidden');
}

/**
 * Show task details container
 */
function showTaskDetails() {
  document.getElementById('task-details-container').classList.remove('hidden');
}

/**
 * Show error state with custom message
 */
function showErrorState(message) {
  const errorContainer = document.getElementById('error-container');
  const errorMessage = errorContainer.querySelector('p');
  
  if (errorMessage) {
    errorMessage.textContent = message;
  }
  
  document.getElementById('loading-container').classList.add('hidden');
  document.getElementById('task-details-container').classList.add('hidden');
  errorContainer.classList.remove('hidden');
}

/**
 * Populate task details in the UI
 */
function populateTaskDetails(task) {
  // Set task title and date
  document.getElementById('task-title').textContent = task.title || 'Untitled Task';
  document.getElementById('task-date').textContent = `Posted ${formatDate(task.createdAt)}`;
  
  // Set task status
  const taskStatus = document.getElementById('task-status');
  const statusText = taskStatus.querySelector('.status-text');
  
  if (statusText) {
    statusText.textContent = task.status || 'Open';
  }
  
  if (taskStatus) {
    taskStatus.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(task.status)}`;
  }
  
  // Set task description
  document.getElementById('task-description').innerHTML = task.description || 'No description provided.';
  
  // Set task category, location, due date, and budget
  document.getElementById('task-category').textContent = task.category || 'General';
  document.getElementById('task-location').textContent = task.location || 'Not specified';
  document.getElementById('task-due-date').textContent = task.dueDate ? formatDate(task.dueDate) : 'Not specified';
  document.getElementById('task-budget').textContent = task.budget ? `₹${parseInt(task.budget).toLocaleString()}` : 'Negotiable';
  
  // Set poster information
  if (task.createdBy) {
    document.getElementById('poster-name').textContent = task.createdByName || 'Anonymous';
    
    const posterAvatar = document.getElementById('poster-avatar');
    if (posterAvatar) {
      posterAvatar.textContent = (task.createdByName || 'U').charAt(0).toUpperCase();
    }
  }
}

/**
 * Update action buttons based on user role
 */
function updateActionButtons(task, isTaskPoster) {
  const performerActions = document.getElementById('performer-actions');
  const posterActions = document.getElementById('poster-actions');
  const loginToOffer = document.getElementById('login-to-offer');
  
  const isLoggedIn = !!localStorage.getItem('token');
  
  if (!isLoggedIn) {
    // User is not logged in
    if (performerActions) performerActions.classList.add('hidden');
    if (posterActions) posterActions.classList.add('hidden');
    if (loginToOffer) loginToOffer.classList.remove('hidden');
    return;
  }
  
  // Hide login message for logged-in users
  if (loginToOffer) loginToOffer.classList.add('hidden');
  
  if (isTaskPoster) {
    // User is the task poster
    if (performerActions) performerActions.classList.add('hidden');
    if (posterActions) posterActions.classList.remove('hidden');
    
    // Setup edit task button
    const editTaskBtn = document.getElementById('edit-task-btn');
    if (editTaskBtn) {
      editTaskBtn.addEventListener('click', function() {
        window.location.href = `edit-task.html?id=${task._id || task.id}`;
      });
    }
    
    // Setup cancel task button
    const cancelTaskBtn = document.getElementById('cancel-task-btn');
    if (cancelTaskBtn && task.status === 'Open') {
      cancelTaskBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to cancel this task?')) {
          cancelTask(task._id || task.id);
        }
      });
    } else if (cancelTaskBtn) {
      cancelTaskBtn.classList.add('opacity-50', 'cursor-not-allowed');
      cancelTaskBtn.disabled = true;
    }
  } else {
    // User is not the task poster
    if (performerActions) performerActions.classList.remove('hidden');
    if (posterActions) posterActions.classList.add('hidden');
    
    // Setup make offer button
    const makeOfferBtn = document.getElementById('make-offer-btn');
    if (makeOfferBtn) {
      // Only enable for open tasks
      if (task.status === 'Open') {
        makeOfferBtn.addEventListener('click', function() {
          document.getElementById('offer-modal').classList.remove('hidden');
        });
      } else {
        makeOfferBtn.classList.add('opacity-50', 'cursor-not-allowed');
        makeOfferBtn.disabled = true;
        makeOfferBtn.innerHTML = `<i class="fas fa-lock mr-2"></i> Task ${task.status}`;
      }
    }
    
    // Setup message poster button with proper user ID
    setupMessageButton(task);
    
    // Setup call poster button
    const callPosterBtn = document.getElementById('call-poster-btn');
    if (callPosterBtn) {
      callPosterBtn.addEventListener('click', function() {
        if (task.createdByPhone) {
          showCallModal(task.createdByPhone);
        } else {
          alert('Phone number not available');
        }
      }); 
    }
  }
}

/**
 * Submit an offer for a task
 */
async function submitOffer() {
  try {
    const taskId = getTaskIdFromUrl();
    if (!taskId) {
      alert('Task ID is missing');
      return;
    }
    
    const offerPrice = document.getElementById('offer-price').value;
    const offerMessage = document.getElementById('offer-message').value;
    const offerTimeline = document.getElementById('offer-timeline').value;
    
    if (!offerPrice || !offerMessage || !offerTimeline) {
      alert('Please fill in all fields');
      return;
    }
    
    // Show loading state on button
    const submitButton = document.querySelector('#offer-form button[type=submit]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Sending...';
    submitButton.disabled = true;
    
    // Get API URL
    const apiUrl = window.getApiUrl ? window.getApiUrl() : 
                  (window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000');
    
    // Get task details to find the poster ID
    const taskResponse = await fetch(`${apiUrl}/api/tasks/${taskId}`);
    
    if (!taskResponse.ok) {
      throw new Error(`Failed to load task: ${taskResponse.status}`);
    }
    
    const task = await taskResponse.json();
    const posterId = task.userId || task.createdBy;
    
    if (!posterId) {
      throw new Error('Could not determine task poster');
    }
    
    console.log(`Creating chat with task poster (ID: ${posterId})`);
    
    // Submit offer to API first
    const offerResponse = await fetch(`${apiUrl}/api/tasks/${taskId}/offers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        price: offerPrice,
        message: offerMessage,
        timeline: offerTimeline
      })
    });
    
    if (!offerResponse.ok) {
      throw new Error(`HTTP error: ${offerResponse.status}`);
    }
    
    const offerResult = await offerResponse.json();
    console.log('Offer submitted successfully:', offerResult);
    
    // Now create a chat and send a message about the offer
    try {
      // Create a chat with the task poster
      const chatResponse = await fetch(`${apiUrl}/api/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          recipientId: posterId,
          taskId: taskId
        })
      });
      
      if (!chatResponse.ok) {
        console.warn(`Failed to create chat: ${chatResponse.status}`);
        throw new Error('Failed to create chat');
      }
      
      const chatData = await chatResponse.json();
      const chatId = chatData.id || chatData._id || chatData.chatId;
      
      console.log(`Chat created with ID: ${chatId}`);
      
      // Send a message in the chat about the offer
      const messageResponse = await fetch(`${apiUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          chatId: chatId,
          content: `I've submitted an offer for ${task.title || 'your task'}: ₹${offerPrice} - "${offerMessage}" (${offerTimeline} days)`
        })
      });
      
      if (!messageResponse.ok) {
        console.warn('Failed to send message:', messageResponse.status);
      } else {
        console.log('Message sent successfully');
      }
      
      // Hide modal
      document.getElementById('offer-modal').classList.add('hidden');
      
      // Show success notification and redirect to chat
      const goToChat = confirm('Your offer has been sent successfully! Would you like to go to the chat with the task poster?');
      
      // Clear form
      document.getElementById('offer-form').reset();
      
      if (goToChat) {
        window.location.href = `chat.html?id=${chatId}`;
      } else {
        showSuccessNotification('Your offer has been sent successfully!');
      }
      
    } catch (chatError) {
      console.error('Error creating chat:', chatError);
      // Even if chat creation fails, we still succeeded in making an offer
      document.getElementById('offer-modal').classList.add('hidden');
      document.getElementById('offer-form').reset();
      showSuccessNotification('Your offer has been sent successfully, but we could not create a chat.');
    }
    
  } catch (error) {
    console.error('Error submitting offer:', error);
    alert(`Failed to submit offer: ${error.message}`);
  } finally {
    // Reset button state
    const submitButton = document.querySelector('#offer-form button[type=submit]');
    if (submitButton) {
      submitButton.innerHTML = originalButtonText;
      submitButton.disabled = false;
    }
  }
}

/**
 * Initialize message button to open chat with task poster
 */
function setupMessageButton(task) {
  const messagePosterBtn = document.getElementById('message-poster-btn');
  
  if (messagePosterBtn) {
    // Store user ID as data attribute for the chat bridge
    messagePosterBtn.setAttribute('data-action', 'message-poster');
    messagePosterBtn.setAttribute('data-task-id', task._id || task.id);
    messagePosterBtn.setAttribute('data-user-id', task.createdBy || task.userId);
    
    messagePosterBtn.addEventListener('click', function() {
      openChatWithTaskPoster(task._id || task.id, task.createdBy || task.userId);
    });
  }
}

/**
 * Open chat with task poster
 */
function openChatWithTaskPoster(taskId, userId) {
  // Check if user is logged in
  if (!localStorage.getItem('token')) {
    // Redirect to login with return URL
    window.location.href = `login.html?redirect=task-detail.html?id=${taskId}`;
    return;
  }
  
  // Get task title if available
  const taskTitle = document.getElementById('task-title')?.textContent || 'this task';
  
  // Default message
  const message = `Hi, I'm interested in your task: "${taskTitle}". Can we discuss this further?`;
  
  // Redirect to chat page with task and recipient parameters
  window.location.href = `chat.html?taskId=${taskId}&recipientId=${userId}`;
}

/**
 * Show success notification with animation
 */
function showSuccessNotification(message) {
  const notification = document.getElementById('success-notification');
  const messageElement = document.getElementById('success-message');
  
  if (!notification || !messageElement) return;
  
  // Set message
  messageElement.textContent = message;
  
  // Show notification
  notification.classList.remove('hidden');
  
  // Animate in
  setTimeout(() => {
    notification.classList.remove('translate-y-20', 'opacity-0');
  }, 100);
  
  // Automatically hide after 5 seconds
  setTimeout(() => {
    notification.classList.add('translate-y-20', 'opacity-0');
    
    // After animation completes, hide completely
    setTimeout(() => {
      notification.classList.add('hidden');
    }, 500);
  }, 5000);
  
  // Setup close button
  const closeButton = document.getElementById('close-notification');
  if (closeButton) {
    closeButton.addEventListener('click', function() {
      notification.classList.add('translate-y-20', 'opacity-0');
      
      setTimeout(() => {
        notification.classList.add('hidden');
      }, 500);
    });
  }
}

/**
 * Cancel a task
 */
async function cancelTask(taskId) {
  try {
    // Get API URL
    const apiUrl = window.getApiUrl ? window.getApiUrl() : 
                  (window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000');
    
    // Call API to cancel task
    const response = await fetch(`${apiUrl}/api/tasks/${taskId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    // Show success message
    showSuccessNotification('Task cancelled successfully');
    
    // Reload page after a brief delay
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('Error cancelling task:', error);
    alert(`Failed to cancel task: ${error.message}`);
  }
}

/**
 * Load similar tasks
 */
async function loadSimilarTasks(category, currentTaskId) {
  if (!category) return;
  
  try {
    // Get API URL
    const apiUrl = window.getApiUrl ? window.getApiUrl() : 
                  (window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000');
    
    // Fetch similar tasks
    const response = await fetch(`${apiUrl}/api/tasks?category=${encodeURIComponent(category)}&limit=3`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const tasks = await response.json();
    
    // Filter out current task
    const similarTasks = tasks.filter(task => (task._id || task.id) !== currentTaskId);
    
    // Show similar tasks if any
    if (similarTasks.length > 0) {
      displaySimilarTasks(similarTasks);
    }
    
  } catch (error) {
    console.warn('Error loading similar tasks:', error);
    // Don't show error to user - this is a non-critical feature
  }
}

/**
 * Display similar tasks
 */
function displaySimilarTasks(tasks) {
  const container = document.getElementById('similar-tasks-container');
  const list = document.getElementById('similar-tasks-list');
  
  if (!container || !list) return;
  
  // Clear list
  list.innerHTML = '';
  
  // Add tasks
  tasks.forEach(task => {
    const taskElement = document.createElement('div');
    taskElement.className = 'bg-gray-50 p-3 rounded-lg';
    
    taskElement.innerHTML = `
      <a href="task-detail.html?id=${task._id || task.id}" class="hover:text-primary">
        <h4 class="font-medium text-sm mb-1">${task.title}</h4>
      </a>
      <p class="text-xs text-gray-500">${task.location || 'Remote'} · ${task.budget ? `₹${parseInt(task.budget).toLocaleString()}` : 'Negotiable'}</p>
    `;
    
    list.appendChild(taskElement);
  });
  
  // Show container
  container.classList.remove('hidden');
}

/**
 * Load offers for a task (for task poster)
 */
async function loadOffers(taskId) {
  try {
    // Get API URL
    const apiUrl = window.getApiUrl ? window.getApiUrl() : 
                 (window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000');
    
    // Fetch offers
    const response = await fetch(`${apiUrl}/api/tasks/${taskId}/offers`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const offers = await response.json();
    
    // Display offers if any
    if (offers.length > 0) {
      // The logic for displaying offers should be implemented here if needed
      console.log(`${offers.length} offers loaded for task ${taskId}`);
    }
    
  } catch (error) {
    console.warn('Error loading offers:', error);
    // Don't show error to user
  }
}

/**
 * Show a success notification
 */
function showSuccessNotification(message) {
  const notification = document.getElementById('success-notification');
  const messageElement = document.getElementById('success-message');
  
  if (!notification || !messageElement) return;
  
  // Set message
  messageElement.textContent = message;
  
  // Show notification
  notification.classList.remove('hidden');
  
  // Animate in
  setTimeout(() => {
    notification.classList.remove('translate-y-20', 'opacity-0');
  }, 100);
  
  // Automatically hide after 5 seconds
  setTimeout(() => {
    notification.classList.add('translate-y-20', 'opacity-0');
    
    // After animation completes, hide completely
    setTimeout(() => {
      notification.classList.add('hidden');
    }, 500);
  }, 5000);
  
  // Setup close button
  const closeButton = document.getElementById('close-notification');
  if (closeButton) {
    closeButton.addEventListener('click', function() {
      notification.classList.add('translate-y-20', 'opacity-0');
      
      setTimeout(() => {
        notification.classList.add('hidden');
      }, 500);
    });
  }
}

/**
 * Helper: Get CSS classes for task status
 */
function getStatusClass(status) {
  switch (status) {
    case 'Open':
      return 'bg-green-50 text-green-700';
    case 'In Progress':
      return 'bg-yellow-50 text-yellow-700';
    case 'Completed':
      return 'bg-blue-50 text-blue-700';
    case 'Cancelled':
      return 'bg-gray-50 text-gray-700';
    default:
      return 'bg-green-50 text-green-700';
  }
}

/**
 * Helper: Format date
 */
function formatDate(dateString) {
  if (!dateString) return 'Unknown date';
  
  try {
    // Use TaskUtils if available
    if (window.TaskUtils && typeof TaskUtils.formatDate === 'function') {
      return TaskUtils.formatDate(dateString);
    }
    
    // Fallback implementation
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Date error';
  }
}

// Logout function
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('userId');
  localStorage.removeItem('userEmail');
  
  window.location.href = 'login.html';
}
