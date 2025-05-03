const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// user schema 
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    trim: true,
    minlength: [6, "Password must be at least 6 characters"],
  },
  roles: {
    type: [String],
    enum: ["admin", "editor", "viewer", "user"],
    default: ["user"]
  },
  file: {
    type: String,
    default: null,
  },
});

// virtual field for admin
UserSchema.virtual("isAdmin").get(function () {
  const hasEditor = this.roles.includes("editor");
  const hasViewer = this.roles.includes("viewer");
  return hasEditor && hasViewer;
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// method to compare password 
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
