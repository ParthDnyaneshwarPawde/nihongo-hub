import { useState, useEffect, useRef, useCallback } from 'react';

export function useExamTelemetry(currentQuestionId, onViolation, isActive = false) {
  const [telemetry, setTelemetry] = useState(getInitialTelemetry());
  
  const questionStartTime = useRef(Date.now());
  const hoverStartTimes = useRef({});
  
  // 🚨 UPGRADE: Persistent global counters for the entire exam session
  const sessionViolations = useRef({ tabSwitches: 0, focusLosses: 0 });

  function getInitialTelemetry() {
    return {
      focusLostCount: 0,
      tabSwitchedCount: 0,
      hoverTime: {}, 
      optionSelectionTimeline: [], 
      firstResponseTime: null,
      lastResponseTime: null,
      changeCount: 0,
      changedAnswer: false,
      timePerOption: []
    };
  }

  useEffect(() => {
    setTelemetry(getInitialTelemetry());
    questionStartTime.current = Date.now();
    hoverStartTimes.current = {};
  }, [currentQuestionId]);

  // 🚨 UPGRADE: Only attach listeners and track violations if the exam is ACTIVE
  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Increment both the local question telemetry and the global session tracker
        sessionViolations.current.tabSwitches += 1;
        const currentTotal = sessionViolations.current.tabSwitches;

        setTelemetry(prev => ({ ...prev, tabSwitchedCount: prev.tabSwitchedCount + 1 }));
        
        // Pass the violation type and the exact global count to the Engine
        if (onViolation) {
          onViolation('tab_switch', currentTotal);
        }
      }
    };

    const handleBlur = () => {
      sessionViolations.current.focusLosses += 1;
      const currentTotal = sessionViolations.current.focusLosses;

      setTelemetry(prev => ({ ...prev, focusLostCount: prev.focusLostCount + 1 }));
      
      if (onViolation) {
        onViolation('focus_lost', currentTotal);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [onViolation, isActive]);

  const recordOptionClick = useCallback((optionId, optionLabel) => {
    const now = Date.now();
    const timestampSec = Number(((now - questionStartTime.current) / 1000).toFixed(1));

    setTelemetry(prev => {
      const isFirst = prev.firstResponseTime === null;
      const newTimeline = [...prev.optionSelectionTimeline, { optionId, option: optionLabel, timestampSec }];
      const timeSinceLastClick = isFirst ? timestampSec : Number((timestampSec - prev.lastResponseTime).toFixed(1));

      return {
        ...prev,
        firstResponseTime: isFirst ? timestampSec : prev.firstResponseTime,
        lastResponseTime: timestampSec,
        changeCount: isFirst ? 0 : prev.changeCount + 1,
        changedAnswer: !isFirst,
        optionSelectionTimeline: newTimeline,
        timePerOption: [...prev.timePerOption, timeSinceLastClick]
      };
    });
  }, []);

  const handleMouseEnter = useCallback((optionId) => {
    hoverStartTimes.current[optionId] = Date.now();
  }, []);

  const handleMouseLeave = useCallback((optionId) => {
    const start = hoverStartTimes.current[optionId];
    if (start) {
      const durationSec = Number(((Date.now() - start) / 1000).toFixed(2));
      setTelemetry(prev => ({
        ...prev,
        hoverTime: { ...prev.hoverTime, [optionId]: Number(((prev.hoverTime[optionId] || 0) + durationSec).toFixed(2)) }
      }));
      delete hoverStartTimes.current[optionId];
    }
  }, []);

  const extractAndResetForNextAttempt = useCallback(() => {
    const currentData = { ...telemetry };
    setTelemetry(getInitialTelemetry());
    questionStartTime.current = Date.now();
    return currentData;
  }, [telemetry]);

  return { telemetry, recordOptionClick, handleMouseEnter, handleMouseLeave, extractAndResetForNextAttempt };
}