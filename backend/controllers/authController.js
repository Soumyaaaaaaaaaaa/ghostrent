const User = require("../models/User");
const jwt = require("jsonwebtoken");

/**
 * Generate JWT Token
 */
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "default_secret", {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

/**
 * @desc    Register a new user
 * @route   POST /auth/signup
 */
exports.signup = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // 1. Validate inputs
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields (name, email, password).",
      });
    }

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists. Please login instead.",
      });
    }

    // 3. Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
    });

    // 4. Generate token
    const token = signToken(user._id);

    // 5. Send response
    res.status(201).json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    console.error("[Signup Error]", error);
    
    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    res.status(500).json({
      success: false,
      message: "An error occurred during signup.",
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate inputs
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password.",
      });
    }

    // 2. Find user (explicitly select password if needed, but here it's included by default in the schema)
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    // 3. Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    // 4. Generate token
    const token = signToken(user._id);

    // 5. Send response
    res.status(200).json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    console.error("[Login Error]", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during login.",
    });
  }
};

/**
 * @desc    Get current user
 * @route   GET /auth/me
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("[GetMe Error]", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching user data.",
    });
  }
};
