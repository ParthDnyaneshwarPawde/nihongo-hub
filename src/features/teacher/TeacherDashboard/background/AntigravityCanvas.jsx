import React from 'react';

// Future 3D R3F Canvas logic goes here.
// Currently serves as an empty wrapper satisfying the Antigravity z-index 0 constraint.

export default function AntigravityCanvas({ isDarkMode }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Three.js Canvas will be mounted here */}
    </div>
  );
}
