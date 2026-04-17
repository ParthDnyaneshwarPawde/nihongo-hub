import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

function FloatingKanji({ 
  kanji, 
  x, 
  y, 
  size, 
  duration, 
  delay, 
  opacityLight = 0.04, 
  opacityDark = 0.03 
}) {
  const { isDarkMode } = useTheme();
  return (
    <motion.div
      initial={{ x: x - 50, y: y + 50, opacity: 0 }}
      animate={{ 
        x: [x - 50, x, x - 20, x - 50], 
        y: [y + 50, y, y - 30, y + 50],
        opacity: isDarkMode ? opacityDark : opacityLight
      }}
      transition={{ 
        duration: duration, 
        repeat: Infinity, 
        repeatType: 'mirror', 
        ease: "linear",
        delay: delay
      }}
      className={`absolute ${size} font-black select-none pointer-events-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
    >
      {kanji}
    </motion.div>
  );
}

export default function StudentZenCanvas() {
  // Layer 0 - The Zen Background
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <FloatingKanji 
        kanji="勉強" 
        x={window.innerWidth * 0.7} 
        y={window.innerHeight * 0.1} 
        size="text-[400px] lg:text-[600px]" 
        duration={25}
        delay={0}
      />
      <FloatingKanji 
        kanji="進捗" 
        x={window.innerWidth * 0.1} 
        y={window.innerHeight * 0.5} 
        size="text-[300px] lg:text-[400px]" 
        duration={30}
        delay={2}
      />
      <FloatingKanji 
        kanji="授業" 
        x={window.innerWidth * 0.4} 
        y={window.innerHeight * 0.8} 
        size="text-[250px] lg:text-[350px]" 
        duration={35}
        delay={5}
        opacityLight={0.02}
        opacityDark={0.015}
      />
    </div>
  );
}
