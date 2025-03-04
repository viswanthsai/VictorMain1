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

const app = express();
const RENDER_URL = 'https://victormain1.onrender.com';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-development-only';
const PORT = process.env.PORT || 9000;

// MongoDB connection string with updated options
const MONGODB_URI = "mongodb+srv://viswanthsai:QWEASDZXC1q@cluster0.6ndpu.mongodb.net/victorDB?retryWrites=true&w=majority&appName=Cluster0";

// Track MongoDB connection status
let mongoConnected = false;

// Connect to MongoDB with better options
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
  console.log('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

app.use(cors({
  origin: [
    'https://viswanthsai.github.io', 
    'http://127.0.0.1:5502', 
    'http://localhost:5502',
    'http://localhost:9000',  // Add this for local testing
    'https://victormain1.onrender.com',  
    'https://victormain1-1.onrender.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Enable pre-flight across all routes
app.options('*', cors());

app.use(bodyParser.json());
app.use(express.static('public'));

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// Data file paths
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const TASKS_FILE = path.join(__dirname, 'data', 'tasks.json');

// Ensure data directory exists
async function ensureDataDirExists() {
  const dataDir = path.join(__dirname, 'data');
  try {
    await fs.access(dataDir);
    console.log('Data directory exists:', dataDir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('Creating data directory:', dataDir);
      await fs.mkdir(dataDir, { recursive: true });
      
      // Create empty data files if they don't exist
      const usersPath = path.join(dataDir, 'users.json');
      const tasksPath = path.join(dataDir, 'tasks.json');
      
      try {
        await fs.access(usersPath);
      } catch (e) {
        await fs.writeFile(usersPath, '[]');
        console.log('Created empty users.json file');
      }
      
      try {
        await fs.access(tasksPath);
      } catch (e) {
        await fs.writeFile(tasksPath, '[]');
        console.log('Created empty tasks.json file');
      }
    } else {
      console.error('Error accessing data directory:', error);
      throw error;
    }
  }
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

// First define ALL API routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

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
    
    // Check if email exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    
    // Create new user
    const user = new User({
      fullname,
      email,
      password // Will be hashed by the pre-save hook
    });
    
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Before sending response
    console.log('Sending response to client:', {
      token,
      userId: user._id,
      username: user.fullname  // Check if this exists
    });
    
    res.status(201).json({
      token,
      userId: user._id,
      username: user.fullname,  // This is correct
      email: user.email  // Add this line
    });
  } catch (error) {
    console.error('Error in /api/signup:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Return user info and token
    res.json({
      token,
      userId: user._id,
      username: user.fullname,
      email: user.email,  // Add this line
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Error in /api/login:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    if (mongoConnected && mongoose.connection.readyState === 1) {
      // Using MongoDB
      const user = await User.findById(req.user.id).lean();
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Return user data without password
      const { password, ...userData } = user;
      return res.json({
        ...userData,
        username: user.fullname // Add this explicitly
      });
    } else {
      // File-based storage fallback
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
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    let tasks;
    
    if (mongoConnected && mongoose.connection.readyState === 1) {
      // Use MongoDB
      console.log('Getting tasks from MongoDB');
      tasks = await Task.find().lean();
    } else {
      // Use file-based storage
      console.log('Getting tasks from file storage');
      tasks = await readData(TASKS_FILE);
    }
    
    res.json(tasks);
  } catch (error) {
    console.error('Error in GET /api/tasks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user profile
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const users = await readData(USERS_FILE);
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is updating their own profile or is an admin
    if (users[userIndex].id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this profile' });
    }
    
    // Update user fields
    const updatedUser = {
      ...users[userIndex],
      ...req.body,
      id: userId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };
    
    // Replace in array
    users[userIndex] = updatedUser;
    
    // Write back to file
    await writeData(USERS_FILE, users);
    
    // Return updated user info without password
    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error(`Error in PUT /api/users/${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new task
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, location, budget, deadline } = req.body;
    
    // Validation
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }
    
    // Get user info
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Create new task
    const task = new Task({
      title,
      description,
      category: category || 'Other',
      location: location || 'Remote',
      budget: budget || null,
      deadline: deadline || null,
      userId: user._id,
      createdBy: user.fullname
    });
    
    await task.save();
    
    // Return the new task
    res.status(201).json(task);
  } catch (error) {
    console.error('Error in POST /api/tasks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get task by ID
app.get('/api/tasks/:id', async (req, res) => {
  try {
    let task;
    const taskId = req.params.id;
    
    if (mongoConnected && mongoose.connection.readyState === 1) {
      // Using MongoDB - handle ObjectId
      console.log('Getting task from MongoDB, id:', taskId);
      task = await Task.findById(taskId).lean();
    } else {
      // Using file-based storage
      console.log('Getting task from file storage, id:', taskId);
      const tasks = await readData(TASKS_FILE);
      task = tasks.find(t => t.id === parseInt(taskId));
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

// Update task
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const tasks = await readData(TASKS_FILE);
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check if user owns the task
    if (tasks[taskIndex].userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }
    
    // Update task fields
    const updatedTask = {
      ...tasks[taskIndex],
      ...req.body,
      id: taskId, // Ensure ID doesn't change
      userId: tasks[taskIndex].userId, // Ensure owner doesn't change
      updatedAt: new Date().toISOString()
    };
    
    // Replace in array
    tasks[taskIndex] = updatedTask;
    
    // Write back to file
    await writeData(TASKS_FILE, tasks);
    
    // Return updated task
    res.json(updatedTask);
  } catch (error) {
    console.error(`Error in PUT /api/tasks/${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete task
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const tasks = await readData(TASKS_FILE);
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check if user owns the task
    if (tasks[taskIndex].userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }
    
    // Remove task
    tasks.splice(taskIndex, 1);
    
    // Write back to file
    await writeData(TASKS_FILE, tasks);
    
    // Return success
    res.status(204).send();
  } catch (error) {
    console.error(`Error in DELETE /api/tasks/${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Accept task
app.post('/api/tasks/:id/accept', authenticateToken, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const tasks = await readData(TASKS_FILE);
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
    
    // Return updated task
    res.json(updatedTask);
  } catch (error) {
    console.error(`Error in /api/tasks/${req.params.id}/accept:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Complete task
app.post('/api/tasks/:id/complete', authenticateToken, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const tasks = await readData(TASKS_FILE);
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
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
    
    // Return updated task
    res.json(updatedTask);
  } catch (error) {
    console.error(`Error in /api/tasks/${req.params.id}/complete:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's tasks (created by them)
app.get('/api/my-tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await readData(TASKS_FILE);
    const userTasks = tasks.filter(task => task.userId === req.user.id);
    res.json(userTasks);
  } catch (error) {
    console.error('Error in /api/my-tasks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get tasks accepted by the user
app.get('/api/my-accepted-tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await readData(TASKS_FILE);
    const acceptedTasks = tasks.filter(task => 
      task.acceptedById === req.user.id && 
      (task.status === 'In Progress' || task.status === 'Completed')
    );
    res.json(acceptedTasks);
  } catch (error) {
    console.error('Error in /api/my-accepted-tasks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Then AFTER all API routes, define static file handlers
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// The catchall route MUST BE LAST
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

// Start the server
async function startServer() {
  try {
    // Ensure data directory exists
    await ensureDataDirExists();
    
    // Start listening
    const PORT = process.env.PORT || 9000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
