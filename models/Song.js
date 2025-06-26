const mongoose = require('mongoose');

const SongSchema = new mongoose.Schema({
  title: String,
  artist: String,
  album: String,
  duration: String,
  filePath: String,
  imagePath: String,
  genre: String,
  year: Number,
  language: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Link to user
});

module.exports = mongoose.model('Song', SongSchema); 