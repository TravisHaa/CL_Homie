import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { houseDoc, userDoc } from './firestore';

export async function leaveHouse({ uid, houseId }: { uid: string; houseId: string }): Promise<void> {
  const batch = writeBatch(db);
  batch.update(houseDoc(houseId), {
    memberIds: arrayRemove(uid),
    [`memberNames.${uid}`]: deleteField(),
  });
  batch.update(userDoc(uid), { houseId: deleteField() });
  await batch.commit();
}

export async function setWeeklyScrambleEnabled(
  houseId: string,
  enabled: boolean
): Promise<void> {
  await updateDoc(houseDoc(houseId), { weeklyScrambleEnabled: enabled });
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
    batch.update(houseDoc(currentHouseId), {
      memberIds: arrayRemove(uid),
      [`memberNames.${uid}`]: deleteField(),
    });
  }
  batch.update(houseDoc(newHouseId), {
    memberIds: arrayUnion(uid),
    [`memberNames.${uid}`]: displayName,
  });
  batch.update(userDoc(uid), { houseId: newHouseId });
  await batch.commit();
  return newHouseId;
}
