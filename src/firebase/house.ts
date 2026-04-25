import { arrayRemove, deleteField, writeBatch } from 'firebase/firestore';
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
