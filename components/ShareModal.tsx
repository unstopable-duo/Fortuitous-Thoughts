import React, { useState } from 'react';
import { X, Globe, Lock, Copy, Check, Share2, Link as LinkIcon, Users, Ghost, Edit3 } from 'lucide-react';
import { AppLanguage, NoteVisibility } from '../types';
import { getTranslation } from '../services/translations';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPublic: boolean; // Legacy prop, map to visibility
  onTogglePublic: (isPublic: boolean) => void; // Legacy
  shareUrl: string;
  language: AppLanguage;
  
  // New props
  visibility?: NoteVisibility;
  onUpdateVisibility?: (v: NoteVisibility) => void;
  isAnonymous?: boolean;
  onToggleAnonymous?: (v: boolean) => void;
  allowEdit?: boolean;
  onToggleEdit?: (v: boolean) => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ 
  isOpen, 
  onClose, 
  isPublic, 
  onTogglePublic, 
  shareUrl,
  language,
  visibility = isPublic ? 'link' : 'private',
  onUpdateVisibility,
  isAnonymous = false,
  onToggleAnonymous,
  allowEdit = false,
  onToggleEdit
}) => {
  const [copied, setCopied] = useState(false);
  const t = (key: string) => getTranslation(language, key);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Internal handler to bridge legacy props if new ones aren't provided yet
  const setVisibility = (v: NoteVisibility) => {
      if (onUpdateVisibility) {
          onUpdateVisibility(v);
      } else {
          // Fallback for legacy
          onTogglePublic(v !== 'private');
      }
  };

  const OptionCard = ({ type, icon: Icon, title, desc }: { type: NoteVisibility, icon: any, title: string, desc: string }) => (
      <button 
        onClick={() => setVisibility(type)}
        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left group relative overflow-hidden ${visibility === type ? 'bg-accent/5 border-accent shadow-md' : 'bg-canvas border-border hover:border-accent/30'}`}
      >
          {visibility === type && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />}
          <div className={`p-3 rounded-full shrink-0 ${visibility === type ? 'bg-accent text-white' : 'bg-surface border border-border text-text-muted group-hover:text-accent'}`}>
              <Icon size={20} />
          </div>
          <div>
              <h3 className={`font-bold text-sm ${visibility === type ? 'text-accent' : 'text-text-main'}`}>{title}</h3>
              <p className="text-[10px] text-text-muted leading-tight mt-1">{desc}</p>
          </div>
          {visibility === type && <div className="ml-auto text-accent"><Check size={18} /></div>}
      </button>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4" onClick={onClose}>
      <div 
        className="bg-surface border border-border w-full max-w-lg rounded-3xl shadow-2xl p-6 relative animate-slide-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent to-purple-500"></div>
        <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-main">
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
           <div className="p-3 rounded-full bg-surface border border-border text-text-muted">
              <Share2 size={24} />
           </div>
           <div>
              <h2 className="text-xl font-bold text-text-main brand-font">{t('broadcast')}</h2>
              <p className="text-xs text-text-muted">{t('share_desc')}</p>
           </div>
        </div>

        <div className="space-y-3 mb-6">
            <OptionCard 
                type="private" 
                icon={Lock} 
                title={t('private_note')} 
                desc="Only you can access this note." 
            />
            <OptionCard 
                type="link" 
                icon={LinkIcon} 
                title="Unlisted Link" 
                desc="Anyone with the link can view." 
            />
            <OptionCard 
                type="public" 
                icon={Globe} 
                title="Public Community" 
                desc="Visible to everyone in Shared Thoughts." 
            />
        </div>

        {/* Configuration Panel for Link/Public */}
        {visibility !== 'private' && (
            <div className="bg-canvas/50 border border-border rounded-xl p-4 animate-fade-in mb-6">
                
                {/* Link Config */}
                <div className="space-y-4">
                    {onToggleEdit && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-text-main font-medium">
                                <Edit3 size={16} className="text-text-muted" /> Allow Editing
                            </div>
                            <input 
                                type="checkbox" 
                                checked={allowEdit} 
                                onChange={(e) => onToggleEdit(e.target.checked)} 
                                className="toggle-checkbox" 
                            />
                        </div>
                    )}

                    {visibility === 'public' && onToggleAnonymous && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-text-main font-medium">
                                <Ghost size={16} className="text-text-muted" /> Publish Anonymously
                            </div>
                            <input 
                                type="checkbox" 
                                checked={isAnonymous} 
                                onChange={(e) => onToggleAnonymous(e.target.checked)} 
                                className="toggle-checkbox" 
                            />
                        </div>
                    )}

                    <div className="pt-2 border-t border-border">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">{t('public_link')}</div>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs text-text-muted truncate font-mono flex items-center gap-2">
                                <LinkIcon size={12} /> {shareUrl}
                            </div>
                            <button 
                                onClick={handleCopy}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${copied ? 'bg-green-500 text-white' : 'bg-accent hover:bg-accent-hover text-white'}`}
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? t('copied') : t('copy_link')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {visibility === 'public' && (
            <div className="flex items-center gap-2 p-3 bg-blue-500/10 text-blue-500 rounded-xl text-xs">
                <Users size={16} />
                <span className="font-medium">Other users can now save copies of this thought.</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default ShareModal;