
import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Sparkles, BrainCircuit, X, ExternalLink, Headphones, Camera, CameraOff, Save, StopCircle, Globe2, Layers, ChevronDown, Book } from 'lucide-react';
import { ChatMessage, Note, UserHabits, AIContextMode, AppLanguage } from '../types';
import { chatWithContext, GeminiLiveSession } from '../services/gemini';
import { GenerateContentResponse } from "@google/genai";
import { getTranslation } from '../services/translations';
import DOMPurify from 'dompurify';

interface AIChatProps {
  notes: Note[];
  userHabits: UserHabits | null;
  isBackgroundAnalyzing: boolean;
  onNewNote?: (title: string, content: string) => void;
  defaultContext?: AIContextMode;
  language: AppLanguage;
}

const renderMarkdown = (text: string) => {
  if (!text) return '';
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
    .replace(/^\-\s(.*)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul class="list-disc ml-5 my-2">$1</ul>')
    .replace(/\n/g, '<br />');
  
  return DOMPurify.sanitize(html);
};

const AIChat: React.FC<AIChatProps> = ({ notes, userHabits, isBackgroundAnalyzing, onNewNote, defaultContext = 'hybrid', language }) => {
  const t = (key: string) => getTranslation(language, key);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 'welcome', role: 'model', content: t('welcome_chat'), timestamp: new Date() }]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [currentVolume, setCurrentVolume] = useState(0);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [liveTranscripts, setLiveTranscripts] = useState<{ text: string, role: 'user' | 'model' }[]>([]);
  const [contextMode, setContextMode] = useState<AIContextMode>(defaultContext);
  
  const liveSessionRef = useRef<GeminiLiveSession | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => { if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isOpen, liveTranscripts]);
  useEffect(() => { setContextMode(defaultContext); }, [defaultContext]);

  const handleStartLive = async () => {
    setIsLiveMode(true);
    setLiveTranscripts([{ text: "Session started...", role: 'model' }]);
    if (!liveSessionRef.current) {
      liveSessionRef.current = new GeminiLiveSession(
        (status) => setLiveStatus(status),
        (volume) => setCurrentVolume(volume),
        (text, role) => setLiveTranscripts(prev => [...prev, { text, role }])
      );
    }
    setTimeout(() => liveSessionRef.current?.connect(isCameraOn ? videoRef.current : null), 100);
  };

  const handleStopLive = () => {
    liveSessionRef.current?.disconnect();
    setIsLiveMode(false);
    setLiveStatus('disconnected');
    setLiveTranscripts([]);
    setCurrentVolume(0);
  };

  const handleSaveTranscript = () => {
    if (liveTranscripts.length === 0 || !onNewNote) return;
    const content = liveTranscripts.map(t => `**${t.role === 'model' ? 'AI' : 'You'}:** ${t.text}`).join('\n\n');
    onNewNote(`Live Session: ${new Date().toLocaleString()}`, content);
    handleStopLive();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    try {
      const tempId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: tempId, role: 'model', content: '', timestamp: new Date(), isThinking: true }]);
      const chatResponse = await chatWithContext(userMsg.content, messages.map(m => ({ role: m.role, content: m.content })), notes, userHabits, contextMode);
      let fullText = '';
      let groundingMeta: any = null;
      for await (const chunk of chatResponse) {
        const c = chunk as GenerateContentResponse;
        if (c.candidates?.[0]?.groundingMetadata) groundingMeta = c.candidates[0].groundingMetadata;
        if (c.text) {
          fullText += c.text;
          setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, content: fullText, isThinking: false, groundingMetadata: groundingMeta } : msg));
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: "Error accessing memory. Please try again.", timestamp: new Date() }]);
    } finally { setIsLoading(false); }
  };

  return (
    <>
        <div className="fixed bottom-6 right-6 z-[90] flex flex-col items-end gap-3">
            {isBackgroundAnalyzing && !isOpen && (
                <div className="bg-surface/90 backdrop-blur border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-wide px-3 py-2 rounded-lg shadow-lg animate-fade-in flex items-center gap-2">
                    <Sparkles size={12} className="animate-spin" /> Analyzing Patterns...
                </div>
            )}
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 relative group border ${isOpen ? 'bg-surface text-text-main border-border rotate-90' : 'bg-accent text-white border-transparent hover:scale-110 hover:shadow-accent/40'}`}
                title="AI Cognitive Partner"
            >
                {isOpen ? <ChevronDown size={28} /> : <BrainCircuit size={24} />}
            </button>
        </div>

        {isLiveMode && (
          <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-fade-in text-white p-6">
             <div className="absolute top-8 right-8 flex gap-4">
                <button onClick={() => setIsCameraOn(!isCameraOn)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">{isCameraOn ? <Camera size={24} /> : <CameraOff size={24} />}</button>
                <button onClick={handleStopLive} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X size={24} /></button>
             </div>
             
             <div className="flex flex-col md:flex-row gap-8 w-full max-w-6xl items-center justify-center">
                <div className="relative w-full max-w-md aspect-square bg-white/5 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center">
                   {isCameraOn ? (
                     <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale opacity-60" />
                   ) : (
                     <div className="flex items-center justify-center h-full w-full flex-col gap-4">
                        <div className="relative">
                           <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center animate-pulse">
                              <BrainCircuit size={48} className="text-accent" />
                           </div>
                           <div className="absolute inset-0 rounded-full border-2 border-accent opacity-50" style={{ transform: `scale(${1 + currentVolume})`, transition: 'transform 0.05s' }} />
                        </div>
                        <div className="text-white/40 uppercase tracking-widest font-black text-xs">Voice Only Mode</div>
                     </div>
                   )}
                   
                   <div className="absolute bottom-0 left-0 right-0 h-24 flex items-end justify-center gap-1 pb-8 px-8">
                       {[...Array(20)].map((_, i) => (
                           <div 
                              key={i} 
                              className="w-2 bg-accent rounded-full transition-all duration-75"
                              style={{ 
                                height: `${Math.max(10, Math.random() * 100 * currentVolume)}%`,
                                opacity: Math.max(0.3, currentVolume)
                              }} 
                           />
                       ))}
                   </div>
                </div>

                <div className="flex-1 w-full max-w-md flex flex-col h-[50vh]">
                   <h3 className="text-xs font-black text-accent uppercase tracking-widest mb-4 opacity-50 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${liveStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                      Live Insight Log
                   </h3>
                   <div className="flex-1 overflow-y-auto space-y-4 pr-4 custom-scrollbar">
                      {liveTranscripts.length === 0 && <div className="text-white/30 italic text-sm">Waiting for conversation...</div>}
                      {liveTranscripts.map((t, i) => (
                        <div key={i} className={`p-4 rounded-2xl text-sm leading-relaxed animate-slide-up ${t.role === 'user' ? 'bg-white/5 ml-8' : 'bg-accent/10 mr-8 text-indigo-100'}`}>{t.text}</div>
                      ))}
                      <div ref={messagesEndRef} />
                   </div>
                </div>
             </div>

             <div className="mt-12 flex flex-col items-center gap-4">
                 <div className="flex gap-4">
                    <button onClick={handleSaveTranscript} className="flex items-center gap-2 px-8 py-3 bg-surface hover:bg-surface/80 text-text-main rounded-full font-bold transition-all border border-white/20"><Save size={20} /> Save as Note</button>
                    <button onClick={handleStopLive} className="flex items-center gap-2 px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold transition-all shadow-xl shadow-red-900/20"><StopCircle size={20} /> End Session</button>
                 </div>
             </div>
          </div>
        )}

        {isOpen && !isLiveMode && (
            <div className="fixed bottom-0 left-0 right-0 top-0 md:top-auto md:left-auto md:bottom-24 md:right-6 md:w-[380px] md:h-[600px] max-h-[100dvh] md:max-h-[70vh] bg-surface/95 backdrop-blur-xl border-t md:border border-border shadow-2xl rounded-none md:rounded-2xl flex flex-col z-[80] animate-slide-up overflow-hidden ring-1 ring-black/5">
                <div className="p-4 border-b border-border bg-canvas/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent"><BrainCircuit size={16} /></div>
                        <div>
                            <span className="text-sm font-bold text-text-main block">Cognitive Partner</span>
                            <span className="text-[10px] text-text-muted">Always listening.</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleStartLive} className="flex items-center gap-2 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-full shadow-md transition-all hover:scale-105" title="Start Voice Conversation"><Headphones size={14} /> <span className="hidden md:inline">Go Live</span></button>
                        <button onClick={() => setIsOpen(false)} className="md:hidden p-2 text-text-muted hover:text-text-main"><X size={20} /></button>
                    </div>
                </div>
                
                <div className="px-2 py-2 border-b border-border bg-canvas/30 flex gap-1 shrink-0 overflow-x-auto no-scrollbar">
                   {[
                     { id: 'knowledge', icon: Book, label: t('notes') },
                     { id: 'hybrid', icon: Layers, label: t('hybrid') },
                     { id: 'web', icon: Globe2, label: t('web') }
                   ].map(mode => (
                      <button 
                        key={mode.id}
                        onClick={() => setContextMode(mode.id as AIContextMode)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors ${contextMode === mode.id ? 'bg-accent/10 text-accent' : 'text-text-muted hover:bg-surface'}`}
                      >
                         <mode.icon size={12} /> {mode.label}
                      </button>
                   ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-canvas/30 scroll-smooth">
                    {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${msg.role === 'user' ? 'bg-surface border border-border shadow-sm' : 'bg-accent/10 text-accent'}`}>{msg.role === 'user' ? <User size={14} className="text-text-main" /> : <Bot size={14} />}</div>
                        <div className="max-w-[85%] flex flex-col gap-1">
                          <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-surface text-text-main border border-border rounded-tr-none' : 'bg-accent/5 text-text-main border border-accent/20 rounded-tl-none'}`}>
                            {msg.content ? (
                                <div className="markdown-body whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                            ) : (
                                <span className="flex items-center gap-2 opacity-50 text-accent"><Sparkles size={12} className="animate-spin" /> Thinking...</span>
                            )}
                          </div>
                          {Array.isArray(msg.groundingMetadata?.groundingChunks) && <div className="ml-1 mt-1 flex flex-wrap gap-2">{msg.groundingMetadata.groundingChunks.map((chunk: any, i: number) => chunk.web?.uri && <a key={i} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-surface border border-border hover:border-accent text-text-muted hover:text-accent px-2 py-1 rounded-md flex items-center gap-1 transition-colors"><ExternalLink size={10} /> Source</a>)}</div>}
                        </div>
                    </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-surface shrink-0 pb-8 md:pb-4">
                    <div className="relative">
                        <input 
                            type="text" 
                            value={input} 
                            onChange={(e) => setInput(e.target.value)} 
                            placeholder="Ask anything..." 
                            className="w-full bg-canvas text-text-main border border-border rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all shadow-inner" 
                        />
                        <button 
                            type="submit" 
                            disabled={!input.trim() || isLoading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <Sparkles size={16} />
                        </button>
                    </div>
                </form>
            </div>
        )}
    </>
  );
};

export default AIChat;
