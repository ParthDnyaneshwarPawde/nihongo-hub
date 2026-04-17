import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { 
  FolderOpen, Layers, PlaySquare, FileText, HelpCircle, 
  Plus, GripVertical, ChevronDown, X, Save, 
  Trash2, CheckCircle2, Circle, Type, Link as LinkIcon, Loader2, Lock, Unlock, Clock, AlignLeft
} from 'lucide-react';
import { useStickyState } from '@hooks/useStickyState';

// 🚨 FIREBASE IMPORTS UPDATED
import { db } from '@services/firebase'; 
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, getDocs, deleteDoc } from 'firebase/firestore';

export default function PathBuilderEngine({ batchId }) {
  const { isDarkMode } = useTheme();
  // -- Curriculum State --
  const [curriculum, setCurriculum] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  
  // -- Drawer State --
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editorType, setEditorType] = useState(null); 
  const [activePlacement, setActivePlacement] = useState({ modId: null, chapId: null });
  const [editingItemId, setEditingItemId] = useState(null); // 🚨 TRACKS EDIT MODE

  // -- EDITOR FORM STATE --
  const [editorTitle, setEditorTitle] = useState('');
  const [editorDescription, setEditorDescription] = useState('');
  const [editorLink, setEditorLink] = useState('');
  const [editorDuration, setEditorDuration] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorIsLocked, setEditorIsLocked] = useState(true); 
  // -- UI Memory State --
  const [expandedModules, setExpandedModules] = useStickyState([], `expanded-mods-${batchId}`);
  const [expandedChapters, setExpandedChapters] = useStickyState([], `expanded-chaps-${batchId}`);
  
  const [quizPrompt, setQuizPrompt] = useState('');
  const [quizOptions, setQuizOptions] = useState([
    {id: 1, text: '', isCorrect: true}, 
    {id: 2, text: '', isCorrect: false}
  ]);

  // ----------------------------------------------------
  // 📥 INITIAL FETCH
  // ----------------------------------------------------
  useEffect(() => {
    const fetchCurriculum = async () => {
      if (!batchId) return;
      setIsLoading(true);
      try {
        const modulesRef = collection(db, `batches/${batchId}/module`);
        const modSnapshot = await getDocs(modulesRef);

        const loadedCurriculum = [];

        for (const modDoc of modSnapshot.docs) {
          const modData = modDoc.data();
          const modId = modDoc.id;

          const chaptersRef = collection(db, `batches/${batchId}/module/${modId}/chapters`);
          const chapSnapshot = await getDocs(chaptersRef);
          
          const chapters = [];

          for (const chapDoc of chapSnapshot.docs) {
            const chapData = chapDoc.data();
            const chapId = chapDoc.id;
            const items = [];

            const lecturesRef = collection(db, `batches/${batchId}/module/${modId}/chapters/${chapId}/lectures`);
            const lecSnap = await getDocs(lecturesRef);
            lecSnap.forEach(doc => items.push({ id: doc.id, type: 'video', ...doc.data() }));

            const articlesRef = collection(db, `batches/${batchId}/module/${modId}/chapters/${chapId}/articles`);
            const artSnap = await getDocs(articlesRef);
            artSnap.forEach(doc => items.push({ id: doc.id, type: 'article', ...doc.data() }));

            const exercisesRef = collection(db, `batches/${batchId}/module/${modId}/chapters/${chapId}/exercises`);
            const exSnap = await getDocs(exercisesRef);
            exSnap.forEach(doc => items.push({ id: doc.id, type: 'quiz', ...doc.data() }));

            chapters.push({
              id: chapId,
              title: chapData.chapterName || chapData.title,
              isLocked: chapData.isLocked ?? true, 
              isExpanded: false,
              items: items.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
            });
          }

          loadedCurriculum.push({
            id: modId,
            title: modData.name || modData.title,
            isLocked: modData.isLocked ?? true, 
            isExpanded: true,
            chapters: chapters
          });
        }
        setCurriculum(loadedCurriculum);
      } catch (error) {
        console.error("Error fetching curriculum:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurriculum();
  }, [batchId]);

  // ----------------------------------------------------
  // 📤 DATABASE WRITE HANDLERS 
  // ----------------------------------------------------
  
  const handleAddModule = async () => {
    const title = prompt("Enter Module Name:", "New Module");
    if (!title) return;
    try {
      const modRef = collection(db, `batches/${batchId}/module`);
      const docRef = await addDoc(modRef, { name: title, no_of_chapters: 0, isLocked: true, createdAt: serverTimestamp() });
      setCurriculum([...curriculum, { id: docRef.id, title, isLocked: true, isExpanded: true, chapters: [] }]);
    } catch (error) { console.error("Error:", error); }
  };

  const handleAddChapter = async (modId) => {
    const title = prompt("Enter Chapter Name:", "New Chapter");
    if (!title) return;
    try {
      const chapRef = collection(db, `batches/${batchId}/module/${modId}/chapters`);
      const docRef = await addDoc(chapRef, { chapterName: title, isLocked: true, createdAt: serverTimestamp() });
      setCurriculum(prev => prev.map(m => m.id === modId ? { ...m, chapters: [...m.chapters, { id: docRef.id, title, isLocked: true, isExpanded: true, items: [] }] } : m));
    } catch (error) { console.error("Error:", error); }
  };

  const toggleModuleLock = async (modId, currentLockStatus) => {
    try {
      const newStatus = !currentLockStatus;
      const modRef = doc(db, `batches/${batchId}/module`, modId);
      await updateDoc(modRef, { isLocked: newStatus });
      setCurriculum(prev => prev.map(m => m.id === modId ? { ...m, isLocked: newStatus } : m));
    } catch (error) { console.error("Lock error:", error); }
  };

  const toggleChapterLock = async (modId, chapId, currentLockStatus) => {
    try {
      const newStatus = !currentLockStatus;
      const chapRef = doc(db, `batches/${batchId}/module/${modId}/chapters`, chapId);
      await updateDoc(chapRef, { isLocked: newStatus });
      setCurriculum(prev => prev.map(m => m.id === modId ? { 
        ...m, chapters: m.chapters.map(c => c.id === chapId ? { ...c, isLocked: newStatus } : c) 
      } : m));
    } catch (error) { console.error("Lock error:", error); }
  };

  // 🚨 UPGRADED: SAVE INTERNAL CONTENT (ADD OR UPDATE)
  const handleSaveContent = async () => {
    const { modId, chapId } = activePlacement;
    if (!modId || !chapId) return;
    setIsSaving(true);

    try {
      const subCollectionName = editorType === 'video' ? 'lectures' : editorType === 'article' ? 'articles' : 'exercises';

      let payload = {
        title: editorTitle,
        description: editorDescription,
        type: editorType,
        isLocked: editorIsLocked,
        updatedAt: serverTimestamp(),
      };

      if (editorType === 'video') {
        payload.vimeoLink = editorLink;
        payload.duration = editorDuration || "00:00";
      } else if (editorType === 'article') {
        payload.content = editorContent;
        payload.duration = `${Math.ceil((editorContent || '').split(' ').length / 200)} min read`; 
      }

      if (editingItemId) {
        // 🚨 UPDATE EXISTING CONTENT
        const itemRef = doc(db, `batches/${batchId}/module/${modId}/chapters/${chapId}/${subCollectionName}`, editingItemId);
        await updateDoc(itemRef, payload);

        setCurriculum(prev => prev.map(m => (m.id === modId ? {
          ...m, chapters: m.chapters.map(c => (c.id === chapId ? {
            ...c, items: c.items.map(i => i.id === editingItemId ? { ...i, ...payload } : i)
          } : c))
        } : m)));

      } else {
        // 🚨 CREATE NEW CONTENT
        payload.createdAt = serverTimestamp();
        payload.resources = [];
        payload.isCompleted = false;

        const contentRef = collection(db, `batches/${batchId}/module/${modId}/chapters/${chapId}/${subCollectionName}`);
        const docRef = await addDoc(contentRef, payload);

        if (editorType !== 'quiz') {
          const chapterRef = doc(db, `batches/${batchId}/module/${modId}/chapters`, chapId);
          await updateDoc(chapterRef, { [editorType === 'video' ? 'no_of_videos' : 'no_of_articles']: increment(1) });
        }

        setCurriculum(prev => prev.map(m => (m.id === modId ? {
          ...m, chapters: m.chapters.map(c => (c.id === chapId ? {
            ...c, items: [...(c.items || []), { id: docRef.id, ...payload }]
          } : c))
        } : m)));
      }

      setIsDrawerOpen(false);
    } catch (error) {
      console.error("Forge Error:", error);
      alert("Database rejected the content. Check your security rules.");
    } finally {
      setIsSaving(false);
    }
  };

  // 🚨 NEW: DELETE ITEM
  const handleDeleteItem = async (modId, chapId, itemId, type) => {
    if (!window.confirm("Are you sure you want to permanently delete this content?")) return;
    
    try {
      const subCollectionName = type === 'video' ? 'lectures' : type === 'article' ? 'articles' : 'exercises';
      const itemRef = doc(db, `batches/${batchId}/module/${modId}/chapters/${chapId}/${subCollectionName}`, itemId);
      await deleteDoc(itemRef);

      // Decrement Counter
      const chapterRef = doc(db, `batches/${batchId}/module/${modId}/chapters`, chapId);
      if (type === 'quiz') {
        await updateDoc(chapterRef, { no_of_exercises: increment(-1) });
      } else {
        await updateDoc(chapterRef, { [type === 'video' ? 'no_of_videos' : 'no_of_articles']: increment(-1) });
      }

      // Update UI
      setCurriculum(prev => prev.map(m => (m.id === modId ? {
        ...m, chapters: m.chapters.map(c => (c.id === chapId ? {
          ...c, items: c.items.filter(i => i.id !== itemId)
        } : c))
      } : m)));
    } catch (error) {
      console.error("Delete Error:", error);
    }
  };

  // ----------------------------------------------------
  // UI HANDLERS
  // ----------------------------------------------------
  // const toggleModule = (modId) => setCurriculum(prev => prev.map(m => m.id === modId ? { ...m, isExpanded: !m.isExpanded } : m));
  // const toggleChapter = (modId, chapId) => setCurriculum(prev => prev.map(m => m.id === modId ? { ...m, chapters: m.chapters.map(c => c.id === chapId ? { ...c, isExpanded: !c.isExpanded } : c) } : m));
  const toggleModule = (modId) => {
    setExpandedModules(prev => 
      prev.includes(modId) ? prev.filter(id => id !== modId) : [...prev, modId]
    );
  };

  const toggleChapter = (modId, chapId) => {
    setExpandedChapters(prev => 
      prev.includes(chapId) ? prev.filter(id => id !== chapId) : [...prev, chapId]
    );
  };

  // 🚨 UPGRADED: OPEN EDITOR (handles existing item data)
  const openEditor = (type, modId, chapId, existingItem = null) => {
    if (type === 'quiz') {
      navigate(`/forge/quiz/${batchId}/${modId}/${chapId}${existingItem ? `/${existingItem.id}` : ''}`);
      return;
    }

    if (existingItem) {
      setEditingItemId(existingItem.id);
      setEditorTitle(existingItem.title || '');
      setEditorDescription(existingItem.description || '');
      setEditorIsLocked(existingItem.isLocked ?? true);
      if (type === 'video') {
        setEditorLink(existingItem.vimeoLink || '');
        setEditorDuration(existingItem.duration || '');
      } else if (type === 'article') {
        setEditorContent(existingItem.content || '');
      }
    } else {
      setEditingItemId(null);
      setEditorTitle('');
      setEditorDescription('');
      setEditorLink('');
      setEditorDuration('');
      setEditorContent('');
      setEditorIsLocked(true); 
    }

    setEditorType(type);
    setActivePlacement({ modId, chapId });
    setIsDrawerOpen(true);
  };

  // ----------------------------------------------------
  // RENDER: CURRICULUM TREE
  // ----------------------------------------------------
  const renderTree = () => (
    <div className="space-y-6">
      {curriculum.map((mod) => (
        <div key={mod.id} className={`rounded-[24px] border overflow-hidden shadow-sm ${isDarkMode ? 'bg-[#151E2E]/50 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className={`p-4 lg:p-5 flex items-center justify-between group ${isDarkMode ? 'bg-[#151E2E] hover:bg-slate-800/80' : 'bg-slate-50 hover:bg-slate-100'}`}>
            <div className="flex items-center gap-4">
              <button className={`cursor-grab p-1.5 rounded-lg opacity-50 group-hover:opacity-100 ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><GripVertical size={18} className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} /></button>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${isDarkMode ? 'bg-slate-800 text-rose-400' : 'bg-rose-100 text-rose-600'}`}><FolderOpen size={20} /></div>
              <h3 className={`font-black text-lg ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{mod.title}</h3>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={() => toggleModuleLock(mod.id, mod.isLocked)} title={mod.isLocked ? "Unlock Module" : "Lock Module"} className={`p-2 rounded-lg transition-colors ${mod.isLocked ? 'text-rose-500 hover:bg-rose-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}>
                {mod.isLocked ? <Lock size={18} /> : <Unlock size={18} />}
              </button>
              <button onClick={() => handleAddChapter(mod.id)} className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}>+ Add Chapter</button>
              <button onClick={() => toggleModule(mod.id)} className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}><ChevronDown size={20} className={`transition-transform duration-300 ${expandedModules.includes(mod.id) ? 'rotate-180' : ''}`} /></button>
            </div>
          </div>

          {expandedModules.includes(mod.id) && (
            <div className={`p-4 lg:p-6 space-y-4 border-t ${isDarkMode ? 'border-slate-800 bg-[#0B1121]/30' : 'border-slate-200 bg-white'}`}>
              {mod.chapters.map((chap) => (
                <div key={chap.id} className={`rounded-2xl border ${isDarkMode ? 'border-slate-700/60 bg-[#151E2E]/80' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="p-4 flex items-center justify-between border-b border-transparent hover:border-slate-700/50 group transition-colors">
                    <div className="flex items-center gap-3">
                      <button className={`cursor-grab p-1 rounded opacity-30 group-hover:opacity-100 ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><GripVertical size={16} className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} /></button>
                      <Layers size={18} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} />
                      <h4 className={`font-bold text-base ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{chap.title}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleChapterLock(mod.id, chap.id, chap.isLocked)} title={chap.isLocked ? "Unlock Chapter" : "Lock Chapter"} className={`p-1.5 rounded-lg transition-colors ${chap.isLocked ? 'text-rose-500 hover:bg-rose-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}>
                        {chap.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                      </button>
                      <button onClick={() => toggleChapter(mod.id, chap.id)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}><ChevronDown size={18} className={`transition-transform duration-300 ${expandedChapters.includes(chap.id) ? 'rotate-180' : ''}`} /></button>
                    </div>
                  </div>

                  {expandedChapters.includes(chap.id) && (
                    <div className={`p-3 border-t ${isDarkMode ? 'border-slate-700/60' : 'border-slate-200'}`}>
                      <div className="space-y-2 mb-4">
                        {chap.items.length === 0 && <div className={`text-center py-4 text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>No content yet</div>}
                        
                        {/* 🚨 UPGRADED ITEM RENDERING (ONCLICK TO EDIT) */}
                        {chap.items.map(item => (
                          <div 
                            key={item.id} 
                            onClick={() => openEditor(item.type, mod.id, chap.id, item)} 
                            className={`p-3 rounded-xl flex items-center justify-between group transition-colors cursor-pointer border border-transparent ${isDarkMode ? 'hover:bg-slate-800/80 hover:border-slate-700' : 'hover:bg-white hover:border-slate-200 hover:shadow-sm'}`}
                          >
                            <div className="flex items-center gap-3 ml-2">
                              <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                {item.type === 'video' && <PlaySquare size={16} className="text-emerald-400"/>}
                                {item.type === 'article' && <FileText size={16} className="text-amber-400"/>}
                                {item.type === 'quiz' && <HelpCircle size={16} className="text-rose-400"/>}
                              </div>
                              <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900'}`}>{item.title}</span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {/* 🚨 NEW DELETE BUTTON */}
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteItem(mod.id, chap.id, item.id, item.type); }}
                                className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-colors ${isDarkMode ? 'hover:bg-rose-500/20 text-rose-500' : 'hover:bg-rose-50 text-rose-600'}`}
                                title="Delete item"
                              >
                                <Trash2 size={16} />
                              </button>
                              
                              {item.duration && <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{item.duration}</span>}
                              {item.isLocked && <Lock size={14} className="text-rose-500" />}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className={`pt-3 border-t border-dashed flex gap-2 ml-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                        <button onClick={() => openEditor('video', mod.id, chap.id)} className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 ${isDarkMode ? 'bg-slate-800/50 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400' : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'}`}><Plus size={14}/> Video</button>
                        <button onClick={() => openEditor('article', mod.id, chap.id)} className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 ${isDarkMode ? 'bg-slate-800/50 text-slate-400 hover:bg-amber-500/10 hover:text-amber-400' : 'bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-600'}`}><Plus size={14}/> Article</button>
                        <button onClick={() => openEditor('quiz', mod.id, chap.id)} className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 ${isDarkMode ? 'bg-slate-800/50 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400' : 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600'}`}><Plus size={14}/> Question</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // ----------------------------------------------------
  // RENDER: THE CONTENT EDITORS (SLIDE-OUT DRAWER)
  // ----------------------------------------------------
  const renderEditorDrawer = () => {
    if (!isDrawerOpen) return null;

    // Dynamically change title based on editing mode
    const actionPrefix = editingItemId ? 'Edit' : 'Add';
    const headerConfig = {
      video: { title: `${actionPrefix} Video Lesson`, icon: <PlaySquare size={20} className="text-emerald-400" />, color: 'emerald' },
      article: { title: `${actionPrefix} Reading Material`, icon: <FileText size={20} className="text-amber-400" />, color: 'amber' },
      quiz: { title: `${actionPrefix} Question Forge`, icon: <HelpCircle size={20} className="text-rose-400" />, color: 'rose' }
    }[editorType];

    return (
      <div className="fixed inset-0 z-[100] flex justify-end">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsDrawerOpen(false)}></div>
        
        <div className={`relative w-full max-w-2xl border-l h-full flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl ${isDarkMode ? 'bg-[#0B1121] border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className={`p-6 border-b flex justify-between items-center shrink-0 ${isDarkMode ? 'border-slate-800 bg-[#151E2E]' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl bg-${headerConfig.color}-500/10`}>{headerConfig.icon}</div>
              <div>
                <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{headerConfig.title}</h2>
                <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Saving to Database</p>
              </div>
            </div>
            <button onClick={() => setIsDrawerOpen(false)} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 custom-scrollbar">
            
            {/* GLOBAL: TITLE & DESCRIPTION */}
            <div className="space-y-6">
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Internal Title</label>
                <input type="text" placeholder={`e.g., Intro to ${editorType}...`} value={editorTitle} onChange={(e) => setEditorTitle(e.target.value)} className={`w-full p-4 rounded-2xl border text-base font-bold outline-none transition-all ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400'}`} />
              </div>
              
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><AlignLeft size={14}/> Summary / Description</label>
                <textarea rows="3" placeholder="Briefly describe what this lesson covers..." value={editorDescription} onChange={(e) => setEditorDescription(e.target.value)} className={`w-full p-4 rounded-2xl border text-sm outline-none transition-all ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-slate-300 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-indigo-400'}`} />
              </div>
            </div>

            {/* VIDEO SPECIFIC */}
            {editorType === 'video' && (
              <div className="space-y-6 animate-in fade-in grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><LinkIcon size={14}/> Video Link (Vimeo Pro / Mux)</label>
                  <input type="text" value={editorLink} onChange={(e) => setEditorLink(e.target.value)} placeholder="https://" className={`w-full p-4 rounded-2xl border text-sm font-medium outline-none ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
                </div>
                <div className="md:col-span-2">
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><Clock size={14}/> Duration Format</label>
                  <input type="text" value={editorDuration} onChange={(e) => setEditorDuration(e.target.value)} placeholder="e.g., 14:20" className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
                </div>
              </div>
            )}

            {/* ARTICLE SPECIFIC */}
            {editorType === 'article' && (
              <div className="space-y-6 animate-in fade-in">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Content (HTML/Markdown)</label>
                  <textarea rows="12" value={editorContent} onChange={(e) => setEditorContent(e.target.value)} placeholder="Write your lesson here..." className="w-full p-6 rounded-3xl bg-slate-900 border border-slate-700 text-slate-300 font-medium leading-relaxed outline-none focus:border-indigo-500 transition-all" />
                </div>
              </div>
            )}

            {/* QUIZ SPECIFIC */}
            {editorType === 'quiz' && (
              <div className="space-y-8 animate-in fade-in">
                <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 flex items-center gap-2 ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}><Type size={14}/> Main Prompt</label>
                  <input type="text" value={quizPrompt} onChange={(e) => setQuizPrompt(e.target.value)} placeholder="e.g., Choose the correct reading..." className={`w-full p-4 rounded-2xl border text-lg font-bold outline-none mb-6 ${isDarkMode ? 'bg-[#0B1121] border-slate-700 text-white focus:border-rose-500' : 'bg-slate-50 border-slate-200 focus:border-rose-400'}`} />
                </div>
                <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
                  <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-4 ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}><CheckCircle2 size={14}/> Answer Options</label>
                  <div className="space-y-3">
                    {quizOptions.map((opt, idx) => (
                      <div key={opt.id} className={`flex items-center p-3 rounded-2xl border-2 transition-all ${opt.isCorrect ? 'border-emerald-500 bg-emerald-500/10' : isDarkMode ? 'border-slate-700 bg-[#0B1121]' : 'border-slate-200 bg-slate-50'}`}>
                        <button onClick={() => setQuizOptions(quizOptions.map(o => ({...o, isCorrect: o.id === opt.id})))} className={`p-2 shrink-0 ${opt.isCorrect ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}>{opt.isCorrect ? <CheckCircle2 size={22}/> : <Circle size={22}/>}</button>
                        <div className="w-px h-6 bg-slate-700 mx-2"></div>
                        <input type="text" value={opt.text} onChange={(e) => setQuizOptions(quizOptions.map(o => o.id === opt.id ? {...o, text: e.target.value} : o))} placeholder={`Option ${idx + 1}`} className={`flex-1 bg-transparent border-none outline-none font-bold text-base px-2 ${isDarkMode ? 'text-white' : 'text-slate-900'} ${opt.isCorrect ? 'text-emerald-400' : ''}`} />
                      </div>
                    ))}
                    <button onClick={() => setQuizOptions([...quizOptions, {id: Date.now(), text: '', isCorrect: false}])} className={`w-full py-3 rounded-xl border border-dashed font-bold text-sm mt-2 transition-colors ${isDarkMode ? 'border-slate-700 text-slate-400 hover:border-slate-500' : 'border-slate-300 text-slate-500 hover:bg-slate-50'}`}>+ Add Option</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* GLOBAL: LOCK TOGGLE & SAVE BUTTON */}
          <div className={`p-6 border-t shrink-0 space-y-4 ${isDarkMode ? 'border-slate-800 bg-[#151E2E]' : 'border-slate-200 bg-white'}`}>
            
            <div className={`flex items-center justify-between p-4 rounded-2xl border ${isDarkMode ? 'bg-[#0B1121] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${editorIsLocked ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                  {editorIsLocked ? <Lock size={18} /> : <Unlock size={18} />}
                </div>
                <div>
                  <p className={`font-bold text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Content Visibility</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {editorIsLocked ? 'Hidden from students' : 'Visible to students'}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => setEditorIsLocked(!editorIsLocked)}
                className={`relative w-12 h-6 rounded-full transition-colors ${editorIsLocked ? 'bg-rose-500' : 'bg-emerald-500'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${editorIsLocked ? 'left-1' : 'translate-x-7'}`}></div>
              </button>
            </div>

            <button 
              onClick={handleSaveContent} disabled={isSaving}
              className={`w-full py-4 text-white font-black text-lg rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2
                ${isSaving ? 'opacity-70 cursor-not-allowed bg-slate-700' : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-600/20 active:scale-95'}`}
            >
              {isSaving ? <><Loader2 size={20} className="animate-spin"/> Saving to DB...</> : <><Save size={20} /> {editingItemId ? 'Update Database' : 'Save to Database'}</>}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className={`text-3xl font-black tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Curriculum Map Builder</h2>
          <p className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Changes made here are instantly pushed to your live Firebase database.</p>
        </div>
        <button onClick={handleAddModule} className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-xl shadow-lg shadow-rose-500/20 hover:scale-105 transition-transform flex items-center gap-2">
          <Plus size={18} /> New Module
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-indigo-500">
          <Loader2 className="animate-spin mb-4" size={32} />
          <p className="text-xs font-bold uppercase tracking-widest">Loading Curriculum...</p>
        </div>
      ) : (
        renderTree()
      )}
      {renderEditorDrawer()}
    </div>
  );
}