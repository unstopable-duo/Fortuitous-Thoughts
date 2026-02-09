
import React from 'react';
import { Note, AppLanguage } from '../types';
import { Clock, FileText, Lightbulb, Link, Trash2, GitBranch, Globe } from 'lucide-react';
import { getTranslation } from '../services/translations';

interface NoteListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (note: Note) => void;
  onDeleteNote: (id: string, e: React.MouseEvent) => void;
  language: AppLanguage;
}

// Sub-component for individual items to isolate renders
const NoteItem = React.memo(({ 
    note, 
    isSelected, 
    onSelect, 
    onDelete, 
    language 
}: { 
    note: Note, 
    isSelected: boolean, 
    onSelect: (n: Note) => void, 
    onDelete: (id: string, e: React.MouseEvent) => void,
    language: AppLanguage 
}) => {
    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString(language === 'zh' ? 'zh-CN' : language === 'fr' ? 'fr-FR' : 'en-US', { 
                month: 'short', 
                day: 'numeric',
                year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined 
            });
        } catch { return ''; }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'idea': return <Lightbulb size={14} className="text-yellow-500" />;
            case 'link': return <Link size={14} className="text-blue-500" />;
            default: return <FileText size={14} className="text-accent" />;
        }
    };

    const relatedCount = note.metadata?.smartLinks?.length || 0;

    return (
        <div
            onClick={() => onSelect(note)}
            className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-200 border
              ${isSelected 
                ? 'bg-surface border-accent/50 shadow-md translate-x-1 ring-1 ring-accent/20' 
                : 'bg-transparent border-transparent hover:bg-surface hover:border-border hover:shadow-sm hover:-translate-y-0.5'}
            `}
        >
            {isSelected && (
               <div className="absolute left-0 top-3 bottom-3 w-1 bg-accent rounded-r-full shadow-[0_0_8px_var(--color-accent)]"></div>
            )}

            <div className="flex justify-between items-start mb-1.5 pl-2">
              <h3 className={`font-bold text-sm truncate pr-2 transition-colors flex items-center gap-2 ${isSelected ? 'text-accent' : 'text-text-main'}`}>
                {note.title || 'Untitled Thought'}
                {(note.is_public || note.metadata?.visibility === 'public') && <Globe size={10} className="text-green-500" />}
              </h3>
              <button 
                onClick={(e) => onDelete(note.id, e)}
                className="text-text-muted hover:text-red-500 hover:bg-red-500/10 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 shrink-0"
                title="Delete note"
              >
                <Trash2 size={13} />
              </button>
            </div>

            <p className="text-xs text-text-muted line-clamp-2 mb-4 leading-relaxed pl-2 opacity-80 font-light">
              {note.content || "No additional context provided..."}
            </p>

            <div className="flex flex-wrap gap-1.5 mb-3 pl-2">
                {note.metadata?.tags && note.metadata.tags.slice(0, 3).map(tag => (
                   <span key={tag} className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border transition-colors
                     ${isSelected ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-canvas border-border text-text-muted'}
                   `}>
                     {tag}
                   </span>
                ))}
                {note.metadata?.lifeAxis && (
                   <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-highlight/10 border border-highlight/20 text-highlight">
                     {note.metadata.lifeAxis}
                   </span>
                )}
            </div>

            <div className="flex items-center justify-between pl-2 pt-2 border-t border-border/30">
              <div className="flex items-center gap-3">
                <span className={`p-1 rounded-md ${isSelected ? 'bg-accent/10' : 'bg-surface border border-border'}`}>
                  {getTypeIcon(note.type)}
                </span>
                {relatedCount > 0 && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-accent bg-accent/5 px-1.5 py-0.5 rounded">
                        <GitBranch size={10} />
                        <span>{relatedCount}</span>
                    </div>
                )}
              </div>
              <div className="flex items-center text-[10px] font-medium text-text-muted gap-1.5 opacity-70">
                <Clock size={10} />
                <span>{formatDate(note.created_at)}</span>
              </div>
            </div>
        </div>
    );
});

const NoteList: React.FC<NoteListProps> = React.memo(({ notes, selectedNoteId, onSelectNote, onDeleteNote, language }) => {
  const displayNotes = notes.slice(0, 100); 

  if (notes.length === 0) {
    return (
      <div className="flex-1 bg-canvas border-r border-border flex flex-col items-center justify-center text-text-muted p-8 text-center w-full md:w-80">
        <div className="mb-4 opacity-20 p-6 bg-surface rounded-full shadow-inner">
          <FileText size={48} />
        </div>
        <p className="font-bold text-text-main">No thoughts yet</p>
        <p className="text-xs mt-2 opacity-60 max-w-[150px]">Capture your first spark of inspiration.</p>
      </div>
    );
  }

  return (
    <div className="w-full md:w-80 h-full bg-canvas border-r border-border flex flex-col flex-shrink-0 transition-colors duration-300 overflow-y-auto">
      <div className="p-5 border-b border-border flex justify-between items-center backdrop-blur-md bg-canvas/80 sticky top-0 z-10">
        <h2 className="font-black text-text-main text-xs uppercase tracking-[0.2em]">Archive</h2>
        <span className="text-[10px] font-black text-accent bg-accent/10 px-2.5 py-1 rounded-full border border-accent/20">
          {notes.length}
        </span>
      </div>
      <div className="flex-1 p-3 space-y-3 custom-scrollbar">
        {displayNotes.map((note) => (
          <NoteItem 
            key={note.id}
            note={note}
            isSelected={selectedNoteId === note.id}
            onSelect={onSelectNote}
            onDelete={onDeleteNote}
            language={language}
          />
        ))}
        {notes.length > 100 && (
            <div className="py-4 text-center">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-40">Scroll for more</span>
            </div>
        )}
      </div>
    </div>
  );
});

export default NoteList;
