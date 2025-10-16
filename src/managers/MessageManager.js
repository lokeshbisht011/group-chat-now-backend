import { v4 as uuidv4 } from 'uuid';

export class MessageManager {
  constructor() {
    this.messages = new Map();
    this.cleanupInterval = undefined;
    this.EXPIRY_MINUTES = parseInt(process.env.MESSAGE_EXPIRY_MINUTES || '5');
  }

  createMessage(roomId, userId, username, content, avatar, replyTo) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.EXPIRY_MINUTES * 60 * 1000);

    const message = {
      id: uuidv4(),
      roomId,
      userId,
      username,
      content,
      timestamp: now,
      expiresAt,
      reactions: [],
      replyTo,
      avatar
    };

    if (!this.messages.has(roomId)) {
      this.messages.set(roomId, []);
    }

    this.messages.get(roomId).push(message);
    return message;
  }

  addReaction(roomId, messageId, emoji, userId, username) {
    const roomMessages = this.messages.get(roomId);
    if (!roomMessages) return false;

    const message = roomMessages.find(m => m.id === messageId);
    if (!message) return false;

    let reaction = message.reactions.find(r => r.emoji === emoji);
    if (!reaction) {
      reaction = { emoji, users: [], count: 0 };
      message.reactions.push(reaction);
    }

    const existingUser = reaction.users.find(u => u.id === userId);
    if (existingUser) {
      // Remove reaction
      reaction.users = reaction.users.filter(u => u.id !== userId);
      reaction.count = reaction.users.length;

      if (reaction.count === 0) {
        message.reactions = message.reactions.filter(r => r.emoji !== emoji);
      }
    } else {
      // Add reaction
      reaction.users.push({ id: userId, username });
      reaction.count = reaction.users.length;
    }

    return true;
  }

  getRoomMessages(roomId) {
    return this.messages.get(roomId) || [];
  }

  getMessageById(roomId, messageId) {
    const roomMessages = this.messages.get(roomId);
    return roomMessages?.find(m => m.id === messageId);
  }

  cleanupExpiredMessages() {
    const now = new Date();
    let totalCleaned = 0;

    for (const [roomId, messages] of this.messages.entries()) {
      const initialCount = messages.length;
      const validMessages = messages.filter(m => m.expiresAt > now);

      this.messages.set(roomId, validMessages);
      totalCleaned += initialCount - validMessages.length;
    }

    return totalCleaned;
  }

  startCleanupInterval() {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      const cleaned = this.cleanupExpiredMessages();
      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} expired messages`);
      }
    }, 60 * 1000);
  }

  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  clearRoomMessages(roomId) {
    this.messages.delete(roomId);
  }
}
