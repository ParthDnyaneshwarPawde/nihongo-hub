import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { 
  FolderOpen, Layers, PlaySquare, FileText, HelpCircle, 
  Plus, GripVertical, ChevronDown, X, Save, 
  Trash2, CheckCircle2, Circle, Type, Link as LinkIcon, Loader2, Lock, Unlock, Clock, AlignLeft
} from 'lucide-react';
import { useStickyState } from '@hooks/useStickyState';

import { db } from '@services/firebase'; 
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';

import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

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
  const [editingItemId, setEditingItemId] = useState(null);

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
              order: chapData.order || 0, 
              isExpanded: false,
              items: items.sort((a, b) => (a.order ?? a.createdAt?.seconds ?? 0) - (b.order ?? b.createdAt?.seconds ?? 0))
            });
          }

          loadedCurriculum.push({
            id: modId,
            title: modData.name || modData.title,
            isLocked: modData.isLocked ?? true, 
            order: modData.order || 0, 
            isExpanded: true,
            chapters: chapters.sort((a, b) => a.order - b.order)
          });
        }
        
        setCurriculum(loadedCurriculum.sort((a, b) => a.order - b.order));
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
      const order = curriculum.length; 
      const modRef = collection(db, `batches/${batchId}/module`);
      const docRef = await addDoc(modRef, { name: title, no_of_chapters: 0, isLocked: true, order, createdAt: serverTimestamp() });
      setCurriculum([...curriculum, { id: docRef.id, title, isLocked: true, order, isExpanded: true, chapters: [] }]);
    } catch (error) { console.error("Error:", error); }
  };

  const handleAddChapter = async (modId) => {
    const title = prompt("Enter Chapter Name:", "New Chapter");
    if (!title) return;
    try {
      const modIndex = curriculum.findIndex(m => m.id === modId);
      const order = curriculum[modIndex].chapters.length; 
      const chapRef = collection(db, `batches/${batchId}/module/${modId}/chapters`);
      const docRef = await addDoc(chapRef, { chapterName: title, isLocked: true, order, createdAt: serverTimestamp() });
      
      // Update chapter count on the module
      const modDocRef = doc(db, `batches/${batchId}/module`, modId);
      await updateDoc(modDocRef, { no_of_chapters: increment(1) });

      setCurriculum(prev => prev.map(m => m.id === modId ? { ...m, chapters: [...m.chapters, { id: docRef.id, title, isLocked: true, order, isExpanded: true, items: [] }] } : m));
    } catch (error) { console.error("Error:", error); }
  };

  // 🚨 NEW: DELETE MODULE
  const handleDeleteModule = async (modId) => {
    if (!window.confirm("Are you sure you want to delete this ENTIRE module? This will hide all its chapters and content from students. This action cannot be undone.")) return;
    try {
      const modRef = doc(db, `batches/${batchId}/module`, modId);
      await deleteDoc(modRef);
      setCurriculum(prev => prev.filter(m => m.id !== modId));
    } catch (error) {
      console.error("Delete Error:", error);
    }
  };

  // 🚨 NEW: DELETE CHAPTER
  const handleDeleteChapter = async (modId, chapId) => {
    if (!window.confirm("Are you sure you want to delete this chapter? This cannot be undone.")) return;
    try {
      const chapRef = doc(db, `batches/${batchId}/module/${modId}/chapters`, chapId);
      await deleteDoc(chapRef);

      // Decrement chapter count on the module
      const modDocRef = doc(db, `batches/${batchId}/module`, modId);
      await updateDoc(modDocRef, { no_of_chapters: increment(-1) });

      setCurriculum(prev => prev.map(m => m.id === modId ? {
        ...m, chapters: m.chapters.filter(c => c.id !== chapId)
      } : m));
    } catch (error) {
      console.error("Delete Error:", error);
    }
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
        // UPDATE EXISTING CONTENT
        const itemRef = doc(db, `batches/${batchId}/module/${modId}/chapters/${chapId}/${subCollectionName}`, editingItemId);
        await updateDoc(itemRef, payload);

        setCurriculum(prev => prev.map(m => (m.id === modId ? {
          ...m, chapters: m.chapters.map(c => (c.id === chapId ? {
            ...c, items: c.items.map(i => i.id === editingItemId ? { ...i, ...payload } : i)
          } : c))
        } : m)));

      } else {
        // CREATE NEW CONTENT
        payload.createdAt = serverTimestamp();
        payload.resources = [];
        payload.isCompleted = false;

        const modObj = curriculum.find(m => m.id === modId);
        const chapObj = modObj.chapters.find(c => c.id === chapId);
        payload.order = chapObj.items.length; 

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

  const handleDeleteItem = async (modId, chapId, itemId, type) => {
    if (!window.confirm("Are you sure you want to permanently delete this content?")) return;
    
    try {
      const subCollectionName = type === 'video' ? 'lectures' : type === 'article' ? 'articles' : 'exercises';
      const itemRef = doc(db, `batches/${batchId}/module/${modId}/chapters/${chapId}/${subCollectionName}`, itemId);
      await deleteDoc(itemRef);

      const chapterRef = doc(db, `batches/${batchId}/module/${modId}/chapters`, chapId);
      if (type === 'quiz') {
        await updateDoc(chapterRef, { no_of_exercises: increment(-1) });
      } else {
        await updateDoc(chapterRef, { [type === 'video' ? 'no_of_videos' : 'no_of_articles']: increment(-1) });
      }

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
  // 🚨 DRAG AND DROP HANDLER
  // ----------------------------------------------------
  const handleDragEnd = async (result) => {
    const { source, destination, type } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    try {
      if (type === 'module') {
        const newMods = Array.from(curriculum);
        const [moved] = newMods.splice(source.index, 1);
        newMods.splice(destination.index, 0, moved);
        setCurriculum(newMods); 

        const batch = writeBatch(db);
        newMods.forEach((mod, index) => {
          batch.update(doc(db, `batches/${batchId}/module`, mod.id), { order: index });
        });
        await batch.commit();
      } 
      else if (type === 'chapter') {
        const modId = source.droppableId.replace('chapters-', '');
        const modIndex = curriculum.findIndex(m => m.id === modId);
        
        const newChaps = Array.from(curriculum[modIndex].chapters);
        const [moved] = newChaps.splice(source.index, 1);
        newChaps.splice(destination.index, 0, moved);

        const newCurriculum = [...curriculum];
        newCurriculum[modIndex].chapters = newChaps;
        setCurriculum(newCurriculum);

        const batch = writeBatch(db);
        newChaps.forEach((chap, index) => {
          batch.update(doc(db, `batches/${batchId}/module/${modId}/chapters`, chap.id), { order: index });
        });
        await batch.commit();
      }
      else if (type === 'item') {
        const [, modId, chapId] = source.droppableId.split('-');
        const modIndex = curriculum.findIndex(m => m.id === modId);
        const chapIndex = curriculum[modIndex].chapters.findIndex(c => c.id === chapId);
        
        const newItems = Array.from(curriculum[modIndex].chapters[chapIndex].items);
        const [moved] = newItems.splice(source.index, 1);
        newItems.splice(destination.index, 0, moved);

        const newCurriculum = [...curriculum];
        newCurriculum[modIndex].chapters[chapIndex].items = newItems;
        setCurriculum(newCurriculum);

        const batch = writeBatch(db);
        newItems.forEach((item, index) => {
          const subCol = item.type === 'video' ? 'lectures' : item.type === 'article' ? 'articles' : 'exercises';
          batch.update(doc(db, `batches/${batchId}/module/${modId}/chapters/${chapId}/${subCol}`, item.id), { order: index });
        });
        await batch.commit();
      }
    } catch (error) {
      console.error("Reorder failed.", error);
    }
  };

  // ----------------------------------------------------
  // UI HANDLERS
  // ----------------------------------------------------
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
  // RENDER: CURRICULUM TREE WITH DRAG & DROP
  // ----------------------------------------------------
  const renderTree = () => (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="modules-board" type="module">
        {(providedModule) => (
          <div {...providedModule.droppableProps} ref={providedModule.innerRef} className="space-y-6">
            
            {curriculum.map((mod, modIndex) => (
              <Draggable key={mod.id} draggableId={mod.id} index={modIndex}>
                {(providedModDrag) => (
                  <div 
                    ref={providedModDrag.innerRef} 
                    {...providedModDrag.draggableProps} 
                    className={`rounded-[24px] border overflow-hidden shadow-sm ${isDarkMode ? 'bg-[#151E2E]/50 border-slate-800' : 'bg-white border-slate-200'}`}
                  >
                    <div className={`p-4 lg:p-5 flex items-center justify-between group ${isDarkMode ? 'bg-[#151E2E] hover:bg-slate-800/80' : 'bg-slate-50 hover:bg-slate-100'}`}>
                      <div className="flex items-center gap-4">
                        <button 
                          {...providedModDrag.dragHandleProps} 
                          className={`cursor-grab p-1.5 rounded-lg opacity-50 hover:opacity-100 ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                        >
                          <GripVertical size={18} className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} />
                        </button>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${isDarkMode ? 'bg-slate-800 text-rose-400' : 'bg-rose-100 text-rose-600'}`}><FolderOpen size={20} /></div>
                        <h3 className={`font-black text-lg ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{mod.title}</h3>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* 🚨 NEW: Delete Module Button */}
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteModule(mod.id); }} title="Delete Module" className={`p-2 rounded-lg transition-colors text-rose-500 hover:bg-rose-500/10`}>
                          <Trash2 size={18} />
                        </button>
                        <button onClick={() => toggleModuleLock(mod.id, mod.isLocked)} title={mod.isLocked ? "Unlock Module" : "Lock Module"} className={`p-2 rounded-lg transition-colors ${mod.isLocked ? 'text-rose-500 hover:bg-rose-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}>
                          {mod.isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                        </button>
                        <button onClick={() => handleAddChapter(mod.id)} className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}>+ Add Chapter</button>
                        <button onClick={() => toggleModule(mod.id)} className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}><ChevronDown size={20} className={`transition-transform duration-300 ${expandedModules.includes(mod.id) ? 'rotate-180' : ''}`} /></button>
                      </div>
                    </div>

                    {expandedModules.includes(mod.id) && (
                      <Droppable droppableId={`chapters-${mod.id}`} type="chapter">
                        {(providedChapterDroppable) => (
                          <div 
                            {...providedChapterDroppable.droppableProps} 
                            ref={providedChapterDroppable.innerRef} 
                            className={`p-4 lg:p-6 space-y-4 border-t ${isDarkMode ? 'border-slate-800 bg-[#0B1121]/30' : 'border-slate-200 bg-white'}`}
                          >
                            {mod.chapters.map((chap, chapIndex) => (
                              <Draggable key={chap.id} draggableId={chap.id} index={chapIndex}>
                                {(providedChapDrag) => (
                                  <div 
                                    ref={providedChapDrag.innerRef} 
                                    {...providedChapDrag.draggableProps} 
                                    className={`rounded-2xl border ${isDarkMode ? 'border-slate-700/60 bg-[#151E2E]/80' : 'border-slate-200 bg-slate-50'}`}
                                  >
                                    <div className="p-4 flex items-center justify-between border-b border-transparent hover:border-slate-700/50 group transition-colors">
                                      <div className="flex items-center gap-3">
                                        <button 
                                          {...providedChapDrag.dragHandleProps} 
                                          className={`cursor-grab p-1 rounded opacity-30 hover:opacity-100 ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                                        >
                                          <GripVertical size={16} className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} />
                                        </button>
                                        <Layers size={18} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} />
                                        <h4 className={`font-bold text-base ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{chap.title}</h4>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        {/* 🚨 NEW: Delete Chapter Button */}
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteChapter(mod.id, chap.id); }} title="Delete Chapter" className={`p-1.5 rounded-lg transition-colors text-rose-500 hover:bg-rose-500/10`}>
                                          <Trash2 size={16} />
                                        </button>
                                        <button onClick={() => toggleChapterLock(mod.id, chap.id, chap.isLocked)} title={chap.isLocked ? "Unlock Chapter" : "Lock Chapter"} className={`p-1.5 rounded-lg transition-colors ${chap.isLocked ? 'text-rose-500 hover:bg-rose-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}>
                                          {chap.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                                        </button>
                                        <button onClick={() => toggleChapter(mod.id, chap.id)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}><ChevronDown size={18} className={`transition-transform duration-300 ${expandedChapters.includes(chap.id) ? 'rotate-180' : ''}`} /></button>
                                      </div>
                                    </div>

                                    {expandedChapters.includes(chap.id) && (
                                      <Droppable droppableId={`items-${mod.id}-${chap.id}`} type="item">
                                        {(providedItemDroppable) => (
                                          <div 
                                            {...providedItemDroppable.droppableProps} 
                                            ref={providedItemDroppable.innerRef} 
                                            className={`p-3 border-t ${isDarkMode ? 'border-slate-700/60' : 'border-slate-200'}`}
                                          >
                                            <div className="space-y-2 mb-4">
                                              {chap.items.length === 0 && <div className={`text-center py-4 text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>No content yet</div>}
                                              
                                              {chap.items.map((item, itemIndex) => (
                                                <Draggable key={item.id} draggableId={item.id} index={itemIndex}>
                                                  {(providedItemDrag) => (
                                                    <div 
                                                      ref={providedItemDrag.innerRef} 
                                                      {...providedItemDrag.draggableProps} 
                                                      onClick={() => openEditor(item.type, mod.id, chap.id, item)} 
                                                      className={`p-3 rounded-xl flex items-center justify-between group transition-colors cursor-pointer border border-transparent ${isDarkMode ? 'hover:bg-slate-800/80 hover:border-slate-700 bg-transparent' : 'hover:bg-white hover:border-slate-200 hover:shadow-sm bg-transparent'}`}
                                                    >
                                                      <div className="flex items-center gap-3 ml-2">
                                                        <button 
                                                          {...providedItemDrag.dragHandleProps} 
                                                          onClick={(e) => e.stopPropagation()} 
                                                          className="cursor-grab opacity-0 group-hover:opacity-100 hover:bg-slate-500/20 p-1 rounded transition-opacity"
                                                        >
                                                          <GripVertical size={14} className="text-slate-500" />
                                                        </button>
                                                        <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                                          {item.type === 'video' && <PlaySquare size={16} className="text-emerald-400"/>}
                                                          {item.type === 'article' && <FileText size={16} className="text-amber-400"/>}
                                                          {item.type === 'quiz' && <HelpCircle size={16} className="text-rose-400"/>}
                                                        </div>
                                                        <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900'}`}>{item.title}</span>
                                                      </div>
                                                      
                                                      <div className="flex items-center gap-3">
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
                                                  )}
                                                </Draggable>
                                              ))}
                                              {providedItemDroppable.placeholder}
                                            </div>
                                            
                                            <div className={`pt-3 border-t border-dashed flex gap-2 ml-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                                              <button onClick={() => openEditor('video', mod.id, chap.id)} className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 ${isDarkMode ? 'bg-slate-800/50 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400' : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'}`}><Plus size={14}/> Video</button>
                                              <button onClick={() => openEditor('article', mod.id, chap.id)} className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 ${isDarkMode ? 'bg-slate-800/50 text-slate-400 hover:bg-amber-500/10 hover:text-amber-400' : 'bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-600'}`}><Plus size={14}/> Article</button>
                                              <button onClick={() => openEditor('quiz', mod.id, chap.id)} className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 ${isDarkMode ? 'bg-slate-800/50 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400' : 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600'}`}><Plus size={14}/> Question</button>
                                            </div>
                                          </div>
                                        )}
                                      </Droppable>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {providedChapterDroppable.placeholder}
                          </div>
                        )}
                      </Droppable>
                    )}
                  </div>
                )}
              </Draggable>
            ))}
            {providedModule.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );

  // ----------------------------------------------------
  // RENDER: THE CONTENT EDITORS (SLIDE-OUT DRAWER)
  // ----------------------------------------------------
  const renderEditorDrawer = () => {
    if (!isDrawerOpen) return null;

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

            {editorType === 'article' && (
              <div className="space-y-6 animate-in fade-in">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Content (HTML/Markdown)</label>
                  <textarea rows="12" value={editorContent} onChange={(e) => setEditorContent(e.target.value)} placeholder="Write your lesson here..." className="w-full p-6 rounded-3xl bg-slate-900 border border-slate-700 text-slate-300 font-medium leading-relaxed outline-none focus:border-indigo-500 transition-all" />
                </div>
              </div>
            )}

            {editorType === 'quiz' && (
              <div className="space-y-8 animate-in fade-in">
                <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 flex items-center gap-2 ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}><Type size={14}/> Main Prompt</label>
                  <input type="text" value={quizPrompt} onChange={(e) => setQuizPrompt(e.target.value)} placeholder="e.g., Choose the correct reading..." className={`w-full p-4 rounded-2xl border text-lg font-bold outline-none mb-6 ${isDarkMode ? 'bg-[#0B1121] border-slate-700 text-white focus:border-rose-500' : 'bg-slate-50 border-slate-200 focus:border-rose-400'}`} />
                </div>
              </div>
            )}
          </div>

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