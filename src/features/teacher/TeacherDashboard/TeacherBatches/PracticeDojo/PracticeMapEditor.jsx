import React, { useState } from 'react';
import { ArrowLeft, Star, Gift, Plus, Settings, Lock, Unlock, FileQuestion } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { motion } from 'framer-motion';

const generateId = () => Math.random().toString(36).substr(2, 9);
const pathOffsets = [0, 30, 50, 30, 0, -30, -50, -30];

export default function PracticeMapEditor() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { categoryId } = useParams();

  const [mapData, setMapData] = useState([
    {
      id: 'mod_1', title: 'Unit 1: The Foundations', description: 'Master the basic principles and core concepts.', color: 'indigo',
      chapters: [
        {
          id: 'chap_1', title: 'Chapter 1: Greetings',
          nodes: [
            { id: 'n1', type: 'lesson', title: 'Level 1', isLocked: false },
            { id: 'n2', type: 'lesson', title: 'Level 2', isLocked: true },
            { id: 'n3', type: 'chest', title: 'Reward Box', isLocked: true },
          ]
        }
      ]
    }
  ]);

  const themeColors = {
    indigo: { bg: 'bg-indigo-500', border: 'border-indigo-700', text: 'text-indigo-500' },
    emerald: { bg: 'bg-emerald-500', border: 'border-emerald-700', text: 'text-emerald-500' },
    rose: { bg: 'bg-rose-500', border: 'border-rose-700', text: 'text-rose-500' },
    amber: { bg: 'bg-amber-400', border: 'border-amber-600', text: 'text-amber-500' },
    locked: { bg: 'bg-slate-300', border: 'border-slate-400', darkBg: 'bg-slate-700', darkBorder: 'border-slate-800' }
  };

  const addModule = () => setMapData([...mapData, { id: generateId(), title: `Unit ${mapData.length + 1}: New Unit`, description: 'Description here...', color: ['indigo', 'emerald', 'rose', 'amber'][mapData.length % 4], chapters: [] }]);
  const addChapter = (modId) => setMapData(mapData.map(m => m.id === modId ? { ...m, chapters: [...m.chapters, { id: generateId(), title: 'New Chapter', nodes: [] }] } : m));
  const addNode = (modId, chapId, type) => setMapData(mapData.map(m => m.id === modId ? { ...m, chapters: m.chapters.map(c => c.id === chapId ? { ...c, nodes: [...c.nodes, { id: generateId(), type, title: type === 'chest' ? 'Reward' : 'Level', isLocked: true }] } : c) } : m));
  const toggleNodeLock = (modId, chapId, nodeId) => setMapData(mapData.map(m => m.id === modId ? { ...m, chapters: m.chapters.map(c => c.id === chapId ? { ...c, nodes: c.nodes.map(n => n.id === nodeId ? { ...n, isLocked: !n.isLocked } : n) } : c) } : m));

  let globalNodeCounter = 0;

  return (
    <div className={`min-h-screen pb-32 ${isDarkMode ? 'bg-[#0B1121] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      
      <header className={`sticky top-0 z-50 px-6 py-4 border-b flex items-center justify-between backdrop-blur-xl ${isDarkMode ? 'bg-[#0B1121]/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-xl font-black capitalize">{categoryId || 'Practice'} Map Builder</h1>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Interactive Gamified Path</p>
          </div>
        </div>
        <button className="px-6 py-2.5 text-white font-black text-sm rounded-xl transition-all shadow-lg bg-indigo-500 hover:bg-indigo-400 shadow-indigo-500/20 active:scale-95">Save Path</button>
      </header>

      <main className="max-w-3xl mx-auto mt-10 px-4">
        {mapData.map((module) => (
          <div key={module.id} className="mb-20">
            
            <div className={`relative p-6 md:p-8 rounded-[2.5rem] mb-12 shadow-xl ${themeColors[module.color].bg} ${themeColors[module.color].border} border-b-[8px] text-white flex items-center justify-between group`}>
              <div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2">{module.title}</h2>
                <p className="font-medium opacity-90">{module.description}</p>
              </div>
              <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-3 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors"><Settings size={20}/></button>
              </div>
            </div>

            <div className="flex flex-col items-center relative">
              <div className="absolute top-0 bottom-0 w-px bg-slate-800/0 left-1/2 -translate-x-1/2"></div>

              {module.chapters.map((chapter) => (
                <div key={chapter.id} className="w-full flex flex-col items-center relative mb-16">
                  
                  <div className={`px-6 py-3 rounded-2xl mb-12 font-black text-sm uppercase tracking-widest border-2 border-dashed ${isDarkMode ? 'border-slate-700 text-slate-400 bg-[#151E2E]' : 'border-slate-300 text-slate-500 bg-white'} relative group cursor-pointer hover:border-indigo-500 hover:text-indigo-500 transition-colors`}>
                    {chapter.title}
                    <div className="absolute right-0 translate-x-full pl-4 opacity-0 group-hover:opacity-100 transition-opacity"><Settings size={16} /></div>
                  </div>

                  {chapter.nodes.map((node) => {
                    const offset = pathOffsets[globalNodeCounter % pathOffsets.length];
                    globalNodeCounter++;

                    const isLocked = node.isLocked;
                    const colorSet = isLocked ? (isDarkMode ? themeColors.locked.darkBg : themeColors.locked.bg) : themeColors[module.color].bg;
                    const borderSet = isLocked ? (isDarkMode ? themeColors.locked.darkBorder : themeColors.locked.border) : themeColors[module.color].border;
                    const iconColor = isLocked ? 'text-white/50' : 'text-white';

                    return (
                      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} key={node.id} className="relative flex items-center justify-center mb-8 group" style={{ transform: `translateX(${offset}px)` }}>
                        <div className="relative">
                          <button className={`relative z-10 w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-150 border-b-[8px] active:border-b-0 active:translate-y-[8px] ${colorSet} ${borderSet}`}>
                            {node.type === 'lesson' && <Star size={36} className={iconColor} fill={isLocked ? 'transparent' : 'currentColor'} />}
                            {node.type === 'chest' && <Gift size={36} className={iconColor} />}
                            {node.type === 'drill' && <FileQuestion size={36} className={iconColor} />}
                          </button>
                          
                          <div className={`absolute top-1/2 -translate-y-1/2 ${offset > 0 ? 'right-full pr-6' : 'left-full pl-6'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 pointer-events-none group-hover:pointer-events-auto`}>
                            <button onClick={() => toggleNodeLock(module.id, chapter.id, node.id)} className={`p-3 rounded-full shadow-xl ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:text-indigo-400' : 'bg-white text-slate-600 hover:text-indigo-600'}`}>
                              {isLocked ? <Unlock size={18}/> : <Lock size={18}/>}
                            </button>
                            <button className={`p-3 rounded-full shadow-xl ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:text-indigo-400' : 'bg-white text-slate-600 hover:text-indigo-600'}`}><Settings size={18}/></button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  <div className="flex gap-4 mt-8">
                     <button onClick={() => addNode(module.id, chapter.id, 'lesson')} className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-dashed transition-all flex items-center gap-2 ${isDarkMode ? 'border-slate-800 text-slate-500 hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/10' : 'border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50'}`}><Plus size={16}/> Lesson</button>
                     <button onClick={() => addNode(module.id, chapter.id, 'chest')} className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-dashed transition-all flex items-center gap-2 ${isDarkMode ? 'border-slate-800 text-slate-500 hover:border-amber-500/50 hover:text-amber-400 hover:bg-amber-500/10' : 'border-slate-300 text-slate-500 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50'}`}><Plus size={16}/> Reward</button>
                  </div>
                </div>
              ))}

              <button onClick={() => addChapter(module.id)} className={`mt-4 px-6 py-4 w-full max-w-sm rounded-[2rem] border-2 border-dashed font-black text-sm uppercase tracking-widest transition-all ${isDarkMode ? 'border-slate-700 text-slate-400 hover:border-slate-500 hover:bg-slate-800/50' : 'border-slate-300 text-slate-500 hover:border-slate-400 hover:bg-slate-100'}`}>+ Add New Chapter</button>
            </div>
          </div>
        ))}
        <button onClick={addModule} className={`mt-20 w-full py-8 rounded-[3rem] border-4 border-dashed font-black text-xl uppercase tracking-widest transition-all ${isDarkMode ? 'border-slate-800 text-slate-600 hover:border-slate-600 hover:text-slate-400' : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-500'}`}>+ Add New Unit</button>
      </main>
    </div>
  );
}