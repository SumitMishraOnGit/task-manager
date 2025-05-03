const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRoles = req.user.roles || [];
    const isVirtualAdmin = req.user.roles.includes("editor") && req.user.roles.includes("viewer");

    const hasRole = allowedRoles.some(role => 
      userRoles.includes(role) || (role === "admin" && isVirtualAdmin)
    );

    if (!hasRole) {
      return res.status(403).json({ message: "Access denied." });
    }

    next();
  };
};