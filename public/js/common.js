// Common JavaScript for all pages
document.addEventListener('DOMContentLoaded', function() {
  // Mobile menu toggle
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const navbarMenu = document.getElementById('navbar-menu');
  
  if (mobileMenuButton && navbarMenu) {
    mobileMenuButton.addEventListener('click', function() {
      navbarMenu.classList.toggle('hidden');
    });
  }
  
  // User dropdown toggle - Setup this regardless of auth state
  setupUserDropdown();
  
  // Check login status and update UI
  checkLoginStatus();
});

// Setup user dropdown function
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
  }
}

// Check login status and update UI accordingly
function checkLoginStatus() {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  
  const userMenuItem = document.getElementById('user-menu-item');
  const loginMenuItem = document.getElementById('login-menu-item');
  const signupMenuItem = document.getElementById('signup-menu-item');
  
  if (!token) {
    // User is not logged in
    if (userMenuItem) userMenuItem.classList.add('hidden');
    if (loginMenuItem) loginMenuItem.classList.remove('hidden');
    if (signupMenuItem) signupMenuItem.classList.remove('hidden');
    return false;
  }
  
  // User is logged in
  if (userMenuItem) userMenuItem.classList.remove('hidden');
  if (loginMenuItem) loginMenuItem.classList.add('hidden');
  if (signupMenuItem) signupMenuItem.classList.add('hidden');
  
  // Display username
  const usernameDisplay = document.getElementById('username-display');
  if (usernameDisplay && username) {
    usernameDisplay.textContent = username;
  }
  
  // Setup logout button
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', function(e) {
      e.preventDefault();
      logout();
    });
  }
  
  return true;
}

// Logout function
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('username');
  localStorage.removeItem('userEmail');
  window.location.href = 'index.html';
}