/**
 * Post Task Handlers
 * Specific handlers for the post task form submission and related functionality
 */

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();
  
  // Validate form
  if (!validateForm()) {
    return;
  }
  
  // Get form data
  const title = document.getElementById('title').value;
  const description = document.getElementById('description').value;
  const category = document.getElementById('category').value;
  const location = document.getElementById('location').value;
  const budget = document.getElementById('budget').value;
  const deadline = document.getElementById('deadline').value;
  const privateTask = document.getElementById('private-task').checked;
  
  // Show loading state
  const submitButton = document.getElementById('submit-button');
  const originalButtonText = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Posting...';
  
  try {
    const taskData = {
      title,
      description,
      category,
      location,
      budget: budget ? parseFloat(budget) : null,
      deadline: deadline || null,
      private: privateTask
    };
    
    console.log('Submitting task data:', taskData);
    
    // Get user token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('You must be logged in to post a task');
    }
    
    // API endpoint
    const API_URL = window.API_CONFIG?.API_URL || 'http://localhost:9000';
    const apiUrl = `${API_URL}/api/tasks`;
    
    console.log('Sending request to:', apiUrl);
    
    // Make API request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(taskData)
    });
    
    // Parse response
    const data = await response.json();
    
    console.log('Server response:', data);
    
    // Check if response is successful
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create task');
    }
    
    console.log('Task created successfully:', data);
    
    // Clear localStorage draft if it exists
    const userId = localStorage.getItem('userId') || 'anonymous';
    localStorage.removeItem(`taskDraft_${userId}`);
    
    // Show success message using both methods for reliability
    showSuccessModal(data.id || data._id, title);
    createSuccessPopupDirectly(data.id || data._id, title);
    
    // Clear form
    clearForm();
    
    // Log success for tracking
    console.log('Task posted successfully with ID:', data.id || data._id);
    
  } catch (error) {
    console.error('Error creating task:', error);
    
    // Show error notification
    showNotification(error.message || 'Error creating task. Please try again.', 'error');
  } finally {
    // Restore button state
    submitButton.disabled = false;
    submitButton.innerHTML = originalButtonText;
  }
}

// Show success modal with animation
function showSuccessModal(taskId, taskTitle) {
  // Update modal content
  const successMessage = document.getElementById('success-message');
  const viewTaskButton = document.getElementById('view-task-button');
  const modal = document.getElementById('success-modal');
  const modalContent = document.getElementById('success-modal-content');
  
  if (!successMessage || !viewTaskButton || !modal || !modalContent) {
    console.error('Success modal elements not found, using direct popup instead');
    createSuccessPopupDirectly(taskId, taskTitle);
    return;
  }
  
  // Update content
  successMessage.textContent = `"${taskTitle}" has been posted successfully and is now available for offers.`;
  viewTaskButton.href = `task-detail.html?id=${taskId}`;
  
  // Show modal with animation
  modal.classList.remove('hidden');
  
  // Animate in
  setTimeout(() => {
    modalContent.classList.remove('scale-95', 'opacity-0');
    modalContent.classList.add('scale-100', 'opacity-100');
  }, 10);
  
  // Add close handlers
  document.addEventListener('click', function closeModal(e) {
    if (e.target === modal) {
      hideSuccessModal();
      document.removeEventListener('click', closeModal);
    }
  });
  
  // Close on escape key
  document.addEventListener('keydown', function closeOnEsc(e) {
    if (e.key === 'Escape') {
      hideSuccessModal();
      document.removeEventListener('keydown', closeOnEsc);
    }
  });
  
  // Auto close after 10 seconds
  setTimeout(() => {
    hideSuccessModal();
  }, 10000);
}

// Hide success modal with animation
function hideSuccessModal() {
  const modal = document.getElementById('success-modal');
  const modalContent = document.getElementById('success-modal-content');
  
  if (!modal || !modalContent) return;
  
  // Animate out
  modalContent.classList.add('scale-95', 'opacity-0');
  modalContent.classList.remove('scale-100', 'opacity-100');
  
  // Hide after animation
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 300);
}

// Fallback success popup that creates its own DOM elements
// This is for extra reliability in case the modal elements aren't found
function createSuccessPopupDirectly(taskId, taskTitle) {
  console.log('Creating direct success popup for task:', { taskId, taskTitle });
  
  // First remove any existing popups
  const existingPopup = document.getElementById('direct-success-popup');
  if (existingPopup) {
    document.body.removeChild(existingPopup);
  }
  
  // Create overlay with high z-index
  const overlay = document.createElement('div');
  overlay.id = 'direct-success-popup';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.right = '0';
  overlay.style.bottom = '0';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '9999';
  overlay.style.padding = '1rem';
  
  // Create popup content
  const popup = document.createElement('div');
  popup.style.backgroundColor = 'white';
  popup.style.borderRadius = '0.75rem';
  popup.style.padding = '1.5rem';
  popup.style.maxWidth = '28rem';
  popup.style.width = '100%';
  popup.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
  popup.style.textAlign = 'center';
  
  // Sanitize title for security
  const safeTitle = taskTitle 
    ? String(taskTitle).replace(/</g, '&lt;').replace(/>/g, '&gt;')
    : 'Your task';
  
  popup.innerHTML = `
    <div style="margin: 0 auto; display: flex; align-items: center; justify-content: center; width: 5rem; height: 5rem; background-color: #d1fae5; border-radius: 9999px; margin-bottom: 1.5rem;">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: #10b981; width: 3rem; height: 3rem;">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <h2 style="margin-bottom: 0.75rem; font-size: 1.5rem; font-weight: 700; color: #111827;">Task Posted Successfully!</h2>
    <p style="margin-bottom: 1.5rem; color: #4b5563;">"${safeTitle}" has been posted and is now available for offers.</p>
    <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 0.5rem;">
      <a href="task-detail.html?id=${taskId}" style="display: inline-flex; align-items: center; justify-content: center; background-color: #2563eb; color: white; padding: 0.75rem 1rem; border-radius: 0.5rem; text-decoration: none; font-weight: 500;">
        <svg xmlns="http://www.w3.org/2000/svg" class="mr-2" style="width: 1.25rem; height: 1.25rem; margin-right: 0.5rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        View Task
      </a>
      <a href="dashboard.html" style="display: inline-flex; align-items: center; justify-content: center; background-color: #f3f4f6; color: #111827; padding: 0.75rem 1rem; border-radius: 0.5rem; text-decoration: none; font-weight: 500;">
        <svg xmlns="http://www.w3.org/2000/svg" class="mr-2" style="width: 1.25rem; height: 1.25rem; margin-right: 0.5rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        Go to Dashboard
      </a>
    </div>
    <button id="close-direct-popup" style="background: none; border: none; color: #6b7280; padding: 0.5rem; cursor: pointer; font-size: 0.875rem; margin-top: 0.5rem;">Close</button>
  `;
  
  // Append to DOM
  overlay.appendChild(popup);
  document.body.appendChild(overlay);
  
  // Prevent scrolling
  document.body.style.overflow = 'hidden';
  
  // Close handlers
  function closePopup() {
    document.body.removeChild(overlay);
    document.body.style.overflow = '';
  }
  
  // Close button
  document.getElementById('close-direct-popup')?.addEventListener('click', closePopup);
  
  // Click outside to close
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      closePopup();
    }
  });
  
  // ESC key to close
  document.addEventListener('keydown', function handleEsc(e) {
    if (e.key === 'Escape') {
      closePopup();
      document.removeEventListener('keydown', handleEsc);
    }
  });
  
  // Auto close after 15 seconds
  setTimeout(closePopup, 15000);
}

// Setup preview modal
function setupPreviewModal() {
  const previewButton = document.getElementById('preview-button');
  const previewModal = document.getElementById('preview-modal');
  const closePreviewButton = document.getElementById('close-preview');
  const previewContent = document.getElementById('preview-content');
  const previewPublishButton = document.getElementById('preview-publish-button');
  const previewEditButton = document.getElementById('preview-edit-button');
  
  if (!previewButton || !previewModal || !previewContent) return;
  
  previewButton.addEventListener('click', function() {
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const category = document.getElementById('category').value;
    const location = document.getElementById('location').value;
    const budget = document.getElementById('budget').value;
    const deadline = document.getElementById('deadline').value;
    
    // Build preview content
    previewContent.innerHTML = `
      <div class="space-y-6">
        <div>
          <h3 class="text-lg font-semibold text-gray-700 mb-2">Task Title</h3>
          <p class="text-gray-800 text-lg font-medium">${title || 'Not specified'}</p>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-gray-700 mb-2">Description</h3>
          <div class="text-gray-800">${description || 'Not specified'}</div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="text-base font-semibold text-gray-700 mb-1">Category</h3>
            <p class="text-gray-800">${category || 'Not specified'}</p>
          </div>
          <div>
            <h3 class="text-base font-semibold text-gray-700 mb-1">Location</h3>
            <p class="text-gray-800">${location || 'Not specified'}</p>
          </div>
          <div>
            <h3 class="text-base font-semibold text-gray-700 mb-1">Budget</h3>
            <p class="text-gray-800">${budget ? `₹${budget}` : 'Negotiable'}</p>
          </div>
          <div>
            <h3 class="text-base font-semibold text-gray-700 mb-1">Deadline</h3>
            <p class="text-gray-800">${deadline ? new Date(deadline).toLocaleDateString() : 'No specific deadline'}</p>
          </div>
        </div>
      </div>
    `;
    
    // Show modal
    previewModal.classList.remove('hidden');
  });
  
  // Close preview
  if (closePreviewButton) {
    closePreviewButton.addEventListener('click', function() {
      previewModal.classList.add('hidden');
    });
  }
  
  // Publish from preview
  if (previewPublishButton) {
    previewPublishButton.addEventListener('click', function() {
      previewModal.classList.add('hidden');
      document.getElementById('task-form').requestSubmit();
    });
  }
  
  // Edit from preview
  if (previewEditButton) {
    previewEditButton.addEventListener('click', function() {
      previewModal.classList.add('hidden');
    });
  }
}

// Save draft functionality
function saveDraft() {
  // Get form data
  const title = document.getElementById('title').value;
  const description = document.getElementById('description-editor').innerHTML;
  const category = document.getElementById('category').value;
  const location = document.getElementById('location').value;
  const budget = document.getElementById('budget').value;
  const deadline = document.getElementById('deadline').value;
  const privateTask = document.getElementById('private-task').checked;
  
  // Create draft object
  const draft = {
    title,
    description,
    category,
    location,
    budget,
    deadline,
    privateTask,
    savedAt: new Date().toISOString()
  };
  
  // Save to localStorage with user-specific key
  const userId = localStorage.getItem('userId') || 'anonymous';
  localStorage.setItem(`taskDraft_${userId}`, JSON.stringify(draft));
  
  // Show notification
  showNotification('Draft saved successfully', 'success');
  
  // Return false to prevent form submission
  return false;
}

// Clear the form
function clearForm() {
  // Reset form
  document.getElementById('task-form').reset();
  
  // Clear rich text editor
  const editor = document.getElementById('description-editor');
  if (editor) editor.innerHTML = '';
  
  // Update hidden input
  const hiddenInput = document.getElementById('description');
  if (hiddenInput) hiddenInput.value = '';
  
  // Clear file previews
  const filePreviewContainer = document.getElementById('file-preview-container');
  if (filePreviewContainer) {
    filePreviewContainer.innerHTML = '';
    filePreviewContainer.classList.add('hidden');
  }
  
  // Remove saved draft
  const userId = localStorage.getItem('userId') || 'anonymous';
  localStorage.removeItem(`taskDraft_${userId}`);
  
  // Show notification
  // showNotification('Form cleared', 'info');
}

// Load saved draft
function loadSavedDraft() {
  // Get user-specific draft
  const userId = localStorage.getItem('userId') || 'anonymous';
  const draftJson = localStorage.getItem(`taskDraft_${userId}`);
  
  if (!draftJson) return;
  
  try {
    const draft = JSON.parse(draftJson);
    
    // Calculate time since saved
    const savedAt = new Date(draft.savedAt);
    const now = new Date();
    const timeDiff = Math.floor((now - savedAt) / (1000 * 60));
    
    // Create draft notice
    const draftNotice = document.createElement('div');
    draftNotice.className = 'bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex flex-wrap items-center justify-between';
    draftNotice.innerHTML = `
      <div>
        <h3 class="text-sm font-medium text-blue-800">You have a saved draft</h3>
        <p class="text-xs text-blue-600">Last saved ${formatTimeSince(timeDiff)} ago</p>
      </div>
      <div class="flex space-x-2 mt-2 sm:mt-0">
        <button type="button" id="restore-draft" class="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
          Restore Draft
        </button>
        <button type="button" id="discard-draft" class="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 transition">
          Discard
        </button>
      </div>
    `;
    
    // Insert at top of form container
    const formContainer = document.querySelector('form.card') || document.querySelector('form');
    if (formContainer) {
      formContainer.parentNode.insertBefore(draftNotice, formContainer);
    } else {
      const mainContent = document.querySelector('main');
      if (mainContent) {
        mainContent.insertBefore(draftNotice, mainContent.firstChild);
      }
    }
    
    // Add event listeners
    document.getElementById('restore-draft').addEventListener('click', () => {
      // Fill form with draft data
      document.getElementById('title').value = draft.title || '';
      
      const editor = document.getElementById('description-editor');
      const hiddenInput = document.getElementById('description');
      
      if (editor) editor.innerHTML = draft.description || '';
      if (hiddenInput) hiddenInput.value = draft.description || '';
      
      if (draft.category) {
        const categorySelect = document.getElementById('category');
        if (categorySelect) categorySelect.value = draft.category;
      }
      
      const locationInput = document.getElementById('location');
      if (locationInput) locationInput.value = draft.location || '';
      
      const budgetInput = document.getElementById('budget');
      if (budgetInput) budgetInput.value = draft.budget || '';
      
      const deadlineInput = document.getElementById('deadline');
      if (deadlineInput) deadlineInput.value = draft.deadline || '';
      
      const privateTaskCheck = document.getElementById('private-task');
      if (privateTaskCheck) privateTaskCheck.checked = draft.privateTask || false;
      
      // Remove notice
      draftNotice.remove();
      
      showNotification('Draft restored', 'success');
    });
    
    document.getElementById('discard-draft').addEventListener('click', () => {
      localStorage.removeItem(`taskDraft_${userId}`);
      draftNotice.remove();
      showNotification('Draft discarded', 'info');
    });
  } catch (error) {
    console.error('Error loading draft:', error);
    localStorage.removeItem(`taskDraft_${userId}`);
  }
}

// Format time since for draft notice
function formatTimeSince(minutes) {
  if (minutes < 1) return 'less than a minute';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
  
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

// Setup unsaved changes warning
function setupUnsavedChangesWarning() {
  // Track if form has been modified
  let formDirty = false;
  const form = document.getElementById('task-form');
  if (!form) return;
  
  // Mark form as dirty when inputs change
  const formInputs = form.querySelectorAll('input, select, textarea');
  formInputs.forEach(input => {
    input.addEventListener('change', () => {
      formDirty = true;
    });
  });
  
  const editor = document.getElementById('description-editor');
  if (editor) {
    editor.addEventListener('input', () => {
      formDirty = true;
    });
  }
  
  // Warn when leaving page with unsaved changes
  window.addEventListener('beforeunload', (e) => {
    if (formDirty) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    }
  });
  
  // Reset dirty flag after submission or saving draft
  form.addEventListener('submit', () => {
    formDirty = false;
  });
  
  const saveDraftButton = document.getElementById('save-draft-button');
  if (saveDraftButton) {
    saveDraftButton.addEventListener('click', () => {
      formDirty = false;
    });
  }
}

// Show notification using either the global notifications object or a fallback
function showNotification(message, type = 'info') {
  // Use global notifications object if available
  if (window.notifications && typeof window.notifications.notify === 'function') {
    window.notifications.notify(message, type);
    return;
  }
  
  // Simple fallback notification
  const notification = document.createElement('div');
  notification.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-xl text-white transition transform z-50 ${
    type === 'success' ? 'bg-green-500' :
    type === 'error' ? 'bg-red-500' :
    type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500' // info
  }`;
  notification.style.opacity = '0';
  notification.style.transform = 'translateY(1rem)';
  
  notification.innerHTML = `
    <div class="flex items-center">
      <div class="flex-shrink-0">
        <i class="fas ${
          type === 'success' ? 'fa-check-circle' :
          type === 'error' ? 'fa-exclamation-circle' :
          type === 'warning' ? 'fa-exclamation-triangle' :
          'fa-info-circle' // info
        } mr-2"></i>
      </div>
      <div class="ml-2 mr-6">${message}</div>
      <button type="button" class="flex-shrink-0 ml-auto text-white hover:text-white/80 focus:outline-none">
        <span class="sr-only">Close</span>
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
  
  // Add close button functionality
  const closeButton = notification.querySelector('button');
  closeButton.addEventListener('click', () => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(1rem)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  });
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);
  
  // Auto remove after delay
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(1rem)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  setupPreviewModal();
  setupUnsavedChangesWarning();
  loadSavedDraft();
  
  // Setup form submission
  const form = document.getElementById('task-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
  
  // Save draft button handler
  const saveDraftButton = document.getElementById('save-draft-button');
  if (saveDraftButton) {
    saveDraftButton.addEventListener('click', saveDraft);
  }
});
