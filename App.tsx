
import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Sidebar from './components/Sidebar';
import NoteList from './components/NoteList';
import NoteEditor from './components/NoteEditor';
import AIChat from './components/AIChat';
import AuthScreen from './components/AuthScreen';
import { Note, NoteType, UserHabits, AppSettings, AppThemeColor, AppLanguage, Template, TaskItem, SyncState } from './types';
import { 
  fetchNotes, 
  fetchPublicNotes,
  saveNote as supabaseSaveNote, 
  deleteNote as supabaseDeleteNote,
  getCurrentSession,
  signOut,
  syncOfflineChanges,
  fetchGlobalTasks,
  createTask,
  updateTask as supabaseUpdateTask,
  deleteTask as supabaseDeleteTask,
  forkNote
} from './services/supabase';
import { analyzeUserHabits } from './services/gemini';
import { LogOut, Menu, Shield, Loader2, Bell, Zap, X, CheckCircle2, Cloud, CloudOff, FileText } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { getTranslation } from './services/translations';

// Lazy load heavy components
const InspirationHub = lazy(() => import('./components/InspirationHub'));
const ImportModal = lazy(() => import('./components/ImportModal'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const ProductivityHub = lazy(() => import('./components/ProductivityHub'));
const OnboardingTour = lazy(() => import('./components/OnboardingTour'));
const TaskManager = lazy(() => import('./components/TaskManager'));
const TemplateGallery = lazy(() => import('./components/TemplateGallery'));
const CommunityFeed = lazy(() => import('./components/CommunityFeed'));

const THEME_COLORS: Record<AppThemeColor, { main: string, hover: string, glow: string }> = {
  indigo: { main: '#818cf8', hover: '#6366f1', glow: 'rgba(129, 140, 248, 0.5)' },
  blue: { main: '#3b82f6', hover: '#2563eb', glow: 'rgba(59, 130, 246, 0.5)' },
  emerald: { main: '#10b981', hover: '#059669', glow: 'rgba(16, 185, 129, 0.5)' },
  rose: { main: '#f43f5e', hover: '#e11d48', glow: 'rgba(244, 63, 94, 0.5)' },
  amber: { main: '#f59e0b', hover: '#d97706', glow: 'rgba(245, 158, 11, 0.5)' },
  violet: { main: '#8b5cf6', hover: '#7c3aed', glow: 'rgba(139, 92, 246, 0.5)' },
};

function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [settings, setSettings] = useState<AppSettings>({
    language: 'en',
    aiPersonality: 'standard',
    defaultAiContext: 'hybrid',
    fontFamily: 'inter',
    reduceMotion: false,
    autoSaveInterval: 5, 
    themeColor: 'indigo',
    backgroundAnalysis: false,
    enableNotifications: true,
    soundEffects: false
  });
  
  const [syncState, setSyncState] = useState<SyncState>('synced');
  const [activeNotification, setActiveNotification] = useState<{ id: string, title: string, body: string, isAdaptive?: boolean } | null>(null);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importStatus, setImportStatus] = useState({ processing: false, count: 0 });
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

  const [session, setSession] = useState<Session | null>(null);
  // JUDGE MODE: Default isGuest to true to bypass AuthScreen
  const [isGuest, setIsGuest] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  const [notes, setNotes] = useState<Note[]>([]);
  const [publicNotes, setPublicNotes] = useState<Note[]>([]); 
  const [globalTasks, setGlobalTasks] = useState<TaskItem[]>([]);
  
  const [activeType, setActiveType] = useState<NoteType | 'all' | 'productivity' | 'tasks' | 'community'>('all');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  
  const [userHabits, setUserHabits] = useState<UserHabits | null>(null);
  const [isBackgroundAnalyzing, setIsBackgroundAnalyzing] = useState(false);

  const t = (key: string) => getTranslation(settings.language, key);

  // Sync Monitoring
  useEffect(() => {
    const handleSync = async () => {
        if (!navigator.onLine) { setSyncState('offline'); return; }
        setSyncState('pending');
        const state = await syncOfflineChanges();
        setSyncState(state);
    };
    window.addEventListener('online', handleSync);
    window.addEventListener('offline', () => setSyncState('offline'));
    const interval = setInterval(handleSync, 30000); 
    return () => { window.removeEventListener('online', handleSync); clearInterval(interval); };
  }, []);

  // Adaptive Reminder Monitor
  useEffect(() => {
    if (!settings.enableNotifications) return;
    const checkReminders = () => {
        const now = new Date();
        const hour = now.getHours();
        const peakHour = userHabits?.productivity.peakTime ? parseInt(userHabits.productivity.peakTime) : null;
        
        globalTasks.forEach(task => {
            if (task.status === 'done' || !task.reminder) return;
            
            const reminderTime = new Date(task.reminder.time);
            const isDue = reminderTime <= now;
            const isAdaptiveBatchTime = task.reminder.isAdaptive && peakHour !== null && hour === peakHour;

            if (isDue || isAdaptiveBatchTime) {
                const lastNotified = task.reminder.lastNotified ? new Date(task.reminder.lastNotified) : null;
                const tenMinsAgo = new Date(now.getTime() - 10 * 60000);
                
                if (!lastNotified || lastNotified < tenMinsAgo) {
                    setActiveNotification({
                        id: task.id,
                        title: task.reminder.isAdaptive ? "Peak Focus Window" : "Reminder",
                        body: task.content,
                        isAdaptive: task.reminder.isAdaptive
                    });
                    if (settings.soundEffects) {
                        const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
                        audio.play().catch(() => {});
                    }
                    setGlobalTasks(prev => prev.map(t => t.id === task.id ? { ...t, reminder: { ...t.reminder!, lastNotified: now.toISOString() } } : t));
                }
            }
        });
    };
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [globalTasks, userHabits, settings.enableNotifications, settings.soundEffects]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    const colors = THEME_COLORS[settings.themeColor];
    const root = document.documentElement;
    root.style.setProperty('--color-accent', colors.main);
    root.style.setProperty('--color-accent-hover', colors.hover);
    root.style.setProperty('--color-accent-glow', colors.glow);
  }, [settings.themeColor]);

  useEffect(() => {
    document.body.classList.remove('font-inter', 'font-serif', 'font-mono');
    if (settings.fontFamily === 'inter') document.body.classList.add('font-inter');
    if (settings.fontFamily === 'serif') document.body.classList.add('font-serif');
    if (settings.fontFamily === 'mono') document.body.classList.add('font-mono');
  }, [settings.fontFamily]);

  useEffect(() => {
    if (authInitialized) return;

    const initAuth = async () => {
      const { session } = await getCurrentSession();
      setSession(session);
      
      if (session || isGuest) {
        const data = await fetchNotes();
        setNotes(data);
        
        // Fetch real tasks from DB
        const savedTasks = await fetchGlobalTasks();
        setGlobalTasks(savedTasks);
        
        // Strict Onboarding Check
        const done = localStorage.getItem('ft_onboarding_complete');
        if (!done && data.length < 5) setShowOnboarding(true);
      }
      setAuthInitialized(true);
    };
    initAuth();
  }, [isGuest, authInitialized]);

  // Load public notes when Community tab is active OR when user might have published something
  useEffect(() => {
      fetchPublicNotes().then(setPublicNotes);
  }, [activeType, notes]); 

  const handleOnboardingComplete = useCallback((newSettings: Partial<AppSettings>, startView: string) => {
    localStorage.setItem('ft_onboarding_complete', 'true');
    if (newSettings.backgroundAnalysis !== undefined) {
        localStorage.setItem('ft_ai_consent', newSettings.backgroundAnalysis ? 'granted' : 'denied');
    }
    setSettings(prev => ({ ...prev, ...newSettings }));
    if (startView === 'tasks') setActiveType('tasks');
    else if (startView === 'inspiration') { setActiveType('all'); setSelectedNoteId(null); }
    else setActiveType('all');
    setShowOnboarding(false);
  }, []);

  const handlePreviewSettings = useCallback((newSettings: Partial<AppSettings>) => {
      setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Wrap saveNote to stabilize reference
  const handleSaveNote = useCallback(async (n: Note) => {
      await supabaseSaveNote(n);
      setNotes(prev => prev.map(x => x.id === n.id ? n : x));
      
      // If note was made public, refresh public notes list
      if (n.is_public) {
          fetchPublicNotes().then(setPublicNotes);
      }
  }, []);

  // --- Task CRUD Wrappers ---
  const handleCreateTask = useCallback(async (task: TaskItem) => {
      // Optimistic update
      setGlobalTasks(prev => [task, ...prev]);
      await createTask(task);
  }, []);

  const handleUpdateTask = useCallback(async (id: string, updates: Partial<TaskItem>) => {
      setGlobalTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      await supabaseUpdateTask(id, updates);
  }, []);

  const handleDeleteTask = useCallback(async (id: string) => {
      setGlobalTasks(prev => prev.filter(t => t.id !== id));
      await supabaseDeleteTask(id);
  }, []);

  const handleNewNote = useCallback(async (titleOrEvent?: string | React.MouseEvent, contentString?: string) => {
    const actualTitle = typeof titleOrEvent === 'string' ? titleOrEvent : '';
    const actualContent = typeof contentString === 'string' ? contentString : '';
    const newNote: Note = {
      id: uuidv4(),
      title: actualTitle,
      content: actualContent,
      type: 'note',
      is_public: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: { artifacts: [], visibility: 'private' }
    };
    
    await supabaseSaveNote(newNote);
    setNotes(prev => [newNote, ...prev]);
    setSelectedNoteId(newNote.id);
    setActiveType('all');
    setIsMobileMenuOpen(false); 
  }, []);

  const handleSelectNote = useCallback((note: Note) => setSelectedNoteId(note.id), []);
  const handleSelectNoteById = useCallback((id: string) => setSelectedNoteId(id), []);

  const getFilteredNotes = () => {
      if (activeType === 'community') return publicNotes; // NoteList not used in community mode usually, but for fallback
      return notes.filter(n => {
          if (activeType === 'all' || activeType === 'productivity' || activeType === 'tasks') return true;
          return n.type === activeType;
      });
  };

  const filteredNotes = getFilteredNotes();
  const selectedNote = activeType === 'community' 
      ? publicNotes.find(n => n.id === selectedNoteId)
      : notes.find(n => n.id === selectedNoteId);
      
  const isAdmin = session?.user?.user_metadata?.role === 'admin';

  if (!authInitialized) {
    return <div className="h-[100dvh] bg-canvas flex items-center justify-center text-accent"><Loader2 size={32} className="animate-spin" /></div>;
  }

  if (!session && !isGuest) {
    return <AuthScreen onLogin={() => setAuthInitialized(false)} onGuestEntry={() => setIsGuest(true)} language={settings.language} onLanguageChange={(l) => setSettings(s => ({...s, language: l}))} />;
  }

  return (
    <div className="flex h-[100dvh] bg-canvas text-text-main overflow-hidden relative transition-colors duration-300">
      
      {isAdmin && (
          <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[300] bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-b-lg shadow-lg pointer-events-none">
              ADMIN MODE
          </div>
      )}

      {activeNotification && (
          <div className="fixed top-6 right-6 z-[300] w-full max-w-sm p-4 md:p-0 animate-slide-up">
              <div className={`p-6 rounded-3xl shadow-2xl border backdrop-blur-2xl flex items-start gap-4 transition-all ${activeNotification.isAdaptive ? 'bg-amber-500/10 border-amber-500/30' : 'bg-surface/90 border-border'}`}>
                  <div className={`p-3 rounded-2xl ${activeNotification.isAdaptive ? 'bg-amber-500 text-white' : 'bg-accent text-white shadow-lg shadow-accent/20'}`}>
                      {activeNotification.isAdaptive ? <Zap size={24} /> : <Bell size={24} />}
                  </div>
                  <div className="flex-1 min-w-0">
                      <p className="text-xs font-black uppercase tracking-widest text-text-muted mb-1">{activeNotification.title}</p>
                      <p className="text-sm font-bold text-text-main leading-tight truncate">{activeNotification.body}</p>
                      <div className="flex gap-2 mt-4">
                          <button onClick={() => setActiveNotification(null)} className="flex-1 py-2 px-4 bg-accent text-white rounded-xl text-xs font-bold shadow-lg shadow-accent/20">Acknowledge</button>
                          <button onClick={() => setActiveNotification(null)} className="p-2 text-text-muted hover:text-text-main"><X size={16}/></button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Background Import Toast */}
      {importStatus.processing && !isImportOpen && (
         <div className="fixed bottom-6 left-6 z-[200] animate-slide-up">
             <div className="bg-surface/90 backdrop-blur border border-accent/20 rounded-xl p-4 shadow-xl flex items-center gap-3 w-64">
                 <div className="p-2 bg-accent/10 rounded-lg text-accent">
                     <Loader2 size={16} className="animate-spin" />
                 </div>
                 <div className="flex-1">
                     <p className="text-xs font-bold text-text-main">Importing in background...</p>
                     <p className="text-[10px] text-text-muted">{importStatus.count} files remaining</p>
                 </div>
                 <button onClick={() => setIsImportOpen(true)} className="text-xs font-bold text-accent hover:underline">View</button>
             </div>
         </div>
      )}

      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm animate-fade-in" onClick={() => setIsMobileMenuOpen(false)} />}

      <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         <Sidebar 
          onTypeSelect={(t) => { setActiveType(t); setIsMobileMenuOpen(false); setSelectedNoteId(null); }}
          activeType={activeType}
          onNewNote={() => handleNewNote()}
          noteCounts={{ total: notes.filter(n => n.id !== 'system_tasks_v1').length }}
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
          isDarkMode={isDarkMode}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenImport={() => { setIsImportOpen(true); setIsMobileMenuOpen(false); }}
          onOpenSettings={() => { setIsSettingsOpen(true); setIsMobileMenuOpen(false); }}
          onOpenTemplates={() => { setIsTemplatesOpen(true); setIsMobileMenuOpen(false); }}
          aiEnabled={settings.backgroundAnalysis}
          language={settings.language}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
        <div className={`absolute bottom-4 ${isSidebarCollapsed ? 'left-1/2 -translate-x-1/2' : 'left-8'} z-30 transition-all`}>
            <div className="group relative">
                {syncState === 'synced' ? <Cloud size={14} className="text-green-500 opacity-50" /> : 
                 syncState === 'pending' ? <Loader2 size={14} className="text-accent animate-spin" /> : 
                 <CloudOff size={14} className="text-red-500" />}
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black/80 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap uppercase tracking-widest">
                    Sync Status: {syncState}
                </div>
            </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative w-full">
        <div className={`md:hidden flex items-center p-4 border-b border-border bg-canvas/95 backdrop-blur z-30 flex-shrink-0 ${selectedNoteId ? 'hidden' : ''}`}>
           <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-text-muted hover:text-text-main"><Menu size={24} /></button>
           <span className="ml-4 font-bold text-lg brand-font">Fortuitous</span>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {activeType !== 'productivity' && activeType !== 'tasks' && activeType !== 'community' && (
             <div className={`${selectedNoteId ? 'hidden md:flex' : 'flex'} flex-shrink-0 h-full w-full md:w-80`}>
                <NoteList 
                    notes={filteredNotes} 
                    selectedNoteId={selectedNoteId} 
                    onSelectNote={handleSelectNote} 
                    onDeleteNote={(id, e) => { 
                        e.stopPropagation(); 
                        setNotes(n => n.filter(x => x.id !== id)); 
                        supabaseDeleteNote(id); 
                    }} 
                    language={settings.language} 
                />
             </div>
          )}
          
          <div className={`flex-1 h-full w-full overflow-hidden ${(!selectedNoteId && activeType === 'all') ? 'hidden md:block' : ''}`}>
             <Suspense fallback={<div className="h-full w-full flex items-center justify-center"><Loader2 size={32} className="animate-spin text-accent" /></div>}>
               {activeType === 'productivity' ? (
                  <ProductivityHub notes={notes} userHabits={userHabits} globalTasks={globalTasks} aiEnabled={settings.backgroundAnalysis} language={settings.language} />
               ) : activeType === 'tasks' ? (
                  <TaskManager 
                    tasks={globalTasks} 
                    onCreateTask={handleCreateTask}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    aiEnabled={settings.backgroundAnalysis} 
                    language={settings.language} 
                  />
               ) : activeType === 'community' && !selectedNoteId ? (
                  <CommunityFeed 
                    notes={publicNotes} 
                    onSelectNote={handleSelectNote} 
                    onForkNote={async (n) => {
                        const newNote = await forkNote(n);
                        if (newNote) {
                            setNotes(prev => [newNote, ...prev]);
                            alert("Thought forked to your library.");
                        }
                    }} 
                  />
               ) : selectedNote ? (
                  <NoteEditor 
                    note={selectedNote} 
                    onRequestContext={async () => notes} // Return ALL notes for context graph
                    onUpdate={(n) => {
                        // If updating a note from community, likely user forked it, so push to notes list
                        if (activeType === 'community' && n.id !== selectedNote.id) {
                            setNotes(prev => [n, ...prev]);
                        } else {
                            setNotes(prev => prev.map(x => x.id === n.id ? n : x));
                        }
                    }} 
                    onSave={handleSaveNote} 
                    onPersist={supabaseSaveNote} 
                    onAddGlobalTask={handleCreateTask} 
                    onSelectNoteById={handleSelectNoteById}
                    settings={settings} 
                    onBack={() => setSelectedNoteId(null)}
                    isReadOnly={activeType === 'community' && !selectedNote.metadata?.allowLinkEdit}
                  />
               ) : (
                  <InspirationHub onCreateNote={(t, c) => handleNewNote(t, c)} aiEnabled={settings.backgroundAnalysis} language={settings.language} />
               )}
             </Suspense>
          </div>
        </div>
      </div>

      <AIChat notes={notes} userHabits={userHabits} isBackgroundAnalyzing={isBackgroundAnalyzing} onNewNote={handleNewNote} defaultContext={settings.defaultAiContext} language={settings.language} />

      <Suspense fallback={null}>
        <ImportModal 
            isOpen={isImportOpen} 
            onClose={() => setIsImportOpen(false)} 
            onImportComplete={async (n: Note) => { await supabaseSaveNote(n); setNotes(prev => [n, ...prev]); }} 
            onStatusChange={setImportStatus}
            aiEnabled={settings.backgroundAnalysis} 
        />
        
        {isSettingsOpen && <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(!isDarkMode)} onClearData={() => setNotes([])} settings={settings} onUpdateSettings={setSettings} />}
        {isTemplatesOpen && <TemplateGallery onSelect={(t) => { handleNewNote(t.structure.title, t.structure.content); setIsTemplatesOpen(false); }} onClose={() => setIsTemplatesOpen(false)} />}
        
        {showOnboarding && (
            <OnboardingTour 
                onComplete={handleOnboardingComplete} 
                currentSettings={settings}
                onPreviewSettings={handlePreviewSettings}
                onToggleTheme={() => setIsDarkMode(!isDarkMode)}
                isDarkMode={isDarkMode}
            />
        )}
      </Suspense>
    </div>
  );
}

export default App;
