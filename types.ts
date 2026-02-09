
export type NoteType = 'note' | 'project';
export type AppLanguage = 'en' | 'af' | 'fr' | 'zh';
export type LifeAxis = 'Career' | 'Health' | 'Relationships' | 'Learning' | 'Mental State' | 'Creative Output' | 'Unclassified';
export type NoteVisibility = 'private' | 'link' | 'public';

export interface Artifact {
  id: string;
  type: 'mindmap' | 'summary' | 'flashcards' | 'timeline' | 'process' | 'swot' | 'quiz' | 'slides' | 'infographic';
  title: string;
  content: string; 
  created_at: string;
}

export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'blocked';

export interface TaskReminder {
  id: string;
  time: string; // ISO
  type: 'once' | 'daily' | 'weekly';
  isAdaptive: boolean; // Behavior-based timing
  lastNotified?: string;
}

// Mapped to DB 'tasks' table
// DB: title -> UI: content
// DB: status (pending, done) -> UI: status (todo, done)
// DB: priority (int) -> UI: priority (string)
export interface TaskItem {
  id: string;
  content: string; // Maps to DB 'title'
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string; // Maps to DB 'due_date'
  completedAt?: string; // Maps to DB 'completed_at'
  sourceNoteId?: string; // Maps to DB 'source_note'
  
  // UI Specific or JSON metadata fields (can be stored in public_metadata or description if needed)
  section?: string; 
  tags?: string[];
  subtasks?: { id: string; content: string; completed: boolean }[];
  reminder?: TaskReminder;
  effort?: string; 
  created_at?: string;
}

export interface UserProfile {
  id: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
}

export interface SmartLink {
  targetId: string;
  targetTitle: string;
  reason: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'file' | 'link';
  url: string;
  size?: string;
}

export type ThinkingMode = 'deep' | 'creative' | 'planning' | 'solving' | 'reflection';

export interface NoteMetadata {
  themes?: string[];
  entities?: string[];
  tone?: string;
  summary?: string;
  tags?: string[];
  mood?: string; 
  energyLevel?: 'high' | 'medium' | 'low';
  thinkingMode?: ThinkingMode;
  lifeAxis?: LifeAxis;
  linkAnalysis?: string;
  artifacts?: Artifact[];
  actionItems?: TaskItem[]; // Legacy support, prefer top-level tasks
  smartLinks?: SmartLink[];
  attachments?: Attachment[]; 
  editCount?: number; 
  lastOpened?: string;
  projectStatus?: 'active' | 'on-hold' | 'completed';
  viewMode?: 'list' | 'board' | 'calendar';
  
  // Sharing & Attribution
  visibility?: NoteVisibility; // Helper for UI, syncs with is_public
  shareToken?: string;
  allowLinkEdit?: boolean;
  isAnonymous?: boolean;
  authorName?: string; // Legacy fallback
  forkedFrom?: {
    id: string;
    title: string;
    author: string;
  };
}

export interface Note {
  id: string;
  user_id?: string;
  title: string;
  content: string;
  type: NoteType;
  created_at: string;
  updated_at?: string;
  metadata?: NoteMetadata;
  
  // New DB Fields
  is_public?: boolean;
  public_slug?: string;
  published_at?: string;
  public_metadata?: any;
  author_profile?: UserProfile; // Joined data
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  isThinking?: boolean;
  groundingMetadata?: any;
}

export interface PatternAlert {
  type: string;
  description: string;
  evidence: string[];
}

export interface WeeklyRealityCheck {
  date: string;
  uncomfortableTruth: string;
  win: string;
  adjustment: string;
  summary: string;
}

export interface AIAnalysisResponse {
  themes: string[];
  entities: string[];
  tone: string;
  tags: string[];
  summary: string;
  lifeAxis: LifeAxis;
}

export interface ContradictionResult {
  hasContradiction: boolean;
  explanation: string;
}

export interface UserHabits {
  lastAnalyzed: Date;
  insights: string[];
  frequentTopics: string[];
  patternAlerts: PatternAlert[]; 
  weeklyReport?: WeeklyRealityCheck; 
  productivity: {
    peakDay: string;
    peakTime: string;
    noteFrequency: string;
    cognitiveVelocity: number;
    artifactComplexity: number;
    avoidanceList: { id: string; title: string; reason: string }[];
    productiveMood: string;
    axisDistribution: Record<LifeAxis, number>; 
  }
}

export interface AppSettings {
  language: AppLanguage;
  aiPersonality: AIPersonality;
  defaultAiContext: AIContextMode;
  fontFamily: AppFont;
  reduceMotion: boolean;
  autoSaveInterval: number;
  themeColor: AppThemeColor;
  backgroundAnalysis: boolean;
  enableNotifications: boolean;
  soundEffects: boolean;
}

export type AIPersonality = 'standard' | 'creative' | 'analytical' | 'concise';
export type AppFont = 'inter' | 'serif' | 'mono';
export type AppThemeColor = 'indigo' | 'emerald' | 'rose' | 'amber' | 'violet' | 'blue';
export type AIContextMode = 'knowledge' | 'web' | 'hybrid';

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: any;
  structure: {
    title: string;
    content: string;
    type: NoteType;
    metadata: NoteMetadata;
  }
}

export type SyncState = 'synced' | 'pending' | 'offline' | 'error';
