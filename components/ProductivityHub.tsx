
import React, { useMemo, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Brain, 
  Target, 
  Zap, 
  Clock, 
  FileText, 
  Layers, 
  Sparkles,
  Award,
  BookOpen,
  Smile,
  AlertTriangle,
  ArrowRight,
  PieChart,
  Activity,
  CheckCircle2,
  CalendarDays,
  XCircle,
  Inbox,
  X,
  Percent
} from 'lucide-react';
import { Note, UserHabits, AppLanguage, TaskItem } from '../types';

interface ProductivityHubProps {
  notes: Note[];
  userHabits: UserHabits | null;
  globalTasks?: TaskItem[]; // Added for Weekly Review
  aiEnabled: boolean;
  language: AppLanguage;
}

const ProductivityHub: React.FC<ProductivityHubProps> = ({ notes, userHabits, globalTasks = [], aiEnabled, language }) => {
  const [isReportOpen, setIsReportOpen] = useState(false);
  const totalNotes = notes.length;
  const totalArtifacts = notes.reduce((acc, note) => acc + (note.metadata?.artifacts?.length || 0), 0);
  const totalWords = notes.reduce((acc, note) => acc + note.content.split(/\s+/).length, 0);
  
  // Weekly Review Calculations
  const weeklyStats = useMemo(() => {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const createdNotes = notes.filter(n => new Date(n.created_at) > oneWeekAgo);
      const completedTasks = globalTasks.filter(t => t.status === 'done'); 
      const pendingTasks = globalTasks.filter(t => t.status !== 'done');
      
      return {
          created: createdNotes.length,
          completed: completedTasks.length,
          pending: pendingTasks.length,
      };
  }, [notes, globalTasks]);

  const taskStats = useMemo(() => {
      const total = globalTasks.length;
      if (total === 0) return { rate: 0, highRate: 0 };
      
      const completed = globalTasks.filter(t => t.status === 'done').length;
      const rate = Math.round((completed / total) * 100);

      const highPrio = globalTasks.filter(t => t.priority === 'high');
      const highCompleted = highPrio.filter(t => t.status === 'done').length;
      const highRate = highPrio.length > 0 ? Math.round((highCompleted / highPrio.length) * 100) : 0;

      return { rate, highRate };
  }, [globalTasks]);

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <div className="bg-surface border border-border p-5 md:p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-2.5 md:p-3 rounded-xl ${color} text-white shadow-lg`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-[10px] md:text-xs font-bold text-text-muted uppercase tracking-widest">{label}</p>
          <p className="text-xl md:text-2xl font-black text-text-main brand-font">{value}</p>
        </div>
      </div>
      <div className="w-full h-1 bg-canvas rounded-full overflow-hidden">
        <div className={`h-full opacity-50 transition-all duration-1000 ${color.split(' ')[0]}`} style={{ width: '70%' }}></div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full overflow-y-auto bg-canvas p-4 md:p-12 animate-fade-in custom-scrollbar pb-32 md:pb-12 relative">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-black brand-font text-text-main">Performance Dashboard</h1>
            <p className="text-text-muted text-sm md:text-lg font-light">Real-time analysis of your digital consciousness.</p>
          </div>
          {aiEnabled && (
            <div className="flex items-center gap-3 px-4 py-2 bg-accent/10 border border-accent/20 rounded-full text-accent text-xs md:text-sm font-bold animate-pulse w-fit">
               <Sparkles size={14} className="md:w-4 md:h-4" /> TRN Cognitive Sync Active
            </div>
          )}
        </div>

        {/* Weekly Review Cycle */}
        <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5"><CalendarDays size={120} /></div>
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6 md:mb-8">
                    <CalendarDays className="text-accent" />
                    <h2 className="text-xl md:text-2xl font-bold text-text-main brand-font">Weekly Review Cycle</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                    <div className="bg-canvas border border-border rounded-2xl p-5 md:p-6 flex flex-col">
                        <div className="flex items-center gap-2 mb-2 text-blue-500 font-bold text-xs uppercase tracking-widest"><Inbox size={14} /> Input</div>
                        <div className="text-3xl md:text-4xl font-black text-text-main mb-1 md:mb-2">{weeklyStats.created}</div>
                        <p className="text-text-muted text-xs md:text-sm">Thoughts captured this week.</p>
                    </div>
                    <div className="bg-canvas border border-border rounded-2xl p-5 md:p-6 flex flex-col">
                        <div className="flex items-center gap-2 mb-2 text-green-500 font-bold text-xs uppercase tracking-widest"><CheckCircle2 size={14} /> Output</div>
                        <div className="text-3xl md:text-4xl font-black text-text-main mb-1 md:mb-2">{weeklyStats.completed}</div>
                        <p className="text-text-muted text-xs md:text-sm">Tasks executed and closed.</p>
                    </div>
                    <div className="bg-canvas border border-border rounded-2xl p-5 md:p-6 flex flex-col">
                        <div className="flex items-center gap-2 mb-2 text-red-500 font-bold text-xs uppercase tracking-widest"><XCircle size={14} /> Leakage</div>
                        <div className="text-3xl md:text-4xl font-black text-text-main mb-1 md:mb-2">{weeklyStats.pending}</div>
                        <p className="text-text-muted text-xs md:text-sm">Open loops carrying over.</p>
                    </div>
                </div>
                <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-border flex justify-end">
                    <button onClick={() => setIsReportOpen(true)} className="flex items-center gap-2 text-xs font-bold text-text-muted hover:text-accent transition-colors uppercase tracking-widest">View Full Report <ArrowRight size={14} /></button>
                </div>
            </div>
        </div>

        {/* Top Level Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
          <StatCard icon={FileText} label="Total Thoughts" value={totalNotes} color="bg-blue-500" />
          <StatCard icon={Layers} label="Artifacts" value={totalArtifacts} color="bg-indigo-500" />
          <StatCard icon={TrendingUp} label="Total Words" value={totalWords} color="bg-emerald-500" />
          <StatCard icon={Award} label="Themes" value={Array.isArray(userHabits?.frequentTopics) ? userHabits.frequentTopics.length : 0} color="bg-violet-500" />
          <StatCard icon={Percent} label="Completion Rate" value={`${taskStats.rate}%`} color="bg-teal-500" />
          <StatCard icon={Zap} label="High Impact" value={`${taskStats.highRate}%`} color="bg-orange-500" />
        </div>

        {/* Identity Mapping */}
        {userHabits && userHabits.productivity && (
          <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 shadow-xl">
             <div className="flex items-center gap-3 mb-6 md:mb-8"><PieChart className="text-pink-500" /><h2 className="text-lg md:text-xl font-bold text-text-main brand-font">Identity Mapping</h2></div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {Object.entries(userHabits.productivity.axisDistribution || {}).map(([axis, count]: [string, any]) => (
                   <div key={axis} className="flex flex-col gap-2 p-4 rounded-xl bg-canvas border border-border/50">
                      <div className="flex justify-between items-end"><span className="text-sm font-bold text-text-muted">{axis}</span><span className="text-xl font-black text-text-main">{count}</span></div>
                      <div className="w-full h-2 bg-surface rounded-full overflow-hidden"><div className="h-full bg-accent transition-all duration-1000" style={{ width: `${(count / Math.max(totalNotes, 1)) * 100}%` }}></div></div>
                   </div>
                ))}
             </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2 bg-surface border border-border rounded-3xl overflow-hidden shadow-xl flex flex-col">
             <div className="p-6 border-b border-border bg-gradient-to-r from-accent/5 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-3"><Activity className="text-accent" /><h2 className="text-lg md:text-xl font-bold text-text-main brand-font">Pattern Detection</h2></div>
                <div className="text-[9px] md:text-[10px] text-text-muted font-bold uppercase tracking-widest bg-canvas px-2 py-1 rounded">Brutally Gentle</div>
             </div>
             <div className="p-6 md:p-8 flex-1 space-y-8">
                {!aiEnabled ? (
                  <div className="flex flex-col items-center justify-center text-center opacity-50 py-12"><Zap size={48} className="text-text-muted mb-4" /><p className="text-text-muted font-medium">Enable AI Insights to see deep behavior analysis.</p></div>
                ) : userHabits ? (
                  <>
                    {userHabits.weeklyReport && (
                        <div className="bg-canvas/50 border border-border rounded-2xl p-6">
                            <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-4">Latest Adjustment</h3>
                            <div className="flex gap-4 items-start"><Target className="text-blue-500 shrink-0 mt-1" size={18} /><div><p className="text-[10px] font-bold text-blue-500 uppercase">Recommendation</p><p className="text-sm text-text-main leading-relaxed">{userHabits.weeklyReport.adjustment}</p></div></div>
                        </div>
                    )}
                    {Array.isArray(userHabits.patternAlerts) && userHabits.patternAlerts.length > 0 && (
                        <div>
                            <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-4">Subconscious Patterns</h3>
                            <div className="space-y-3">
                                {userHabits.patternAlerts.map((alert, i) => (
                                    <div key={i} className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl"><div className="flex items-center gap-2 mb-2"><span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 text-[10px] font-bold uppercase">{alert.type}</span></div><p className="text-sm text-text-main font-medium">{alert.description}</p></div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div>
                         <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-4">General Insights</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Array.isArray(userHabits.insights) && userHabits.insights.map((insight, i) => (
                               <div key={i} className="flex gap-4 p-4 rounded-2xl bg-canvas border border-border/50 hover:border-accent/30 transition-colors group"><div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0 group-hover:scale-110 transition-transform"><Sparkles size={14} /></div><p className="text-sm text-text-main leading-relaxed">{insight}</p></div>
                            ))}
                         </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 animate-pulse py-12"><Brain size={48} className="text-accent/20" /><p className="text-text-muted">Synthesizing habits...</p></div>
                )}
             </div>
          </div>

          <div className="bg-surface border border-border rounded-3xl shadow-xl p-6 md:p-8 space-y-6 md:space-y-8">
             <div className="flex items-center gap-3 mb-2"><Target className="text-emerald-500" /><h2 className="text-lg md:text-xl font-bold text-text-main brand-font">Cognitive Vitals</h2></div>
             <div className="space-y-6 md:space-y-8">
                <div className="space-y-3"><div className="flex justify-between text-xs font-bold uppercase text-text-muted tracking-widest"><span>Idea Density</span><span className="text-text-main">{userHabits?.productivity.cognitiveVelocity || 0}%</span></div><div className="h-2 w-full bg-canvas rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${userHabits?.productivity.cognitiveVelocity || 0}%` }}></div></div></div>
                <div className="pt-2 space-y-4">
                   <div className="flex items-center justify-between p-3 rounded-xl bg-canvas border border-border"><div className="flex items-center gap-3"><Clock size={16} className="text-blue-500" /><span className="text-xs font-bold text-text-muted uppercase">Peak Time</span></div><span className="text-xs font-black text-text-main">{userHabits?.productivity.peakTime || "N/A"}</span></div>
                   <div className="flex items-center justify-between p-3 rounded-xl bg-canvas border border-border"><div className="flex items-center gap-3"><Smile size={16} className="text-violet-500" /><span className="text-xs font-bold text-text-muted uppercase">Best Mood</span></div><span className="text-xs font-black text-text-main capitalize">{userHabits?.productivity.productiveMood || "N/A"}</span></div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {isReportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4" onClick={() => setIsReportOpen(false)}>
              <div className="bg-surface border border-border w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
                  <div className="p-6 border-b border-border bg-canvas/50 flex justify-between items-center"><h2 className="text-2xl font-bold brand-font text-text-main flex items-center gap-3"><CalendarDays className="text-accent"/> Weekly Cognitive Report</h2><button onClick={() => setIsReportOpen(false)} className="p-2 text-text-muted hover:text-text-main bg-canvas rounded-full border border-border"><X size={20}/></button></div>
                  <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                      {userHabits?.weeklyReport ? (
                          <>
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <div className="text-center p-4 bg-canvas rounded-xl border border-border"><div className="text-2xl font-black text-text-main mb-1">{weeklyStats.created}</div><div className="text-[10px] font-bold uppercase text-text-muted tracking-widest">Input</div></div>
                                <div className="text-center p-4 bg-canvas rounded-xl border border-border"><div className="text-2xl font-black text-green-500 mb-1">{weeklyStats.completed}</div><div className="text-[10px] font-bold uppercase text-text-muted tracking-widest">Output</div></div>
                                <div className="text-center p-4 bg-canvas rounded-xl border border-border"><div className="text-2xl font-black text-red-500 mb-1">{weeklyStats.pending}</div><div className="text-[10px] font-bold uppercase text-text-muted tracking-widest">Carried Over</div></div>
                            </div>
                            <div className="space-y-6">
                                <div className="p-6 bg-orange-500/5 border-l-4 border-orange-500 rounded-r-xl"><h4 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-2 flex items-center gap-2"><AlertTriangle size={14} /> The Uncomfortable Truth</h4><p className="text-base text-text-main font-medium leading-relaxed">{userHabits.weeklyReport.uncomfortableTruth}</p></div>
                                <div className="p-6 bg-green-500/5 border-l-4 border-green-500 rounded-r-xl"><h4 className="text-xs font-black text-green-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Award size={14} /> The Big Win</h4><p className="text-base text-text-main font-medium leading-relaxed">{userHabits.weeklyReport.win}</p></div>
                                <div className="p-6 bg-blue-500/5 border-l-4 border-blue-500 rounded-r-xl"><h4 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Target size={14} /> Strategic Adjustment</h4><p className="text-base text-text-main font-medium leading-relaxed">{userHabits.weeklyReport.adjustment}</p></div>
                            </div>
                          </>
                      ) : (
                          <div className="text-center py-12 space-y-4"><Brain size={48} className="mx-auto text-text-muted opacity-20" /><h3 className="text-lg font-bold text-text-main">No Report Generated Yet</h3><p className="text-text-muted max-w-sm mx-auto">Fortuitous needs more activity data to generate your Weekly Reality Check.</p></div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ProductivityHub;
