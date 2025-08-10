const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new staff user (nurse, doctor, admin)
 * @body    { name, email, password, role }
 * @access  Public (or restrict to admin later)
 */
router.post('/register', async (req, res) => {
  const { name, email, password, role = 'nurse' } = req.body;

  // Input validation
  if (!name || !email || !password) {
    return res.status(400).json({
      error: 'Name, email, and password are required.',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: 'Password must be at least 6 characters long.',
    });
  }

  try {
    // Check if user already exists
    const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'A user with this email already exists.',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new user into PostgreSQL
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, email, role, createdat`,
      [name, email, hashedPassword, role]
    );

    // Respond with user (no password)
    res.status(201).json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      email: result.rows[0].email,
      role: result.rows[0].role,
      createdAt: result.rows[0].createdat,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({
      error: 'User registration failed',
      details: err.message,
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT
 * @body    { email, password }
 * @access  Public
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Input validation
  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required.',
    });
  }

  try {
    // Find user by email
    console.log('🔍 Looking for user with email:', email);
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      console.log('❌ No user found with email:', email);
      return res.status(401).json({
        error: 'Invalid credentials.',
      });
    }

    const user = result.rows[0];
    console.log('✅ User found:', user.email, 'Role:', user.role);
    console.log('🔑 Password hash from DB:', user.password_hash?.substring(0, 20) + '...');

    // Verify password
    console.log('🔐 Password DEBUG:');
    console.log('  - Password type:', typeof password);
    console.log('  - Password length:', password.length);
    console.log('  - Password value:', JSON.stringify(password));
    console.log('  - Hash type:', typeof user.password_hash);
    console.log('  - Hash length:', user.password_hash?.length);
    console.log('  - Hash value:', JSON.stringify(user.password_hash));
    
    // Test with known working hash
    const testHash = await bcrypt.hash('admin123', 12);
    console.log('🧪 Test hash generated:', testHash);
    const testMatch = await bcrypt.compare('admin123', testHash);
    console.log('🧪 Test comparison result:', testMatch);
    
    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log('🎯 Password match result:', isMatch);
    
    if (!isMatch) {
      console.log('❌ Password verification failed');
      return res.status(401).json({
        error: 'Invalid credentials.',
      });
    }

    console.log('✅ Login successful for:', user.email);

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return token and user info (exclude password)
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      error: 'Login process failed',
      details: err.message,
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private (requires JWT)
 */
router.get('/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer token"

  if (!token) {
    return res.status(401).json({
      error: 'Access denied. No token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await db.query(
      `SELECT id, name, email, role, createdat FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found.',
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({
        error: 'Invalid token.',
      });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({
        error: 'Token has expired.',
      });
    }
    console.error('Auth middleware error:', err);
    res.status(500).json({
      error: 'Failed to authenticate user.',
      details: err.message,
    });
  }
});

module.exports = router;