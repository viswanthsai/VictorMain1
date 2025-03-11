/**
 * Chat Integration
 * Provides simplified chat functionality for task detail page
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('Chat integration loaded');
  
  // Get message button if it exists
  const messageBtn = document.getElementById('message-poster-btn');
  if (messageBtn) {
    // Add click handler if not already present
    if (!messageBtn.getAttribute('data-has-handler')) {
      messageBtn.setAttribute('data-has-handler', 'true');
      
      messageBtn.addEventListener('click', function() {
        const taskId = getTaskIdFromUrl();
        const userId = messageBtn.getAttribute('data-user-id');
        
        if (taskId && userId) {
          initiateChat(taskId, userId);
        } else {
          console.error('Missing task ID or user ID for chat');
        }
      });
    }
  }
});

/**
 * Get task ID from URL parameters
 */
function getTaskIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

/**
 * Initiate chat with task poster
 */
function initiateChat(taskId, recipientId) {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = `login.html?redirect=task-detail.html?id=${taskId}`;
    return;
  }
  
  // Redirect to chat page with parameters
  window.location.href = `chat.html?taskId=${taskId}&recipientId=${recipientId}`;
}

// Export for global use
window.ChatIntegration = {
  initiateChat
};
