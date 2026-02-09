
import React from 'react';
import { NoteType, NoteMetadata, Template } from '../types';
import { Layout, Calendar, CheckSquare, Target, BookOpen, Coffee, GitPullRequest, Briefcase, Zap, Star, Mountain, PenTool, X, Brain } from 'lucide-react';

interface TemplateGalleryProps {
  onSelect: (template: Template) => void;
  onClose: () => void;
}

const templates: Template[] = [
  {
    id: 'deep_work',
    name: 'Deep Work Protocol',
    description: 'Cal Newport inspired session block for maximum cognitive output.',
    icon: Brain,
    structure: {
      title: 'Deep Work Session: ' + new Date().toLocaleDateString(),
      type: 'note',
      content: `# 🧠 Deep Work Session
> "Clarity about what matters provides clarity about what does not." - Cal Newport

## 🎯 Single Focus
*One ambitous outcome for this session.*
- [ ] 

## 🚫 Distraction Rules
- [ ] Phone in other room
- [ ] Email closed
- [ ] Slack/Teams muted

## ⏱️ Blocks
1. **Input (20m)**: Research & Context
2. **Synthesis (40m)**: Draft & Solve
3. **Review (10m)**: Polish

## 📝 Output Log
`,
      metadata: { tags: ['deep-work', 'focus'], thinkingMode: 'deep', lifeAxis: 'Creative Output' }
    }
  },
  {
    id: 'feynman',
    name: 'Feynman Technique',
    description: 'Learn anything faster by explaining it simply.',
    icon: PenTool,
    structure: {
      title: 'Concept: ',
      type: 'note',
      content: `# 👨‍🏫 The Feynman Technique

## 1. The Concept
*What are you trying to understand?*


## 2. Explain to a 12-Year-Old
*Write an explanation in simple language. Avoid jargon.*


## 3. Identify Gaps
*Where did you get stuck? What is fuzzy?*
- 

## 4. Simplify & Analogy
*Create an analogy to solidify understanding.*
> "This concept is like..."
`,
      metadata: { tags: ['learning', 'feynman'], lifeAxis: 'Learning' }
    }
  },
  {
    id: 'stoic_reflection',
    name: 'Stoic Evening Review',
    description: 'Seneca\'s daily practice for resilience and clarity.',
    icon: Mountain,
    structure: {
      title: 'Evening Reflection',
      type: 'note',
      content: `# 🏛️ Stoic Review

## 1. What did I do well?
*Acknowledge your own virtue.*


## 2. What could I have done better?
*Without guilt, only observation.*


## 3. What habits am I building?
- **Virtue**: 
- **Vice**: 

## 🌓 Memento Mori
*If I do not wake up tomorrow, am I content with today?*
`,
      metadata: { tags: ['stoic', 'journal', 'reflection'], mood: 'calm', lifeAxis: 'Mental State' }
    }
  },
  {
    id: 'second_brain_para',
    name: 'PARA Project',
    description: 'Tiago Forte\'s project structure for Second Brain.',
    icon: Layout,
    structure: {
      title: 'Project: ',
      type: 'project',
      content: `# 🏗️ PARA Project

## 🎯 Goal
*Specific, measurable outcome.*

## 📅 Timeline
- **Start**: 
- **Deadline**: 

## 📂 Resources
*Links, files, and assets needed.*
- 

## ✅ Next Actions
- [ ] 
- [ ] 
`,
      metadata: { tags: ['para', 'project'], viewMode: 'list', lifeAxis: 'Career' }
    }
  },
  {
    id: 'eisenhower',
    name: 'Eisenhower Matrix',
    description: 'Decision matrix for prioritizing tasks.',
    icon: Target,
    structure: {
      title: 'Prioritization Matrix',
      type: 'note',
      content: `# ⚖️ Eisenhower Matrix

## 1. Urgent & Important (DO)
*Crisis, deadlines, pressing problems.*
- [ ] 

## 2. Not Urgent & Important (PLAN)
*Strategy, values, long-term goals.*
- [ ] 

## 3. Urgent & Not Important (DELEGATE)
*Interruptions, most emails, some meetings.*
- [ ] 

## 4. Not Urgent & Not Important (ELIMINATE)
*Time wasters, busy work.*
- [ ] 
`,
      metadata: { tags: ['planning', 'priority'] }
    }
  }
];

const TemplateGallery: React.FC<TemplateGalleryProps> = ({ onSelect, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4" onClick={onClose}>
      <div 
        className="bg-canvas border border-border w-full max-w-5xl rounded-3xl shadow-2xl p-6 md:p-8 relative animate-slide-up flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 md:mb-8 flex items-start justify-between border-b border-border pb-6 shrink-0">
           <div>
             <h2 className="text-2xl md:text-4xl font-bold text-text-main brand-font mb-2">Framework Gallery</h2>
             <p className="text-text-muted text-sm md:text-lg font-light leading-snug">Proven mental models for high-performance cognition.</p>
           </div>
           <button onClick={onClose} className="p-2 md:px-4 md:py-2 text-sm font-bold bg-surface border border-border rounded-full hover:bg-accent hover:text-white transition-all">
              <span className="hidden md:inline">Close</span>
              <X size={20} className="md:hidden" />
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 overflow-y-auto pr-2 pb-8 custom-scrollbar">
           {templates.map(t => (
              <button 
                key={t.id}
                onClick={() => onSelect(t)}
                className="group relative flex flex-col items-start p-5 md:p-6 rounded-2xl bg-surface border border-border hover:border-accent/50 hover:shadow-xl transition-all duration-300 text-left overflow-hidden active:scale-[0.98]"
              >
                 <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                 
                 <div className="relative z-10 w-full">
                    <div className="flex justify-between items-start mb-3 md:mb-4">
                        <div className="p-3 rounded-xl bg-canvas border border-border group-hover:bg-accent group-hover:text-white transition-colors shadow-sm">
                            <t.icon size={24} className="md:w-7 md:h-7" />
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-accent/10 text-accent text-[10px] font-black uppercase px-2 py-1 rounded">
                            Use
                        </div>
                    </div>
                    
                    <h3 className="text-lg md:text-xl font-bold text-text-main mb-1 md:mb-2 group-hover:text-accent transition-colors">{t.name}</h3>
                    <p className="text-xs md:text-sm text-text-muted leading-relaxed font-light">{t.description}</p>
                 </div>
              </button>
           ))}
        </div>
      </div>
    </div>
  );
};

export default TemplateGallery;
