const express = require('express');
const cors = require('cors');
const path = require('path');
const { errorHandler } = require('./middleware/errorMiddleware');

// Import routers
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const clientRoutes = require('./routes/clientRoutes');
const briefRoutes = require('./routes/briefRoutes');
const commentRoutes = require('./routes/commentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// Enable CORS
app.use(cors({
  origin: 'http://localhost:5173', // Vite default port
  credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve file uploads static directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);

// Mount comments routes on briefs to match /api/briefs/:id/comments
app.use('/api/briefs', briefRoutes);
app.use('/api/briefs', commentRoutes);

app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Base route status check
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date() });
});

// Serve frontend static build files
const frontendBuildPath = path.join(__dirname, '../../dist');
app.use(express.static(frontendBuildPath));

// Catch-all route to serve the React application
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(frontendBuildPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('DigiQuest API Server is running. (Frontend build files not found. Run "npm run build" in frontend directory to bundle frontend).');
    }
  });
});

// Centralized error handling
app.use(errorHandler);

module.exports = app;
