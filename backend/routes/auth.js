const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendOTP } = require('../mailer');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// ──────── Helpers ──────────────────────────────────────
const generateToken = (userId, name) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined in environment');
  return jwt.sign({ userId, name }, secret, { expiresIn: '7d' });
};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limits each IP to 3 requests per windowMs
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  skipFailedRequests: true
});

// ───────────── POST /api/auth/register ─────────────────────────
router.post('/register', authLimiter, async (req, res) => {
  console.log('📥 Register request body:', JSON.stringify({ name: req.body?.name, email: req.body?.email }));
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if name already taken by a verified user
    const existingName = await User.findOne({ name });
    if (existingName && existingName.isVerified) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Check if email already taken by a verified user
    const existingEmail = await User.findOne({ email });
    if (existingEmail && existingEmail.isVerified) {
      return res.status(400).json({ message: 'Email is already registered and verified' });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // If unverified user exists (same name or email), update their record
    // Otherwise create new user
    let user = existingName || existingEmail;
    if (user) {
      user.name = name;
      user.email = email;
      user.password = password;
      user.otp = otp;
      user.otpExpiry = otpExpiry;
      user.isVerified = false;
    } else {
      user = new User({ name, email, password, otp, otpExpiry, isVerified: false });
    }

    await user.save();

    // Send OTP email
    await sendOTP(email,otp,name);
    console.log(`✅ OTP sent to ${email}`);

    res.status(200).json({ message: 'OTP sent to your email', email });
  } catch (err) {
    console.error('❌ Register error:', err.message, '\nStack:', err.stack);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// ───────────── POST /api/auth/verify-otp ───────────────────────
router.post('/verify-otp', async (req, res) => {
  console.log('📥 Verify OTP for:', req.body?.email);
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found. Please register again.' });
    }

    // Check OTP expiry
    if (!user.otp || !user.otpExpiry || new Date() > user.otpExpiry) {
      return res.status(400).json({ message: 'OTP has expired. Please register again.' });
    }

    // Check OTP match
    if (user.otp !== otp.trim()) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    // Mark as verified and clear OTP
    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();
    console.log(`✅ Email verified for ${email}`);

    const token = generateToken(user._id, user.name);
    res.status(200).json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('❌ Verify OTP error:', err.message, '\nStack:', err.stack);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// ───────────── POST /api/auth/resend-otp ─────────────────────────────
router.post('/resend-otp',authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found. Please register again.' });
    if (user.isVerified) return res.status(400).json({ message: 'Email already verified. Please login.' });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOTP(email, otp,user.name );
    console.log(`✅ OTP resent to ${email}`);

    res.status(200).json({ message: 'New OTP sent to your email' });
  } catch (err) {
    console.error('❌ Resend OTP error:', err.message);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { message: 'Too many login attempts, please try again after 15 minutes' }
});

// ───────────── POST /api/auth/login ─────────────────────────────
router.post('/login',loginLimiter , async (req, res) => {
  console.log('📥 Login attempt for name:', req.body?.name);
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ name });
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    // Block unverified users
    if (!user.isVerified) {
      // genarate fresh otp
      const otp = generateOTP();
      user.otp=otp;
      user.otpExpiry=new Date(Date.now()+10*60*1000);
      await user.save(); // saving

      // send the email
      await sendOTP(user.email,otp,user.name);
      console.log(`✅ Auto-resent OTP to ${user.email} during login attempt`)
      // Tells the frontend to redirect to OTP page
      return res.status(403).json({ message: `Email not verified. A new OTP has been sent to ${user.email}.`, email: user.email, needsVerification: true });
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
