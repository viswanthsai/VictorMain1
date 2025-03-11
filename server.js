const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/User');
const Task = require('./models/Task');
const Offer = require('./models/Offer');
const Chat = require('./models/Chat');
const Message = require('./models/Message');

// Initialize Express app
const app = express();
const RENDER_URL = process.env.RENDER_URL || 'https://victormain1.onrender.com';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-development-only';
const PORT = process.env.PORT || 9000;

// Add at the top of server.js
app.use((req, res, next) => {
  const allowedHosts = [
    'victormain1.onrender.com',
    'victortasks.site',
    'www.victortasks.site',
    'localhost',
    '127.0.0.1'  // Add this line
  ];
  
  const host = req.hostname;
  const isAllowed = allowedHosts.some(allowedHost => host === allowedHost || host.endsWith('.' + allowedHost));
  
  if (isAllowed) {
    next();
  } else {
    console.warn(`Request from disallowed host: ${host}`);
    res.status(403).send('Access denied: Host not allowed');
  }
});

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://viswanthsai:QWEASDZXC1q@cluster0.6ndpu.mongodb.net/victorDB?retryWrites=true&w=majority&appName=Cluster0";

// Track MongoDB connection status
let mongoConnected = false;

// Connect to MongoDB with improved options
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000, 
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
})
.then(() => {
  mongoConnected = true;
  console.log('Connected to MongoDB Atlas');
  console.log('Connection state:', mongoose.connection.readyState);
  console.log('MongoDB host:', mongoose.connection.host);
})
.catch(err => {
  mongoConnected = false;
  console.error('MongoDB connection error:', err);
  console.log('Server will continue with file-based storage');
});

// Add connection event handlers
mongoose.connection.on('error', err => {
  mongoConnected = false;
  console.log('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  mongoConnected = false;
  console.log('Mongoose disconnected');
});

// Update CORS configuration in server.js
const corsOptions = {
  origin: [
    'https://victormain1.onrender.com',
    'http://victormain1.onrender.com',
    'https://victortasks.site',
    'http://victortasks.site',
    'https://www.victortasks.site',
    'http://www.victortasks.site',
    'http://localhost:5502',
    'http://127.0.0.1:5502',  // Add this line
    'http://localhost:9000',
    'http://127.0.0.1:9000'   // Add this line
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Enable pre-flight across all routes
app.options('*', cors());

// Request parsing middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Serve static files from root directory
app.use(express.static(path.join(__dirname)));

// Data file paths for file-based fallback storage
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const OFFERS_FILE = path.join(DATA_DIR, 'offers.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');

// Ensure data directory exists
async function ensureDataDirExists() {
  try {
    await fs.access(DATA_DIR);
    console.log('Data directory exists:', DATA_DIR);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('Creating data directory:', DATA_DIR);
      await fs.mkdir(DATA_DIR, { recursive: true });
      
      // Create empty data files if they don't exist
      await createEmptyFileIfNotExists(USERS_FILE);
      await createEmptyFileIfNotExists(TASKS_FILE);
      await createEmptyFileIfNotExists(OFFERS_FILE);
      await createEmptyFileIfNotExists(NOTIFICATIONS_FILE);
    } else {
      console.error('Error accessing data directory:', error);
      throw error;
    }
  }
}

// Helper to create empty JSON file if it doesn't exist
async function createEmptyFileIfNotExists(filePath) {
  try {
    await fs.access(filePath);
  } catch (e) {
    await fs.writeFile(filePath, '[]');
    console.log(`Created empty file: ${path.basename(filePath)}`);
  }
}

// Ensure all data files exist on startup
async function initializeDataFiles() {
  await createEmptyFileIfNotExists(USERS_FILE);
  await createEmptyFileIfNotExists(TASKS_FILE);
  await createEmptyFileIfNotExists(OFFERS_FILE);
  await createEmptyFileIfNotExists(NOTIFICATIONS_FILE);
}

// Read data from JSON file
async function readData(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // If file doesn't exist, return empty array
      return [];
    }
    throw error;
  }
}

// Write data to JSON file
async function writeData(filePath, data) {
  // Ensure data directory exists
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  
  // Write data
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  return true;
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    
    // Add user data to request
    req.user = user;
    next();
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    message: 'Server error',
    error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
});

// Create notifications collection if using MongoDB
let notificationsCollection;
if (mongoConnected) {
  const notificationSchema = new mongoose.Schema({
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer'
    },
    read: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  });
  
  const Notification = mongoose.model('Notification', notificationSchema);
}

// API ROUTES
// ===========

// Server status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    mongodb: {
      connected: mongoConnected,
      state: mongoose.connection.readyState
    }
  });
});

// Database connection test
app.get('/api/db-test', (req, res) => {
  if (mongoose.connection.readyState === 1) {
    res.json({ 
      status: 'connected', 
      message: 'MongoDB connection successful',
      details: {
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        models: Object.keys(mongoose.models)
      }
    });
  } else {
    res.status(500).json({ 
      status: 'disconnected', 
      message: 'MongoDB not connected',
      readyState: mongoose.connection.readyState
    });
  }
});

// Authentication Routes
// --------------------

// User Registration
app.post('/api/signup', async (req, res) => {
  try {
    const { fullname, email, password } = req.body;
    
    // Validation
    if (!fullname || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    if (mongoConnected) {
      // MongoDB version
      // Check if email exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(409).json({ message: 'Email already in use' });
      }
      
      // Create new user
      const user = new User({
        fullname,
        email: email.toLowerCase(),
        password // Will be hashed by the pre-save hook
      });
      
      await user.save();
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.status(201).json({
        token,
        userId: user._id,
        username: user.fullname,
        email: user.email
      });
    } else {
      // File-based version
      const users = await readData(USERS_FILE);
      
      // Check if email exists
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(409).json({ message: 'Email already in use' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create new user
      const newUser = {
        id: uuidv4(),
        fullname,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add to users array
      users.push(newUser);
      
      // Save to file
      await writeData(USERS_FILE, users);
      
      // Generate JWT token
      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: newUser.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.status(201).json({
        token,
        userId: newUser.id,
        username: newUser.fullname,
        email: newUser.email
      });
    }
  } catch (error) {
    console.error('Error in /api/signup:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    let user, passwordMatch, userId;
    
    if (mongoConnected) {
      // MongoDB version
      // Find user by email
      user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Compare passwords
      passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      userId = user._id;
    } else {
      // File-based version
      const users = await readData(USERS_FILE);
      
      // Find user by email
      user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Compare passwords
      passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      userId = user.id;
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: userId, email: user.email, role: user.role || 'user' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Return user info and token
    res.json({
      token,
      userId,
      username: user.fullname,
      email: user.email,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Error in /api/login:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// User Routes
// -----------

// Get Current User
app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    if (mongoConnected) {
      // MongoDB version
      const user = await User.findById(req.user.id).lean();
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Return user data without password
      const { password, ...userData } = user;
      return res.json({
        ...userData,
        username: user.fullname
      });
    } else {
      // File-based version
      const users = await readData(USERS_FILE);
      const user = users.find(u => u.id === req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Return user data without password
      const { password, ...userData } = user;
      return res.json(userData);
    }
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get User By ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    if (mongoConnected) {
      // MongoDB version
      const user = await User.findById(userId).lean();
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Return user data without password
      const { password, ...userData } = user;
      
      // Transform the user data to match client expectations
      return res.json({
        id: userData._id,
        username: userData.fullname,
        email: userData.email,
        role: userData.role,
        location: userData.location,
        createdAt: userData.createdAt,
        bio: userData.bio || '',
        skills: userData.skills || []
      });
    } else {
      // File-based version
      const users = await readData(USERS_FILE);
      const user = users.find(u => u.id === userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Return user data without password
      const { password, ...userData } = user;
      return res.json(userData);
    }
  } catch (error) {
    console.error('Error in GET /api/users/:id:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update User Profile
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Ensure user can only modify their own profile unless they're admin
    if (userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this profile' });
    }
    
    if (mongoConnected) {
      // MongoDB version
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Update allowed fields
      const allowedUpdates = ['fullname', 'bio', 'location', 'skills', 'profileImage'];
      for (const field of allowedUpdates) {
        if (req.body[field] !== undefined) {
          user[field] = req.body[field];
        }
      }
      
      // Save updated user
      await user.save();
      
      // Return without password
      const userObject = user.toObject();
      delete userObject.password;
      
      res.json(userObject);
    } else {
      // File-based version
      const users = await readData(USERS_FILE);
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Update user fields but preserve some
      const updatedUser = {
        ...users[userIndex],
        ...req.body,
        id: userId, // Ensure ID doesn't change
        password: users[userIndex].password, // Preserve password
        role: users[userIndex].role, // Preserve role
        updatedAt: new Date().toISOString()
      };
      
      // Replace in array
      users[userIndex] = updatedUser;
      
      // Write back to file
      await writeData(USERS_FILE, users);
      
      // Return updated user info without password
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    }
  } catch (error) {
    console.error(`Error in PUT /api/users/${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Task Routes
// -----------

// Get All Tasks
app.get('/api/tasks', async (req, res) => {
  try {
    let tasks;
    const { category, status, search } = req.query;
    
    if (mongoConnected) {
      // MongoDB version
      let query = {};
      
      // Apply filters if provided
      if (category) query.category = category;
      if (status) query.status = status;
      if (search) query.title = { $regex: search, $options: 'i' };
      
      tasks = await Task.find(query).lean();
    } else {
      // File-based version
      tasks = await readData(TASKS_FILE);
      
      // Apply filters if provided
      if (category) {
        tasks = tasks.filter(task => task.category === category);
      }
      if (status) {
        tasks = tasks.filter(task => task.status === status);
      }
      if (search) {
        const searchLower = search.toLowerCase();
        tasks = tasks.filter(task => 
          task.title.toLowerCase().includes(searchLower) || 
          (task.description && task.description.toLowerCase().includes(searchLower))
        );
      }
    }
    
    res.json(tasks);
  } catch (error) {
    console.error('Error in GET /api/tasks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create Task
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, location, budget, deadline, contactDetails, specificLocation, urgent } = req.body;
    
    // Validation
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }
    
    if (mongoConnected) {
      // MongoDB version
      // Get user info
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Create new task - Add contactDetails field here
      const task = new Task({
        title,
        description,
        category: category || 'Other',
        location: location || 'Remote',
        specificLocation: specificLocation || null,
        contactDetails: contactDetails || null, // Add this line
        budget: budget || null,
        deadline: deadline || null,
        userId: user._id,
        createdBy: user.fullname,
        status: 'Open',
        urgent: urgent || false // Add this line too for the urgent flag
      });
      
      await task.save();
      
      // Return the new task
      res.status(201).json(task);
    } else {
      // File-based version
      const tasks = await readData(TASKS_FILE);
      
      // Create new task
      const newTask = {
        id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
        title,
        description,
        category: category || 'Other',
        location: location || 'Remote',
        specificLocation: specificLocation || null,
        contactDetails: contactDetails || null, // Add this line
        budget: budget ? parseInt(budget) : null,
        deadline: deadline || null,
        urgent: urgent || false, // Add this line too
        userId: req.user.id,
        status: 'Open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add to tasks array
      tasks.push(newTask);
      
      // Save to file
      await writeData(TASKS_FILE, tasks);
      
      res.status(201).json(newTask);
    }
  } catch (error) {
    console.error('Error in POST /api/tasks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Task by ID
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    let task;
    
    if (mongoConnected) {
      // MongoDB version
      // First try with the ID as is
      task = await Task.findById(taskId).lean().catch(err => null);
      
      // If not found and the ID looks like a number, try finding by the 'id' field
      if (!task && !isNaN(taskId)) {
        task = await Task.findOne({ id: parseInt(taskId) }).lean().catch(err => null);
      }
    } else {
      // File-based version
      const tasks = await readData(TASKS_FILE);
      task = tasks.find(t => t.id === parseInt(taskId) || t.id === taskId);
    }
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    console.error(`Error in GET /api/tasks/${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update Task
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    
    if (mongoConnected) {
      // MongoDB version
      const task = await Task.findById(taskId);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Check ownership
      if (task.userId.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to update this task' });
      }
      
      // Update allowed fields
      const allowedUpdates = ['title', 'description', 'category', 'location', 'budget', 'deadline', 'status'];
      for (const field of allowedUpdates) {
        if (req.body[field] !== undefined) {
          task[field] = req.body[field];
        }
      }
      
      // Save changes
      await task.save();
      
      res.json(task);
    } else {
      // File-based version
      const tasks = await readData(TASKS_FILE);
      const taskIndex = tasks.findIndex(t => t.id === parseInt(taskId) || t.id === taskId);
      
      if (taskIndex === -1) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Check ownership
      if (tasks[taskIndex].userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to update this task' });
      }
      
      // Update task fields
      const updatedTask = {
        ...tasks[taskIndex],
        ...req.body,
        id: tasks[taskIndex].id, // Preserve ID
        userId: tasks[taskIndex].userId, // Preserve owner
        updatedAt: new Date().toISOString()
      };
      
      // Replace in array
      tasks[taskIndex] = updatedTask;
      
      // Write back to file
      await writeData(TASKS_FILE, tasks);
      
      res.json(updatedTask);
    }
  } catch (error) {
    console.error(`Error in PUT /api/tasks/${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update Task Status
app.put('/api/tasks/:id/status', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    
    if (!['Open', 'In Progress', 'Completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    
    if (mongoConnected) {
      // MongoDB version
      const task = await Task.findById(taskId);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Check ownership for certain transitions
      if (task.userId.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to update this task status' });
      }
      
      // Update status and related fields
      task.status = status;
      
      if (status === 'Completed') {
        task.completedAt = new Date();
      }
      
      // Save changes
      await task.save();
      
      res.json(task);
    } else {
      // File-based version
      const tasks = await readData(TASKS_FILE);
      const taskIndex = tasks.findIndex(t => t.id === parseInt(taskId) || t.id === taskId);
      
      if (taskIndex === -1) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Check ownership for certain transitions
      if (tasks[taskIndex].userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to update this task status' });
      }
      
      // Update task status and related fields
      const updatedTask = {
        ...tasks[taskIndex],
        status,
        updatedAt: new Date().toISOString()
      };
      
      if (status === 'Completed') {
        updatedTask.completedAt = new Date().toISOString();
      }
      
      // Replace in array
      tasks[taskIndex] = updatedTask;
      
      // Write back to file
      await writeData(TASKS_FILE, tasks);
      
      res.json(updatedTask);
    }
  } catch (error) {
    console.error(`Error in PUT /api/tasks/${req.params.id}/status:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete Task
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    
    if (mongoConnected) {
      // MongoDB version
      const task = await Task.findById(taskId);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Check ownership
      if (task.userId.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to delete this task' });
      }
      
      // Delete task
      await Task.findByIdAndDelete(taskId);
      
      // Delete associated offers
      await Offer.deleteMany({ taskId });
      
      res.status(204).send();
    } else {
      // File-based version
      const tasks = await readData(TASKS_FILE);
      const taskIndex = tasks.findIndex(t => t.id === parseInt(taskId) || t.id === taskId);
      
      if (taskIndex === -1) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Check ownership
      if (tasks[taskIndex].userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to delete this task' });
      }
      
      // Remove task
      tasks.splice(taskIndex, 1);
      
      // Write back to file
      await writeData(TASKS_FILE, tasks);
      
      // Also remove associated offers
      const offers = await readData(OFFERS_FILE);
      const updatedOffers = offers.filter(o => o.taskId !== parseInt(taskId) && o.taskId !== taskId);
      await writeData(OFFERS_FILE, updatedOffers);
      
      res.status(204).send();
    }
  } catch (error) {
    console.error(`Error in DELETE /api/tasks/${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Accept Task
app.post('/api/tasks/:id/accept', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    
    if (mongoConnected) {
      // MongoDB version
      const task = await Task.findById(taskId);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Validate task state
      if (task.status !== 'Open') {
        return res.status(400).json({ message: 'Task is not available for acceptance' });
      }
      
      // Prevent user from accepting own task
      if (task.userId.toString() === req.user.id) {
        return res.status(400).json({ message: 'You cannot accept your own task' });
      }
      
      // Update task
      task.status = 'In Progress';
      task.acceptedById = req.user.id;
      task.acceptedAt = new Date();
      
      await task.save();
      
      res.json(task);
    } else {
      // File-based version
      const tasks = await readData(TASKS_FILE);
      const taskIndex = tasks.findIndex(t => t.id === parseInt(taskId) || t.id === taskId);
      
      if (taskIndex === -1) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      const task = tasks[taskIndex];
      
      // Validate task state
      if (task.status !== 'Open') {
        return res.status(400).json({ message: 'Task is not available for acceptance' });
      }
      
      // Prevent user from accepting own task
      if (task.userId === req.user.id) {
        return res.status(400).json({ message: 'You cannot accept your own task' });
      }
      
      // Update task
      const updatedTask = {
        ...task,
        status: 'In Progress',
        acceptedById: req.user.id,
        acceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Update in array
      tasks[taskIndex] = updatedTask;
      
      // Write back to file
      await writeData(TASKS_FILE, tasks);
      
      res.json(updatedTask);
    }
  } catch (error) {
    console.error(`Error in /api/tasks/${req.params.id}/accept:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Complete Task
app.post('/api/tasks/:id/complete', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    
    if (mongoConnected) {
      // MongoDB version
      const task = await Task.findById(taskId);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Only task owner can mark as complete
      if (task.userId.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only the task owner can mark it as complete' });
      }
      
      // Validate task state
      if (task.status !== 'In Progress') {
        return res.status(400).json({ message: 'Only tasks that are in progress can be completed' });
      }
      
      // Update task
      task.status = 'Completed';
      task.completedAt = new Date();
      
      await task.save();
      
      res.json(task);
    } else {
      // File-based version
      const tasks = await readData(TASKS_FILE);
      const taskIndex = tasks.findIndex(t => t.id === parseInt(taskId) || t.id === taskId);
      
      if (taskIndex === -1) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      const task = tasks[taskIndex];
      
      // Only task owner can mark as complete
      if (task.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only the task owner can mark it as complete' });
      }
      
      // Validate task state
      if (task.status !== 'In Progress') {
        return res.status(400).json({ message: 'Only tasks that are in progress can be completed' });
      }
      
      // Update task
      const updatedTask = {
        ...task,
        status: 'Completed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Update in array
      tasks[taskIndex] = updatedTask;
      
      // Write back to file
      await writeData(TASKS_FILE, tasks);
      
      res.json(updatedTask);
    }
  } catch (error) {
    console.error(`Error in /api/tasks/${req.params.id}/complete:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Offer Routes
// ------------

// Submit an Offer for a Task
app.post('/api/tasks/:id/offers', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { amount, message } = req.body;
    const userId = req.user.id;
    
    console.log('Received offer:', { taskId, userId, amount, message });
    
    // Validation
    if (!amount || !message) {
      return res.status(400).json({ message: 'Amount and message are required' });
    }
    
    if (mongoConnected) {
      // MongoDB version
      // Find the task
      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Check if user is trying to offer on their own task
      if (task.userId.toString() === userId) {
        return res.status(400).json({ message: 'You cannot make an offer on your own task' });
      }
      
      // Check if user has already made an offer on this task
      const existingOffer = await Offer.findOne({ taskId, userId });
      if (existingOffer) {
        return res.status(400).json({ message: 'You have already made an offer for this task' });
      }
      
      // Create new offer
      const offer = new Offer({
        taskId,
        userId,
        amount,
        message,
        status: 'pending',
        createdAt: new Date()
      });
      
      // Save the offer
      await offer.save();
      
      // Return the offer
      res.status(201).json(offer);
    } else {
      // File-based version
      const tasks = await readData(TASKS_FILE);
      const task = tasks.find(t => t.id === parseInt(taskId));
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Check if user is trying to offer on their own task
      if (task.userId === userId) {
        return res.status(400).json({ message: 'You cannot make an offer on your own task' });
      }
      
      // Get offers
      const offers = await readData(OFFERS_FILE);
      
      // Check if user has already made an offer on this task
      const existingOffer = offers.find(o => o.taskId === parseInt(taskId) && o.userId === userId);
      if (existingOffer) {
        return res.status(400).json({ message: 'You have already made an offer for this task' });
      }
      
      // Create new offer
      const newOffer = {
        id: offers.length > 0 ? Math.max(...offers.map(o => o.id)) + 1 : 1,
        taskId: parseInt(taskId),
        userId,
        amount: parseInt(amount),
        message,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      // Add to offers
      offers.push(newOffer);
      
      // Save to file
      await writeData(OFFERS_FILE, offers);
      
      res.status(201).json(newOffer);
    }
  } catch (error) {
    console.error('Error in POST /api/tasks/:id/offers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Accept an offer
app.post('/api/tasks/:taskId/offers/:offerId/accept', authenticateToken, async (req, res) => {
  try {
    const { taskId, offerId } = req.params;
    const userId = req.user.id;
    
    if (mongoConnected && mongoose.connection.readyState === 1) {
      // MongoDB version
      // Check if task belongs to user
      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      if (task.userId.toString() !== userId) {
        return res.status(403).json({ message: 'You can only accept offers on your own tasks' });
      }
      
      // Find the offer
      const offer = await Offer.findById(offerId);
      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }
      
      if (offer.taskId.toString() !== taskId) {
        return res.status(400).json({ message: 'Offer does not match task' });
      }
      
      // Check if task is already in progress or completed
      if (task.status !== 'Open') {
        return res.status(400).json({ message: 'This task already has an accepted offer' });
      }
      
      // Update task status
      task.status = 'In Progress';
      task.acceptedById = offer.userId;
      task.acceptedOfferId = offerId;
      task.acceptedAt = new Date();
      await task.save();
      
      // Update offer status
      offer.status = 'accepted';
      await offer.save();
      
      // Decline all other offers for this task
      await Offer.updateMany(
        { taskId, _id: { $ne: offerId } },
        { $set: { status: 'declined' } }
      );
      
      res.json({ message: 'Offer accepted successfully' });
    } else {
      // File-based version
      const tasks = await readData(TASKS_FILE);
      const offers = await readData(OFFERS_FILE);
      
      // Find task and check ownership
      const taskIndex = tasks.findIndex(t => t.id == taskId);
      if (taskIndex === -1) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      const task = tasks[taskIndex];
      if (task.userId !== userId) {
        return res.status(403).json({ message: 'You can only accept offers on your own tasks' });
      }
      
      // Check if task is already in progress or completed
      if (task.status !== 'Open') {
        return res.status(400).json({ message: 'This task already has an accepted offer' });
      }
      
      // Find offer
      const offerIndex = offers.findIndex(o => o.id == offerId);
      if (offerIndex === -1) {
        return res.status(404).json({ message: 'Offer not found' });
      }
      
      const offer = offers[offerIndex];
      if (offer.taskId != taskId) {
        return res.status(400).json({ message: 'Offer does not match task' });
      }
      
      // Update task status
      tasks[taskIndex] = {
        ...task,
        status: 'In Progress',
        acceptedById: offer.userId,
        acceptedOfferId: offer.id,
        acceptedAt: new Date().toISOString()
      };
      
      // Update offer status
      offers[offerIndex] = {
        ...offer,
        status: 'accepted'
      };
      
      // Update all other offers for this task
      for (let i = 0; i < offers.length; i++) {
        if (offers[i].taskId == taskId && offers[i].id != offerId) {
          offers[i] = {
            ...offers[i],
            status: 'declined'
          };
        }
      }
      
      // Save changes
      await writeData(TASKS_FILE, tasks);
      await writeData(OFFERS_FILE, offers);
      
      res.json({ message: 'Offer accepted successfully' });
    }
  } catch (error) {
    console.error('Error accepting offer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Decline an offer
app.post('/api/tasks/:taskId/offers/:offerId/decline', authenticateToken, async (req, res) => {
  try {
    const { taskId, offerId } = req.params;
    const userId = req.user.id;
    
    if (mongoConnected && mongoose.connection.readyState === 1) {
      // MongoDB version
      // Check if task belongs to user
      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      if (task.userId.toString() !== userId) {
        return res.status(403).json({ message: 'You can only decline offers on your own tasks' });
      }
      
      // Find the offer
      const offer = await Offer.findById(offerId);
      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }
      
      if (offer.taskId.toString() !== taskId) {
        return res.status(400).json({ message: 'Offer does not match task' });
      }
      
      // Update offer status
      offer.status = 'declined';
      await offer.save();
      
      res.json({ message: 'Offer declined successfully' });
    } else {
      // File-based version
      const tasks = await readData(TASKS_FILE);
      const offers = await readData(OFFERS_FILE);
      
      // Find task and check ownership
      const task = tasks.find(t => t.id == taskId);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      if (task.userId !== userId) {
        return res.status(403).json({ message: 'You can only decline offers on your own tasks' });
      }
      
      // Find offer
      const offerIndex = offers.findIndex(o => o.id == offerId);
      if (offerIndex === -1) {
        return res.status(404).json({ message: 'Offer not found' });
      }
      
      const offer = offers[offerIndex];
      if (offer.taskId != taskId) {
        return res.status(400).json({ message: 'Offer does not match task' });
      }
      
      // Update offer status
      offers[offerIndex] = {
        ...offer,
        status: 'declined'
      };
      
      // Save changes
      await writeData(OFFERS_FILE, offers);
      
      res.json({ message: 'Offer declined successfully' });
    }
  } catch (error) {
    console.error('Error declining offer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a specific offer
app.get('/api/tasks/:taskId/offers/:offerId', authenticateToken, async (req, res) => {
  try {
    const { taskId, offerId } = req.params;
    
    if (mongoConnected && mongoose.connection.readyState === 1) {
      // MongoDB version
      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      const offer = await Offer.findById(offerId).lean();
      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }
      
      if (offer.taskId.toString() !== taskId) {
        return res.status(400).json({ message: 'Offer does not belong to this task' });
      }
      
      const user = await User.findById(offer.userId).lean();
      
      res.json({
        ...offer,
        taskTitle: task.title,
        userUsername: user ? user.fullname : 'Unknown User'
      });
    } else {
      // File-based version
      const tasks = await readData(TASKS_FILE);
      const task = tasks.find(t => t.id == taskId);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      const offers = await readData(OFFERS_FILE);
      const offer = offers.find(o => o.id == offerId);
      
      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }
      
      if (offer.taskId != taskId) {
        return res.status(400).json({ message: 'Offer does not belong to this task' });
      }
      
      // Get user info
      const users = await readData(USERS_FILE);
      const user = users.find(u => u.id === offer.userId);
      
      res.json({
        ...offer,
        taskTitle: task.title,
        userUsername: user ? user.fullname : 'Unknown User'
      });
    }
  } catch (error) {
    console.error('Error getting offer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get User's Tasks (Created by Them)
app.get('/api/my-tasks', authenticateToken, async (req, res) => {
  try {
    let tasks;
    
    if (mongoConnected) {
      // MongoDB version
      tasks = await Task.find({ userId: req.user.id }).lean();
    } else {
      // File-based version
      tasks = await readData(TASKS_FILE);
      tasks = tasks.filter(task => task.userId === req.user.id);
    }
    
    res.json(tasks);
  } catch (error) {
    console.error('Error in /api/my-tasks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Tasks Accepted by the User
app.get('/api/my-accepted-tasks', authenticateToken, async (req, res) => {
  try {
    let tasks;
    
    if (mongoConnected) {
      // MongoDB version
      tasks = await Task.find({ acceptedById: req.user.id, status: { $in: ['In Progress', 'Completed'] } }).lean();
    } else {
      // File-based version
      tasks = await readData(TASKS_FILE);
      tasks = tasks.filter(task => 
        task.acceptedById === req.user.id && 
        (task.status === 'In Progress' || task.status === 'Completed')
      );
    }
    
    res.json(tasks);
  } catch (error) {
    console.error('Error in /api/my-accepted-tasks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get offers received for the user's tasks
app.get('/api/my-offers', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching offers for user:', userId);
    
    let offers = [];
    
    if (mongoConnected && mongoose.connection.readyState === 1) {
      // MongoDB version
      // First get all tasks created by the user
      const userTasks = await Task.find({ userId: userId }).lean();
      console.log('Found user tasks:', userTasks.length);
      
      const taskIds = userTasks.map(task => task._id);
      
      // Find offers for those tasks
      const rawOffers = await Offer.find({ taskId: { $in: taskIds } }).lean();
      console.log('Found offers for user tasks:', rawOffers.length);
      
      // Get user info for each offer
      for (const offer of rawOffers) {
        try {
          const task = userTasks.find(t => t._id.toString() === offer.taskId.toString());
          const offerUser = await User.findById(offer.userId).lean();
          
          offers.push({
            id: offer._id,
            taskId: offer.taskId,
            userId: offer.userId,
            taskTitle: task ? task.title : 'Unknown Task',
            username: offerUser ? offerUser.fullname : 'Unknown User',
            amount: offer.amount,
            message: offer.message,
            status: offer.status,
            createdAt: offer.createdAt
          });
        } catch (e) {
          console.error('Error processing an offer:', e);
        }
      }
    } else {
      // File-based version
      const tasks = await readData(TASKS_FILE);
      const userTasks = tasks.filter(task => task.userId === userId);
      const taskIds = userTasks.map(task => task.id);
      
      // Get all offers
      const allOffers = await readData(OFFERS_FILE);
      
      // Filter offers for the user's tasks
      const filteredOffers = allOffers.filter(offer => {
        return taskIds.includes(parseInt(offer.taskId)) || taskIds.includes(offer.taskId);
      });
      
      // Get user data for each offer
      const users = await readData(USERS_FILE);
      
      offers = filteredOffers.map(offer => {
        const task = tasks.find(t => t.id == offer.taskId);
        const offerUser = users.find(u => u.id === offer.userId);
        
        return {
          id: offer.id,
          taskId: offer.taskId,
          userId: offer.userId,
          taskTitle: task ? task.title : 'Unknown Task',
          username: offerUser ? offerUser.fullname : 'Unknown User',
          amount: offer.amount,
          message: offer.message,
          status: offer.status || 'pending',
          createdAt: offer.createdAt
        };
      });
    }
    
    res.json(offers);
  } catch (error) {
    console.error('Error in /api/my-offers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send a notification
app.post('/api/notifications/send', authenticateToken, async (req, res) => {
  try {
    const { recipientId, type, message, taskId, offerId } = req.body;
    const senderId = req.user.id;
    
    if (!recipientId || !type || !message) {
      return res.status(400).json({ message: 'Missing required notification fields' });
    }
    
    if (mongoConnected && mongoose.connection.readyState === 1) {
      // MongoDB version
      const notificationSchema = new mongoose.Schema({
        recipientId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        senderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        type: {
          type: String,
          required: true
        },
        message: {
          type: String,
          required: true
        },
        taskId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Task'
        },
        offerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Offer'
        },
        read: {
          type: Boolean,
          default: false
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      });
      
      // Only create model if it doesn't exist
      let Notification;
      try {
        Notification = mongoose.model('Notification');
      } catch (e) {
        Notification = mongoose.model('Notification', notificationSchema);
      }
      
      const notification = new Notification({
        recipientId,
        senderId,
        type,
        message,
        taskId,
        offerId,
        read: false,
        createdAt: new Date()
      });
      
      await notification.save();
    } else {
      // File-based version
      const notifications = await readData(NOTIFICATIONS_FILE).catch(() => []);
      
      const newNotification = {
        id: notifications.length > 0 ? Math.max(...notifications.map(n => n.id)) + 1 : 1,
        recipientId,
        senderId,
        type,
        message,
        taskId,
        offerId,
        read: false,
        createdAt: new Date().toISOString()
      };
      
      notifications.push(newNotification);
      await writeData(NOTIFICATIONS_FILE, notifications);
    }
    
    res.status(201).json({ message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (mongoConnected && mongoose.connection.readyState === 1) {
      // MongoDB version
      // Get the Notification model if it exists
      let Notification;
      try {
        Notification = mongoose.model('Notification');
      } catch (e) {
        // Model doesn't exist, create schema
        const notificationSchema = new mongoose.Schema({
          recipientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
          },
          senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          },
          type: String,
          message: String,
          taskId: mongoose.Schema.Types.ObjectId,
          offerId: mongoose.Schema.Types.ObjectId,
          read: { type: Boolean, default: false },
          createdAt: { type: Date, default: Date.now }
        });
        Notification = mongoose.model('Notification', notificationSchema);
      }
      
      const notifications = await Notification.find({ recipientId: userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
      
      res.json(notifications);
    } else {
      // File-based version
      const notifications = await readData(NOTIFICATIONS_FILE).catch(() => []);
      
      const userNotifications = notifications
        .filter(n => n.recipientId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 20);
      
      res.json(userNotifications);
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark notification as read
app.post('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;
    
    if (mongoConnected && mongoose.connection.readyState === 1) {
      // MongoDB version
      const Notification = mongoose.model('Notification');
      const notification = await Notification.findById(notificationId);
      
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      
      if (notification.recipientId.toString() !== userId) {
        return res.status(403).json({ message: 'Not authorized to update this notification' });
      }
      
      notification.read = true;
      await notification.save();
    } else {
      // File-based version
      const notifications = await readData(NOTIFICATIONS_FILE);
      const notificationIndex = notifications.findIndex(n => n.id == notificationId);
      
      if (notificationIndex === -1) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      
      if (notifications[notificationIndex].recipientId !== userId) {
        return res.status(403).json({ message: 'Not authorized to update this notification' });
      }
      
      notifications[notificationIndex].read = true;
      await writeData(NOTIFICATIONS_FILE, notifications);
    }
    
    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Chat Routes
// -----------

// Create or get a chat between two users for a specific task
app.post('/api/chats/create', authenticateToken, async (req, res) => {
  try {
    const { taskId, recipientId } = req.body;
    const userId = req.user.id;
    
    if (!taskId || !recipientId) {
      return res.status(400).json({ message: 'taskId and recipientId are required' });
    }
    
    if (mongoConnected) {
      // Check if chat already exists
      let chat = await Chat.findOne({
        taskId,
        participants: { $all: [userId, recipientId] }
      });
      
      if (chat) {
        console.log('Found existing chat:', chat);
        return res.status(200).json(chat);
      }
      
      // If not, create new chat
      const newChat = new Chat({
        taskId,
        participants: [userId, recipientId],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newChat.save();
      console.log('Created new chat:', newChat);
      res.status(201).json(newChat);
    } else {
      // File-based version
      const chats = await readData(CHATS_FILE);
      
      // Check if chat already exists
      const existingChat = chats.find(c => 
        c.taskId == taskId && 
        c.participants && 
        c.participants.includes(userId) && 
        c.participants.includes(recipientId)
      );
      
      if (existingChat) {
        return res.status(200).json(existingChat);
      }
      
      // Create new chat
      const newChat = {
        id: chats.length > 0 ? Math.max(...chats.map(c => c.id)) + 1 : 1,
        taskId,
        participants: [userId, recipientId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      chats.push(newChat);
      await writeData(CHATS_FILE, chats);
      
      res.status(201).json(newChat);
    }
  } catch (err) {
    console.error('Error creating chat:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all chats for the authenticated user
app.get('/api/chats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (mongoConnected) {
      // MongoDB version
      const chats = await Chat.find({ participants: userId }).lean();
      
      res.json(chats);
    } else {
      // File-based version
      const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
      await createEmptyFileIfNotExists(CHATS_FILE);
      
      const chats = await readData(CHATS_FILE);
      const userChats = chats.filter(chat => chat.participants.includes(userId));
      
      res.json(userChats);
    }
  } catch (error) {
    console.error('Error getting chats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get messages for a specific chat
app.get('/api/chats/:chatId/messages', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    
    if (mongoConnected) {
      // MongoDB version
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }
      
      if (!chat.participants.includes(userId)) {
        return res.status(403).json({ message: 'Not authorized to view messages for this chat' });
      }
      
      // Get messages with populated sender information
      const messages = await Message.find({ chatId })
        .sort({ createdAt: 'asc' })
        .lean();
      
      // If any message doesn't have senderName, add it from User collection
      for (let i = 0; i < messages.length; i++) {
        if (!messages[i].senderName && messages[i].senderId) {
          try {
            const sender = await User.findById(messages[i].senderId).lean();
            if (sender) {
              messages[i].senderName = sender.fullname || sender.username || 'User';
            }
          } catch (e) {
            console.warn(`Could not get sender name for message ${messages[i]._id}`);
          }
        }
      }
      
      // Mark messages as read
      await Message.updateMany(
        { chatId, senderId: { $ne: userId }, read: false },
        { $set: { read: true } }
      );
      
      res.json(messages);
    } else {
      // File-based version
      const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
      const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
      
      await createEmptyFileIfNotExists(CHATS_FILE);
      await createEmptyFileIfNotExists(MESSAGES_FILE);
      
      const chats = await readData(CHATS_FILE);
      const chat = chats.find(c => c.id === chatId);
      
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }
      
      if (!chat.participants.includes(userId)) {
        return res.status(403).json({ message: 'Not authorized to view messages for this chat' });
      }
      
      const messages = await readData(MESSAGES_FILE);
      const chatMessages = messages.filter(m => m.chatId === chatId);
      
      res.json(chatMessages);
    }
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send a message in a chat
app.post('/api/chats/:chatId/messages', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, taskId, taskTitle, recipientId, recipientName } = req.body;
    const senderId = req.user.id;
    
    // Validate required fields
    if (!content || !chatId) {
      return res.status(400).json({ message: 'Content and chatId are required' });
    }
    
    // Ensure chat exists and user is a participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    if (!chat.participants.includes(senderId)) {
      return res.status(403).json({ message: 'Not authorized to send messages in this chat' });
    }
    
    // Get sender name from database
    let senderName = 'Unknown User';
    if (mongoConnected) {
      try {
        const sender = await User.findById(senderId);
        if (sender) {
          senderName = sender.fullname || sender.username || sender.email || 'User';
        }
      } catch (error) {
        console.error('Error finding sender:', error);
      }
    } else {
      // If using file-based storage, get from users file
      const users = await readData(USERS_FILE);
      const sender = users.find(u => u.id === senderId);
      if (sender) {
        senderName = sender.fullname || sender.username || sender.email || 'User';
      }
    }
    
    // Create and save message with all required fields
    if (mongoConnected) {
      // Create new message
      const message = new Message({
        chatId,
        senderId,
        senderName,
        content,
        taskId,
        taskTitle,
        recipientId,
        recipientName,
        read: false,
        createdAt: new Date()
      });
      
      const savedMessage = await message.save();
      
      // Update chat with last message info
      await Chat.findByIdAndUpdate(
        chatId, 
        { 
          lastMessage: {
            content,
            senderId,
            timestamp: new Date()
          },
          updatedAt: new Date()
        }
      );
      
      // Return the saved message with all fields
      res.status(201).json(savedMessage);
    } else {
      // File-based storage
      const messages = await readData(MESSAGES_FILE);
      const newMessage = {
        id: messages.length > 0 ? Math.max(...messages.map(m => m.id)) + 1 : 1,
        chatId,
        senderId,
        senderName,
        content,
        taskId,
        taskTitle,
        recipientId,
        recipientName,
        read: false,
        createdAt: new Date().toISOString()
      };
      
      messages.push(newMessage);
      await writeData(MESSAGES_FILE, messages);
      
      // Update chat in file
      const chats = await readData(CHATS_FILE);
      const chatIndex = chats.findIndex(c => c.id.toString() === chatId.toString());
      if (chatIndex !== -1) {
        chats[chatIndex].lastMessage = {
          content,
          senderId,
          timestamp: new Date().toISOString()
        };
        chats[chatIndex].updatedAt = new Date().toISOString();
        await writeData(CHATS_FILE, chats);
      }
      
      res.status(201).json(newMessage);
    }
  } catch (err) {
    console.error('Error creating message:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add these endpoints after the existing Chat routes

// Get a specific chat by ID
app.get('/api/chats/:chatId', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    
    if (mongoConnected) {
      // MongoDB version
      const chat = await Chat.findById(chatId).lean();
      
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }
      
      if (!chat.participants.includes(userId)) {
        return res.status(403).json({ message: 'Not authorized to access this chat' });
      }
      
      // Get other user details
      const otherUserId = chat.participants.find(id => id.toString() !== userId);
      let otherUser = { id: otherUserId, name: 'User' };
      
      if (otherUserId) {
        const user = await User.findById(otherUserId).lean();
        if (user) {
          otherUser = {
            id: otherUserId,
            name: user.fullname || user.username || 'User'
          };
        }
      }
      
      // Get task details if exists
      let taskTitle = 'Task';
      if (chat.taskId) {
        const task = await Task.findById(chat.taskId).lean();
        if (task) {
          taskTitle = task.title;
        }
      }
      
      // Return formatted chat object
      res.json({
        id: chat._id,
        participants: chat.participants,
        taskId: chat.taskId,
        taskTitle,
        otherUser,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      });
    } else {
      // File-based version
      const chats = await readData(path.join(DATA_DIR, 'chats.json'));
      const chat = chats.find(c => c.id === chatId);
      
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }
      
      if (!chat.participants.includes(userId)) {
        return res.status(403).json({ message: 'Not authorized to access this chat' });
      }
      
      // Get other user details
      const otherUserId = chat.participants.find(id => id !== userId);
      let otherUser = { id: otherUserId, name: 'User' };
      
      if (otherUserId) {
        const users = await readData(USERS_FILE);
        const user = users.find(u => u.id === otherUserId);
        if (user) {
          otherUser = {
            id: otherUserId,
            name: user.fullname || user.username || 'User'
          };
        }
      }
      
      // Get task details if exists
      let taskTitle = 'Task';
      if (chat.taskId) {
        const tasks = await readData(TASKS_FILE);
        const task = tasks.find(t => t.id == chat.taskId);
        if (task) {
          taskTitle = task.title;
        }
      }
      
      // Return formatted chat object
      res.json({
        id: chat.id,
        participants: chat.participants,
        taskId: chat.taskId,
        taskTitle,
        otherUser,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt || chat.createdAt
      });
    }
  } catch (error) {
    console.error('Error getting chat:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark a chat as read
app.post('/api/chats/:chatId/read', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    
    if (mongoConnected) {
      // MongoDB version
      // Find all unread messages in this chat sent by others
      await Message.updateMany(
        { 
          chatId, 
          senderId: { $ne: userId }, 
          read: false 
        },
        { 
          read: true 
        }
      );
      
      res.json({ message: 'Messages marked as read' });
    } else {
      // File-based version
      const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
      await createEmptyFileIfNotExists(MESSAGES_FILE);
      
      const messages = await readData(MESSAGES_FILE);
      let updated = false;
      
      // Mark all unread messages as read
      for (let i = 0; i < messages.length; i++) {
        if (messages[i].chatId === chatId && messages[i].senderId !== userId && !messages[i].read) {
          messages[i].read = true;
          updated = true;
        }
      }
      
      if (updated) {
        await writeData(MESSAGES_FILE, messages);
      }
      
      res.json({ message: 'Messages marked as read' });
    }
  } catch (error) {
    console.error('Error marking chat as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get unread message count
app.get('/api/chats/unread', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (mongoConnected) {
      // MongoDB version
      // Count unread messages across all chats
      const unreadCount = await Message.countDocuments({
        recipientId: userId,
        read: false
      });
      
      res.json({ unreadCount });
    } else {
      // File-based version
      const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
      await createEmptyFileIfNotExists(MESSAGES_FILE);
      
      const messages = await readData(MESSAGES_FILE);
      
      // Count unread messages where recipientId is current user
      const unreadCount = messages.filter(m => m.recipientId === userId && !m.read).length;
      
      res.json({ unreadCount });
    }
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Static File Handlers
// ====================

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Catchall Route for Static Files
app.get('/:page*?', async (req, res, next) => {
  const fullPath = req.path;
  
  // Skip API routes - let them be handled by their specific handlers
  if (fullPath.startsWith('/api/')) {
    return next();
  }
  
  // Check if the requested file exists
  const filePath = path.join(__dirname, req.params.page || 'index.html');
  
  try {
    await fs.access(filePath);
    res.sendFile(filePath);
  } catch (error) {
    // File doesn't exist, serve index.html
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

// Start the Server
async function startServer() {
  try {
    // Ensure data directory exists
    await ensureDataDirExists();
    
    // Ensure all data files exist on startup
    await initializeDataFiles();
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Chat routes
app.post('/api/chats', authenticateJWT, async (req, res) => {
  try {
    const { recipientId, taskId } = req.body;
    const senderId = req.user.id;
    
    if (!recipientId) {
      return res.status(400).json({ message: 'Recipient ID is required' });
    }
    
    // Check if a chat already exists between these users for this task
    let chat;
    if (taskId) {
      chat = await Chat.findOne({
        taskId,
        $or: [
          { participants: { $all: [senderId, recipientId] } },
          { sender: senderId, recipient: recipientId },
          { sender: recipientId, recipient: senderId }
        ]
      });
    } else {
      chat = await Chat.findOne({
        $or: [
          { participants: { $all: [senderId, recipientId] } },
          { sender: senderId, recipient: recipientId },
          { sender: recipientId, recipient: senderId }
        ]
      });
    }
    
    // If chat doesn't exist, create new one
    if (!chat) {
      chat = new Chat({
        participants: [senderId, recipientId],
        sender: senderId,
        recipient: recipientId,
        taskId
      });
      await chat.save();
    }
    
    res.status(201).json({ id: chat._id, chatId: chat._id });
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ message: 'Server error creating chat' });
  }
});

// Message routes
app.post('/api/messages', authenticateJWT, async (req, res) => {
  try {
    const { chatId, content } = req.body;
    const sender = req.user.id;
    
    if (!chatId || !content) {
      return res.status(400).json({ message: 'Chat ID and content are required' });
    }
    
    // Find the chat to ensure it exists and user is a participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if user is a participant in this chat
    if (!chat.participants.includes(sender)) {
      return res.status(403).json({ message: 'Not authorized to send messages in this chat' });
    }
    
    // Create new message
    const message = new Message({
      chatId,
      sender,
      content
    });
    
    await message.save();
    
    // Update chat with latest message
    chat.lastMessage = content;
    chat.lastMessageTime = Date.now();
    chat.unreadCount = chat.unreadCount || {};
    
    // Mark as unread for recipient
    chat.participants.forEach(participantId => {
      if (participantId.toString() !== sender.toString()) {
        chat.unreadCount[participantId] = (chat.unreadCount[participantId] || 0) + 1;
      }
    });
    
    await chat.save();
    
    // Return the new message
    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error sending message' });
  }
});

// Get messages for a chat
app.get('/api/chats/:chatId/messages', authenticateJWT, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    
    // Verify chat exists and user is a participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if user is a participant
    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ message: 'Not authorized to view this chat' });
    }
    
    // Get messages for this chat
    const messages = await Message.find({ chatId })
      .sort({ createdAt: 'asc' })
      .limit(100);
    
    // Mark messages as read for this user
    chat.unreadCount = chat.unreadCount || {};
    chat.unreadCount[userId] = 0;
    await chat.save();
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error fetching messages' });
  }
});
