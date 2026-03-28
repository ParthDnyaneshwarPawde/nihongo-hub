import { db } from '@services/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

export const batchService = {
  // Logic for creating or updating a batch
  async saveBatch(batchData, id = null) {
    const data = { ...batchData, updatedAt: serverTimestamp() };
    return id 
      ? await updateDoc(doc(db, 'batches', id), data)
      : await addDoc(collection(db, 'batches'), { ...data, createdAt: serverTimestamp() });
  }

  
};