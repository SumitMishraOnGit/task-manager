const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String },
  dueDate: { type: Date },
  status: { type: Boolean, required: true, default: false },
  file: { type: String, default: null },
});

const Task = mongoose.model("Task", taskSchema);
module.exports = Task;