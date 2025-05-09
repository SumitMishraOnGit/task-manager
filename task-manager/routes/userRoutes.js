const express = require("express");
const cookieParser = require("cookie-parser");
const router = express.Router();
const User = require("../../models/User");
const Task = require("../../models/Task");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const verifyToken = require("../../middlewares/authMiddleware");
const errorHandler = require("../../middlewares/errorHandling");
const uploadProfilePic = require("../../middlewares/multerProfile");
const checkRole = require('../../middlewares/checkRoles');

router.use(express.json());
router.use(cookieParser());
router.use(errorHandler);

// ------------------ SIGNUP ------------------
router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password, roles } = req.body;
    const userRoles = roles && roles.length > 0 ? roles : ["user"];
    const user = new User({
      name,
      email,
      password,
      roles: userRoles, // Explicitly set roles
    });
    await user.save();
    res.status(201).json({ message: "User created successfully", user });
  } catch (error) {
    next(error);
  }
});

// ------------------ LOGIN ------------------
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({ message: "Please enter email and password" });
    }

    // 2. Find user in the database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found. Please sign up first." });
    }

    // 3. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    // 4. Initialize task statistics
    let taskStats = {
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
    };

    // 5. Fetch task stats based on user role
    if (user.role === "admin" || user.role === "editor" || user.role === "viewer") {
      const totalTasks = await Task.countDocuments();
      if (totalTasks > 0) {
        const completedTasks = await Task.countDocuments({ status: true });
        const pendingTasks = totalTasks - completedTasks;

        taskStats = { totalTasks, completedTasks, pendingTasks };
      }
    } else {
      const totalTasks = await Task.countDocuments({ createdBy: user._id });
      if (totalTasks > 0) {
        const completedTasks = await Task.countDocuments({
          createdBy: user._id,
          status: true,
        });
        const pendingTasks = totalTasks - completedTasks;

        taskStats = { totalTasks, completedTasks, pendingTasks };
      }
    }

    // 6. Generate access token
    const accessToken = jwt.sign(
      { userId: user._id, roles: user.roles },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" }
    );

    // 7. Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" }
    );

    // 8. Store refresh token in HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // 9. Send response (always includes accessToken)
    res.status(200).json({
      message:
        taskStats.totalTasks === 0
          ? "Login successful, but no tasks found. Please create some tasks."
          : "Login successful",
      accessToken,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
      },
      taskStats,
    });

  } catch (error) {
    next(error);
  }
});

// ------------------ GET ALL USERS ------------------
router.get(
  "/",
  verifyToken,
  checkRole(["admin"]), 
  async (req, res, next) => {
    try {
      const users = await User.find();
      if (!users.length) return res.status(404).json({ message: "No users found!" });
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  }
);
// ------------------ GET USERS BY ID ------------------// 
router.get("/profile", verifyToken, async (req, res, next) => {
  try {
    // Retrieve user ID from the authenticated request
    const userId = req.user.userId;

    // Fetch user data from the database
    const user = await User.findById(userId).select("-password"); // Exclude password

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return user info
    res.status(200).json({
      name: user.name,
      email: user.email,
      avatar: user.file,
    });
  } catch (error) {
    next(error);
  }
});
// ------------------ UPDATE USER BY ID ------------------
router.put("/profile/:id", verifyToken, async (req, res, next) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedUser) return res.status(404).json({ message: "User not found" });
    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
});

// ------------------ UPDATING YOUR OWN CREDENTIALS ------------------
router.put("/profile", verifyToken, uploadProfilePic.single("avatar"), async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { name, currentPassword, newPassword } = req.body;

    // Fetch the user from the database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Validate current password
    if (currentPassword && !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Update fields
    if (name) user.name = name;
    if (req.file) user.file = req.file.path; // Update avatar
    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    // Save the updated user
    const updatedUser = await user.save();

    // Return updated info
    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.file,
      },
    });
  } catch (error) {
    next(error);
  }
});
// ------------------ DELETE USER BY ID ------------------
router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "User deleted successfully", deletedUser });
  } catch (error) {
    next(error);
  }
});

// ------------------ PAGINATION ------------------
router.get("/paginate", verifyToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const users = await User.find().skip(skip).limit(limit);
    const totalUsers = await User.countDocuments();
    const totalPages = Math.ceil(totalUsers / limit);

    res.status(200).json({ page, limit, totalUsers, totalPages, users });
  } catch (error) {
    next(error);
  }
});

// ------------------ PROFILE PIC UPLOAD ------------------
router.post("/uploadProfile", verifyToken, uploadProfilePic.single("profilePic"), async (req, res, next) => {
  try {
    const filePath = req.file ? req.file.path : null;

    if (!filePath) return res.status(400).json({ message: "No file uploaded" });

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { file: filePath },
      { new: true }
    );

    res.status(200).json({ message: "Profile picture uploaded", user: updatedUser });
  } catch (error) {
    next(error);
  }
});

// ------------------ REFRESH TOKEN ------------------
router.post("/refresh-token", async (req, res, next) => {
  try {
    // Get the refresh token from the HTTP-only cookie
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token not provided" });
    }

    // Verify the refresh token
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired refresh token" });
      }
      // Generate a new access token
      const accessToken = jwt.sign(
        { userId: decoded.userId, roles: decoded.roles },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" } // Default: 15 minutes
      );

      // Send the new access token to the client
      res.status(200).json({ accessToken });
    });
  } catch (error) {
    next(error);
  }
});

// ------------------ LOGOUT ROUTE ------------------
router.post("/logout", (req, res) => {
  // Clear the refresh token cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Use secure cookies in production
    sameSite: "strict",
  });

  res.status(200).json({ message: "Logged out successfully" });
});
module.exports = router;
