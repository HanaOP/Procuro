// middleware/roleMiddleware.js

const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.map(r => r.toUpperCase()).includes(req.user.role.toUpperCase())) {
  return res.status(403).json({ error: 'Access denied. Insufficient role.' });
}

    next();
  };
};

module.exports = { allowRoles };