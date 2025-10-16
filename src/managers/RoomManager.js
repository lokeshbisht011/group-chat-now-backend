import { v4 as uuidv4 } from "uuid";

export class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.typingUsers = new Map();
  }

  createRoom(name) {
    const defaultSettings = {
      expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isSignInRequired: false,
      // You can add more settings here, like maxUsers: 50
    };

    const room = {
      id: uuidv4(),
      name,
      createdAt: new Date(),
      users: new Map(),
      messages: [],
      code: this.generateRoomCode(),
      settings: defaultSettings,
    };

    this.rooms.set(room.id, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  getRoomByCode(code) {
    for (const room of this.rooms.values()) {
      if (room.code === code) {
        return room;
      }
    }
    return undefined;
  }

  joinRoom(roomId, userId, username) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false };

    const user = {
      id: userId,
      username,
      avatar: this.generateAvatar(username),
      joinedAt: new Date(),
    };

    room.users.set(userId, user);
    return { success: true, user, room };
  }

  leaveRoom(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.users.delete(userId);
    this.stopTyping(roomId, userId);

    // If room is empty, schedule for deletion after a delay
    // if (room.users.size === 0) {
    //   setTimeout(() => {
    //     if (this.rooms.has(roomId) && this.rooms.get(roomId)!.users.size === 0) {
    //       this.rooms.delete(roomId);
    //       this.typingUsers.delete(roomId);
    //       console.log(`🗑️ Removed empty room: ${roomId}`);
    //     }
    //   }, 30000); // 30 seconds delay
    return true;
  }

  getRoomUsers(roomId) {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.users.values()) : [];
  }

  startTyping(roomId, userId, username) {
    if (!this.typingUsers.has(roomId)) {
      this.typingUsers.set(roomId, new Map());
    }

    const roomTyping = this.typingUsers.get(roomId);
    roomTyping.set(userId, {
      id: userId,
      username,
      timestamp: new Date(),
    });

    // Auto-stop typing after 3 seconds
    setTimeout(() => {
      this.stopTyping(roomId, userId);
    }, 3000);
  }

  stopTyping(roomId, userId) {
    const roomTyping = this.typingUsers.get(roomId);
    if (!roomTyping) return false;
    return roomTyping.delete(userId);
  }

  getTypingUsers(roomId) {
    const roomTyping = this.typingUsers.get(roomId);
    return roomTyping ? Array.from(roomTyping.values()) : [];
  }

  generateRoomCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  generateAvatar(username) {
    const colors = [
      "#ef4444",
      "#f97316",
      "#f59e0b",
      "#eab308",
      "#84cc16",
      "#22c55e",
      "#10b981",
      "#14b8a6",
      "#06b6d4",
      "#0ea5e9",
      "#3b82f6",
      "#6366f1",
      "#8b5cf6",
      "#a855f7",
      "#d946ef",
      "#ec4899",
    ];

    const initials = username
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    const colorIndex = username
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const color = colors[colorIndex % colors.length];

    return { color, initials };
  }

  getAllRooms() {
    return Array.from(this.rooms.values());
  }

  getRoomCount() {
    return this.rooms.size;
  }
}
