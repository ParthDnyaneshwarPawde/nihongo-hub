import { useState, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@services/firebase';
import { useNavigate } from 'react-router-dom';

/**
 * useLogoutConfirm
 * Controls the Confirmation Shield visibility.
 * The actual signOut() only fires when the user confirms inside the shield.
 */
export function useLogoutConfirm({ onBeforeLogout } = {}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const navigate = useNavigate();

  const requestLogout = useCallback(() => {
    setIsConfirming(true);
  }, []);

  const cancelLogout = useCallback(() => {
    setIsConfirming(false);
  }, []);

  const confirmLogout = useCallback(async () => {
    try {
      if (onBeforeLogout) onBeforeLogout(); // e.g. clear local state
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsConfirming(false);
    }
  }, [navigate, onBeforeLogout]);

  return { isConfirming, requestLogout, cancelLogout, confirmLogout };
}
