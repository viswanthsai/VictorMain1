// New file: js/chat-system.js

/**
 * Victor Chat System
 * Handles direct communication between task posters and performers
 */

class ChatSystem {
  constructor() {
    this.activeChats = [];
    this.unreadMessages = {};
    this.API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
  }

  // Initialize chat system
  async initialize() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      // Fetch user's active conversations
      const response = await fetch(`${this.API_URL}/api/chats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const chats = await response.json();
        this.activeChats = chats;
        this.updateChatUI();
        
        // Start polling for new messages
        this.startPolling();
      }
    } catch (error) {
      console.error('Failed to initialize chat system:', error);
    }
  }
  
  // Open chat based on task and offer
  async openChatFromOffer(taskId, offerId, recipientId) {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      // Create or get chat channel
      const response = await fetch(`${this.API_URL}/api/chats/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          taskId,
          offerId,
          recipientId
        })
      });
      
      if (response.ok) {
        const chatData = await response.json();
        
        // Open chat interface
        this.showChatInterface(chatData.chatId);
        
        return chatData;
      }
    } catch (error) {
      console.error('Failed to open chat from offer:', error);
    }
  }
  
  // Show chat interface
  showChatInterface(chatId) {
    // Redirect to chat page or open chat modal
    window.location.href = `chat.html?id=${chatId}`;
  }
  
  // Update chat UI elements
  updateChatUI() {
    const unreadCount = Object.values(this.unreadMessages).reduce((sum, count) => sum + count, 0);
    
    // Update chat icon in header with unread count
    const chatCountBadge = document.getElementById('chat-count');
    if (chatCountBadge) {
      chatCountBadge.textContent = unreadCount > 0 ? unreadCount : '';
      chatCountBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
    
    // Update chat dropdown if present
    const chatDropdown = document.getElementById('chat-dropdown');
    if (chatDropdown) {
      this.populateChatDropdown(chatDropdown);
    }
  }
  
  // Populate chat dropdown with recent conversations
  populateChatDropdown(container) {
    if (this.activeChats.length === 0) {
      container.innerHTML = '<div class="p-4 text-center text-gray-500">No active conversations</div>';
      return;
    }
    
    let html = '';
    this.activeChats.forEach(chat => {
      const unread = this.unreadMessages[chat.id] || 0;
      
      html += `
        <a href="chat.html?id=${chat.id}" class="block px-4 py-3 hover:bg-gray-50 border-b border-gray-100 ${unread > 0 ? 'bg-blue-50' : ''}">
          <div class="flex items-start">
            <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-500 text-white flex items-center justify-center font-bold mr-3">
              ${chat.otherUser.name.charAt(0).toUpperCase()}
            </div>
            <div class="flex-grow">
              <div class="flex justify-between">
                <p class="font-medium text-gray-900">${chat.otherUser.name}</p>
                <p class="text-xs text-gray-500">${this.formatTime(chat.lastMessage.timestamp)}</p>
              </div>
              <p class="text-sm text-gray-600 truncate">${chat.lastMessage.text}</p>
              <p class="text-xs text-gray-500 mt-1">Task: ${chat.taskTitle}</p>
            </div>
            ${unread > 0 ? `<span class="bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">${unread}</span>` : ''}
          </div>
        </a>
      `;
    });
    
    container.innerHTML = html;
  }
  
  // Format timestamp for display
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    return date.toLocaleDateString();
  }
  
  // Start polling for new messages
  startPolling() {
    setInterval(() => this.checkNewMessages(), 10000); // Check every 10 seconds
  }
  
  // Check for new messages
  async checkNewMessages() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const response = await fetch(`${this.API_URL}/api/chats/unread`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.unreadMessages = data.unread;
        this.updateChatUI();
      }
    } catch (error) {
      console.error('Failed to check new messages:', error);
    }
  }
}

// Initialize the global chat system
window.ChatSystem = new ChatSystem();
document.addEventListener('DOMContentLoaded', () => window.ChatSystem.initialize());