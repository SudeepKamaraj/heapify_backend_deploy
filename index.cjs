require('dotenv').config();
console.log('MONGO_URI:', process.env.MONGO_URI);
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB (hardcoded URI)
mongoose.connect('mongodb://localhost:27017/heapify', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected!'))
  .catch(err => console.log(err));

// Example route
app.get('/', (req, res) => {
  res.send('API is running');
});

// Auth routes
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
