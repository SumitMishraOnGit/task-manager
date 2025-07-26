const express = require("express");
const router = express.Router();
const Task = require("../../models/Task");
const verifyToken = require("../../middlewares/authMiddleware");
const uploadTaskFile = require("../../middlewares/multerTasks");
const { buildTaskQuery, getSortOption } = require("../../utils/taskQueryUtils");
const mongoose = require('mongoose'); 

// Create a new task with file upload
router.post("/", verifyToken, uploadTaskFile.single('taskFile'), async (req, res, next) => {
  try {
    const { title, description, dueDate, status } = req.body;
    const userId = req.user.userId || req.user._id;

    if (!userId) {
      return res.status(400).json({ message: "User ID not found in token." });
    }

    const taskData = {
      title,
      description,
      dueDate,
      status,
      file: req.file ? req.file.path : null,
      createdBy: userId
    };

    const newTask = new Task(taskData);
    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (error) {
    next(error);
  }
});

// Update a task by ID
router.put("/:id", verifyToken, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (req.user.role !== "admin" && task.createdBy.toString() !== (req.user.userId || req.user._id).toString()) {
      return res.status(403).json({ message: "You can only edit your own tasks." });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedTask);
  } catch (error) {
    next(error);
  }
});


// Delete a task by ID
router.delete("/:id", verifyToken, async (req, res, next) => {
    try {
      const task = await Task.findById(req.params.id);

      if (!task) {
        return res.status(404).json({ message: "Task not found!" });
      }

      if (req.user.role !== "admin" && task.createdBy.toString() !== (req.user.userId || req.user._id).toString()) {
        return res.status(403).json({ message: "You can only delete your own tasks." });
      }

      // ✨ FIX: Use findByIdAndDelete instead of the deprecated .remove()
      await Task.findByIdAndDelete(req.params.id);
      
      res.status(200).json({ message: "Task deleted!" });
    } catch (error) {
      next(error);
    }
  }
);


// Pagination
router.get("/paginated", verifyToken, async (req, res, next) => {
  try {
    const queryObj = buildTaskQuery(req.query);
    const sortOption = getSortOption(req.query.sort);
    const userId = req.user.userId || req.user._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID format." });
    }

    queryObj.createdBy = userId;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const tasks = await Task.find(queryObj)
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    const totalTasks = await Task.countDocuments(queryObj);
    const totalPages = Math.ceil(totalTasks / limit);

    res.status(200).json({
      page,
      limit,
      totalTasks,
      totalPages,
      tasks,
    });
  } catch (error) {
    next(error);
  }
});

// Task statistics by range (weekly/monthly)
router.get("/stats", verifyToken, async (req, res, next) => {
  try {
    const { range } = req.query;
    const userId = req.user.userId || req.user._id;

    // ✨ FIX 1: Validate the User ID from the token
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid ID format in token." });
    }

    const baseQuery = { ...buildTaskQuery({ range }), createdBy: userId };

    const total = await Task.countDocuments(baseQuery);
    // ✨ FIX 2: Query status with booleans (true/false), not strings
    const completed = await Task.countDocuments({ ...baseQuery, status: true });
    const pending = await Task.countDocuments({ ...baseQuery, status: false });

    res.json({ total, completed, pending });
  } catch (error) {
    next(error);
  }
});

// Task analytics for chart (grouped by day or 3-day period)
router.get("/analytics", verifyToken, async (req, res, next) => {
  try {
    const { range } = req.query;
    const userId = req.user.userId || req.user._id;
    
    // ✨ FIX 1 (Consistency): Validate the User ID here as well
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid ID format in token." });
    }

    const now = new Date();
    let start;
    let periods = [];

    if (range === 'weekly') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        periods.push(d.toISOString().slice(0, 10));
      }
    } else if (range === 'monthly') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      for (let i = 0; i < 10; i++) {
        const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29 + i * 3);
        const periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29 + (i + 1) * 3 - 1);
        periods.push({
          label: `${periodStart.getDate()}-${periodEnd.getDate()} ${periodStart.toLocaleString('default', { month: 'short' })}`,
          start: periodStart,
          end: new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate() + 1)
        });
      }
    } else {
      return res.status(400).json({ message: "Invalid range" });
    }

    const match = {
      createdBy: new mongoose.Types.ObjectId(userId),
      createdAt: { $gte: start, $lte: now }
    };

    const tasks = await Task.find(match);

    let chartData = [];
    if (range === 'weekly') {
      for (const day of periods) {
        const dayTasks = tasks.filter(t => t.createdAt.toISOString().slice(0, 10) === day);
        chartData.push({
          name: day,
          total: dayTasks.length,
          // ✨ FIX 2: Use boolean status for counting
          completed: dayTasks.filter(t => t.status === true).length,
          pending: dayTasks.filter(t => t.status === false).length
        });
      }
    } else if (range === 'monthly') {
      for (const period of periods) {
        const periodTasks = tasks.filter(t => t.createdAt >= period.start && t.createdAt < period.end);
        chartData.push({
          name: period.label,
          total: periodTasks.length,
          // ✨ FIX 2: Use boolean status for counting
          completed: periodTasks.filter(t => t.status === true).length,
          pending: periodTasks.filter(t => t.status === false).length
        });
      }
    }

    res.json(chartData);
  } catch (error) {
    next(error);
  }
});
// // Get all tasks (role-based)
// router.get("/",
//   verifyToken,
//   checkRole(["admin", "user"]),
//   async (req, res, next) => {
//     try {
//       // Check the role of the logged-in user
//       const tasks =
//         req.user.roles.includes("admin") 
//           ? await Task.find() 
//           : await Task.find({ createdBy: req.user.userId }); 
//       // Return the tasks
//       res.status(200).json(tasks);
//     } catch (error) {
//       next(error);
//     }
//   }
// );
module.exports = router;
