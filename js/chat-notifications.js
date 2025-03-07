// File: js/chat-notifications.js

/**
 * Chat Notifications
 * Handles notifications for new chat messages
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize notification system if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
        initializeChatNotifications();
    }
});

/**
 * Initialize chat notifications
 */
function initializeChatNotifications() {
    // Check for notifications every minute
    setInterval(checkChatNotifications, 60000);
    
    // Initial check
    checkChatNotifications();
}

/**
 * Check for new chat notifications
 */
async function checkChatNotifications() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
    
    try {
        const response = await fetch(`${API_URL}/api/chats/unread`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        updateChatNotificationBadge(data.unreadCount || 0);
        
    } catch (error) {
        console.error('Error checking chat notifications:', error);
    }
}

/**
 * Update chat notification badge
 */
function updateChatNotificationBadge(count) {
    const chatBadges = document.querySelectorAll('#chat-count');
    
    chatBadges.forEach(badge => {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    });
    
    // Also update title if on messages page
    if (window.location.pathname.includes('messages.html') || 
        window.location.pathname.includes('chat.html')) {
        if (count > 0) {
            document.title = `(${count}) Messages - Victor`;
        } else {
            document.title = 'Messages - Victor';
        }
    }
}

/**
 * Update UI when a new message is received
 * Can be called from WebSocket or server-sent events
 */
function newMessageReceived(message) {
    // Update badge count
    checkChatNotifications();
    
    // Show toast notification if supported and page is not active
    if (document.hidden && "Notification" in window && Notification.permission === "granted") {
        const notification = new Notification("New message from " + (message.senderName || "User"), {
            body: message.content,
            icon: "/favicon.ico"
        });
        
        // Open chat when notification is clicked
        notification.onclick = function() {
            window.open(`chat.html?id=${message.chatId}`, '_blank');
        };
    }
}

// Request notification permission
if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
    // Delay asking for notification permission
    setTimeout(() => {
        Notification.requestPermission();
    }, 5000);
}