/**
 * Payment System for Victor
 * Handles payment processing and transaction history
 */

const PaymentSystem = {
  /**
   * Initialize payment form for a task
   * @param {Object} task - Task data including budget
   */
  initPaymentForm(task) {
    const paymentForm = document.getElementById('payment-form');
    if (!paymentForm) return;
    
    // Display payment amount
    const amountDisplay = document.getElementById('payment-amount');
    if (amountDisplay) {
      amountDisplay.textContent = task.budget ? `₹${task.budget}` : 'Negotiable';
    }
    
    // Handle form submission
    paymentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // In a real implementation, you would collect and validate payment details here
      const paymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value;
      
      if (!paymentMethod) {
        this.showNotification('Please select a payment method', 'warning');
        return;
      }
      
      // Process the payment
      await this.processPayment(task.id, task.budget, paymentMethod);
    });
  },
  
  /**
   * Process a payment for a task
   * @param {number} taskId - The task ID
   * @param {number} amount - Payment amount
   * @param {string} paymentMethod - Selected payment method
   */
  async processPayment(taskId, amount, paymentMethod) {
    const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = 'login.html?redirect=task-detail.html?id=' + taskId;
      return;
    }
    
    try {
      // Show loading state
      const submitBtn = document.getElementById('submit-payment-btn');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
      
      // This is a placeholder - in a real implementation you would:
      // 1. Collect and validate card details or UPI information
      // 2. Use a payment gateway API to process the payment
      // 3. Handle success/failure responses
      
      // For demonstration, simulate an API call
      const response = await fetch(`${API_URL}/api/payments/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          taskId,
          amount,
          paymentMethod
        })
      });
      
      if (!response.ok) {
        // Handle payment error
        const error = await response.json();
        throw new Error(error.message || 'Payment failed');
      }
      
      const result = await response.json();
      
      // Show success message and redirect
      this.showNotification('Payment processed successfully!', 'success');
      
      // Hide payment form and show success message
      document.getElementById('payment-form-container').classList.add('hidden');
      document.getElementById('payment-success').classList.remove('hidden');
      
      // After a delay, redirect to task detail page
      setTimeout(() => {
        window.location.href = `task-detail.html?id=${taskId}&payment=success`;
      }, 2000);
      
    } catch (error) {
      // Handle errors
      if (error.message.includes('Payment failed')) {
        this.showNotification('Payment failed. Please try again.', 'error');
      } else {
        this.showNotification('An error occurred. Please try again later.', 'error');
      }
      console.error('Payment error:', error);
    } finally {
      // Restore button state
      const submitBtn = document.getElementById('submit-payment-btn');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  },
  
  /**
   * Load transaction history for the current user
   */
  async loadTransactionHistory() {
    const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = 'login.html?redirect=transactions.html';
      return;
    }
    
    try {
      // Show loading state
      const container = document.getElementById('transactions-container');
      if (container) {
        container.innerHTML = `
          <div class="text-center py-8">
            <div class="inline-block w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin mb-4"></div>
            <p class="text-gray-500">Loading transaction history...</p>
          </div>
        `;
      }
      
      // Fetch transaction history
      const response = await fetch(`${API_URL}/api/payments/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load transaction history');
      }
      
      const transactions = await response.json();
      
      // Render transactions
      this.renderTransactions(transactions);
      
    } catch (error) {
      console.error('Error loading transactions:', error);
      const container = document.getElementById('transactions-container');
      if (container) {
        container.innerHTML = `
          <div class="bg-red-50 rounded-lg p-6 text-center">
            <i class="fas fa-exclamation-circle text-red-500 text-4xl mb-4"></i>
            <h2 class="text-xl font-bold mb-2">Error Loading Transactions</h2>
            <p class="text-gray-600 mb-4">${error.message || 'Failed to load your transaction history'}</p>
            <button onclick="PaymentSystem.loadTransactionHistory()" class="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition">
              Try Again
            </button>
          </div>
        `;
      }
    }
  },
  
  /**
   * Render transactions in the container
   * @param {Array} transactions - Array of transaction objects
   */
  renderTransactions(transactions) {
    const container = document.getElementById('transactions-container');
    if (!container) return;
    
    if (transactions.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8">
          <div class="bg-gray-50 rounded-full p-6 inline-block mb-4">
            <i class="fas fa-receipt text-gray-400 text-4xl"></i>
          </div>
          <h3 class="text-lg font-medium mb-2">No Transactions Yet</h3>
          <p class="text-gray-500">You haven't made any payments yet.</p>
        </div>
      `;
      return;
    }
    
    // Create table for transactions
    let html = `
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
    `;
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.createdAt).toLocaleDateString();
      
      let statusClass = '';
      switch (transaction.status) {
        case 'completed':
          statusClass = 'bg-green-100 text-green-800';
          break;
        case 'pending':
          statusClass = 'bg-yellow-100 text-yellow-800';
          break;
        case 'failed':
          statusClass = 'bg-red-100 text-red-800';
          break;
        default:
          statusClass = 'bg-gray-100 text-gray-800';
      }
      
      html += `
        <tr>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${date}</td>
          <td class="px-6 py-4 whitespace-nowrap">
            <a href="task-detail.html?id=${transaction.taskId}" class="text-primary hover:underline">
              ${transaction.taskTitle}
            </a>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">₹${transaction.amount}</td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
              ${transaction.status}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            ${transaction.paymentMethod}
          </td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    container.innerHTML = html;
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
window.PaymentSystem = PaymentSystem;