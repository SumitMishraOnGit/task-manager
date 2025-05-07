const jwt = require("jsonwebtoken");
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access Denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify the access token using the correct secret
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Attach user information to the request object
    req.user = decoded;

    next();
  } catch (error) {
    // Handle token expiration or invalid token
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Access token expired. Please refresh your token." });
    }
    res.status(403).json({ message: "Invalid or expired token." });
  }
};

module.exports = verifyToken;