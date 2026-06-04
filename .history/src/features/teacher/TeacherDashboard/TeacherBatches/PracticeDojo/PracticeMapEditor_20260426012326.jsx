import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Star, Gift, Settings, Lock, Unlock, 
  ChevronUp, ChevronDown, ChevronRight, Edit3, Loader2, Cloud, Play, Plus, Trash2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@services/firebase';
import { doc, collection, writeBatch, getDocs, serverTimestamp, getDoc } from 'firebase/firestore';

const generateId = () => 'id_' + Math.random().toString(36).substr(2, 9);

// 🚨 PERFECT MATHEMATICAL OFFSETS
const pathOffsets = [0, 40, 70, 40, 0, -40, -70, -40]; 
const ROW_HEIGHT = 110; 
const SVG_WIDTH = 300;
const CENTER_X = SVG_WIDTH / 2;

export default function PracticeMapEditor() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { batchId, categoryId } = useParams(); 

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSettings, setActiveSettings] = useState(null); 

  const [mapData, setMapData] = useState([]);
  
  // 🚨 DATABASE DELETION TRACKER
  const [pendingDeletions, setPendingDeletions] = useState([]);

  // --- PERSISTENT COLLAPSE STATE (SAFELY PARSED) ---
  const [collapsedUnits, setCollapsedUnits] = useState(() => {
    try { const saved = localStorage.getItem(`dojo_units_${batchId}`); return saved ? JSON.parse(saved) : {}; } 
    catch (e) { return {}; }
  });
  const [collapsedChapters, setCollapsedChapters] = useState(() => {
    try { const saved = localStorage.getItem(`dojo_chaps_${batchId}`); return saved ? JSON.parse(saved) : {}; } 
    catch (e) { return {}; }
  });

  useEffect(() => { localStorage.setItem(`dojo_units_${batchId}`, JSON.stringify(collapsedUnits)); }, [collapsedUnits, batchId]);
  useEffect(() => { localStorage.setItem(`dojo_chaps_${batchId}`, JSON.stringify(collapsedChapters)); }, [collapsedChapters, batchId]);

  const toggleUnit = (id) => setCollapsedUnits(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleChapter = (id) => setCollapsedChapters(prev => ({ ...prev, [id]: !prev[id] }));

  // --- UPGRADED 3D PREMIUM COLORS ---
  const themeColors = {
    indigo: { unitBg: 'bg-indigo-600', unitBorder: 'border-indigo-800', base: 'bg-indigo-500', shadow: 'border-indigo-700', inner: 'bg-indigo-400', glow: 'shadow-indigo-500/40' },
    emerald: { unitBg: 'bg-emerald-600', unitBorder: 'border-emerald-800', base: 'bg-emerald-500', shadow: 'border-emerald-700', inner: 'bg-emerald-400', glow: 'shadow-emerald-500/40' },
    rose: { unitBg: 'bg-rose-600', unitBorder: 'border-rose-800', base: 'bg-rose-500', shadow: 'border-rose-700', inner: 'bg-rose-400', glow: 'shadow-rose-500/40' },
    amber: { unitBg: 'bg-amber-500', unitBorder: 'border-amber-700', base: 'bg-amber-400', shadow: 'border-amber-600', inner: 'bg-amber-300', glow: 'shadow-amber-500/40' },
    locked: { bg: 'bg-[#1E293B]', shadow: 'border-[#0F172A]', inner: 'bg-[#334155]', darkBg: 'bg-[#151E2E]', darkShadow: 'border-[#0B1120]', darkInner: 'bg-[#1E293B]' }
  };

  // --- FIREBASE FETCH ENGINE (BULLETPROOF) ---
  useEffect(() => {
    let isMounted = true; // Prevents race conditions that cause endless loading

    const fetchDeepMap = async () => {
      if (isMounted) setIsLoading(true);
      try {
        const catRef = doc(db, `batches/${batchId}/self_practice/${categoryId}`);
        const catSnap = await getDoc(catRef);
        
        if (!catSnap.exists()) {
          if (isMounted) {
            setMapData([{
              id: generateId(), title: 'Unit 1: The Foundations', description: 'Master the core concepts.', color: 'indigo', isLocked: false,
              chapters: [{
                id: generateId(), title: 'Chapter 1: Basics', isLocked: false,
                nodes: [
                  { id: generateId(), type: 'level', isLocked: false },
                  { id: generateId(), type: 'level', isLocked: true }
                ]
              }]
            }]);
            setIsLoading(false);
          }
          return;
        }

        const unitsSnap = await getDocs(collection(db, `batches/${batchId}/self_practice/${categoryId}/units`));
        let builtTree = [];

        for (const uDoc of unitsSnap.docs) {
          const unit = { id: uDoc.id, ...uDoc.data(), isLocked: uDoc.data().isLocked || false, chapters: [] };
          const chapsSnap = await getDocs(collection(db, `${uDoc.ref.path}/chapters`));
          
          for (const cDoc of chapsSnap.docs) {
            const chap = { id: cDoc.id, ...cDoc.data(), isLocked: cDoc.data().isLocked || false, nodes: [] };
            const nodesSnap = await getDocs(collection(db, `${cDoc.ref.path}/nodes`));
            nodesSnap.forEach(nDoc => chap.nodes.push({ id: nDoc.id, ...nDoc.data() }));
            chap.nodes.sort((a, b) => a.order - b.order);
            unit.chapters.push(chap);
          }
          unit.chapters.sort((a, b) => a.order - b.order);
          builtTree.push(unit);
        }
        builtTree.sort((a, b) => a.order - b.order);
        
        if(builtTree.length === 0) builtTree = [{ id: generateId(), title: 'Unit 1', description: 'Empty Unit', color: 'indigo', isLocked: false, chapters: [] }];
        if (isMounted) setMapData(builtTree);

      } catch (error) { 
        console.error("Error fetching map:", error); 
      } finally { 
        if (isMounted) setIsLoading(false); 
      }
    };
    fetchDeepMap();
    return () => { isMounted = false; };
  }, [batchId, categoryId]);

  // --- FIREBASE SYNC ENGINE (SAFELY MERGES & DELETES) ---
  const syncMapToCloud = async () => {
    setIsSaving(true);
    console.log("====== 🕵️ DATABASE DEBUG ======");
    console.log("1. Batch ID:", batchId);
    console.log("2. Category ID:", categoryId);
    console.log("3. Target Path:", `batches/${batchId}/self_practice/${categoryId}`);
    console.log("4. Connected Project:", db.app?.options?.projectId);
    console.log("===============================");
    try {
      const batch = writeBatch(db);
      const basePath = `batches/${batchId}/self_practice/${categoryId}`;
      const catRef = doc(db, basePath);
      
      batch.set(catRef, { updatedAt: serverTimestamp(), category: categoryId || "unknown" }, { merge: true });

      // Execute Pending Deletions FIRST
      pendingDeletions.forEach(path => {
        batch.delete(doc(db, path));
      });

      mapData.forEach((unit, uIdx) => {
        const unitRef = doc(db, `${catRef.path}/units`, unit.id);
        batch.set(unitRef, { 
          name: unit.title || 'Untitled', description: unit.description || '', color: unit.color || 'indigo', 
          order: uIdx, isLocked: unit.isLocked || false, updatedAt: serverTimestamp() 
        }, { merge: true });

        unit.chapters.forEach((chap, cIdx) => {
          const chapRef = doc(db, `${unitRef.path}/chapters`, chap.id);
          batch.set(chapRef, { 
            name: chap.title || 'Untitled', order: cIdx, isLocked: chap.isLocked || false, updatedAt: serverTimestamp() 
          }, { merge: true });

          chap.nodes.forEach((node, nIdx) => {
            const nodeRef = doc(db, `${chapRef.path}/nodes`, node.id);
            batch.set(nodeRef, { 
              type: node.type || 'level', order: nIdx, isLocked: node.isLocked || false, updatedAt: serverTimestamp() 
            }, { merge: true });
            
            if (node.type === 'level') {
              batch.set(doc(db, `${nodeRef.path}/content`, 'srs'), { initialized: true, type: 'srs' }, { merge: true });
              batch.set(doc(db, `${nodeRef.path}/content`, 'drill'), { initialized: true, type: 'drill' }, { merge: true });
            }
          });
        });
      });
      await batch.commit();
      setPendingDeletions([]); // Clear deletions after successful save
    } catch (error) { 
      console.error("🔥 SYNC ERROR:", error);
      alert(`Sync Failed: ${error.message}`); 
    } 
    finally { setIsSaving(false); }
  };

  // --- BUILDER ACTIONS ---
  const addModule = () => setMapData([...mapData, { id: generateId(), title: `Unit ${mapData.length + 1}: New Unit`, description: 'Add a description...', color: ['indigo', 'emerald', 'rose', 'amber'][mapData.length % 4], isLocked: false, chapters: [] }]);
  const addChapter = (modId) => setMapData(mapData.map(m => m.id === modId ? { ...m, chapters: [...m.chapters, { id: generateId(), title: `Chapter ${m.chapters.length + 1}`, isLocked: false, nodes: [] }] } : m));
  const addNode = (modId, chapId, type) => setMapData(mapData.map(m => m.id === modId ? { ...m, chapters: m.chapters.map(c => c.id === chapId ? { ...c, nodes: [...c.nodes, { id: generateId(), type, isLocked: true }] } : c) } : m));
  const updateTitle = (modId, newTitle, chapId = null) => setMapData(mapData.map(m => m.id === modId ? (chapId ? { ...m, chapters: m.chapters.map(c => c.id === chapId ? { ...c, title: newTitle } : c) } : { ...m, title: newTitle }) : m));
  
  // --- LOCK TOGGLES ---
  const toggleUnitLock = (modId) => setMapData(mapData.map(m => m.id === modId ? { ...m, isLocked: !m.isLocked } : m));
  const toggleChapterLock = (modId, chapId) => setMapData(mapData.map(m => m.id === modId ? { ...m, chapters: m.chapters.map(c => c.id === chapId ? { ...c, isLocked: !c.isLocked } : c) } : m));
  const toggleNodeLock = (modId, chapId, nodeId) => setMapData(mapData.map(m => m.id === modId ? { ...m, chapters: m.chapters.map(c => c.id === chapId ? { ...c, nodes: c.nodes.map(n => n.id === nodeId ? { ...n, isLocked: !n.isLocked } : n) } : c) } : m));
  
  // --- DELETE HANDLERS ---
  const deleteUnit = (modId) => {
    if (window.confirm("Are you sure you want to delete this entire Unit and all its contents?")) {
      setPendingDeletions(prev => [...prev, `batches/${batchId}/self_practice/${categoryId}/units/${modId}`]);
      setMapData(mapData.filter(m => m.id !== modId));
    }
  };
  const deleteChapter = (modId, chapId) => {
    if (window.confirm("Are you sure you want to delete this Chapter?")) {
      setPendingDeletions(prev => [...prev, `batches/${batchId}/self_practice/${categoryId}/units/${modId}/chapters/${chapId}`]);
      setMapData(mapData.map(m => m.id === modId ? { ...m, chapters: m.chapters.filter(c => c.id !== chapId) } : m));
    }
  };
  const deleteNode = (modId, chapId, nodeId) => {
    setPendingDeletions(prev => [...prev, `batches/${batchId}/self_practice/${categoryId}/units/${modId}/chapters/${chapId}/nodes/${nodeId}`]);
    setMapData(mapData.map(m => m.id === modId ? { ...m, chapters: m.chapters.map(c => c.id === chapId ? { ...c, nodes: c.nodes.filter(n => n.id !== nodeId) } : c) } : m));
  };

  const moveNode = (modId, chapId, nodeId, direction) => {
    setMapData(mapData.map(m => m.id === modId ? { ...m, chapters: m.chapters.map(c => {
        if (c.id === chapId) {
          const idx = c.nodes.findIndex(n => n.id === nodeId);
          if ((direction === -1 && idx === 0) || (direction === 1 && idx === c.nodes.length - 1)) return c;
          const newNodes = [...c.nodes];
          const temp = newNodes[idx]; newNodes[idx] = newNodes[idx + direction]; newNodes[idx + direction] = temp;
          return { ...c, nodes: newNodes };
        } return c;
      })} : m));
    setActiveSettings(null);
  };

  if (isLoading) return <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-[#0B1120] text-indigo-400' : 'bg-slate-50 text-indigo-600'}`}><Loader2 className="animate-spin" size={40} /></div>;

  let globalNodeCounter = 0;

  const handleOpenLevelForge = (unitId, chapterId, nodeId) => {
    // Navigate to the LevelForge route
    // You may need to adjust this path to match your App.js router!
    navigate(`/batch/${batchId}/dojo/${categoryId}/unit/${unitId}/chapter/${chapterId}/node/${nodeId}/forge`);
  };

  return (
    <div className={`min-h-screen pb-32 relative overflow-hidden ${isDarkMode ? 'bg-[#0B1120] text-slate-200' : 'bg-[#F8FAFC] text-slate-900'}`}>
      
      <header className={`sticky top-0 z-50 px-8 py-5 flex items-center justify-between border-b ${isDarkMode ? 'bg-[#0B1120]/90 backdrop-blur-md border-slate-800' : 'bg-white/90 backdrop-blur-md border-slate-200'}`}>
        <div className="flex items-center gap-5 relative z-10">
          <button onClick={() => navigate(-1)} className={`p-2.5 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-[#151E2E] text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}><ArrowLeft size={20} /></button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                {categoryId} Module
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><Cloud size={12} /> Sync Enabled</span>
            </div>
            <h1 className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Path Builder</h1>
          </div>
        </div>

        <button onClick={syncMapToCloud} disabled={isSaving} className={`relative z-10 px-6 py-2.5 text-white font-black text-[11px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg ${isSaving ? 'bg-slate-800 text-slate-500 pointer-events-none' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20 active:scale-95'}`}>
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />}
          {isSaving ? 'Syncing...' : 'Save to DB'}
        </button>
      </header>

      <main className="max-w-[450px] mx-auto mt-12 px-4 relative z-10">
        
        {/* DECORATIVE START FLAG */}
        <div className="flex justify-center mb-12 relative z-20">
           <div className={`px-6 py-3 rounded-full border-[3px] font-black tracking-widest uppercase text-[10px] flex items-center gap-2 ${isDarkMode ? 'bg-[#0B1120] border-slate-700 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-800 shadow-sm'}`}>
              <Play size={12} fill="currentColor" className="text-indigo-500" /> Path Start
           </div>
        </div>

        {mapData.map((module, mIdx) => (
          <div key={module.id} className="mb-24 relative">
            
            {/* VIBRANT UNIT BANNER WITH COLLAPSE & DELETE */}
            <div className={`relative p-8 md:p-10 rounded-[2.5rem] mb-16 shadow-2xl border-b-[6px] overflow-hidden group transition-transform hover:-translate-y-1 ${themeColors[module.color].unitBg} ${themeColors[module.color].unitBorder}`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-[60px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <button onClick={() => toggleUnit(module.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white transition-all">
                      {collapsedUnits[module.id] ? <ChevronRight size={18}/> : <ChevronDown size={18}/>}
                    </button>
                    <span className="px-3 py-1 bg-black/20 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-widest text-white/90">Unit {mIdx + 1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleUnitLock(module.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors">
                      {module.isLocked ? <Lock size={14} className="text-rose-500" /> : <Unlock size={14}/>}
                    </button>
                    <button onClick={() => deleteUnit(module.id)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-rose-500/40 text-white/60 hover:text-rose-200 transition-colors">
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>

                <input 
                  value={module.title} onChange={(e) => updateTitle(module.id, e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-2xl sm:text-3xl font-black tracking-tight text-white mb-2 placeholder:text-white/50" placeholder="Unit Title..."
                />
                <input 
                  value={module.description} onChange={(e) => { const newMap = [...mapData]; newMap[mIdx].description = e.target.value; setMapData(newMap); }}
                  className="w-full bg-transparent border-none outline-none font-bold text-sm text-white/80 placeholder:text-white/40" placeholder="What will they learn?"
                />
              </div>
            </div>

            {/* HIDDEN MATH TRACKER TO PRESERVE OFFSETS WHEN COLLAPSED */}
            {collapsedUnits[module.id] && (
               <div className="hidden">
                 {module.chapters.forEach(c => { globalNodeCounter += c.nodes.length; })}
               </div>
            )}

            {/* CHAPTERS & NODES */}
            {!collapsedUnits[module.id] && (
              <div className="flex flex-col items-center relative">
                {module.chapters.map((chapter) => {
                  const numNodes = chapter.nodes.length;
                  const chapterStartIndex = globalNodeCounter; 

                  let pathD = "";
                  if (!collapsedChapters[chapter.id] && numNodes > 1) {
                    pathD = `M ${CENTER_X + pathOffsets[chapterStartIndex % pathOffsets.length]} ${ROW_HEIGHT / 2} `;
                    for (let i = 0; i < numNodes - 1; i++) {
                      const startX = CENTER_X + pathOffsets[(chapterStartIndex + i) % pathOffsets.length];
                      const startY = (i * ROW_HEIGHT) + (ROW_HEIGHT / 2);
                      const endX = CENTER_X + pathOffsets[(chapterStartIndex + i + 1) % pathOffsets.length];
                      const endY = ((i + 1) * ROW_HEIGHT) + (ROW_HEIGHT / 2);
                      const cpOffset = ROW_HEIGHT * 0.6; 
                      pathD += ` C ${startX} ${startY + cpOffset}, ${endX} ${endY - cpOffset}, ${endX} ${endY}`;
                    }
                  }

                  return (
                    <div key={chapter.id} className="w-full flex flex-col items-center relative mb-8">
                      
                      {/* WIDER, MORE PROMINENT CHAPTER PILL WITH COLLAPSE & DELETE */}
                      <div className={`relative z-20 w-full max-w-[320px] py-3.5 px-4 rounded-2xl mb-6 border-[2px] flex items-center justify-between gap-2 shadow-lg transition-all ${isDarkMode ? 'bg-[#1A2333] border-slate-700' : 'bg-white border-slate-200'}`}>
                        <button onClick={() => toggleChapter(chapter.id)} className={`shrink-0 p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                          {collapsedChapters[chapter.id] ? <ChevronRight size={16}/> : <ChevronDown size={16}/>}
                        </button>

                        <input 
                          value={chapter.title} onChange={(e) => updateTitle(module.id, e.target.value, chapter.id)}
                          className={`bg-transparent border-none outline-none font-black text-xs uppercase tracking-widest text-center w-full ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}
                          placeholder="Chapter Title..." 
                        />
                        
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => toggleChapterLock(module.id, chapter.id)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-500 hover:text-slate-300' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
                            {chapter.isLocked ? <Lock size={14} className="text-rose-500" /> : <Unlock size={14}/>}
                          </button>
                          <button onClick={() => deleteChapter(module.id, chapter.id)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-rose-500/20 text-rose-500' : 'hover:bg-rose-50 text-rose-500'}`}>
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </div>

                      {collapsedChapters[chapter.id] ? (
                         <div className="hidden">
                           {(() => { globalNodeCounter += numNodes; return null; })()}
                         </div>
                      ) : (
                        <>
                          {/* ALIGNMENT WRAPPER */}
                          <div className="relative w-full z-10" style={{ height: `${numNodes * ROW_HEIGHT}px` }}>
                            
                            {numNodes > 1 && (
                              <svg className="absolute top-0 left-1/2 -translate-x-1/2 h-full z-0 pointer-events-none" style={{ width: SVG_WIDTH }}>
                                 <path 
                                    d={pathD} 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="8" 
                                    strokeDasharray="1 16"
                                    strokeLinecap="round" 
                                    className={`${isDarkMode ? 'text-slate-800' : 'text-slate-300'}`} 
                                  />
                              </svg>
                            )}

                            {chapter.nodes.map((node, nIdx) => {
                              const offset = pathOffsets[globalNodeCounter % pathOffsets.length];
                              const nodeCenterY = (nIdx * ROW_HEIGHT) + (ROW_HEIGHT / 2);
                              globalNodeCounter++;

                              const isLocked = node.isLocked;

                              // 1. The Outer Body of the button
                              const containerClass = isLocked 
                                ? (isDarkMode ? themeColors.locked.darkBg : themeColors.locked.bg) 
                                : themeColors[module.color].base;

                              // 2. The Thick Bottom 3D Shadow
                              const borderClass = isLocked 
                                ? (isDarkMode ? themeColors.locked.darkShadow : themeColors.locked.shadow) 
                                : themeColors[module.color].shadow;

                              // 3. The Inner Circle Highlight
                              const innerClass = isLocked
                                ? (isDarkMode ? themeColors.locked.darkInner : themeColors.locked.inner)
                                : themeColors[module.color].inner;

                              const iconColor = isLocked ? (isDarkMode ? 'text-slate-600' : 'text-slate-400') : 'text-white';
                              const glowClass = isLocked ? '' : themeColors[module.color].glow;

                              return (
                                <div 
                                  key={node.id} 
                                  className="absolute z-20 group"
                                  style={{ top: nodeCenterY, left: `calc(50% + ${offset}px)`, transform: 'translate(-50%, -50%)' }}
                                >
                                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative flex flex-col items-center">
                                    
                                    {/* 🚨 THE UPGRADED 3D BUTTON */}
                                    {/* 🚨 THE UPGRADED 3D BUTTON (Now Clickable with Type Check!) */}
<button 
  onClick={() => {
    if (node.type === 'level') {
      handleOpenLevelForge(module.id, chapter.id, node.id);
    } else if (node.type === 'chest') {
      // TODO: We will wire this up to a handleOpenChestForge function next!
      alert("Chest/Reward Editor coming soon!");
    }
  }}
  className={`w-[76px] h-[76px] rounded-full flex items-center justify-center transition-all duration-150 border-t-[2px] border-t-white/30 border-b-[8px] active:border-b-0 active:border-t-0 active:translate-y-[8px] shadow-2xl ${glowClass} ${containerClass} ${borderClass} hover:scale-105 cursor-pointer`}
>
  <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-inner ${innerClass}`}>
    {node.type === 'level' && <Star size={24} className={iconColor} fill={isLocked ? 'transparent' : 'currentColor'} />}
    {node.type === 'chest' && <Gift size={24} className={iconColor} />}
  </div>
</button>

                                    {/* Settings Menu */}
                                    <div className={`absolute top-1/2 -translate-y-1/2 ${offset >= 0 ? 'right-[100%] pr-4' : 'left-[100%] pl-4'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-2`}>
                                      
                                      <button onClick={() => deleteNode(module.id, chapter.id, node.id)} className={`w-10 h-10 flex items-center justify-center rounded-full shadow-lg transition-colors border ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-rose-500 hover:bg-rose-500/20' : 'bg-white border-slate-200 text-rose-500 hover:bg-rose-50'}`}>
                                        <Trash2 size={14}/>
                                      </button>
                                      
                                      <button onClick={() => toggleNodeLock(module.id, chapter.id, node.id)} className={`w-10 h-10 flex items-center justify-center rounded-full shadow-lg transition-colors border ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'}`}>
                                        {isLocked ? <Lock size={14} className="text-rose-500" /> : <Unlock size={14}/>}
                                      </button>
                                      
                                      <div className="relative">
                                        <button onClick={() => setActiveSettings(activeSettings === node.id ? null : node.id)} className={`w-10 h-10 flex items-center justify-center rounded-full shadow-lg transition-colors border ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'}`}>
                                          <Settings size={14}/>
                                        </button>
                                        
                                        <AnimatePresence>
                                          {activeSettings === node.id && (
                                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 flex flex-col gap-1 p-1 rounded-xl border shadow-xl z-[100] ${isDarkMode ? 'bg-[#1A2333] border-slate-700' : 'bg-white border-slate-200'}`}>
                                              <button onClick={() => moveNode(module.id, chapter.id, node.id, -1)} className={`p-2.5 rounded-lg ${isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}><ChevronUp size={16} /></button>
                                              <button onClick={() => moveNode(module.id, chapter.id, node.id, 1)} className={`p-2.5 rounded-lg ${isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}><ChevronDown size={16} /></button>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    </div>
                                  </motion.div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex gap-3 mt-8 relative z-20 w-full max-w-[280px]">
                            <button onClick={() => addNode(module.id, chapter.id, 'level')} className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${isDarkMode ? 'bg-[#151E2E]/50 border-slate-700 text-slate-500 hover:text-indigo-400 hover:border-indigo-500/50' : 'bg-white border-slate-300 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 shadow-sm'}`}><Plus size={14}/> Add Level</button>
                            <button onClick={() => addNode(module.id, chapter.id, 'chest')} className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${isDarkMode ? 'bg-[#151E2E]/50 border-slate-700 text-slate-500 hover:text-amber-400 hover:border-amber-500/50' : 'bg-white border-slate-300 text-slate-500 hover:text-amber-600 hover:border-amber-300 shadow-sm'}`}><Plus size={14}/> Reward</button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                <button onClick={() => addChapter(module.id)} className={`mt-8 px-6 py-3.5 w-full max-w-xs rounded-xl border border-dashed font-bold text-[11px] uppercase tracking-widest transition-all relative z-10 ${isDarkMode ? 'bg-transparent border-slate-700 text-slate-600 hover:border-slate-500 hover:text-slate-400' : 'bg-transparent border-slate-400 text-slate-500 hover:border-slate-500 hover:text-slate-700'}`}>+ Add Chapter</button>
              </div>
            )}
          </div>
        ))}
        
        <button onClick={addModule} className={`mb-12 mt-12 w-full py-8 rounded-[2rem] border-2 border-dashed font-black text-sm uppercase tracking-[0.2em] transition-all relative z-10 ${isDarkMode ? 'bg-[#151E2E]/20 border-slate-800 text-slate-500 hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-[#151E2E]/40' : 'bg-slate-50 border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-600'}`}>
          + Add New Unit
        </button>
      </main>
    </div>
  );
}