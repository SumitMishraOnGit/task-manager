const multer = require("multer");
const path = require("path");

// Storage settings
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/profile"); // separate folder for profile pics
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// File filter (optional - accept only images)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed"));
  }
};

const uploadProfilePic = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

<<<<<<< HEAD
module.exports = uploadProfilePic;
=======
module.exports = uploadProfilePic;
>>>>>>> 862dafafcc5fec51a82ff8082455d0a262246ef9
