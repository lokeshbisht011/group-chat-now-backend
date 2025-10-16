import { Message, Reaction } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class MessageManager {
  private messages: Map<string, Message[]> = new Map();
  private cleanupInterval?: NodeJS.Timeout;
  private readonly EXPIRY_MINUTES = parseInt(process.env.MESSAGE_EXPIRY_MINUTES || '5');

  createMessage(
    roomId: string,
    userId: string,
    username: string,
    content: string,
    avatar: { color: string; initials: string },
    replyTo?: string
  ): Message {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.EXPIRY_MINUTES * 60 * 1000);

    const message: Message = {
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

    this.messages.get(roomId)!.push(message);
    return message;
  }

  addReaction(roomId: string, messageId: string, emoji: string, userId: string, username: string): boolean {
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

  getRoomMessages(roomId: string): Message[] {
    return this.messages.get(roomId) || [];
  }

  getMessageById(roomId: string, messageId: string): Message | undefined {
    const roomMessages = this.messages.get(roomId);
    return roomMessages?.find(m => m.id === messageId);
  }

  cleanupExpiredMessages(): number {
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

  startCleanupInterval(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      const cleaned = this.cleanupExpiredMessages();
      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} expired messages`);
      }
    }, 60 * 1000);
  }

  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  clearRoomMessages(roomId: string): void {
    this.messages.delete(roomId);
  }
}