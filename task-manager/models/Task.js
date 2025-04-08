const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Define Task Schema
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String },
  dueDate: { type: Date },
  status: { type: Boolean, required: true, default: false },
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  password: { type: String, required: true, trim: true },
  email: { type: String, required : true, unique: true },
  role: { type: String}
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); 

  try {
    const salt = await bcrypt.genSalt(10); 
    this.password = await bcrypt.hash(this.password, salt); 
    next();
  } catch (error) {
    return next(error);
  }
});


// Create and export Task model
const Task = mongoose.model("Task", taskSchema);
const User = mongoose.model("User", userSchema);
module.exports = Task;
