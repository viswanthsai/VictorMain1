/**
 * Notification System
 * Handles displaying and managing notifications across the platform
 */

const NotificationSystem = {
  container: null,
  
  // Initialize notification system
  init() {
    // Create notification container if it doesn't exist
    this.container = document.getElementById('notification-container');
    
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      this.container.className = 'fixed bottom-4 right-4 z-50 flex flex-col items-end';
      document.body.appendChild(this.container);
    }
    
    // Set up notification dropdown
    this.setupDropdown();
    
    // Check for notifications from server
    this.fetchNotifications();
  },
  
  // Set up notification dropdown
  setupDropdown() {
    const button = document.getElementById('notification-button');
    const dropdown = document.getElementById('notifications-dropdown');
    
    if (!button || !dropdown) return;
    
    // Toggle dropdown
    button.addEventListener('click', () => {
      dropdown.classList.toggle('hidden');
      
      // Mark notifications as read when opening dropdown
      if (!dropdown.classList.contains('hidden')) {
        this.markAllAsRead();
      }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
      if (!button.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.classList.add('hidden');
      }
    });
  },
  
  // Fetch notifications from server
  async fetchNotifications() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
    
    try {
      const response = await fetch(`${API_URL}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const notifications = await response.json();
        this.updateNotificationUI(notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
    
    // Poll for new notifications every minute
    setTimeout(() => this.fetchNotifications(), 60000);
  },
  
  // Update notification UI
  updateNotificationUI(notifications) {
    // Update notification count badge
    const unreadCount = notifications.filter(n => !n.read).length;
    const countBadge = document.getElementById('notifications-count');
    
    if (countBadge) {
      countBadge.textContent = unreadCount;
      countBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
    
    // Update notification dropdown
    const dropdown = document.getElementById('notifications-dropdown');
    if (!dropdown) return;
    
    const contentArea = dropdown.querySelector('.max-h-64');
    if (!contentArea) return;
    
    if (notifications.length === 0) {
      contentArea.innerHTML = `
        <div class="text-center py-6 text-gray-500">No notifications yet</div>
      `;
      return;
    }
    
    // Generate HTML for notifications
    let html = '';
    notifications.forEach(notification => {
      const timeAgo = this.getTimeAgo(new Date(notification.createdAt));
      
      // Determine link based on notification type
      let link = '#';
      if (notification.taskId) {
        link = `task-detail.html?id=${notification.taskId}`;
      } else if (notification.chatId) {
        link = `chat.html?id=${notification.chatId}`;
      }
      
      // Notification icon based on type
      let icon = 'fas fa-bell';
      let bgClass = notification.read ? '' : 'bg-blue-50';
      
      switch (notification.type) {
        case 'message':
          icon = 'fas fa-envelope';
          break;
        case 'offer_accepted':
          icon = 'fas fa-check-circle';
          break;
        case 'offer_received':
          icon = 'fas fa-hand-paper';
          break;
        case 'task_completed':
          icon = 'fas fa-clipboard-check';
          break;
        case 'task_reminder':
          icon = 'fas fa-clock';
          break;
      }
      
      html += `
        <a href="${link}" class="block px-4 py-3 hover:bg-gray-50 border-b border-gray-100 ${bgClass}">
          <div class="flex">
            <div class="mr-3 text-blue-500">
              <i class="${icon}"></i>
            </div>
            <div class="flex-grow">
              <p class="font-medium text-gray-900">${this.getNotificationTitle(notification)}</p>
              <p class="text-sm text-gray-600">${notification.message}</p>
              <p class="text-xs text-gray-500 mt-1">${timeAgo}</p>
            </div>
          </div>
        </a>
      `;
    });
    
    contentArea.innerHTML = html;
  },
  
  // Get friendly title based on notification type
  getNotificationTitle(notification) {
    switch (notification.type) {
      case 'message':
        return 'New message';
      case 'offer_accepted':
        return 'Offer accepted!';
      case 'offer_received':
        return 'New offer received';
      case 'task_completed':
        return 'Task completed';
      case 'task_reminder':
        return 'Task reminder';
      default:
        return 'Notification';
    }
  },
  
  // Get time ago string
  getTimeAgo(date) {
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
  },
  
  // Mark all notifications as read
  async markAllAsRead() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
    
    try {
      await fetch(`${API_URL}/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Update UI - set all notifications to read
      const countBadge = document.getElementById('notifications-count');
      if (countBadge) {
        countBadge.style.display = 'none';
      }
      
      // Remove highlight from notifications
      const notifications = document.querySelectorAll('#notifications-dropdown .bg-blue-50');
      notifications.forEach(elem => elem.classList.remove('bg-blue-50'));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  },
  
  // Show notification
  show(message, type = 'info', duration = 5000) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'mb-3 p-4 rounded-lg shadow-lg flex items-center max-w-xs animate-fade-in';
    
    // Set style based on type
    switch (type) {
      case 'success':
        notification.classList.add('bg-green-50', 'text-green-800', 'border', 'border-green-200');
        break;
      case 'error':
        notification.classList.add('bg-red-50', 'text-red-800', 'border', 'border-red-200');
        break;
      case 'warning':
        notification.classList.add('bg-yellow-50', 'text-yellow-800', 'border', 'border-yellow-200');
        break;
      default: // info
        notification.classList.add('bg-blue-50', 'text-blue-800', 'border', 'border-blue-200');
    }
    
    // Set icon based on type
    const icon = 
      type === 'success' ? 'fas fa-check-circle text-green-500' :
      type === 'error' ? 'fas fa-exclamation-circle text-red-500' :
      type === 'warning' ? 'fas fa-exclamation-triangle text-yellow-500' :
      'fas fa-info-circle text-blue-500';
    
    // Build notification content
    notification.innerHTML = `
      <i class="${icon} mr-2 text-lg"></i>
      <div class="flex-1">${message}</div>
      <button class="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    // Add to container
    this.container.appendChild(notification);
    
    // Add close button functionality
    notification.querySelector('button').addEventListener('click', () => {
      this.close(notification);
    });
    
    // Auto-close after duration
    if (duration > 0) {
      setTimeout(() => {
        this.close(notification);
      }, duration);
    }
    
    return notification;
  },
  
  // Close notification with animation
  close(notification) {
    notification.classList.add('opacity-0', 'transition-opacity', 'duration-300');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  NotificationSystem.init();
});

// Make it globally available
window.showNotification = (message, type, duration) => {
  return NotificationSystem.show(message, type, duration);
};
