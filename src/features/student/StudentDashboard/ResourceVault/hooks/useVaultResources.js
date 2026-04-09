import { useState, useEffect } from 'react';
import { vaultService } from '../services/vaultService';

export function useVaultResources({ selectedCourseTitle, enrolledCourseTitles }) {
  const [activeBatch, setActiveBatch] = useState(null);
  const [loading, setLoading] = useState(true);

  const isEnrolled = enrolledCourseTitles?.includes(selectedCourseTitle);

  useEffect(() => {
    if (!selectedCourseTitle || !isEnrolled) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = vaultService.subscribeToCourseBatch(
      selectedCourseTitle,
      (batchData) => {
        setActiveBatch(batchData);
        setLoading(false);
      },
      (error) => {
        console.error("Vault Access Error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedCourseTitle, isEnrolled]);

  return { activeBatch, loading, isEnrolled };
}
