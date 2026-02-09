
import React, { useState } from 'react';
import { Sparkles, ArrowRight, Brain, Lightbulb, Compass, Feather, Info } from 'lucide-react';
import { getCreativePrompt } from '../services/gemini';
import { AppLanguage } from '../types';

interface InspirationHubProps {
  onCreateNote: (title: string, content: string) => void;
  aiEnabled: boolean;
  language: AppLanguage;
}

const InspirationHub: React.FC<InspirationHubProps> = ({ onCreateNote, aiEnabled, language }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [inspiration, setInspiration] = useState<{ title: string; prompt: string } | null>(null);
  
  const [topic, setTopic] = useState('');
  const [mood, setMood] = useState('');

  const handleGenerate = async () => {
    if (!aiEnabled) return;
    setIsLoading(true);
    const result = await getCreativePrompt(topic, mood);
    setInspiration(result);
    setIsLoading(false);
  };

  return (
    <div id="inspiration-hub" className="w-full h-full relative overflow-hidden flex flex-col items-center justify-center p-8 bg-canvas transition-colors duration-500">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30 dark:opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-4xl w-full text-center">
        
        {!inspiration ? (
          <div className="animate-fade-in space-y-10">
            
            {/* Header Area */}
            <div className="space-y-4">
              <div className="relative inline-block mb-4">
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full blur opacity-40 animate-pulse"></div>
                <div className="relative bg-surface p-5 rounded-full shadow-xl border border-border animate-float">
                  <Brain size={48} className="text-accent" />
                </div>
              </div>
              <h2 className="text-5xl md:text-6xl font-extrabold brand-font text-transparent bg-clip-text bg-gradient-to-r from-text-main to-text-muted">
                Second Brain
              </h2>
              <p className="text-xl text-text-muted max-w-lg mx-auto leading-relaxed font-light">
                What are we exploring today?
              </p>
            </div>

            {aiEnabled ? (
              <>
                {/* Input Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto bg-surface/50 backdrop-blur-sm p-6 rounded-2xl border border-border shadow-lg">
                  <div className="text-left space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
                      <Compass size={14} /> Topic / Subject
                    </label>
                    <input 
                      type="text" 
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. Future of AI, Ancient Rome..." 
                      className="w-full bg-canvas border border-border rounded-xl px-4 py-3 text-text-main focus:ring-1 focus:ring-accent focus:border-accent outline-none transition-all"
                    />
                  </div>
                  <div className="text-left space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
                      <Feather size={14} /> Vibe / Context
                    </label>
                    <input 
                      type="text" 
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                      placeholder="e.g. Philosophical, Practical, Dark..." 
                      className="w-full bg-canvas border border-border rounded-xl px-4 py-3 text-text-main focus:ring-1 focus:ring-accent focus:border-accent outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="group relative inline-flex items-center gap-3 px-10 py-5 bg-surface hover:bg-surface/80 text-text-main border border-border rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-accent/20 overflow-hidden"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-accent/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></span>
                  
                  {isLoading ? (
                    <Sparkles className="animate-spin text-accent" />
                  ) : (
                    <Lightbulb className="text-accent group-hover:text-yellow-400 transition-colors" />
                  )}
                  <span className="font-semibold text-lg">
                    {isLoading ? "Consulting..." : "Spark Inspiration"}
                  </span>
                </button>
              </>
            ) : (
              <div className="max-w-md mx-auto p-8 rounded-3xl bg-surface/50 border border-border text-center space-y-6">
                 <div className="flex justify-center text-text-muted opacity-30">
                    <Info size={40} />
                 </div>
                 <p className="text-text-muted italic leading-relaxed">
                   "Your mind is for having ideas, not holding them."
                 </p>
                 <button 
                  onClick={() => onCreateNote("", "")}
                  className="w-full py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-all shadow-lg shadow-accent/20"
                 >
                   Write a New Note
                 </button>
                 <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">
                    Enable AI Features in Settings for creative prompts
                 </p>
              </div>
            )}
          </div>
        ) : (
          <div className="animate-slide-up glass-card p-12 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden group max-w-3xl mx-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"></div>
            
            <div className="mb-8 flex justify-center">
               <Sparkles className="text-yellow-400 w-16 h-16 animate-pulse" />
            </div>

            <h3 className="text-3xl font-bold text-text-main mb-6 brand-font">{inspiration.title}</h3>
            <p className="text-2xl text-text-muted leading-relaxed mb-10 italic font-serif">
              "{inspiration.prompt}"
            </p>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setInspiration(null)}
                className="px-8 py-3 rounded-xl text-text-muted hover:text-text-main hover:bg-canvas transition-colors font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => onCreateNote(inspiration.title, inspiration.prompt)}
                className="flex items-center gap-2 px-10 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:-translate-y-1 transition-all duration-300 font-semibold text-lg"
              >
                Start Writing <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InspirationHub;
