
import React from 'react';
import { 
  Plus, 
  Brain, 
  Library, 
  Search,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  FolderOpen,
  Settings,
  Sparkles,
  BarChart3,
  CheckSquare,
  LayoutTemplate,
  X,
  Users
} from 'lucide-react';
import { NoteType, AppLanguage } from '../types';
import { getTranslation } from '../services/translations';

interface SidebarProps {
  onTypeSelect: (type: NoteType | 'all' | 'productivity' | 'tasks' | 'community') => void;
  activeType: NoteType | 'all' | 'productivity' | 'tasks' | 'community';
  onNewNote: () => void;
  noteCounts: Record<string, number>;
  onToggleTheme: () => void;
  isDarkMode: boolean;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
  onOpenImport: () => void;
  onOpenSettings: () => void;
  onOpenTemplates: () => void;
  aiEnabled: boolean;
  language: AppLanguage;
  onCloseMobile?: () => void; 
}

const Sidebar: React.FC<SidebarProps> = ({ 
  onTypeSelect, 
  activeType, 
  onNewNote, 
  noteCounts, 
  onToggleTheme, 
  isDarkMode,
  onToggleCollapse,
  isCollapsed,
  onOpenImport,
  onOpenSettings,
  onOpenTemplates,
  aiEnabled,
  language,
  onCloseMobile
}) => {
  
  const t = (key: string) => getTranslation(language, key);

  const NavItem = ({ 
    type, 
    icon: Icon, 
    label,
    countKey
  }: { type: any, icon: any, label: string, countKey?: string }) => (
    <button
      onClick={() => onTypeSelect(type)}
      className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-xl text-sm transition-all duration-200 mb-1 group relative overflow-hidden
        ${activeType === type 
          ? 'bg-surface text-accent shadow-md border border-border scale-[1.02]' 
          : 'text-text-muted hover:bg-surface hover:text-text-main hover:shadow-sm hover:translate-x-1'}`}
      title={isCollapsed ? label : undefined}
    >
      <div className="flex items-center gap-3 relative z-10">
        <Icon size={18} className={`transition-colors ${activeType === type ? 'text-accent' : 'group-hover:text-accent'}`} />
        {!isCollapsed && <span className="font-medium">{label}</span>}
      </div>
      {!isCollapsed && countKey && noteCounts[countKey] > 0 && (
        <span className={`text-xs px-2 py-0.5 rounded-full transition-colors relative z-10
           ${activeType === type ? 'bg-accent/10 text-accent' : 'bg-canvas text-text-muted group-hover:bg-accent/5'}
        `}>
          {noteCounts[countKey]}
        </span>
      )}
      {activeType === type && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent rounded-l-lg"></div>}
    </button>
  );

  const ActionItem = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start gap-3'} px-3 py-2.5 rounded-xl text-sm text-text-muted hover:bg-surface hover:text-text-main transition-all duration-200 mb-1 group relative overflow-hidden hover:shadow-sm hover:translate-x-1`}
      title={isCollapsed ? label : undefined}
    >
      <Icon size={18} className="group-hover:text-accent transition-colors relative z-10" />
      {!isCollapsed && <span className="font-medium relative z-10">{label}</span>}
    </button>
  );

  return (
    <div 
      className={`h-full bg-canvas border-r border-border flex flex-col transition-all duration-300 relative z-20 shadow-xl
        ${isCollapsed ? 'w-20 items-center p-2' : 'w-72 p-4 md:p-5'}
      `}
    >
      {/* Header */}
      <div className={`flex items-center justify-between mb-8 ${isCollapsed ? 'justify-center mt-2' : 'px-1'} text-accent transition-all`}>
        <div className="flex items-center gap-3">
            <div className="relative group">
            <div className="absolute -inset-2 bg-accent/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <Brain size={isCollapsed ? 24 : 28} className="flex-shrink-0 relative z-10" />
            </div>
            {!isCollapsed && (
            <div className="flex flex-col">
                <h1 className="font-bold text-xl tracking-tight brand-font text-transparent bg-clip-text bg-gradient-to-r from-text-main to-text-muted leading-none">
                Fortuitous
                </h1>
                {aiEnabled && (
                <span className="text-[9px] font-bold text-accent uppercase tracking-tighter flex items-center gap-1 mt-1">
                    <Sparkles size={8} /> AI Active
                </span>
                )}
            </div>
            )}
        </div>
        {/* Mobile Close Button */}
        {!isCollapsed && onCloseMobile && (
            <button 
                onClick={onCloseMobile} 
                className="md:hidden p-2 text-text-muted hover:text-text-main bg-surface rounded-lg border border-border"
            >
                <X size={18} />
            </button>
        )}
      </div>

      <button 
        onClick={onToggleCollapse}
        className="absolute -right-3 top-8 bg-surface border border-border text-text-muted p-1.5 rounded-full shadow-lg hover:text-accent hover:scale-110 transition-all z-50 hidden md:block"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <button 
        id="sidebar-new"
        onClick={() => onNewNote()}
        className={`relative group bg-accent hover:bg-accent-hover text-white rounded-xl flex items-center justify-center transition-all duration-300 mb-6 shadow-lg shadow-accent/25 hover:shadow-accent/40
          ${isCollapsed ? 'w-12 h-12 p-0 rounded-2xl' : 'w-full py-3 px-4 gap-2 font-semibold text-sm hover:-translate-y-0.5 active:translate-y-0'}
        `}
        title={t('new_note')}
      >
        <div className="absolute inset-0 bg-white/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <Plus size={20} className="relative z-10" />
        {!isCollapsed && <span className="relative z-10">{t('new_note')}</span>}
      </button>

      <div className="space-y-1 flex-grow overflow-y-auto w-full pr-1 custom-scrollbar">
        <div>
          {!isCollapsed && <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 px-3 opacity-60">{t('execution')}</h3>}
          <NavItem type="tasks" icon={CheckSquare} label={t('command_center')} />
          <div id="sidebar-prod"><NavItem type="productivity" icon={BarChart3} label={t('performance')} /></div>
        </div>

        <div className="mt-6">
          {!isCollapsed && <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 px-3 opacity-60">{t('knowledge')}</h3>}
          <NavItem type="all" icon={Library} label={t('all_notes')} countKey="total" />
          <NavItem type="community" icon={Users} label="Shared Thoughts" />
        </div>
        
        <div className="mt-6">
           {!isCollapsed && <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 px-3 opacity-60">{t('system')}</h3>}
           <ActionItem icon={LayoutTemplate} label={t('templates')} onClick={onOpenTemplates} />
           <ActionItem icon={FolderOpen} label={t('import_file')} onClick={onOpenImport} />
           <ActionItem icon={Settings} label={t('settings')} onClick={onOpenSettings} />
        </div>
      </div>

      <div className={`mt-auto ${!isCollapsed && 'w-full'} pt-4 border-t border-border`}>
        {!isCollapsed && (
          <div className="mb-3 relative group">
            <Search className="absolute left-3 top-2.5 text-text-muted group-focus-within:text-accent transition-colors" size={16} />
            <input 
              type="text" 
              placeholder={t('search')}
              className="w-full bg-surface border border-border rounded-xl py-2 pl-9 pr-3 text-sm text-text-main focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all shadow-sm"
            />
          </div>
        )}

        <button 
          onClick={onToggleTheme}
          className={`flex items-center gap-3 p-2.5 rounded-xl text-text-muted hover:bg-surface hover:text-text-main transition-all hover:shadow-sm
             ${isCollapsed ? 'justify-center w-full' : 'w-full'}
          `}
          title="Toggle Theme"
        >
          {isDarkMode ? <Sun size={20} className="hover:rotate-45 transition-transform" /> : <Moon size={20} className="hover:-rotate-12 transition-transform" />}
          {!isCollapsed && <span className="text-sm font-medium">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {!isCollapsed && (
          <div className="mt-4 text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.1em] text-text-muted opacity-40">Licensed Product of<br/>TRN Technologies</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
