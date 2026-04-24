import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { BookOpen, Zap, FileText, Headphones } from 'lucide-react';
import CategoryCard from './components/CategoryCard';

export default function PracticeDojo({ batchId }) {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState(null);
  const [qbLocks, setQbLocks] = useState({ vocab: true, grammar: true, reading: true, listening: true });

  const categories = [
    { id: 'vocab', title: 'Vocabulary', subtitle: '3,200 Words', icon: <BookOpen size={32} />, color: 'from-violet-500 to-indigo-500', shadow: 'shadow-indigo-500/20', bg: 'bg-indigo-500/10', text: 'text-indigo-400', tag: 'TANGO' },
    { id: 'grammar', title: 'Grammar', subtitle: '140 Patterns', icon: <Zap size={32} />, color: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/20', bg: 'bg-blue-500/10', text: 'text-blue-400', tag: 'BUNPOU' },
    { id: 'reading', title: 'Reading', subtitle: 'Weekly Stories', icon: <FileText size={32} />, color: 'from-rose-500 to-pink-500', shadow: 'shadow-rose-500/20', bg: 'bg-rose-500/10', text: 'text-rose-400', tag: 'DOKKAI' },
    { id: 'listening', title: 'Listening', subtitle: 'Audio Drills', icon: <Headphones size={32} />, color: 'from-emerald-400 to-teal-500', shadow: 'shadow-emerald-500/20', bg: 'bg-emerald-500/10', text: 'text-emerald-400', tag: 'CHOUKAI' },
  ];

  const toggleQuestionBank = (catId) => {
    setQbLocks(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  return (
    <div className="w-full h-full space-y-8 animate-in fade-in duration-500">
      
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className={`text-3xl font-black tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Practice Dojo Engine</h2>
          <p className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Design gamified learning paths and manage drill resources.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {categories.map((cat) => (
          <CategoryCard 
            key={cat.id}
            cat={cat}
            isActive={activeCategory === cat.id}
            isDarkMode={isDarkMode}
            isQbLocked={qbLocks[cat.id]}
            onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
            onNavigateMap={() => navigate(`/batch/${batchId}/dojo/${cat.id}/map`)}
            onToggleQb={() => toggleQuestionBank(cat.id)}
          />
        ))}
      </div>
    </div>
  );
}