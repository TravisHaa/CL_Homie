import { readFileSync } from 'fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-homie',
    firestore: {
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

// Seed cross-cutting docs with rules disabled so reads have something to deny.
async function seed() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'houses/h1'), { name: 'A', memberIds: ['uidA'], createdBy: 'uidA' });
    await setDoc(doc(db, 'houses/h2'), { name: 'B', memberIds: ['uidB'], createdBy: 'uidB' });
    await setDoc(doc(db, 'houses/h1/chores/c1'), {
      title: 'dishes',
      recurrence: 'once',
      isCompleted: false,
      weekKey: '2026-W22',
    });
    await setDoc(doc(db, 'users/uidA/private/google'), { refreshToken: 'secret' });
    await setDoc(doc(db, 'predictions/012345'), { estimatedDays: 7 });
  });
}

describe('OAuth refresh-token path users/{uid}/private/*', () => {
  it('denies the owner reading their own private doc', async () => {
    await seed();
    const a = testEnv.authenticatedContext('uidA').firestore();
    await assertFails(getDoc(doc(a, 'users/uidA/private/google')));
  });
  it('denies the owner writing their own private doc', async () => {
    const a = testEnv.authenticatedContext('uidA').firestore();
    await assertFails(setDoc(doc(a, 'users/uidA/private/google'), { refreshToken: 'x' }));
  });
  it('denies another user reading the private doc', async () => {
    await seed();
    const b = testEnv.authenticatedContext('uidB').firestore();
    await assertFails(getDoc(doc(b, 'users/uidA/private/google')));
  });
});

describe('predictions/{barcode}', () => {
  it('allows a signed-in user to read', async () => {
    await seed();
    const a = testEnv.authenticatedContext('uidA').firestore();
    await assertSucceeds(getDoc(doc(a, 'predictions/012345')));
  });
  it('denies a signed-in user writing (server-only)', async () => {
    const a = testEnv.authenticatedContext('uidA').firestore();
    await assertFails(setDoc(doc(a, 'predictions/012345'), { estimatedDays: 1 }));
  });
  it('denies an unauthenticated read', async () => {
    await seed();
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, 'predictions/012345')));
  });
});

describe('users/{uid}/devices/{deviceId}', () => {
  it('allows the owner to write and read their own device doc', async () => {
    const a = testEnv.authenticatedContext('uidA').firestore();
    await assertSucceeds(
      setDoc(doc(a, 'users/uidA/devices/dev1'), { expoPushToken: 't', notificationsEnabled: true })
    );
    await assertSucceeds(getDoc(doc(a, 'users/uidA/devices/dev1')));
  });
  it("denies another user reading or writing someone else's device doc", async () => {
    const b = testEnv.authenticatedContext('uidB').firestore();
    await assertFails(setDoc(doc(b, 'users/uidA/devices/dev1'), { expoPushToken: 'x' }));
    await assertFails(getDoc(doc(b, 'users/uidA/devices/dev1')));
  });
});

describe('cross-house data isolation', () => {
  it('allows a member to read their own house chore', async () => {
    await seed();
    const a = testEnv.authenticatedContext('uidA').firestore();
    await assertSucceeds(getDoc(doc(a, 'houses/h1/chores/c1')));
  });
  it('denies a non-member reading another house chore', async () => {
    await seed();
    const b = testEnv.authenticatedContext('uidB').firestore();
    await assertFails(getDoc(doc(b, 'houses/h1/chores/c1')));
  });
});

describe('chores composite query runs under rules', () => {
  it('allows the member query (recurrence == once && isCompleted == false)', async () => {
    await seed();
    const a = testEnv.authenticatedContext('uidA').firestore();
    const q = query(
      collection(a, 'houses/h1/chores'),
      where('recurrence', '==', 'once'),
      where('isCompleted', '==', false)
    );
    await assertSucceeds(getDocs(q));
  });
});
