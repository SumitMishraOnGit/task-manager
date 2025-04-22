const express = require('express');
const app = express();
const mongoose = require('mongoose');
const taskRoutes = require('./task-manager/routes/taskRoutes');
const userRoutes = require('./task-manager/routes/userRoutes');


app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err); 

  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed',
      error: err.message
    });
  }

  
  if (err.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid ID format',
      error: err.message
    });
  }

  
  return res.status(500).json({
    message: 'Something went wrong!',
    error: err.message || 'Internal Server Error', 
    stack: process.env.NODE_ENV === 'development' ? err.stack : null 
  });
});


mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(process.env.PORT || 5000, () => {
      console.log('Server is running');
    });
  })
  .catch((err) => console.error('Error connecting to MongoDB:', err));

module.exports = errorHandler;