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
  
  // Check for task posting success event
  checkTaskPostSuccess();
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

/**
 * Check for task post success and show popup if needed
 */
function checkTaskPostSuccess() {
  const taskPostSuccess = sessionStorage.getItem('taskPostSuccess');
  const taskId = sessionStorage.getItem('postedTaskId');
  
  if (taskPostSuccess && taskId) {
    // Clear session storage to prevent showing again on refresh
    sessionStorage.removeItem('taskPostSuccess');
    
    // Show the success popup
    showTaskSuccessPopup(taskId);
  }
}

/**
 * Show task success popup with option to go to task details
 */
function showTaskSuccessPopup(taskId) {
  // Create popup element
  const popup = document.createElement('div');
  popup.className = 'fixed bottom-4 right-4 bg-white rounded-lg shadow-xl p-6 max-w-md border border-green-100 z-50 animate-fade-in';
  popup.style.animation = 'fade-in 0.3s ease-out forwards';
  
  // Add success content
  popup.innerHTML = `
    <div class="flex items-start mb-4">
      <div class="bg-green-100 rounded-full p-2 mr-3">
        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
      <div class="flex-1">
        <h3 class="font-semibold text-lg text-gray-900">Task Posted Successfully!</h3>
        <p class="text-gray-600 mt-1">Your task has been posted and is now visible to potential workers.</p>
      </div>
      <button class="text-gray-400 hover:text-gray-600" id="close-success-popup">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
    <div class="flex space-x-3 mt-4">
      <a href="task-detail.html?id=${taskId}" class="flex-1 bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded font-medium text-center">
        View Task
      </a>
      <a href="dashboard.html" class="bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded font-medium text-center">
        Go to Dashboard
      </a>
    </div>
  `;
  
  // Add to body
  document.body.appendChild(popup);
  
  // Add close button functionality
  document.getElementById('close-success-popup').addEventListener('click', function() {
    popup.style.animation = 'fade-out 0.3s ease-out forwards';
    setTimeout(() => {
      popup.remove();
    }, 300);
  });
  
  // Add animation keyframes if needed
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fade-out {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(10px); }
    }
  `;
  document.head.appendChild(style);
  
  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (document.body.contains(popup)) {
      popup.style.animation = 'fade-out 0.3s ease-out forwards';
      setTimeout(() => {
        popup.remove();
      }, 300);
    }
  }, 10000);
}