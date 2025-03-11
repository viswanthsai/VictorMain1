// New file: js/chat-system.js

/**
 * Victor Chat System
 * Handles direct communication between task posters and performers
 */

class ChatSystem {
    constructor() {
        this.API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
        this.token = localStorage.getItem('token');
        this.userId = localStorage.getItem('userId');
        this.unreadCount = 0;
        
        // Don't initialize polling here - wait for DOMContentLoaded
        document.addEventListener('DOMContentLoaded', () => {
            // Re-check token in case it changed
            this.token = localStorage.getItem('token');
            this.userId = localStorage.getItem('userId');
            
            if (this.token && this.userId) {
                this.initializePolling();
            }
        });
    }
    
    /**
     * Initialize polling for new messages and notifications
     */
    initializePolling() {
        console.log('Initializing chat system polling');
        
        // Do an initial check right away
        this.checkNewMessages();
        
        // Check for new messages every 30 seconds
        setInterval(() => {
            this.checkNewMessages();
        }, 30000);
    }
    
    /**
     * Check for new unread messages
     */
    async checkNewMessages() {
        if (!this.token) return;
        
        try {
            const response = await fetch(`${this.API_URL}/api/chats/unread`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) return;
            
            const data = await response.json();
            this.updateUnreadCount(data.unreadCount || 0);
            
        } catch (error) {
            console.error('Error checking unread messages:', error);
        }
    }
    
    /**
     * Update unread message count badge
     */
    updateUnreadCount(count) {
        this.unreadCount = count;
        
        // Update all chat count badges
        const chatCountBadges = document.querySelectorAll('#chat-count');
        chatCountBadges.forEach(badge => {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        });
        
        // Also update title if unread messages exist
        if (count > 0 && document.title.indexOf('(') !== 0) {
            document.title = `(${count}) ${document.title.replace(/^\(\d+\)\s/, '')}`;
        } else if (count === 0) {
            document.title = document.title.replace(/^\(\d+\)\s/, '');
        }
    }
    
    /**
     * Create or get an existing chat
     */
    async createOrGetChat(taskId, recipientId) {
        if (!this.token) {
            throw new Error('User not authenticated');
        }
        
        try {
            const response = await fetch(`${this.API_URL}/api/chats/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    taskId,
                    recipientId
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create chat');
            }
            
            const chatData = await response.json();
            return chatData.chatId || chatData.id;
            
        } catch (error) {
            console.error('Error creating/getting chat:', error);
            throw error;
        }
    }
    
    /**
     * Send a message in a chat
     */
    async sendMessage(chatId, content, taskInfo = null) {
        if (!this.token || !chatId || !content) {
            throw new Error('Missing required parameters');
        }
        
        try {
            const messageData = {
                content,
                senderName: localStorage.getItem('username') || 'User' // Include sender name
            };
            
            // Add task info if provided
            if (taskInfo) {
                messageData.taskId = taskInfo.taskId;
                messageData.taskTitle = taskInfo.taskTitle;
                messageData.recipientId = taskInfo.recipientId;
                messageData.recipientName = taskInfo.recipientName;
            }
            
            const response = await fetch(`${this.API_URL}/api/chats/${chatId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(messageData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to send message');
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }
    
    /**
     * Mark a chat as read
     */
    async markChatAsRead(chatId) {
        if (!this.token || !chatId) return;
        
        try {
            await fetch(`${this.API_URL}/api/chats/${chatId}/read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            // Recheck unread count
            this.checkNewMessages();
            
        } catch (error) {
            console.error('Error marking chat as read:', error);
        }
    }
    
    /**
     * Contact user about a task
     */
    async contactUserAboutTask(taskId, recipientId, message) {
        if (!this.token) {
            throw new Error('User not logged in');
        }
        
        try {
            // First create/get a chat with this user
            const chatId = await this.createOrGetChat(taskId, recipientId);
            
            // Then send the message in that chat
            if (message) {
                await this.sendMessage(chatId, message, { taskId });
            }
            
            // Return the chat ID for redirection
            return chatId;
        } catch (error) {
            console.error('Error contacting user about task:', error);
            throw error;
        }
    }
    
    // Add this method to handle offer-specific messages
    async sendOfferMessage(chatId, taskId, offerDetails) {
        if (!this.token) {
            throw new Error('User not logged in');
        }
        
        try {
            const message = `📋 I've submitted an offer for your task: 
• Price: ₹${offerDetails.price}
• Timeline: ${offerDetails.timeline} days
• Message: "${offerDetails.message}"`;
            
            await this.sendMessage(chatId, message, { 
                taskId: taskId,
                messageType: 'offer',
                offerData: offerDetails
            });
            
            return true;
        } catch (error) {
            console.error('Error sending offer message:', error);
            throw error;
        }
    }
}

// Initialize global chat system
window.ChatSystem = new ChatSystem();