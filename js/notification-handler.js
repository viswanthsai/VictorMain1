/**
 * Notification Handler
 * Handles notifications across the application
 */

// Make functions available globally
window.fetchNotifications = fetchNotifications;
window.updateUserDisplay = updateUserDisplay;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
  fetchNotifications();
  updateUserDisplay();
  
  // Set up polling for notifications
  setInterval(fetchNotifications, 60000); // Check for new notifications every minute
});

// Update user display information
function updateUserDisplay() {
  const username = localStorage.getItem('username') || 'User';
  const userEmail = localStorage.getItem('userEmail') || 'user@example.com';
  const userId = localStorage.getItem('userId');
  const isLoggedIn = !!localStorage.getItem('token');
  
  console.log('Updating user display with:', { username, userEmail, isLoggedIn });
  
  // Update username displays
  document.querySelectorAll('#username-display').forEach(el => {
    if (el) el.textContent = username;
  });
  
  // Update user avatar displays
  document.querySelectorAll('#user-avatar').forEach(el => {
    if (el && username) el.textContent = username.charAt(0).toUpperCase();
  });
  
  // Update user email displays
  document.querySelectorAll('#user-email-dropdown').forEach(el => {
    if (el) el.textContent = userEmail;
  });
  
  // Update dropdown username displays
  document.querySelectorAll('#user-name-dropdown').forEach(el => {
    if (el) el.textContent = username;
  });
  
  // Toggle auth-related elements visibility
  toggleAuthElements(isLoggedIn);
}

// Toggle auth elements visibility
function toggleAuthElements(isLoggedIn) {
  if (isLoggedIn) {
    document.querySelectorAll('#auth-buttons').forEach(el => el?.classList.add('hidden'));
    document.querySelectorAll('#user-menu-container, #user-menu-item').forEach(el => el?.classList.remove('hidden'));
    document.querySelectorAll('#mobile-auth-links').forEach(el => el?.classList.add('hidden'));
    document.querySelectorAll('#mobile-user-links').forEach(el => el?.classList.remove('hidden'));
  } else {
    document.querySelectorAll('#auth-buttons').forEach(el => el?.classList.remove('hidden'));
    document.querySelectorAll('#user-menu-container, #user-menu-item').forEach(el => el?.classList.add('hidden'));
    document.querySelectorAll('#mobile-auth-links').forEach(el => el?.classList.remove('hidden'));
    document.querySelectorAll('#mobile-user-links').forEach(el => el?.classList.add('hidden'));
  }
}

// Fetch user notifications
function fetchNotifications() {
  const token = localStorage.getItem('token');
  if (!token) return Promise.resolve([]);
  
  const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
  
  return fetch(`${API_URL}/api/notifications`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return response.json();
  })
  .then(notifications => {
    updateNotificationUI(notifications);
    
    // Check for offer accepted notifications and refresh accepted tasks
    const hasOfferAcceptedNotification = notifications.some(n => 
      n.type === 'offer_accepted' && !n.read
    );
    
    if (hasOfferAcceptedNotification && window.location.href.includes('dashboard.html')) {
      console.log('Offer accepted notification detected, refreshing tasks...');
      if (typeof fetchTasks === 'function') {
        fetchTasks();
      }
    }
    
    return notifications;
  })
  .catch(error => {
    console.error('Error fetching notifications:', error);
    return [];
  });
}

// Update notification UI elements
function updateNotificationUI(notifications) {
  // Update notification count badge
  const unreadCount = notifications.filter(n => !n.read).length;
  document.querySelectorAll('#notifications-count').forEach(badge => {
    if (!badge) return;
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? 'flex' : 'none';
  });
  
  // Update notification dropdown content
  document.querySelectorAll('#notifications-container, .max-h-64').forEach(container => {
    if (!container) return;
    
    if (!notifications || notifications.length === 0) {
      container.innerHTML = '<div class="text-center py-4 text-gray-500">No notifications yet</div>';
      return;
    }
    
    // Generate notification HTML
    let html = '';
    notifications.forEach(notification => {
      html += createNotificationItem(notification);
    });
    
    container.innerHTML = html;
  });
}

// Create a single notification item HTML
function createNotificationItem(notification) {
  const timeAgo = getTimeAgo(new Date(notification.createdAt));
  let link = '#';
  let icon = 'fa-bell';
  let title = 'Notification';
  
  // Set appropriate links and icons based on notification type
  if (notification.type === 'offer_accepted') {
    link = `task-detail.html?id=${notification.taskId}`;
    icon = 'fa-check-circle';
    title = 'Offer Accepted';
  } else if (notification.type === 'new_offer') {
    link = `task-detail.html?id=${notification.taskId}`;
    icon = 'fa-handshake';
    title = 'New Offer Received';
  }
  
  return `
    <a href="${link}" class="block px-4 py-3 hover:bg-gray-50 border-b border-gray-100 ${notification.read ? '' : 'bg-blue-50'}">
      <div class="flex items-start">
        <div class="flex-shrink-0 mr-3">
          <i class="fas ${icon} ${notification.read ? 'text-gray-400' : 'text-primary'}"></i>
        </div>
        <div class="flex-grow">
          <p class="font-medium text-gray-900">${title}</p>
          <p class="text-sm text-gray-600">${notification.message}</p>
          <p class="text-xs text-gray-500 mt-1">${timeAgo}</p>
        </div>
      </div>
    </a>
  `;
}

// Calculate time ago for notifications
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);
  
  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays < 30) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  
  return date.toLocaleDateString();
}

// Mark notification as read
function markNotificationAsRead(notificationId) {
  const token = localStorage.getItem('token');
  if (!token) return Promise.resolve(false);
  
  const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
  
  return fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to mark notification as read');
    return true;
  })
  .catch(error => {
    console.error('Error marking notification as read:', error);
    return false;
  });
}