const checkRole = (allowedRoles) => {
    return (req, res, next) => {
      const userRole = req.user.role;
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: "Access denied: You dont have access to be HERE!" });
      }
      next();
    };
  };

  
module.exports = checkRole;
  