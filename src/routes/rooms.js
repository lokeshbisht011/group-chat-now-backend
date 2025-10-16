import { Router } from 'express';

export function roomRoutes(roomManager) {
  const router = Router();

  router.post('/', (req, res) => {
    try {
      const { name } = req.body;
      
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Room name is required' });
      }

      if (name.length > 50) {
        return res.status(400).json({ error: 'Room name must be 50 characters or less' });
      }

      const room = roomManager.createRoom(name.trim());
      
      res.status(201).json({
        id: room.id,
        name: room.name,
        code: room.code,
        createdAt: room.createdAt,
        userCount: 0
      });
    } catch (error) {
      console.error('Error creating room:', error);
      res.status(500).json({ error: 'Failed to create room' });
    }
  });

  router.get('/:roomId', (req, res) => {
    try {
      const { roomId } = req.params;
      const room = roomManager.getRoom(roomId);
      
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      res.json({
        id: room.id,
        name: room.name,
        code: room.code,
        createdAt: room.createdAt,
        userCount: room.users.size
      });
    } catch (error) {
      console.error('Error getting room:', error);
      res.status(500).json({ error: 'Failed to get room information' });
    }
  });

  router.post('/join-by-code', (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Room code is required' });
      }

      const room = roomManager.getRoomByCode(code.toUpperCase());
      
      if (!room) {
        return res.status(404).json({ error: 'Room not found with this code' });
      }

      res.json({
        id: room.id,
        name: room.name,
        code: room.code,
        createdAt: room.createdAt,
        userCount: room.users.size
      });
    } catch (error) {
      console.error('Error joining room by code:', error);
      res.status(500).json({ error: 'Failed to join room' });
    }
  });

  router.get('/', (req, res) => {
    try {
      const rooms = roomManager.getAllRooms().map(room => ({
        id: room.id,
        name: room.name,
        code: room.code,
        createdAt: room.createdAt,
        userCount: room.users.size
      }));

      res.json({ rooms, totalCount: rooms.length });
    } catch (error) {
      console.error('Error getting rooms:', error);
      res.status(500).json({ error: 'Failed to get rooms' });
    }
  });

  return router;
}