const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Song = require('../models/Song');
const User = require('../models/User');

// Middleware to verify JWT
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, 'your_jwt_secret', (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    req.userId = decoded.userId;
    next();
  });
}

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ userId: user._id, email: user.email }, 'your_jwt_secret', { expiresIn: '1d' });
    res.json({ token, user: { name: user.name, email: user.email, likedSongs: user.likedSongs, history: user.history } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get user profile (liked songs, history)
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ name: user.name, email: user.email, likedSongs: user.likedSongs, history: user.history });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Like or unlike a song
router.post('/like', authMiddleware, async (req, res) => {
  try {
    const { songId } = req.body;
    console.log('Like request:', {
      userId: req.userId,
      songId,
      headers: req.headers
    });
    const user = await User.findById(req.userId);
    if (!user) {
      console.error('Like error: User not found for userId', req.userId);
      return res.status(404).json({ message: 'User not found' });
    }
    const index = user.likedSongs.indexOf(songId);
    if (index === -1) {
      user.likedSongs.push(songId);
    } else {
      user.likedSongs.splice(index, 1);
    }
    await user.save();
    res.json({ likedSongs: user.likedSongs.map(id => id.toString()) });
  } catch (err) {
    console.error('Like error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add to history
router.post('/history', authMiddleware, async (req, res) => {
  try {
    const { songId } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.history.push(songId);
    // Optionally limit history length
    if (user.history.length > 100) user.history = user.history.slice(-100);
    await user.save();
    res.json({ history: user.history });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all user-uploaded songs
router.get('/songs', authMiddleware, async (req, res) => {
  try {
    const songs = await Song.find({ owner: req.userId });
    res.json(songs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add a new user-uploaded song
router.post('/songs', authMiddleware, async (req, res) => {
  try {
    const { title, artist, album, duration, filePath, imagePath, genre, year, language } = req.body;
    const song = new Song({
      title,
      artist,
      album,
      duration,
      filePath,
      imagePath,
      genre,
      year,
      language,
      owner: req.userId
    });
    await song.save();
    res.status(201).json(song);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete a user-uploaded song
router.delete('/songs/:id', authMiddleware, async (req, res) => {
  try {
    const song = await Song.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!song) return res.status(404).json({ message: 'Song not found' });
    res.json({ message: 'Song deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
