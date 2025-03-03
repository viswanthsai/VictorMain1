const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const RENDER_URL = 'https://victormain1.onrender.com';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-development-only';
const PORT = process.env.PORT || 9000;

app.use(cors({
  origin: [
    'https://viswanthsai.github.io', 
    'http://127.0.0.1:5502', 
    'http://localhost:5502',
    'https://victormain1.onrender.com',  
    'https://victormain1-1.onrender.com'  // Add this line for your static site
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
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
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(dataDir, { recursive: true });
      
      // Create empty data files if they don't exist
      await fs.writeFile(USERS_FILE, '[]');
      await fs.writeFile(TASKS_FILE, '[]');
    } else {
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

// Server status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Add a route handler for the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle all other routes to serve the correct HTML file
app.get('/:page', (req, res) => {
  const page = req.params.page;
  // Check if the requested file exists
  const filePath = path.join(__dirname, page);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

// User registration
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
    
    // Read existing users
    const users = await readData(USERS_FILE);
    
    // Check if email already exists
    const existingUser = users.find(user => user.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      fullname,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      role: 'user'
    };
    
    // Add to users array
    users.push(newUser);
    
    // Write back to file
    await writeData(USERS_FILE, users);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Return user info and token (excluding password)
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({
      token,
      userId: newUser.id,
      username: newUser.fullname,
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('Error in /api/signup:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Read users
    const users = await readData(USERS_FILE);
    
    // Find user by email
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Compare passwords
    let passwordMatch;
    
    // Handle both bcrypt and plain SHA-256 hashes (for demo data)
    if (user.password.startsWith('$2b$')) {
      // Bcrypt hash
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      // For demo purposes - plain SHA-256 comparison
      // In production, always use bcrypt
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update(password).digest('hex');
      passwordMatch = (hash === user.password);
    }
    
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Return user info and token
    res.json({
      token,
      userId: user.id,
      username: user.fullname,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Error in /api/login:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current user info
app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const users = await readData(USERS_FILE);
    const user = users.find(u => u.id === req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user data without password
    const { password, ...userData } = user;
    res.json(userData);
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ message: 'Server error' });
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

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await readData(TASKS_FILE);
    res.json(tasks);
  } catch (error) {
    console.error('Error in /api/tasks:', error);
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
    
    // Get all tasks
    const tasks = await readData(TASKS_FILE);
    
    // Get user info
    const users = await readData(USERS_FILE);
    const user = users.find(u => u.id === req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Create new task
    const newTask = {
      id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
      title,
      description,
      category: category || 'Other',
      location: location || 'Remote',
      budget: budget || null,
      deadline: deadline || null,
      status: 'Open',
      createdAt: new Date().toISOString(),
      userId: req.user.id,
      createdBy: user.fullname
    };
    
    // Add to tasks array
    tasks.push(newTask);
    
    // Write back to file
    await writeData(TASKS_FILE, tasks);
    
    // Return the new task
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error in POST /api/tasks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get task by ID
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const tasks = await readData(TASKS_FILE);
    const task = tasks.find(t => t.id === parseInt(req.params.id));
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    console.error(`Error in /api/tasks/${req.params.id}:`, error);
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
    
    // Check if user is accepting their own task
    if (task.userId === parseInt(userId)) {
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
