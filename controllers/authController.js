const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        totalTasksCompleted: user.totalTasksCompleted,
        coins: user.coins || 0
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: process.env.NODE_ENV === 'production' 
        ? 'Registration failed' 
        : error.message 
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        totalTasksCompleted: user.totalTasksCompleted,
        coins: user.coins || 0
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: process.env.NODE_ENV === 'production' 
        ? 'Login failed' 
        : error.message 
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        totalTasksCompleted: user.totalTasksCompleted,
        lastCompletedDate: user.lastCompletedDate,
        coins: user.coins || 0
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      message: process.env.NODE_ENV === 'production' 
        ? 'Failed to get profile' 
        : error.message 
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile
};
