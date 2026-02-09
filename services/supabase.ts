
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { Note, Artifact, SyncState, SmartLink, TaskItem, Priority, TaskStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Strict Configuration Check
const isSupabaseConfigured = 
  SUPABASE_URL && 
  SUPABASE_URL.startsWith('https://') && 
  !SUPABASE_URL.includes('placeholder') &&
  SUPABASE_ANON_KEY && 
  SUPABASE_ANON_KEY.startsWith('eyJ');

const isMockMode = !isSupabaseConfigured;

if (isMockMode) {
  console.warn("⚠️ Supabase is not configured or keys are invalid. App is running in Mock Mode.");
}

export const supabase = isSupabaseConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

// --- Local-First Logic ---
const OFFLINE_QUEUE_KEY = 'ft_offline_queue';

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      console.warn("Storage quota exceeded. Initiating emergency cleanup...");
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
      
      if (key === 'ft_mock_notes') {
          try {
              const notes = JSON.parse(value);
              if (Array.isArray(notes) && notes.length > 10) {
                  const pruned = notes.slice(0, Math.floor(notes.length * 0.7));
                  localStorage.setItem(key, JSON.stringify(pruned));
                  return;
              }
          } catch(e2) {}
      }
    }
  }
};

const getOfflineQueue = (): any[] => {
    try {
        const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
};

const addToOfflineQueue = (action: string, payload: any) => {
    const queue = getOfflineQueue();
    if (queue.length > 50) queue.shift(); 
    queue.push({ id: uuidv4(), action, payload, timestamp: Date.now() });
    safeSetItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

const getLocalNotes = (): Note[] => {
  try {
    const stored = localStorage.getItem('ft_mock_notes');
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

const setLocalNotes = (notes: Note[]) => {
  safeSetItem('ft_mock_notes', JSON.stringify(notes));
};

const getLocalTasks = (): TaskItem[] => {
    try {
        const stored = localStorage.getItem('ft_mock_tasks');
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
}

const setLocalTasks = (tasks: TaskItem[]) => {
    safeSetItem('ft_mock_tasks', JSON.stringify(tasks));
}

// --- Sync Logic ---
export const syncOfflineChanges = async (): Promise<SyncState> => {
    if (isMockMode) return 'synced';
    const queue = getOfflineQueue();
    if (queue.length === 0) return 'synced';

    try {
        for (const item of queue) {
            if (item.action === 'save') await saveNote(item.payload, true);
            if (item.action === 'delete') await deleteNote(item.payload, true);
            if (item.action === 'saveTask') await createTask(item.payload);
            if (item.action === 'updateTask') await updateTask(item.payload.id, item.payload.updates);
            if (item.action === 'deleteTask') await deleteTask(item.payload);
        }
        safeSetItem(OFFLINE_QUEUE_KEY, JSON.stringify([]));
        return 'synced';
    } catch (e) {
        console.error("Sync failed", e);
        return 'error';
    }
};

// --- Auth Helpers ---
export const signInWithGoogle = async () => {
  if (isMockMode || !supabase) {
    await new Promise(r => setTimeout(r, 1000));
    const mockUser = {
        id: 'google-user-123',
        email: 'google.user@example.com',
        user_metadata: { full_name: 'Google User', username: 'google_explorer', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=google' }
    };
    const mockSession = { user: mockUser, access_token: 'mock-google-token', refresh_token: 'mock-google-refresh', expires_in: 3600 };
    safeSetItem('ft_mock_session', JSON.stringify(mockSession));
    return { data: { user: mockUser, session: mockSession }, error: null };
  }
  return await (supabase.auth as any).signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
};

export const signInWithEmail = async (email: string, password: string) => {
  if (isMockMode || !supabase) {
    await new Promise(r => setTimeout(r, 800)); 
    const users = JSON.parse(localStorage.getItem('ft_mock_users') || '[]');
    const normalizedEmail = email.toLowerCase().trim();
    const user = users.find((u: any) => u.email.toLowerCase().trim() === normalizedEmail && u.password === password);
    if (user) {
        const mockSession = { 
            user: { id: user.id, email: user.email, user_metadata: { username: user.username, role: password === 'We2aredumbasses' ? 'admin' : 'user' } }, 
            access_token: 'mock-token-' + user.id, token_type: 'bearer', expires_in: 3600, refresh_token: 'mock-refresh'
        };
        safeSetItem('ft_mock_session', JSON.stringify(mockSession));
        return { data: { user: mockSession.user, session: mockSession }, error: null };
    }
    return { data: { user: null, session: null }, error: { message: "Invalid login credentials" } };
  }
  return await (supabase.auth as any).signInWithPassword({ email, password });
};

export const signUpWithEmail = async (email: string, password: string, username: string) => {
  if (isMockMode || !supabase) {
     await new Promise(r => setTimeout(r, 800));
     const users = JSON.parse(localStorage.getItem('ft_mock_users') || '[]');
     if (users.find((u: any) => u.email.toLowerCase().trim() === email.toLowerCase().trim())) {
         return { data: { user: null, session: null }, error: { message: "User already exists." } };
     }
     const newUser = { id: uuidv4(), email: email.toLowerCase().trim(), password, username }; 
     users.push(newUser);
     safeSetItem('ft_mock_users', JSON.stringify(users));
     const mockSession = { user: { id: newUser.id, email: newUser.email, user_metadata: { username } }, access_token: 'mock-token-'+newUser.id, token_type: 'bearer', expires_in: 3600 };
     safeSetItem('ft_mock_session', JSON.stringify(mockSession));
     return { data: { user: newUser, session: mockSession }, error: null };
  }
  return await (supabase.auth as any).signUp({ email, password, options: { data: { username } } });
};

export const signOut = async () => {
  if (isMockMode || !supabase) { localStorage.removeItem('ft_mock_session'); return { error: null }; }
  return await (supabase.auth as any).signOut();
};

export const getCurrentSession = async () => {
  if (isMockMode || !supabase) {
    const stored = localStorage.getItem('ft_mock_session');
    if (stored) return { session: JSON.parse(stored), error: null };
    return { session: null, error: null };
  }
  const { data: { session }, error } = await (supabase.auth as any).getSession();
  return { session, error };
};

// --- Helper: Mappers ---
const mapTaskToDB = (task: TaskItem, userId: string) => {
    let status = 'pending';
    if (task.status === 'in-progress') status = 'in-progress';
    if (task.status === 'done') status = 'done';

    let priority = 3; // Medium
    if (task.priority === 'high') priority = 1;
    if (task.priority === 'low') priority = 5;

    return {
        id: task.id,
        user_id: userId,
        title: task.content,
        description: task.description || null,
        status,
        priority,
        due_date: task.dueDate || null,
        completed_at: task.status === 'done' ? (task.completedAt || new Date().toISOString()) : null,
        source_note: task.sourceNoteId || null,
        updated_at: new Date().toISOString()
    };
};

const mapDBToTask = (dbTask: any): TaskItem => {
    let status: TaskStatus = 'todo';
    if (dbTask.status === 'in-progress') status = 'in-progress';
    if (dbTask.status === 'done') status = 'done';

    let priority: Priority = 'medium';
    if (dbTask.priority <= 2) priority = 'high';
    if (dbTask.priority >= 4) priority = 'low';

    return {
        id: dbTask.id,
        content: dbTask.title,
        description: dbTask.description || undefined,
        status,
        priority,
        dueDate: dbTask.due_date,
        completedAt: dbTask.completed_at,
        sourceNoteId: dbTask.source_note,
        created_at: dbTask.created_at
    };
};

// --- Task Functions (New First-Class Tasks) ---
export const fetchGlobalTasks = async (): Promise<TaskItem[]> => {
    if (isMockMode || !supabase) {
        return getLocalTasks();
    }
    try {
        const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(mapDBToTask);
    } catch (e) {
        console.warn("Fetch tasks failed", e);
        return getLocalTasks();
    }
};

export const createTask = async (task: TaskItem): Promise<TaskItem | null> => {
    const { session } = await getCurrentSession();
    if (!session?.user) return null;

    const dbTask = mapTaskToDB(task, session.user.id);
    
    // Mock Mode Update
    const current = getLocalTasks();
    setLocalTasks([task, ...current]);

    if (isMockMode || !supabase) return task;

    try {
        const { error } = await supabase.from('tasks').insert(dbTask);
        if (error) throw error;
        return task;
    } catch (e) {
        addToOfflineQueue('saveTask', task);
        return task;
    }
};

export const updateTask = async (id: string, updates: Partial<TaskItem>): Promise<TaskItem | null> => {
    const { session } = await getCurrentSession();
    if (!session?.user) return null;

    // Mock Mode Update
    const current = getLocalTasks();
    const index = current.findIndex(t => t.id === id);
    if (index >= 0) {
        current[index] = { ...current[index], ...updates };
        setLocalTasks(current);
    }

    if (isMockMode || !supabase) return index >= 0 ? current[index] : null;

    try {
        const payload: any = { updated_at: new Date().toISOString() };
        if (updates.content) payload.title = updates.content;
        if (updates.description !== undefined) payload.description = updates.description;
        if (updates.status) {
            payload.status = updates.status === 'todo' ? 'pending' : updates.status;
            if (updates.status === 'done') payload.completed_at = new Date().toISOString();
            else payload.completed_at = null;
        }
        if (updates.priority) payload.priority = updates.priority === 'high' ? 1 : updates.priority === 'low' ? 5 : 3;
        if (updates.dueDate !== undefined) payload.due_date = updates.dueDate;

        const { error } = await supabase.from('tasks').update(payload).eq('id', id);
        if (error) throw error;
        return { ...current[index], ...updates };
    } catch (e) {
        addToOfflineQueue('updateTask', { id, updates });
        return { ...current[index], ...updates };
    }
};

export const deleteTask = async (id: string, bypassQueue = false): Promise<boolean> => {
    // Mock Mode
    const current = getLocalTasks();
    setLocalTasks(current.filter(t => t.id !== id));

    if (isMockMode || !supabase) return true;

    try {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) throw error;
        return true;
    } catch (e) {
        if (!bypassQueue) addToOfflineQueue('deleteTask', id);
        return true;
    }
};

// --- Note Functions ---
export const fetchNotes = async (): Promise<Note[]> => {
  if (isMockMode || !supabase) {
    const { session } = await getCurrentSession();
    if (!session || !session.user) return [];
    return getLocalNotes().filter(n => n.user_id === session.user.id);
  }
  
  try {
    // Join profiles for potential author info if needed, although user_id usually suffices for own notes
    const { data, error } = await supabase
        .from('notes')
        .select(`*, artifacts ( id, type, content, created_at ), note_links!from_note ( to_note, link_type )`)
        .order('updated_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    const notes = data.map((item: any) => {
        const meta = item.content_json || {};
        // Sync root columns to metadata for UI compatibility
        meta.isPublic = item.is_public;
        meta.visibility = item.is_public ? 'public' : 'private';
        
        meta.mood = item.mood;
        if (item.energy_level) meta.energyLevel = item.energy_level;

        const userArtifacts = Array.isArray(item.artifacts) ? item.artifacts.map((a: any) => {
            let title = "Artifact", content = a.content, metadata = {};
            try {
                const parsed = JSON.parse(a.content);
                if (parsed && typeof parsed === 'object' && parsed.content) { 
                    title = parsed.title || title; 
                    content = parsed.content; 
                    metadata = parsed.metadata || {};
                }
            } catch(e) {}
            return { id: a.id, type: a.type, title, content, created_at: a.created_at, ...metadata };
        }) : [];

        meta.artifacts = userArtifacts;

        return {
            id: item.id,
            user_id: item.user_id,
            title: item.title,
            content: item.content,
            type: meta.type || 'note',
            created_at: item.created_at,
            updated_at: item.updated_at,
            is_public: item.is_public,
            public_slug: item.public_slug,
            published_at: item.published_at,
            metadata: meta
        };
    }) as Note[];

    setLocalNotes(notes); 
    return notes;
  } catch (e) {
      console.warn("Fetch failed, using local cache", e);
      return getLocalNotes();
  }
};

export const fetchPublicNotes = async (): Promise<Note[]> => {
    if (isMockMode || !supabase) {
        const local = getLocalNotes();
        // Simulate community feed with mock data + local public notes
        const mockPublic = local.filter(n => n.is_public || n.metadata?.visibility === 'public');
        return [...mockPublic].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    try {
        const { data, error } = await supabase
            .from('notes')
            .select(`
                id, title, content, created_at, updated_at, 
                is_public, public_slug, published_at, content_json,
                profiles ( username, avatar_url, bio )
            `)
            .eq('is_public', true)
            .order('published_at', { ascending: false })
            .limit(50);
            
        if (error) throw error;
        if (!data) return [];

        return data.map((item: any) => ({
            id: item.id,
            title: item.title,
            content: item.content,
            type: item.content_json?.type || 'note',
            created_at: item.created_at,
            updated_at: item.updated_at,
            is_public: true,
            public_slug: item.public_slug,
            published_at: item.published_at,
            metadata: {
                ...item.content_json,
                visibility: 'public'
            },
            author_profile: item.profiles
        })) as Note[];
    } catch(e) { return []; }
};

export const saveNote = async (note: Partial<Note>, bypassQueue = false): Promise<Note | null> => {
  if (!note.id) return null;
  const { session } = await getCurrentSession();
  const userId = session?.user?.id;
  
  if (!userId && !isMockMode) return null;

  const currentNotes = getLocalNotes();
  const existingIndex = currentNotes.findIndex(n => n.id === note.id);
  
  // Merge logic for local state
  const fullNote: Note = existingIndex >= 0 
    ? { ...currentNotes[existingIndex], ...note, user_id: userId || currentNotes[existingIndex].user_id, updated_at: new Date().toISOString() } as Note
    : { 
        id: note.id,
        user_id: userId || 'guest', 
        title: note.title || '', 
        content: note.content || '', 
        type: note.type || 'note', 
        created_at: note.created_at || new Date().toISOString(), 
        updated_at: new Date().toISOString(), 
        metadata: note.metadata || {} 
      } as Note;

  // Ensure metadata sync
  if (note.is_public !== undefined) {
      if (!fullNote.metadata) fullNote.metadata = {};
      fullNote.metadata.visibility = note.is_public ? 'public' : 'private';
      fullNote.is_public = note.is_public;
  }

  const newNotes = existingIndex >= 0 ? [...currentNotes] : [fullNote, ...currentNotes];
  if (existingIndex >= 0) newNotes[existingIndex] = fullNote;
  setLocalNotes(newNotes);

  if (isMockMode || !supabase) return fullNote;

  try {
      const { metadata, type, is_public, public_slug } = fullNote;
      const metadataToStore = { ...metadata, type };
      delete (metadataToStore as any).artifacts;
      delete (metadataToStore as any).smartLinks;
      
      const { error: noteError } = await supabase
        .from('notes')
        .upsert({
            id: fullNote.id,
            user_id: userId,
            title: fullNote.title,
            content: fullNote.content,
            content_json: metadataToStore,
            is_public: is_public || false,
            public_slug: is_public ? (public_slug || uuidv4()) : null,
            published_at: is_public ? (fullNote.published_at || new Date().toISOString()) : null,
            mood: metadata?.mood || null,
            energy_level: metadata?.energyLevel || null,
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (noteError) throw noteError;

      // Handle Artifacts
      if (Array.isArray(metadata?.artifacts) && metadata.artifacts.length > 0) {
        const artifactsPayload = metadata.artifacts.map(a => ({
            id: a.id, source_note: fullNote.id, user_id: userId, type: a.type,
            content: JSON.stringify({ title: a.title, content: a.content, metadata: { model: 'gemini' } }),
            created_at: a.created_at
        }));
        await supabase.from('artifacts').upsert(artifactsPayload);
      }

      // Handle Smart Links
      if (Array.isArray(metadata?.smartLinks) && metadata.smartLinks.length > 0) {
          await supabase.from('note_links').delete().eq('from_note', fullNote.id);
          const linksPayload = metadata.smartLinks.map(link => ({
              id: uuidv4(), user_id: userId, from_note: fullNote.id, to_note: link.targetId,
              link_type: link.reason, created_at: new Date().toISOString()
          }));
          await supabase.from('note_links').insert(linksPayload);
      }
      return fullNote;
  } catch (e) {
      if (!bypassQueue) addToOfflineQueue('save', note);
      return fullNote;
  }
};

export const deleteNote = async (id: string, bypassQueue = false): Promise<boolean> => {
  const currentNotes = getLocalNotes();
  setLocalNotes(currentNotes.filter(n => n.id !== id));
  if (isMockMode || !supabase) return true;
  try {
      await supabase.from('artifacts').delete().eq('source_note', id);
      await supabase.from('note_links').delete().or(`from_note.eq.${id},to_note.eq.${id}`);
      await supabase.from('tasks').update({ source_note: null }).eq('source_note', id);
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
      return true;
  } catch (e) {
      if (!bypassQueue) addToOfflineQueue('delete', id);
      return true; 
  }
};

// --- Forking Logic ---
export const forkNote = async (originalNote: Note): Promise<Note | null> => {
    const { session } = await getCurrentSession();
    if (!session?.user) return null;

    const newNote: Note = {
        id: uuidv4(),
        user_id: session.user.id,
        title: `${originalNote.title} (Copy)`,
        content: originalNote.content,
        type: originalNote.type,
        is_public: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
            ...originalNote.metadata,
            visibility: 'private',
            shareToken: undefined,
            editCount: 0,
            forkedFrom: {
                id: originalNote.id,
                title: originalNote.title,
                author: originalNote.metadata?.isAnonymous ? 'Anonymous' : (originalNote.author_profile?.username || originalNote.metadata?.authorName || 'Unknown')
            },
            artifacts: (originalNote.metadata?.artifacts || []).map(a => ({...a, id: uuidv4()})) // Deep copy artifacts
        }
    };

    return await saveNote(newNote);
};
