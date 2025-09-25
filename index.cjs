require('dotenv').config();
console.log('MONGO_URI:', process.env.MONGO_URI);
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const Room = require('./models/Room');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://localhost:8080'],
  credentials: true
}));
app.use(express.json());

// Connect to MongoDB (hardcoded URI)
mongoose.connect('mongodb+srv://23sudeepk:23csr218@heapify.ieyumts.mongodb.net/?retryWrites=true&w=majority&appName=Heapify', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected!'))
  .catch(err => console.log(err));

// Example route
app.get('/', (req, res) => {
  res.send('API is running');
});

// Auth routes
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

// Room routes
const roomsRouter = require('./routes/rooms');
app.use('/api/rooms', roomsRouter);

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Join a room
  socket.on('join-room', async (data) => {
    const { roomCode, userId } = data;
    
    if (!roomCode || !userId) return;
    
    console.log(`User ${userId} joined room ${roomCode}`);
    
    // Add socket to room
    socket.join(roomCode);
    
    // Notify other members that a new user joined
    socket.to(roomCode).emit('user-joined', { userId });
    
    // Get current room state
    try {
      const room = await Room.findOne({ roomCode, isActive: true });
      if (room && room.currentSong) {
        // Send current song to new user
        socket.emit('sync-playback', room.currentSong);
      }
    } catch (error) {
      console.error('Error getting room state:', error);
    }
  });
  
  // Leave a room
  socket.on('leave-room', (data) => {
    const { roomCode, userId } = data;
    
    if (!roomCode || !userId) return;
    
    console.log(`User ${userId} left room ${roomCode}`);
    
    // Remove socket from room
    socket.leave(roomCode);
    
    // Notify other members
    socket.to(roomCode).emit('user-left', { userId });
  });
  
  // Update song playback
  socket.on('update-playback', async (data) => {
    const { roomCode, songInfo, userId } = data;
    
    if (!roomCode || !songInfo || !userId) return;
    
    console.log(`Updating playback in room ${roomCode}:`, songInfo.title);
    
    // Update room with current song
    try {
      await Room.findOneAndUpdate(
        { roomCode, isActive: true, hostId: userId },
        { currentSong: songInfo },
        { new: true }
      );
      
      // Broadcast to all members except sender
      socket.to(roomCode).emit('sync-playback', songInfo);
      
    } catch (error) {
      console.error('Error updating playback:', error);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 5001; // Changed to 5001 to avoid conflicts
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
