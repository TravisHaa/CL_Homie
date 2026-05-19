import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

const HOMIE_CALENDAR_NAME = 'Homie';

let cachedCalendarId: string | null | undefined = undefined;

export async function getOrCreateHomieCalendar(): Promise<string | null> {
  if (Platform.OS === 'web') {
    cachedCalendarId = null;
    return null;
  }

  if (cachedCalendarId !== undefined) return cachedCalendarId;

  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    cachedCalendarId = null;
    return null;
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = calendars.find(
    (c) => c.title === HOMIE_CALENDAR_NAME && c.allowsModifications
  );

  if (existing) {
    cachedCalendarId = existing.id;
    return existing.id;
  }

  // On iOS, use the default calendar source; on Android use the local source
  const defaultSource =
    Platform.OS === 'ios'
      ? await getDefaultIOSSource(calendars)
      : { isLocalAccount: true, name: 'Homie', type: Calendar.SourceType.LOCAL };

  try {
    const newId = await Calendar.createCalendarAsync({
      title: HOMIE_CALENDAR_NAME,
      color: '#6C5CE7',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: Platform.OS === 'ios' ? (defaultSource as Calendar.Source).id : undefined,
      source: Platform.OS === 'android' ? (defaultSource as Calendar.Source) : undefined,
      name: HOMIE_CALENDAR_NAME,
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
    cachedCalendarId = newId;
    return newId;
  } catch {
    // Account doesn't allow creating calendars (e.g. Google CalDAV, Exchange).
    // Fall back to the first writable calendar on the device.
    const fallback = calendars.find((c) => c.allowsModifications);
    cachedCalendarId = fallback?.id ?? null;
    return cachedCalendarId;
  }
}

async function getDefaultIOSSource(
  calendars: Calendar.Calendar[]
): Promise<Calendar.Source> {
  const sources = await Calendar.getSourcesAsync();
  // Prefer iCloud, then the first writeable source
  const icloud = sources.find((s) => s.type === Calendar.SourceType.CALDAV);
  if (icloud) return icloud;
  const local = sources.find((s) => s.type === Calendar.SourceType.LOCAL);
  if (local) return local;
  return sources[0];
}

export async function addEventToDeviceCalendar(params: {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  calendarId: string;
}): Promise<string | null> {
  try {
    const eventId = await Calendar.createEventAsync(params.calendarId, {
      title: params.title,
      notes: params.description,
      startDate: params.startDate,
      endDate: params.endDate,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    return eventId;
  } catch {
    return null;
  }
}

export async function removeEventFromDeviceCalendar(eventId: string): Promise<void> {
  try {
    await Calendar.deleteEventAsync(eventId);
  } catch {
    // ignore — event may have already been deleted by the user
  }
}
