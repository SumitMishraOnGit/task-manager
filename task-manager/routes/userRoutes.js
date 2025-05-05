const express = require("express");
const router = express.Router();
const User = require("../../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const verifyToken = require("../../middlewares/authMiddleware");
const errorHandler = require("../../middleware/errorhandling");
const uploadProfilePic = require("../../middlewares/multerProfile");
const checkRole = require('../middlewares/checkRole');

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

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.status(200).json({ message: "Login successful", token });
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

<<<<<<< HEAD
module.exports = router;
=======
module.exports = router;
>>>>>>> 862dafafcc5fec51a82ff8082455d0a262246ef9
