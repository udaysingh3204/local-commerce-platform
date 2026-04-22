const checkRole = (...roles) => {

  const normalizedRoles = roles.length === 1 && Array.isArray(roles[0])
    ? roles[0]
    : roles;

  return (req, res, next) => {

    if (!normalizedRoles.includes(req.user.role)) {

      return res.status(403).json({
        message: "Access denied"
      });

    }

    next();

  };

};

// Export both ways for compatibility
module.exports = checkRole;
module.exports.checkRole = checkRole;