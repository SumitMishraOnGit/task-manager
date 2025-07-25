const express = require("express");
const router = express.Router();
const Task = require("../../models/Task");
const verifyToken = require("../../middlewares/authMiddleware");
const uploadTaskFile = require("../../middlewares/multerTasks");
const { buildTaskQuery, getSortOption } = require("../../utils/taskQueryUtils");
// const checkRole = require("../../middlewares/checkRoles");

// Create a new task with file upload
router.post("/", verifyToken, uploadTaskFile.single('taskFile'), async (req, res, next) => {
  try {
    console.log('Creating new task with data:', req.body);
    const { title, description, dueDate, status } = req.body;
    
    const taskData = {
      title,
      description,
      dueDate,
      status,
      file: req.file ? req.file.path : null,
      createdBy: req.user.userId || req.user._id
    };

    console.log('Task data prepared:', taskData);
    const newTask = new Task(taskData);
    const savedTask = await newTask.save();
    console.log('Task saved successfully:', savedTask);
    
    // Return the saved task as response
    res.status(201).json(savedTask);
  } catch (error) {
    console.error('Error creating task:', error);
    next(error);
  }
});

// Update a task by ID
router.put("/:id", verifyToken, async (req, res, next) => {
  try {
    console.log('Updating task:', req.params.id, 'with data:', req.body);
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (req.user.role !== "admin" && task.createdBy.toString() !== (req.user.userId || req.user._id).toString()) {
      return res.status(403).json({ message: "You can only edit your own tasks." });
    }

    // Actually update the task
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    console.log('Task updated successfully:', updatedTask);
    res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    next(error);
  }
});


// Delete a task by ID
router.delete(
  "/:id",
  verifyToken,
  // checkRole(["admin", "user"]), // Allow both, but check ownership
  async (req, res, next) => {
    try {
      // Find the task by ID
      const task = await Task.findById(req.params.id);

      // If the task does not exist, return a 404 error
      if (!task) {
        return res.status(404).json({ message: "Task not found!" });
      }

      // If the user is not an admin and does not own the task, deny access
      if (req.user.role === "user" && task.createdBy.toString() !== req.user.userId.toString()) {
        return res.status(403).json({ message: "You can only delete your own tasks." });
      }

      // Delete the task
      await task.remove();
      res.status(200).json({ message: "Task deleted!" });
    } catch (error) {
      // Pass the error to the global error handler
      next(error);
    }
  }
);

// Pagination
router.get("/paginated", verifyToken, async (req, res, next) => {
  try {
    const queryObj = buildTaskQuery(req.query);
    const sortOption = getSortOption(req.query.sort);

    // Add user filter
    queryObj.createdBy = req.user.userId || req.user._id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
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
    const baseQuery = { ...buildTaskQuery({ range }) };
    // Only user's own tasks (if not admin)
    if (req.user.role !== "admin") {
      baseQuery.createdBy = req.user.userId || req.user._id;
    }
    const total = await Task.countDocuments(baseQuery);
    const completed = await Task.countDocuments({ ...baseQuery, status: "completed" });
    const pending = await Task.countDocuments({ ...baseQuery, status: "pending" });
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
    const now = new Date();
    let start;
    let groupFormat;
    let periods = [];

    if (range === 'weekly') {
      // Last 7 days, group by day
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
      // Build array of last 7 days (for x-axis labels)
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        periods.push(d.toISOString().slice(0, 10));
      }
    } else if (range === 'monthly') {
      // Last 30 days, group by 3-day periods
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      // Build array of 3-day period labels
      for (let i = 0; i < 10; i++) {
        const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29 + i * 3);
        const periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29 + (i + 1) * 3 - 1);
        periods.push({
          label: `${periodStart.getDate()}-${periodEnd.getDate()} ${periodStart.toLocaleString('default', { month: 'short' })}`,
          start: periodStart,
          end: new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate() + 1) // exclusive
        });
      }
    } else {
      return res.status(400).json({ message: "Invalid range" });
    }

    // Query user's tasks in the date range
    const match = {
      createdBy: userId,
      createdAt: { $gte: start, $lte: now }
    };

    const tasks = await Task.find(match);  // Use Task directly instead of req.app.models.Task

    let chartData = [];
    if (range === 'weekly') {
      // Group by day
      for (const day of periods) {
        const dayTasks = tasks.filter(t => t.createdAt.toISOString().slice(0, 10) === day);
        chartData.push({
          name: day,
          total: dayTasks.length,
          completed: dayTasks.filter(t => t.status).length,  // Use boolean status
          pending: dayTasks.filter(t => !t.status).length    // Use boolean status
        });
      }
    } else if (range === 'monthly') {
      // Group by 3-day periods
      for (const period of periods) {
        const periodTasks = tasks.filter(t => t.createdAt >= period.start && t.createdAt < period.end);
        chartData.push({
          name: period.label,
          total: periodTasks.length,
          completed: periodTasks.filter(t => t.status).length,  // Use boolean status
          pending: periodTasks.filter(t => !t.status).length    // Use boolean status
        });
      }
    }

    // Only return periods with data (for new users)
    chartData = chartData.filter(d => d.total > 0 || d.completed > 0 || d.pending > 0);

    res.json(chartData);
  } catch (error) {
    next(error);
  }
});


module.exports = router;

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