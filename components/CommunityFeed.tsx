
import React, { useState, useMemo } from 'react';
import { Note } from '../types';
import { Search, GitBranch, Heart, Clock, Tag, User, Globe, Sparkles, Filter } from 'lucide-react';

interface CommunityFeedProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
  onForkNote: (note: Note) => void;
}

const CommunityFeed: React.FC<CommunityFeedProps> = ({ notes, onSelectNote, onForkNote }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
        const matchesSearch = (note.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                               note.content?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                               note.metadata?.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));
        const matchesFilter = activeFilter === 'all' || note.metadata?.lifeAxis === activeFilter;
        return matchesSearch && matchesFilter;
    });
  }, [notes, searchTerm, activeFilter]);

  const NoteCard = ({ note }: { note: Note }) => {
      // Generate deterministic "random" stats for display
      const pseudoRandom = note.id.charCodeAt(0) + (note.content.length % 100);
      const likes = Math.floor(pseudoRandom * 1.5);
      const forks = Math.floor(pseudoRandom * 0.3);
      
      const authorName = note.author_profile?.username 
                        || note.metadata?.authorName 
                        || 'Unknown Architect';
      
      const avatarUrl = note.author_profile?.avatar_url;
      const isAnonymous = note.metadata?.isAnonymous;

      return (
          <div 
            onClick={() => onSelectNote(note)}
            className="group break-inside-avoid mb-6 bg-surface border border-border rounded-2xl overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative flex flex-col"
          >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              
              <div className="p-6 pb-4">
                  <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                          <span className={`w-2 h-2 rounded-full ${
                              note.metadata?.lifeAxis === 'Career' ? 'bg-blue-500' :
                              note.metadata?.lifeAxis === 'Health' ? 'bg-emerald-500' :
                              note.metadata?.lifeAxis === 'Creative Output' ? 'bg-purple-500' :
                              'bg-slate-500'
                          }`} />
                          {note.metadata?.lifeAxis || 'Thought'}
                      </div>
                      <span className="text-[10px] text-text-muted flex items-center gap-1 opacity-60">
                          <Clock size={10} /> {new Date(note.published_at || note.created_at).toLocaleDateString()}
                      </span>
                  </div>

                  <h3 className="text-xl font-bold text-text-main mb-2 leading-tight group-hover:text-accent transition-colors brand-font">
                      {note.title}
                  </h3>
                  
                  <p className="text-sm text-text-muted leading-relaxed line-clamp-3 mb-4 font-light">
                      {note.metadata?.summary || note.content.substring(0, 150) + "..."}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                      {note.metadata?.tags?.slice(0, 3).map(tag => (
                          <span key={tag} className="px-2 py-1 bg-canvas border border-border rounded-md text-[10px] text-text-muted font-medium">#{tag}</span>
                      ))}
                  </div>
              </div>

              <div className="mt-auto border-t border-border bg-canvas/30 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      {avatarUrl && !isAnonymous ? (
                          <img src={avatarUrl} alt="Avatar" className="w-6 h-6 rounded-full object-cover border border-white/10" />
                      ) : (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center text-[10px] text-white font-bold">
                              {isAnonymous ? '?' : authorName.charAt(0)}
                          </div>
                      )}
                      <span className="text-xs font-medium text-text-main truncate max-w-[100px]">{isAnonymous ? 'Anonymous' : authorName}</span>
                  </div>

                  <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-text-muted text-xs group/stat">
                          <Heart size={14} className="group-hover/stat:text-red-500 transition-colors" /> {likes}
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onForkNote(note); }}
                        className="flex items-center gap-1 text-text-muted hover:text-accent hover:bg-accent/10 px-2 py-1 rounded-full transition-all text-xs font-bold"
                      >
                          <GitBranch size={14} /> <span className="hidden sm:inline">Fork</span> {forks}
                      </button>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="w-full h-full bg-canvas overflow-y-auto custom-scrollbar relative flex flex-col">
        {/* Cinematic Header */}
        <div className="sticky top-0 z-20 bg-canvas/95 backdrop-blur-xl border-b border-border/50 shadow-sm px-6 py-6 md:px-12 md:py-8 flex flex-col md:flex-row gap-6 md:items-end justify-between">
            <div className="space-y-2">
                <h1 className="text-3xl md:text-5xl font-black brand-font text-transparent bg-clip-text bg-gradient-to-r from-text-main to-text-muted">
                    Global Consciousness
                </h1>
                <p className="text-text-muted text-sm md:text-lg font-light flex items-center gap-2">
                    <Globe size={16} className="text-accent" /> Explore thoughts shared by the Fortuitous community.
                </p>
            </div>

            <div className="flex flex-col gap-3 w-full md:w-auto">
                <div className="relative group">
                    <div className="absolute inset-0 bg-accent/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative flex items-center bg-surface border border-border rounded-xl px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-accent/50 transition-all">
                        <Search size={18} className="text-text-muted mr-3" />
                        <input 
                            type="text" 
                            placeholder="Search ideas, tags, authors..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent outline-none text-text-main placeholder:text-text-muted w-full md:w-64"
                        />
                    </div>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {['all', 'Career', 'Health', 'Learning', 'Mental State'].map(filter => (
                        <button 
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${activeFilter === filter ? 'bg-accent text-white border-accent' : 'bg-surface text-text-muted border-border hover:border-accent/50'}`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Content Grid */}
        <div className="flex-1 p-6 md:p-12">
            {filteredNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 text-center opacity-50">
                    <Sparkles size={48} className="text-text-muted mb-4" />
                    <h3 className="text-xl font-bold text-text-main">No thoughts found</h3>
                    <p className="text-sm text-text-muted">Try adjusting your search or filters.</p>
                </div>
            ) : (
                <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                    {filteredNotes.map(note => <NoteCard key={note.id} note={note} />)}
                </div>
            )}
        </div>
        
        {/* Footer Ambient Info */}
        <div className="p-6 text-center text-[10px] font-mono text-text-muted/30 uppercase tracking-[0.2em] pointer-events-none">
            Network Sync Active • Node Count: {notes.length}
        </div>
    </div>
  );
};

export default CommunityFeed;
