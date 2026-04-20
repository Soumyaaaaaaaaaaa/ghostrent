const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    let token;

    // Check header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer")) {
      // Split "Bearer <token>"
      token = authHeader.split(" ")[1];
    } else if (authHeader) {
      // Direct token without Bearer prefix
      token = authHeader;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please log in.",
      });
    }

    // Verify token
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "default_secret"
      );
      
      // Attach user id to request
      req.userId = decoded.id;
      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token. Please log in again.",
      });
    }
  } catch (error) {
    console.error("[Auth Middleware Error]", error);
    return res.status(500).json({
      success: false,
      message: "Server error during authentication.",
    });
  }
};

module.exports = authMiddleware;
