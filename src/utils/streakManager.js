import { db, auth } from '@services/firebase'; 
import { doc, getDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';

export const processUserActivity = async (xpReward = 10) => {
  try {
    const user = auth.currentUser;
    if (!user) return { success: false, reason: "No user logged in" };

    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return { success: false, reason: "User doc not found" };

    const userData = userDoc.data();
    let newStreak = userData.streak || 0;
    let newFreezes = userData.streakFreezes || 0;
    
    // 🚨 1. Fetch their all-time record from Firebase
    let longestStreak = userData.longestStreak || 0; 
    
    let streakUpdated = false;

    const now = new Date();
    const lastActive = userData.lastActivityDate ? userData.lastActivityDate.toDate() : null;

    if (!lastActive) {
      // First time ever
      newStreak = 1;
      streakUpdated = true;
    } else {
      // Calendar Day Compare
      const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastActiveDate = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());
      
      const msInDay = 24 * 60 * 60 * 1000;
      const diffDays = Math.round((todayDate - lastActiveDate) / msInDay);

      if (diffDays === 1) {
        // Perfect! Came back the next day.
        newStreak += 1;
        streakUpdated = true;
      } else if (diffDays > 1) {
        // MISSED DAY(S) - CHECK FREEZES!
        const missedDays = diffDays - 1; 
        
        if (newFreezes >= missedDays) {
          // Used a freeze!
          newFreezes -= missedDays;
          newStreak += 1; 
          streakUpdated = true;
        } else {
          // Streak broke
          newStreak = 1;
          streakUpdated = true;
        }
      }
    }

    // 🚨 2. The Record Breaker Check
    // If they just extended their streak, check if it beats their all-time high!
    let isNewRecord = false;
    if (streakUpdated && newStreak > longestStreak) {
      longestStreak = newStreak;
      isNewRecord = true;
    }

    // Prepare the exact data to update in Firebase
    const updates = {
      lastActivityDate: serverTimestamp() // Always bump the clock!
    };
    
    if (xpReward > 0) {
      updates.xp = increment(xpReward);
    }
    
    if (streakUpdated) {
      updates.streak = newStreak;
      updates.streakFreezes = newFreezes;
      
      // 🚨 3. Save the new record to Firebase only if they broke it
      if (isNewRecord) {
        updates.longestStreak = longestStreak;
      }
    }

    // Save to Firebase
    await updateDoc(userRef, updates);

    return { 
      success: true, 
      newStreak, 
      newFreezes, 
      longestStreak, // Send the record back to the UI in case you want to show it!
      streakUpdated,
      isNewRecord    // Tells the UI if they just broke their record!
    };

  } catch (error) {
    console.error("Streak Engine Error:", error);
    return { success: false, error };
  }
};