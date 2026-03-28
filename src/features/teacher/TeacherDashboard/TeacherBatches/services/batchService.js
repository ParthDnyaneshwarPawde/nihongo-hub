import { 
  collection, addDoc, updateDoc, serverTimestamp, 
  deleteDoc, doc, arrayUnion, setDoc, runTransaction, arrayRemove
} from 'firebase/firestore';
import { db, auth } from '@services/firebase';

export const batchService = {
  // Fixed: Added try/catch and basic error handling
  saveBatch: async (editingBatchId, batchData) => {
    try {
      if (editingBatchId) {
        const batchRef = doc(db, 'batches', editingBatchId);
        await updateDoc(batchRef, batchData);
        return editingBatchId;
      } else {
        const docRef = await addDoc(collection(db, 'batches'), {
          ...batchData,
          stats: { pdfs: 0, audio: 0, mcqs: 0 },
          createdAt: serverTimestamp(),
        });
        return docRef.id;
      }
    } catch (error) {
      console.error("Error saving batch:", error);
      throw error; 
    }
  },

  sendCollabRequest: async (batchId, targetTeacher, leadName) => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const requestId = `${batchId}_${targetTeacher.uid}`;
    
    // We use setDoc which OVERWRITES the existing document.
    // By explicitly setting status to 'pending', we reset a 'rejected' invite.
    await setDoc(doc(db, "collabRequests", requestId), {
      batchId,
      batchTitle: "Course Collaboration", // Add title so they know what it is!
      targetId: targetTeacher.uid,
      targetName: targetTeacher.displayName,
      senderId: user.uid,
      senderName: leadName,
      status: 'pending', // 🚨 FORCE RESET TO PENDING
      timestamp: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error resending invite:", error);
    return { success: false };
  }
},

  acceptCollabRequest: async (requestId, batchId, teacherUid, teacherName) => {
    const requestRef = doc(db, 'collabRequests', requestId);
    const batchRef = doc(db, 'batches', batchId);

    // FIXED: Using runTransaction for atomicity
    try {
      await runTransaction(db, async (transaction) => {
        transaction.update(requestRef, { status: 'accepted' });
        transaction.update(batchRef, {
          teacherIds: arrayUnion(teacherUid),
          teacherNames: arrayUnion(teacherName)
        });
      });
      return { success: true };
    } catch (error) {
      console.error("Transaction failed: ", error);
      throw error;
    }
  },
  
  rejectCollabRequest: async (requestId) => {
    await updateDoc(doc(db, 'collabRequests', requestId), { status: 'rejected' });
  },

  // In batchService.js
removeCollaborator: async (batchId, teacherUid, teacherName) => {
  if (!batchId) return; // Prevent crash on new unsaved batches

  const batchRef = doc(db, 'batches', batchId);
  const inviteId = `${batchId}_${teacherUid}`;
  const inviteRef = doc(db, 'collabRequests', inviteId);

  try {
    // TRANSACTION: Ensure both happen or neither
    await runTransaction(db, async (transaction) => {
      transaction.update(batchRef, {
        teacherIds: arrayRemove(teacherUid),
        teacherNames: arrayRemove(teacherName)
      });
      transaction.delete(inviteRef); // 🚨 This is the "RESET" button
    });
  } catch (e) {
    console.error(e);
    throw e;
  }
},

  deleteBatch: async (batchId) => {
    await deleteDoc(doc(db, 'batches', batchId));
    // NOTE: You might also want to delete all associated collabRequests here 
    // to avoid "orphaned" data in your database.
  }
};