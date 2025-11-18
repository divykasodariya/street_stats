// middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware to authenticate JWT token
 */
const authenticate = (req, res, next) => {
  try {
    // Get token from cookie
  //  console.log(req.cookies);
    const token = req.cookies.token;
    if(!token){
      // console.log(req);
      
        return res.status(401).json({
            message:"unauthorised !"
        })
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach user info to request
    req.user = {
      user_id: decoded.user_id,
      username: decoded.username,
      is_admin: decoded.is_admin
    };

    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Authentication failed.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message
    });
  }
};

/**
 * Middleware to check if user is admin
 */
const isAdmin = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

module.exports = {
  authenticate,
  isAdmin
};