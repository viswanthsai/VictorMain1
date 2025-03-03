/**
 * Profile Management Module
 * Handles loading, displaying, and updating user profile information
 */

document.addEventListener('DOMContentLoaded', function() {
  // Check authentication and load profile data
  if (localStorage.getItem('token')) {
    loadUserProfile();
    setupEditProfileForm();
  } else {
    window.location.href = 'login.html?redirect=profile.html&message=Please login to view your profile';
  }
});

// Load user profile data
async function loadUserProfile() {
  const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  
  if (!token || !userId) {
    console.error('Authentication data missing');
    return;
  }
  
  try {
    // Show loading spinner
    document.getElementById('profile-loading').classList.remove('hidden');
    document.getElementById('profile-content').classList.add('hidden');
    
    // Fetch user profile data
    const response = await fetch(`${API_URL}/api/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load profile data');
    }
    
    const userData = await response.json();
    
    // Hide loading, show content
    document.getElementById('profile-loading').classList.add('hidden');
    document.getElementById('profile-content').classList.remove('hidden');
    
    // Populate profile with user data
    populateProfileData(userData);
    
    // Load tasks stats
    loadTaskStats(userId, token);
  } catch (error) {
    console.error('Error loading profile:', error);
    showProfileError(error.message || 'Failed to load your profile data');
  }
}

// Populate profile with user data
function populateProfileData(userData) {
  // Get values, handling potential undefined fields
  const fullname = userData.fullname || userData.name || localStorage.getItem('username') || 'User';
  const email = userData.email || localStorage.getItem('userEmail') || 'No email available';
  const joinDate = userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'Unknown';
  const phone = userData.phone || 'Not provided';
  const location = userData.location || 'Not provided';
  
  // Set user initials in avatar
  const initials = fullname
    .split(' ')
    .map(name => name.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
  document.getElementById('user-avatar').textContent = initials || 'U';
  
  // Update profile elements
  document.getElementById('profile-name').textContent = fullname;
  document.getElementById('profile-email').textContent = email;
  document.getElementById('join-date').textContent = joinDate;
  document.getElementById('display-name').textContent = fullname;
  document.getElementById('display-email').textContent = email;
  document.getElementById('display-phone').textContent = phone;
  document.getElementById('display-location').textContent = location;
  document.getElementById('member-since').textContent = joinDate;
  
  // Also populate edit form if it exists
  const editNameInput = document.getElementById('edit-fullname');
  const editEmailInput = document.getElementById('edit-email');
  const editPhoneInput = document.getElementById('edit-phone');
  const editLocationInput = document.getElementById('edit-location');
  
  if (editNameInput) editNameInput.value = fullname;
  if (editEmailInput) editEmailInput.value = email;
  if (editPhoneInput) editPhoneInput.value = phone !== 'Not provided' ? phone : '';
  if (editLocationInput) editLocationInput.value = location !== 'Not provided' ? location : '';
}

// Set up edit profile form and toggle
function setupEditProfileForm() {
  // Get elements
  const editProfileBtn = document.getElementById('edit-profile-btn');
  const viewProfileSection = document.getElementById('view-profile-section');
  const editProfileSection = document.getElementById('edit-profile-section');
  
  // Check if elements exist (they might be missing in some versions of the page)
  if (!editProfileBtn || !viewProfileSection) {
    console.warn('Edit profile form elements not found, skipping setup');
    return;
  }
  
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  const profileForm = document.getElementById('profile-form');
  
  // Edit profile button click
  editProfileBtn.addEventListener('click', function() {
    viewProfileSection.classList.add('hidden');
    if (editProfileSection) {
      editProfileSection.classList.remove('hidden');
    }
  });
  
  // Cancel button click if it exists
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', function() {
      if (editProfileSection) {
        editProfileSection.classList.add('hidden');
      }
      viewProfileSection.classList.remove('hidden');
    });
  }
  
  // Form submission if it exists
  if (profileForm) {
    profileForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      await updateProfile();
    });
  }
}

// Update user profile
async function updateProfile() {
  const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  
  // Get form values
  const fullname = document.getElementById('edit-fullname').value.trim();
  const email = document.getElementById('edit-email').value.trim();
  const phone = document.getElementById('edit-phone').value.trim();
  const location = document.getElementById('edit-location').value.trim();
  
  // Validate
  if (!fullname) {
    showNotification('Name is required', 'error');
    return;
  }
  
  if (!email) {
    showNotification('Email is required', 'error');
    return;
  }
  
  try {
    // Show loading state
    const submitBtn = document.getElementById('save-profile-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
    
    // Send update request
    const response = await fetch(`${API_URL}/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        fullname,
        email,
        phone,
        location
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update profile');
    }
    
    // Get updated data
    const userData = await response.json();
    
    // Update localStorage values
    localStorage.setItem('username', userData.fullname);
    localStorage.setItem('userEmail', userData.email);
    
    // Update UI
    populateProfileData(userData);
    
    // Show success message
    showNotification('Profile updated successfully', 'success');
    
    // Switch back to view mode
    document.getElementById('view-profile-section').classList.remove('hidden');
    document.getElementById('edit-profile-section').classList.add('hidden');
  } catch (error) {
    showNotification(error.message || 'Error updating profile', 'error');
    console.error('Update profile error:', error);
  } finally {
    // Restore button state
    const submitBtn = document.getElementById('save-profile-btn');
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Save Changes';
  }
}

// Show profile error
function showProfileError(message) {
  document.getElementById('profile-loading').innerHTML = `
    <div class="bg-red-50 rounded-lg p-6 text-center">
      <i class="fas fa-exclamation-circle text-red-500 text-4xl mb-4"></i>
      <h2 class="text-xl font-bold mb-2">Error Loading Profile</h2>
      <p class="text-gray-600 mb-4">${message}</p>
      <button onclick="window.location.reload()" class="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition">
        Try Again
      </button>
    </div>
  `;
}

// Show notification
function showNotification(message, type) {
  if (window.showNotification) {
    window.showNotification(message, type);
  } else {
    alert(message);
  }
}

// Load task statistics
async function loadTaskStats(userId, token) {
  const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:9000';
  
  try {
    // Fetch tasks
    const response = await fetch(`${API_URL}/api/tasks`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load tasks data');
    }
    
    const tasks = await response.json();
    
    // Count user's tasks
    const postedTasks = tasks.filter(task => task.userId == userId);
    const acceptedTasks = tasks.filter(task => task.acceptedById == userId);
    const completedTasks = tasks.filter(task => 
      task.status === 'Completed' && 
      (task.userId == userId || task.acceptedById == userId)
    );
    
    // Update stats in UI if elements exist
    const postedTasksElement = document.getElementById('posted-tasks-count');
    const acceptedTasksElement = document.getElementById('accepted-tasks-count');
    const completedTasksElement = document.getElementById('completed-tasks-count');
    
    if (postedTasksElement) {
      postedTasksElement.textContent = postedTasks.length;
    }
    
    if (acceptedTasksElement) {
      acceptedTasksElement.textContent = acceptedTasks.length;
    }
    
    if (completedTasksElement) {
      completedTasksElement.textContent = completedTasks.length;
    }
  } catch (error) {
    console.error('Error loading task statistics:', error);
    // Show error in stats section if it exists
    const statsContainer = document.getElementById('task-stats-container');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="text-center text-gray-500 py-4">
          <p>Could not load task statistics</p>
        </div>
      `;
    }
  }
}

// Update user profile
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Ensure user can only update their own profile
    if (userId !== req.user.id) {
      return res.status(403).json({ message: 'You can only update your own profile' });
    }
    
    const { fullname, email, phone, location } = req.body;
    
    // Validate required fields
    if (!fullname || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }
    
    // Get users
    const users = await readData(USERS_FILE);
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if email is being changed and if it's already in use
    if (email !== users[userIndex].email) {
      const emailExists = users.some(u => u.email === email && u.id !== userId);
      if (emailExists) {
        return res.status(409).json({ message: 'Email already in use' });
      }
    }
    
    // Update user
    users[userIndex] = {
      ...users[userIndex],
      fullname,
      email,
      phone: phone || users[userIndex].phone,
      location: location || users[userIndex].location,
      updatedAt: new Date().toISOString()
    };
    
    // Save updated users
    await writeData(USERS_FILE, users);
    
    // Return updated user without password
    const { password, ...userData } = users[userIndex];
    res.json(userData);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
