import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { roomRoutes } from './routes/rooms.js';
import { socketHandler } from './sockets/socketHandler.js';
import { MessageManager } from './managers/MessageManager.js';
import { RoomManager } from './managers/RoomManager.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Initialize managers
const messageManager = new MessageManager();
const roomManager = new RoomManager();

// Middleware
app.use(cors({
  origin: "*",
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/rooms', roomRoutes(roomManager));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket handling
socketHandler(io, messageManager, roomManager);

// Start message cleanup interval
messageManager.startCleanupInterval();

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready`);
  console.log(`🌍 CORS origin: ${process.env.CORS_ORIGIN}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  messageManager.stopCleanupInterval();
  server.close(() => {
    console.log('Server closed');
  });
});