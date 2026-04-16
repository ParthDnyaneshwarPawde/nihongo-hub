import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Lock, PlayCircle, Clock, Trophy, Layers, Target, 
  FileText, ChevronRight, ChevronDown, AlertTriangle, ShieldCheck, 
  Sparkles, X, LayoutGrid, List as ListIcon, Plus, 
  BookOpen, ChevronLeft, Folder, FolderOpen, Zap, Menu, Check, CheckSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ==========================================
// 📦 DUMMY DATA: THE QUESTION BANK TREE
// ==========================================
const OFFICIAL_CATEGORIES = [
  {
    id: "cat_2023", title: "JLPT N4 2023 Papers", papersCount: 2,
    papers: [
      { id: "pyp_2023_dec", title: "JLPT N4 (December 2023)", status: "Not Attempted", duration: 125, questions: 104, difficulty: "Medium", isPremiumLocked: false },
      { id: "pyp_2023_jul", title: "JLPT N4 (July 2023)", status: "Attempted on 12 Mar'26", duration: 125, questions: 104, difficulty: "Medium", isPremiumLocked: false },
    ]
  },
  {
    id: "cat_special", title: "Nihongo Hub Special Mocks", papersCount: 2,
    papers: [
      { id: "mock_01", title: "Ultimate Grammar Drill", status: "Not Attempted", duration: 45, questions: 40, difficulty: "Easy", isPremiumLocked: false },
      { id: "mock_02", title: "Kanji Masterclass Mock", status: "Not Attempted", duration: 60, questions: 50, difficulty: "Hard", isPremiumLocked: true },
    ]
  }
];

// 🌳 The Deep Nested Tree Data
const QUESTION_BANK_TREE = [
  {
    id: "qb_vocab", name: "Vocabulary (言語知識)", type: "folder", icon: <BookOpen size={18}/>,
    children: [
      { id: "qb_v_kanji", name: "Kanji Readings", type: "folder", children: [
        { id: "topic_v_k_n5", name: "N5 Review Kanji", type: "leaf", count: 45 },
        { id: "topic_v_k_n4", name: "N4 Core Kanji", type: "leaf", count: 120 },
      ]},
      { id: "topic_v_ortho", name: "Orthography", type: "leaf", count: 85 },
    ]
  },
  {
    id: "qb_grammar", name: "Grammar (文法)", type: "folder", icon: <Layers size={18}/>,
    children: [
      { id: "qb_g_particles", name: "Particles", type: "folder", children: [
        { id: "topic_g_p_waga", name: "Wa (は) vs Ga (が)", type: "leaf", count: 30 },
        { id: "topic_g_p_nide", name: "Ni (に) vs De (で)", type: "leaf", count: 25 },
      ]},
      { id: "topic_g_conj", name: "Verb Conjugations", type: "leaf", count: 150 },
    ]
  }
];

// ==========================================
// 🌿 RECURSIVE TREE COMPONENT (UPGRADED UI)
// ==========================================
const TreeNode = ({ node, level = 0, selectedTopics, toggleTopic, isDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isLeaf = node.type === "leaf";
  const isSelected = selectedTopics.includes(node.id);

  if (isLeaf) {
    return (
      <div 
        onClick={() => toggleTopic(node.id)}
        className={`flex items-center justify-between py-3 px-4 rounded-xl cursor-pointer transition-all duration-200 mt-1 relative
          ${isSelected 
            ? isDarkMode 
              ? 'bg-indigo-500/20 border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
              : 'bg-indigo-50 border border-indigo-200 shadow-sm'
            : isDarkMode 
              ? 'bg-transparent border border-transparent hover:bg-slate-800/60' 
              : 'bg-transparent border border-transparent hover:bg-slate-50'}`}
      >
        <div className="flex items-center gap-3 relative z-10">
          {/* Custom Checkbox */}
          <div className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition-all duration-200
            ${isSelected 
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/30' 
              : isDarkMode ? 'border-slate-600 text-transparent' : 'border-slate-300 bg-white text-transparent'}`}>
            <Check size={14} strokeWidth={4} />
          </div>
          <span className={`text-sm font-bold ${isSelected ? (isDarkMode ? 'text-indigo-100' : 'text-indigo-900') : (isDarkMode ? 'text-slate-300' : 'text-slate-700')}`}>
            {node.name}
          </span>
        </div>
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-md tracking-wide
          ${isSelected 
            ? isDarkMode ? 'bg-indigo-500/30 text-indigo-300' : 'bg-indigo-100 text-indigo-600'
            : isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
          {node.count} Qs
        </span>
      </div>
    );
  }

  return (
    <div className="relative mt-2">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all duration-200 group border
          ${level === 0 
            ? isDarkMode 
              ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600' 
              : 'bg-white border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md'
            : isDarkMode 
              ? 'bg-transparent border-transparent hover:bg-slate-800/40' 
              : 'bg-transparent border-transparent hover:bg-slate-50'}`}
      >
        <div className={`flex items-center gap-3 font-black text-base transition-colors ${isOpen ? (isDarkMode ? 'text-indigo-400' : 'text-indigo-600') : (isDarkMode ? 'text-slate-200' : 'text-slate-800')}`}>
          <span className={`transition-colors ${isOpen ? (isDarkMode ? 'text-indigo-400' : 'text-indigo-600') : (isDarkMode ? 'text-slate-500' : 'text-slate-400')}`}>
            {isOpen ? <FolderOpen size={20} /> : <Folder size={20} />}
          </span>
          {node.name}
        </div>
        <ChevronDown size={18} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-500' : (isDarkMode ? 'text-slate-500' : 'text-slate-400')}`} />
      </button>
      
      {/* Children Container with Epic Tree Line */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
        <div className={`relative pl-4 ml-6 space-y-1 py-2 border-l-2 ${isDarkMode ? 'border-slate-700/50' : 'border-slate-200'}`}>
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} level={level + 1} selectedTopics={selectedTopics} toggleTopic={toggleTopic} isDarkMode={isDarkMode} />
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 🚀 MAIN EXAM HUB COMPONENT
// ==========================================
export default function ExamHub({ isDarkMode = true, setSidebarOpen }) {
  const navigate = useNavigate();
  
  useEffect(() => {
    if (setSidebarOpen) setSidebarOpen(false);
  }, [setSidebarOpen]);

  const [activeTab, setActiveTab] = useState('custom'); 
  const [viewMode, setViewMode] = useState('list'); 
  const [expandedCats, setExpandedCats] = useState(['cat_2023']); 
  const [selectedTestToStart, setSelectedTestToStart] = useState(null); 
  const [countdown, setCountdown] = useState(null); 
  const [isCustomDrawerOpen, setIsCustomDrawerOpen] = useState(false);
  const [customStep, setCustomStep] = useState(1);
  const [customForm, setCustomForm] = useState({ level: 'JLPT N4', topics: [], numQs: 20, duration: 25 });
  const [savedCustomTests, setSavedCustomTests] = useState([
    { id: "ct_1", title: "Grammar Weakness Target", date: "22 Mar 2026", status: "Not Attempted" }
  ]);

  useEffect(() => {
    let timer;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      navigate('/test-engine');
    }
    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  const confirmStartTest = () => {
    setSelectedTestToStart(null);
    setCountdown(3); 
  };

  // ------------------------------------------
  // UI: OFFICIAL TAB (LIST & GRID)
  // ------------------------------------------
  // ------------------------------------------
  // UI: OFFICIAL TAB (LIST & GRID)
  // ------------------------------------------
  const renderOfficialTests = () => {
    if (viewMode === 'list') {
      return (
        <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {OFFICIAL_CATEGORIES.map(category => {
            const isExpanded = expandedCats.includes(category.id);
            return (
              <div key={category.id} className={`rounded-3xl border overflow-hidden transition-all duration-300 shadow-sm ${isDarkMode ? 'bg-[#151E2E]/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                <button 
                  onClick={() => setExpandedCats(prev => isExpanded ? prev.filter(id => id !== category.id) : [...prev, category.id])}
                  className={`w-full p-6 flex justify-between items-center transition-colors ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                      <FileText size={20} />
                    </div>
                    <div className="text-left">
                      <h3 className={`font-black text-lg ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{category.title}</h3>
                      <p className={`text-xs font-bold mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{category.papersCount} Official Papers Available</p>
                    </div>
                  </div>
                  <ChevronDown size={24} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-indigo-500' : 'text-slate-400'}`} />
                </button>

                {isExpanded && (
                  <div className={`border-t flex flex-col divide-y ${isDarkMode ? 'border-slate-800/50 divide-slate-800/50' : 'border-slate-100 divide-slate-100'}`}>
                    {category.papers.map(paper => {
                      const isAttempted = paper.status.includes('Attempted');
                      return (
                        <div key={paper.id} onClick={() => setSelectedTestToStart(paper)} className={`p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all duration-200 group
                          ${isDarkMode ? 'hover:bg-slate-800/80' : 'hover:bg-slate-50'}`}>
                          
                          <div className="flex items-start gap-4">
                            <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shadow-sm ${isAttempted ? 'bg-emerald-500 shadow-emerald-500/50' : paper.isPremiumLocked ? 'bg-amber-500 shadow-amber-500/50' : 'bg-indigo-500 shadow-indigo-500/50'}`}></div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className={`font-black text-base transition-colors ${isDarkMode ? 'text-slate-300 group-hover:text-white' : 'text-slate-700 group-hover:text-indigo-600'}`}>
                                  {paper.title}
                                </h4>
                                {paper.isPremiumLocked && <Lock size={14} className="text-amber-500" />}
                              </div>
                              <p className={`text-[11px] mt-1 font-black uppercase tracking-widest ${isAttempted ? 'text-emerald-500' : 'text-slate-500'}`}>{paper.status}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className={`hidden md:flex items-center gap-3 text-xs font-bold`}>
                              {/* 🚨 FIXED: Dynamic Light/Dark Mode Pills */}
                              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${isDarkMode ? 'bg-slate-800/50 text-slate-300' : 'bg-indigo-50 text-indigo-700'}`}>
                                <Clock size={14} className={isDarkMode ? "text-indigo-400" : "text-indigo-600"}/> {paper.duration}m
                              </span>
                              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${isDarkMode ? 'bg-slate-800/50 text-slate-300' : 'bg-rose-50 text-rose-700'}`}>
                                <Target size={14} className={isDarkMode ? "text-rose-400" : "text-rose-600"}/> {paper.questions} Qs
                              </span>
                            </div>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg
                              ${isDarkMode ? 'bg-slate-800 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-indigo-600/20' : 'bg-indigo-50 text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-indigo-600/30'}`}>
                              <PlayCircle size={20} className="ml-0.5" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    } 

    // GRID VIEW
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
        {OFFICIAL_CATEGORIES.flatMap(cat => cat.papers).map(paper => (
          <div key={paper.id} onClick={() => setSelectedTestToStart(paper)} className={`border rounded-[32px] p-8 cursor-pointer transition-all duration-300 group hover:-translate-y-2
            ${isDarkMode ? 'bg-gradient-to-b from-[#151E2E] to-[#0B1121] border-slate-800 hover:border-indigo-500/50 hover:shadow-[0_10px_40px_rgba(99,102,241,0.1)]' : 'bg-white border-slate-200 hover:border-indigo-400 shadow-sm hover:shadow-xl'}`}>
            
            <div className="flex justify-between items-start mb-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors shadow-lg
                ${isDarkMode ? 'bg-slate-800 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white shadow-black/50' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white shadow-indigo-600/10'}`}>
                <FileText size={28} />
              </div>
              {paper.isPremiumLocked && (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                  <Lock size={12}/> Pro
                </div>
              )}
            </div>
            
            <h3 className={`text-xl font-black mb-3 line-clamp-2 leading-snug ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{paper.title}</h3>
            <p className={`text-xs font-black uppercase tracking-widest mb-6 ${paper.status.includes('Attempted') ? 'text-emerald-500' : 'text-slate-500'}`}>{paper.status}</p>
            
            <div className={`flex items-center gap-4 pt-6 border-t mb-6 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <span className={`text-xs font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><Clock size={14}/> {paper.duration}m</span>
              <span className={`text-xs font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><Target size={14}/> {paper.questions} Qs</span>
            </div>

            {/* 🚨 FIXED: Grid view button dynamic colors */}
            <button className={`w-full py-3.5 font-bold rounded-xl transition-colors
              ${isDarkMode ? 'bg-slate-800 text-white group-hover:bg-indigo-600' : 'bg-slate-100 text-slate-700 group-hover:bg-indigo-600 group-hover:text-white'}`}>
              Start Paper
            </button>
          </div>
        ))}
      </div>
    );
  };

  // ------------------------------------------
  // UI: CUSTOM TESTS TAB
  // ------------------------------------------
  const renderCustomTests = () => (
    <div className="max-w-4xl mx-auto h-full flex flex-col animate-in fade-in duration-500 relative">
      
      {savedCustomTests.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="w-32 h-32 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 relative">
            <Sparkles size={48} className="text-indigo-400 absolute animate-pulse" />
            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full"></div>
          </div>
          <h2 className={`text-3xl font-black mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Design Your Drill</h2>
          <p className={`max-w-md font-medium leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Target specific weaknesses. Mix Kanji with Grammar, set your own timers, and generate endless unique mock tests from the master question bank.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 pb-32">
           {savedCustomTests.map(test => (
            <div key={test.id} className={`p-6 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-all duration-300 group
              ${isDarkMode ? 'bg-[#151E2E]/80 border-slate-800 hover:border-indigo-500/50 hover:bg-[#151E2E]' : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-lg shadow-sm'}`}>
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-colors
                  ${isDarkMode ? 'bg-slate-800 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className={`font-black text-xl mb-1 transition-colors ${isDarkMode ? 'text-slate-200 group-hover:text-white' : 'text-slate-800 group-hover:text-indigo-700'}`}>{test.title}</h3>
                  <div className={`flex items-center gap-3 text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    <span className="text-indigo-500">{customForm.level}</span> • <span>{test.date}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedTestToStart(test)} className={`w-full sm:w-auto px-8 py-3.5 text-white font-black rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2
                ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20' : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-500/30'}`}>
                Launch <PlayCircle size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button for Custom Builder */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4">
        <button 
          onClick={() => setIsCustomDrawerOpen(true)}
          className={`w-full py-4 font-black rounded-2xl transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-2 text-lg
            ${isDarkMode 
              ? 'bg-white text-indigo-900 hover:bg-slate-200 shadow-white/10' 
              : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 shadow-indigo-600/40'}`}
        >
          <Plus size={24} /> Create Custom Test
        </button>
      </div>
    </div>
  );

  // ------------------------------------------
  // UI: CUSTOM TEST DRAWER (THE FORGE WIZARD)
  // ------------------------------------------
  const renderCustomDrawer = () => {
    if (!isCustomDrawerOpen) return null;

    const toggleTopic = (id) => {
      setCustomForm(prev => ({
        ...prev, topics: prev.topics.includes(id) ? prev.topics.filter(t => t !== id) : [...prev.topics, id]
      }));
    };

    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in" onClick={() => setIsCustomDrawerOpen(false)}></div>
        
        <div className={`relative w-full max-w-md h-full flex flex-col animate-in slide-in-from-right duration-300 shadow-[[-20px_0_40px_rgba(0,0,0,0.1)]]
          ${isDarkMode ? 'bg-[#0F172A] border-l border-slate-800' : 'bg-slate-50 border-l border-slate-200'}`}>
          
          {/* Drawer Header (Premium Look) */}
          <div className={`p-6 border-b flex justify-between items-center shrink-0 ${isDarkMode ? 'border-slate-800 bg-[#151E2E]' : 'border-slate-200 bg-white'}`}>
            <div>
              <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Test Forge</h2>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Step {customStep} of 2</p>
            </div>
            <button onClick={() => setIsCustomDrawerOpen(false)} className={`p-2.5 rounded-xl transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}>
              <X size={20} />
            </button>
          </div>

          <div className={`flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar ${isDarkMode ? '' : 'bg-slate-50'}`}>
            
            {/* Step 1: The Skill Tree */}
            {customStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div>
                  <h3 className={`text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <FolderOpen size={16}/> Select Question Banks
                  </h3>
                  {/* Tree Container */}
                  <div className={`p-2 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
                    {QUESTION_BANK_TREE.map(node => (
                      <TreeNode key={node.id} node={node} selectedTopics={customForm.topics} toggleTopic={toggleTopic} isDarkMode={isDarkMode} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Settings */}
            {customStep === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div>
                  <label className={`text-xs font-black uppercase tracking-widest block mb-4 flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <Target size={16}/> Total Questions
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[10, 20, 30, 40, 50, 'Max'].map(num => (
                      <button key={num} onClick={() => setCustomForm({...customForm, numQs: num})}
                        className={`py-4 rounded-xl border-2 font-black text-lg transition-all
                          ${customForm.numQs === num 
                            ? isDarkMode 
                              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 shadow-lg shadow-indigo-500/10' 
                              : 'border-indigo-500 bg-indigo-50 text-indigo-600 shadow-md shadow-indigo-500/10'
                            : isDarkMode 
                              ? 'border-slate-800 bg-[#151E2E] text-slate-400 hover:border-slate-600' 
                              : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-slate-50'}`}>
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-black uppercase tracking-widest block mb-4 flex justify-between items-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span className="flex items-center gap-2"><Clock size={16}/> Time Limit</span>
                  </label>
                  <div className={`flex items-center justify-between p-3 rounded-2xl border-2 shadow-sm ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <button onClick={() => setCustomForm({...customForm, duration: Math.max(5, customForm.duration - 5)})} className={`px-5 py-3 rounded-xl font-black text-xl transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>-</button>
                    <div className="text-center">
                      <span className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{customForm.duration}</span>
                      <span className={`font-bold ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>min</span>
                    </div>
                    <button onClick={() => setCustomForm({...customForm, duration: customForm.duration + 5})} className={`px-5 py-3 rounded-xl font-black text-xl transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>+</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer Actions */}
          <div className={`p-6 border-t shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] ${isDarkMode ? 'border-slate-800 bg-[#151E2E]' : 'border-slate-200 bg-white'}`}>
            <div className="flex gap-4">
              {customStep === 2 && (
                <button onClick={() => setCustomStep(1)} className={`p-4 rounded-2xl border-2 transition-colors ${isDarkMode ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
                  <ChevronLeft size={24} />
                </button>
              )}
              
              {customStep === 1 ? (
                <button 
                  disabled={customForm.topics.length === 0}
                  onClick={() => setCustomStep(2)} 
                  className={`flex-1 py-4.5 text-white font-black text-lg rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2
                    ${customForm.topics.length === 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                    ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20' : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-500/30'}`}
                >
                  Configure Rules <ChevronRight size={20}/>
                </button>
              ) : (
                <button onClick={() => {
                  const newTest = { id: `ct_${Date.now()}`, title: `Custom Drill (${customForm.topics.length} topics)`, date: "Just now", status: "Not Attempted" };
                  setSavedCustomTests([newTest, ...savedCustomTests]);
                  setIsCustomDrawerOpen(false);
                  setCustomStep(1); 
                }} className={`flex-1 py-4.5 text-white font-black text-lg rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2
                  ${isDarkMode ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-emerald-500/30'}`}>
                  <CheckSquare size={20}/> Generate Test
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ------------------------------------------
  // UI: FULLSCREEN OVERLAYS (MODAL & EPIC COUNTDOWN)
  // ------------------------------------------
  const renderOverlays = () => {
    if (countdown !== null) {
      return (
        <div className="fixed inset-0 z-[200] bg-[#0B1121] flex flex-col items-center justify-center animate-in fade-in duration-300 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
             <div className="w-[300px] h-[300px] rounded-full border border-indigo-500/30 animate-ping" style={{animationDuration: '1s'}}></div>
             <div className="absolute w-[600px] h-[600px] rounded-full border border-indigo-500/10 animate-ping" style={{animationDuration: '1.5s', animationDelay: '0.2s'}}></div>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4 text-center z-10 tracking-tight">Prepare Yourself</h2>
          <p className="text-lg md:text-xl text-indigo-400 font-black uppercase tracking-widest mb-16 z-10">Test commencing in</p>
          <div className="relative flex items-center justify-center z-10">
            <div className="text-[120px] md:text-[200px] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 animate-pulse">
              {countdown}
            </div>
          </div>
        </div>
      );
    }

    if (selectedTestToStart) {
      return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setSelectedTestToStart(null)}></div>
          <div className={`relative w-full max-w-md p-8 lg:p-10 rounded-[32px] shadow-2xl animate-in zoom-in-95 duration-200 border text-center
            ${isDarkMode ? 'bg-[#151E2E] border-slate-700 shadow-black' : 'bg-white border-slate-100 shadow-indigo-900/10'}`}>
            
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3 shadow-inner
              ${isDarkMode ? 'bg-indigo-500/10 text-indigo-500' : 'bg-indigo-50 text-indigo-600'}`}>
              <ShieldCheck size={40} className="-rotate-3" />
            </div>
            
            <h3 className={`text-2xl font-black mb-3 leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Initiate {selectedTestToStart.title}?</h3>
            <p className={`text-sm mb-10 leading-relaxed font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Ensure you have a stable connection and {selectedTestToStart.duration || customForm.duration} minutes of uninterrupted time.
            </p>
            
            <div className="space-y-3">
              <button onClick={confirmStartTest} className={`w-full py-4.5 text-white font-black text-lg rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2
                ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30' : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-500/30'}`}>
                Launch <PlayCircle size={20}/>
              </button>
              <button onClick={() => setSelectedTestToStart(null)} className={`w-full py-4 font-bold rounded-2xl transition-colors
                ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // ------------------------------------------
  // MAIN RENDER
  // ------------------------------------------
  return (
    <div className={`h-full w-full flex flex-col font-sans overflow-hidden transition-colors duration-500 relative
      ${isDarkMode ? 'bg-[#0B1121] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Background Ambient Glow */}
      {isDarkMode ? (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      ) : (
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none"></div>
      )}

      <header className={`shrink-0 pt-6 px-6 lg:px-12 border-b relative z-20 transition-colors duration-500
        ${isDarkMode ? 'border-slate-800/80 bg-[#0B1121]/95 backdrop-blur-md' : 'border-slate-200 bg-white/95 backdrop-blur-md'}`}>
        
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <button className="sm:hidden p-2 -ml-2 text-slate-400 hover:bg-slate-800 rounded-lg"><Menu size={24}/></button>
            <h1 className={`text-3xl lg:text-4xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Mock Tests</h1>
          </div>
        </div>

        <div className="flex justify-between items-end border-b border-transparent">
          <div className="flex gap-6 lg:gap-8">
            <button onClick={() => setActiveTab('official')} className={`pb-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'official' ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>
              PYQ & Official
            </button>
            <button onClick={() => setActiveTab('custom')} className={`pb-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'custom' ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>
              Custom Tests
            </button>
          </div>

          {activeTab === 'official' && (
            <div className={`flex p-1.5 rounded-xl mb-2 border shadow-inner ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? (isDarkMode ? 'bg-slate-700 text-white shadow-md' : 'bg-white text-indigo-600 shadow-sm') : 'text-slate-500 hover:text-slate-400'}`}>
                <ListIcon size={18} />
              </button>
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? (isDarkMode ? 'bg-slate-700 text-white shadow-md' : 'bg-white text-indigo-600 shadow-sm') : 'text-slate-500 hover:text-slate-400'}`}>
                <LayoutGrid size={18} />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 lg:p-10 custom-scrollbar relative z-10 pb-32">
        {activeTab === 'official' && renderOfficialTests()}
        {activeTab === 'custom' && renderCustomTests()}
      </main>

      {renderCustomDrawer()}
      {renderOverlays()}
    </div>
  );
}