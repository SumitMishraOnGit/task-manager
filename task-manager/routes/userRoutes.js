const express = require("express");
const router = express.Router();
const User = require("../../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const verifyToken = require("../../middlewares/authMiddleware");
const errorHandler = require("../../middleware/errorhandling");
const uploadProfilePic = require("../../middlewares/multerProfile");
const checkRole = require('../middlewares/checkRole');

router.use(cookieParser());
router.use(express.json());
router.use(errorHandler);

// ------------------ SIGNUP ------------------
router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const newUser = new User({ name, email, password });
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (error) {
    next(error);
  }
});

// ------------------ LOGIN ------------------
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please enter email and password" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found. Please sign up first." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    // Fetch task statistics based on user role
    let taskStats = {};
    if (user.role === "admin" || user.role === "editor" || user.role === "viewer") {
      const totalTasks = await Task.countDocuments();
      const completedTasks = await Task.countDocuments({ status: true });
      const pendingTasks = totalTasks - completedTasks;

      taskStats = {
        totalTasks,
        completedTasks,
        pendingTasks,
      };
    } else {
      const totalTasks = await Task.countDocuments({ createdBy: user._id });
      const completedTasks = await Task.countDocuments({
        createdBy: user._id,
        status: true,
      });
      const pendingTasks = totalTasks - completedTasks;

      taskStats = {
        totalTasks,
        completedTasks,
        pendingTasks,
      };
    }

    // Generate access token
    const accessToken = jwt.sign(
      { userId: user._id, roles: user.roles },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" } // Default: 15 minutes
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" } // Default: 7 days
    );

    // Store refresh token in HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Send the login response with access token and task stats
    res.status(200).json({
      message: "Login successful",
      accessToken,
      user: {
        name: user.name,
        email: user.email,
        role: user.role, // Include role info
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


// ------------------ UPDATE USER BY ID ------------------
router.put("/:id", verifyToken, async (req, res, next) => {
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
