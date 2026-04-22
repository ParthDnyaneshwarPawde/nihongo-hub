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
          userNote: '', 
          isSecondAttempt: false 
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
      
      // BOUNCER: If the state doesn't exist yet, do nothing. 
      if (!state) return prev; 

      // Block clicks if completed OR waiting for a retry!
      if (state.status === 'completed' || state.status === 'attempt1_failed') return prev; 

      let newSelection = [];
      
      // 🚨 THE CRASH FIX: We force it to be an array even if the old draft loaded it as undefined
      const currentOptions = state.selectedOptions || [];
      
      if (isMulti) {
        newSelection = currentOptions.includes(optionId)
          ? currentOptions.filter(id => id !== optionId)
          : [...currentOptions, optionId];
      } else {
        newSelection = [optionId];
      }

      return { ...prev, [qId]: { ...state, selectedOptions: newSelection } };
    });
  };

  const clearSelection = (qId) => {
    setQuestionStates(prev => {
      const state = prev[qId];
      // BOUNCER: Guard against null/undefined state
      if (!state || state.status === 'completed') return prev; 
      
      return { 
        ...prev, 
        [qId]: { 
          ...state, 
          status: 'idle', 
          selectedOptions: [] 
        } 
      };
    });
  };

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