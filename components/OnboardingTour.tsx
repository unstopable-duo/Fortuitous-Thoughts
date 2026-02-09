
import React, { useState, useEffect } from 'react';
import { ArrowRight, Brain, Sparkles, Layout, Compass, Shield, Zap, CheckCircle2, ChevronRight, Palette, Lock, Globe, Cpu, Moon, Sun } from 'lucide-react';
import { AppSettings, AIPersonality, AppThemeColor, AIContextMode } from '../types';

interface OnboardingTourProps {
  onComplete: (settings: Partial<AppSettings>, startView: string) => void;
  currentSettings: AppSettings;
  onPreviewSettings: (settings: Partial<AppSettings>) => void;
  onToggleTheme: () => void;
  isDarkMode: boolean;
}

const ARCHETYPES = [
  {
    id: 'architect',
    title: "The Architect",
    desc: "Structure, projects, and clear action items.",
    icon: Layout,
    color: "text-blue-400",
    settings: { aiPersonality: 'analytical' as AIPersonality },
    startView: 'tasks'
  },
  {
    id: 'explorer',
    title: "The Explorer",
    desc: "Connect ideas, spark creativity, and expand thoughts.",
    icon: Compass,
    color: "text-purple-400",
    settings: { aiPersonality: 'creative' as AIPersonality },
    startView: 'all'
  },
  {
    id: 'monk',
    title: "The Monk",
    desc: "Focus, minimalism, and deep reflection.",
    icon: Shield,
    color: "text-emerald-400",
    settings: { aiPersonality: 'standard' as AIPersonality, reduceMotion: true },
    startView: 'inspiration'
  }
];

const THEME_COLORS: { value: AppThemeColor, hex: string }[] = [
    { value: 'indigo', hex: '#818cf8' },
    { value: 'blue', hex: '#3b82f6' },
    { value: 'emerald', hex: '#10b981' },
    { value: 'rose', hex: '#f43f5e' },
    { value: 'amber', hex: '#f59e0b' },
    { value: 'violet', hex: '#8b5cf6' },
];

const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete, currentSettings, onPreviewSettings, onToggleTheme, isDarkMode }) => {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedArchetype, setSelectedArchetype] = useState<string>('explorer');
  const [isLaunching, setIsLaunching] = useState(false);

  // Local state for the tour before committing
  const [tourSettings, setTourSettings] = useState<Partial<AppSettings>>({
      backgroundAnalysis: false,
      defaultAiContext: 'hybrid'
  });

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleNext = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setStep(prev => prev + 1);
  };
  
  const handleBack = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setStep(prev => prev - 1);
  };

  const finishSetup = () => {
    setIsLaunching(true);
    const archetype = ARCHETYPES.find(a => a.id === selectedArchetype) || ARCHETYPES[1];
    
    // Merge archetype settings with user selections
    const finalSettings = {
        ...tourSettings,
        ...archetype.settings
    };

    setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
            onComplete(finalSettings, archetype.startView);
        }, 500);
    }, 2000);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-[#0f172a] text-white transition-all duration-700 font-sans overflow-y-auto overflow-x-hidden">
      
      {/* Cinematic Background (Fixed) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
         <div className={`absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-[#0f172a] to-[#0f172a]`} />
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
         <div className={`absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-accent/20 rounded-full blur-[120px] mix-blend-screen transition-all duration-1000 ${step === 1 ? 'scale-110 opacity-30' : 'scale-100 opacity-10'}`} />
      </div>

      <div className="min-h-full w-full max-w-4xl mx-auto relative z-10 flex flex-col p-6 md:p-12">
        
        {/* Progress Header */}
        <div className="flex justify-between items-center mb-8 md:mb-12 shrink-0">
            <div className="flex items-center gap-2">
                <Brain className="text-accent" size={24} />
                <span className="font-bold text-lg tracking-tight brand-font">Fortuitous <span className="opacity-50">Init</span></span>
            </div>
            <div className="flex gap-2">
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i <= step ? 'w-8 bg-accent' : 'w-2 bg-white/10'}`} />
                ))}
            </div>
        </div>

        {/* Content Area - Grows to fill space */}
        <div className="flex-1 flex flex-col justify-center items-center relative min-h-[400px]">
            
            {/* STEP 0: WELCOME */}
            {step === 0 && (
                <div className="text-center space-y-8 animate-slide-up max-w-2xl mx-auto py-10 md:py-0">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight">
                        Your Cognitive <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Operating System</span>
                    </h1>
                    <p className="text-lg text-slate-400 leading-relaxed max-w-md mx-auto md:max-w-none">
                        Fortuitous is more than a note-taking app. It is an active thinking partner that connects dots, challenges biases, and expands your intelligence.
                    </p>
                    <button onClick={handleNext} className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                        Initialize System <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            )}

            {/* STEP 1: IDENTITY */}
            {step === 1 && (
                <div className="space-y-8 animate-fade-in w-full">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold mb-2 brand-font">Select Neural Architecture</h2>
                        <p className="text-slate-400">Calibrates the AI's thinking model to match your workflow.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full">
                        {ARCHETYPES.map((arch) => (
                        <button
                            key={arch.id}
                            onClick={() => setSelectedArchetype(arch.id)}
                            className={`group relative p-6 rounded-3xl border transition-all text-left flex flex-col gap-4 hover:-translate-y-1 hover:shadow-2xl
                                ${selectedArchetype === arch.id 
                                    ? 'bg-accent/10 border-accent shadow-[0_0_30px_rgba(99,102,241,0.2)]' 
                                    : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                        >
                            <div className={`p-4 rounded-2xl bg-white/5 w-fit ${arch.color}`}>
                                <arch.icon size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">{arch.title}</h3>
                                <p className="text-sm text-slate-400 leading-relaxed">{arch.desc}</p>
                            </div>
                            <div className={`mt-auto pt-4 flex items-center text-xs font-bold uppercase tracking-widest ${selectedArchetype === arch.id ? 'text-accent' : 'text-slate-600'}`}>
                                {selectedArchetype === arch.id ? <><CheckCircle2 size={16} className="mr-2"/> Active</> : 'Select'}
                            </div>
                        </button>
                        ))}
                    </div>
                </div>
            )}

            {/* STEP 2: AESTHETICS */}
            {step === 2 && (
                <div className="space-y-8 animate-fade-in max-w-2xl mx-auto w-full">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold mb-2 brand-font">Interface Calibration</h2>
                        <p className="text-slate-400">Customize your visual workspace for maximum flow.</p>
                    </div>
                    
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/10 rounded-full">{isDarkMode ? <Moon size={24} /> : <Sun size={24} />}</div>
                                <div>
                                    <h3 className="font-bold text-lg">Lighting Mode</h3>
                                    <p className="text-xs text-slate-400">{isDarkMode ? 'Dark Mode Active' : 'Light Mode Active'}</p>
                                </div>
                            </div>
                            <button onClick={onToggleTheme} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm font-bold transition-all border border-white/10">
                                Toggle
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/10 rounded-full"><Palette size={24} /></div>
                                <div>
                                    <h3 className="font-bold text-lg">Accent Frequency</h3>
                                    <p className="text-xs text-slate-400">Select your primary energy color.</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-4 justify-center pt-2">
                                {THEME_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        onClick={() => onPreviewSettings({ themeColor: c.value })}
                                        className={`w-10 h-10 rounded-full transition-all duration-300 ${currentSettings.themeColor === c.value ? 'scale-125 ring-2 ring-white ring-offset-4 ring-offset-[#0f172a]' : 'opacity-60 hover:opacity-100 hover:scale-110'}`}
                                        style={{ backgroundColor: c.hex }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 3: INTELLIGENCE & PRIVACY */}
            {step === 3 && (
                <div className="space-y-8 animate-fade-in max-w-2xl mx-auto w-full">
                    {!isLaunching ? (
                        <>
                            <div className="text-center">
                                <h2 className="text-3xl font-bold mb-2 brand-font">Intelligence Protocols</h2>
                                <p className="text-slate-400">Configure how the AI interacts with your data.</p>
                            </div>

                            <div className="grid gap-4">
                                {/* Context Mode */}
                                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col md:flex-row items-start gap-4">
                                    <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl shrink-0"><Globe size={24} /></div>
                                    <div className="flex-1 w-full">
                                        <h3 className="font-bold text-lg mb-1">Knowledge Scope</h3>
                                        <p className="text-sm text-slate-400 mb-4">Where should the AI look for answers?</p>
                                        <div className="flex gap-2 p-1 bg-black/40 rounded-xl w-fit">
                                            {(['knowledge', 'web', 'hybrid'] as AIContextMode[]).map(mode => (
                                                <button
                                                    key={mode}
                                                    onClick={() => setTourSettings(s => ({...s, defaultAiContext: mode}))}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${tourSettings.defaultAiContext === mode ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                                >
                                                    {mode}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Background Analysis (Consent) */}
                                <div className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col md:flex-row items-start gap-4 cursor-pointer ${tourSettings.backgroundAnalysis ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-white/5 border-white/10'}`}
                                     onClick={() => setTourSettings(s => ({...s, backgroundAnalysis: !s.backgroundAnalysis}))}
                                >
                                    <div className={`p-3 rounded-2xl shrink-0 transition-colors ${tourSettings.backgroundAnalysis ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                        <Cpu size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <h3 className="font-bold text-lg">Background Processing</h3>
                                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${tourSettings.backgroundAnalysis ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                                                {tourSettings.backgroundAnalysis && <CheckCircle2 size={14} className="text-white" />}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-400 leading-relaxed">
                                            Allow Gemini AI to periodically analyze your notes to find hidden connections, habits, and contradictions.
                                            <br/><span className="text-xs opacity-50 mt-1 block"><Lock size={10} className="inline mr-1"/> Data is sent securely to Google Gemini API only.</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full border-4 border-accent border-t-transparent animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center"><Brain size={40} className="text-accent animate-pulse" /></div>
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white mb-2">System Online</h2>
                                <p className="text-accent font-mono text-sm uppercase tracking-[0.2em] animate-pulse">Establishing Neural Link...</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>

        {/* Footer Navigation (Sticky on mobile for better UX) */}
        <div className="sticky bottom-0 left-0 right-0 p-6 md:static md:p-0 md:pt-12 mt-8 md:mt-0 flex justify-between items-center border-t border-white/5 bg-[#0f172a]/95 md:bg-transparent backdrop-blur-md md:backdrop-blur-none z-20">
            {step > 0 && !isLaunching ? (
                <button onClick={handleBack} className="text-sm font-bold text-slate-500 hover:text-white transition-colors">
                    Back
                </button>
            ) : <div></div>}

            {step > 0 && step < 3 && (
                <button onClick={handleNext} className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-bold text-sm hover:scale-105 transition-all shadow-xl">
                    Next <ChevronRight size={16} />
                </button>
            )}

            {step === 3 && !isLaunching && (
                <button onClick={finishSetup} className="flex items-center gap-2 px-8 py-3 bg-accent hover:bg-accent-hover text-white rounded-full font-bold text-sm hover:scale-105 transition-all shadow-[0_0_20px_var(--color-accent)]">
                    Launch Workspace <Zap size={16} fill="currentColor" />
                </button>
            )}
        </div>

      </div>
    </div>
  );
};

export default OnboardingTour;
