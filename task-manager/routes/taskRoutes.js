const express = require("express");
const router = express.Router();
const Task = require("../../models/Task");

// Create a new task
router.post("/",verifyToken, async (req, res) => {
  try {
    const { title, description, dueDate, status } = req.body;
    const newTask = new Task({ title, description, dueDate, status });
    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (error) {
    res.status(500).json({ message: "Failed to create task", error: error.message });
  }
});

// Get all tasks
router.get("/",verifyToken, async (req, res) => {
  try {
    const tasks = await Task.find();
    if (!tasks.length) return res.status(404).json({ message: "No tasks found!" });
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Get task by id
router.get("/:id",verifyToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id); // get task by ID
    if (!task) return res.status(404).json({ message: "Task not found!" }); // check if it exists
    res.status(200).json(task); // send the task
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a task by ID
router.put("/:id",verifyToken, async (req, res) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedTask) return res.status(404).json({ message: "Task not found" });
    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a task by ID
router.delete("/:id",verifyToken, async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);
    if (!deletedTask) return res.status(404).json({ message: "Task not found" });
    res.status(200).json({ message: "Task deleted successfully", deletedTask });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pagination
router.get("/paginate",verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const tasks = await Task.find().skip(skip).limit(limit);
    const totalTasks = await Task.countDocuments();
    const totalPages = Math.ceil(totalTasks / limit);

    res.status(200).json({ page, limit, totalTasks, totalPages, tasks });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
