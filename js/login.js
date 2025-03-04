/**
 * Login functionality for Victor
 * Handles user authentication using users.json data
 */

document.addEventListener('DOMContentLoaded', function() {
  // Get form elements
  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const formMessage = document.getElementById('form-message');
  
  // Error elements
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');
  
  // Check for redirect URL and message from query params
  const urlParams = new URLSearchParams(window.location.search);
  const redirectUrl = urlParams.get('redirect');
  const message = urlParams.get('message');
  
  // Show message if present
  if (message) {
    if (window.showNotification) {
      showNotification(decodeURIComponent(message), 'info');
    } else {
      alert(decodeURIComponent(message));
    }
  }
  
  // Add form submission handler
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Reset error messages
      resetErrorMessages();
      
      // Get form values
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const rememberMe = document.getElementById('remember').checked;
      
      // Validate form inputs
      let isValid = true;
      
      if (!email) {
        showError(emailError, 'Please enter your email address');
        isValid = false;
      } else if (!isValidEmail(email)) {
        showError(emailError, 'Please enter a valid email address');
        isValid = false;
      }
      
      if (!password) {
        showError(passwordError, 'Please enter your password');
        isValid = false;
      }
      
      // Submit data if valid
      if (isValid) {
        try {
          const response = await loginUser(email, password);
          handleLoginSuccess(response, rememberMe);
        } catch (error) {
          handleLoginError(error);
        }
      }
    });
  }
  
  /**
   * Login a user
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Promise} Promise resolving to the API response
   */
  async function loginUser(email, password) {
    const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
    
    // Show loading state
    const submitButton = loginForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Logging in...';
    
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      return data;
    } finally {
      // Restore button state
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonText;
    }
  }
  
  /**
   * Handle successful user login
   * @param {Object} response - API response with user data and token
   * @param {boolean} rememberMe - Whether to remember login
   */
  function handleLoginSuccess(response) {
    // Save auth data in localStorage
    localStorage.setItem('token', response.token);
    localStorage.setItem('userId', response.id);
    localStorage.setItem('username', response.fullname);
    
    // After successful login
    localStorage.setItem('token', response.token);
    localStorage.setItem('userId', response.userId);
    localStorage.setItem('username', response.username);
    localStorage.setItem('userEmail', response.email); // Add this line

    // Update UI immediately
    if (window.updateUserDisplay) {
      window.updateUserDisplay();
    }
    
    // Hide the form
    loginForm.classList.add('hidden');
    
    // Show success message
    formMessage.classList.remove('hidden');
    formMessage.classList.add('bg-green-50', 'border', 'border-green-100');
    
    // Set success message content
    const messageContent = formMessage.querySelector('div');
    messageContent.innerHTML = `
      <p class="font-medium text-success">Login successful!</p>
      <p class="text-gray-600 mt-1">Welcome back, ${response.fullname}! Redirecting you...</p>
    `;
    
    // Redirect after a delay
    setTimeout(() => {
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        window.location.href = 'index.html';
      }
    }, 1500);
  }
  
  /**
   * Handle login error
   * @param {Error} error - The error that occurred
   */
  function handleLoginError(error) {
    console.error('Login error:', error);
    
    // Show error message using notification if available
    if (window.showNotification) {
      showNotification(error.message || 'Login failed. Please check your credentials.', 'error');
    } else {
      // Fallback to form message
      formMessage.classList.remove('hidden');
      formMessage.classList.add('bg-red-50', 'border', 'border-red-100');
      
      // Set error message content
      const messageContent = formMessage.querySelector('div');
      messageContent.innerHTML = `
        <i class="fas fa-exclamation-circle text-danger mr-3 text-2xl"></i>
        <div>
          <p class="font-medium text-danger">Login failed</p>
          <p class="text-gray-600">${error.message || 'Please check your credentials'}</p>
        </div>
      `;
    }
    
    // Highlight password field for invalid password error
    if (error.message.includes('password') || error.message.includes('credentials')) {
      passwordInput.classList.add('border-red-500');
      showError(passwordError, 'Invalid password');
    }
    
    // Highlight email field for user not found error
    if (error.message.includes('not found') || error.message.includes('user')) {
      emailInput.classList.add('border-red-500');
      showError(emailError, 'Email not registered');
    }
  }
  
  /**
   * Reset all error messages
   */
  function resetErrorMessages() {
    const errorElements = [emailError, passwordError];
    const inputElements = [emailInput, passwordInput];
    
    formMessage.classList.add('hidden');
    
    errorElements.forEach(elem => {
      if (elem) {
        elem.textContent = '';
        elem.classList.add('hidden');
      }
    });
    
    inputElements.forEach(input => {
      if (input) {
        input.classList.remove('border-red-500');
      }
    });
  }
  
  /**
   * Show an error message
   * @param {HTMLElement} element - The element to show the error in
   * @param {string} message - The error message
   */
  function showError(element, message) {
    if (element) {
      element.textContent = message;
      element.classList.remove('hidden');
      
      // Add error styling to the corresponding input
      const inputId = element.id.replace('-error', '');
      const inputElement = document.getElementById(inputId);
      if (inputElement) {
        inputElement.classList.add('border-red-500');
      }
    }
  }
  
  /**
   * Validate email format
   * @param {string} email - The email to validate
   * @returns {boolean} Whether the email is valid
   */
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
});
