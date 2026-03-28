import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getDoc, doc, where, or } from 'firebase/firestore';
import { db, auth } from '@services/firebase';

export function useTeacherBatches() {
  const [myBatches, setMyBatches] = useState([]);
  const [otherBatches, setOtherBatches] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [pendingSentInvites, setPendingSentInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRealName, setMyRealName] = useState("Sensei");

  useEffect(() => {
    // Top-level variable to store all unsubscribes for cleanup
    let unsubs = [];

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLoading(false);
        // Clean up any existing listeners if user logs out
        unsubs.forEach(unsub => unsub());
        return;
      }

      // 1. Fetch User Real Name
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          setMyRealName(`${data.firstName || ''} ${data.lastName || ''}`.trim() || "Sensei");
        }
      } catch (err) { console.error("Name fetch error", err); }

      // 2. Listen for MY BATCHES (Secure & Fast)
      const myBatchesQ = query(
        collection(db, 'batches'),
        where('teacherIds', 'array-contains', user.uid)
      );
      const unsubMy = onSnapshot(myBatchesQ, (snap) => {
        setMyBatches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }, (err) => console.error("❌ Permission Denied: My Batches", err));
      unsubs.push(unsubMy);

      // 3. Listen for OTHER BATCHES (Registry)
      // Note: You might want to limit this query so you don't download the whole DB
      const otherBatchesQ = query(collection(db, 'batches')); 
      const unsubOther = onSnapshot(otherBatchesQ, (snap) => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Filter out my batches for the "Registry" view
        setOtherBatches(all.filter(b => !b.teacherIds?.includes(user.uid)));
      }, (err) => console.error("❌ Permission Denied: Other Batches (Registry)", err));
      unsubs.push(unsubOther);

      // 4. Listen for INCOMING Invites (Corrected Field Name)
      const incomingQ = query(
        collection(db, 'collabRequests'),
        where('targetId', '==', user.uid), // Changed from targetTeacherUid
        where('status', '==', 'pending')
      );
      const unsubIn = onSnapshot(incomingQ, (snap) => {
        setPendingInvites(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.error("❌ Permission Denied: Incoming Invites", err));
      unsubs.push(unsubIn);

      // 5. Listen for SENT Invites
      const sentQ = query(
        collection(db, 'collabRequests'),
        where('senderId', '==', user.uid),
        where('status', '==', 'pending')
      );
      const unsubOut = onSnapshot(sentQ, (snap) => {
        setPendingSentInvites(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      unsubs.push(unsubOut);
    });

    // Final Cleanup: Unsubscribe from EVERYTHING on unmount
    return () => {
      unsubscribeAuth();
      unsubs.forEach(unsub => unsub());
    };
  }, []);

  return { myBatches, otherBatches, pendingInvites, loading, myRealName, pendingSentInvites };
}