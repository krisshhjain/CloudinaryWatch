require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const connectDB = require('./config/db');
const passport = require('./config/passport');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// Connect to MongoDB
connectDB();

// ====== SECURITY MIDDLEWARE ======
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Let frontend handle CSP
}));

// Trust proxy (needed for rate-limiter behind Render/Railway)
app.set('trust proxy', 1);

// Rate limiting — 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 100 : 1000, // relaxed in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 20 : 200,
  message: { message: 'Too many auth attempts, please try again later.' },
});
app.use('/api/auth', authLimiter);
app.use('/api/admin/auth', authLimiter);

// CORS — allow only frontend origin
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Body parsers with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session for Passport (required for OAuth flow)
app.use(session({
  secret: process.env.JWT_SECRET || 'fallback-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProd,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    sameSite: isProd ? 'none' : 'lax',
  },
}));
app.use(passport.initialize());
app.use(passport.session());

// ====== ROUTES ======
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cloudinary', require('./routes/cloudinary'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/admin/auth', require('./routes/adminAuth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/optimize', require('./routes/optimize'));
app.use('/api/folders', require('./routes/folders'));

// Health check (for uptime monitoring — Render, UptimeRobot, etc.)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ====== ERROR HANDLING ======
app.use((err, req, res, next) => {
  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'CORS: Origin not allowed' });
  }

  // Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 50MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files. Maximum is 100 files.' });
    }
    return res.status(400).json({ message: err.message });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }

  // Generic errors — don't leak stack traces in production
  console.error('Server Error:', isProd ? err.message : err);
  res.status(err.status || 500).json({
    message: isProd ? 'Internal server error' : err.message || 'Internal server error',
  });
});

// ====== START SERVER ======
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 CloudinaryWatch Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
