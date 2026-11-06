const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must contain at least 6 characters.' });
    }

    const [existing] = await db.execute('SELECT user_id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (name, phone, email, role, password_hash) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), phone || null, email.trim().toLowerCase(), 'user', passwordHash]
    );

    res.status(201).json({ success: true, message: 'Account created. You can now log in.', userId: result.insertId });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Could not create account.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const [rows] = await db.execute(
      'SELECT user_id, name, phone, email, role, password_hash FROM users WHERE email = ?',
      [email.trim().toLowerCase()]
    );
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Incorrect email or password.' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Incorrect email or password.' });
    }

    const token = jwt.sign(
      { user_id: user.user_id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      token,
      user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Could not log in.' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT user_id, name, phone, email, role FROM users WHERE user_id = ?',
      [req.user.user_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load profile.' });
  }
});

module.exports = router;
