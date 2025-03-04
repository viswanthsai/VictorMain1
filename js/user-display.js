/**
 * User Display Utilities
 * Handles consistent username display across all pages
 */

// Execute when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  updateUserDisplay();
  
  // Make the function available globally
  window.updateUserDisplay = updateUserDisplay;
});

/**
 * Updates all username display elements across the page
 */
function updateUserDisplay() {
  // Get username and email from localStorage
  const username = localStorage.getItem('username') || 'User';
  const userEmail = localStorage.getItem('userEmail') || 'user@example.com';
  const isLoggedIn = !!localStorage.getItem('token');
  
  console.log('Updating user display with:', { username, userEmail, isLoggedIn });
  
  // Common elements across pages
  const userAvatar = document.getElementById('user-avatar');
  const usernameDisplay = document.getElementById('username-display');
  const userDropdown = document.getElementById('user-dropdown');
  const userNameDropdown = document.getElementById('user-name-dropdown');
  const userEmailDropdown = document.getElementById('user-email-dropdown');
  
  // Update username display in header
  if (usernameDisplay) {
    usernameDisplay.textContent = username;
  }
  
  // Update avatar with first letter
  if (userAvatar) {
    userAvatar.textContent = username.charAt(0).toUpperCase();
  }
  
  // Update dropdown user info
  if (userNameDropdown) {
    userNameDropdown.textContent = username;
  }
  
  // Update email in dropdown
  if (userEmailDropdown) {
    userEmailDropdown.textContent = userEmail;
  }
  
  // Update page-specific elements
  const profileName = document.getElementById('profile-name');
  const displayName = document.getElementById('display-name');
  const welcomeName = document.getElementById('welcome-name');
  
  if (profileName) profileName.textContent = username;
  if (displayName) displayName.textContent = username;
  if (welcomeName) welcomeName.textContent = username;
  
  // Toggle visibility of auth-related elements
  const authButtons = document.getElementById('auth-buttons');
  const userMenu = document.getElementById('user-menu-container');
  const mobileAuthLinks = document.getElementById('mobile-auth-links');
  const mobileUserLinks = document.getElementById('mobile-user-links');
  
  if (isLoggedIn) {
    if (authButtons) authButtons.classList.add('hidden');
    if (userMenu) userMenu.classList.remove('hidden');
    if (mobileAuthLinks) mobileAuthLinks.classList.add('hidden');
    if (mobileUserLinks) mobileUserLinks.classList.remove('hidden');
  } else {
    if (authButtons) authButtons.classList.remove('hidden');
    if (userMenu) userMenu.classList.add('hidden');
    if (mobileAuthLinks) mobileAuthLinks.classList.remove('hidden');
    if (mobileUserLinks) mobileUserLinks.classList.add('hidden');
  }
}