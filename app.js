const express = require("express");
const taskRoutes = require('./task-manager/routes/taskRoutes');
const userRoutes = require('./task-manager/routes/userRoutes');
const app = express();


// Middleware
app.use(express.json());

// Routes
app.use("/tasks", taskRoutes);

app.use("/users", userRoutes);
module.exports = app;
