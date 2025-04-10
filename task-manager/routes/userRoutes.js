const express = require("express");
const router = express.Router(); 
const User = require("../models/User/");
const jwt = require("jsonwebtoken")
router.use(express.json())

router.post("/signup", async (req, res) => {
    try {
        const { name, password, email } = req.body;
        const newUser = new User({ name, password, email });
        const savedUser = await newUser.save();
        res.status(201).json(savedUser);
      } catch (error) {
        res.status(500).json({ message: "Failed to create user", error: error.message });
      }
});


// Get all user
router.get("/user/", async (req, res) => {
  try {
    const user = await User.find();
    if (!user.length) return res.status(404).json({ message: "No user found!" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a User by ID
router.put("/user/:id", async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedUser) return res.status(404).json({ message: "User not found" });
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a User by ID
router.delete("/user/:id", async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "User deleted successfully", deletedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pagination
router.get("/user/paginate", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const user = await User.find().skip(skip).limit(limit);
    const totaluser = await User.countDocuments();
    const totalPages = Math.ceil(totaluser / limit);

    res.status(200).json({ page, limit, totaluser, totalPages, user });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// login route
router.post("/login", async (req, res) => {
  try {
    const { password, email } = req.body;
    if(!email || !password){
      return res.status(404).json({ message: "Incorrect Credentials" });
    } else if (async () => {
      const userExists = await User.findOne({ email });
      userExists;
      return res.status(500).json({ message: "User already exist, try another email!"})
    });
    res.status(200).send("Welcome Back")
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
