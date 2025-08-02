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
const mongoose = require('mongoose');

router.use(express.json());
router.use(cookieParser());
router.use(errorHandler);

// --- SIGNUP ---
router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const user = new User({ name, email, password });
    await user.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    next(error);
  }
});

// --- LOGIN ---
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
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password" });
    }
    const accessToken = jwt.sign({ userId: user._id, roles: user.roles }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" });
    const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" });
    res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.status(200).json({ message: "Login successful", accessToken, refreshToken, user: { name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    next(error);
  }
});

// --- GET CURRENT USER'S PROFILE ---
router.get("/profile", verifyToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ name: user.name, email: user.email, avatar: user.file });
  } catch (error) {
    next(error);
  }
});

// --- UPDATE CURRENT USER'S PROFILE (Name & Avatar) ---
router.put("/profile", verifyToken, uploadProfilePic.single("avatar"), async (req, res, next) => {
  try {
    const { name } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (name) user.name = name;
    if (req.file) user.file = req.file.path;
    const updatedUser = await user.save();
    res.status(200).json({ message: "Profile updated successfully", user: { name: updatedUser.name, email: updatedUser.email, avatar: updatedUser.file } });
  } catch (error) {
    next(error);
  }
});

// --- CHANGE USER PASSWORD ---
router.put("/profile/change-password", verifyToken, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect current password" });
    }
    user.password = newPassword;
    await user.save();
    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
});

// --- GET USER ACTIVITY HEATMAP DATA ---
router.get("/profile/activity-heatmap", verifyToken, async (req, res, next) => {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const completedTasks = await Task.aggregate([
      { $match: { createdBy: new mongoose.Types.ObjectId(req.user.userId), status: true, updatedAt: { $gte: oneYearAgo } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } }, count: { $sum: 1 } } },
      { $project: { _id: 0, date: "$_id", count: "$count" } }
    ]);
    res.status(200).json(completedTasks);
  } catch (error) {
    next(error);
  }
});

// --- REFRESH TOKEN ---
router.post("/refresh-token", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token not provided" });
    }
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired refresh token" });
      }
      const accessToken = jwt.sign({ userId: decoded.userId, roles: decoded.roles }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" });
      const newRefreshToken = jwt.sign({ userId: decoded.userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" });
      res.status(200).json({ accessToken, refreshToken: newRefreshToken });
    });
  } catch (error) {
    next(error);
  }
});

// --- LOGOUT ---
router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" });
  res.status(200).json({ message: "Logged out successfully" });
});

module.exports = router;