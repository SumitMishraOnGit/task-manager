const express = require("express");
const router = express.Router();
const Task = require("../../models/Task");
const verifyToken = require("../../middlewares/authMiddleware");


// Create a new task
router.post("/", verifyToken, async (req, res, next) => {
  try {
    const { title, description, dueDate, status } = req.body;
    const newTask = new Task({ title, description, dueDate, status });
    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (error) {
    next(error);
  }
});

// Get all tasks
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const tasks = await Task.find();
    if (!tasks.length) return res.status(404).json({ message: "No tasks found!" });
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
});

// Get task by id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found!" });
    res.status(200).json(task);
  } catch (error) {
    next(error);
  }
});

// Update a task by ID
router.put("/:id", verifyToken, async (req, res, next) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedTask) return res.status(404).json({ message: "Task not found" });
    res.status(200).json(updatedTask);
  } catch (error) {
    next(error);
  }
});

// Delete a task by ID
router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);
    if (!deletedTask) return res.status(404).json({ message: "Task not found" });
    res.status(200).json({ message: "Task deleted successfully", deletedTask });
  } catch (error) {
    next(error);
  }
});

// Pagination
router.get("/paginate", verifyToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const tasks = await Task.find().skip(skip).limit(limit);
    const totalTasks = await Task.countDocuments();
    const totalPages = Math.ceil(totalTasks / limit);

    res.status(200).json({ page, limit, totalTasks, totalPages, tasks });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
