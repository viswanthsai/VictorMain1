// File: js/chat-notifications.js

/**
 * Chat Notification System
 * Handles loading and displaying unread chat message counts
 */
document.addEventListener('DOMContentLoaded', function() {
  // Only run for logged-in users
  if (!localStorage.getItem('token')) return;
  
  // Initialize chat notifications
  initializeChatNotifications();
  
  // Set up periodic refresh every 60 seconds
  setInterval(initializeChatNotifications, 60000);
});

/**
 * Initialize chat notifications and unread count
 */
function initializeChatNotifications() {
  const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
  const token = localStorage.getItem('token');
  
  // Update chat icon in desktop nav
  const chatCount = document.getElementById('chat-count');
  
  if (chatCount) {
    // First try loading from API
    fetch(`${API_URL}/api/chats/unread`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => response.json())
    .then(data => {
      updateChatCounter(data.unreadCount || 0);
    })
    .catch(error => {
      console.log("Using mock data for chat notifications");
      
      // Fallback to mock data if API fails
      if (typeof getMockChats === 'function') {
        const mockChats = getMockChats();
        const unreadCount = mockChats.reduce((total, chat) => {
          return total + (chat.unreadCount || 0);
        }, 0);
        updateChatCounter(unreadCount);
      }
    });
  }
}

/**
 * Update the chat counter badge in the header
 */
function updateChatCounter(count) {
  const chatCount = document.getElementById('chat-count');
  if (!chatCount) return;
  
  if (count > 0) {
    chatCount.textContent = count > 9 ? '9+' : count;
    chatCount.style.display = 'flex';
  } else {
    chatCount.style.display = 'none';
  }
}