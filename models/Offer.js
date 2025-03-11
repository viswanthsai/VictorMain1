/**
 * Offer Model
 * Handles operations related to task offers
 */

class Offer {
  /**
   * Create a new Offer instance
   * @param {Object} offerData - The raw offer data from API
   */
  constructor(offerData = {}) {
    // Required fields
    this.id = offerData.id || offerData._id || null;
    this.taskId = offerData.taskId || null;
    this.userId = offerData.userId || null;
    this.amount = offerData.amount || 0;
    this.message = offerData.message || '';
    
    // Metadata
    this.createdAt = offerData.createdAt || new Date().toISOString();
    this.updatedAt = offerData.updatedAt || offerData.createdAt || new Date().toISOString();
    this.status = offerData.status || 'Pending'; // Pending, Accepted, Declined
    
    // Additional user information (if available)
    this.userUsername = offerData.userUsername || null;
    this.userProfilePic = offerData.userProfilePic || null;
    this.userRating = offerData.userRating || null;
    
    // Task information (if available)
    this.taskTitle = offerData.taskTitle || null;
    this.taskStatus = offerData.taskStatus || null;
  }
  
  /**
   * Format offer data for display
   */
  format() {
    return {
      ...this,
      formattedAmount: this.formatAmount(),
      formattedCreatedAt: this.formatDate(this.createdAt, true),
      statusClass: this.getStatusClass(),
      isAccepted: this.status === 'Accepted',
      isDeclined: this.status === 'Declined',
      isPending: this.status === 'Pending'
    };
  }
  
  /**
   * Format amount for display
   */
  formatAmount() {
    return `₹${parseInt(this.amount).toLocaleString()}`;
  }
  
  /**
   * Format date for display
   */
  formatDate(dateString, relative = false) {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      if (relative) {
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        
        if (diffMinutes < 5) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
      }
      
      return date.toLocaleDateString();
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Unknown date';
    }
  }
  
  /**
   * Get CSS classes for offer status
   */
  getStatusClass() {
    const statusMap = {
      'Accepted': { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', icon: 'fa-check-circle' },
      'Declined': { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', icon: 'fa-times-circle' },
      'Pending': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', icon: 'fa-clock' }
    };
    
    return statusMap[this.status] || statusMap['Pending'];
  }
  
  /**
   * Save offer to local storage
   */
  saveToCache() {
    try {
      // Get existing offers cache
      const offersCache = JSON.parse(localStorage.getItem('offersCache') || '{}');
      
      // Group offers by taskId
      if (!offersCache[this.taskId]) {
        offersCache[this.taskId] = [];
      }
      
      // Check if this offer already exists in the cache
      const existingIndex = offersCache[this.taskId].findIndex(offer => 
        offer.id === this.id || offer._id === this.id
      );
      
      if (existingIndex >= 0) {
        // Replace existing offer
        offersCache[this.taskId][existingIndex] = this;
      } else {
        // Add new offer
        offersCache[this.taskId].push(this);
      }
      
      // Save back to localStorage
      localStorage.setItem('offersCache', JSON.stringify(offersCache));
    } catch (error) {
      console.error('Error saving offer to cache:', error);
    }
    
    return this;
  }
  
  /**
   * Factory methods
   */
  static fromJson(offerData) {
    return new Offer(offerData);
  }
  
  static fromJsonArray(offersData) {
    if (!Array.isArray(offersData)) return [];
    return offersData.map(offerData => Offer.fromJson(offerData));
  }
  
  /**
   * Get offers for a task from cache
   * @param {string} taskId - Task ID
   * @returns {Array<Offer>} Array of offers from cache
   */
  static getFromCache(taskId) {
    try {
      const offersCache = JSON.parse(localStorage.getItem('offersCache') || '{}');
      const taskOffers = offersCache[taskId] || [];
      
      if (taskOffers.length > 0) {
        console.log('Found offers in cache:', taskOffers.length);
        return taskOffers.map(offer => new Offer(offer));
      }
    } catch (error) {
      console.error('Error getting offers from cache:', error);
    }
    
    return [];
  }
  
  /**
   * API methods with robust error handling
   */
  static async fetchForTask(taskId) {
    // Try to get offers from cache first
    const cachedOffers = Offer.getFromCache(taskId);
    
    // Get API URL with multiple fallbacks
    const apiUrls = [
      localStorage.getItem('apiUrl'),
      window.API_CONFIG?.API_URL,
      window.API_CONFIG?.BACKUP_API_URL,
      'http://localhost:9000',
      'https://victormain1.onrender.com'
    ].filter(Boolean);
    
    const token = localStorage.getItem('token');
    
    if (!token) {
      if (cachedOffers.length > 0) {
        return cachedOffers;
      }
      throw new Error('Authentication required to fetch offers');
    }
    
    let lastError = null;
    
    // Try each API URL until one works
    for (const url of apiUrls) {
      try {
        console.log(`Fetching offers for task ${taskId} from ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(`${url}/api/tasks/${taskId}/offers`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch offers: ${response.status}`);
        }
        
        const offersData = await response.json();
        
        // Store successful API URL
        localStorage.setItem('apiUrl', url);
        
        // Create and cache offers
        const offers = Offer.fromJsonArray(offersData);
        offers.forEach(offer => offer.saveToCache());
        
        return offers;
      } catch (error) {
        console.warn(`Failed to fetch offers from ${url}:`, error.message);
        lastError = error;
        // Continue to next URL
      }
    }
    
    // If all API URLs failed but we have cached offers, use them as fallback
    if (cachedOffers.length > 0) {
      console.log('Returning cached offers after API failures');
      return cachedOffers;
    }
    
    // If all API URLs failed and ErrorHandler is available
    if (window.ErrorHandler) {
      try {
        console.log('Trying to fetch offers with ErrorHandler');
        const response = await ErrorHandler.tryDifferentApiUrls(`api/tasks/${taskId}/offers`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const offersData = await response.json();
        const offers = Offer.fromJsonArray(offersData);
        offers.forEach(offer => offer.saveToCache());
        return offers;
      } catch (handlerError) {
        console.error('ErrorHandler also failed:', handlerError);
        throw handlerError;
      }
    }
    
    throw lastError || new Error('Failed to fetch offers from any API endpoint');
  }
  
  /**
   * Submit an offer with robust error handling
   */
  static async submit(taskId, amount, message) {
    // Same approach as fetchForTask - try multiple endpoints
    const apiUrls = [
      localStorage.getItem('apiUrl'),
      window.API_CONFIG?.API_URL,
      window.API_CONFIG?.BACKUP_API_URL,
      'http://localhost:9000',
      'https://victormain1.onrender.com'
    ].filter(Boolean);
    
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required to submit an offer');
    }
    
    const offerData = {
      amount: parseInt(amount),
      message
    };
    
    let lastError = null;
    
    // Try each API URL until one works
    for (const url of apiUrls) {
      try {
        console.log(`Submitting offer to ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${url}/api/tasks/${taskId}/offers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(offerData),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to submit offer: ${response.status}`);
        }
        
        const responseData = await response.json();
        
        // Store successful API URL
        localStorage.setItem('apiUrl', url);
        
        // Cache the new offer
        const offer = Offer.fromJson(responseData);
        offer.saveToCache();
        
        return offer;
      } catch (error) {
        console.warn(`Failed to submit offer to ${url}:`, error.message);
        lastError = error;
        // Continue to next URL
      }
    }
    
    // If all API URLs failed and ErrorHandler is available
    if (window.ErrorHandler) {
      try {
        console.log('Trying to submit offer with ErrorHandler');
        const response = await ErrorHandler.tryDifferentApiUrls(`api/tasks/${taskId}/offers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(offerData)
        });
        
        const responseData = await response.json();
        return Offer.fromJson(responseData);
      } catch (handlerError) {
        console.error('ErrorHandler also failed:', handlerError);
        throw handlerError;
      }
    }
    
    throw lastError || new Error('Failed to submit offer to any API endpoint');
  }
  
  /**
   * Clear offers cache
   */
  static clearCache() {
    localStorage.removeItem('offersCache');
  }
}

// Make Offer available globally in browser environments
if (typeof window !== 'undefined') {
  window.Offer = Offer;
}