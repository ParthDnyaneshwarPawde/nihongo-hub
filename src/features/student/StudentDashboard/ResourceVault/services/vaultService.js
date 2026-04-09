import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@services/firebase';

export const vaultService = {
  subscribeToCourseBatch: (courseTitle, callback, onError) => {
    if (!courseTitle) return () => {};

    const q = query(
      collection(db, 'batches'),
      where('title', '==', courseTitle),
      limit(1)
    );

    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        callback({ id: doc.id, ...doc.data() });
      } else {
        callback(null);
      }
    }, onError);
  }
};
