/**
 * Chat Bridge
 * Connect task details to chat functionality
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('Chat bridge initialized');
  
  // Check for message-poster buttons that need event handlers
  const messagePosterButtons = document.querySelectorAll('[data-action="message-poster"]');
  messagePosterButtons.forEach(button => {
    const taskId = button.getAttribute('data-task-id');
    const userId = button.getAttribute('data-user-id');
    
    if (taskId && userId) {
      button.addEventListener('click', function() {
        openChatWithTaskPoster(taskId, userId);
      });
    }
  });
  
  // Also handle the main message-poster-btn if it exists
  const mainMessageButton = document.getElementById('message-poster-btn');
  if (mainMessageButton) {
    // Data should already be in the DOM, but we'll make sure in the handler
    mainMessageButton.addEventListener('click', function() {
      const taskId = getTaskIdFromUrl();
      const userId = mainMessageButton.getAttribute('data-user-id') || 
                     document.querySelector('[data-poster-id]')?.getAttribute('data-poster-id');
      
      if (taskId && userId) {
        openChatWithTaskPoster(taskId, userId);
      } else {
        console.error('Missing task ID or user ID for messaging');
        alert('Could not start chat. Missing information.');
      }
    });
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
 * Open chat with task poster
 */
function openChatWithTaskPoster(taskId, userId) {
  // Check if user is logged in
  if (!localStorage.getItem('token')) {
    // Redirect to login with return URL
    window.location.href = `login.html?redirect=task-detail.html?id=${taskId}`;
    return;
  }
  
  // Get task title if available
  const taskTitle = document.getElementById('task-title')?.textContent || 'this task';
  
  // Default message
  const message = `Hi, I'm interested in your task: "${taskTitle}". Can we discuss this further?`;
  
  // Different approaches depending on available APIs
  if (window.ChatSystem && typeof window.ChatSystem.contactUserAboutTask === 'function') {
    // Use the chat system's method
    window.ChatSystem.contactUserAboutTask(taskId, userId, message)
      .then(chatId => {
        window.location.href = `chat.html?id=${chatId}`;
      })
      .catch(error => {
        console.error('Error opening chat:', error);
        // Fallback - just redirect
        window.location.href = `chat.html?taskId=${taskId}&recipientId=${userId}`;
      });
  } else if (window.openChatForTask && typeof window.openChatForTask === 'function') {
    // Use global function if available
    window.openChatForTask(taskId, userId);
  } else {
    // Basic fallback - just redirect
    window.location.href = `chat.html?taskId=${taskId}&recipientId=${userId}`;
  }
}

/**
 * Send offer to task poster and open chat
 */
function sendOfferAndOpenChat(taskId, userId, offerDetails) {
  // Check if user is logged in
  if (!localStorage.getItem('token')) {
    // Redirect to login with return URL
    window.location.href = `login.html?redirect=task-detail.html?id=${taskId}`;
    return;
  }
  
  // Different approaches depending on available APIs
  if (window.ChatSystem && typeof window.ChatSystem.contactUserAboutTask === 'function') {
    // Use the chat system's method
    const offerMessage = `I'm offering ₹${offerDetails.price} to complete "${offerDetails.taskTitle}" in ${offerDetails.timeline} days. ${offerDetails.message}`;
    
    window.ChatSystem.contactUserAboutTask(taskId, userId, offerMessage)
      .then(chatId => {
        window.location.href = `chat.html?id=${chatId}`;
      })
      .catch(error => {
        console.error('Error opening chat:', error);
        // Fallback to simple redirect
        window.location.href = `chat.html?taskId=${taskId}&recipientId=${userId}`;
      });
  } else {
    // Basic fallback - just redirect
    window.location.href = `chat.html?taskId=${taskId}&recipientId=${userId}`;
  }
}

// Make function globally available
window.openChatWithTaskPoster = openChatWithTaskPoster;
window.sendOfferAndOpenChat = sendOfferAndOpenChat;
