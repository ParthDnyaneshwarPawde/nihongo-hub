import { useState, useEffect, useRef, useCallback } from 'react';

export function useExamTelemetry(currentQuestionId) {
  const [telemetry, setTelemetry] = useState(getInitialTelemetry());
  
  const questionStartTime = useRef(Date.now());
  const hoverStartTimes = useRef({});

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

  // Reset entirely on new question
  useEffect(() => {
    setTelemetry(getInitialTelemetry());
    questionStartTime.current = Date.now();
    hoverStartTimes.current = {};
  }, [currentQuestionId]);

  // Proctoring listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) setTelemetry(prev => ({ ...prev, tabSwitchedCount: prev.tabSwitchedCount + 1 }));
    };
    const handleBlur = () => {
      setTelemetry(prev => ({ ...prev, focusLostCount: prev.focusLostCount + 1 }));
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

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

  // 🚨 Extracts current data for the attempt payload and resets counters for Attempt 2
  const extractAndResetForNextAttempt = useCallback(() => {
    const currentData = { ...telemetry };
    setTelemetry(getInitialTelemetry());
    questionStartTime.current = Date.now();
    return currentData;
  }, [telemetry]);

  return {
    telemetry,
    recordOptionClick,
    handleMouseEnter,
    handleMouseLeave,
    extractAndResetForNextAttempt
  };
}