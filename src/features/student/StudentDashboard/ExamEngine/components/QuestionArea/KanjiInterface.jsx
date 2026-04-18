import React, { useRef, useState, useEffect } from 'react';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import { Trash2, Loader2, CheckCircle2, RotateCcw, PenTool } from 'lucide-react';
import { verifyKanjiStrokeData } from '../../services/KanjiAuth';

export default function KanjiInterface({ currentQ, currentState, onCheck, toggleOption, isDarkMode, fontClasses }) {
  const canvasRef = useRef(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [localStatus, setLocalStatus] = useState('idle');
  
  // 🚨 THE GATEKEEPER: Track if the user has actually drawn something
  const [hasStrokes, setHasStrokes] = useState(false);

  // 🚨 UPGRADE: Fallback for text size if undefined
  const textSizeClass = fontClasses || 'text-2xl';

  // Sync with Exam Engine and handle question changes
  useEffect(() => {
    if (currentState?.status === 'completed') {
      setLocalStatus('success');
      setHasStrokes(true); 
    } else {
      setLocalStatus('idle');
      setHasStrokes(false);
      canvasRef.current?.clearCanvas();
    }
  }, [currentQ?.id, currentState?.status]);

  const strokeColor = isDarkMode ? "#818cf8" : "#4f46e5";
  const canvasBg = isDarkMode ? "#0F172A" : "#F8FAFC";

  const handleClear = () => {
    canvasRef.current?.clearCanvas();
    setHasStrokes(false); // Close the gate
    setLocalStatus('idle');
    toggleOption("", false);
  };

  const handleAnalyze = async () => {
    const correctAnswer = currentQ?.options?.[0]?.text;
    if (!hasStrokes || !canvasRef.current || !correctAnswer) return;

    setIsAnalyzing(true);
    try {
      const paths = await canvasRef.current.exportPaths();
      const isMatched = await verifyKanjiStrokeData(paths, correctAnswer);

      if (isMatched) {
        setLocalStatus('success');
        
        // 1. Update the selection state for the UI
        toggleOption(correctAnswer, true); 
        
        // 2. 🚨 Trigger the parent's check immediately with the correct value
        // This bypasses the second-attempt logic because isCorrect will be true!
        onCheck(correctAnswer); 
        
      } else {
        setLocalStatus('error');
        toggleOption("incorrect_draw", false);
        // Optional: onCheck("incorrect_draw"); // If you want auto-fail on wrong draw
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-8 p-6 lg:p-10 rounded-[2.5rem] border transition-all duration-500 ${isDarkMode ? 'bg-slate-900/40 border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'}`}>
      
      <div className="text-center space-y-1">
        <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          Handwriting Task
        </span>
        {/* 🚨 UPGRADE: Applied textSizeClass here */}
        <h3 className={`${textSizeClass} font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
          Draw <span className="text-indigo-500">"{currentQ?.prompt}"</span>
        </h3>
      </div>

      <div className="relative group">
        <div className={`w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] rounded-3xl overflow-hidden border-4 transition-all duration-300 ${
          localStatus === 'success' ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 
          localStatus === 'error' ? 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)]' : 
          'border-slate-200 dark:border-slate-800'
        }`}>
          <ReactSketchCanvas
            ref={canvasRef}
            strokeWidth={7}
            strokeColor={strokeColor}
            canvasColor={canvasBg}
            style={{ border: 'none' }}
            readOnly={localStatus === 'success' || isAnalyzing}
            
            // 🚨 THE FIX: Open the gate as soon as a stroke is detected
            onStroke={() => setHasStrokes(true)}
          />
        </div>

        {localStatus !== 'success' && (
          <button 
            onClick={handleClear}
            className={`absolute top-4 right-4 p-3 rounded-2xl shadow-xl transition-all active:scale-90 ${isDarkMode ? 'bg-slate-800/90 text-slate-400 hover:text-rose-400' : 'bg-white text-slate-400 hover:text-rose-500'}`}
          >
            <RotateCcw size={20} />
          </button>
        )}
      </div>

      <div className="w-full max-w-[360px] space-y-4">
        <button
          onClick={handleAnalyze}
          // 🚨 Lock button visually if no strokes exist
          disabled={isAnalyzing || localStatus === 'success' || !hasStrokes}
          className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-40 ${
            localStatus === 'success' 
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
              : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl shadow-indigo-600/30'
          }`}
        >
          {isAnalyzing ? (
            <><Loader2 className="animate-spin" size={18} /> Analyzing strokes...</>
          ) : localStatus === 'success' ? (
            <><CheckCircle2 size={18} /> Perfect Match</>
          ) : (
            <><PenTool size={18} /> Verify Handwriting</>
          )}
        </button>

        {localStatus === 'error' && (
          <p className="text-center text-xs font-bold text-rose-500 animate-pulse">
            {hasStrokes ? "Character not recognized. Try again!" : "Draw the character first!"}
          </p>
        )}
      </div>
    </div>
  );
}