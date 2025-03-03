/**
 * Signup functionality for Victor
 * Handles user registration and data validation
 */

document.addEventListener('DOMContentLoaded', function() {
  // Get form elements
  const signupForm = document.getElementById('signup-form');
  const fullnameInput = document.getElementById('fullname');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const termsCheckbox = document.getElementById('terms');
  const formMessage = document.getElementById('form-message');

  // Error elements
  const fullnameError = document.getElementById('fullname-error');
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');

  // Add form submission handler
  if (signupForm) {
    signupForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Reset error messages
      resetErrorMessages();
      
      // Get form values
      const fullname = fullnameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const termsAccepted = termsCheckbox.checked;
      
      // Validate form inputs
      let isValid = true;
      
      if (!fullname) {
        showError(fullnameError, 'Please enter your full name');
        isValid = false;
      } else if (fullname.length < 2) {
        showError(fullnameError, 'Name must be at least 2 characters long');
        isValid = false;
      }
      
      if (!email) {
        showError(emailError, 'Please enter your email address');
        isValid = false;
      } else if (!isValidEmail(email)) {
        showError(emailError, 'Please enter a valid email address');
        isValid = false;
      }
      
      if (!password) {
        showError(passwordError, 'Please create a password');
        isValid = false;
      } else if (password.length < 6) {
        showError(passwordError, 'Password must be at least 6 characters long');
        isValid = false;
      }
      
      if (!termsAccepted) {
        alert('Please accept the Terms of Service to continue');
        isValid = false;
      }
      
      // Submit data if valid
      if (isValid) {
        try {
          const response = await registerUser(fullname, email, password);
          handleRegistrationSuccess(response);
        } catch (error) {
          handleRegistrationError(error);
        }
      }
    });
  }
  
  /**
   * Register a new user
   * @param {string} fullname - User's full name
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Promise} Promise resolving to the API response
   */
  async function registerUser(fullname, email, password) {
    const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
    
    // Show loading state
    const submitButton = signupForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating account...';
    
    try {
      const response = await fetch(`${API_URL}/api/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullname,
          email,
          password
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      return data;
    } finally {
      // Restore button state
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonText;
    }
  }
  
  /**
   * Handle successful user registration
   * @param {Object} response - API response with user data and token
   */
  function handleRegistrationSuccess(response) {
    // Save auth data in localStorage
    localStorage.setItem('token', response.token);
    localStorage.setItem('userId', response.id);
    localStorage.setItem('username', response.fullname);
    
    // Hide the form
    signupForm.classList.add('hidden');
    
    // Show success message
    formMessage.classList.remove('hidden');
    formMessage.classList.add('bg-green-50', 'border', 'border-green-100');
    
    // Set success message content
    const messageContent = formMessage.querySelector('div');
    messageContent.innerHTML = `
      <p class="font-medium text-success">Account created successfully!</p>
      <p class="text-gray-600 mt-1">Welcome, ${response.fullname}! Redirecting you to the homepage...</p>
    `;
    
    // Redirect after a delay
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
  }
  
  /**
   * Handle registration error
   * @param {Error} error - The error that occurred
   */
  function handleRegistrationError(error) {
    console.error('Registration error:', error);
    
    // Show error message
    formMessage.classList.remove('hidden');
    formMessage.classList.add('bg-red-50', 'border', 'border-red-100');
    
    // Set error message content
    const messageContent = formMessage.querySelector('div');
    messageContent.innerHTML = `
      <i class="fas fa-exclamation-circle text-danger mr-3 text-2xl"></i>
      <div>
        <p class="font-medium text-danger">Registration failed</p>
        <p class="text-gray-600">${error.message || 'Please try again later'}</p>
      </div>
    `;
    
    if (error.message.includes('email already exists')) {
      // Highlight email field as error
      emailInput.classList.add('border-red-500');
      showError(emailError, 'This email is already registered');
      
      // Scroll to email field
      emailInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  
  /**
   * Reset all error messages
   */
  function resetErrorMessages() {
    const errorElements = [fullnameError, emailError, passwordError];
    const inputElements = [fullnameInput, emailInput, passwordInput];
    
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
