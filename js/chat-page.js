/**
 * Chat Page Controller
 * Handles the chat interface functionality
 */

document.addEventListener('DOMContentLoaded', function() {
  // Get chat ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const chatId = urlParams.get('id');
  const taskId = urlParams.get('taskId');
  const recipientId = urlParams.get('recipientId');
  
  // Check login status first
  if (!localStorage.getItem('token')) {
    const redirectUrl = chatId ? 
      `login.html?redirect=chat.html?id=${chatId}` : 
      `login.html?redirect=chat.html?taskId=${taskId}&recipientId=${recipientId}`;
    window.location.href = redirectUrl;
    return;
  }
  
  // If we have chatId, initialize chat directly
  if (chatId) {
    initializeChat(chatId);
  } 
  // If we have taskId and recipientId, create or get existing chat
  else if (taskId && recipientId) {
    createOrGetChat(taskId, recipientId);
  } 
  // If no parameters, redirect to messages page
  else {
    window.location.href = 'messages.html';
    return;
  }
  
  // Setup mobile chat list toggle
  const showChatsBtn = document.getElementById('show-chats-btn');
  const chatSidebar = document.querySelector('.chat-sidebar');
  
  if (showChatsBtn && chatSidebar) {
    showChatsBtn.addEventListener('click', () => {
      chatSidebar.classList.toggle('chat-sidebar-active');
      document.querySelector('.chat-sidebar-backdrop')?.classList.toggle('active');
    });
  }
  
  // Setup message form
  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('message-input');
  
  if (messageForm && messageInput) {
    // Auto-resize textarea
    messageInput.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight) + 'px';
      // Max height
      if (this.scrollHeight > 150) {
        this.style.height = '150px';
        this.style.overflowY = 'auto';
      }
    });
    
    // Handle form submission
    messageForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const message = messageInput.value.trim();
      
      if (message) {
        const activeChatId = document.querySelector('.chat-list-item.active')?.dataset.chatId || chatId;
        sendMessage(activeChatId, message);
        messageInput.value = '';
        messageInput.style.height = 'auto';
      }
    });
  }
  
  // Add backdrop element for mobile view if it doesn't exist
  if (!document.querySelector('.chat-sidebar-backdrop')) {
    const backdrop = document.createElement('div');
    backdrop.className = 'chat-sidebar-backdrop';
    backdrop.addEventListener('click', () => {
      document.querySelector('.chat-sidebar').classList.remove('chat-sidebar-active');
      backdrop.classList.remove('active');
    });
    document.body.appendChild(backdrop);
  }
});

// Initialize chat interface
async function initializeChat(chatId) {
  const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
  const token = localStorage.getItem('token');
  
  if (!token) {
    window.location.href = `login.html?redirect=chat.html?id=${chatId}`;
    return;
  }
  
  try {
    // Load chat details
    const response = await fetch(`${API_URL}/api/chats/${chatId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load chat');
    }
    
    const chat = await response.json();
    
    // Update chat header
    updateChatHeader(chat);
    
    // Load messages
    loadMessages(chatId);
    
    // Load chat list
    loadChatList(chatId);
    
    // Mark as read
    markChatAsRead(chatId);
    
    // Setup real-time updates
    setupMessagePolling(chatId);
    
  } catch (error) {
    console.error('Error initializing chat:', error);
    alert('Failed to load chat conversation. Please try again.');
  }
}

// Update chat header with recipient and task info
function updateChatHeader(chat) {
  const recipientName = document.getElementById('recipient-name');
  const recipientAvatar = document.getElementById('recipient-avatar');
  const taskTitle = document.getElementById('task-title');
  const viewTaskBtn = document.getElementById('view-task-btn');
  const viewProfileBtn = document.getElementById('view-profile-btn');
  
  if (recipientName) {
    recipientName.textContent = chat.otherUser.name;
  }
  
  if (recipientAvatar) {
    recipientAvatar.innerHTML = chat.otherUser.profilePic ? 
      `<img src="${chat.otherUser.profilePic}" alt="${chat.otherUser.name}" class="w-full h-full object-cover rounded-full">` : 
      chat.otherUser.name.charAt(0).toUpperCase();
  }
  
  if (taskTitle) {
    taskTitle.textContent = `Task: ${chat.taskTitle}`;
  }
  
  if (viewTaskBtn) {
    viewTaskBtn.href = `task-detail.html?id=${chat.taskId}`;
  }
  
  if (viewProfileBtn) {
    viewProfileBtn.href = `profile.html?id=${chat.otherUser.id}`;
  }
}

// Load messages for the chat
async function loadMessages(chatId) {
  console.log('Loading messages for chat ID:', chatId);
  const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
  const token = localStorage.getItem('token');
  
  if (!token || !chatId) {
    console.error('Missing token or chat ID');
    return;
  }
  
  try {
    // Log the API request
    console.log(`Fetching messages from: ${API_URL}/api/chats/${chatId}/messages`);
    
    const response = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API error:', errorData);
      throw new Error('Failed to load messages');
    }
    
    const messages = await response.json();
    console.log('Messages loaded:', messages);
    
    // Display messages
    displayMessages(messages);
    
    // Mark as read after loading messages
    markChatAsRead(chatId);
  } catch (error) {
    console.error('Error loading messages:', error);
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <div class="text-center p-4">
          <div class="bg-red-50 text-red-600 p-3 rounded-lg inline-block">
            <i class="fas fa-exclamation-circle mr-2"></i>
            Failed to load messages. Please refresh the page.
          </div>
        </div>
      `;
    }
  }
}

// Display messages in the chat
function displayMessages(messages) {
  console.log("Displaying messages:", messages);
  const messagesContainer = document.getElementById('messages-container');
  
  if (!messagesContainer) return;
  
  // Clear previous messages
  messagesContainer.innerHTML = '';
  
  if (!messages || messages.length === 0) {
    messagesContainer.innerHTML = `
      <div class="text-center py-12">
        <p class="text-gray-500">No messages yet. Start the conversation!</p>
      </div>
    `;
    return;
  }
  
  // Get current user ID
  const currentUserId = localStorage.getItem('userId');
  console.log("Current user ID:", currentUserId);
  
  // Sort messages by date
  messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  
  // Process messages
  messages.forEach(msg => {
    // Always use "content" field for message text
    const messageText = msg.content || msg.text || msg.message || "";
    const messageSender = msg.senderId;
    const messageTime = msg.createdAt || msg.timestamp || new Date();
    
    const isCurrentUser = messageSender === currentUserId;
    console.log(`Message ${isCurrentUser ? 'from me' : 'from other'}:`, messageText);
    
    const messageClass = isCurrentUser ? 
      'bg-blue-600 text-white' : 
      'bg-white text-gray-800 border border-gray-200';
    
    messagesContainer.innerHTML += `
      <div class="flex mb-3 ${isCurrentUser ? 'justify-end' : ''}">
        <div class="max-w-[80%] rounded-lg px-4 py-2 ${messageClass}">
          <div>${messageText}</div>
          <div class="text-xs ${isCurrentUser ? 'text-blue-200' : 'text-gray-500'} mt-1 text-right">
            ${formatMessageTime(messageTime)}
          </div>
        </div>
      </div>
    `;
  });
  
  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Group messages by date
function groupMessagesByDate(messages) {
  const grouped = {};
  
  messages.forEach(msg => {
    const date = new Date(msg.timestamp).toLocaleDateString();
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(msg);
  });
  
  return grouped;
}

// Format message timestamp
function formatMessageTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Send a new message
async function sendMessage(chatId, message) {
  const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
  const token = localStorage.getItem('token');
  
  if (!token || !chatId) return;
  
  // Optimistically add message to UI
  const currentUserId = localStorage.getItem('userId');
  const messagesContainer = document.getElementById('messages-container');
  
  if (messagesContainer) {
    messagesContainer.innerHTML += `
      <div class="flex mb-3 justify-end">
        <div class="max-w-[80%] rounded-lg px-4 py-2 bg-blue-600 text-white ml-auto">
          <div>${message}</div>
          <div class="text-xs text-blue-200 mt-1 text-right">
            ${formatMessageTime(new Date())}
          </div>
        </div>
      </div>
    `;
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  try {
    console.log(`Sending message to chat ${chatId}: ${message}`);
    
    const response = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        content: message 
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to send message:', errorData);
      throw new Error(errorData.message || 'Failed to send message');
    }
    
    // Message sent successfully, reload messages to ensure consistency
    loadMessages(chatId);
    
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Failed to send message. Please try again.');
    
    // Reload messages to ensure consistency
    loadMessages(chatId);
  }
}

// Load list of chats
async function loadChatList(currentChatId) {
  const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
  const token = localStorage.getItem('token');
  const chatListContainer = document.getElementById('chat-list');
  
  if (!token || !chatListContainer) return;
  
  try {
    const response = await fetch(`${API_URL}/api/chats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load chats');
    }
    
    const chats = await response.json();
    
    // Display chats
    if (chats.length === 0) {
      chatListContainer.innerHTML = `
        <div class="p-6 text-center text-gray-500">
          No conversations yet
        </div>
      `;
      return;
    }
    
    chatListContainer.innerHTML = '';
    
    chats.forEach(chat => {
      const isActive = chat.id === currentChatId;
      
      chatListContainer.innerHTML += `
        <a href="chat.html?id=${chat.id}" class="block px-4 py-3 hover:bg-gray-50 transition-colors ${isActive ? 'bg-primary-light' : 'border-b border-gray-100'}">
          <div class="flex items-start">
            <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-500 text-white flex items-center justify-center font-bold mr-3">
              ${chat.otherUser.name.charAt(0).toUpperCase()}
            </div>
            <div class="flex-grow">
              <div class="flex justify-between">
                <p class="font-medium text-gray-900">${chat.otherUser.name}</p>
                <p class="text-xs text-gray-500">${formatChatTime(chat.lastMessage.timestamp)}</p>
              </div>
              <p class="text-sm text-gray-600 truncate">${chat.lastMessage.text}</p>
              <p class="text-xs text-gray-500 mt-1">Task: ${chat.taskTitle}</p>
            </div>
            ${chat.unreadCount > 0 ? `<span class="bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">${chat.unreadCount}</span>` : ''}
          </div>
        </a>
      `;
    });
    
  } catch (error) {
    console.error('Error loading chat list:', error);
    chatListContainer.innerHTML = `
      <div class="p-6 text-center text-gray-500">
        Failed to load conversations
      </div>
    `;
  }
}

// Format chat timestamp
function formatChatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  return date.toLocaleDateString();
}

// Mark chat as read
async function markChatAsRead(chatId) {
  const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
  const token = localStorage.getItem('token');
  
  if (!token) return;
  
  try {
    await fetch(`${API_URL}/api/chats/${chatId}/read`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    // Update chat count
    if (window.ChatSystem) {
      window.ChatSystem.checkNewMessages();
    }
    
  } catch (error) {
    console.error('Error marking chat as read:', error);
  }
}

// Setup polling for new messages
function setupMessagePolling(chatId) {
  // Poll for new messages every 5 seconds
  setInterval(() => {
    loadMessages(chatId);
  }, 5000);
}

// Create or get existing chat based on taskId and recipientId
async function createOrGetChat(taskId, recipientId) {
  try {
    const API_URL = window.API_CONFIG?.API_URL || 'http://localhost:9000';
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = `login.html?redirect=chat.html?taskId=${taskId}&recipientId=${recipientId}`;
      return;
    }
    
    // Show loading state
    document.getElementById('messages-container').innerHTML = `
      <div class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    `;
    
    console.log(`Creating/getting chat for task ${taskId} with user ${recipientId}`);
    
    // Create or get chat channel
    const response = await fetch(`${API_URL}/api/chats/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        taskId: taskId,
        recipientId: recipientId
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create or get chat');
    }
    
    const data = await response.json();
    const chatId = data.chatId || data.id; // Handle both formats
    
    console.log('Created/got chat with ID:', chatId);
    
    // Update URL with chatId for better bookmarking
    window.history.replaceState(null, '', `chat.html?id=${chatId}`);
    
    // Initialize chat with the retrieved/created chatId
    initializeChat(chatId);
    
  } catch (error) {
    console.error('Error creating/getting chat:', error);
    document.getElementById('messages-container').innerHTML = `
      <div class="flex flex-col items-center justify-center py-12 text-center">
        <div class="bg-red-50 text-red-600 px-6 py-4 rounded-lg max-w-md">
          <i class="fas fa-exclamation-circle text-xl mb-2"></i>
          <p class="mb-2">Failed to load conversation: ${error.message}</p>
          <button class="underline mt-2" onclick="window.location.reload()">Try Again</button>
        </div>
      </div>
    `;
  }
}