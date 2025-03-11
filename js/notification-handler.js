/**
 * Notification Handler
 * Handles loading and displaying notifications
 */

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in before attempting to fetch notifications
  const token = localStorage.getItem('token');
  if (token) {
    loadNotifications();
    
    // Update notification count periodically
    setInterval(loadNotifications, 60000); // Every minute
  } else {
    console.log('User not logged in - skipping notification loading');
  }
  
  // Update user display regardless of login state
  updateUserDisplay();
});

/**
 * Update user display in header
 */
function updateUserDisplay() {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  const userEmail = localStorage.getItem('userEmail');
  const userId = localStorage.getItem('userId');
  
  console.log('Updating user display with:', { token: token ? 'exists' : 'missing', username, userEmail, userId });
  
  // Update elements based on login state
  updateHeaderElements(token, username, userEmail);
}

/**
 * Update header elements based on login state
 */
function updateHeaderElements(token, username, userEmail) {
  const authButtons = document.getElementById('auth-buttons');
  const userMenuContainer = document.getElementById('user-menu-container');
  const mobileAuthLinks = document.getElementById('mobile-auth-links');
  const mobileUserLinks = document.getElementById('mobile-user-links');
  
  if (token) {
    // User is logged in
    if (authButtons) authButtons.classList.add('hidden');
    if (userMenuContainer) userMenuContainer.classList.remove('hidden');
    if (mobileAuthLinks) mobileAuthLinks.classList.add('hidden');
    if (mobileUserLinks) mobileUserLinks.classList.remove('hidden');
    
    // Update user info
    const usernameDisplay = document.getElementById('username-display');
    const userNameDropdown = document.getElementById('user-name-dropdown');
    const userEmailDropdown = document.getElementById('user-email-dropdown');
    const userAvatar = document.getElementById('user-avatar');
    
    if (usernameDisplay && username) usernameDisplay.textContent = username;
    if (userNameDropdown && username) userNameDropdown.textContent = username;
    if (userEmailDropdown && userEmail) userEmailDropdown.textContent = userEmail;
    if (userAvatar && username) userAvatar.textContent = username.charAt(0).toUpperCase();
  } else {
    // User is not logged in
    if (authButtons) authButtons.classList.remove('hidden');
    if (userMenuContainer) userMenuContainer.classList.add('hidden');
    if (mobileAuthLinks) mobileAuthLinks.classList.remove('hidden');
    if (mobileUserLinks) mobileUserLinks.classList.add('hidden');
  }
}

/**
 * Load notifications from API with better error handling
 */
async function loadNotifications() {
  const token = localStorage.getItem('token');
  if (!token) return;
  
  try {
    const apiUrl = window.getApiUrl ? window.getApiUrl() : 
                  (window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${apiUrl}/api/notifications`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.status === 403) {
      // Token might be expired - don't show an error
      console.log('Notification access forbidden (403) - token may be expired');
      return;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch notifications: ${response.status}`);
    }
    
    const notifications = await response.json();
    updateNotificationsUI(notifications);
    
  } catch (error) {
    // Only log the error, don't show to user
    console.error('Error fetching notifications:', error);
  }
}

/**
 * Update notifications UI with fetched notifications
 */
function updateNotificationsUI(notifications) {
  const notificationsContainer = document.getElementById('notifications-container');
  const notificationsCount = document.getElementById('notifications-count');
  
  if (!notificationsContainer) return;
  
  // Filter out read notifications
  const unreadNotifications = notifications.filter(notif => !notif.read);
  
  // Update count badge
  if (notificationsCount) {
    if (unreadNotifications.length > 0) {
      notificationsCount.textContent = unreadNotifications.length > 9 ? '9+' : unreadNotifications.length;
      notificationsCount.style.display = 'flex';
    } else {
      notificationsCount.style.display = 'none';
    }
  }
  
  // Update notifications dropdown
  if (notifications.length === 0) {
    notificationsContainer.innerHTML = '<div class="text-center py-4 text-gray-500">No notifications yet</div>';
    return;
  }
  
  // Sort notifications by date (newest first)
  notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Only show the latest 10 notifications
  const recentNotifications = notifications.slice(0, 10);
  
  // Clear container
  notificationsContainer.innerHTML = '';
  
  // Add notifications
  recentNotifications.forEach(notification => {
    const notificationElement = createNotificationElement(notification);
    notificationsContainer.appendChild(notificationElement);
  });
}

/**
 * Create notification element
 */
function createNotificationElement(notification) {
  const div = document.createElement('div');
  div.className = `p-3 ${notification.read ? 'bg-white' : 'bg-blue-50'} border-b border-gray-100 hover:bg-gray-50 transition-colors`;
  
  // Format date
  const date = new Date(notification.createdAt);
  const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  div.innerHTML = `
    <div>
      <p class="text-sm font-medium ${notification.read ? 'text-gray-700' : 'text-blue-700'}">${notification.title || 'Notification'}</p>
      <p class="text-xs text-gray-500 mt-1">${notification.message || ''}</p>
    </div>
    <div class="flex items-center justify-between mt-2">
      <span class="text-xs text-gray-400">${formattedDate}</span>
      <button class="text-xs text-primary hover:text-primary-dark hover:underline" data-notification-id="${notification.id || notification._id}">Mark as read</button>
    </div>
  `;
  
  const markAsReadBtn = div.querySelector('button');
  if (markAsReadBtn) {
    markAsReadBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      markNotificationAsRead(notification.id || notification._id);
    });
  }
  
  return div;
}

/**
 * Mark notification as read
 */
async function markNotificationAsRead(notificationId) {
  const token = localStorage.getItem('token');
  if (!token) return;
  
  try {
    const apiUrl = window.getApiUrl ? window.getApiUrl() : 
                  (window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000');
    
    await fetch(`${apiUrl}/api/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Reload notifications
    loadNotifications();
    
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

// Export functions for use in other files
if (typeof window !== 'undefined') {
  window.NotificationHandler = {
    loadNotifications,
    updateUserDisplay,
    markNotificationAsRead
  };
}