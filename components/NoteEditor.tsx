
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Note, NoteType, ContradictionResult, Artifact, AppSettings, ThinkingMode, TaskItem, SmartLink, NoteVisibility } from '../types';
import { Save, Tag, Sparkles, AlertTriangle, Maximize2, Cloud, Check, Layers, FileText, Globe, Smile, Meh, Frown, Sun, CloudRain, BrainCircuit, Library, History, GitMerge, Target, HelpCircle, Plus, X, ListChecks, Bold, Italic, List, ListOrdered, Heading, Quote, Code, Image as ImageIcon, Mic, Film, Upload, MonitorPlay, PieChart, Sunrise, Moon, Zap, Battery, BatteryMedium, BatteryLow, Brain, Compass, Minimize2, Link, ArrowRight, CheckSquare, Volume2, VolumeX, Lightbulb, PenTool, Eye, EyeOff, Play, Timer, Ban, MicOff, Share2, GitBranch, ExternalLink, ChevronLeft, MoreVertical, Network, AudioWaveform, Share, Type, TableOfContents, Hash, PanelRightClose, PanelRightOpen, Sidebar, Copy } from 'lucide-react';
import { analyzeNoteContent, detectContradictions, expandThought, generateArtifact, analyzeLink, generateImage, analyzeImage, transcribeAudio, analyzeVideoUrl, generateActionPlan, findSmartConnections, generateMicroPlan, extractTextFromImage, generateSpeech } from '../services/gemini';
import { forkNote } from '../services/supabase';
import { v4 as uuidv4 } from 'uuid';
import ArtifactView from './ArtifactView';
import ShareModal from './ShareModal';
import DOMPurify from 'dompurify';
import KnowledgeGraph from './KnowledgeGraph';

interface NoteEditorProps {
  note: Note;
  onRequestContext: () => Promise<Note[]>; 
  onUpdate: (note: Note) => void;
  onSave: (note: Note) => void;
  onPersist: (note: Note) => Promise<Note | null>;
  onAddGlobalTask: (task: TaskItem) => void;
  onSelectNoteById?: (id: string) => void;
  onBack?: () => void;
  settings: AppSettings;
  isReadOnly?: boolean; 
}

const slugify = (text: string) => {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
};

const renderMarkdown = (text: string) => {
  if (!text) return '';
  let html = text
    .replace(/^### (.*$)/gim, (m, c) => `<h3 id="${slugify(c.trim())}">${c.trim()}</h3>`)
    .replace(/^## (.*$)/gim, (m, c) => `<h2 id="${slugify(c.trim())}">${c.trim()}</h2>`)
    .replace(/^# (.*$)/gim, (m, c) => `<h1 id="${slugify(c.trim())}">${c.trim()}</h1>`)
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/^\-\s(.*)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n/g, '<br />');
  
  return DOMPurify.sanitize(html);
};

const NoteEditor: React.FC<NoteEditorProps> = ({ note, onRequestContext, onUpdate, onSave, onPersist, onAddGlobalTask, onSelectNoteById, onBack, settings, isReadOnly = false }) => {
  const [localNote, setLocalNote] = useState<Note>(note);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isGeneratingArtifact, setIsGeneratingArtifact] = useState(false);
  const [isGeneratingMicroPlan, setIsGeneratingMicroPlan] = useState(false);
  const [isGeneratingActionPlan, setIsGeneratingActionPlan] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [contradictionWarning, setContradictionWarning] = useState<ContradictionResult | null>(null);
  
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [showArtifactMenu, setShowArtifactMenu] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(isReadOnly);
  const [isGraphMode, setIsGraphMode] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  
  const [slashMenu, setSlashMenu] = useState<{ x: number, y: number, visible: boolean } | null>(null);
  
  const [backlinks, setBacklinks] = useState<Note[]>([]);
  const [allNotesContext, setAllNotesContext] = useState<Note[]>([]);
  const [selectionMenu, setSelectionMenu] = useState<{ x: number, y: number, text: string } | null>(null);

  const initialWordCountRef = useRef(0);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initialize content and reset state on note ID change
  useEffect(() => {
    if (!isPreviewMode && !isGraphMode && editorRef.current) {
        const hasHTML = /<[a-z][\s\S]*>/i.test(localNote.content);
        const contentToRender = hasHTML ? localNote.content : renderMarkdown(localNote.content);
        editorRef.current.innerHTML = contentToRender;
        
        // Setup word count for change detection
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = contentToRender;
        const textContent = tempDiv.textContent || "";
        initialWordCountRef.current = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
    }

    if (note.id !== localNote.id) {
        setLocalNote(note);
        setSaveStatus('saved');
        setContradictionWarning(null);
    }
  }, [note.id, isPreviewMode, isGraphMode]);
  
  // Context Loading Logic - Separated to ensure it runs on Graph Mode toggle
  useEffect(() => {
    const loadContext = async () => {
        const allNotes = await onRequestContext();
        if (Array.isArray(allNotes)) {
          setAllNotesContext(allNotes);
          const links = allNotes.filter(n => Array.isArray(n.metadata?.smartLinks) && n.metadata.smartLinks.some(sl => sl.targetId === note.id));
          setBacklinks(links);
        }
    };

    // Load context if in graph mode or if note changed
    if (isGraphMode || note.id !== localNote.id || allNotesContext.length === 0) {
        loadContext();
    }
  }, [note.id, isGraphMode]);

  useEffect(() => {
      setIsPreviewMode(isReadOnly);
  }, [isReadOnly]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
      if (!editorRef.current) return;
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if ((e.nativeEvent as any).data === '/') {
             setSlashMenu({ x: rect.left, y: rect.bottom + 5, visible: true });
          } else if (slashMenu?.visible) {
             setSlashMenu(null);
          }
      }

      const html = editorRef.current.innerHTML;
      
      setLocalNote(prev => {
          const editCount = (prev.metadata?.editCount || 0) + 1;
          return { ...prev, content: html, metadata: { ...prev.metadata, editCount } };
      });
      setSaveStatus('unsaved');
  };

  const handleMouseUp = (e: React.MouseEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.toString().length < 2) {
          setSelectionMenu(null);
          return;
      }
      
      const text = selection.toString();
      if (editorRef.current && editorRef.current.contains(e.target as Node)) {
          setSelectionMenu({
              x: e.clientX,
              y: e.clientY - 40,
              text: text
          });
      }
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    setSlashMenu(null); 
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      const href = target.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const id = href.substring(1);
        const element = editorRef.current?.querySelector(`[id="${id}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }
      if (href && href.startsWith('http') && (e.ctrlKey || e.metaKey || isPreviewMode)) {
        window.open(href, '_blank');
      }
    }
  };

  const insertSlashCommand = (cmd: string) => {
      document.execCommand('delete'); // Remove the '/'
      if (cmd === 'h1') document.execCommand('formatBlock', false, 'h1');
      if (cmd === 'h2') document.execCommand('formatBlock', false, 'h2');
      if (cmd === 'ul') document.execCommand('insertUnorderedList');
      if (cmd === 'check') document.execCommand('insertHTML', false, '&#9744; ');
      setSlashMenu(null);
      if (editorRef.current) editorRef.current.focus();
  };

  const handleInstantTaskCreate = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!selectionMenu) return;
      
      const newTask: TaskItem = {
          id: uuidv4(),
          content: selectionMenu.text,
          status: 'todo',
          priority: 'medium',
          description: `Captured from note: "${localNote.title}"`,
          sourceNoteId: localNote.id,
          created_at: new Date().toISOString()
      };
      onAddGlobalTask(newTask);
      setSelectionMenu(null);
  };

  const handleCreateTaskFromSelection = () => {
    const selection = window.getSelection();
    const text = selection ? selection.toString() : '';
    
    if (text.trim().length > 0) {
        const newTask: TaskItem = {
            id: uuidv4(),
            content: text,
            status: 'todo',
            priority: 'medium',
            description: `Captured from note: "${localNote.title}"`,
            sourceNoteId: localNote.id,
            created_at: new Date().toISOString()
        };
        onAddGlobalTask(newTask);
    } else {
        const newTask: TaskItem = {
            id: uuidv4(),
            content: `Review: ${localNote.title}`,
            status: 'todo',
            priority: 'medium',
            description: `Link: ${localNote.title}`,
            sourceNoteId: localNote.id,
            created_at: new Date().toISOString()
        };
        onAddGlobalTask(newTask);
    }
    setShowActionMenu(false);
  };

  const handleForkNote = async () => {
      if (window.confirm(`Save a copy of "${localNote.title}" to your private notes?`)) {
          const newNote = await forkNote(localNote);
          if (newNote) {
              onUpdate(newNote); // Actually pushes new note to parent list
              onSelectNoteById?.(newNote.id); // Switches view to new note
          }
      }
  };

  // Visibility Handlers
  const handleTogglePublic = (isPublic: boolean) => {
      // Logic for top-level public flag
      setLocalNote(prev => ({ ...prev, is_public: isPublic }));
      // Also sync metadata for UI consistency
      handleMetadataChange('visibility', isPublic ? 'public' : 'private');
      if (isPublic && !localNote.metadata?.shareToken) {
          handleMetadataChange('shareToken', uuidv4());
      }
      setSaveStatus('unsaved');
  };

  const handleVisibilityChange = (v: NoteVisibility) => {
      const isPublic = v === 'public';
      handleTogglePublic(isPublic);
  };
  
  const blobToBase64 = (blob: Blob): Promise<string> => new Promise((r) => { const reader = new FileReader(); reader.onloadend = () => r((reader.result as string).split(',')[1]); reader.readAsDataURL(blob); });
  
  const toggleRecording = async () => {
    if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); return; }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const base64 = await blobToBase64(audioBlob);
            setIsAnalyzing(true);
            try {
                const text = await transcribeAudio(base64, 'audio/webm');
                if (editorRef.current) {
                    const cleanText = DOMPurify.sanitize(text);
                    document.execCommand('insertHTML', false, `<p><strong>[Audio Transcript]:</strong> ${cleanText}</p>`);
                    const event = new Event('input', { bubbles: true });
                    editorRef.current.dispatchEvent(event);
                }
            } catch (e) { alert("Audio transcription failed."); } finally { setIsAnalyzing(false); stream.getTracks().forEach(track => track.stop()); }
        };
        mediaRecorder.start();
        setIsRecording(true);
    } catch (e) { alert("Could not access microphone."); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { /* ... */ };

  const handleTitleChange = (newTitle: string) => {
    setLocalNote(prev => ({ ...prev, title: newTitle }));
    setSaveStatus('unsaved');
  };

  const handleMetadataChange = (key: string, value: any) => {
     setLocalNote(prev => {
         const updatedMeta = { ...prev.metadata, [key]: value };
         const updated = { ...prev, metadata: updatedMeta };
         setSaveStatus('unsaved');
         return updated;
     });
  }

  useEffect(() => {
    if (saveStatus === 'unsaved' && !isReadOnly) {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = setTimeout(() => {
        handleSave();
      }, (settings.autoSaveInterval || 5) * 1000); 
    }
    return () => { if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current); };
  }, [localNote, saveStatus, settings.autoSaveInterval, isReadOnly]);

  const handleSave = async () => {
    if (isReadOnly) return;
    setSaveStatus('saving');
    try {
      const saved = await onPersist(localNote);
      if (saved) {
        setSaveStatus('saved');
        onSave(saved);
        onUpdate(saved);
        
        // --- Auto Background Intelligence ---
        if (saved.content.length > 50) {
             void runBackgroundIntelligence(saved);
        }
      } else { setSaveStatus('unsaved'); }
    } catch (e) { setSaveStatus('unsaved'); }
  };

  const runBackgroundIntelligence = async (note: Note) => {
      try {
          // Fetch context once for both operations
          const context = await onRequestContext();
          const otherNotes = context.filter(n => n.id !== note.id);
          if (otherNotes.length === 0) return;

          // 1. Contradiction Detection
          const contradictionResult = await detectContradictions(note.content, otherNotes);
          if (contradictionResult.hasContradiction) {
              setContradictionWarning(contradictionResult);
          } else {
              setContradictionWarning(null);
          }

          // 2. Smart Connections (Auto-Linking)
          // Only run if links are empty or it's been a while (simple check: valid content)
          // We run this quietly.
          const connections = await findSmartConnections(note, context);
          
          if (connections && connections.length > 0) {
              const currentLinks = note.metadata?.smartLinks || [];
              // Simple check to see if new links are different (avoid infinite save loops)
              const isDifferent = JSON.stringify(currentLinks) !== JSON.stringify(connections);
              
              if (isDifferent) {
                  const updatedNote = { 
                      ...note, 
                      metadata: { ...note.metadata, smartLinks: connections } 
                  };
                  // Update local state without triggering 'unsaved' status visually if possible
                  setLocalNote(updatedNote);
                  // Persist immediately
                  await onPersist(updatedNote);
                  // Also notify parent to update list
                  onUpdate(updatedNote);
              }
          }

      } catch (e) {
          console.error("Background intelligence error", e);
      }
  };

  const handleTTS = async () => { /* ... */ };
  
  const handleGenerateArtifact = async (type: any) => {
      setIsGeneratingArtifact(true);
      setShowArtifactMenu(false);
      try {
          const content = await generateArtifact(localNote.content, type, localNote.title);
          if (content) {
              const newArtifact: Artifact = {
                  id: uuidv4(),
                  type,
                  title: `${type.charAt(0).toUpperCase() + type.slice(1)}: ${localNote.title}`,
                  content,
                  created_at: new Date().toISOString()
              };
              const updatedArtifacts = [...(Array.isArray(localNote.metadata?.artifacts) ? localNote.metadata.artifacts : []), newArtifact];
              handleMetadataChange('artifacts', updatedArtifacts);
              // Force persist immediately for artifacts
              await onPersist({ ...localNote, metadata: { ...localNote.metadata, artifacts: updatedArtifacts } });
          }
      } catch (e) { console.error(e); } finally { setIsGeneratingArtifact(false); }
  };

  const handleGenerateMicroPlan = async () => {
      setIsGeneratingMicroPlan(true);
      setShowActionMenu(false);
      try {
          const plan = await generateMicroPlan(localNote.content);
          if (plan) {
             const html = `<div class="p-4 my-4 bg-accent/5 border-l-4 border-accent rounded-r-xl">
                <h4 class="font-bold text-accent uppercase text-xs mb-2">Micro-Plan</h4>
                <p><strong>Next Action:</strong> ${plan.nextAction}</p>
                <p><strong>Estimate:</strong> ${plan.timeEstimate}</p>
                <p><strong>Blocker:</strong> ${plan.blocker}</p>
             </div>`;
             document.execCommand('insertHTML', false, html);
             const event = new Event('input', { bubbles: true });
             editorRef.current?.dispatchEvent(event);
          }
      } catch (e) { console.error(e); } finally { setIsGeneratingMicroPlan(false); }
  };

  const handleActionPlan = async () => {
      setIsGeneratingActionPlan(true);
      setShowActionMenu(false);
      try {
          const items = await generateActionPlan(localNote.content);
          if (Array.isArray(items) && items.length > 0) {
              items.forEach(i => {
                  const newTask: TaskItem = {
                      id: uuidv4(),
                      content: i.task,
                      effort: i.effort,
                      status: 'todo',
                      priority: 'medium',
                      sourceNoteId: localNote.id,
                      created_at: new Date().toISOString()
                  };
                  onAddGlobalTask(newTask);
              });
              alert(`Generated ${items.length} tasks in Command Center.`);
          }
      } catch(e) { console.error(e); } finally { setIsGeneratingActionPlan(false); }
  };

  // --- New Logic: Smart Connections ---
  const handleFindConnections = async () => {
      setIsLinking(true);
      setIsRightSidebarOpen(true);
      try {
          const allNotes = await onRequestContext();
          const connections = await findSmartConnections(localNote, allNotes);
          if (connections && connections.length > 0) {
              handleMetadataChange('smartLinks', connections);
              // Save immediately to persist connections
              await onPersist({
                  ...localNote,
                  metadata: { ...localNote.metadata, smartLinks: connections }
              });
          }
      } catch(e) {
          console.error("Linking failed", e);
      } finally {
          setIsLinking(false);
      }
  };

  const handleFormat = (command: string, value?: string) => { 
      document.execCommand(command, false, value); 
      if(editorRef.current) {
          editorRef.current.focus();
          // Trigger input event to update state
          const event = new Event('input', { bubbles: true });
          editorRef.current.dispatchEvent(event);
      }
  };

  const handleGenerateToC = () => {
      if (!editorRef.current) return;
      
      const headings = editorRef.current.querySelectorAll('h1, h2');
      if (headings.length === 0) return;

      let tocHtml = `<div class="my-6 p-6 bg-surface border border-border rounded-xl">
        <h3 class="text-sm font-bold uppercase tracking-wider mb-4 text-text-muted">Table of Contents</h3>
        <ul class="space-y-2">`;
      
      headings.forEach((h) => {
          const id = slugify(h.textContent || '');
          h.id = id; // Ensure ID exists
          const indent = h.tagName.toLowerCase() === 'h2' ? 'ml-4' : '';
          tocHtml += `<li class="${indent}"><a href="#${id}" class="text-accent hover:underline text-sm">${h.textContent}</a></li>`;
      });
      
      tocHtml += `</ul></div><br/>`;
      
      // Insert at top
      editorRef.current.innerHTML = tocHtml + editorRef.current.innerHTML;
      const event = new Event('input', { bubbles: true });
      editorRef.current.dispatchEvent(event);
  };

  const handleInsertLink = () => {
      const url = prompt("Enter URL:");
      if (url) {
          document.execCommand('createLink', false, url);
          if(editorRef.current) editorRef.current.focus();
      }
  };

  const FormatButton = ({ icon: Icon, label, command, value, isActive, onClick }: any) => (
    <button onClick={onClick ? onClick : () => handleFormat(command, value)} className={`p-2 rounded-lg transition-colors flex-shrink-0 ${isActive ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-accent hover:bg-surface'}`} title={label} onMouseDown={(e) => e.preventDefault()}>
      <Icon size={18} />
    </button>
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-canvas">
      
      {/* Editor Styles Injection */}
      <style>{`
        .editor-content h1 { font-size: 2.25em; font-weight: 800; margin-top: 1em; margin-bottom: 0.5em; line-height: 1.1; letter-spacing: -0.02em; }
        .editor-content h2 { font-size: 1.75em; font-weight: 700; margin-top: 1em; margin-bottom: 0.5em; color: var(--color-accent); }
        .editor-content ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1em; }
        .editor-content ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1em; }
        .editor-content blockquote { border-left: 4px solid var(--color-accent); padding-left: 1em; font-style: italic; opacity: 0.8; margin-left: 0; margin-right: 0; background: rgba(127, 127, 127, 0.05); padding: 1em; border-radius: 0 8px 8px 0; }
        .editor-content a { color: var(--color-accent); text-decoration: underline; cursor: pointer; }
      `}</style>

      {/* Floating Selection Menu */}
      {selectionMenu && !isReadOnly && (
          <div className="fixed z-50 flex items-center bg-black/90 text-white rounded-full shadow-2xl px-2 py-1.5 animate-slide-up transform -translate-x-1/2 border border-white/20" style={{ left: selectionMenu.x, top: selectionMenu.y }}>
              <button onClick={handleInstantTaskCreate} className="flex items-center gap-2 px-3 py-1 hover:bg-white/20 rounded-full transition-colors text-xs font-bold">
                  <CheckSquare size={14} className="text-green-400" /> Task
              </button>
              <div className="w-px h-4 bg-white/20 mx-1"></div>
              <button onClick={() => setSelectionMenu(null)} className="p-1 hover:bg-white/20 rounded-full text-white/50 hover:text-white"><X size={12} /></button>
          </div>
      )}

      {/* Slash Menu */}
      {slashMenu && slashMenu.visible && !isReadOnly && (
          <div className="fixed z-50 bg-surface border border-border shadow-xl rounded-xl w-48 py-2 animate-slide-up flex flex-col" style={{ left: slashMenu.x, top: slashMenu.y }}>
              <button onClick={() => insertSlashCommand('h1')} className="flex items-center gap-3 px-4 py-2 hover:bg-accent/10 hover:text-accent text-left text-sm"><Heading size={14} /> Heading 1</button>
              <button onClick={() => insertSlashCommand('h2')} className="flex items-center gap-3 px-4 py-2 hover:bg-accent/10 hover:text-accent text-left text-sm"><Type size={14} /> Heading 2</button>
              <button onClick={() => insertSlashCommand('ul')} className="flex items-center gap-3 px-4 py-2 hover:bg-accent/10 hover:text-accent text-left text-sm"><List size={14} /> Bullet List</button>
              <button onClick={() => insertSlashCommand('check')} className="flex items-center gap-3 px-4 py-2 hover:bg-accent/10 hover:text-accent text-left text-sm"><CheckSquare size={14} /> Checkbox</button>
          </div>
      )}

      {/* Main Toolbar */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-canvas/95 backdrop-blur z-20 shrink-0">
            <div className="flex items-center gap-4 text-text-muted text-xs overflow-hidden">
                {onBack && <button onClick={onBack} className="md:hidden p-2 -ml-2 text-text-muted hover:text-text-main"><ChevronLeft size={20} /></button>}
                <span className="flex items-center gap-1 whitespace-nowrap">
                    {saveStatus === 'saving' && <><Cloud size={12} className="animate-pulse" /> <span className="hidden md:inline">Saving...</span></>}
                    {saveStatus === 'saved' && <><Check size={12} /> <span className="hidden md:inline">Saved</span></>}
                    {saveStatus === 'unsaved' && <span className="text-yellow-500">Unsaved</span>}
                    {isReadOnly && <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded font-bold uppercase text-[10px]">Read Only</span>}
                </span>
            </div>

            <div className="flex items-center gap-2">
                {isReadOnly && (
                    <button 
                        onClick={handleForkNote} 
                        className="flex items-center gap-2 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-full shadow-md transition-all mr-2"
                        title="Save a copy to your private notes"
                    >
                        <Copy size={14} /> Save Copy
                    </button>
                )}

                <button onClick={handleTTS} className="p-2 rounded-lg text-xs font-bold transition-all border bg-transparent text-text-muted border-transparent hover:bg-surface" title="Read Aloud">
                    {isSpeaking ? <VolumeX size={16} className="animate-pulse" /> : <Volume2 size={16} />} 
                </button>
                <button onClick={() => setIsShareModalOpen(true)} className="p-2 rounded-lg text-xs font-bold transition-all border bg-transparent text-text-muted border-transparent hover:bg-surface">
                    <Share2 size={16} />
                </button>
                
                {/* View Toggles */}
                <div className="flex bg-surface rounded-lg border border-border p-0.5 ml-2">
                    <button onClick={() => { if(!isReadOnly) { setIsPreviewMode(false); setIsGraphMode(false); } }} className={`p-1.5 rounded-md transition-all ${!isPreviewMode && !isGraphMode ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:text-text-main'} ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`} title="Editor"><PenTool size={14}/></button>
                    <button onClick={() => { setIsPreviewMode(true); setIsGraphMode(false); }} className={`p-1.5 rounded-md transition-all ${isPreviewMode ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:text-text-main'}`} title="Preview"><Eye size={14}/></button>
                    <button onClick={() => { setIsGraphMode(true); setIsPreviewMode(false); }} className={`p-1.5 rounded-md transition-all ${isGraphMode ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:text-text-main'}`} title="Knowledge Graph"><Share size={14}/></button>
                </div>
                
                {/* Tools */}
                <div className="relative ml-2">
                    <button disabled={isReadOnly} onClick={() => setShowArtifactMenu(!showArtifactMenu)} className="flex items-center gap-2 p-2 bg-blue-500/5 hover:bg-blue-500 hover:text-white disabled:opacity-50 text-blue-500 rounded-lg text-xs font-bold transition-all border border-blue-500/20">
                        <Layers size={14} /> <span className="hidden lg:inline">Artifacts</span>
                    </button>
                    {showArtifactMenu && !isReadOnly && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border rounded-xl shadow-xl py-2 z-50 animate-fade-in">
                            <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-text-muted">Knowledge Synthesis</div>
                            <button onClick={() => handleGenerateArtifact('quiz')} className="w-full text-left px-4 py-2 text-xs text-text-main hover:bg-accent/10 hover:text-accent flex items-center gap-2"><Target size={12} /> Generate Long Quiz</button>
                            <button onClick={() => handleGenerateArtifact('flashcards')} className="w-full text-left px-4 py-2 text-xs text-text-main hover:bg-accent/10 hover:text-accent flex items-center gap-2"><Layers size={12} /> Generate Flashcards</button>
                            <button onClick={() => handleGenerateArtifact('slides')} className="w-full text-left px-4 py-2 text-xs text-text-main hover:bg-accent/10 hover:text-accent flex items-center gap-2"><MonitorPlay size={12} /> Presentation Slides</button>
                            <button onClick={() => handleGenerateArtifact('swot')} className="w-full text-left px-4 py-2 text-xs text-text-main hover:bg-accent/10 hover:text-accent flex items-center gap-2"><PieChart size={12} /> SWOT Analysis</button>
                            <button onClick={() => handleGenerateArtifact('mindmap')} className="w-full text-left px-4 py-2 text-xs text-text-main hover:bg-accent/10 hover:text-accent flex items-center gap-2"><Network size={12} /> Mind Map</button>
                        </div>
                    )}
                </div>

                <div className="relative">
                    <button disabled={isReadOnly} onClick={() => setShowActionMenu(!showActionMenu)} className="flex items-center gap-2 p-2 bg-green-500/5 hover:bg-green-500 disabled:opacity-50 hover:text-white text-green-500 rounded-lg text-xs font-bold transition-all border border-green-500/20">
                        <Zap size={14} /> <span className="hidden lg:inline">Actions</span>
                    </button>
                    {showActionMenu && !isReadOnly && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border rounded-xl shadow-xl py-2 z-50 animate-fade-in">
                            <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-text-muted">TRN Action Engine</div>
                            <button onClick={handleCreateTaskFromSelection} className="w-full text-left px-4 py-2 text-xs text-text-main hover:bg-accent/10 hover:text-accent flex items-center gap-2"><CheckSquare size={12} /> Convert Selection to Task</button>
                            <button onClick={handleGenerateMicroPlan} className="w-full text-left px-4 py-2 text-xs text-text-main hover:bg-accent/10 hover:text-accent flex items-center gap-2"><Play size={12} /> Generate Micro-Plan</button>
                            <button onClick={handleActionPlan} className="w-full text-left px-4 py-2 text-xs text-text-main hover:bg-accent/10 hover:text-accent flex items-center gap-2"><ListChecks size={12} /> Create Action Plan</button>
                            <button onClick={handleFindConnections} className="w-full text-left px-4 py-2 text-xs text-text-main hover:bg-accent/10 hover:text-accent flex items-center gap-2"><GitMerge size={12} /> Find Connections</button>
                        </div>
                    )}
                </div>
                
                <button 
                    onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)} 
                    className={`p-2 rounded-lg transition-all border ${isRightSidebarOpen ? 'bg-accent/10 text-accent border-accent/20' : 'bg-transparent text-text-muted border-transparent hover:bg-surface'}`}
                    title="Toggle Info Panel"
                >
                    {isRightSidebarOpen ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
                </button>
            </div>
      </div>

      <div className="flex-1 flex flex-row overflow-hidden relative">
        <div className={`flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar transition-all duration-300`}>
            <div className={`w-full max-w-4xl mx-auto p-6 md:p-12 pb-32`}>
                
                {localNote.metadata?.forkedFrom && (
                    <div className="mb-6 p-3 bg-accent/5 border border-accent/20 rounded-lg flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-text-muted">
                            <GitMerge size={14} className="text-accent" />
                            <span>
                                Derived from <strong>{localNote.metadata.forkedFrom.title}</strong> by {localNote.metadata.forkedFrom.author}
                            </span>
                        </div>
                    </div>
                )}

                <input
                    type="text"
                    value={localNote.title}
                    readOnly={isReadOnly}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Untitled Thought"
                    className={`bg-transparent text-3xl md:text-4xl font-bold text-text-main focus:outline-none mb-6 w-full leading-tight brand-font ${isReadOnly ? 'cursor-default' : ''}`}
                />
                
                {contradictionWarning && contradictionWarning.hasContradiction && (
                    <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start gap-3 animate-slide-up mb-4">
                        <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={18} />
                        <div className="flex-1">
                            <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-1">Potential Contradiction Detected</h4>
                            <p className="text-sm text-text-main/80">{contradictionWarning.explanation}</p>
                        </div>
                        <button onClick={() => setContradictionWarning(null)} className="text-text-muted hover:text-text-main"><X size={16} /></button>
                    </div>
                )}

                {isGraphMode ? (
                    <div className="w-full bg-surface border border-border rounded-xl shadow-inner overflow-hidden min-h-[600px] h-full">
                        <KnowledgeGraph currentNote={localNote} allNotes={allNotesContext} onSelectNote={(id) => onSelectNoteById?.(id)} />
                    </div>
                ) : (
                    <>
                        {!isPreviewMode && !isReadOnly && (
                        <div className="sticky top-0 z-10 bg-canvas/95 backdrop-blur-sm -mx-2 px-2 py-2 mb-4 border-b border-border/30 flex gap-1 overflow-x-auto no-scrollbar items-center">
                                <FormatButton icon={TableOfContents} label="Table of Contents" onClick={handleGenerateToC} />
                                <div className="w-px h-5 bg-border mx-1 flex-shrink-0" />
                                <FormatButton icon={Bold} label="Bold" command="bold" />
                                <FormatButton icon={Italic} label="Italic" command="italic" />
                                <div className="w-px h-5 bg-border mx-1 flex-shrink-0" />
                                <FormatButton icon={Heading} label="Heading 1" command="formatBlock" value="h1" />
                                <FormatButton icon={Type} label="Heading 2" command="formatBlock" value="h2" />
                                <FormatButton icon={Quote} label="Quote" command="formatBlock" value="blockquote" />
                                <FormatButton icon={Link} label="Link" onClick={handleInsertLink} />
                                <div className="w-px h-5 bg-border mx-1 flex-shrink-0" />
                                <FormatButton icon={List} label="Bullet List" command="insertUnorderedList" />
                                <FormatButton icon={ListOrdered} label="Numbered List" command="insertOrderedList" />
                                <div className="w-px h-5 bg-border mx-1 flex-shrink-0" />
                                <button onClick={toggleRecording} className={`p-2 rounded-lg transition-colors flex-shrink-0 ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-text-muted hover:text-accent hover:bg-surface'}`} title="Transcribe">
                                    {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                                </button>
                                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-text-muted hover:text-accent flex-shrink-0" title="Upload"><Upload size={18} /></button>
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,audio/*" />
                        </div>
                        )}

                        {isPreviewMode || isReadOnly ? (
                        <div className="flex-1 w-full markdown-body prose prose-indigo max-w-none text-text-main text-lg leading-relaxed font-light py-4" dangerouslySetInnerHTML={{ __html: localNote.content }} />
                        ) : (
                        <div
                            ref={editorRef}
                            contentEditable
                            onInput={handleInput}
                            onMouseUp={handleMouseUp}
                            onClick={handleEditorClick}
                            className="editor-content flex-1 w-full bg-transparent text-text-main text-lg leading-relaxed focus:outline-none font-light min-h-[60vh] prose prose-lg prose-invert max-w-none prose-p:my-2 outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-text-muted"
                            data-placeholder={settings.backgroundAnalysis ? "What's been on your mind lately?..." : "Start typing..."}
                        />
                        )}
                    </>
                )}
                
                {Array.isArray(localNote.metadata?.artifacts) && localNote.metadata.artifacts.length > 0 && (
                    <div className="mt-12 pt-8 border-t border-border">
                        <div className="flex items-center gap-2 text-accent mb-6 font-bold text-xs uppercase tracking-widest"><Layers size={14} /> Artifacts</div>
                        {localNote.metadata.artifacts.map(a => <ArtifactView key={a.id} artifact={a} onDelete={() => isReadOnly ? null : {}} />)}
                    </div>
                )}
            </div>
        </div>

        {/* RELATED THOUGHTS SIDEBAR (Collapsible) */}
        {isRightSidebarOpen && !isGraphMode && (
          <div className="w-80 border-l border-border bg-canvas/50 flex flex-col shrink-0 custom-scrollbar overflow-y-auto animate-slide-left backdrop-blur-sm absolute md:relative right-0 h-full z-30 shadow-xl md:shadow-none">
             <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                        <GitBranch size={14} className="text-accent" /> Related Thoughts
                    </h3>
                    <button onClick={() => setIsRightSidebarOpen(false)} className="md:hidden text-text-muted"><X size={16}/></button>
                </div>

                <div className="space-y-6">
                    {Array.isArray(localNote.metadata?.smartLinks) && localNote.metadata.smartLinks.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-[10px] font-bold text-text-muted uppercase">Semantic Connections</p>
                            {localNote.metadata.smartLinks.map((link, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => onSelectNoteById?.(link.targetId)}
                                    className="w-full text-left p-4 rounded-xl bg-surface border border-border hover:border-accent/30 transition-all group"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-bold text-text-main group-hover:text-accent transition-colors truncate">{link.targetTitle}</p>
                                        <ExternalLink size={12} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <p className="text-xs text-text-muted font-light leading-relaxed italic">"{link.reason}"</p>
                                </button>
                            ))}
                        </div>
                    )}

                    {backlinks.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-[10px] font-bold text-text-muted uppercase">Referenced By</p>
                            {backlinks.map((note) => (
                                <button 
                                    key={note.id}
                                    onClick={() => onSelectNoteById?.(note.id)}
                                    className="w-full text-left p-4 rounded-xl bg-accent/5 border border-accent/10 hover:border-accent/30 transition-all group"
                                >
                                    <p className="text-sm font-bold text-text-main group-hover:text-accent transition-colors truncate">{note.title || 'Untitled Thought'}</p>
                                    <p className="text-[10px] text-text-muted mt-1 uppercase font-bold tracking-widest">{note.metadata?.lifeAxis || 'Unclassified'}</p>
                                </button>
                            ))}
                        </div>
                    )}

                    {!isLinking && (!Array.isArray(localNote.metadata?.smartLinks) || localNote.metadata.smartLinks.length === 0) && backlinks.length === 0 && (
                        <div className="py-12 text-center">
                            <Compass size={32} className="mx-auto text-text-muted opacity-20 mb-4" />
                            <p className="text-xs text-text-muted italic">No sematic connections found yet.</p>
                            {!isReadOnly && <button onClick={handleFindConnections} className="mt-4 px-4 py-2 bg-accent/10 hover:bg-accent hover:text-white rounded-full text-xs font-bold transition-all text-accent border border-accent/20">Find Connections</button>}
                        </div>
                    )}
                    
                    {isLinking && (
                        <div className="py-12 text-center animate-pulse">
                            <GitMerge size={32} className="mx-auto text-accent mb-4 animate-spin" />
                            <p className="text-xs text-accent font-bold">Analyzing Neural Graph...</p>
                        </div>
                    )}
                </div>
             </div>
          </div>
        )}
      </div>

      {(isAnalyzing || isGeneratingArtifact || isGeneratingMicroPlan || isGeneratingActionPlan) && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-surface/90 backdrop-blur border border-border text-accent text-xs px-4 py-2 rounded-full flex items-center gap-3 shadow-xl animate-slide-up z-[110] whitespace-nowrap">
           <div className="w-2 h-2 bg-accent rounded-full animate-ping" />
           {isGeneratingActionPlan ? "Architecting Action Plan..." : 
            isGeneratingMicroPlan ? "Converting Thought to Action..." : 
            isLinking ? "Mapping Connections..." :
            isAnalyzing ? "Processing Input..." : "Synthesizing..."}
        </div>
      )}

      <ShareModal 
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        isPublic={localNote.is_public || localNote.metadata?.visibility === 'public'}
        onTogglePublic={handleTogglePublic}
        shareUrl={`https://fortuitous.app/share/${localNote.public_slug || localNote.id}`}
        language={settings.language}
        visibility={localNote.is_public ? 'public' : 'private'}
        onUpdateVisibility={handleVisibilityChange}
        isAnonymous={localNote.metadata?.isAnonymous}
        onToggleAnonymous={(v) => handleMetadataChange('isAnonymous', v)}
        allowEdit={localNote.metadata?.allowLinkEdit}
        onToggleEdit={(v) => handleMetadataChange('allowLinkEdit', v)}
      />
    </div>
  );
};

export default NoteEditor;
