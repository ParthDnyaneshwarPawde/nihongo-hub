import React, { useState, useEffect } from 'react';

export default function TextInterface({ currentQ, currentState, toggleOption, telemetry, isDarkMode, fontClasses }) {
  // 1. Local state allows smooth typing without spamming the main Engine
  const [localValue, setLocalValue] = useState(currentState?.selectedOptions[0] || '');

  // 2. Keep local state in sync if the user clicks "Clear Response"
  useEffect(() => {
    setLocalValue(currentState?.selectedOptions[0] || '');
  }, [currentState?.selectedOptions]);

  // 3. The "Commit" function (Logs to telemetry only when finished typing)
  const commitAnswer = () => {
    const trimmed = localValue.trim();
    
    // Only log if the answer actually changed
    if (trimmed !== currentState?.selectedOptions[0]) {
      toggleOption(trimmed, false);
      
      if (trimmed !== '') {
        // Log it to the timeline. Option ID is 'text_input', Label is what they typed.
        telemetry.recordOptionClick('text_input', trimmed);
      }
    }
  };

  return (
    <div 
      className={`p-6 rounded-2xl border-2 ${isDarkMode ? 'bg-[#0B1121] border-slate-800' : 'bg-white border-slate-200'}`}
      // Track hover time over the input area
      onMouseEnter={() => telemetry.handleMouseEnter('text_input_area')}
      onMouseLeave={() => telemetry.handleMouseLeave('text_input_area')}
    >
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-4">
        Text Input / Canvas Placeholder
      </label>
      
      <input 
        type="text" 
        value={localValue} 
        onChange={(e) => setLocalValue(e.target.value)} 
        onBlur={commitAnswer} // Commits when they click outside the box
        onKeyDown={(e) => e.key === 'Enter' && commitAnswer()} // Commits when they press Enter
        placeholder="Type your answer here and press Enter..."
        className={`w-full bg-transparent border-b-2 outline-none py-2 font-bold ${fontClasses} ${isDarkMode ? 'border-slate-700 text-white focus:border-indigo-500' : 'border-slate-300 text-slate-900 focus:border-indigo-500'}`}
      />
    </div>
  );
}