/**
 * Chat functionality
 */

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html?redirect=chat.html';
    return;
  }

  // Load chat ID from URL
  const chatId = getQueryParam('id');
  
  // If chatId is available, load messages
  if (chatId) {
    // Show chat interface
    document.getElementById('active-chat')?.classList.remove('hidden');
    document.getElementById('no-chat-selected')?.classList.add('hidden');
    
    // Load chat and messages
    loadChatDetails(chatId);
  } else {
    // Check if we have taskId and recipientId for creating new chat
    const taskId = getQueryParam('taskId');
    const recipientId = getQueryParam('recipientId');
    
    if (taskId && recipientId) {
      // Create new chat
      createChat(taskId, recipientId);
    }
  }
});

/**
 * Get URL query parameter
 */
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

/**
 * Create a new chat
 */
async function createChat(taskId, recipientId) {
  try {
    showChatLoading();
    
    const apiUrl = window.getApiUrl ? window.getApiUrl() : 'http://localhost:9000';
    
    // Create chat via API
    const response = await fetch(`${apiUrl}/api/chats/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        taskId,
        recipientId
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create chat');
    }
    
    const chat = await response.json();
    
    // Redirect to chat with id
    window.location.href = `chat.html?id=${chat._id || chat.id}`;
    
  } catch (error) {
    console.error('Error creating chat:', error);
    showChatError('Failed to create chat. Please try again.');
  }
}

/**
 * Load chat details and messages
 */
async function loadChatDetails(chatId) {
  try {
    // Show loading state
    showChatLoading();
    
    const apiUrl = window.getApiUrl ? window.getApiUrl() : 'http://localhost:9000';
    
    // Fetch chat details
    const chatResponse = await fetch(`${apiUrl}/api/chats/${chatId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!chatResponse.ok) {
      throw new Error(`Failed to load chat details: ${chatResponse.status}`);
    }
    
    const chatData = await chatResponse.json();
    console.log('Chat details:', chatData);
    
    // Update chat header with user and task info
    updateChatHeader(chatData);
    
    // Load messages
    await loadChatMessages(chatId);
    
    // Setup message form
    setupMessageForm(chatId, chatData);
    
  } catch (error) {
    console.error('Error loading chat details:', error);
    showChatError("Couldn't load chat. Please try again.");
  }
}

/**
 * Update the chat header with user and task info
 */
function updateChatHeader(chatData) {
  const chatNameEl = document.getElementById('chat-name');
  const chatTaskInfoEl = document.getElementById('chat-task-info');
  const chatAvatarEl = document.getElementById('chat-avatar');
  const viewTaskBtn = document.getElementById('view-task-btn');
  
  // Set other user's name
  if (chatNameEl && chatData.otherUser) {
    chatNameEl.textContent = chatData.otherUser.name || 'User';
  }
  
  // Set task info if available
  if (chatTaskInfoEl) {
    if (chatData.taskTitle) {
      chatTaskInfoEl.textContent = `Task: ${chatData.taskTitle}`;
      chatTaskInfoEl.classList.remove('hidden');
    } else {
      chatTaskInfoEl.classList.add('hidden');
    }
  }
  
  // Set avatar initial
  if (chatAvatarEl && chatData.otherUser && chatData.otherUser.name) {
    chatAvatarEl.textContent = chatData.otherUser.name.charAt(0).toUpperCase();
  }
  
  // Set view task button action
  if (viewTaskBtn && chatData.taskId) {
    viewTaskBtn.classList.remove('hidden');
    viewTaskBtn.onclick = function() {
      window.location.href = `task-detail.html?id=${chatData.taskId}`;
    };
  } else if (viewTaskBtn) {
    viewTaskBtn.classList.add('hidden');
  }
}

/**
 * Load chat messages
 */
async function loadChatMessages(chatId) {
  try {
    showChatLoading();
    
    const apiUrl = window.getApiUrl ? window.getApiUrl() : 'http://localhost:9000';
    
    // Try to load messages
    console.log(`Loading messages for chat: ${chatId}`);
    const response = await fetch(`${apiUrl}/api/chats/${chatId}/messages`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load messages: ${response.status}`);
    }
    
    const messages = await response.json();
    console.log(`Loaded ${messages.length} messages:`, messages);
    
    // Display messages
    displayMessages(messages);
    
    hideChatLoading();
    
    // Mark chat as read (optional, server already does this)
    markChatAsRead(chatId);
    
  } catch (error) {
    console.error('Error loading chat messages:', error);
    showChatError("Couldn't load messages. Please try again.");
  }
}

/**
 * Create a message element
 */
function createMessageElement(message, isOwnMessage) {
  const messageElement = document.createElement('div');
  messageElement.className = isOwnMessage 
    ? 'chat-message chat-message-right mb-4'
    : 'chat-message chat-message-left mb-4';
  
  // Format time
  const time = formatMessageTime(message.createdAt || new Date());
  
  // Get sender name - use senderName if available, otherwise show "User"
  const senderName = message.senderName || 'User';
  
  // Check for special message types
  const isOfferMessage = message.content && message.content.includes("I've submitted an offer for");
  const isSystemMessage = message.messageType === 'system';
  
  // Base style classes
  let containerClass = isOwnMessage 
    ? 'bg-primary-light text-gray-800 rounded-lg rounded-tr-none py-2 px-4 inline-block'
    : 'bg-white border border-gray-200 text-gray-800 rounded-lg rounded-tl-none py-2 px-4 inline-block';
  
  // Special style for offer messages
  if (isOfferMessage) {
    containerClass = isOwnMessage 
      ? 'bg-green-50 border border-green-200 text-gray-800 rounded-lg rounded-tr-none py-2 px-4 inline-block'
      : 'bg-green-50 border border-green-200 text-gray-800 rounded-lg rounded-tl-none py-2 px-4 inline-block';
  } else if (isSystemMessage) {
    containerClass = 'bg-gray-100 text-gray-700 rounded-lg py-2 px-4 inline-block';
  }
  
  // Format content with extra styling for offer messages
  let displayContent = message.content || '';
  if (isOfferMessage) {
    // Apply nice formatting to offer messages
    displayContent = message.content
      .replace("I've submitted an offer for", "<strong>I've submitted an offer for</strong>")
      .replace(/•\s(.*?):/g, '<br>• <strong>$1:</strong>')
      .replace(/₹(\d+)/g, '₹<strong>$1</strong>');
  }
  
  messageElement.innerHTML = `
    <div class="${isOwnMessage ? 'flex flex-col items-end' : 'flex flex-col'}">
      ${!isOwnMessage ? `<span class="text-xs text-gray-500 mb-1">${senderName}</span>` : ''}
      <div class="${containerClass}">
        <div class="message-content">${displayContent}</div>
      </div>
      <span class="text-xs text-gray-500 mt-1">${time}</span>
    </div>
  `;
  
  return messageElement;
}

/**
 * Display chat messages
 */
function displayMessages(messages) {
  const messagesContainer = document.getElementById('messages-container');
  if (!messagesContainer) return;
  
  // Clear container
  messagesContainer.innerHTML = '';
  
  // Check if we have messages
  if (!messages || messages.length === 0) {
    messagesContainer.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <p>No messages yet. Send a message to start the conversation.</p>
      </div>
    `;
    return;
  }
  
  // Get current user ID
  const currentUserId = localStorage.getItem('userId');
  
  // Display messages
  messages.forEach(message => {
    const isOwnMessage = message.senderId === currentUserId;
    const messageElement = createMessageElement(message, isOwnMessage);
    messagesContainer.appendChild(messageElement);
  });
  
  // Scroll to bottom
  scrollToBottom();
}

/**
 * Setup message form to send new messages
 */
function setupMessageForm(chatId, chatData) {
  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('message-input');
  
  if (!messageForm || !messageInput) return;
  
  messageForm.onsubmit = async function(e) {
    e.preventDefault();
    
    const content = messageInput.value.trim();
    if (!content) return;
    
    // Disable form during submission
    messageInput.disabled = true;
    const submitBtn = messageForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    submitBtn.disabled = true;
    
    try {
      const apiUrl = window.getApiUrl ? window.getApiUrl() : 'http://localhost:9000';
      
      // Get current user name
      const currentUserName = localStorage.getItem('username') || 'You';
      
      // Send message with all required data
      const response = await fetch(`${apiUrl}/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          chatId,
          content,
          senderName: currentUserName,
          taskId: chatData?.taskId,
          taskTitle: chatData?.taskTitle,
          recipientId: chatData?.otherUser?.id,
          recipientName: chatData?.otherUser?.name
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }
      
      // Add message to UI immediately
      const sentMessage = await response.json();
      
      const messagesContainer = document.getElementById('messages-container');
      
      // Clear empty state if it exists
      if (messagesContainer.querySelector('p') && messagesContainer.querySelectorAll('div.chat-message').length === 0) {
        messagesContainer.innerHTML = '';
      }
      
      const messageElement = createMessageElement(sentMessage, true);
      messagesContainer.appendChild(messageElement);
      
      // Scroll to bottom
      scrollToBottom();
      
      // Clear input
      messageInput.value = '';
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      // Re-enable form
      messageInput.disabled = false;
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
      messageInput.focus();
    }
  };
}

/**
 * Mark chat as read
 */
async function markChatAsRead(chatId) {
  try {
    const apiUrl = window.getApiUrl ? window.getApiUrl() : 'http://localhost:9000';
    
    await fetch(`${apiUrl}/api/chats/${chatId}/read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
  } catch (error) {
    console.warn('Error marking chat as read:', error);
    // Non-critical error, we can ignore
  }
}

/**
 * Format message time
 */
function formatMessageTime(dateString) {
  const date = new Date(dateString);
  
  // Check for invalid date
  if (isNaN(date.getTime())) {
    return ''; 
  }
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // If same day, return time only
  if (date.getDate() === now.getDate() && 
      date.getMonth() === now.getMonth() && 
      date.getFullYear() === now.getFullYear()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // If yesterday
  if (date.getDate() === yesterday.getDate() && 
      date.getMonth() === yesterday.getMonth() && 
      date.getFullYear() === yesterday.getFullYear()) {
    return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // Otherwise return date and time
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

/**
 * Scroll to bottom of messages container
 */
function scrollToBottom() {
  const messagesContainer = document.getElementById('messages-container');
  if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

/**
 * Show chat loading state
 */
function showChatLoading() {
  const loadingContainer = document.getElementById('chat-loading');
  const messagesContainer = document.getElementById('messages-container');
  const errorContainer = document.getElementById('chat-error');
  const activeChatContainer = document.getElementById('active-chat');
  
  if (loadingContainer) loadingContainer.classList.remove('hidden');
  if (messagesContainer) messagesContainer.classList.add('hidden');
  if (errorContainer) errorContainer.classList.add('hidden');
  if (activeChatContainer) activeChatContainer.classList.add('hidden');
}

/**
 * Hide chat loading state
 */
function hideChatLoading() {
  const loadingContainer = document.getElementById('chat-loading');
  const messagesContainer = document.getElementById('messages-container');
  const activeChatContainer = document.getElementById('active-chat');
  
  if (loadingContainer) loadingContainer.classList.add('hidden');
  if (messagesContainer) messagesContainer.classList.remove('hidden');
  if (activeChatContainer) activeChatContainer.classList.remove('hidden');
}

/**
 * Show chat error message
 */
function showChatError(message) {
  const loadingContainer = document.getElementById('chat-loading');
  const messagesContainer = document.getElementById('messages-container');
  const errorContainer = document.getElementById('chat-error');
  const errorMessage = document.getElementById('chat-error-message');
  const activeChatContainer = document.getElementById('active-chat');
  
  if (loadingContainer) loadingContainer.classList.add('hidden');
  if (messagesContainer) messagesContainer.classList.add('hidden');
  if (activeChatContainer) activeChatContainer.classList.add('hidden');
  
  if (errorContainer && errorMessage) {
    errorMessage.textContent = message;
    errorContainer.classList.remove('hidden');
    
    // Add retry button handler
    document.getElementById('retry-chat').onclick = function() {
      window.location.reload();
    };
  }
}
