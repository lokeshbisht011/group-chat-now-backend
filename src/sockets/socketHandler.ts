import { Server, Socket } from 'socket.io';
import { RoomManager } from '../managers/RoomManager';
import { v4 as uuidv4 } from 'uuid';
import { MessageManager } from '../managers/MessageManager';

export function socketHandler(
  io: Server,
  messageManager: MessageManager,
  roomManager: RoomManager
) {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    
    let currentRoomId: string | null = null;
    let currentUserId: string | null = null;

    // Join room
    socket.on('join-room', async (data) => {
      try {
        // --- START EDIT ---
        // Expecting userId from client (stored in localStorage)
        const { roomId, username, userId } = data;
        
        if (!roomId || !username || !userId) {
          socket.emit('error', { message: 'Room ID, username, and user ID are required' });
          return;
        }

        // Use the persistent userId provided by the client
        const persistentUserId: string = userId; 
        
        // Leave current room if any (using the persistent ID)
        if (currentRoomId && currentUserId) {
          socket.leave(currentRoomId);
          roomManager.leaveRoom(currentRoomId, currentUserId);
          socket.to(currentRoomId).emit('user-left', {
            userId: currentUserId,
            users: roomManager.getRoomUsers(currentRoomId)
          });
        }

        // Set the current ID to the persistent ID sent by the client
        currentUserId = persistentUserId;

        // Join new room
        const result = roomManager.joinRoom(roomId, currentUserId, username);
        
        if (!result.success) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        currentRoomId = roomId;
        socket.join(roomId);

        // Send room data to user
        const messages = messageManager.getRoomMessages(roomId);
        socket.emit('room-joined', {
          roomId,
          userId: currentUserId,
          user: result.user,
          room: {
            id: result.room!.id,
            name: result.room!.name,
            code: result.room!.code
          },
          messages,
          users: roomManager.getRoomUsers(roomId)
        });

        // Notify others
        socket.to(roomId).emit('user-joined', {
          user: result.user,
          users: roomManager.getRoomUsers(roomId)
        });

        console.log(`👤 ${username} joined room ${roomId} (Persistent ID: ${currentUserId})`);
        // --- END EDIT ---
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Leave room
    socket.on('leave-room', () => {
      if (currentRoomId && currentUserId) {
        socket.leave(currentRoomId);
        roomManager.leaveRoom(currentRoomId, currentUserId);
        
        socket.to(currentRoomId).emit('user-left', {
          userId: currentUserId,
          users: roomManager.getRoomUsers(currentRoomId)
        });

        console.log(`👤 User ${currentUserId} left room ${currentRoomId}`);
        currentRoomId = null;
      }
    });

    // Send message
    socket.on('message', (data) => {
      try {
        const { roomId, content, replyTo } = data;
        console.log(roomId)
        console.log(content)
        console.log(currentUserId)
        if (!roomId || !content || !currentUserId) {
          socket.emit('error', { message: 'Invalid message data' });
          return;
        }

        if (content.trim().length === 0) {
          socket.emit('error', { message: 'Message cannot be empty' });
          return;
        }

        if (content.length > 1000) {
          socket.emit('error', { message: 'Message too long' });
          return;
        }

        const room = roomManager.getRoom(roomId);
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const user = room.users.get(currentUserId);
        if (!user) {
          socket.emit('error', { message: 'User not in room' });
          return;
        }

        // Stop typing indicator
        roomManager.stopTyping(roomId, currentUserId);

        const message = messageManager.createMessage(
          roomId,
          currentUserId,
          user.username,
          content.trim(),
          user.avatar,
          replyTo
        );

        // Broadcast message to all users in room
        io.to(roomId).emit('message', message);

        console.log(`💬 Message sent in room ${roomId} by ${user.username}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Add/remove reaction
    socket.on('reaction', (data) => {
      try {
        const { roomId, messageId, emoji } = data;
        
        if (!roomId || !messageId || !emoji || !currentUserId) {
          socket.emit('error', { message: 'Invalid reaction data' });
          return;
        }

        const room = roomManager.getRoom(roomId);
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const user = room.users.get(currentUserId);
        if (!user) {
          socket.emit('error', { message: 'User not in room' });
          return;
        }

        const success = messageManager.addReaction(
          roomId,
          messageId,
          emoji,
          currentUserId,
          user.username
        );

        if (success) {
          const message = messageManager.getMessageById(roomId, messageId);
          io.to(roomId).emit('reaction-updated', {
            messageId,
            reactions: message?.reactions || []
          });
        }
      } catch (error) {
        console.error('Error handling reaction:', error);
        socket.emit('error', { message: 'Failed to add reaction' });
      }
    });

    socket.on('typing-start', (data) => {
      const { roomId } = data;
      
      if (!roomId || !currentUserId) return;

      const room = roomManager.getRoom(roomId);
      if (!room) return;

      const user = room.users.get(currentUserId);
      if (!user) return;

      roomManager.startTyping(roomId, currentUserId, user.username);
      
      socket.to(roomId).emit('typing-start', {
        userId: currentUserId,
        username: user.username
      });
    });

    socket.on('typing-stop', (data) => {
      const { roomId } = data;
      
      if (!roomId || !currentUserId) return;

      const stopped = roomManager.stopTyping(roomId, currentUserId);
      
      if (stopped) {
        socket.to(roomId).emit('typing-stop', {
          userId: currentUserId
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      
      if (currentRoomId && currentUserId) {
        roomManager.leaveRoom(currentRoomId, currentUserId);
        
        socket.to(currentRoomId).emit('user-left', {
          userId: currentUserId,
          users: roomManager.getRoomUsers(currentRoomId)
        });
      }
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  console.log('🔗 Socket handlers registered');
}
