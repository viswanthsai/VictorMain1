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

/**
 * Notification Handler
 * A simple notification system for displaying messages to users
 */

// Create the notifications container if it doesn't exist
document.addEventListener('DOMContentLoaded', function() {
  if (!document.getElementById('notifications-container')) {
    const container = document.createElement('div');
    container.id = 'notifications-container';
    container.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-3';
    document.body.appendChild(container);
  }
});

// Namespace for notification functionality
window.notifications = {
  /**
   * Display a notification
   * @param {string} message - The message to display
   * @param {string} type - Type of notification: 'success', 'error', 'warning', 'info'
   * @param {number} duration - Duration in milliseconds (default: 4000)
   */
  notify: function(message, type = 'info', duration = 4000) {
    // Get or create container
    let container = document.getElementById('notifications-container');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'notifications-container';
      container.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-3';
      document.body.appendChild(container);
    }
    
    // Create unique ID for this notification
    const id = 'notification-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.id = id;
    notification.className = `max-w-sm w-full p-4 rounded-lg shadow-lg transform translate-y-4 opacity-0 transition-all duration-300 ease-in-out ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      type === 'warning' ? 'bg-amber-500 text-white' : 
      'bg-blue-500 text-white' // info
    }`;
    
    // Set notification content
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
        <div class="ml-2 flex-1">${message}</div>
        <div class="ml-4 flex-shrink-0">
          <button type="button" class="text-white focus:outline-none" onclick="notifications.close('${id}')">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      ${duration > 0 ? `<div class="mt-2 w-full bg-white bg-opacity-30 rounded-full h-1">
        <div class="bg-white h-1 rounded-full progress-bar" style="width: 100%"></div>
      </div>` : ''}
    `;
    
    // Add to container
    container.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.classList.remove('translate-y-4', 'opacity-0');
    }, 10);
    
    // Animate progress bar
    if (duration > 0) {
      const progressBar = notification.querySelector('.progress-bar');
      if (progressBar) {
        progressBar.animate(
          [
            { width: '100%' },
            { width: '0%' }
          ],
          {
            duration: duration,
            easing: 'linear',
            fill: 'forwards'
          }
        );
      }
      
      // Auto-close after duration
      setTimeout(() => {
        this.close(id);
      }, duration);
    }
    
    // Return the notification ID
    return id;
  },
  
  /**
   * Close a specific notification
   * @param {string} id - The notification ID to close
   */
  close: function(id) {
    const notification = document.getElementById(id);
    
    if (notification) {
      // Animate out
      notification.classList.add('translate-y-4', 'opacity-0');
      
      // Remove after animation
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  },
  
  /**
   * Close all notifications
   */
  closeAll: function() {
    const container = document.getElementById('notifications-container');
    
    if (container) {
      const notifications = container.querySelectorAll('[id^="notification-"]');
      notifications.forEach(notification => {
        this.close(notification.id);
      });
    }
  }
};

// Shorthand methods for different notification types
window.notifications.success = function(message, duration) {
  return this.notify(message, 'success', duration);
};

window.notifications.error = function(message, duration) {
  return this.notify(message, 'error', duration);
};

window.notifications.warning = function(message, duration) {
  return this.notify(message, 'warning', duration);
};

window.notifications.info = function(message, duration) {
  return this.notify(message, 'info', duration);
};