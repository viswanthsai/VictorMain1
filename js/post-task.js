/**
 * Task posting utilities
 * Helper functions for the task posting form
 */

const PostTaskUtils = {
  /**
   * Validates if a task title meets requirements
   * @param {string} title - The task title
   * @returns {Object} Validation result { valid: boolean, message: string }
   */
  validateTitle: function(title) {
    if (!title || title.trim() === '') {
      return { valid: false, message: "Task title is required" };
    }
    
    if (title.length > 75) {
      return { valid: false, message: "Task title must be 75 characters or less" };
    }
    
    return { valid: true };
  },
  
  /**
   * Validates if a task description meets requirements
   * @param {string} description - The task description
   * @returns {Object} Validation result { valid: boolean, message: string }
   */
  validateDescription: function(description) {
    const plainText = this.stripHtml(description).trim();
    
    if (!plainText) {
      return { valid: false, message: "Task description is required" };
    }
    
    if (plainText.length < 30) {
      return { valid: false, message: "Task description should be at least 30 characters long" };
    }
    
    return { valid: true };
  },
  
  /**
   * Estimates the time to complete a task based on description and category
   * @param {string} description - The task description
   * @param {string} category - The task category
   * @returns {Object} Time estimate { min: number, max: number, unit: string }
   */
  estimateTaskTime: function(description, category) {
    // Default estimates by category (in hours)
    const categoryEstimates = {
      "Home Services": { min: 2, max: 4, unit: 'hours' },
      "Delivery": { min: 1, max: 2, unit: 'hours' },
      "IT & Tech": { min: 2, max: 8, unit: 'hours' },
      "Tutoring": { min: 1, max: 2, unit: 'hours' },
      "Events": { min: 3, max: 6, unit: 'hours' },
      "Other": { min: 1, max: 4, unit: 'hours' }
    };
    
    // Get base estimate from category
    const estimate = categoryEstimates[category] || { min: 1, max: 4, unit: 'hours' };
    
    // Adjust based on description length (longer descriptions might indicate more complex tasks)
    const textLength = this.stripHtml(description).length;
    
    if (textLength > 1000) {
      // For very detailed descriptions, increase the estimate
      estimate.max += 2;
      estimate.min += 1;
    } else if (textLength < 100) {
      // For very brief descriptions, decrease the estimate
      estimate.max = Math.max(1, estimate.max - 1);
      estimate.min = Math.max(0.5, estimate.min - 0.5);
    }
    
    return estimate;
  },
  
  /**
   * Suggests a budget range based on category and description
   * @param {string} category - The task category
   * @param {string} description - The task description
   * @returns {Object} Budget suggestion { min: number, max: number }
   */
  suggestBudget: function(category, description) {
    // Base hourly rates by category (in ₹)
    const hourlyRates = {
      "Home Services": { min: 200, max: 500 },
      "Delivery": { min: 100, max: 300 },
      "IT & Tech": { min: 500, max: 2000 },
      "Tutoring": { min: 300, max: 800 },
      "Events": { min: 500, max: 1500 },
      "Other": { min: 200, max: 600 }
    };
    
    // Get estimate time
    const timeEstimate = this.estimateTaskTime(description, category);
    
    // Get rate for the category
    const rate = hourlyRates[category] || hourlyRates["Other"];
    
    // Calculate budget range
    const minBudget = Math.round(rate.min * timeEstimate.min);
    const maxBudget = Math.round(rate.max * timeEstimate.max);
    
    return { min: minBudget, max: maxBudget };
  },
  
  /**
   * Strips HTML tags from a string
   * @param {string} html - HTML string
   * @returns {string} Plain text without HTML tags
   */
  stripHtml: function(html) {
    if (!html) return '';
    
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  },
  
  /**
   * Sanitizes HTML content for safe display
   * @param {string} html - HTML content to sanitize
   * @returns {string} Sanitized HTML
   */
  sanitizeHtml: function(html) {
    if (!html) return '';
    
    // Create a new DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Remove potentially harmful elements and attributes
    const allowedTags = ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'ul', 'ol', 'li', 'span'];
    const allowedAttrs = ['style', 'class'];
    
    function cleanNode(node) {
      // If this is an element node
      if (node.nodeType === 1) {
        // Check if it's an allowed tag
        if (!allowedTags.includes(node.tagName.toLowerCase())) {
          // Replace with its text content
          const text = document.createTextNode(node.textContent);
          node.parentNode.replaceChild(text, node);
          return;
        }
        
        // Remove disallowed attributes
        Array.from(node.attributes).forEach(attr => {
          if (!allowedAttrs.includes(attr.name)) {
            node.removeAttribute(attr.name);
          }
        });
        
        // Recursively clean child nodes
        Array.from(node.childNodes).forEach(cleanNode);
      }
    }
    
    // Apply cleaning to the body
    Array.from(doc.body.childNodes).forEach(cleanNode);
    
    return doc.body.innerHTML;
  },
  
  /**
   * Generates draft key for a specific user
   * @param {string} userId - User ID
   * @returns {string} Draft key for localStorage
   */
  getDraftKey: function(userId) {
    return `taskDraft_${userId}`;
  }
};

// Make utilities available globally
window.PostTaskUtils = PostTaskUtils;

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  checkLoginStatus();
  
  // Setup rich text editor
  setupRichTextEditor();
  
  // Setup file upload functionality
  setupFileUpload();
  
  // Setup preview modal
  setupPreviewModal();
  
  // Load saved draft if available
  loadSavedDraft();
  
  // Form submission handler
  document.getElementById('task-form').addEventListener('submit', handleFormSubmit);
  
  // Save draft button handler
  document.getElementById('save-draft-button').addEventListener('click', saveDraft);
  
  // Setup mobile menu toggle
  document.getElementById('mobile-menu-button').addEventListener('click', function() {
    document.getElementById('mobile-menu').classList.toggle('hidden');
  });
  
  // User menu dropdown toggle
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
  
  // Setup unsaved changes warning
  setupUnsavedChangesWarning();
});

// Check login status and redirect if not logged in
function checkLoginStatus() {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  const userEmail = localStorage.getItem('userEmail');
  
  if (!token) {
    window.location.href = 'login.html?redirect=post-task.html&message=Please login to post a task';
    return;
  }
  
  // Update user info in UI
  if (username) {
    const usernameDom = document.getElementById('username-display');
    const userAvatar = document.getElementById('user-avatar');
    const userDropdownName = document.getElementById('user-name-dropdown');
    const userDropdownEmail = document.getElementById('user-email-dropdown');
    
    if (usernameDom) usernameDom.textContent = username;
    if (userAvatar) userAvatar.textContent = username.charAt(0).toUpperCase();
    if (userDropdownName) userDropdownName.textContent = username;
    if (userDropdownEmail && userEmail) userDropdownEmail.textContent = userEmail;
  }
  
  // Setup logout button
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', function() {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      localStorage.removeItem('userEmail');
      window.location.href = 'login.html';
    });
  }
}

// Setup rich text editor
function setupRichTextEditor() {
  const editor = document.getElementById('description-editor');
  const hiddenInput = document.getElementById('description');
  const toolbarButtons = document.querySelectorAll('[data-format]');
  
  // Set initial value if available
  if (hiddenInput.value) {
    editor.innerHTML = hiddenInput.value;
  }
  
  // Update hidden input when editor content changes
  editor.addEventListener('input', function() {
    hiddenInput.value = editor.innerHTML;
  });
  
  // Toolbar button functionality
  toolbarButtons.forEach(button => {
    button.addEventListener('click', function() {
      const format = this.dataset.format;
      document.execCommand(format, false, null);
      editor.focus();
    });
  });
}

// Form validation
function validateForm() {
  // Reset previous validation errors
  clearValidationErrors();
  
  let isValid = true;
  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description-editor').textContent.trim();
  const category = document.getElementById('category').value;
  const location = document.getElementById('location').value.trim();
  
  // Validate title
  if (!title) {
    showValidationError('title', 'Title is required');
    isValid = false;
  } else if (title.length > 75) {
    showValidationError('title', 'Title must be 75 characters or less');
    isValid = false;
  }
  
  // Validate description
  if (!description) {
    showValidationError('description-editor', 'Description is required');
    isValid = false;
  } else if (description.length < 30) {
    showValidationError('description-editor', 'Description should be at least 30 characters');
    isValid = false;
  }
  
  // Validate category
  if (!category) {
    showValidationError('category', 'Please select a category');
    isValid = false;
  }
  
  // Validate location
  if (!location) {
    showValidationError('location', 'Location is required');
    isValid = false;
  }
  
  return isValid;
}

// Show validation error for a field
function showValidationError(fieldId, message) {
  const field = document.getElementById(fieldId);
  
  // Add error class to the field
  field.classList.add('border-red-500');
  
  // Create and append error message
  const errorMsg = document.createElement('p');
  errorMsg.className = 'text-red-500 text-xs mt-1 validation-error';
  errorMsg.textContent = message;
  
  field.parentNode.appendChild(errorMsg);
  
  // Focus the first field with error
  if (!document.querySelector('.border-red-500:focus')) {
    field.focus();
  }
}

// Clear all validation errors
function clearValidationErrors() {
  // Remove error classes from fields
  const errorFields = document.querySelectorAll('.border-red-500');
  errorFields.forEach(field => field.classList.remove('border-red-500'));
  
  // Remove error messages
  const errorMsgs = document.querySelectorAll('.validation-error');
  errorMsgs.forEach(msg => msg.remove());
}
