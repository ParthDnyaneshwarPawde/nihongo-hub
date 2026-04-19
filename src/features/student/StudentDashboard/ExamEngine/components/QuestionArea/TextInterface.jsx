import React, { useState, useEffect } from 'react';

export default function TextInterface({ currentQ, currentState, settings, toggleOption, telemetry, isDarkMode, fontClasses }) {
  const [localValue, setLocalValue] = useState(currentState?.selectedOptions[0] || '');

  const textSizeClass = fontClasses || 'text-xl';
  const delayCorrectAnswer = settings?.delayCorrectAnswer ?? false;

  useEffect(() => {
    const globalValue = currentState?.selectedOptions?.[0] || '';
    if (globalValue !== localValue) {
      setLocalValue(globalValue);
    }
  }, [currentState?.selectedOptions]); 

  const handleChange = (e) => {
    const val = e.target.value;
    setLocalValue(val);
    toggleOption(val, false);
  };

  const handleBlur = () => {
    const trimmed = localValue.trim();
    if (trimmed !== '') telemetry.recordOptionClick('text_input', trimmed);
  };

  const status = currentState?.status;
  const isLocked = status === 'completed';
  const isFailedTry = status === 'attempt1_failed';
  
  // 🚨 THE FIX: Trust the Engine!
  // The ExamEngine already did the hard work of verifying the answer. 
  // We just read the boolean it passed down instead of recalculating it.
  const isCorrect = currentState?.isCorrect === true;

  let containerClass = isDarkMode ? 'bg-[#0B1121] border-slate-800' : 'bg-white border-slate-200';
  let inputColors = isDarkMode ? 'border-slate-700 text-white focus:border-indigo-500' : 'border-slate-300 text-slate-900 focus:border-indigo-500';
  let labelColor = 'text-slate-500';
  let labelText = 'Text Input Placeholder';

  if (isLocked) {
    if (isCorrect) {
      containerClass = isDarkMode ? 'bg-emerald-900/10 border-emerald-500/50' : 'bg-emerald-50 border-emerald-300';
      inputColors = isDarkMode ? 'border-emerald-500 text-emerald-400' : 'border-emerald-500 text-emerald-600';
      labelColor = isDarkMode ? 'text-emerald-500/80' : 'text-emerald-600/80';
      labelText = 'Correct Answer';
    } else {
      containerClass = isDarkMode ? 'bg-rose-900/10 border-rose-500/50' : 'bg-rose-50 border-rose-300';
      inputColors = isDarkMode ? 'border-rose-500 text-rose-400' : 'border-rose-500 text-rose-600';
      labelColor = isDarkMode ? 'text-rose-500/80' : 'text-rose-600/80';
      
      // 🚨 BETTER FALLBACK: Grab the correct answer from correctOptions OR options array
      const validAnswers = currentQ?.correctOptions || [];
      const fallbackAns = currentQ?.options?.find(o => o.isCorrect)?.text;
      const displayCorrect = validAnswers.length > 0 ? validAnswers[0] : fallbackAns;

      labelText = !delayCorrectAnswer && displayCorrect 
        ? `Incorrect Answer (Correct: ${displayCorrect})` 
        : 'Incorrect Answer';
    }
  } else if (isFailedTry) {
    containerClass = isDarkMode ? 'bg-rose-900/10 border-rose-500/50' : 'bg-rose-50 border-rose-300';
    inputColors = isDarkMode ? 'border-rose-500 text-rose-400 focus:border-rose-400' : 'border-rose-500 text-rose-600 focus:border-rose-600';
    labelColor = isDarkMode ? 'text-rose-500/80' : 'text-rose-600/80';
    labelText = 'Incorrect - Try Again';
  }

  return (
    <div 
      className={`p-6 rounded-2xl border-2 transition-colors duration-300 ${containerClass}`}
      onMouseEnter={() => telemetry.handleMouseEnter('text_input_area')}
      onMouseLeave={() => telemetry.handleMouseLeave('text_input_area')}
    >
      <label className={`text-[10px] font-black uppercase tracking-widest block mb-4 transition-colors ${labelColor}`}>
        {labelText}
      </label>
      
      <input 
        type="text" 
        value={localValue} 
        onChange={handleChange} 
        onBlur={handleBlur} 
        onKeyDown={(e) => e.key === 'Enter' && handleBlur()} 
        disabled={isLocked}
        placeholder="Type your answer here and press Enter..."
        className={`w-full bg-transparent border-b-2 outline-none py-2 font-bold transition-colors disabled:opacity-100 ${textSizeClass} ${inputColors}`}
      />
    </div>
  );
}