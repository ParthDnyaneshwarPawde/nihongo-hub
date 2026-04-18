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
          attempts: [] 
        }
      };
    });
  }, []);

  const currentQ = questions[currentIndex];
  const currentState = currentQ ? questionStates[currentQ.id] : null;

  const toggleOption = (optionId, isMulti) => {
    if (!currentQ) return;
    const qId = currentQ.id;
    
    setQuestionStates(prev => {
      const state = prev[qId];
      if (state.status !== 'idle') return prev; // 🚨 Security check: Prevent changes if already attempted

      let newSelection = [];
      
      if (isMulti) {
        newSelection = state.selectedOptions.includes(optionId)
          ? state.selectedOptions.filter(id => id !== optionId)
          : [...state.selectedOptions, optionId];
      } else {
        // 🚨 REMOVED the "click to clear" logic for single choice. It now strictly selects.
        newSelection = [optionId];
      }

      return { ...prev, [qId]: { ...state, selectedOptions: newSelection } };
    });
  };

  // 🚨 NEW: Dedicated Clear Function
  const clearSelection = (qId) => {
    setQuestionStates(prev => {
      const state = prev[qId];
      if (state.status !== 'idle') return prev; // Cannot clear if already attempted
      return { ...prev, [qId]: { ...state, selectedOptions: [] } };
    });
  };

  const markHintViewed = (qId) => setQuestionStates(prev => ({ ...prev, [qId]: { ...prev[qId], hintViewed: true } }));
  const setStudentDifficulty = (qId, diff) => setQuestionStates(prev => ({ ...prev, [qId]: { ...prev[qId], studentDifficulty: diff } }));
  const skipQuestion = (qId) => setQuestionStates(prev => ({ ...prev, [qId]: { ...prev[qId], status: 'skipped', wasSkippedInitially: prev[qId].status === 'idle' ? true : prev[qId].wasSkippedInitially } }));

  return {
    currentIndex, setCurrentIndex,
    score, setScore,
    questionStates, setQuestionStates,
    initQuestionState, toggleOption, clearSelection, // 🚨 Exported new function
    markHintViewed, setStudentDifficulty, skipQuestion,
    currentQ, currentState
  };
}