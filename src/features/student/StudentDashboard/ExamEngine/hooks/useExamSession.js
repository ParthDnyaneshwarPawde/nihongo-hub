import { useState, useCallback } from 'react';

export function useExamSession(questions) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionStates, setQuestionStates] = useState({});

  const initQuestionState = useCallback((qId) => {
    setQuestionStates(prev => {
      if (prev[qId]) return prev; 
      return {
        ...prev,
        [qId]: {
          status: 'idle', 
          selectedOptions: [],
          hintViewed: false,
          studentDifficulty: null, 
          wasSkippedInitially: false,
          revisited: false,
          attempts: [],
          userNote: '', // 🚨 THE FIX: Initialize the note string so React tracks it immediately
          isSecondAttempt: false // 🚨 NEW: Initialize the attempt tracker cleanly
        }
      };
    });
  }, []);

  const currentQ = questions[currentIndex];

  // 🚨 YOUR REQUESTED FORMAT
  const currentState = currentQ ? questionStates[currentQ.id] : null;

  const toggleOption = (optionId, isMulti) => {
    if (!currentQ) return;
    const qId = currentQ.id;
    
    setQuestionStates(prev => {
      const state = prev[qId];
      
      // 🚨 BOUNCER: If the state doesn't exist yet, do nothing. 
      // This prevents "Cannot read properties of undefined"
      if (!state) return prev; 

      // 🚨 THE FIX: Block clicks if completed OR waiting for a retry!
      if (state.status === 'completed' || state.status === 'attempt1_failed') return prev; 

      let newSelection = [];
      
      if (isMulti) {
        newSelection = state.selectedOptions.includes(optionId)
          ? state.selectedOptions.filter(id => id !== optionId)
          : [...state.selectedOptions, optionId];
      } else {
        newSelection = [optionId];
      }

      return { ...prev, [qId]: { ...state, selectedOptions: newSelection } };
    });
  };

  const clearSelection = (qId) => {
    setQuestionStates(prev => {
      const state = prev[qId];
      // 🚨 BOUNCER: Guard against null/undefined state
      if (!state || state.status === 'completed') return prev; 
      
      // 🚨 THE FIX: Reset the interactive properties, but spread the ...state 
      // first so the userNote and hintViewed status are perfectly preserved!
      return { 
        ...prev, 
        [qId]: { 
          ...state, 
          status: 'idle', // Resets so they can try again
          selectedOptions: [] // Clears the UI selection
        } 
      };
    });
  };

  // 🚨 BOUNCER: Using Optional Chaining and Fallbacks for safe updates
  const markHintViewed = (qId) => setQuestionStates(prev => {
    if (!prev[qId]) return prev;
    return { ...prev, [qId]: { ...prev[qId], hintViewed: true } };
  });

  const setStudentDifficulty = (qId, diff) => setQuestionStates(prev => {
    if (!prev[qId]) return prev;
    return { ...prev, [qId]: { ...prev[qId], studentDifficulty: diff } };
  });

  const skipQuestion = (qId) => setQuestionStates(prev => {
    const state = prev[qId];
    if (!state) return prev;
    return { 
      ...prev, 
      [qId]: { 
        ...state, 
        status: 'skipped', 
        wasSkippedInitially: state.status === 'idle' ? true : state.wasSkippedInitially 
      } 
    };
  });

  return {
    currentIndex, setCurrentIndex,
    score, setScore,
    questionStates, setQuestionStates,
    initQuestionState, toggleOption, clearSelection, 
    markHintViewed, setStudentDifficulty, skipQuestion,
    currentQ, currentState
  };
}