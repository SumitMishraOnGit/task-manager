const mongoose = require("mongoose");
require('dotenv').config();
const app = require("./app");
const port = 3030;

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
