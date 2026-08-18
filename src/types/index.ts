import { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  houseId: string | null;
  color: string; // hex color for calendar
  googleCalendarLinked?: boolean; // set by exchangeGoogleAuthCode after server-side token storage
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
  // Chore auto-rotation (owned by the scheduled Cloud Function at
  // functions/jobs/dailyChoreReset.ts). Acts as a master switch: when false,
  // no chore auto-rotates regardless of its per-chore `autoRotate` flag.
  weeklyScrambleEnabled?: boolean;
  lastRolloverWeekKey?: string;    // last US week the rollover transaction succeeded
  lastRolloverDayKey?: string;     // last YYYY-MM-DD the rollover transaction ran (daily race guard)
  rotationOffset?: number;         // monotonic count of completed rollovers; also seeds new auto-rotate chores
  choreSchemaVersion?: number;     // bumped by one-shot migrations (see src/firebase/choreMigrations.ts)
  pictureCardUrl?: string;
  pictureCardUpdatedAt?: Timestamp | null;
}

export type ChoreRecurrence =
  | 'once'
  | 'daily'
  | 'weekly'
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
  dayOfWeek: number | null;      // 0–6, used for weekly only
  dayOfMonth?: number | null;    // 1–31, used for monthly (clamped to last day of short months at runtime)
  customRecurrence?: CustomRecurrence | null; // used for 'custom'
  dueAt: Timestamp | null;       // used only when recurrence === 'once'
  isCompleted: boolean;
  completedAt: Timestamp | null;
  completedBy: string | null;    // userId
  weekKey: string;               // "YYYY-WNN" — ISO week identifier; primary listing key
  lastTriggeredKey?: string | null; // YYYY-MM-DD of last rollover; needed for daily + custom multi-day
  // YYYY-MM-DD captured at creation in device-local time. Stable, timezone-
  // independent anchor for cadence modulus on biweekly / custom (weeks or
  // days) chores; replaces `createdAt.toDate()` reads which produced different
  // ISO weeks on the Cloud Function (UTC) vs the device. Backfilled by
  // migration v4 for pre-existing chores.
  recurrenceAnchorKey?: string | null;
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
  // Idempotency guard for the expirationReminders Cloud Function: the
  // YYYY-MM-DD day-key (PT) on which an expiry push was last sent for this
  // item. Re-running on the same day skips already-notified items.
  notifiedExpiryFor?: string | null;
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

// ---------------------------------------------------------------------------
// Push notification data payloads.
//
// Shared contract between the server-side sender (functions/) and the client
// deep-link router (src/hooks/useNotificationResponse.ts). The `data` field of
// an Expo push message carries one of these shapes; `type` is the discriminant.
// ---------------------------------------------------------------------------

export interface PantryExpiryPushData {
  type: 'pantry_expiry';
  houseId: string;
  itemId: string;
  itemName?: string;
  daysUntilExpiry?: number;
}

export type NotificationData = PantryExpiryPushData;
