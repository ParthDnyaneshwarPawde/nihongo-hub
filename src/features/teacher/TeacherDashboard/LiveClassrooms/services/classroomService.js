import { db } from '@services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { CLASSROOM_STATUS } from '../constants/classroomConstants';

export const endClassroomSession = async (classId) => {
  try {
    await updateDoc(doc(db, "classes", classId), {
      status: CLASSROOM_STATUS.ENDED,
      endedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error ending classroom session:", error);
    throw error;
  }
};
