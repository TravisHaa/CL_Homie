import {
  collection,
  doc,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  WithFieldValue,
  DocumentData,
} from 'firebase/firestore';
import { db } from './config';
import {
  User,
  House,
  Chore,
  CalendarEvent,
  PantryItem,
  ShoppingItem,
  ExpirationPrediction,
} from '../types';

// Generic converter factory — strips the `id` field on write, injects it on read
function makeConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: WithFieldValue<T>): DocumentData {
      const { id, ...rest } = data as T;
      return rest;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
      return { id: snapshot.id, ...snapshot.data(options) } as T;
    },
  };
}

export const userConverter = makeConverter<User>();
export const houseConverter = makeConverter<House>();
export const choreConverter = makeConverter<Chore>();
export const calendarEventConverter = makeConverter<CalendarEvent>();
export const pantryItemConverter = makeConverter<PantryItem>();
export const shoppingItemConverter = makeConverter<ShoppingItem>();
export const predictionConverter = makeConverter<ExpirationPrediction>();

// Collection refs
export const usersCol = () =>
  collection(db, 'users').withConverter(userConverter);

export const housesCol = () =>
  collection(db, 'houses').withConverter(houseConverter);

export const choresCol = (houseId: string) =>
  collection(db, 'houses', houseId, 'chores').withConverter(choreConverter);

export const eventsCol = (houseId: string) =>
  collection(db, 'houses', houseId, 'events').withConverter(calendarEventConverter);

export const pantryCol = (houseId: string) =>
  collection(db, 'houses', houseId, 'pantryItems').withConverter(pantryItemConverter);

export const shoppingCol = (houseId: string) =>
  collection(db, 'houses', houseId, 'shoppingItems').withConverter(shoppingItemConverter);

export const predictionsCol = () =>
  collection(db, 'predictions').withConverter(predictionConverter);

// Doc refs
export const userDoc = (userId: string) =>
  doc(db, 'users', userId).withConverter(userConverter);

export const houseDoc = (houseId: string) =>
  doc(db, 'houses', houseId).withConverter(houseConverter);
