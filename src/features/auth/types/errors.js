export const AuthErrors = {
  'auth/wrong-password': 'The password you entered is incorrect.',
  'auth/user-not-found': 'No account exists with this email address.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/email-already-in-use': 'An account already exists with this email address.',
  'auth/weak-password': 'Password must be at least 6 characters long.',
  'auth/too-many-requests': 'Too many failed login attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
  'default': 'An unexpected authentication error occurred. Please try again.'
};

export const getAuthErrorMessage = (error) => {
  return AuthErrors[error.code] || AuthErrors['default'];
};
