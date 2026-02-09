import React, { useEffect, useRef, useState } from 'react';
import { Artifact } from '../types';
import { Trash2, MonitorPlay, FileText, PieChart, Image as ImageIcon, AlertCircle, Terminal, PlayCircle, Maximize2, ChevronLeft, ChevronRight, Zap, ShieldAlert, TrendingUp, Target, Trophy, RefreshCw, Check } from 'lucide-react';
import { generateImage } from '../services/gemini';
import DOMPurify from 'dompurify';

declare global {
  interface Window {
    mermaid: any;
  }
}

interface ArtifactViewProps {
  artifact: Artifact;
  onDelete: (id: string) => void;
}

const ArtifactView: React.FC<ArtifactViewProps> = React.memo(({ artifact, onDelete }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState(false);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (!isRendered) return;

    const isMermaidType = ['mindmap', 'timeline', 'process', 'infographic'].includes(artifact.type);
    
    if (isMermaidType && window.mermaid && mermaidRef.current) {
      try {
          if (!window.mermaid.mermaidAPI) {
            window.mermaid.initialize({ 
                startOnLoad: false, 
                theme: 'dark',
                securityLevel: 'loose', 
                mindmap: { padding: 40 }, 
                flowchart: { curve: 'basis' },
                timeline: { disableMulticolor: true }
            });
          }
      } catch(e) { console.warn("Mermaid init warning", e); }

      const renderMermaid = async () => {
        const renderTask = async () => {
            try {
            setRenderError(false);
            let sanitizedContent = (artifact.content || "").trim();
            
            if (!sanitizedContent) {
                throw new Error("No diagram content provided.");
            }

            // Remove markdown code blocks if present
            sanitizedContent = sanitizedContent.replace(/^```(?:mermaid)?\n?/i, '').replace(/\n?```$/i, '');
            
            // Aggressively find start of mermaid to ignore chatty text or leading spaces
            const match = sanitizedContent.match(/(mindmap|graph|flowchart|timeline|sequenceDiagram|erDiagram|classDiagram|stateDiagram-v2|stateDiagram|pie|gantt|gitGraph|journey|C4Context|requirementDiagram)/im);
            if (match && match.index !== undefined) {
                 sanitizedContent = sanitizedContent.substring(match.index).trim();
            } else {
                 // Fallback: If no keyword found, it's likely invalid mermaid
                 throw new Error("No valid diagram type detected.");
            }

            // Specific syntax fixes
            if (artifact.type === 'timeline') {
                sanitizedContent = sanitizedContent.replace(/(:\s*"[^"]*);([^"]*")/g, '$1,$2');
            }

            const uniqueId = `mermaid-${artifact.id}-${Date.now()}`;
            const { svg } = await window.mermaid.render(uniqueId, sanitizedContent);
            const cleanSvg = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true } });
            
            if (mermaidRef.current) {
                mermaidRef.current.innerHTML = cleanSvg;
                const svgElement = mermaidRef.current.querySelector('svg');
                if (svgElement) {
                  svgElement.style.width = '100%';
                  svgElement.style.height = 'auto';
                  svgElement.style.maxWidth = 'none';
                  svgElement.removeAttribute('width');
                }
            }
            } catch (e) {
            console.error("Mermaid Render Error", e);
            setRenderError(true);
            }
        };
        setTimeout(renderTask, 50);
      };
      
      renderMermaid();
    }
  }, [isRendered, artifact.id, artifact.content, artifact.type]);

  const Header = () => (
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-2">
         <h4 className="font-bold text-accent capitalize text-sm">{artifact.type.replace('process', 'Process Map').replace('swot', 'SWOT Analysis')}</h4>
         <span className="text-xs text-text-muted hidden md:inline opacity-50 truncate max-w-[200px]">• {artifact.title}</span>
      </div>
      <button onClick={() => onDelete(artifact.id)} className="text-text-muted hover:text-red-500 p-1 transition-colors"><Trash2 size={14} /></button>
    </div>
  );

  const Placeholder = () => (
    <div 
      className="w-full h-48 bg-canvas/50 border border-border/50 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-accent/5 transition-all group"
      onClick={() => setIsRendered(true)}
    >
        <div className="p-3 rounded-full bg-surface border border-border group-hover:scale-110 transition-transform mb-3 shadow-sm">
            <PlayCircle size={24} className="text-accent" />
        </div>
        <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Load Visualization</p>
        <p className="text-[10px] text-text-muted opacity-60 mt-1">Click to render (saves memory)</p>
    </div>
  );

  if (['mindmap', 'timeline', 'process', 'infographic'].includes(artifact.type)) {
    return (
      <div className="bg-surface border border-border rounded-xl p-4 my-4 relative group animate-fade-in shadow-sm hover:shadow-md transition-all">
        <Header />
        <div className="overflow-x-auto overflow-y-hidden bg-canvas/30 rounded-lg p-2 min-h-[100px] relative border border-border/50">
          {!isRendered ? <Placeholder /> : renderError ? (
            <div className="text-red-400 text-sm p-8 text-center flex flex-col items-center gap-3 w-full">
              <AlertCircle size={32} className="opacity-50" />
              <div>
                <p className="font-bold mb-1">Visualization Syntax Error</p>
                <p className="text-[10px] text-text-muted">The diagram content is empty or invalid. Showing raw source:</p>
              </div>
              <div className="w-full mt-4 p-4 bg-black/40 rounded-lg border border-red-500/20 text-left font-mono text-[10px] overflow-x-auto whitespace-pre">
                 <div className="flex items-center gap-2 mb-2 text-text-muted border-b border-white/5 pb-2">
                    <Terminal size={10} />
                    <span>RAW SOURCE</span>
                 </div>
                 {artifact.content || "[Empty]"}
              </div>
            </div>
          ) : (
             <div ref={mermaidRef} className="w-full flex justify-center min-h-[200px] items-center">
                 <span className="animate-pulse text-xs text-text-muted">Rendering...</span>
             </div>
          )}
        </div>
        {isRendered && !renderError && <div className="text-[10px] text-text-muted text-center mt-2 opacity-50 font-medium">Use mouse to pan or scroll for details</div>}
      </div>
    );
  }

  if (artifact.type === 'slides') return <SlidesDeck content={artifact.content} onDelete={() => onDelete(artifact.id)} />;
  if (artifact.type === 'swot') return <div className="bg-surface border border-border rounded-xl p-6 my-4 animate-fade-in shadow-sm"><Header /><SwotGrid content={artifact.content} /></div>;
  if (artifact.type === 'quiz') return <div className="bg-surface border border-border rounded-xl p-6 my-4 animate-fade-in shadow-sm"><Header /><QuizComponent content={artifact.content} /></div>;
  if (artifact.type === 'flashcards') return <FlashcardDeck content={artifact.content} title={artifact.title} onDelete={() => onDelete(artifact.id)} />;

  return (
    <div className="bg-surface border border-border rounded-xl p-6 my-4 relative animate-fade-in shadow-sm">
      <Header /><div className="text-text-main text-sm leading-relaxed whitespace-pre-wrap font-light">{artifact.content}</div>
    </div>
  );
}, (prev, next) => prev.artifact.id === next.artifact.id && prev.artifact.content === next.artifact.content);

const parseRobustJson = (content: string) => {
  try {
    let clean = (content || "").trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    if (!clean) return null;
    const parsed = JSON.parse(clean);
    return parsed.data || parsed;
  } catch (e) { return null; }
};

const SlidesDeck: React.FC<{ content: string, onDelete: () => void }> = ({ content, onDelete }) => {
   const [slides, setSlides] = useState<any[]>([]);
   const [current, setCurrent] = useState(0);
   const [generatedImages, setGeneratedImages] = useState<Record<number, string>>({});
   const [isGenerating, setIsGenerating] = useState(false);
   useEffect(() => { const parsed = parseRobustJson(content); if (Array.isArray(parsed)) setSlides(parsed); }, [content]);
   if(slides.length === 0) return null;
   const handleNext = () => setCurrent(prev => (prev + 1) % slides.length);
   const handlePrev = () => setCurrent(prev => (prev - 1 + slides.length) % slides.length);
   const handleGenerateVisual = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!slides[current].imagePrompt) return;
      setIsGenerating(true);
      const url = await generateImage(slides[current].imagePrompt, '1K');
      if (url) setGeneratedImages(prev => ({ ...prev, [current]: url }));
      setIsGenerating(false);
   }
   return (
      <div className="bg-surface border border-border rounded-xl p-6 my-4 animate-fade-in shadow-md">
         <div className="flex justify-between items-center mb-4"><h4 className="font-bold text-accent flex items-center gap-2"><MonitorPlay size={16} /> Presentation Deck</h4><div className="flex items-center gap-3"><div className="flex gap-1">{slides.map((_, idx) => <div key={idx} className={`h-1.5 w-1.5 rounded-full transition-all ${idx === current ? 'bg-accent w-4' : 'bg-border'}`}/>)}</div><button onClick={onDelete} className="text-text-muted hover:text-red-500 p-1"><Trash2 size={16}/></button></div></div>
         <div className="aspect-video bg-gradient-to-br from-canvas to-surface border border-border rounded-lg shadow-inner relative overflow-hidden group flex flex-col">
            {generatedImages[current] ? <div className="absolute inset-0 z-0"><img src={generatedImages[current]} alt="Slide" className="w-full h-full object-cover opacity-20" /><div className="absolute inset-0 bg-gradient-to-r from-canvas via-canvas/90 to-transparent"></div></div> : slides[current].imagePrompt && <div className="absolute bottom-4 right-16 z-20"><button onClick={handleGenerateVisual} disabled={isGenerating} className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 hover:bg-accent hover:text-white text-accent rounded-full text-xs font-medium border border-accent/20"><ImageIcon size={12} /> {isGenerating ? 'Synthesizing...' : 'AI Visual'}</button></div>}
            <div className="flex-1 p-8 md:p-12 flex flex-col justify-center relative z-10"><h2 className="text-2xl md:text-3xl font-bold text-text-main mb-6 brand-font leading-tight">{slides[current].title}</h2><ul className="space-y-3">{slides[current].bullets?.map((b: string, i: number) => <li key={i} className="text-sm md:text-base text-text-muted flex items-start gap-4"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-accent shrink-0" /><span className="leading-relaxed font-light">{b}</span></li>)}</ul></div>
            {slides[current].notes && <div className="bg-surface/50 backdrop-blur border-t border-border p-3 flex items-center gap-3 text-[10px] text-text-muted/70 relative z-10"><FileText size={12} className="shrink-0" /><span className="italic truncate uppercase tracking-widest font-bold">Notes: {slides[current].notes}</span></div>}
            <button onClick={handlePrev} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-surface/80 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 hover:bg-accent hover:text-white z-30"><ChevronLeft size={20}/></button>
            <button onClick={handleNext} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-surface/80 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 hover:bg-accent hover:text-white z-30"><ChevronRight size={20}/></button>
            <div className="absolute top-4 right-4 text-[10px] font-mono text-text-muted/40 z-20 font-bold bg-canvas/40 px-2 py-1 rounded">PAGE {current + 1} OF {slides.length}</div>
         </div>
      </div>
   );
};

const SwotGrid: React.FC<{ content: string }> = ({ content }) => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { const parsed = parseRobustJson(content); if (parsed) { setData(parsed); setError(null); } else setError("Parse failure."); }, [content]);
  if (error) return <div className="text-xs text-red-500 bg-red-500/10 p-6 rounded-xl border flex flex-col items-center gap-2"><AlertCircle size={20} /> SWOT Error</div>;
  if (!data) return <div className="text-sm text-text-muted animate-pulse py-12 text-center font-bold tracking-widest uppercase">Analyzing...</div>;
  const Section = ({ title, icon: Icon, items, color }: any) => (
    <div className={`p-5 rounded-xl border border-border/50 bg-gradient-to-br ${color} hover:shadow-md transition-all h-full`}>
       <div className="flex items-center gap-2 mb-4 font-black text-text-main uppercase text-xs tracking-[0.2em]"><Icon size={14} className="text-accent" /> {title}</div>
       <ul className="space-y-3">{items?.map((item: string, i: number) => <li key={i} className="text-xs text-text-main/80 leading-relaxed flex items-start gap-3"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent opacity-40 shrink-0" /><span className="font-medium">{item}</span></li>)}</ul>
    </div>
  );
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><Section title="Strengths" icon={Zap} items={data.strengths} color="from-green-500/5 to-transparent" /><Section title="Weaknesses" icon={ShieldAlert} items={data.weaknesses} color="from-yellow-500/5 to-transparent" /><Section title="Opportunities" icon={TrendingUp} items={data.opportunities} color="from-blue-500/5 to-transparent" /><Section title="Threats" icon={Target} items={data.threats} color="from-red-500/5 to-transparent" /></div>;
};

const QuizComponent: React.FC<{ content: string }> = ({ content }) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  useEffect(() => { const parsed = parseRobustJson(content); if (Array.isArray(parsed)) setQuestions(parsed); }, [content]);
  if (questions.length === 0) return null;
  const handleSelect = (option: string) => { if (selectedOption) return; const correct = option === questions[currentIndex].correctAnswer; setSelectedOption(option); if (correct) setScore(s => s + 1); setTimeout(() => { if (currentIndex < questions.length - 1) { setCurrentIndex(prev => prev + 1); setSelectedOption(null); } else setIsFinished(true); }, 1500); };
  if (isFinished) return <div className="flex flex-col items-center justify-center p-8 text-center space-y-6"><Trophy size={64} className="text-yellow-500 animate-bounce" /><div><h3 className="text-2xl font-bold text-text-main mb-2 brand-font">Session Mastery</h3><p className="text-text-muted">Retention verified.</p></div><div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 brand-font">{Math.round((score/questions.length)*100)}%</div><button onClick={() => {setCurrentIndex(0); setScore(0); setIsFinished(false); setSelectedOption(null);}} className="px-8 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-all shadow-lg shadow-accent/20"><RefreshCw size={18} /> Restart Session</button></div>;
  const q = questions[currentIndex];
  return <div className="max-w-xl mx-auto py-4"><div className="w-full h-1.5 bg-border rounded-full mb-8 overflow-hidden"><div className="h-full bg-accent transition-all duration-500 ease-out" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}/></div><div className="mb-8"><span className="text-[10px] font-black text-accent uppercase tracking-[0.25em] mb-4 block">Checkpoint {currentIndex + 1} of {questions.length}</span><h3 className="text-xl font-bold text-text-main brand-font">{q.question}</h3></div><div className="space-y-3">{q.options.map((opt: string) => { let btnStyle = "border-border bg-canvas hover:border-accent/50"; if (selectedOption) { btnStyle = opt === q.correctAnswer ? "border-green-500 bg-green-500/20 text-green-500" : (selectedOption === opt ? "border-red-500 bg-red-500/20 text-red-500" : "opacity-30"); } return <button key={opt} onClick={() => handleSelect(opt)} disabled={!!selectedOption} className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between font-medium group shadow-sm ${btnStyle}`}><span className="text-sm">{opt}</span>{selectedOption && opt === q.correctAnswer && <Check size={18} className="text-green-500" />}</button>; })}</div></div>;
};

const FlashcardDeck: React.FC<{ content: string, title: string, onDelete: () => void }> = ({ content, onDelete }) => {
  const [cards, setCards] = useState<{ question: string; answer: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  useEffect(() => { const parsed = parseRobustJson(content); if (Array.isArray(parsed)) setCards(parsed); }, [content]);
  if (cards.length === 0) return null;
  const handleNext = () => { setIsFlipped(false); setTimeout(() => setCurrentIndex((prev) => (prev + 1) % cards.length), 150); };
  const handlePrev = () => { setIsFlipped(false); setTimeout(() => setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length), 150); };
  return (
    <div className="bg-surface border border-border rounded-xl p-8 my-4 flex flex-col items-center animate-fade-in relative overflow-hidden shadow-lg">
      <div className="w-full flex justify-between items-center mb-8"><h4 className="font-black text-accent uppercase text-xs tracking-[0.2em]">Retentive Memory Cards</h4><div className="flex items-center gap-3"><div className="px-3 py-1 bg-canvas rounded-lg border text-[10px] font-black font-mono text-text-muted">{currentIndex+1}/{cards.length}</div><button onClick={onDelete} className="text-text-muted hover:text-red-500"><Trash2 size={14} /></button></div></div>
      <div className="w-full max-w-sm h-80 cursor-pointer perspective-1000" onClick={() => setIsFlipped(!isFlipped)}>
        <div className={`relative w-full h-full transition-all duration-700 transform-style-3d shadow-2xl rounded-3xl ${isFlipped ? 'rotate-y-180' : ''}`}>
          {/* Front */}
          <div className="absolute inset-0 backface-hidden bg-canvas border border-border rounded-3xl flex flex-col items-center justify-center p-10 text-center shadow-xl hover:border-accent transition-all ring-1 ring-white/5">
            <span className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-6 opacity-60">Query</span>
            <p className="text-xl font-bold brand-font">{cards[currentIndex].question}</p>
            <div className="absolute bottom-8 text-[9px] font-bold opacity-40 uppercase tracking-widest">Reveal Answer</div>
          </div>
          {/* Back */}
          <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-accent/10 to-purple-900/20 border border-accent/40 rounded-3xl flex flex-col items-center justify-center p-10 text-center shadow-2xl rotate-y-180">
            <div className="flex flex-col items-center h-full w-full">
               <span className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-6 mt-10">Synthesis</span>
               <p className="text-lg font-light leading-relaxed">{cards[currentIndex].answer}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-12 mt-10"><button onClick={handlePrev} className="p-4 rounded-2xl bg-canvas border hover:border-accent transition-all"><ChevronLeft size={24} /></button><button onClick={handleNext} className="p-4 rounded-2xl bg-canvas border hover:border-accent transition-all"><ChevronRight size={24} /></button></div>
    </div>
  );
};

export default ArtifactView;