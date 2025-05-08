const express = require("express");
const path = require("path");
const taskRoutes = require("./task-manager/routes/taskRoutes");
const userRoutes = require("./task-manager/routes/userRoutes");
const errorHandler = require("./middlewares/errorHandling"); // Import error handler middleware

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use("/tasks", taskRoutes);
app.use("/users", userRoutes);

// Static file serving for uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Error Handling Middleware
app.use(errorHandler); // Use the global error handler

module.exports = app;