const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const { rows } = await db.execute({
    sql: 'SELECT * FROM users WHERE username = ?',
    args: [username],
  });
  const user = rows[0];

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const token = jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  return res.status(200).json({
    message: 'Login successful.',
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  });
});

router.post('/logout', (req, res) => {
  return res.status(200).json({
    message: 'Logged out successfully. Discard the token from client storage.',
  });
});

module.exports = router;
