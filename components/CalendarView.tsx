
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Target, Plus, CheckCircle2 } from 'lucide-react';
import { TaskItem } from '../types';

interface CalendarViewProps {
  tasks: TaskItem[];
  onDateClick: (date: Date) => void;
  onUpdateTask: (id: string, updates: Partial<TaskItem>) => void;
}

interface DayCellProps {
  day: number | null;
  isCurrentMonth: boolean;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onDateClick, onUpdateTask }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const getTasksForDay = (day: number) => {
    return tasks.filter(task => {
        if (!task.dueDate) return false;
        const d = new Date(task.dueDate);
        return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const DayCell: React.FC<DayCellProps> = ({ day, isCurrentMonth }) => {
    if (day === null) return <div className="h-24 md:h-32 bg-canvas/30 border border-border/20 rounded-xl m-0.5" />;
    
    const dayTasks = getTasksForDay(day);
    const hasHighPrio = dayTasks.some(t => t.priority === 'high' && t.status !== 'done');
    const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

    return (
      <div 
        onClick={() => onDateClick(new Date(year, month, day))}
        className={`h-24 md:h-32 p-2 border rounded-xl transition-all cursor-pointer overflow-hidden flex flex-col gap-1 m-0.5 relative group
          ${isToday ? 'bg-accent/5 border-accent shadow-[0_0_15px_var(--color-accent-glow)]' : 'bg-surface border-border hover:border-accent/50 hover:shadow-md'}
          ${hasHighPrio && !isToday ? 'border-red-500/30 bg-red-500/5' : ''}
        `}
      >
        <div className="flex justify-between items-center mb-1">
          <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-accent text-white' : 'text-text-muted group-hover:text-text-main'}`}>{day}</span>
          {dayTasks.length > 0 && (
             <span className="text-[9px] font-black bg-canvas border border-border px-1.5 py-0.5 rounded-md text-text-muted">
                {dayTasks.length}
             </span>
          )}
        </div>
        
        <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
           {dayTasks.slice(0, 3).map(task => (
              <div 
                key={task.id} 
                className={`text-[9px] truncate px-1.5 py-1 rounded border transition-colors
                  ${task.status === 'done' ? 'bg-green-500/10 border-green-500/20 text-green-600 line-through opacity-60' : 
                    task.priority === 'high' ? 'bg-red-500/10 border-red-500/20 text-red-500 font-bold' : 
                    'bg-canvas border-border text-text-main hover:border-accent/30'}
                `}
                title={task.content}
              >
                {task.content}
              </div>
           ))}
           {dayTasks.length > 3 && <div className="text-[8px] text-text-muted text-center font-medium">+{dayTasks.length - 3} more</div>}
        </div>
        
        <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
            <Plus className="text-accent opacity-50" size={24} />
        </div>
      </div>
    );
  };

  const days: (number | null)[] = [];
  // Padding for start of month
  for (let i = 0; i < startDay; i++) days.push(null);
  // Real days
  for (let i = 1; i <= totalDays; i++) days.push(i);

  return (
    <div className="bg-surface/50 backdrop-blur-xl border border-border rounded-3xl overflow-hidden shadow-2xl animate-fade-in h-full flex flex-col">
      <div className="p-6 border-b border-border flex items-center justify-between bg-canvas/80 shrink-0">
         <div className="flex items-center gap-6">
            <h2 className="text-3xl font-black brand-font text-text-main flex items-baseline gap-2">
               {monthName} <span className="text-lg text-text-muted font-light">{year}</span>
            </h2>
            <div className="flex bg-surface border border-border rounded-xl p-1 shadow-sm">
               <button onClick={prevMonth} className="p-2 hover:bg-canvas rounded-lg transition-colors text-text-muted hover:text-text-main"><ChevronLeft size={18} /></button>
               <button onClick={nextMonth} className="p-2 hover:bg-canvas rounded-lg transition-colors text-text-muted hover:text-text-main"><ChevronRight size={18} /></button>
            </div>
         </div>
         <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-text-muted">
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> Critical</div>
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent" /> Active</div>
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500 opacity-50" /> Done</div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-canvas/30 p-2 flex-1 overflow-y-auto">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="py-3 text-center text-xs font-black uppercase tracking-widest text-text-muted opacity-60">{d}</div>
        ))}
        {days.map((day, idx) => <DayCell key={idx} day={day} isCurrentMonth={true} />)}
      </div>
    </div>
  );
};

export default CalendarView;
