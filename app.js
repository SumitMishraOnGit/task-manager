const express = require("express");
const taskRoutes = require('./task-manager/routes/taskRoutes');
const userRoutes = require('./task-manager/routes/userRoutes');
const app = express();


// Middleware
app.use(express.json());

// Routes
app.use("/tasks", taskRoutes);

app.use("/users", userRoutes);

// Uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

module.exports = app;