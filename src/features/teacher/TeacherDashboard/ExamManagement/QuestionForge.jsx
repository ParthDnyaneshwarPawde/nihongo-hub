import React, { useState } from 'react';
import { 
  Save, X, Trash2, CheckCircle2, Circle, 
  Volume2, Type, BookOpen, Layers, Target, Clock, FileText, AlertCircle, PlayCircle, FolderOpen, ChevronRight, Bookmark
} from 'lucide-react';

// ==========================================
// 📦 DUMMY DATA: TEACHER'S CURRICULUM
// ==========================================
const TEACHER_BATCHES = [
  {
    id: 'batch_n4', name: 'JLPT N4 The Bridge', 
    modules: [
      { id: 'mod_1', name: 'Module 1: Vocab & Kanji', topics: ['Daily Life Kanji', 'Office & Work', 'Context Expressions'] },
      { id: 'mod_2', name: 'Module 2: Grammar', topics: ['Advanced Particles', 'Causative Verbs', 'Honorifics'] }
    ]
  },
  {
    id: 'batch_n5', name: 'JLPT N5 Crash Course', 
    modules: [
      { id: 'mod_n5_1', name: 'Module 1: Basics', topics: ['Hiragana', 'Katakana', 'Greetings'] }
    ]
  }
];

// ==========================================
// 🚀 MAIN COMPONENT
// ==========================================
export default function QuestionForge({ isDarkMode = true, onClose }) {
  // --- Form State ---
  const [qType, setQType] = useState('vocab'); 
  const [difficulty, setDifficulty] = useState('Medium');
  
  // --- Curriculum Routing State ---
  const [selectedBatch, setSelectedBatch] = useState(TEACHER_BATCHES[0].id);
  const activeBatch = TEACHER_BATCHES.find(b => b.id === selectedBatch) || TEACHER_BATCHES[0];
  
  const [selectedModule, setSelectedModule] = useState(activeBatch.modules[0].id);
  const activeModule = activeBatch.modules.find(m => m.id === selectedModule) || activeBatch.modules[0];
  
  const [selectedTopic, setSelectedTopic] = useState(activeModule.topics[0]);

  // --- Content State ---
  const [prompt, setPrompt] = useState('');
  const [sentence, setSentence] = useState('');
  const [highlightedWord, setHighlightedWord] = useState('');
  const [explanation, setExplanation] = useState('');
  const [idealTime, setIdealTime] = useState(45);
  
  // --- Media State ---
  const [mediaFile, setMediaFile] = useState(null); 
  const [mediaPreview, setMediaPreview] = useState(null);
  
  // --- Options State ---
  const [options, setOptions] = useState([
    { id: 1, text: '', isCorrect: true },
    { id: 2, text: '', isCorrect: false },
    { id: 3, text: '', isCorrect: false },
    { id: 4, text: '', isCorrect: false },
  ]);

  // --- Handlers ---
  const handleOptionChange = (id, text) => {
    setOptions(options.map(opt => opt.id === id ? { ...opt, text } : opt));
  };

  const setCorrectOption = (id) => {
    setOptions(options.map(opt => ({ ...opt, isCorrect: opt.id === id })));
  };

  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = () => {
    if (!prompt) return alert("Please enter a prompt.");
    if (options.some(opt => !opt.text)) return alert("Please fill in all options.");
    
    const newQuestion = {
      type: qType,
      curriculum: { batch: selectedBatch, module: selectedModule, topic: selectedTopic },
      difficulty,
      prompt,
      sentence,
      highlightedWord,
      explanation,
      idealTimeSeconds: idealTime,
      options: options.map(opt => ({ text: opt.text, isCorrect: opt.isCorrect })),
    };

    console.log("Forging Question:", newQuestion);
    alert("Question forged successfully! (Check console)");
    if(onClose) onClose();
  };

  // --- UI Helpers ---
  const typeIcons = {
    vocab: <BookOpen size={18} />,
    grammar: <Layers size={18} />,
    listening: <Target size={18} />
  };

  return (
    <div className={`flex flex-col h-full font-sans transition-colors duration-500 ${isDarkMode ? 'bg-[#0B1121] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Header */}
      <header className={`shrink-0 p-6 lg:px-10 border-b flex justify-between items-center transition-colors z-10 shadow-sm
        ${isDarkMode ? 'border-slate-800/80 bg-[#151E2E]/95 backdrop-blur-md' : 'border-slate-200 bg-white/95 backdrop-blur-md'}`}>
        <div>
          <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>The Question Forge</h2>
          <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Create new database entry</p>
        </div>
        {onClose && (
          <button onClick={onClose} className={`p-2.5 rounded-xl transition-colors ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}>
            <X size={24} />
          </button>
        )}
      </header>

      {/* Main Form Area */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-10 custom-scrollbar space-y-6 lg:space-y-8 pb-32">
        
        {/* ROW 1: CURRICULUM ROUTING */}
        <div className={`p-6 lg:p-8 rounded-[32px] border transition-colors shadow-sm
          ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
          <label className={`text-xs font-black uppercase tracking-widest block mb-5 flex items-center gap-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
            <FolderOpen size={16}/> Question Placement Routing
          </label>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Batch Select */}
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}><Bookmark size={18}/></span>
              <select 
                value={selectedBatch} 
                onChange={(e) => {
                  setSelectedBatch(e.target.value);
                  const newBatch = TEACHER_BATCHES.find(b => b.id === e.target.value);
                  setSelectedModule(newBatch.modules[0].id);
                  setSelectedTopic(newBatch.modules[0].topics[0]);
                }}
                className={`w-full pl-12 pr-4 py-4 rounded-2xl border text-sm font-bold outline-none appearance-none cursor-pointer transition-all
                  ${isDarkMode ? 'bg-[#0B1121] border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400 focus:bg-white'}`}
              >
                {TEACHER_BATCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {/* Module Select */}
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}><Layers size={18}/></span>
              <select 
                value={selectedModule} 
                onChange={(e) => {
                  setSelectedModule(e.target.value);
                  const newMod = activeBatch.modules.find(m => m.id === e.target.value);
                  setSelectedTopic(newMod.topics[0]);
                }}
                className={`w-full pl-12 pr-4 py-4 rounded-2xl border text-sm font-bold outline-none appearance-none cursor-pointer transition-all
                  ${isDarkMode ? 'bg-[#0B1121] border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400 focus:bg-white'}`}
              >
                {activeBatch.modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>

            {/* Topic Select */}
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}><FileText size={18}/></span>
              <select 
                value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)}
                className={`w-full pl-12 pr-4 py-4 rounded-2xl border text-sm font-bold outline-none appearance-none cursor-pointer transition-all
                  ${isDarkMode ? 'bg-[#0B1121] border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400 focus:bg-white'}`}
              >
                {activeModule.topics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ROW 2: METADATA */}
        <div className={`p-6 lg:p-8 rounded-[32px] border flex flex-col md:flex-row gap-6 shadow-sm
          ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex-1">
            <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Question Type</label>
            <div className={`flex gap-2 p-1.5 rounded-2xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-100 border-slate-200'}`}>
              {['vocab', 'grammar', 'listening'].map(type => (
                <button 
                  key={type} onClick={() => setQType(type)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 capitalize transition-all
                    ${qType === type 
                      ? isDarkMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-indigo-700 shadow-sm border border-slate-200' 
                      : isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                >
                  {typeIcons[type]} <span className="hidden sm:inline">{type}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="w-full md:w-56">
            <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Difficulty Base</label>
            <select 
              value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
              className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none appearance-none cursor-pointer transition-colors
                ${difficulty === 'Easy' ? 'text-emerald-500' : difficulty === 'Medium' ? 'text-amber-500' : 'text-rose-500'}
                ${isDarkMode ? 'bg-[#0B1121] border-slate-700 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-400 focus:bg-white'}`}
            >
              <option value="Easy">Easy (Low XP)</option>
              <option value="Medium">Medium (Base XP)</option>
              <option value="Hard">Hard (Bonus XP)</option>
            </select>
          </div>
        </div>

        {/* ROW 3: CORE CONTENT */}
        <div className={`p-6 lg:p-8 rounded-[32px] border space-y-6 shadow-sm ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
          
          <div>
            <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 flex items-center gap-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
              <Type size={14}/> Main Prompt
            </label>
            <input 
              type="text" 
              placeholder="e.g., Choose the correct reading for the highlighted word."
              value={prompt} onChange={(e) => setPrompt(e.target.value)}
              className={`w-full p-4.5 rounded-2xl border text-lg font-bold outline-none transition-all
                ${isDarkMode ? 'bg-[#0B1121] border-slate-700 text-white focus:border-indigo-500 focus:shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_15px_rgba(99,102,241,0.1)]'}`}
            />
          </div>

          {/* Conditional Media Upload for Listening */}
          {qType === 'listening' && (
            <div className="animate-in fade-in slide-in-from-top-4">
              <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 flex items-center gap-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                <Volume2 size={14}/> Audio Source
              </label>
              <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300
                ${isDarkMode ? 'border-slate-700 bg-[#0B1121] hover:border-indigo-500/50 hover:bg-indigo-500/5' : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50'}`}>
                {mediaPreview ? (
                  <div className={`flex items-center justify-between p-4 rounded-xl border ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white border-indigo-200 shadow-sm'}`}>
                    <div className="flex items-center gap-3 text-indigo-500 font-bold">
                      <PlayCircle size={24} /> {mediaFile?.name}
                    </div>
                    <button onClick={() => { setMediaFile(null); setMediaPreview(null); }} className="text-rose-500 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-400 shadow-sm border border-slate-200'}`}>
                      <Volume2 size={28} />
                    </div>
                    <p className={`text-sm font-bold mb-5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Drag and drop audio file, or click to browse</p>
                    <label className={`cursor-pointer px-6 py-3 font-black rounded-xl transition-all shadow-sm active:scale-95 inline-block
                      ${isDarkMode ? 'bg-slate-800 text-white hover:bg-indigo-600 hover:shadow-indigo-600/20' : 'bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'}`}>
                      Browse Files
                      <input type="file" accept="audio/*" className="hidden" onChange={handleMediaUpload} />
                    </label>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Sentence & Context (Useful for Vocab/Grammar) */}
          {qType !== 'listening' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4">
              <div className="md:col-span-2">
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Context Sentence (Optional)</label>
                <textarea 
                  rows="2"
                  placeholder="e.g., 毎日 [電車] で学校に行きます。"
                  value={sentence} onChange={(e) => setSentence(e.target.value)}
                  className={`w-full p-4.5 rounded-2xl border text-base font-bold outline-none resize-none transition-all
                    ${isDarkMode ? 'bg-[#0B1121] border-slate-700 text-white focus:border-indigo-500 focus:shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_15px_rgba(99,102,241,0.1)]'}`}
                />
                <p className={`text-[11px] mt-2 font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Use brackets [ ] to indicate where the highlighted word belongs.</p>
              </div>
              
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Highlighted Target</label>
                <input 
                  type="text" 
                  placeholder="e.g., 電車"
                  value={highlightedWord} onChange={(e) => setHighlightedWord(e.target.value)}
                  className={`w-full p-4.5 rounded-2xl border text-base font-bold outline-none transition-all
                    ${isDarkMode ? 'bg-[#0B1121] border-slate-700 text-white focus:border-indigo-500 focus:shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_15px_rgba(99,102,241,0.1)]'}`}
                />
              </div>
            </div>
          )}
        </div>

        {/* ROW 4: OPTIONS */}
        <div className={`p-6 lg:p-8 rounded-[32px] border space-y-6 shadow-sm ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-center mb-4">
            <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
              <CheckCircle2 size={16}/> Answer Options
            </label>
            <span className={`text-[11px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Click the circle to set the correct answer</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            {options.map((opt, idx) => (
              <div key={opt.id} className={`flex items-center p-3.5 rounded-2xl border-2 transition-all duration-300 group
                ${opt.isCorrect 
                  ? isDarkMode ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-emerald-500 bg-emerald-50 shadow-sm' 
                  : isDarkMode ? 'border-slate-700 bg-[#0B1121] focus-within:border-indigo-500 hover:border-slate-600' : 'border-slate-200 bg-slate-50 focus-within:border-indigo-400 focus-within:bg-white hover:border-slate-300'}`}>
                
                <button 
                  onClick={() => setCorrectOption(opt.id)}
                  className={`p-3 rounded-xl transition-colors shrink-0 
                    ${opt.isCorrect 
                      ? 'text-emerald-500' 
                      : isDarkMode ? 'text-slate-600 hover:text-slate-400 hover:bg-slate-800' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-200'}`}
                >
                  {opt.isCorrect ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </button>
                
                <div className={`w-px h-10 mx-2 transition-colors ${opt.isCorrect ? (isDarkMode ? 'bg-emerald-500/30' : 'bg-emerald-200') : (isDarkMode ? 'bg-slate-700' : 'bg-slate-200')}`}></div>
                
                <input 
                  type="text" 
                  placeholder={`Option ${['A', 'B', 'C', 'D'][idx]}`}
                  value={opt.text}
                  onChange={(e) => handleOptionChange(opt.id, e.target.value)}
                  className={`flex-1 bg-transparent border-none outline-none font-bold text-lg px-3 placeholder:text-slate-400 transition-colors
                    ${isDarkMode ? 'text-white' : 'text-slate-900'} ${opt.isCorrect ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ROW 5: SOLUTION & DATA */}
        <div className={`p-6 lg:p-8 rounded-[32px] border flex flex-col lg:flex-row gap-8 shadow-sm ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex-1">
             <label className={`text-[10px] font-black uppercase tracking-widest block mb-4 flex items-center gap-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
              <AlertCircle size={14}/> Sensei's Explanation
            </label>
            <textarea 
              rows="4"
              placeholder="Explain why the correct answer is right, and why the others are wrong..."
              value={explanation} onChange={(e) => setExplanation(e.target.value)}
              className={`w-full p-4.5 rounded-2xl border text-sm font-medium outline-none resize-none transition-all
                ${isDarkMode ? 'bg-[#0B1121] border-slate-700 text-white focus:border-indigo-500 focus:shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_15px_rgba(99,102,241,0.1)]'}`}
            />
          </div>

          <div className={`w-full lg:w-72 p-6 rounded-2xl border ${isDarkMode ? 'bg-[#0B1121] border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
            <label className={`text-[10px] font-black uppercase tracking-widest block mb-6 flex items-center justify-between ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <span className="flex items-center gap-1.5"><Clock size={14}/> Ideal Time</span>
              <span className={`text-base ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{idealTime}s</span>
            </label>
            <input 
              type="range" min="10" max="120" step="5"
              value={idealTime} onChange={(e) => setIdealTime(parseInt(e.target.value))}
              className="w-full accent-indigo-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className={`flex justify-between mt-3 text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <span>Fast (10s)</span>
              <span>Deep (120s)</span>
            </div>
          </div>
        </div>

      </main>

      {/* Footer Actions (Sticky) */}
      <footer className={`absolute bottom-0 left-0 right-0 p-6 border-t flex justify-end gap-4 backdrop-blur-xl z-20 transition-colors
        ${isDarkMode ? 'border-slate-800 bg-[#0B1121]/80' : 'border-slate-200 bg-white/80'}`}>
        {onClose && (
          <button onClick={onClose} className={`px-6 py-4 font-bold rounded-2xl transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
            Discard
          </button>
        )}
        <button onClick={handleSave} className={`px-10 py-4 text-white font-black text-lg rounded-2xl transition-all shadow-xl active:scale-95 flex items-center gap-3
          ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30' : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-500/40'}`}>
          <Save size={20} /> Forge Entry
        </button>
      </footer>
    </div>
  );
}