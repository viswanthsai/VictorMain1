/**
 * Victor API Server
 * A Node.js backend server that handles user authentication, task management,
 * and other API endpoints for the Victor application.
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 9000;

// Constants
const JWT_SECRET = 'victor-secure-jwt-secret-change-in-production';
const USERS_FILE = path.join(__dirname, '../data/users.json');
const TASKS_FILE = path.join(__dirname, '../data/tasks.json');
const TOKEN_EXPIRY = '7d'; // Token expires after 7 days

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Ensure data directory and files exist
function ensureDataFilesExist() {
  const dataDir = path.join(__dirname, '../data');
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([
      {
        "id": 1,
        "fullname": "Demo User",
        "email": "demo@example.com",
        "password": hashPassword("123456"),
        "createdAt": new Date().toISOString(),
        "role": "user"
      }
    ], null, 2), 'utf8');
  }
  
  if (!fs.existsSync(TASKS_FILE)) {
    fs.writeFileSync(TASKS_FILE, JSON.stringify([
      {
        "id": 1,
        "title": "Need help with moving furniture",
        "description": "I need someone to help me move furniture from my apartment to a new place nearby.",
        "category": "Moving",
        "location": "New York, NY",
        "budget": 50,
        "status": "Open",
        "userId": 1,
        "createdBy": "Demo User",
        "createdAt": new Date().toISOString(),
        "updatedAt": new Date().toISOString()
      }
    ], null, 2), 'utf8');
  }
}

// Hash password
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate JWT token
function generateToken(userId, email, fullname) {
  return jwt.sign({ userId, email, fullname }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

// Auth middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Helper to read users data
function getUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
}

// Helper to write users data
function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing users file:', error);
    return false;
  }
}

// Helper to read tasks data
function getTasks() {
  try {
    const data = fs.readFileSync(TASKS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading tasks file:', error);
    return [];
  }
}

// Helper to write tasks data
function saveTasks(tasks) {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing tasks file:', error);
    return false;
  }
}

// API Routes

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({ status: 'API is running', version: '1.0.0' });
});

// Sign up endpoint
app.post('/api/signup', async (req, res) => {
  try {
    const { fullname, email, password } = req.body;
    
    // Validate input
    if (!fullname || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    
    // Load users
    const users = getUsers();
    
    // Check if email already exists
    if (users.some(user => user.email === email)) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    // Create new user
    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      fullname,
      email,
      password: hashPassword(password),
      createdAt: new Date().toISOString(),
      role: 'user'
    };
    
    // Save to file
    users.push(newUser);
    saveUsers(users);
    
    // Generate token
    const token = generateToken(newUser.id, newUser.email, newUser.fullname);
    
    // Return user data (excluding password)
    const { password: _, ...userData } = newUser;
    
    res.status(201).json({
      ...userData,
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Load users
    const users = getUsers();
    
    // Find user by email
    const user = users.find(user => user.email === email);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Verify password
    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      return res.status(401).json({ message: 'Invalid password' });
    }
    
    // Generate token
    const token = generateToken(user.id, user.email, user.fullname);
    
    // Return user data (excluding password)
    const { password: _, ...userData } = user;
    
    res.json({
      ...userData,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user
app.get('/api/users/me', authenticate, (req, res) => {
  try {
    const { userId } = req.user;
    const users = getUsers();
    const user = users.find(u => u.id === parseInt(userId));
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user data without password
    const { password, ...userData } = user;
    res.json(userData);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID
app.get('/api/users/:id', authenticate, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Check if requested user ID matches authenticated user ID
    if (userId !== parseInt(req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user data without password
    const { password, ...userData } = user;
    res.json(userData);
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all tasks
app.get('/api/tasks', (req, res) => {
  try {
    const tasks = getTasks();
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get task by ID
app.get('/api/tasks/:id', (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get tasks created by the authenticated user
app.get('/api/my-tasks', authenticate, (req, res) => {
  try {
    const { userId } = req.user;
    const tasks = getTasks();
    const userTasks = tasks.filter(task => task.userId === parseInt(userId));
    
    res.json(userTasks);
  } catch (error) {
    console.error('Get user tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new task
app.post('/api/tasks', authenticate, (req, res) => {
  try {
    const { userId } = req.user;
    const { title, description, category, location, budget, deadline } = req.body;
    
    // Validation
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }
    
    // Get user details for task creator info
    const users = getUsers();
    const user = users.find(u => u.id === parseInt(userId));
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get tasks and generate new ID
    const tasks = getTasks();
    const newTaskId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
    
    // Create new task
    const newTask = {
      id: newTaskId,
      title,
      description,
      category: category || 'Other',
      location: location || 'Remote',
      budget: budget ? parseInt(budget) : null,
      deadline: deadline || null,
      status: 'Open',
      userId: parseInt(userId),
      createdBy: user.fullname,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save to file
    tasks.push(newTask);
    saveTasks(tasks);
    
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a task
app.put('/api/tasks/:id', authenticate, (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const { userId } = req.user;
    const { title, description, category, location, budget, deadline, status } = req.body;
    
    // Get tasks
    const tasks = getTasks();
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check if user owns the task
    if (tasks[taskIndex].userId !== parseInt(userId)) {
      return res.status(403).json({ message: 'You can only update your own tasks' });
    }
    
    // Update task
    const updatedTask = {
      ...tasks[taskIndex],
      title: title || tasks[taskIndex].title,
      description: description || tasks[taskIndex].description,
      category: category || tasks[taskIndex].category,
      location: location || tasks[taskIndex].location,
      budget: budget ? parseInt(budget) : tasks[taskIndex].budget,
      deadline: deadline || tasks[taskIndex].deadline,
      status: status || tasks[taskIndex].status,
      updatedAt: new Date().toISOString()
    };
    
    tasks[taskIndex] = updatedTask;
    saveTasks(tasks);
    
    res.json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a task
app.delete('/api/tasks/:id', authenticate, (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const { userId } = req.user;
    
    // Get tasks
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check if user owns the task
    if (task.userId !== parseInt(userId)) {
      return res.status(403).json({ message: 'You can only delete your own tasks' });
    }
    
    // Remove task
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    saveTasks(updatedTasks);
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept a task
app.post('/api/tasks/:id/accept', authenticate, (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const tasks = getTasks();
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const task = tasks[taskIndex];
    
    // Validate task state
    if (task.status !== 'Open') {
      return res.status(400).json({ message: 'Task is not available for acceptance' });
    }
    
    // Prevent user from accepting own task
    if (task.userId === parseInt(req.user.userId)) {
      return res.status(400).json({ message: 'You cannot accept your own task' });
    }
    
    // Get user info to include name in acceptedBy field
    const users = getUsers();
    const acceptingUser = users.find(user => user.id === parseInt(req.user.userId));
    
    if (!acceptingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update task
    const updatedTask = {
      ...task,
      status: 'In Progress',
      acceptedById: parseInt(req.user.userId),
      acceptedBy: acceptingUser.fullname,
      acceptedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Update in array
    tasks[taskIndex] = updatedTask;
    
    // Write back to file
    saveTasks(tasks);
    
    // Return updated task
    res.json(updatedTask);
  } catch (error) {
    console.error(`Error in accepting task:`, error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Complete a task
app.post('/api/tasks/:id/complete', authenticate, (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const { userId } = req.user;
    
    // Get tasks
    const tasks = getTasks();
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const task = tasks[taskIndex];
    
    // Check if task is in progress
    if (task.status !== 'In Progress') {
      return res.status(400).json({ message: 'Only in-progress tasks can be completed' });
    }
    
    // Check if user is the task creator or acceptor
    if (task.userId !== parseInt(userId) && task.acceptedById !== parseInt(userId)) {
      return res.status(403).json({ message: 'You are not authorized to complete this task' });
    }
    
    // Update task
    const updatedTask = {
      ...task,
      status: 'Completed',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    tasks[taskIndex] = updatedTask;
    saveTasks(tasks);
    
    res.json(updatedTask);
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get tasks accepted by the authenticated user
app.get('/api/accepted-tasks', authenticate, (req, res) => {
  try {
    const { userId } = req.user;
    const tasks = getTasks();
    const acceptedTasks = tasks.filter(task => task.acceptedById === parseInt(userId));
    
    res.json(acceptedTasks);
  } catch (error) {
    console.error('Get accepted tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search tasks endpoint with advanced filtering
app.get('/api/tasks/search', (req, res) => {
  try {
    // Get all tasks
    const tasks = getTasks();
    
    // Extract query parameters
    const {
      q,              // text search
      category,       // category filter
      location,       // location filter
      minBudget,      // minimum budget
      maxBudget,      // maximum budget
      status,         // task status
      sort           // sort parameter (newest, oldest, budget_high, budget_low)
    } = req.query;
    
    // Filter tasks
    let filteredTasks = [...tasks];
    
    // Apply text search across title and description
    if (q) {
      const searchQuery = q.toLowerCase();
      filteredTasks = filteredTasks.filter(task => 
        task.title.toLowerCase().includes(searchQuery) || 
        task.description.toLowerCase().includes(searchQuery)
      );
    }
    
    // Apply category filter
    if (category) {
      filteredTasks = filteredTasks.filter(task => 
        task.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    // Apply location filter
    if (location) {
      filteredTasks = filteredTasks.filter(task => 
        task.location.toLowerCase().includes(location.toLowerCase())
      );
    }
    
    // Apply budget filters
    if (minBudget) {
      const min = parseFloat(minBudget);
      filteredTasks = filteredTasks.filter(task => 
        task.budget && task.budget >= min
      );
    }
    
    if (maxBudget) {
      const max = parseFloat(maxBudget);
      filteredTasks = filteredTasks.filter(task => 
        task.budget && task.budget <= max
      );
    }
    
    // Apply status filter
    if (status) {
      filteredTasks = filteredTasks.filter(task => 
        task.status.toLowerCase() === status.toLowerCase()
      );
    }
    
    // Apply sorting
    if (sort) {
      switch (sort) {
        case 'newest':
          filteredTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          break;
        case 'oldest':
          filteredTasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          break;
        case 'budget_high':
          filteredTasks.sort((a, b) => (b.budget || 0) - (a.budget || 0));
          break;
        case 'budget_low':
          filteredTasks.sort((a, b) => (a.budget || 0) - (b.budget || 0));
          break;
      }
    } else {
      // Default sort by newest
      filteredTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    // Return results
    res.json({
      count: filteredTasks.length,
      results: filteredTasks
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Error searching tasks' });
  }
});

// Reviews endpoints
app.post('/api/tasks/:id/review', authenticate, (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const { userId } = req.user;
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    // Get tasks
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check if task is completed
    if (task.status !== 'Completed') {
      return res.status(400).json({ message: 'Can only review completed tasks' });
    }
    
    // Add review
    const review = {
      userId: parseInt(userId),
      rating: parseInt(rating),
      comment: comment || '',
      createdAt: new Date().toISOString()
    };
    
    if (!task.reviews) {
      task.reviews = [];
    }
    
    task.reviews.push(review);
    task.updatedAt = new Date().toISOString();
    
    saveTasks(tasks);
    
    res.status(201).json(review);
  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ message: 'Error adding review' });
  }
});

// Initialize data files
ensureDataFilesExist();

// Start server
app.listen(PORT, () => {
  console.log(`Victor API Server running on port ${PORT}`);
});

// Export for testing
module.exports = app;