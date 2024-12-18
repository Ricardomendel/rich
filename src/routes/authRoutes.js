// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Input validation middleware
const validateLoginInput = (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid input types' });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    next();
  } catch (error) {
    console.error('Validation error:', error);
    res.status(400).json({ error: 'Invalid request data' });
  }
};

// Login route
router.post('/login', validateLoginInput, async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);

    // Find user with password included
    const user = await User.findOne({ email }).select('+password');
    console.log('User found:', !!user);

    if (!user) {
      console.log('No user found with email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('Password validation result:', isValidPassword);

    if (!isValidPassword) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email 
      },
      process.env.JWT_SECRET || 'your-default-secret',
      { 
        expiresIn: '24h'
      }
    );

    // Prepare user data for response
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      department: user.department,
      role: user.role
    };

    // Send response
    res.json({
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
});

// Register route
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, department } = req.body;
    console.log('Registration attempt for:', email);

    // Validate required fields
    if (!username || !email || !password || !department) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { username }
      ]
    });

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
      return res.status(409).json({ error: `${field} already exists` });
    }

    // Create new user
    const user = new User({
      username,
      email: email.toLowerCase(),
      password,
      department
    });

    // Save user - password hashing is handled by the User model middleware
    await user.save();

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email 
      },
      process.env.JWT_SECRET || 'your-default-secret',
      { 
        expiresIn: '24h'
      }
    );

    // Prepare user data for response
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      department: user.department,
      role: user.role
    };

    // Send response
    res.status(201).json({
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'User already exists' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Get current user route
router.get('/me', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Error fetching user data' });
  }
});

module.exports = router;