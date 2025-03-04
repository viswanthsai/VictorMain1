/**
 * Chat Page Controller
 * Handles the chat interface functionality
 */

document.addEventListener('DOMContentLoaded', function() {
  // Get chat ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const chatId = urlParams.get('id');
  
  if (!chatId) {
    // No chat ID provided, redirect to messages list
    window.location.href = 'messages.html';
    return;
  }
  
  // Initialize chat
  initializeChat(chatId);
  
  // Setup mobile chat list toggle
  const showChatsBtn = document.getElementById('show-chats-btn');
  const chatSidebar = document.querySelector('main > div:first-child');
  
  if (showChatsBtn && chatSidebar) {
    showChatsBtn.addEventListener('click', () => {
      chatSidebar.classList.toggle('hidden');
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
        sendMessage(chatId, message);
        messageInput.value = '';
        messageInput.style.height = 'auto';
      }
    });
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
  const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
  const token = localStorage.getItem('token');
  const messagesContainer = document.getElementById('messages-container');
  
  if (!token || !messagesContainer) return;
  
  try {
    const response = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load messages');
    }
    
    const messages = await response.json();
    
    // Display messages
    displayMessages(messages);
    
  } catch (error) {
    console.error('Error loading messages:', error);
    messagesContainer.innerHTML = `
      <div class="flex justify-center">
        <div class="bg-red-50 text-red-600 px-4 py-2 rounded-lg">
          Failed to load messages. <button class="font-medium underline" onClick="loadMessages('${chatId}')">Retry</button>
        </div>
      </div>
    `;
  }
}

// Display messages in the chat
function displayMessages(messages) {
  const messagesContainer = document.getElementById('messages-container');
  const currentUserId = localStorage.getItem('userId');
  
  if (!messagesContainer || !currentUserId) return;
  
  // Clear loading indicator
  messagesContainer.innerHTML = '';
  
  // Group messages by date
  const groupedMessages = groupMessagesByDate(messages);
  
  // Add date separators and messages
  for (const [date, msgs] of Object.entries(groupedMessages)) {
    // Add date separator
    messagesContainer.innerHTML += `
      <div class="flex justify-center my-4">
        <div class="bg-gray-100 rounded-full px-4 py-1 text-xs text-gray-500">${date}</div>
      </div>
    `;
    
    // Add messages
    msgs.forEach(msg => {
      const isCurrentUser = msg.senderId === currentUserId;
      const messageClass = isCurrentUser ? 
        'bg-primary-light text-gray-800 ml-auto' : 
        'bg-white text-gray-800 border border-gray-200';
      
      messagesContainer.innerHTML += `
        <div class="flex mb-3 ${isCurrentUser ? 'justify-end' : ''}">
          <div class="max-w-[80%] rounded-lg px-4 py-2 ${messageClass}">
            <div>${msg.text}</div>
            <div class="text-xs text-gray-500 mt-1 text-right">
              ${formatMessageTime(msg.timestamp)}
            </div>
          </div>
        </div>
      `;
    });
  }
  
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
  
  if (!token) return;
  
  // Optimistically add message to UI
  const currentUserId = localStorage.getItem('userId');
  const messagesContainer = document.getElementById('messages-container');
  
  if (messagesContainer) {
    messagesContainer.innerHTML += `
      <div class="flex mb-3 justify-end">
        <div class="max-w-[80%] rounded-lg px-4 py-2 bg-primary-light text-gray-800 ml-auto">
          <div>${message}</div>
          <div class="text-xs text-gray-500 mt-1 text-right">
            ${formatMessageTime(new Date())}
          </div>
        </div>
      </div>
    `;
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  try {
    const response = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        text: message 
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    
    // Message sent successfully, no need to do anything as we've already added it to UI
    
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

// Add this at the top of the file to ensure we have necessary fallbacks

document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const chatList = document.getElementById('chat-list');
    const messagesContainer = document.getElementById('messages-container');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const recipientName = document.getElementById('recipient-name');
    const recipientAvatar = document.getElementById('recipient-avatar');
    const taskTitle = document.getElementById('task-title');
    const viewProfileBtn = document.getElementById('view-profile-btn');
    const viewTaskBtn = document.getElementById('view-task-btn');
    
    // Get chat ID from URL or use default
    const urlParams = new URLSearchParams(window.location.search);
    const chatId = urlParams.get('id') || 'mock-chat-1';
    
    // Load chat data
    loadChat(chatId);
    loadChatList();
    
    // Setup message form
    messageForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (message) {
            sendMessage(chatId, message);
            messageInput.value = '';
        }
    });
    
    // Functions
    async function loadChat(id) {
        try {
            // Try to fetch from API or use mock data
            let chat;
            try {
                chat = await fetchAPI(`/api/chats/${id}`);
            } catch (error) {
                // Use mock data if API fails
                console.log("Using mock chat data");
                const mockChats = getMockChats();
                chat = mockChats.find(c => c.id === id) || mockChats[0];
            }
            
            // Update UI with chat data
            displayChat(chat);
        } catch (error) {
            messagesContainer.innerHTML = `
                <div class="text-center py-8">
                    <div class="text-gray-500 mb-2">
                        <i class="fas fa-exclamation-circle text-3xl"></i>
                    </div>
                    <h3 class="font-medium text-gray-800 mb-1">Could not load conversation</h3>
                    <p class="text-gray-500">Please try again later</p>
                </div>
            `;
            console.error("Error loading chat:", error);
        }
    }
    
    function displayChat(chat) {
        // Update recipient info
        recipientName.textContent = chat.recipient.name;
        recipientAvatar.textContent = chat.recipient.avatar;
        taskTitle.textContent = `Task: ${chat.task.title}`;
        
        // Update links
        viewProfileBtn.href = `profile.html?id=${chat.recipient.id}`;
        viewTaskBtn.href = `task-details.html?id=${chat.task.id}`;
        
        // Display messages (mock for now)
        messagesContainer.innerHTML = `
            <div class="flex flex-col space-y-4">
                <div class="chat-message received">
                    <div class="flex items-end">
                        <div class="flex flex-col space-y-2 text-xs max-w-xs mx-2 order-2 items-start">
                            <div><span class="px-4 py-2 rounded-lg inline-block rounded-bl-none bg-gray-200 text-gray-600">Hi there! I'm interested in your task.</span></div>
                        </div>
                        <div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center order-1">${chat.recipient.avatar}</div>
                    </div>
                </div>
                
                <div class="chat-message sent">
                    <div class="flex items-end justify-end">
                        <div class="flex flex-col space-y-2 text-xs max-w-xs mx-2 order-1 items-end">
                            <div><span class="px-4 py-2 rounded-lg inline-block rounded-br-none bg-primary text-white">Hello! Thanks for your interest. Can you tell me more about your experience?</span></div>
                        </div>
                        <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white order-2">You</div>
                    </div>
                </div>
                
                <div class="chat-message received">
                    <div class="flex items-end">
                        <div class="flex flex-col space-y-2 text-xs max-w-xs mx-2 order-2 items-start">
                            <div><span class="px-4 py-2 rounded-lg inline-block rounded-bl-none bg-gray-200 text-gray-600">${chat.lastMessage.text}</span></div>
                        </div>
                        <div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center order-1">${chat.recipient.avatar}</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async function loadChatList() {
        try {
            let chats;
            try {
                chats = await fetchAPI('/api/chats');
            } catch (error) {
                console.log("Using mock chats list");
                chats = getMockChats();
            }
            
            if (chats && chats.length > 0) {
                displayChatList(chats);
            } else {
                chatList.innerHTML = `
                    <div class="py-8 text-center text-gray-500">
                        <p>No conversations found</p>
                    </div>
                `;
            }
        } catch (error) {
            chatList.innerHTML = `
                <div class="py-8 text-center text-gray-500">
                    <p>Could not load conversations</p>
                </div>
            `;
            console.error("Error loading chat list:", error);
        }
    }
    
    function displayChatList(chats) {
        chatList.innerHTML = '';
        
        chats.forEach(chat => {
            const isActive = chat.id === chatId;
            const chatElement = document.createElement('div');
            chatElement.className = `border-b border-gray-100 ${isActive ? 'bg-primary-light' : 'hover:bg-gray-50'}`;
            chatElement.innerHTML = `
                <a href="chat.html?id=${chat.id}" class="block px-4 py-3">
                    <div class="flex items-center">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-500 text-white flex items-center justify-center font-bold mr-3">
                            ${chat.recipient.avatar}
                        </div>
                        <div class="flex-grow">
                            <div class="flex justify-between items-center">
                                <h3 class="font-medium text-gray-800">${chat.recipient.name}</h3>
                                <span class="text-xs text-gray-500">Just now</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <p class="text-sm text-gray-600 truncate">${chat.lastMessage.text}</p>
                                ${chat.unreadCount > 0 ? `<span class="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">${chat.unreadCount}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">Task: ${chat.task.title}</p>
                </a>
            `;
            chatList.appendChild(chatElement);
        });
    }
    
    function sendMessage(chatId, text) {
        // In a real app, send to API
        // For now, just add to UI
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message sent';
        messageElement.innerHTML = `
            <div class="flex items-end justify-end">
                <div class="flex flex-col space-y-2 text-xs max-w-xs mx-2 order-1 items-end">
                    <div><span class="px-4 py-2 rounded-lg inline-block rounded-br-none bg-primary text-white">${text}</span></div>
                </div>
                <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white order-2">You</div>
            </div>
        `;
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
});