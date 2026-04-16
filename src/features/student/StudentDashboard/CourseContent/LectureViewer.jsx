import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, MessageSquare, PlayCircle, FileText, HelpCircle, 
  ChevronDown, Download, Send, PlaySquare, CheckCircle2, Clock, 
  ThumbsUp, User, Maximize, PanelLeftClose, PanelLeftOpen, 
  PanelRightClose, PanelRightOpen, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ==========================================
// 📦 DUMMY DATA
// ==========================================
const COURSE_DATA = {
  title: "JLPT N4 The Bridge",
  progress: 34,
  chapters: [
    {
      id: "chap_1", title: "Chapter 1: Daily Life Kanji",
      items: [
        { id: "item_1", type: "video", title: "Welcome & Strategy", duration: "12:45", isCompleted: true },
        { id: "item_2", type: "article", title: "Kanji Radical Cheat Sheet", duration: "5 min read", isCompleted: true },
        { id: "item_3", type: "video", title: "Mastering the 'Water' Radical", duration: "18:20", isCompleted: false },
        { id: "item_4", type: "quiz", title: "Chapter 1 Checkpoint", duration: "10 Qs", isCompleted: false }
      ]
    },
    {
      id: "chap_2", title: "Chapter 2: Office & Work",
      items: [
        { id: "item_5", type: "video", title: "Keigo (Honorifics) Intro", duration: "25:00", isCompleted: false },
      ]
    }
  ]
};

const DUMMY_COMMENTS = [
  { id: 1, user: "Sakura M.", avatar: "SM", time: "2 days ago", text: "Sensei, around 14:20, is the stroke order strict for that specific kanji?", likes: 4 },
  { id: 2, user: "Teacher Parth", avatar: "P", isTeacher: true, time: "1 day ago", text: "Yes Sakura! The sweeping stroke must always come last. Check the PDF below.", likes: 12 }
];

// ==========================================
// 🚀 MAIN COMPONENT
// ==========================================
export default function LectureViewer({ isDarkMode = true }) {
  const navigate = useNavigate();
  
  // -- UI State (Auto-collapse on small screens) --
  const [isNavOpen, setIsNavOpen] = useState(window.innerWidth >= 1024);
  const [isChatOpen, setIsChatOpen] = useState(window.innerWidth >= 1280);
  const [activeTab, setActiveTab] = useState('overview'); 
  
  // -- Content State --
  const [activeItem, setActiveItem] = useState(COURSE_DATA.chapters[0].items[2]);
  const [expandedChapters, setExpandedChapters] = useState(["chap_1"]);
  const [newComment, setNewComment] = useState('');
  const [isCompletedLocally, setIsCompletedLocally] = useState(false);

  // Resize listener to handle responsive defaults
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) { setIsNavOpen(false); setIsChatOpen(false); }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update local completion state when switching items
  useEffect(() => {
    setIsCompletedLocally(activeItem.isCompleted);
  }, [activeItem]);

  // --- Handlers ---
  const toggleChapter = (id) => {
    setExpandedChapters(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleItemClick = (item) => {
    setActiveItem(item);
    if (window.innerWidth < 1024) setIsNavOpen(false);
  };

  // ------------------------------------------
  // UI: LEFT SIDEBAR (CURRICULUM NAV)
  // ------------------------------------------
  const renderNavigation = () => (
    <>
      {/* Mobile Backdrop */}
      {isNavOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsNavOpen(false)} />}
      
      {/* Retractable Pane Container */}
      <aside className={`fixed lg:relative inset-y-0 left-0 z-50 flex shrink-0 transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none
        ${isNavOpen ? 'translate-x-0 lg:w-[320px]' : '-translate-x-full lg:translate-x-0 lg:w-0 overflow-hidden'}`}>
        
        {/* Fixed width inner container prevents squishing during transition */}
        <div className={`w-[300px] lg:w-[320px] h-full flex flex-col border-r shrink-0
          ${isDarkMode ? 'bg-[#0B1121] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          
          <div className={`p-6 border-b shrink-0 ${isDarkMode ? 'border-slate-800' : 'border-slate-200 bg-white'}`}>
            <h2 className={`font-black text-lg mb-2 truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{COURSE_DATA.title}</h2>
            <div className="flex items-center gap-3">
              <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${COURSE_DATA.progress}%` }}></div>
              </div>
              <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{COURSE_DATA.progress}%</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {COURSE_DATA.chapters.map((chap, idx) => (
              <div key={chap.id} className={`border-b ${isDarkMode ? 'border-slate-800/50' : 'border-slate-200'}`}>
                <button onClick={() => toggleChapter(chap.id)} className={`w-full p-4 flex items-center justify-between transition-colors ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100 bg-white'}`}>
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Section {idx + 1}</span>
                    <h3 className={`font-bold text-sm mt-0.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>{chap.title}</h3>
                  </div>
                  <ChevronDown size={18} className={`transition-transform duration-300 ${expandedChapters.includes(chap.id) ? 'rotate-180 text-indigo-500' : (isDarkMode ? 'text-slate-500' : 'text-slate-400')}`} />
                </button>

                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedChapters.includes(chap.id) ? 'max-h-[500px]' : 'max-h-0'}`}>
                  <div className={`py-2 ${isDarkMode ? 'bg-black/20' : 'bg-slate-50'}`}>
                    {chap.items.map(item => {
                      const isActive = activeItem.id === item.id;
                      return (
                        <button key={item.id} onClick={() => handleItemClick(item)}
                          className={`w-full p-3 pl-6 flex items-start gap-3 transition-colors text-left
                            ${isActive ? (isDarkMode ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : 'bg-indigo-50 border-l-2 border-indigo-600') : 'border-l-2 border-transparent hover:bg-slate-800/20 dark:hover:bg-slate-800/30'}`}
                        >
                          <div className="mt-0.5 shrink-0 transition-colors">
                            {item.isCompleted || (isActive && isCompletedLocally)
                              ? <CheckCircle2 size={16} className="text-emerald-500" />
                              : item.type === 'video' ? <PlaySquare size={16} className={isActive ? 'text-indigo-500' : (isDarkMode ? 'text-slate-600' : 'text-slate-400')} />
                              : item.type === 'article' ? <FileText size={16} className={isActive ? 'text-indigo-500' : (isDarkMode ? 'text-slate-600' : 'text-slate-400')} />
                              : <HelpCircle size={16} className={isActive ? 'text-indigo-500' : (isDarkMode ? 'text-slate-600' : 'text-slate-400')} />
                            }
                          </div>
                          <div>
                            <p className={`text-sm font-bold leading-tight transition-colors ${isActive ? (isDarkMode ? 'text-indigo-300' : 'text-indigo-800') : (isDarkMode ? 'text-slate-400' : 'text-slate-600')}`}>{item.title}</p>
                            <p className={`text-[10px] font-bold mt-1 uppercase tracking-widest ${isActive ? (isDarkMode ? 'text-indigo-500/70' : 'text-indigo-400') : (isDarkMode ? 'text-slate-600' : 'text-slate-400')}`}>{item.type} • {item.duration}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );

  // ------------------------------------------
  // UI: RIGHT SIDEBAR (Q&A / CHAT)
  // ------------------------------------------
  const renderChat = () => (
    <>
      {/* Mobile Backdrop */}
      {isChatOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsChatOpen(false)} />}
      
      <aside className={`fixed lg:relative inset-y-0 right-0 z-50 flex shrink-0 transition-all duration-300 ease-in-out shadow-[-20px_0_40px_rgba(0,0,0,0.1)] lg:shadow-none
        ${isChatOpen ? 'translate-x-0 lg:w-[320px]' : 'translate-x-full lg:translate-x-0 lg:w-0 overflow-hidden'}`}>
        
        <div className={`w-[300px] lg:w-[320px] h-full flex flex-col border-l shrink-0
          ${isDarkMode ? 'bg-[#0B1121] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          
          <div className={`h-16 p-5 border-b flex justify-between items-center shrink-0 ${isDarkMode ? 'border-slate-800 bg-[#151E2E]' : 'border-slate-200 bg-white'}`}>
            <h3 className={`font-black flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <MessageSquare size={18} className="text-indigo-500"/> Class Q&A
            </h3>
            <button onClick={() => setIsChatOpen(false)} className={`lg:hidden p-2 rounded-xl transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>
              <PanelRightClose size={20}/>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
            {DUMMY_COMMENTS.map(comment => (
              <div key={comment.id} className="space-y-3">
                <div className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-black text-white
                    ${comment.isTeacher ? 'bg-gradient-to-r from-rose-500 to-pink-600 shadow-lg shadow-rose-500/20' : 'bg-indigo-600'}`}>
                    {comment.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold ${comment.isTeacher ? 'text-rose-500 dark:text-rose-400' : isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>{comment.user}</span>
                      {comment.isTeacher && <span className="text-[8px] bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-500 border border-rose-500/20 px-1.5 py-0.5 rounded uppercase font-black tracking-widest">Sensei</span>}
                      <span className="text-[10px] text-slate-500">{comment.time}</span>
                    </div>
                    <p className={`text-sm font-medium leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{comment.text}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <button className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${isDarkMode ? 'text-slate-500 hover:text-indigo-400' : 'text-slate-400 hover:text-indigo-600'}`}><ThumbsUp size={12}/> {comment.likes}</button>
                      <button className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${isDarkMode ? 'text-slate-500 hover:text-indigo-400' : 'text-slate-400 hover:text-indigo-600'}`}>Reply</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={`p-4 border-t shrink-0 ${isDarkMode ? 'border-slate-800 bg-[#151E2E]' : 'border-slate-200 bg-white'}`}>
            <div className={`relative flex items-center p-2 rounded-2xl border focus-within:border-indigo-500 transition-colors shadow-sm
              ${isDarkMode ? 'bg-[#0B1121] border-slate-700' : 'bg-slate-50 border-slate-200 focus-within:bg-white'}`}>
              <input 
                type="text" placeholder="Ask a question..." 
                value={newComment} onChange={(e) => setNewComment(e.target.value)}
                className={`flex-1 bg-transparent border-none outline-none px-2 text-sm placeholder:text-slate-400 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
              />
              <button className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${newComment ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-400')}`}>
                <Send size={16} className="ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );

  // ------------------------------------------
  // UI: CENTER STAGE (THE CONTENT)
  // ------------------------------------------
  const renderMainContent = () => (
    <main className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-300 ${isDarkMode ? 'bg-[#0B1121]' : 'bg-white'}`}>
      
      {/* Top Navbar */}
      <header className={`h-16 px-4 lg:px-6 shrink-0 flex items-center justify-between border-b z-10 transition-colors
        ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsNavOpen(!isNavOpen)} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}>
            {isNavOpen ? <PanelLeftClose size={20}/> : <PanelLeftOpen size={20}/>}
          </button>
          <div className={`h-4 w-px mx-1 hidden sm:block ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
          <button onClick={() => navigate('/student-dashboard')} className={`text-xs font-bold uppercase tracking-widest hidden sm:flex items-center gap-2 transition-colors
            ${isDarkMode ? 'text-slate-500 hover:text-indigo-400' : 'text-slate-400 hover:text-indigo-600'}`}>
            <ArrowLeft size={14}/> Dashboard
          </button>
        </div>
        
        <div className="flex items-center">
          <button onClick={() => setIsChatOpen(!isChatOpen)} className={`p-2 rounded-xl transition-colors flex items-center gap-2
            ${isChatOpen ? 'bg-indigo-500/10 text-indigo-500' : (isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900')}`}>
            {isChatOpen ? <PanelRightClose size={20}/> : <PanelRightOpen size={20}/>}
            <span className="text-xs font-bold hidden sm:inline">Q&A</span>
          </button>
        </div>
      </header>

      {/* The Dynamic Content Viewer */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar ${isDarkMode ? 'bg-[#0B1121]' : 'bg-slate-50'}`}>
        
        {/* MEDIA PLAYER / READER AREA */}
        <div className={`w-full border-b ${isDarkMode ? 'bg-black border-slate-800' : 'bg-slate-900 border-slate-900'}`}>
          <div className="max-w-6xl mx-auto aspect-video relative flex items-center justify-center group overflow-hidden">
            
            {activeItem.type === 'video' ? (
               <div className="w-full h-full bg-slate-900 relative">
                 {/* Fake Video Thumbnail & Play Button */}
                 <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 to-slate-800 flex items-center justify-center">
                    <button className="w-20 h-20 bg-indigo-600/90 backdrop-blur text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_40px_rgba(79,70,229,0.5)]">
                      <PlayCircle size={40} className="ml-1" />
                    </button>
                 </div>
                 <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between text-white">
                    <div className="flex items-center gap-4">
                      <PlayCircle size={20} className="cursor-pointer hover:text-indigo-400 transition-colors" />
                      <div className="text-xs font-bold tracking-wider">04:20 / {activeItem.duration}</div>
                    </div>
                    <Maximize size={18} className="cursor-pointer hover:text-indigo-400 transition-colors" />
                 </div>
               </div>
            ) : activeItem.type === 'quiz' ? (
              <div className="text-center p-8 z-10">
                <div className="w-24 h-24 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 rotate-3 shadow-inner">
                  <HelpCircle size={48} className="-rotate-3" />
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">{activeItem.title}</h2>
                <p className="text-slate-400 font-medium mb-10 max-w-md mx-auto">This is a mandatory checkpoint. You must score 80% to unlock the next chapter.</p>
                <button onClick={() => navigate('/test-engine')} className="px-10 py-4.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-lg font-black rounded-2xl hover:from-indigo-500 hover:to-violet-500 transition-all shadow-xl shadow-indigo-600/30 active:scale-95 flex items-center mx-auto gap-3">
                  Launch Exam Engine <PlayCircle size={20}/>
                </button>
              </div>
            ) : (
              <div className="w-full h-full bg-[#151E2E] p-6 md:p-12 overflow-y-auto custom-scrollbar relative z-10">
                <div className="max-w-3xl mx-auto space-y-6">
                  <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">{activeItem.title}</h1>
                  <div className="prose prose-invert max-w-none text-slate-300">
                    <p className="text-lg md:text-xl leading-relaxed font-medium">This is where the rich HTML content from the Path Builder Article Editor is injected via dangerouslySetInnerHTML.</p>
                    <div className="p-6 md:p-8 bg-slate-800/50 rounded-3xl border border-slate-700 my-8 shadow-inner">
                      <p className="font-black text-indigo-400 mb-3 flex items-center gap-2"><FileText size={18}/> Sensei's Note</p>
                      <p className="text-slate-300 leading-relaxed">Always remember that radicals dictate the core meaning of the kanji, while the phonetic component dictates the reading.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BELOW PLAYER INFO & TABS */}
        <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-10">
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
            <div>
              <h1 className={`text-2xl md:text-3xl font-black mb-2 tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{activeItem.title}</h1>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>{activeItem.type}</span>
                <span className={`text-xs font-bold flex items-center gap-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}><Clock size={14}/> {activeItem.duration}</span>
              </div>
            </div>
            
            {/* 🔥 MARK AS COMPLETE BUTTON - MOVED TO TOP */}
            <button 
              onClick={() => setIsCompletedLocally(!isCompletedLocally)}
              className={`shrink-0 w-full md:w-auto px-6 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95
                ${isCompletedLocally || activeItem.isCompleted
                  ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-none' : 'bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-none')
                  : (isDarkMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20' : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/30')}`}
            >
              {isCompletedLocally || activeItem.isCompleted ? <Check size={18}/> : <CheckCircle2 size={18}/>}
              {isCompletedLocally || activeItem.isCompleted ? 'Completed' : 'Mark as Complete'}
            </button>
          </div>
          
          {/* Tabs */}
          <div className={`flex border-b mb-8 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <button onClick={() => setActiveTab('overview')} className={`pb-4 px-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'overview' ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>Overview</button>
            <button onClick={() => setActiveTab('resources')} className={`pb-4 px-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${activeTab === 'resources' ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>
              Resources <span className={`px-1.5 py-0.5 rounded text-[10px] ${activeTab === 'resources' ? 'bg-indigo-500/20' : (isDarkMode ? 'bg-slate-800' : 'bg-slate-100')}`}>2</span>
            </button>
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <p className={`font-medium leading-relaxed max-w-3xl text-lg ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                In this lesson, we break down the core mechanics of the Japanese writing system. 
                Pay close attention to the stroke orders presented at the 5-minute mark, as they form the foundation for everything we do in Module 2.
              </p>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl animate-in fade-in slide-in-from-bottom-4">
              {[
                { name: "Kanji_Cheat_Sheet_v2.pdf", size: "2.4 MB" },
                { name: "Audio_Drill_MP3s.zip", size: "15 MB" }
              ].map(res => (
                <div key={res.name} className={`p-5 rounded-3xl border flex items-center justify-between group cursor-pointer transition-all hover:-translate-y-1
                  ${isDarkMode ? 'bg-[#151E2E] border-slate-800 hover:border-indigo-500/50 shadow-sm hover:shadow-[0_10px_30px_rgba(99,102,241,0.1)]' : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-xl'}`}>
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className={`p-3 rounded-2xl shrink-0 transition-colors ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                      <FileText size={20} />
                    </div>
                    <div className="truncate">
                      <h4 className={`font-bold text-sm truncate transition-colors ${isDarkMode ? 'text-slate-200 group-hover:text-white' : 'text-slate-800 group-hover:text-indigo-700'}`}>{res.name}</h4>
                      <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{res.size}</p>
                    </div>
                  </div>
                  <button className={`p-2.5 rounded-xl transition-colors ${isDarkMode ? 'text-slate-500 hover:text-indigo-400 hover:bg-slate-800' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'}`}>
                    <Download size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );

  return (
    <div className={`h-screen w-full flex overflow-hidden font-sans transition-colors duration-500
      ${isDarkMode ? 'bg-[#0B1121] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      
      {renderNavigation()}
      {renderMainContent()}
      {renderChat()}

    </div>
  );
}