
import React, { useState, useRef, useMemo } from 'react';
import { TaskItem, TaskStatus, Priority, AppLanguage } from '../types';
import { 
  CheckCircle2, 
  Circle, 
  Calendar as CalendarIcon, 
  Layout, 
  List, 
  Plus, 
  Sparkles, 
  Clock, 
  Trash2,
  CalendarDays,
  X,
  ArrowUp,
  SlidersHorizontal,
  AlignLeft,
  Flag,
  Tag,
  ChevronDown,
  Target,
  Zap,
  Bell
} from 'lucide-react';
import { parseNaturalLanguageTask, optimizeSchedule } from '../services/gemini';
import { v4 as uuidv4 } from 'uuid';
import { getTranslation } from '../services/translations';
import CalendarView from './CalendarView';

interface TaskManagerProps {
  tasks: TaskItem[];
  onCreateTask: (task: TaskItem) => void;
  onUpdateTask: (id: string, updates: Partial<TaskItem>) => void;
  onDeleteTask: (id: string) => void;
  // Legacy prop for compatibility if parent hasn't updated yet, can be ignored in new implement
  onTasksChange?: (tasks: TaskItem[]) => void;
  aiEnabled: boolean;
  language: AppLanguage;
}

const TaskManager: React.FC<TaskManagerProps> = ({ tasks, onCreateTask, onUpdateTask, onDeleteTask, aiEnabled, language }) => {
  const t = (key: string) => getTranslation(language, key);
  const [view, setView] = useState<'list' | 'board' | 'calendar'>('list');
  const [newTaskInput, setNewTaskInput] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<Priority>('medium');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Modal State
  const [modalContent, setModalContent] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalPriority, setModalPriority] = useState<Priority>('medium');
  const [modalDate, setModalDate] = useState('');
  const [modalTags, setModalTags] = useState('');
  const [modalAdaptive, setModalAdaptive] = useState(true);

  const handleSmartAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTaskInput.trim()) return;

    setIsProcessing(true);
    try {
        let newTask: TaskItem;
        const manualDate = selectedDate ? new Date(selectedDate).toISOString() : undefined;

        if (aiEnabled && !manualDate) {
            const parsed = await parseNaturalLanguageTask(newTaskInput);
            if (parsed) {
                newTask = { 
                    ...parsed, 
                    id: uuidv4(), 
                    status: 'todo', 
                    priority: selectedPriority !== 'medium' ? selectedPriority : parsed.priority,
                    created_at: new Date().toISOString()
                };
            } else {
                newTask = { id: uuidv4(), content: newTaskInput, status: 'todo', priority: selectedPriority, created_at: new Date().toISOString() };
            }
        } else {
            newTask = { 
                id: uuidv4(), 
                content: newTaskInput, 
                status: 'todo', 
                priority: selectedPriority,
                dueDate: manualDate,
                created_at: new Date().toISOString()
            };
        }
        
        onCreateTask(newTask);
        setNewTaskInput('');
        setSelectedDate('');
        setSelectedPriority('medium');
    } catch (err) {
        console.error("Task creation error:", err);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDetailedCreate = (e: React.FormEvent) => {
      e.preventDefault();
      if (!modalContent.trim()) return;

      const newTask: TaskItem = {
          id: uuidv4(),
          content: modalContent,
          description: modalDescription,
          priority: modalPriority,
          status: 'todo',
          dueDate: modalDate ? new Date(modalDate).toISOString() : undefined,
          tags: modalTags.split(',').map(t => t.trim()).filter(t => t),
          reminder: modalDate ? {
              id: uuidv4(),
              time: modalDate,
              type: 'once',
              isAdaptive: modalAdaptive
          } : undefined,
          created_at: new Date().toISOString()
      };

      onCreateTask(newTask);
      setIsCreateModalOpen(false);
      setModalContent('');
      setModalDescription('');
      setModalPriority('medium');
      setModalDate('');
      setModalTags('');
  };

  const handleSmartSchedule = async () => {
      if (!aiEnabled) return;
      setIsProcessing(true);
      const activeTasks = tasks.filter(t => t.status !== 'done');
      
      try {
          const optimized = await optimizeSchedule(activeTasks);
          // Optimization returns a reordered list. 
          // Since our DB sorts by default, we might need a sort_order field in future.
          // For now, we'll just alert that this feature is best effort in list view or update priorities.
          alert("Optimization complete. (Visual reordering not fully supported in DB mode yet).");
      } catch (e) { console.error(e); }
      finally { setIsProcessing(false); }
  };

  const todayTasks = useMemo(() => tasks.filter(task => {
      if (!task.dueDate) return false;
      const d = new Date(task.dueDate);
      const today = new Date();
      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }), [tasks]);

  const highPrioCount = tasks.filter(t => t.priority === 'high' && t.status !== 'done').length;

  const ListView = () => (
      <div className="space-y-6 animate-fade-in pb-32">
          {todayTasks.length > 0 && (
              <div className="bg-accent/5 border border-accent/20 rounded-3xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Target size={80} /></div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-accent mb-4 flex items-center gap-2">
                      <Target size={16} /> {t('today_focus')}
                  </h3>
                  <div className="space-y-2">
                    {todayTasks.map(task => (
                        <div key={task.id} className="flex items-center gap-3 p-3 bg-surface border border-accent/10 rounded-xl group">
                            <button onClick={() => onUpdateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })} className={task.status === 'done' ? 'text-green-500' : 'text-accent'}>
                                {task.status === 'done' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                            </button>
                            <span className={`flex-1 text-sm font-bold ${task.status === 'done' ? 'text-text-muted line-through' : 'text-text-main'}`}>{task.content}</span>
                            {/* Fix: wrap Zap icon in a span to properly use the 'title' attribute for tooltips */}
                            {task.reminder?.isAdaptive && (
                                <span title="Adaptive Reminder Active">
                                    <Zap size={12} className="text-amber-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                                </span>
                            )}
                        </div>
                    ))}
                  </div>
              </div>
          )}

          <div className="space-y-2">
              {tasks.map(task => (
                  <div key={task.id} className="flex items-start gap-3 p-4 bg-surface border border-border rounded-2xl group hover:border-accent/30 transition-all shadow-sm">
                      <button 
                        onClick={() => onUpdateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })}
                        className={`transition-colors flex-shrink-0 mt-0.5 ${task.status === 'done' ? 'text-green-500' : 'text-text-muted hover:text-accent'}`}
                      >
                          {task.status === 'done' ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                          <p className={`text-base font-medium truncate ${task.status === 'done' ? 'text-text-muted line-through' : 'text-text-main'}`}>{task.content}</p>
                          {task.description && <p className="text-xs text-text-muted mt-1 line-clamp-2">{task.description}</p>}
                          <div className="flex items-center gap-2 mt-2">
                              {task.dueDate && (
                                  <span className="text-[11px] flex items-center gap-1 text-red-400 bg-red-500/5 border border-red-500/10 px-2 py-0.5 rounded-full font-medium">
                                      <Clock size={10} /> {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                                  </span>
                              )}
                              {task.reminder && <Bell size={10} className="text-accent" />}
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${
                                  task.priority === 'high' ? 'bg-red-100 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' : 
                                  task.priority === 'medium' ? 'bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' : 
                                  'bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                              }`}>
                                  {task.priority === 'high' ? t('high_prio') : task.priority === 'medium' ? t('med_prio') : t('low_prio')}
                              </span>
                          </div>
                      </div>

                      <button onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }} className="opacity-0 group-hover:opacity-100 p-2 text-text-muted hover:text-red-500 transition-opacity">
                          <Trash2 size={18} />
                      </button>
                  </div>
              ))}
          </div>

          {tasks.length === 0 && (
              <div className="text-center py-20 text-text-muted opacity-50">
                  <CheckCircle2 size={64} className="mx-auto mb-6 text-accent/20" />
                  <p className="text-lg">{t('no_tasks')}</p>
              </div>
          )}
      </div>
  );

  const BoardView = () => (
      <div className="flex gap-6 h-full overflow-x-auto pb-4 animate-fade-in snap-x">
          {['todo', 'in-progress', 'done'].map((status) => (
              <div key={status} className="flex-1 min-w-[300px] bg-canvas/30 border border-border rounded-2xl flex flex-col max-h-[75vh] snap-center">
                  <div className="p-4 border-b border-border font-black text-xs uppercase tracking-widest text-text-muted flex justify-between items-center capitalize">
                      {status.replace('-', ' ')} <span className="bg-surface px-2 py-1 rounded-md text-[10px] border border-border text-text-main font-bold">{tasks.filter(t => t.status === status).length}</span>
                  </div>
                  <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                      {tasks.filter(t => t.status === status).map(task => (
                          <div 
                            key={task.id} 
                            onClick={() => onUpdateTask(task.id, { status: status === 'todo' ? 'in-progress' : status === 'in-progress' ? 'done' : 'todo' })}
                            className="bg-surface p-4 rounded-xl border border-border shadow-sm hover:shadow-md hover:border-accent/50 cursor-pointer group transition-all"
                          >
                              <p className="text-sm font-medium text-text-main mb-3 leading-relaxed">{task.content}</p>
                              <div className="flex justify-between items-center">
                                  <div className={`w-2 h-2 rounded-full ring-2 ring-opacity-30 ${
                                      task.priority === 'high' ? 'bg-red-500 ring-red-500' : task.priority === 'medium' ? 'bg-amber-500 ring-amber-500' : 'bg-blue-500 ring-blue-500'
                                  }`} />
                                  <div className="flex items-center gap-2">
                                     {task.dueDate && <span className="text-[10px] font-mono text-text-muted bg-canvas px-2 py-1 rounded border border-border">{new Date(task.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>}
                                     <button onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }} className="text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          ))}
      </div>
  );

  return (
    <div className="flex flex-col h-full bg-canvas relative overflow-hidden">
        {/* Header */}
        <div className="px-6 py-6 pb-2 flex flex-col gap-6 sticky top-0 z-20 bg-canvas/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold brand-font text-text-main tracking-tight">{t('command_center')}</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-text-muted font-light">Orchestrate your actions.</span>
                        {highPrioCount > 0 && <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-black uppercase rounded animate-pulse">{highPrioCount} CRITICAL ITEMS</span>}
                    </div>
                </div>
                
                <div className="flex items-center gap-1 bg-surface p-1.5 rounded-xl border border-border shadow-sm">
                    <button onClick={() => setView('list')} className={`p-2.5 rounded-lg transition-all ${view === 'list' ? 'bg-accent text-white shadow-md' : 'text-text-muted hover:bg-canvas hover:text-text-main'}`}><List size={18}/></button>
                    <button onClick={() => setView('board')} className={`p-2.5 rounded-lg transition-all ${view === 'board' ? 'bg-accent text-white shadow-md' : 'text-text-muted hover:bg-canvas hover:text-text-main'}`}><Layout size={18}/></button>
                    <button onClick={() => setView('calendar')} className={`p-2.5 rounded-lg transition-all ${view === 'calendar' ? 'bg-accent text-white shadow-md' : 'text-text-muted hover:bg-canvas hover:text-text-main'}`}><CalendarIcon size={18}/></button>
                </div>
            </div>

            {/* Smart Input Bar */}
            <div className="relative w-full group pb-2">
                <div className={`absolute inset-0 bg-gradient-to-r from-accent/20 to-purple-500/20 rounded-2xl blur-lg transition-opacity duration-500 ${isProcessing ? 'opacity-100' : 'opacity-0'}`}></div>
                <form onSubmit={handleSmartAdd} className="relative flex items-center bg-surface border border-border rounded-2xl shadow-lg transition-all focus-within:ring-2 focus-within:ring-accent/50 focus-within:border-accent overflow-hidden p-1.5">
                    <div className="pl-3 pr-2 text-text-muted">
                        {isProcessing ? <Sparkles size={20} className="text-accent animate-spin" /> : <Plus size={20} />}
                    </div>
                    <input 
                        type="text" 
                        value={newTaskInput}
                        onChange={(e) => setNewTaskInput(e.target.value)}
                        placeholder="What's next? (Try: 'Meeting tomorrow at 10am high priority')" 
                        className="flex-1 bg-transparent py-3 text-text-main placeholder:text-text-muted/50 outline-none text-base min-w-0"
                    />
                    
                    <div className="flex items-center gap-1 pr-2">
                        <button 
                            type="button"
                            onClick={() => setSelectedPriority(p => p === 'low' ? 'medium' : p === 'medium' ? 'high' : 'low')}
                            className={`p-2 rounded-xl border border-transparent transition-all flex items-center gap-1.5 font-bold text-[10px] uppercase ${
                                selectedPriority === 'high' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                                selectedPriority === 'medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                                'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            }`}
                        >
                            <Flag size={14} /> <span className="hidden sm:inline">{selectedPriority}</span>
                        </button>

                        <button 
                            type="button"
                            onClick={() => dateInputRef.current?.showPicker()}
                            className={`p-2 rounded-xl transition-colors ${selectedDate ? 'text-accent bg-accent/10' : 'text-text-muted hover:text-text-main hover:bg-canvas'}`}
                        >
                            <CalendarDays size={20} />
                        </button>
                        <input 
                            type="datetime-local" 
                            ref={dateInputRef} 
                            className="w-0 h-0 opacity-0 absolute pointer-events-none" 
                            onChange={(e) => setSelectedDate(e.target.value)} 
                        />
                        
                        <button 
                             type="button"
                             onClick={() => setIsCreateModalOpen(true)}
                             className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-canvas transition-colors"
                             title="Full Details"
                        >
                            <SlidersHorizontal size={20} />
                        </button>

                        <button 
                            type="submit"
                            className="bg-accent hover:bg-accent-hover text-white p-3 rounded-xl shadow-md transition-all flex items-center justify-center disabled:opacity-50"
                            disabled={!newTaskInput.trim()}
                        >
                            <ArrowUp size={18} />
                        </button>
                    </div>
                </form>
            </div>
            
            {aiEnabled && tasks.length > 0 && view !== 'calendar' && (
                <div className="flex justify-end">
                    <button 
                        type="button" 
                        onClick={handleSmartSchedule}
                        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-canvas hover:bg-accent hover:text-white border border-border text-text-muted px-3 py-1.5 rounded-lg transition-all"
                    >
                        <Sparkles size={12} /> {t('optimize')}
                    </button>
                </div>
            )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
            {view === 'list' && <ListView />}
            {view === 'board' && <BoardView />}
            {view === 'calendar' && (
                <CalendarView 
                    tasks={tasks} 
                    onDateClick={(d) => { setModalDate(d.toISOString().slice(0, 16)); setIsCreateModalOpen(true); }} 
                    onUpdateTask={onUpdateTask}
                />
            )}
        </div>

        {/* Create Task Modal */}
        {isCreateModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4" onClick={() => setIsCreateModalOpen(false)}>
                <div className="bg-surface border border-border w-full max-w-lg rounded-3xl shadow-2xl p-8 relative animate-slide-up" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-bold text-text-main brand-font">{t('create_task')}</h2>
                        <button onClick={() => setIsCreateModalOpen(false)} className="text-text-muted hover:text-text-main"><X size={24} /></button>
                    </div>

                    <form onSubmit={handleDetailedCreate} className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wide text-text-muted ml-1">{t('task_name')}</label>
                            <input type="text" autoFocus value={modalContent} onChange={(e) => setModalContent(e.target.value)} className="w-full bg-canvas border border-border rounded-xl px-4 py-4 text-text-main focus:ring-2 focus:ring-accent/20 outline-none text-lg" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wide text-text-muted ml-1">{t('details')}</label>
                            <textarea value={modalDescription} onChange={(e) => setModalDescription(e.target.value)} className="w-full bg-canvas border border-border rounded-xl px-4 py-3 text-text-main min-h-[80px] resize-none outline-none focus:ring-2 focus:ring-accent/20" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wide text-text-muted ml-1">{t('high_prio')}/{t('med_prio')}/{t('low_prio')}</label>
                                <select value={modalPriority} onChange={(e) => setModalPriority(e.target.value as Priority)} className="w-full bg-canvas border border-border rounded-xl px-4 py-3 text-text-main appearance-none">
                                    <option value="low">{t('low_prio')}</option>
                                    <option value="medium">{t('med_prio')}</option>
                                    <option value="high">{t('high_prio')}</option>
                                </select>
                             </div>
                             <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wide text-text-muted ml-1">{t('due_date')}</label>
                                <input type="datetime-local" value={modalDate} onChange={(e) => setModalDate(e.target.value)} className="w-full bg-canvas border border-border rounded-xl px-4 py-2.5 text-text-main" />
                             </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-canvas border border-border rounded-2xl">
                             <div className="flex items-center gap-3">
                                <Zap size={20} className="text-amber-500" />
                                <div>
                                    <p className="text-sm font-bold text-text-main">Adaptive Timing</p>
                                    <p className="text-[10px] text-text-muted">Notify me when I am most productive.</p>
                                </div>
                             </div>
                             {/* Fix: Access 'checked' from e.target.checked */}
                             <input type="checkbox" checked={modalAdaptive} onChange={(e) => setModalAdaptive(e.target.checked)} className="toggle-checkbox" />
                        </div>

                        <button type="submit" disabled={!modalContent.trim()} className="w-full py-4 bg-accent hover:bg-accent-hover text-white rounded-xl font-black text-sm uppercase tracking-[0.2em] shadow-lg shadow-accent/20 transition-all">{t('create_task')}</button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default TaskManager;
