/**
 * Task Review System
 * Handles submitting and displaying reviews for completed tasks
 */

const TaskReview = {
  /**
   * Initialize review form for a specific task
   * @param {number} taskId - ID of the task being reviewed
   */
  initReviewForm(taskId) {
    const reviewForm = document.getElementById('review-form');
    if (!reviewForm) return;
    
    // Setup star rating
    const stars = document.querySelectorAll('.rating-star');
    let currentRating = 0;
    
    stars.forEach((star, index) => {
      // Handle hover events
      star.addEventListener('mouseover', () => {
        this.updateStarDisplay(stars, index);
      });
      
      // Handle click events
      star.addEventListener('click', () => {
        currentRating = index + 1;
        document.getElementById('rating-value').value = currentRating;
      });
    });
    
    // Reset stars when mouse leaves the container
    const ratingContainer = document.getElementById('rating-container');
    ratingContainer.addEventListener('mouseleave', () => {
      this.updateStarDisplay(stars, currentRating - 1);
    });
    
    // Handle form submission
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const comment = document.getElementById('review-comment').value.trim();
      const rating = parseInt(document.getElementById('rating-value').value);
      
      if (rating === 0) {
        this.showNotification('Please select a rating', 'warning');
        return;
      }
      
      await this.submitReview(taskId, rating, comment);
    });
  },
  
  /**
   * Update star display based on hover/selection
   * @param {NodeList} stars - Collection of star elements
   * @param {number} activeIndex - Index of the active star
   */
  updateStarDisplay(stars, activeIndex) {
    stars.forEach((star, index) => {
      if (index <= activeIndex) {
        star.classList.add('text-yellow-400');
        star.classList.remove('text-gray-300');
      } else {
        star.classList.remove('text-yellow-400');
        star.classList.add('text-gray-300');
      }
    });
  },
  
  /**
   * Submit a review for a task
   * @param {number} taskId - The task ID
   * @param {number} rating - Rating value (1-5)
   * @param {string} comment - Review comment
   */
  async submitReview(taskId, rating, comment) {
    const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = 'login.html?redirect=task-detail.html?id=' + taskId;
      return;
    }
    
    try {
      // Show loading state
      const submitBtn = document.getElementById('submit-review-btn');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Submitting...';
      
      const response = await fetch(`${API_URL}/api/tasks/${taskId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating, comment })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit review');
      }
      
      // Show success message
      this.showNotification('Review submitted successfully', 'success');
      
      // Hide review form and show the submitted review
      document.getElementById('review-form-container').classList.add('hidden');
      
      // Reload reviews
      await this.loadReviews(taskId);
    } catch (error) {
      this.showNotification(error.message || 'Error submitting review', 'error');
      console.error('Review submission error:', error);
    } finally {
      // Restore button state
      const submitBtn = document.getElementById('submit-review-btn');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  },
  
  /**
   * Load reviews for a specific task
   * @param {number} taskId - The task ID
   */
  async loadReviews(taskId) {
    const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
    
    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}/reviews`);
      
      if (!response.ok) {
        throw new Error('Failed to load reviews');
      }
      
      const reviews = await response.json();
      
      // Render reviews
      this.renderReviews(reviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
      document.getElementById('reviews-container').innerHTML = `
        <div class="text-center text-gray-500 py-4">
          <p>Could not load reviews. Please try again later.</p>
        </div>
      `;
    }
  },
  
  /**
   * Render reviews in the container
   * @param {Array} reviews - Array of review objects
   */
  renderReviews(reviews) {
    const container = document.getElementById('reviews-container');
    
    if (!container) return;
    
    if (reviews.length === 0) {
      container.innerHTML = `
        <div class="text-center text-gray-500 py-4">
          <p>No reviews yet for this task.</p>
        </div>
      `;
      return;
    }
    
    let reviewsHTML = '';
    
    reviews.forEach(review => {
      // Generate stars HTML
      let starsHTML = '';
      for (let i = 1; i <= 5; i++) {
        if (i <= review.rating) {
          starsHTML += '<i class="fas fa-star text-yellow-400"></i>';
        } else {
          starsHTML += '<i class="far fa-star text-gray-300"></i>';
        }
      }
      
      // Format date
      const reviewDate = new Date(review.createdAt).toLocaleDateString();
      
      reviewsHTML += `
        <div class="bg-white p-4 rounded-lg shadow-sm mb-4">
          <div class="flex justify-between items-center mb-2">
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-semibold mr-3">
                ${review.reviewerName.charAt(0)}
              </div>
              <div>
                <h4 class="font-medium">${review.reviewerName}</h4>
                <div class="flex text-sm">${starsHTML}</div>
              </div>
            </div>
            <span class="text-sm text-gray-500">${reviewDate}</span>
          </div>
          <p class="text-gray-600">${review.comment || "No comment provided"}</p>
        </div>
      `;
    });
    
    container.innerHTML = reviewsHTML;
  },
  
  /**
   * Show a notification message
   * @param {string} message - The message to display
   * @param {string} type - Message type (success, error, warning, info)
   */
  showNotification(message, type) {
    if (window.showNotification) {
      window.showNotification(message, type);
    } else {
      alert(message);
    }
  }
};

// Make it globally available
window.TaskReview = TaskReview;