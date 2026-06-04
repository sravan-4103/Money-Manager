const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const generateToken = (userId, name) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined in environment');
  return jwt.sign({ userId, name }, secret, { expiresIn: '7d' });
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  console.log('📥 Register request body:', JSON.stringify(req.body));
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: 'User Name is already exists' });
    }

    const user = new User({ name, email, password });
    await user.save();
    console.log('✅ User saved:', user.email);

    const token = generateToken(user._id, user.name);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('❌ Register error:', err.message, '\nStack:', err.stack);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  console.log('📥 Login request body:', JSON.stringify({ email: req.body?.email }));
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ message: 'User Name and password are required' });
    }

    const user = await User.findOne({ name });
    if (!user) {
      return res.status(400).json({ message: 'Invalid User Name or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid User Name or password' });
    }

    const token = generateToken(user._id, user.name);
    console.log('✅ Login success:', user.name);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('❌ Login error:', err.message, '\nStack:', err.stack);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

module.exports = router;
