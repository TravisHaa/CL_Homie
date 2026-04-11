import { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  houseId: string | null;
  color: string; // hex color for calendar
  createdAt: Timestamp;
}

export interface House {
  id: string;
  name: string;
  inviteCode: string; // 6-char join code
  memberIds: string[];
  createdBy: string; // userId
  createdAt: Timestamp;
}

export type ChoreRecurrence = 'weekly' | 'biweekly' | 'monthly' | 'once';

export interface Chore {
  id: string;
  title: string;
  assignedTo: string; // userId
  recurrence: ChoreRecurrence;
  dayOfWeek: number | null; // 0–6, used for weekly/biweekly
  isCompleted: boolean;
  completedAt: Timestamp | null;
  completedBy: string | null; // userId
  weekKey: string; // e.g. "2026-W15"
  createdBy: string;
  createdAt: Timestamp;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: Timestamp;
  endTime: Timestamp;
  createdBy: string; // userId
  color: string; // denormalized from user.color at write time
  googleEventId: string | null;
  createdAt: Timestamp;
}

export type ExpirationConfidence = 'scanned' | 'predicted' | 'manual';

export interface PantryItem {
  id: string;
  name: string;
  barcode: string | null;
  quantity: number;
  unit: string;
  expirationDate: Timestamp | null;
  expirationConfidence: ExpirationConfidence;
  isShared: boolean;
  ownedBy: string; // userId
  category: string;
  imageUrl: string | null;
  addedBy: string; // userId
  createdAt: Timestamp;
}

export interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  isChecked: boolean;
  addedBy: string; // userId
  checkedBy: string | null;
  checkedAt: Timestamp | null;
  createdAt: Timestamp;
}

export interface ExpirationPrediction {
  estimatedDays: number;
  range: string;
  category: string;
  cachedAt: Timestamp;
}
