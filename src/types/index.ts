export interface RoomSettings {
  expiryDate: Date;
  isSignInRequired: boolean;
  // Add more settings here
}

export interface User {
  id: string;
  username: string;
  avatar: {
    color: string;
    initials: string;
  };
  joinedAt: Date;
}

export interface Message {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  expiresAt: Date;
  reactions: Reaction[];
  replyTo?: string;
  avatar: {
    color: string;
    initials: string;
  };
}

export interface Reaction {
  emoji: string;
  users: Array<{
    id: string;
    username: string;
  }>;
  count: number;
}

export interface Room {
  id: string;
  name: string;
  createdAt: Date;
  users: Map<string, User>;
  messages: Message[];
  code: string;
  settings: RoomSettings; // ADDED SETTINGS TO ROOM
}

export interface TypingUser {
  id: string;
  username: string;
  timestamp: Date;
}

export interface SocketEvents {
  'join-room': (data: { roomId: string; username: string; userId: string }) => void;
  'leave-room': (data: { roomId: string }) => void;
  'message': (data: { roomId: string; content: string; replyTo?: string }) => void;
  'reaction': (data: { roomId: string; messageId: string; emoji: string }) => void;
  'typing-start': (data: { roomId: string }) => void;
  'typing-stop': (data: { roomId: string }) => void;
}
