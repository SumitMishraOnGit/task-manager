const express = require("express");
const taskRoutes = require('./task-manager/routes/taskRoutes');
const app = express();


// Middleware
app.use(express.json());

// Routes
app.use("/tasks", taskRoutes);

module.exports = app;
