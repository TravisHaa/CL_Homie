import {
    arrayRemove,
    arrayUnion,
    collection,
    deleteField,
    getDoc,
    getDocs,
    query,
    updateDoc,
    where,
    writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { choresCol, houseDoc, userDoc } from './firestore';

/**
 * Reassign any chores in `houseId` currently pinned to `uid` to the first of
 * `remainingMemberIds`, batched onto `batch`. Without this, a chore pinned to
 * (auto-rotate off) a departed member keeps pointing at a uid that's no
 * longer in `memberMap` until its next cadence advance — which for a
 * monthly/long-custom chore could be weeks away.
 */
async function reassignDepartingMemberChores(
  batch: ReturnType<typeof writeBatch>,
  houseId: string,
  uid: string,
  remainingMemberIds: string[]
): Promise<void> {
  const staleChores = await getDocs(query(choresCol(houseId), where('assignedTo', '==', uid)));
  const fallbackAssignee = remainingMemberIds[0] ?? '';
  staleChores.forEach((choreDoc) => {
    batch.update(choreDoc.ref, { assignedTo: fallbackAssignee });
  });
}

export async function leaveHouse({ uid, houseId }: { uid: string; houseId: string }): Promise<void> {
  const houseSnap = await getDoc(houseDoc(houseId));
  const currentMemberIds = houseSnap.data()?.memberIds ?? [];
  const remainingMemberIds = currentMemberIds.filter((id) => id !== uid);

  const batch = writeBatch(db);

  if (remainingMemberIds.length === 0) {
    // Last member leaving: firestore.rules forbids deleting a house doc
    // outright (`allow delete: if false`), and client-side subcollection
    // deletion is unbounded, so we can't fully clean up here. Instead,
    // invalidate the invite code so the still-live one can't be used to
    // rejoin and inherit this house's stale chores/pantry/shopping/calendar
    // data — the doc is left orphaned (empty memberIds) for a server-side
    // GC job, matching the "explicitly mark it archived" mitigation.
    batch.update(houseDoc(houseId), {
      memberIds: arrayRemove(uid),
      inviteCode: '',
      [`memberNames.${uid}`]: deleteField(),
    });
  } else {
    batch.update(houseDoc(houseId), {
      memberIds: arrayRemove(uid),
      [`memberNames.${uid}`]: deleteField(),
    });
    await reassignDepartingMemberChores(batch, houseId, uid, remainingMemberIds);
  }

  batch.update(userDoc(uid), { houseId: deleteField() });
  await batch.commit();
}

export async function setWeeklyScrambleEnabled(
  houseId: string,
  enabled: boolean
): Promise<void> {
  await updateDoc(houseDoc(houseId), { weeklyScrambleEnabled: enabled });
}

export async function setMemberOrder(
  houseId: string,
  memberIds: string[],
  currentMemberIds: string[]
): Promise<void> {
  // Defensive: refuse to write if the candidate order doesn't match the
  // current member set exactly. Reordering must never add or remove members;
  // those flows live in join/leaveHouse.
  if (memberIds.length !== currentMemberIds.length) {
    throw new Error('Member set changed; refresh and try again.');
  }
  const a = new Set(memberIds);
  for (const id of currentMemberIds) {
    if (!a.has(id)) {
      throw new Error('Member set changed; refresh and try again.');
    }
  }
  await updateDoc(houseDoc(houseId), { memberIds });
}

export async function joinHouseByInviteCode({
  uid,
  displayName,
  inviteCode,
  currentHouseId,
}: {
  uid: string;
  displayName: string;
  inviteCode: string;
  currentHouseId?: string | null;
}): Promise<string> {
  const q = query(
    collection(db, 'houses'),
    where('inviteCode', '==', inviteCode.toUpperCase())
  );
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('No house found with that invite code.');

  const newHouseId = snap.docs[0].id;
  if (newHouseId === currentHouseId) throw new Error('You are already in this house.');

  const batch = writeBatch(db);
  if (currentHouseId) {
    const oldHouseSnap = await getDoc(houseDoc(currentHouseId));
    const oldRemainingMemberIds = (oldHouseSnap.data()?.memberIds ?? []).filter((id) => id !== uid);
    if (oldRemainingMemberIds.length === 0) {
      // Same last-member handling as leaveHouse: invalidate the invite code
      // rather than deleting the doc (forbidden by firestore.rules).
      batch.update(houseDoc(currentHouseId), {
        memberIds: arrayRemove(uid),
        inviteCode: '',
        [`memberNames.${uid}`]: deleteField(),
      });
    } else {
      batch.update(houseDoc(currentHouseId), {
        memberIds: arrayRemove(uid),
        [`memberNames.${uid}`]: deleteField(),
      });
      await reassignDepartingMemberChores(batch, currentHouseId, uid, oldRemainingMemberIds);
    }
  }
  batch.update(houseDoc(newHouseId), {
    memberIds: arrayUnion(uid),
    [`memberNames.${uid}`]: displayName,
  });
  batch.update(userDoc(uid), { houseId: newHouseId });
  await batch.commit();
  return newHouseId;
}
