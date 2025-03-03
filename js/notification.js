/**
 * Notification system for Victor
 * Displays temporary toast-like notifications
 */

// Main function to show notifications
function showNotification(message, type = 'info', duration = 5000) {
  // Get or create notification container
  let container = document.getElementById('notification-container');
  
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    container.className = 'fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-2';
    document.body.appendChild(container);
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'transform transition-all duration-300 ease-in-out translate-x-full';
  notification.style.maxWidth = '24rem';
  
  // Set background color based on notification type
  let bgColor, icon;
  
  switch (type) {
    case 'success':
      bgColor = 'bg-green-50 border-green-500 text-green-800';
      icon = '<i class="fas fa-check-circle text-green-500"></i>';
      break;
    case 'error':
      bgColor = 'bg-red-50 border-red-500 text-red-800';
      icon = '<i class="fas fa-exclamation-circle text-red-500"></i>';
      break;
    case 'warning':
      bgColor = 'bg-yellow-50 border-yellow-500 text-yellow-800';
      icon = '<i class="fas fa-exclamation-triangle text-yellow-500"></i>';
      break;
    case 'info':
    default:
      bgColor = 'bg-blue-50 border-blue-500 text-blue-800';
      icon = '<i class="fas fa-info-circle text-blue-500"></i>';
  }
  
  // Set notification content
  notification.innerHTML = `
    <div class="rounded-lg shadow-lg overflow-hidden border-l-4 ${bgColor}">
      <div class="p-4 flex items-center">
        <div class="flex-shrink-0 mr-3">
          ${icon}
        </div>
        <div class="flex-1">
          <p class="text-sm">${message}</p>
        </div>
        <div class="ml-3 flex-shrink-0">
          <button type="button" class="inline-flex text-gray-400 hover:text-gray-500">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Add to container
  container.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.classList.remove('translate-x-full');
  }, 10);
  
  // Set up close button
  const closeButton = notification.querySelector('button');
  closeButton.addEventListener('click', () => {
    removeNotification(notification);
  });
  
  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      removeNotification(notification);
    }, duration);
  }
  
  // Helper function to remove notification with animation
  function removeNotification(notificationElement) {
    notificationElement.classList.add('translate-x-full');
    notificationElement.classList.add('opacity-0');
    
    setTimeout(() => {
      if (notificationElement.parentNode === container) {
        container.removeChild(notificationElement);
      }
    }, 300); // Match the duration of the transition
  }
}

// Make notification function available globally
window.showNotification = showNotification;
