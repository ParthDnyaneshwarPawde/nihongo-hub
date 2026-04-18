import React from 'react';
import { X, Lightbulb, FileText, GitBranch, Clock, Volume2, MonitorOff, Type, Users } from 'lucide-react';

export default function SettingsDrawer({ isOpen, onClose, settings, setSettings, isDarkMode }) {
  if (!isOpen) return null;

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Custom Toggle Component
  const Toggle = ({ checked, onChange }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0 ${
        checked ? 'bg-blue-500' : isDarkMode ? 'bg-slate-700' : 'bg-slate-300'
      }`}
    >
      <div 
        className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform duration-200 ${
          checked ? 'left-6' : 'left-1'
        }`} 
      />
    </button>
  );

  // Reusable Row Component
  const SettingRow = ({ icon: Icon, title, description, isNew, rightControl }) => (
    <div className="flex items-start gap-4">
      <div className={`mt-0.5 shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 pr-4">
        <div className="flex items-center gap-2 mb-1">
          <span className={`font-bold text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            {title}
          </span>
        </div>
        {description && (
          <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {isNew && (
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md">
            NEW
          </span>
        )}
        {rightControl}
      </div>
    </div>
  );

  // Reusable Section Card
  const Section = ({ title, children }) => (
    <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
      {title && (
        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-5">
          {title}
        </h4>
      )}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );

  return (
    <>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[100]" onClick={onClose}></div>
      <div className={`absolute right-0 top-0 bottom-0 w-full max-w-md border-l z-[110] flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl ${isDarkMode ? 'bg-[#0B1121] border-slate-800' : 'bg-white border-slate-200'}`}>
        
        {/* Header */}
        <div className={`p-6 border-b flex justify-between items-center shrink-0 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <h3 className={`font-black text-lg ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            Question View Settings
          </h3>
          <button 
            onClick={onClose}
            className={`p-2 -mr-2 rounded-xl transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          
          {/* Section 1: Notes & Solutions */}
          <Section title="NOTES & SOLUTIONS">
            <SettingRow 
              icon={Lightbulb}
              title="Show Hint to solve Qs"
              description="View a small hint to help you in solving Qs"
              isNew={true}
              rightControl={<Toggle checked={settings.showHint ?? true} onChange={(val) => updateSetting('showHint', val)} />}
            />
            <SettingRow 
              icon={FileText}
              title="Always show 'My Note'"
              description="Your added note will be visible when you reattempt the question"
              isNew={true}
              rightControl={<Toggle checked={settings.showMyNote ?? true} onChange={(val) => updateSetting('showMyNote', val)} />}
            />
            <SettingRow 
              icon={GitBranch}
              title="Question Solution Mode"
              description="You'll see the solution directly when you reopen an attempted question."
              isNew={true}
              rightControl={<Toggle checked={settings.solutionMode} onChange={(val) => updateSetting('solutionMode', val)} />}
            />
          </Section>

          {/* Section 2: Practice Experience */}
          <Section title="PRACTICE EXPERIENCE">
            <SettingRow 
              icon={Clock}
              title="Start timer automatically"
              description="The timer will start automatically once you open a new Qs"
              rightControl={<Toggle checked={settings.autoStartTimer} onChange={(val) => updateSetting('autoStartTimer', val)} />}
            />
            <SettingRow 
              icon={Volume2}
              title="Play sounds"
              description="Play sound when you attempt any correct or incorrect answer"
              rightControl={<Toggle checked={settings.playSounds} onChange={(val) => updateSetting('playSounds', val)} />}
            />
            <SettingRow 
              icon={MonitorOff}
              title="Don't show correct answer immediately"
              description="Check only if your submitted answer is correct or wrong"
              rightControl={<Toggle checked={settings.delayCorrectAnswer ?? false} onChange={(val) => updateSetting('delayCorrectAnswer', val)} />}
            />
            
            {/* Text Size Control */}
            <div className="pt-2 border-t border-slate-500/10">
              <SettingRow 
                icon={Type}
                title="Text Size"
                description="Change the size of Qs & Solution text"
                isNew={true}
              />
              <div className={`mt-4 flex p-1 rounded-xl w-full ${isDarkMode ? 'bg-[#0B1121]' : 'bg-slate-100'}`}>
                {['small', 'medium', 'large', 'xlarge'].map((size) => {
                  const labels = { small: 'Small', medium: 'Medium', large: 'Large', xlarge: 'Extra Large' };
                  const isSelected = settings.textSize === size;
                  return (
                    <button
                      key={size}
                      onClick={() => updateSetting('textSize', size)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        isSelected 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {labels[size]}
                    </button>
                  );
                })}
              </div>
            </div>
          </Section>

          {/* Section 3: Peer Insights */}
          <Section title="PEER INSIGHTS">
            <SettingRow 
              icon={Users}
              title="Show other student's performance"
              description="Show which option other students have marked"
              rightControl={<Toggle checked={settings.showPeerStats} onChange={(val) => updateSetting('showPeerStats', val)} />}
            />
          </Section>

        </div>
      </div>
    </>
  );
}