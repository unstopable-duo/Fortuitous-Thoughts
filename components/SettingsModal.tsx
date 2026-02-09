
import React, { useState } from 'react';
import { X, Moon, Sun, Trash2, Database, Type, Bot, Layout, Download, Bell, Volume2, Activity, Palette, Languages } from 'lucide-react';
import { AppSettings, AppThemeColor, AIContextMode, AppLanguage } from '../types';
import { getTranslation } from '../services/translations';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onClearData: () => void;
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  isDarkMode, 
  onToggleTheme,
  onClearData,
  settings,
  onUpdateSettings
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'data'>('general');
  const t = (key: string) => getTranslation(settings.language, key);

  if (!isOpen) return null;

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    // Privacy Warning Logic
    if (key === 'backgroundAnalysis' && value === true) {
       const confirmed = window.confirm("Enabling Background Analysis means your note data will be periodically sent to Google Gemini for processing. Do you consent to this data usage?");
       if (!confirmed) return;
    }
    onUpdateSettings({ ...settings, [key]: value });
  };

  const exportData = () => {
    alert("Export feature: This would download a JSON file of your notes.");
  };

  const themeColors: { value: AppThemeColor, label: string, hex: string }[] = [
    { value: 'indigo', label: 'Indigo', hex: '#818cf8' },
    { value: 'blue', label: 'Ocean', hex: '#3b82f6' },
    { value: 'emerald', label: 'Emerald', hex: '#10b981' },
    { value: 'rose', label: 'Rose', hex: '#f43f5e' },
    { value: 'amber', label: 'Amber', hex: '#f59e0b' },
    { value: 'violet', label: 'Violet', hex: '#8b5cf6' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4" onClick={onClose}>
      <div 
        className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col md:flex-row h-full md:h-auto max-h-[85vh] md:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 bg-canvas border-b md:border-b-0 md:border-r border-border p-4 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
          <h2 className="hidden md:block text-lg font-bold text-text-main px-3 mb-4">{t('settings')}</h2>
          <button 
             onClick={() => setActiveTab('general')}
             className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'general' ? 'bg-accent/10 text-accent' : 'text-text-muted hover:bg-surface'}`}
          >
             <Layout size={18} /> {t('hybrid')}
          </button>
          <button 
             onClick={() => setActiveTab('ai')}
             className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'ai' ? 'bg-accent/10 text-accent' : 'text-text-muted hover:bg-surface'}`}
          >
             <Bot size={18} /> {t('ai_features')}
          </button>
          <button 
             onClick={() => setActiveTab('data')}
             className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'data' ? 'bg-accent/10 text-accent' : 'text-text-muted hover:bg-surface'}`}
          >
             <Database size={18} /> {t('danger_zone')}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
           <div className="p-4 border-b border-border flex justify-between md:hidden items-center">
              <h2 className="font-bold text-text-main">{t('settings')}</h2>
              <button onClick={onClose}><X size={20} className="text-text-muted" /></button>
           </div>
           
           <div className="flex-1 p-6 overflow-y-auto space-y-8 custom-scrollbar">
              
              {/* GENERAL TAB */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                   {/* Appearance Section */}
                   <div>
                      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Appearance</h3>
                      <div className="space-y-3">
                         {/* Language Selection */}
                         <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface/50">
                            <div className="flex items-center gap-3">
                               <Languages size={20} className="text-text-muted" />
                               <div>
                                  <p className="text-sm font-medium text-text-main">{t('language')}</p>
                               </div>
                            </div>
                            <select 
                               value={settings.language}
                               onChange={(e) => handleSettingChange('language', e.target.value as AppLanguage)}
                               className="bg-canvas border border-border rounded-lg text-xs p-1 focus:outline-none"
                            >
                               <option value="en">English</option>
                               <option value="af">Afrikaans</option>
                               <option value="fr">Français</option>
                               <option value="zh">中文 (简体)</option>
                            </select>
                         </div>

                         {/* Light/Dark Mode */}
                         <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface/50">
                            <div className="flex items-center gap-3">
                               {isDarkMode ? <Moon size={20} className="text-accent" /> : <Sun size={20} className="text-yellow-500" />}
                               <div>
                                  <p className="text-sm font-medium text-text-main">{t('theme')}</p>
                                  <p className="text-xs text-text-muted">{isDarkMode ? 'Dark' : 'Light'} interface</p>
                               </div>
                            </div>
                            <button onClick={onToggleTheme} className="bg-canvas border border-border px-3 py-1.5 rounded-lg text-xs font-medium">Toggle</button>
                         </div>
                         
                         {/* Accent Color */}
                         <div className="p-3 rounded-xl border border-border bg-surface/50">
                            <div className="flex items-center gap-3 mb-3">
                               <Palette size={20} className="text-text-muted" />
                               <div>
                                  <p className="text-sm font-medium text-text-main">{t('accent')}</p>
                               </div>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-1">
                               {themeColors.map(c => (
                                  <button
                                     key={c.value}
                                     onClick={() => handleSettingChange('themeColor', c.value)}
                                     className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0 ${settings.themeColor === c.value ? 'border-text-main scale-110' : 'border-transparent'}`}
                                     style={{ backgroundColor: c.hex }}
                                     title={c.label}
                                  />
                               ))}
                            </div>
                         </div>

                         {/* Font Family */}
                         <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface/50">
                            <div className="flex items-center gap-3">
                               <Type size={20} className="text-text-muted" />
                               <div>
                                  <p className="text-sm font-medium text-text-main">{t('font')}</p>
                               </div>
                            </div>
                            <select 
                               value={settings.fontFamily}
                               onChange={(e) => handleSettingChange('fontFamily', e.target.value)}
                               className="bg-canvas border border-border rounded-lg text-xs p-1 focus:outline-none"
                            >
                               <option value="inter">Modern (Inter)</option>
                               <option value="serif">Classic (Serif)</option>
                               <option value="mono">Code (Monospace)</option>
                            </select>
                         </div>
                      </div>
                   </div>
                   
                   {/* Notifications & Sound */}
                   <div>
                       <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Feedback</h3>
                       <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface/50">
                             <div className="flex items-center gap-3">
                                <Bell size={20} className="text-text-muted" />
                                <p className="text-sm font-medium text-text-main">Enable Notifications</p>
                             </div>
                             <input 
                               type="checkbox" 
                               checked={settings.enableNotifications}
                               onChange={(e) => handleSettingChange('enableNotifications', e.target.checked)}
                               className="toggle-checkbox"
                             />
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface/50">
                             <div className="flex items-center gap-3">
                                <Volume2 size={20} className="text-text-muted" />
                                <p className="text-sm font-medium text-text-main">Sound Effects</p>
                             </div>
                             <input 
                               type="checkbox" 
                               checked={settings.soundEffects}
                               onChange={(e) => handleSettingChange('soundEffects', e.target.checked)}
                               className="toggle-checkbox"
                             />
                          </div>
                       </div>
                   </div>

                   <div>
                      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Accessibility</h3>
                      <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface/50">
                          <div>
                             <p className="text-sm font-medium text-text-main">Reduce Motion</p>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={settings.reduceMotion}
                            onChange={(e) => handleSettingChange('reduceMotion', e.target.checked)}
                            className="toggle-checkbox"
                          />
                      </div>
                   </div>
                </div>
              )}

              {/* AI TAB */}
              {activeTab === 'ai' && (
                <div className="space-y-6">
                   <div>
                      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Intelligence Engine</h3>
                      <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface/50 mb-4">
                         <div className="flex items-center gap-3">
                            <Activity size={20} className="text-accent" />
                            <div>
                               <p className="text-sm font-bold text-text-main">Background Analysis</p>
                               <p className="text-xs text-text-muted max-w-xs">Allow Gemini to periodically analyze your notes for habits, productivity, and connections.</p>
                            </div>
                         </div>
                         <input 
                           type="checkbox" 
                           checked={settings.backgroundAnalysis}
                           onChange={(e) => handleSettingChange('backgroundAnalysis', e.target.checked)}
                           className="toggle-checkbox"
                         />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface/50">
                          <div>
                             <p className="text-sm font-medium text-text-main">Default AI Focus</p>
                             <p className="text-xs text-text-muted">Set preferred scope for chat assistance</p>
                          </div>
                          <select 
                             value={settings.defaultAiContext}
                             onChange={(e) => handleSettingChange('defaultAiContext', e.target.value)}
                             className="bg-canvas border border-border rounded-lg text-xs p-2 focus:outline-none"
                          >
                             <option value="knowledge">Notes Only</option>
                             <option value="web">Web Search</option>
                             <option value="hybrid">Hybrid (Best)</option>
                          </select>
                      </div>
                   </div>

                   <div>
                      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">AI Persona</h3>
                      <p className="text-xs text-text-muted mb-4">This affects how the Chat Assistant and Analysis tools respond to you.</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                         {['standard', 'creative', 'analytical', 'concise'].map((p) => (
                           <button 
                             key={p}
                             onClick={() => handleSettingChange('aiPersonality', p)}
                             className={`p-4 rounded-xl border text-left transition-all ${settings.aiPersonality === p ? 'border-accent bg-accent/5 ring-1 ring-accent' : 'border-border bg-surface hover:border-accent/50'}`}
                           >
                              <p className="text-sm font-bold capitalize mb-1 text-text-main">{p}</p>
                              <p className="text-[10px] text-text-muted leading-tight">
                                {p === 'standard' ? 'Balanced and helpful.' : 
                                 p === 'creative' ? 'Imaginative and expansive.' : 
                                 p === 'analytical' ? 'Fact-focused and logic driven.' : 
                                 'Short, direct, and to the point.'}
                              </p>
                           </button>
                         ))}
                      </div>
                   </div>
                </div>
              )}

              {/* DATA TAB */}
              {activeTab === 'data' && (
                 <div className="space-y-6">
                    <div>
                       <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Export</h3>
                       <button onClick={exportData} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-border bg-surface hover:bg-canvas transition-colors text-sm font-medium">
                          <Download size={16} /> Download All Notes (JSON)
                       </button>
                    </div>

                    <div>
                       <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">{t('danger_zone')}</h3>
                       <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                          <div className="flex items-center gap-3 mb-3">
                             <Trash2 size={20} className="text-red-500" />
                             <div>
                                <p className="text-sm font-medium text-text-main">Reset Application</p>
                                <p className="text-xs text-text-muted">Clear all notes and cached data locally.</p>
                             </div>
                          </div>
                          <button 
                            onClick={() => {
                               if(window.confirm("Are you sure? This will delete all your local notes.")) {
                                   onClearData();
                                   onClose();
                               }
                            }}
                            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                          >
                            {t('delete_everything')}
                          </button>
                       </div>
                    </div>
                 </div>
              )}

           </div>

           <div className="p-4 border-t border-border flex justify-end hidden md:flex">
              <button onClick={onClose} className="px-4 py-2 bg-surface hover:bg-canvas border border-border rounded-lg text-sm text-text-main">Close</button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
