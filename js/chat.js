/**
 * Chat Functionality for Victor
 * Enables chat features across the platform
 */

document.addEventListener('DOMContentLoaded', function() {
  // Check if chat icon exists, add click handler
  const chatIcon = document.querySelector('.chat-icon');
  if (chatIcon) {
    chatIcon.addEventListener('click', function() {
      // Check if user is logged in
      if (!localStorage.getItem('token')) {
        window.location.href = 'login.html?redirect=messages.html';
        return;
      }
      window.location.href = 'messages.html';
    });
  }
  
  // Check if we're on chat page and need to update unread counts
  checkUnreadMessages();
});

/**
 * Check for unread messages and update badge count
 */
async function checkUnreadMessages() {
  const token = localStorage.getItem('token');
  if (!token) return;
  
  try {
    const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
    
    const response = await fetch(`${API_URL}/api/chats/unread`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      updateChatBadge(data.unreadCount);
    }
  } catch (error) {
    console.error('Error checking unread messages:', error);
  }
}

/**
 * Update chat notification badge with count
 */
function updateChatBadge(count) {
  const chatCount = document.getElementById('chat-count');
  if (chatCount) {
    if (count > 0) {
      chatCount.textContent = count > 99 ? '99+' : count;
      chatCount.style.display = 'flex';
    } else {
      chatCount.style.display = 'none';
    }
  }
}

/**
 * Open chat with a specific user
 */
function openChatWithUser(userId) {
  if (!userId) return;
  
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = `login.html?redirect=chat.html?recipientId=${userId}`;
    return;
  }
  
  window.location.href = `chat.html?recipientId=${userId}`;
}

/**
 * Open chat for a specific task
 */
function openChatForTask(taskId, recipientId) {
  if (!taskId || !recipientId) return;
  
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = `login.html?redirect=chat.html?taskId=${taskId}&recipientId=${recipientId}`;
    return;
  }
  
  window.location.href = `chat.html?taskId=${taskId}&recipientId=${recipientId}`;
}

// Set up interval to periodically check for new messages
if (localStorage.getItem('token')) {
  setInterval(checkUnreadMessages, 60000); // Check every minute
}
