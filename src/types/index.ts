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
  memberNames?: Record<string, string>; // denormalized userId -> displayName for quick reads
  createdBy: string; // userId
  createdAt: Timestamp;
  // Weekly chore rollover (owned by the scheduled Cloud Function at
  // functions/jobs/weeklyChoreReset.ts). Acts as a master switch: when false,
  // no chore auto-rotates regardless of its per-chore `autoRotate` flag.
  weeklyScrambleEnabled?: boolean;
  lastRolloverWeekKey?: string;    // last US week the rollover transaction succeeded
  lastRolloverDayKey?: string;     // last YYYY-MM-DD the rollover transaction ran (daily race guard)
  rotationOffset?: number;         // monotonic count of completed rollovers; also seeds new auto-rotate chores
  choreSchemaVersion?: number;     // bumped by one-shot migrations (see src/firebase/choreMigrations.ts)
}

// 'biweekly' is preserved in the type union for backwards-compat reads of
// un-migrated chores, but no new chore is created with it; the migration
// rewrites biweekly → custom { count: 2, unit: 'weeks' }.
export type ChoreRecurrence =
  | 'once'
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'custom';

export type CustomIntervalUnit = 'days' | 'weeks';

export interface CustomRecurrence {
  count: number;                 // every N units (>= 1)
  unit: CustomIntervalUnit;
  daysOfWeek?: number[];         // 0–6, multi-select; required when unit === 'weeks'
}

export interface Chore {
  id: string;
  title: string;
  assignedTo: string;            // userId; current holder (always set, even when auto-rotating)
  recurrence: ChoreRecurrence;
  autoRotate?: boolean;          // false for 'once' & 'daily'; user-chosen for weekly/monthly/custom
  dayOfWeek: number | null;      // 0–6, used for weekly only (legacy biweekly until migrated)
  dayOfMonth?: number | null;    // 1–31, used for monthly (clamped to last day of short months at runtime)
  customRecurrence?: CustomRecurrence | null; // used for 'custom'
  dueAt: Timestamp | null;       // used only when recurrence === 'once'
  isCompleted: boolean;
  completedAt: Timestamp | null;
  completedBy: string | null;    // userId
  weekKey: string;               // "YYYY-WNN" — US-week (Sun–Sat) identifier; primary listing key
  lastTriggeredKey?: string | null; // YYYY-MM-DD of last rollover; needed for daily + custom multi-day
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
  assignedTo: string[]; // userIds; empty array = no assignees
  deviceCalendarIds: Record<string, string>; // { [userId]: nativeCalendarEventId }
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

export type DevicePlatform = 'ios' | 'android' | 'web';

export interface DeviceToken {
  id: string;
  expoPushToken: string | null;
  platform: DevicePlatform;
  deviceId: string;
  notificationsEnabled: boolean;
  houseId: string | null;
  updatedAt: Timestamp;
  createdAt: Timestamp;
}

export interface ExpirationPrediction {
  id: string;
  estimatedDays: number;
  range: string;
  category: string;
  cachedAt: Timestamp;
}
