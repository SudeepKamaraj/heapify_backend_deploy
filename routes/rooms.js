const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Create a new room
router.post('/create', auth, async (req, res) => {
  try {
    // Check if user is already in a room
    const existingRoom = await Room.findOne({ 
      $or: [
        { hostId: req.user.id },
        { members: req.user.id }
      ],
      isActive: true
    });

    if (existingRoom) {
      return res.status(400).json({ 
        msg: 'You are already in an active room',
        roomCode: existingRoom.roomCode
      });
    }

    // Generate a unique room code
    let roomCode;
    let isUnique = false;
    
    while (!isUnique) {
      roomCode = Room.generateRoomCode();
      const existingRoomWithCode = await Room.findOne({ roomCode });
      if (!existingRoomWithCode) {
        isUnique = true;
      }
    }

    // Create room
    const room = new Room({
      roomCode,
      hostId: req.user.id,
      members: [req.user.id],
      currentSong: null
    });

    await room.save();

    res.status(201).json({ 
      room: {
        roomCode: room.roomCode,
        hostId: room.hostId,
        members: room.members,
        currentSong: room.currentSong,
        isActive: room.isActive
      },
      isHost: true
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Join a room
router.post('/join', auth, async (req, res) => {
  try {
    const { roomCode } = req.body;
    
    if (!roomCode) {
      return res.status(400).json({ msg: 'Room code is required' });
    }

    // Check if user is already in a room
    const userInRoom = await Room.findOne({ 
      $or: [
        { hostId: req.user.id },
        { members: req.user.id }
      ],
      isActive: true
    });

    if (userInRoom && userInRoom.roomCode !== roomCode) {
      return res.status(400).json({ 
        msg: 'You are already in another active room',
        roomCode: userInRoom.roomCode
      });
    }

    // Find the room
    const room = await Room.findOne({ roomCode, isActive: true });
    
    if (!room) {
      return res.status(404).json({ msg: 'Room not found or inactive' });
    }

    // Check if user is already in this room
    const isAlreadyMember = room.members.includes(req.user.id);
    
    // If not already a member, add them to the room
    if (!isAlreadyMember) {
      room.members.push(req.user.id);
      await room.save();
    }

    // Return room info
    res.json({
      room: {
        roomCode: room.roomCode,
        hostId: room.hostId,
        members: room.members,
        currentSong: room.currentSong,
        isActive: room.isActive
      },
      isHost: room.hostId.toString() === req.user.id
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Leave room
router.post('/leave', auth, async (req, res) => {
  try {
    const { roomCode } = req.body;
    
    if (!roomCode) {
      return res.status(400).json({ msg: 'Room code is required' });
    }
    
    // Find the room
    const room = await Room.findOne({ roomCode });
    
    if (!room) {
      return res.status(404).json({ msg: 'Room not found' });
    }
    
    // Check if user is the host
    if (room.hostId.toString() === req.user.id) {
      // Host is leaving, end the room for everyone
      room.isActive = false;
      await room.save();
      
      return res.json({ msg: 'Room closed successfully' });
    } else {
      // Regular member is leaving
      room.members = room.members.filter(
        member => member.toString() !== req.user.id
      );
      await room.save();
      
      return res.json({ msg: 'Left room successfully' });
    }
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get room info
router.get('/info/:roomCode', auth, async (req, res) => {
  try {
    const room = await Room.findOne({ 
      roomCode: req.params.roomCode,
      isActive: true
    }).populate('hostId', 'username').populate('members', 'username');
    
    if (!room) {
      return res.status(404).json({ msg: 'Room not found or inactive' });
    }
    
    // Check if user is member of the room
    const isMember = room.members.some(
      member => member._id.toString() === req.user.id
    );
    
    if (!isMember) {
      return res.status(403).json({ msg: 'Not authorized to access this room' });
    }
    
    res.json({
      room,
      isHost: room.hostId._id.toString() === req.user.id
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get user's active room
router.get('/user/active', auth, async (req, res) => {
  try {
    const room = await Room.findOne({ 
      members: req.user.id,
      isActive: true
    });
    
    if (!room) {
      return res.json({ inRoom: false });
    }
    
    res.json({
      inRoom: true,
      room: {
        roomCode: room.roomCode,
        hostId: room.hostId,
        isHost: room.hostId.toString() === req.user.id,
        currentSong: room.currentSong
      }
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
