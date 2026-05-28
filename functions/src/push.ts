/**
 * Expo push delivery helper.
 *
 * Wraps the Expo Push API (https://exp.host/--/api/v2/push/send) so Cloud
 * Functions can fan out notifications without pulling in the `expo-server-sdk`
 * dependency. Mirrors the client message shape in `src/utils/pushNotifications.ts`.
 *
 * Tickets returned by Expo are parsed for delivery errors. Tokens that come
 * back with a `DeviceNotRegistered` error are surfaced in `deadTokens` so the
 * caller can prune them from Firestore.
 */

import { logger } from 'firebase-functions';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const MAX_MESSAGES_PER_REQUEST = 100;

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoPushResponse {
  data?: ExpoPushTicket[];
  errors?: unknown;
}

export interface SendResult {
  sent: number;
  errors: number;
  deadTokens: string[];
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * POSTs the given messages to Expo in chunks of <=100. Returns aggregate
 * counts plus the list of tokens Expo reported as `DeviceNotRegistered`.
 */
export async function sendExpoPushMessages(
  messages: ExpoPushMessage[]
): Promise<SendResult> {
  const result: SendResult = { sent: 0, errors: 0, deadTokens: [] };
  if (messages.length === 0) return result;

  for (const batch of chunk(messages, MAX_MESSAGES_PER_REQUEST)) {
    let res: Response;
    try {
      res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(batch),
      });
    } catch (err) {
      logger.error('push.send.network_error', {
        message: err instanceof Error ? err.message : String(err),
        batchSize: batch.length,
      });
      result.errors += batch.length;
      continue;
    }

    if (!res.ok) {
      logger.error('push.send.http_error', {
        status: res.status,
        batchSize: batch.length,
      });
      result.errors += batch.length;
      continue;
    }

    const payload = (await res.json()) as ExpoPushResponse;
    const tickets = payload.data ?? [];

    tickets.forEach((ticket, i) => {
      if (ticket.status === 'ok') {
        result.sent += 1;
        return;
      }
      result.errors += 1;
      if (ticket.details?.error === 'DeviceNotRegistered') {
        const token = batch[i]?.to;
        if (token) result.deadTokens.push(token);
      }
    });
  }

  return result;
}
