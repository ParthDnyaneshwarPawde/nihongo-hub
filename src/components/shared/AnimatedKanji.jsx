import React, { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';

export default function AnimatedKanji() {
  const { isDarkMode } = useTheme();
  // Phases: 'tracing' -> 'surge' -> 'settled'
  const [phase, setPhase] = useState('tracing');

  useEffect(() => {
    // 1. Digital laser trace finishes much faster (1.6 seconds)
    const flashTimer = setTimeout(() => setPhase('surge'), 1600);
    // 2. The white-out data surge holds for 400ms
    const settleTimer = setTimeout(() => setPhase('settled'), 2000); 
    
    return () => { 
      clearTimeout(flashTimer); 
      clearTimeout(settleTimer); 
    };
  }, []);

  return (
    <div 
      className={`fixed right-[-5%] top-[-5%] w-[600px] h-[600px] lg:w-[900px] lg:h-[900px] pointer-events-none z-0 flex items-center justify-center transition-all ease-out
        ${phase === 'tracing' ? 'opacity-100 duration-0' : ''}
        ${phase === 'surge' ? 'opacity-100 scale-[1.25] duration-100' : ''}
        ${phase === 'settled' ? `scale-100 duration-1000 ${isDarkMode ? 'opacity-[0.02]' : 'opacity-[0.03]'}` : ''}
      `}
    >
      <svg 
        viewBox="0 0 100 100" 
        className={`w-full h-full transition-all duration-200
          ${phase === 'tracing' ? 'fill-transparent stroke-indigo-500 digital-neon' : ''}
          ${phase === 'surge' ? 'fill-white stroke-white system-flash' : ''}
          ${phase === 'settled' ? `stroke-transparent ${isDarkMode ? 'fill-white' : 'fill-slate-900'}` : ''}
        `}
        style={{ 
          strokeWidth: phase === 'tracing' ? '2' : phase === 'surge' ? '4' : '0',
          strokeLinecap: 'square', // Sharp, digital edges instead of round brushes
          strokeLinejoin: 'miter'  // Sharp corners
        }}
      >
        {/* Geometric, Sharp Paths for 生 (Live) - Digital Font Style */}
        <g className={phase === 'tracing' ? 'animate-draw' : ''}>
           {/* Stroke 1: Sharp diagonal cut */}
           <path d="M 45 15 L 20 45" pathLength="100" className="stroke-path" style={{animationDelay: '0s'}} />
           {/* Stroke 2: Absolute flat top horizontal */}
           <path d="M 20 38 L 85 38" pathLength="100" className="stroke-path" style={{animationDelay: '0.25s'}} />
           {/* Stroke 3: Absolute vertical pillar */}
           <path d="M 52 15 L 52 90" pathLength="100" className="stroke-path" style={{animationDelay: '0.5s'}} />
           {/* Stroke 4: Middle flat horizontal */}
           <path d="M 35 62 L 68 62" pathLength="100" className="stroke-path" style={{animationDelay: '0.75s'}} />
           {/* Stroke 5: Bottom absolute flat base */}
           <path d="M 15 86 L 90 86" pathLength="100" className="stroke-path" style={{animationDelay: '1.0s'}} />
        </g>
      </svg>

      {/* ⚡ The Engine: Custom Keyframes for Digital Laser and Surge */}
      <style dangerouslySetInnerHTML={{__html: `
        /* 1. The Laser Trace Animation (Linear, mechanical speed) */
        .stroke-path {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: drawLaser 0.3s linear forwards;
        }
        @keyframes drawLaser {
          to { stroke-dashoffset: 0; }
        }

        /* 2. Holographic/Neon Flicker */
        .digital-neon {
          filter: drop-shadow(0 0 5px rgba(99, 102, 241, 0.5)) drop-shadow(0 0 15px rgba(99, 102, 241, 0.8));
          animation: dataGlitch 0.05s steps(2, start) infinite alternate;
        }
        @keyframes dataGlitch {
          from { opacity: 0.8; filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.5)); }
          to { opacity: 1; filter: drop-shadow(0 0 20px rgba(99, 102, 241, 1)); }
        }

        /* 3. The System Surge (Lightning) */
        .system-flash {
          filter: drop-shadow(0 0 40px white) drop-shadow(0 0 80px rgba(255,255,255,0.8)) brightness(200%);
        }
      `}} />
    </div>
  );
}