const mongoose = require('mongoose');

// User model
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  likedSongs: { type: [String], default: [] }, // Array of song IDs
  history: { type: [String], default: [] }     // Array of song IDs
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);