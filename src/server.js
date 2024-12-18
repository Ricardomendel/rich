// src/server.js
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');

const app = express();
const port = process.env.PORT || 4000;

// CORS Configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600
};

// Database Configuration
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  autoIndex: true
};

// Middleware Setup
const setupMiddleware = (app) => {
  app.use(cors(corsOptions));
  app.use(helmet());
  app.use(morgan('dev'));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  
  // Request logging in development
  if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
      console.log(`${req.method} ${req.originalUrl}`);
      next();
    });
  }
};

// Route Setup
const setupRoutes = (app) => {
  // Static files
  app.use('/uploads', (req, res, next) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  }, express.static(path.join(__dirname, './uploads')));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/documents', documentRoutes);

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV
    });
  });

  // Root route
  app.get('/', (req, res) => {
    res.json({
      message: 'Paperless System API is running',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // 404 handler - must be last
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.originalUrl} not found`,
      path: req.originalUrl
    });
  });
};

// Error Handler Setup
const setupErrorHandler = (app) => {
  app.use((err, req, res, next) => {
    const errorResponse = {
      error: err.name || 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      timestamp: new Date(),
      path: req.path,
      method: req.method,
      requestId: req.id
    };

    console.error('Error:', errorResponse);

    // Handle specific error types
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: err.message,
        fields: err.errors
      });
    }

    if (err.name === 'UnauthorizedError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or missing authentication token'
      });
    }

    res.status(err.status || 500).json(errorResponse);
  });
};

// Database Connection
const connectDB = async (retryCount = 5) => {
  try {
    await mongoose.connect(process.env.DATABASE_URL, mongooseOptions);
    console.log('✓ Connected to MongoDB successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    if (retryCount > 0) {
      console.log(`Retrying connection... (${retryCount} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return connectDB(retryCount - 1);
    }
    return false;
  }
};

// Server Startup
const startServer = async () => {
  try {
    // Setup middleware
    setupMiddleware(app);
    
    // Setup routes
    setupRoutes(app);
    
    // Setup error handler
    setupErrorHandler(app);
    
    // Connect to database
    const isConnected = await connectDB();
    if (!isConnected) {
      throw new Error('Failed to connect to database after multiple retries');
    }
    
    // Start server
    app.listen(port, () => {
      console.log(`✓ Server is running on port ${port}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ API Documentation: http://localhost:${port}/api-docs`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

// Initialize server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
}); 