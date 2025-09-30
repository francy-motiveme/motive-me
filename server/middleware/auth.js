export const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'You must be logged in to access this resource'
    });
  }
  next();
};

export const optionalAuth = (req, res, next) => {
  next();
};

export const getUserFromSession = (req) => {
  if (!req.session || !req.session.userId) {
    return null;
  }
  return {
    id: req.session.userId,
    email: req.session.userEmail
  };
};
