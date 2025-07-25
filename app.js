const express = require("express");
const path = require("path");
const cors = require('cors');
const taskRoutes = require("./task-manager/routes/taskRoutes");
const userRoutes = require("./task-manager/routes/userRoutes");
const errorHandler = require("./middlewares/errorHandling"); // Import error handler middleware

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/tasks", taskRoutes);
app.use("/users", userRoutes);

// Static file serving for uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../Frontend/dist');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Error Handling Middleware
app.use(errorHandler); // Use the global error handler

module.exports = app;