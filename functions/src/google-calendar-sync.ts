import * as admin from 'firebase-admin';
import { getApps, initializeApp } from 'firebase-admin/app';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';

// Idempotent Admin SDK init — see google-oauth.ts for rationale. Functions may
// load in isolation, so never rely on another module initializing the app.
if (getApps().length === 0) {
  initializeApp();
}

const GOOGLE_OAUTH_CLIENT_ID = defineSecret('GOOGLE_OAUTH_CLIENT_ID');
const GOOGLE_OAUTH_CLIENT_SECRET = defineSecret('GOOGLE_OAUTH_CLIENT_SECRET');

const CALENDAR_EVENTS_URL =
  'https://www.googleapis.com/calendar/v3/calendars/primary/events';

interface TokenRefreshResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

/**
 * Reads the stored refresh token from users/{uid}/private/google and exchanges
 * it for a fresh access token. Returns null (and logs) on any failure — a
 * revoked token is treated as a skip, not a hard error.
 */
async function refreshAccessToken(uid: string): Promise<string | null> {
  const db = admin.firestore();
  const snap = await db.doc(`users/${uid}/private/google`).get();
  const refreshToken = snap.exists
    ? (snap.data()?.refreshToken as string | undefined)
    : undefined;

  if (!refreshToken) {
    logger.info('No refresh token for user; skipping Google sync', { uid });
    return null;
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: GOOGLE_OAUTH_CLIENT_ID.value(),
      client_secret: GOOGLE_OAUTH_CLIENT_SECRET.value(),
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.warn('Google token refresh failed; skipping', {
        uid,
        status: res.status,
        errText,
      });
      return null;
    }

    const tokens = (await res.json()) as TokenRefreshResponse;
    return tokens.access_token ?? null;
  } catch (err) {
    logger.warn('Google token refresh threw; skipping', { uid, err });
    return null;
  }
}

interface GoogleEventBody {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

function buildEventBody(data: admin.firestore.DocumentData): GoogleEventBody {
  const tz = 'UTC';
  const start = (data.startTime as admin.firestore.Timestamp).toDate();
  const end = (data.endTime as admin.firestore.Timestamp).toDate();
  return {
    summary: (data.title as string) ?? '',
    description: (data.description as string) ?? '',
    start: { dateTime: start.toISOString(), timeZone: tz },
    end: { dateTime: end.toISOString(), timeZone: tz },
  };
}

/** Creates a Google Calendar event on the user's primary calendar; returns its id. */
async function createGoogleEvent(
  accessToken: string,
  body: GoogleEventBody
): Promise<string | null> {
  try {
    const res = await fetch(CALENDAR_EVENTS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      logger.warn('Google event create failed', { status: res.status, errText });
      return null;
    }
    const json = (await res.json()) as { id?: string };
    return json.id ?? null;
  } catch (err) {
    logger.warn('Google event create threw', { err });
    return null;
  }
}

/** Updates an existing Google Calendar event by id. */
async function updateGoogleEvent(
  accessToken: string,
  gid: string,
  body: GoogleEventBody
): Promise<void> {
  try {
    const res = await fetch(`${CALENDAR_EVENTS_URL}/${gid}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      const errText = await res.text();
      logger.warn('Google event update failed', { gid, status: res.status, errText });
    }
  } catch (err) {
    logger.warn('Google event update threw', { gid, err });
  }
}

/** Deletes a Google Calendar event by id; 404/410 are treated as success. */
async function deleteGoogleEvent(accessToken: string, gid: string): Promise<void> {
  try {
    const res = await fetch(`${CALENDAR_EVENTS_URL}/${gid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      const errText = await res.text();
      logger.warn('Google event delete failed', { gid, status: res.status, errText });
    }
  } catch (err) {
    logger.warn('Google event delete threw', { gid, err });
  }
}

async function isUserLinked(uid: string): Promise<boolean> {
  const db = admin.firestore();
  const snap = await db.doc(`users/${uid}`).get();
  return snap.exists && snap.data()?.googleCalendarLinked === true;
}

/**
 * Returns true when `before` and `after` differ ONLY in the googleEventId map.
 * Used as a loop-guard: this handler writes googleEventId back, which would
 * otherwise re-trigger the function indefinitely.
 */
function onlyGoogleEventIdChanged(
  before: admin.firestore.DocumentData,
  after: admin.firestore.DocumentData
): boolean {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (key === 'googleEventId') continue;
    if (!deepEqual(before[key], after[key])) return false;
  }
  return true;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a instanceof admin.firestore.Timestamp && b instanceof admin.firestore.Timestamp) {
    return a.isEqual(b);
  }
  // Fall back to JSON comparison for arrays/objects (assignedTo, maps, etc.).
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/**
 * Exports Homie calendar events to each linked assignee's Google primary
 * calendar. The per-assignee Google event id is stored back at
 * googleEventId.{uid} so subsequent edits update (rather than duplicate).
 */
export const syncEventToGoogleCalendar = onDocumentWritten(
  {
    document: 'houses/{houseId}/events/{eventId}',
    secrets: [GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET],
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    // CRITICAL loop-guard: our own googleEventId write-back re-triggers this
    // handler. If that is the only thing that changed, do nothing.
    if (before && after && onlyGoogleEventIdChanged(before, after)) {
      return;
    }

    const db = admin.firestore();
    const houseId = event.params.houseId as string;
    const eventId = event.params.eventId as string;
    const eventRef = db.doc(`houses/${houseId}/events/${eventId}`);

    // DELETION: no `after` document — remove from every linked assignee that
    // had a Google event id.
    if (!after) {
      if (!before) return;
      const beforeIds = (before.googleEventId as Record<string, string>) ?? {};
      for (const [uid, gid] of Object.entries(beforeIds)) {
        if (!gid) continue;
        const accessToken = await refreshAccessToken(uid);
        if (!accessToken) continue;
        await deleteGoogleEvent(accessToken, gid);
      }
      return;
    }

    // CREATE / UPDATE.
    const beforeAssigned: string[] = (before?.assignedTo as string[]) ?? [];
    const afterAssigned: string[] = (after.assignedTo as string[]) ?? [];
    const beforeIds = (before?.googleEventId as Record<string, string>) ?? {};
    const afterIds = (after.googleEventId as Record<string, string>) ?? {};
    const body = buildEventBody(after);

    const uids = new Set<string>([...beforeAssigned, ...afterAssigned]);

    for (const uid of uids) {
      const linked = await isUserLinked(uid);
      if (!linked) continue;

      const accessToken = await refreshAccessToken(uid);
      if (!accessToken) continue;

      const stillAssigned = afterAssigned.includes(uid);
      const wasAssigned = beforeAssigned.includes(uid);

      if (stillAssigned) {
        const existingGid = afterIds[uid];
        if (existingGid) {
          await updateGoogleEvent(accessToken, existingGid, body);
        } else {
          const newGid = await createGoogleEvent(accessToken, body);
          if (newGid) {
            await eventRef.set(
              { googleEventId: { [uid]: newGid } },
              { merge: true }
            );
          }
        }
      } else if (wasAssigned && beforeIds[uid]) {
        // Unassigned: delete the Google event and clear the stored id.
        await deleteGoogleEvent(accessToken, beforeIds[uid]);
        await eventRef.update({
          [`googleEventId.${uid}`]: admin.firestore.FieldValue.delete(),
        });
      }
    }
  }
);
