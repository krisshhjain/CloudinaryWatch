const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Otp = require('../models/Otp');
const LoginHistory = require('../models/LoginHistory');
const { sendOtpEmail } = require('../utils/mailer');

const router = express.Router();

// Generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Generate 6-digit OTP
const generateOtp = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

// ========================================================================
// SIGNUP FLOW: signup → send OTP → verify → create account
// ========================================================================

// POST /api/auth/signup — Step 1: Validate, store OTP, send email
router.post(
  '/signup',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // Rate limit: check if OTP was sent recently (30s cooldown)
      const recentOtp = await Otp.findOne({
        email,
        purpose: 'signup',
        createdAt: { $gt: new Date(Date.now() - 30 * 1000) },
      });
      if (recentOtp) {
        return res.status(429).json({ message: 'OTP already sent. Please wait 30 seconds before requesting again.' });
      }

      // Delete any existing OTPs for this email
      await Otp.deleteMany({ email, purpose: 'signup' });

      // Generate OTP and hash password
      const otp = generateOtp();
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Send email FIRST — if it fails, don't save OTP
      try {
        await sendOtpEmail(email, otp, 'signup');
      } catch (emailErr) {
        console.error('Email send error:', emailErr);
        return res.status(500).json({ message: 'Failed to send verification email. Please check your email and try again.' });
      }

      // Email sent — now save OTP to DB
      await Otp.create({
        email,
        otp, // will be hashed by pre-save hook
        purpose: 'signup',
        signupData: { name, password: hashedPassword },
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
      });

      res.json({ message: 'OTP sent to your email', email });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
    }
  }
);

// POST /api/auth/verify-signup — Step 2: Verify OTP → create account
router.post(
  '/verify-signup',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit OTP is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, otp } = req.body;

      // Find OTP record
      const otpRecord = await Otp.findOne({ email, purpose: 'signup' });
      if (!otpRecord) {
        return res.status(400).json({ message: 'OTP expired or not found. Please sign up again.' });
      }

      // Check attempts (max 5)
      if (otpRecord.attempts >= 5) {
        await Otp.deleteMany({ email, purpose: 'signup' });
        return res.status(400).json({ message: 'Too many failed attempts. Please sign up again.' });
      }

      // Verify OTP
      const isValid = await otpRecord.compareOtp(otp);
      if (!isValid) {
        otpRecord.attempts += 1;
        await otpRecord.save();
        return res.status(400).json({
          message: `Invalid OTP. ${5 - otpRecord.attempts} attempts remaining.`,
        });
      }

      // Check if user was created in the meantime
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        await Otp.deleteMany({ email, purpose: 'signup' });
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // Create user with pre-hashed password (skip model's pre-save hash)
      const user = new User({
        name: otpRecord.signupData.name,
        email,
        password: otpRecord.signupData.password,
      });
      user.$skipPasswordHash = true;
      await user.save();

      // Cleanup OTP
      await Otp.deleteMany({ email, purpose: 'signup' });

      // Log login
      await LoginHistory.create({
        userId: user._id,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent') || '',
        method: 'email',
      });

      const token = generateToken(user);

      res.status(201).json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      console.error('Verify signup error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// ========================================================================
// LOGIN FLOW: login → send OTP → verify → return token
// ========================================================================

// POST /api/auth/login — Step 1: Validate credentials, send OTP
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Check if user has a password (could be OAuth only)
      if (!user.password) {
        return res.status(400).json({
          message: 'This account uses Google login. Please sign in with Google.',
        });
      }

      // Compare password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Rate limit: check if OTP was sent recently (30s cooldown)
      const recentOtp = await Otp.findOne({
        email,
        purpose: 'login',
        createdAt: { $gt: new Date(Date.now() - 30 * 1000) },
      });
      if (recentOtp) {
        // Rate limited but credentials ARE valid — still go to OTP step
        return res.json({ message: 'OTP already sent to your email', email, requiresOtp: true });
      }

      // Delete old login OTPs
      await Otp.deleteMany({ email, purpose: 'login' });

      // Generate OTP
      const otp = generateOtp();

      // Send email FIRST
      try {
        await sendOtpEmail(email, otp, 'login');
      } catch (emailErr) {
        console.error('Email send error:', emailErr);
        return res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
      }

      // Email sent — now save OTP to DB
      await Otp.create({
        email,
        otp,
        purpose: 'login',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      res.json({ message: 'OTP sent to your email', email, requiresOtp: true });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// POST /api/auth/verify-login — Step 2: Verify OTP → return token
router.post(
  '/verify-login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit OTP is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, otp } = req.body;

      // Find OTP record
      const otpRecord = await Otp.findOne({ email, purpose: 'login' });
      if (!otpRecord) {
        return res.status(400).json({ message: 'OTP expired or not found. Please log in again.' });
      }

      // Check attempts
      if (otpRecord.attempts >= 5) {
        await Otp.deleteMany({ email, purpose: 'login' });
        return res.status(400).json({ message: 'Too many failed attempts. Please log in again.' });
      }

      // Verify OTP
      const isValid = await otpRecord.compareOtp(otp);
      if (!isValid) {
        otpRecord.attempts += 1;
        await otpRecord.save();
        return res.status(400).json({
          message: `Invalid OTP. ${5 - otpRecord.attempts} attempts remaining.`,
        });
      }

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }

      // Cleanup OTP
      await Otp.deleteMany({ email, purpose: 'login' });

      // Log login
      await LoginHistory.create({
        userId: user._id,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent') || '',
        method: 'email',
      });

      const token = generateToken(user);

      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      console.error('Verify login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// ========================================================================
// RESEND OTP
// ========================================================================

// POST /api/auth/resend-otp — resend OTP for signup or login
router.post(
  '/resend-otp',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('purpose').isIn(['signup', 'login']).withMessage('Purpose must be signup or login'),
  ],
  async (req, res) => {
    try {
      const { email, purpose } = req.body;

      // Rate limit: 30s cooldown
      const recentOtp = await Otp.findOne({
        email,
        purpose,
        createdAt: { $gt: new Date(Date.now() - 30 * 1000) },
      });
      if (recentOtp) {
        return res.status(429).json({ message: 'Please wait 30 seconds before requesting a new OTP.' });
      }

      // For signup: we need existing OTP record with signupData
      if (purpose === 'signup') {
        const existingOtp = await Otp.findOne({ email, purpose: 'signup' });
        if (!existingOtp) {
          return res.status(400).json({ message: 'No signup in progress. Please sign up again.' });
        }

        const signupData = existingOtp.signupData;
        await Otp.deleteMany({ email, purpose: 'signup' });

        const otp = generateOtp();
        await Otp.create({
          email,
          otp,
          purpose: 'signup',
          signupData,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });

        await sendOtpEmail(email, otp, 'signup');
      } else {
        // For login: just regenerate OTP
        await Otp.deleteMany({ email, purpose: 'login' });

        const otp = generateOtp();
        await Otp.create({
          email,
          otp,
          purpose: 'login',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });

        await sendOtpEmail(email, otp, 'login');
      }

      res.json({ message: 'New OTP sent to your email' });
    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({ message: 'Failed to resend OTP' });
    }
  }
);

// ========================================================================
// EXISTING ENDPOINTS
// ========================================================================

// GET /api/auth/me — get current user
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/auth/google — initiate Google OAuth
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// GET /api/auth/google/callback — handle callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google_auth_failed`,
    session: false,
  }),
  async (req, res) => {
    try {
      // Log login
      await LoginHistory.create({
        userId: req.user._id,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent') || '',
        method: 'google',
      });

      const token = generateToken(req.user);
      res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
    }
  }
);

// ------------------------------------------------------------------
// Settings endpoints (require auth)
// ------------------------------------------------------------------
const auth = require('../middleware/auth');

// PUT /api/auth/profile — update name
router.put('/profile', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    await User.findByIdAndUpdate(req.user._id, { name: name.trim() });
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/auth/password — change password
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id);
    if (!user.password) {
      return res.status(400).json({ message: 'Cannot change password for Google-only accounts' });
    }
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/auth/account — permanently delete account and all data
router.delete('/account', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const CloudinaryCredential = require('../models/CloudinaryCredential');
    const UploadHistory = require('../models/UploadHistory');

    await Promise.all([
      User.findByIdAndDelete(userId),
      CloudinaryCredential.deleteMany({ userId }),
      UploadHistory.deleteMany({ userId }),
      LoginHistory.deleteMany({ userId }),
    ]);

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
