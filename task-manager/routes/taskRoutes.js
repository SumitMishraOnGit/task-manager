const express = require("express");
const router = express.Router();
const Task = require("../../models/Task");
const verifyToken = require("../../middlewares/authMiddleware");
const uploadTaskFile = require("../../middlewares/multerTasks");
const { buildTaskQuery, getSortOption } = require("../../utils/taskQueryUtils");
const checkRole = require("../../middlewares/checkRoles");

// Create a new task with file upload
router.post("/", verifyToken, uploadTaskFile.single('taskFile'), async (req, res, next) => {
  
  try {
    const { title, description, dueDate, status } = req.body;
    
    const taskData = {
      title,
      description,
      dueDate,
      status,
      file: req.file ? req.file.path : null,  
    };
    const newTask = new Task(taskData);
    const savedTask = await newTask.save();
    
    // Return the saved task as response
    res.status(201).json(savedTask);
  } catch (error) {
    next(error);
  }
});

// Get all tasks (role-based)
router.get("/",
  verifyToken,
  checkRole(["admin", "user"]),
  async (req, res, next) => {
    try {
      // Check the role of the logged-in user
      const tasks =
        req.user.roles.includes("admin") 
          ? await Task.find() 
          : await Task.find({ createdBy: req.user.userId }); 

      // Return the tasks
      res.status(200).json(tasks);
    } catch (error) {
      next(error);
    }
  }
);

// Update a task by ID
router.put("/:id",
  verifyToken, 
  checkRole(["admin", "user"]), // Both can update
  async (req, res, next) => {
    try {
      const task = await Task.findById(req.params.id);

      if (req.user.role === "user" && task.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "You can only edit your own tasks." });
      }
      res.status(200).json({ message: "Task updated!" });
    } catch (error) {
      next(error)
    }
  }
);


// Delete a task by ID
router.delete(
  "/:id",
  verifyToken,
  checkRole(["admin", "user"]), // Allow both, but check ownership
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



module.exports = router;