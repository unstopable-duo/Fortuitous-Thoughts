
import { GoogleGenAI, Type, LiveServerMessage, Modality } from "@google/genai";
import { GEMINI_API_KEY, MODELS } from '../constants';
import { Note, AIAnalysisResponse, ContradictionResult, UserHabits, AIContextMode, TaskItem, SmartLink, PatternAlert, WeeklyRealityCheck } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Utilities ---
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRateLimit = error?.message?.includes('429') || error?.status === 429 || error?.message?.includes('quota');
      if (isRateLimit && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// Robust JSON Cleaner to handle AI responses that include ```json ... ```
const cleanAndParseJSON = (text: string | undefined): any => {
    if (!text) return null;
    try {
        // Remove markdown code blocks if present
        let clean = text.replace(/```json\n?/gi, '').replace(/```/g, '').trim();
        return JSON.parse(clean);
    } catch (e) {
        console.error("JSON Parse Error on text:", text);
        return null;
    }
};

function encodeAudio(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
  return btoa(binary);
}
function decodeAudio(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
  return bytes;
}
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) { channelData[i] = dataInt16[i * numChannels + channel] / 32768.0; }
  }
  return buffer;
}
function createAudioBlob(data: Float32Array) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) { int16[i] = data[i] * 32768; }
  return { data: encodeAudio(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
}
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, _) => {
    const reader = new FileReader();
    reader.onloadend = () => { resolve((reader.result as string).split(',')[1]); };
    reader.readAsDataURL(blob);
  });
};

export class GeminiLiveSession {
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputNode: MediaStreamAudioSourceNode | null = null;
  private outputNode: GainNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sources: Set<AudioBufferSourceNode> = new Set();
  private nextStartTime = 0;
  private active = false;
  private sessionPromise: Promise<any> | null = null;
  private frameInterval: number | null = null;
  private canvas: HTMLCanvasElement | null = null;
  
  constructor(
    private onStatusChange: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void,
    private onVolumeChange: (volume: number) => void, 
    private onTranscription: (text: string, role: 'user' | 'model') => void
  ) {
    this.canvas = document.createElement('canvas');
  }

  async connect(videoElement?: HTMLVideoElement | null) {
    this.onStatusChange('connecting');
    this.active = true;
    try {
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      await this.inputAudioContext.resume();
      await this.outputAudioContext.resume();

      this.outputNode = this.outputAudioContext.createGain();
      this.outputNode.connect(this.outputAudioContext.destination);
      
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true,
          video: !!videoElement ? { width: { ideal: 640 }, height: { ideal: 480 } } : false
        });
      } catch (e: any) {
        // Fallback: If camera is missing but was requested, try audio only
        if (!!videoElement && (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError' || e.name === 'NotAllowedError')) {
           console.warn("Camera failed or not found, attempting audio-only fallback...");
           stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
           throw e;
        }
      }

      const liveAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
      this.sessionPromise = liveAi.live.connect({
        model: MODELS.LIVE,
        callbacks: {
          onopen: () => { this.onStatusChange('connected'); this.setupInputs(stream, videoElement); },
          onmessage: async (message: LiveServerMessage) => { this.handleMessage(message); },
          onclose: () => { this.onStatusChange('disconnected'); this.disconnect(); },
          onerror: (e) => { console.error(e); this.onStatusChange('error'); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: "You are Fortuitous, a licensed intelligent partner from TRN Technologies. Be concise, insightful, and brutally gentle."
        }
      });
    } catch (error) {
      console.error("Failed to start Live session", error);
      this.onStatusChange('error');
      this.disconnect();
    }
  }

  private setupInputs(stream: MediaStream, videoElement?: HTMLVideoElement | null) {
    if (!this.inputAudioContext || !this.sessionPromise) return;
    this.inputNode = this.inputAudioContext.createMediaStreamSource(stream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (e) => {
      if (!this.active || !this.sessionPromise) return;
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = createAudioBlob(inputData);
      
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) sum += Math.abs(inputData[i]);
      const volume = Math.min(1, (sum / inputData.length) * 5); 
      this.onVolumeChange(volume);
      
      this.sessionPromise.then(session => { session.sendRealtimeInput({ media: pcmBlob }); });
    };
    this.inputNode.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);

    // Check if the stream actually has video tracks before starting interval
    const hasVideo = stream.getVideoTracks().length > 0;
    if (videoElement && this.canvas && hasVideo) {
      const ctx = this.canvas.getContext('2d');
      if (videoElement.paused) videoElement.play().catch(() => {});
      this.frameInterval = window.setInterval(() => {
        if (!this.active || !ctx || !this.sessionPromise || !videoElement.videoWidth) return;
        this.canvas!.width = videoElement.videoWidth;
        this.canvas!.height = videoElement.videoHeight;
        ctx.drawImage(videoElement, 0, 0);
        this.canvas!.toBlob(async (blob) => {
          if (blob && this.sessionPromise) {
            const base64Data = await blobToBase64(blob);
            this.sessionPromise.then(session => { session.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } }); });
          }
        }, 'image/jpeg', 0.5);
      }, 1000);
    }
  }

  private async handleMessage(message: LiveServerMessage) {
    if (message.serverContent?.outputTranscription) { this.onTranscription(message.serverContent.outputTranscription.text, 'model'); } 
    else if (message.serverContent?.inputTranscription) { this.onTranscription(message.serverContent.inputTranscription.text, 'user'); }
    if (!this.outputAudioContext || !this.outputNode) return;
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      this.onVolumeChange(0.5); 
      this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
      const audioBuffer = await decodeAudioData(decodeAudio(base64Audio), this.outputAudioContext, 24000, 1);
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputNode);
      source.onended = () => { 
          this.sources.delete(source); 
          if (this.sources.size === 0) this.onVolumeChange(0); 
      };
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.sources.add(source);
    }
    if (message.serverContent?.interrupted) { this.sources.forEach(s => s.stop()); this.sources.clear(); this.nextStartTime = 0; this.onVolumeChange(0); }
  }

  disconnect() {
    this.active = false;
    if (this.frameInterval) clearInterval(this.frameInterval);
    this.frameInterval = null;
    this.sources.forEach(s => s.stop());
    this.sources.clear();
    
    if (this.inputNode) { 
        try {
            (this.inputNode as any).mediaStream?.getTracks().forEach((t: any) => t.stop()); 
            this.inputNode.disconnect();
        } catch(e) {}
    }
    if (this.processor) {
        try { this.processor.disconnect(); } catch(e) {}
    }
    
    try { this.inputAudioContext?.close(); } catch(e) {}
    try { this.outputAudioContext?.close(); } catch(e) {}
    
    // Explicitly close the session to avoid "signal aborted without reason"
    if (this.sessionPromise) {
        this.sessionPromise.then(session => {
            try { session.close(); } catch(e) { console.debug("Session close error", e); }
        }).catch(() => {});
    }

    this.inputNode = null;
    this.processor = null;
    this.inputAudioContext = null;
    this.outputAudioContext = null;
    this.sessionPromise = null;
  }
}

// --- New Feature: Text-to-Speech ---
export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  try {
    const callAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await callAi.models.generateContent({
      model: MODELS.TTS,
      contents: { parts: [{ text: text.slice(0, 500) }] }, // Limit length for demo
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    return await decodeAudioData(decodeAudio(base64Audio), ctx, 24000, 1);
  } catch (e) {
    console.error("TTS generation failed", e);
    return null;
  }
};

export const analyzeNoteContent = async (content: string): Promise<AIAnalysisResponse | null> => {
  if (!content || content.length < 10) return null;
  return withRetry(async () => {
    const callAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await callAi.models.generateContent({
      model: MODELS.ANALYSIS,
      contents: `Analyze this note deeply. Categorize it into one of these Life Axes: Career, Health, Relationships, Learning, Mental State, Creative Output. Content: "${content}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            themes: { type: Type.ARRAY, items: { type: Type.STRING } },
            entities: { type: Type.ARRAY, items: { type: Type.STRING } },
            tone: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING },
            lifeAxis: { type: Type.STRING, enum: ['Career', 'Health', 'Relationships', 'Learning', 'Mental State', 'Creative Output', 'Unclassified'] }
          },
        },
      },
    });
    return cleanAndParseJSON(response.text);
  });
};

export const parseNaturalLanguageTask = async (input: string): Promise<TaskItem | null> => {
  return withRetry(async () => {
    const callAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await callAi.models.generateContent({
      model: MODELS.ANALYSIS,
      contents: `Parse this task input. Extract the content, due date (ISO 8601), priority (low, medium, high), and tags.
      Input: "${input}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING },
            dueDate: { type: Type.STRING },
            priority: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["content", "priority"]
        }
      }
    });
    const parsed = cleanAndParseJSON(response.text);
    if (parsed) {
        return {
            id: '', 
            content: parsed.content,
            status: 'todo',
            priority: parsed.priority,
            dueDate: parsed.dueDate,
            tags: parsed.tags,
            subtasks: []
        };
    }
    return null;
  });
};

export const optimizeSchedule = async (tasks: TaskItem[]): Promise<TaskItem[]> => {
  if (tasks.length === 0) return [];
  return withRetry(async () => {
    const callAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const taskList = tasks.map(t => JSON.stringify({id: t.id, content: t.content, priority: t.priority, due: t.dueDate})).join('\n');
    const response = await callAi.models.generateContent({
        model: MODELS.ANALYSIS,
        contents: `Reorder these tasks for maximum productivity. Prioritize high impact items and logical grouping. Return the IDs in the optimized order.
        Tasks: ${taskList}`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    });
    const ids = cleanAndParseJSON(response.text) || [];
    const ordered = [];
    for (const id of ids) {
        const t = tasks.find(x => x.id === id);
        if (t) ordered.push(t);
    }
    tasks.forEach(t => { if (!ids.includes(t.id)) ordered.push(t); });
    return ordered;
  });
};

export const generateMicroPlan = async (content: string): Promise<{ nextAction: string; timeEstimate: string; blocker: string; microPlan: string }> => {
  return withRetry(async () => {
    const callAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await callAi.models.generateContent({
      model: MODELS.ANALYSIS,
      contents: `Transform this thought into immediate momentum. Identify the single next physical action, a time estimate, a psychological or practical blocker, and a 1-step micro-plan to start.
      Thought: "${content}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             nextAction: { type: Type.STRING },
             timeEstimate: { type: Type.STRING },
             blocker: { type: Type.STRING },
             microPlan: { type: Type.STRING }
          },
          required: ["nextAction", "timeEstimate", "blocker", "microPlan"]
        }
      }
    });
    return cleanAndParseJSON(response.text) || { nextAction: "Review note", timeEstimate: "5m", blocker: "Unclear goal", microPlan: "Read again" };
  });
};

export const analyzeUserHabits = async (recentNotes: Note[]): Promise<UserHabits | null> => {
  if (recentNotes.length < 3) return null;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayCounts: Record<string, number> = {};
  const hourCounts: Record<number, number> = {};
  const moodCounts: Record<string, number> = {};
  const axisCounts: Record<string, number> = {
    'Career': 0, 'Health': 0, 'Relationships': 0, 'Learning': 0, 'Mental State': 0, 'Creative Output': 0
  };
  
  const avoidanceList = recentNotes
    .filter(n => (n.metadata?.editCount || 0) > 5 && n.content.length < 300)
    .map(n => ({ id: n.id, title: n.title, reason: "Frequent edits with low output" }))
    .slice(0, 3);

  recentNotes.forEach(note => {
    const date = new Date(note.created_at);
    dayCounts[days[date.getDay()]] = (dayCounts[days[date.getDay()]] || 0) + 1;
    hourCounts[date.getHours()] = (hourCounts[date.getHours()] || 0) + 1;
    if (note.metadata?.mood) moodCounts[note.metadata.mood] = (moodCounts[note.metadata.mood] || 0) + 1;
    if (note.metadata?.lifeAxis) axisCounts[note.metadata.lifeAxis] = (axisCounts[note.metadata.lifeAxis] || 0) + 1;
  });
  
  const peakDay = Object.keys(dayCounts).reduce((a, b) => dayCounts[a] > dayCounts[b] ? a : b, 'None');
  const peakHourStr = Object.keys(hourCounts).length > 0 ? Object.keys(hourCounts).reduce((a: any, b: any) => hourCounts[a] > hourCounts[b] ? a : b) : '0';
  const productiveMood = Object.keys(moodCounts).length > 0 ? Object.keys(moodCounts).reduce((a, b) => moodCounts[a] > moodCounts[b] ? a : b) : 'Neutral';

  const context = recentNotes.slice(0, 20).map(n => `Title: ${n.title}\nContent: ${n.content.substring(0, 150)}`).join('\n\n');
  
  return withRetry(async () => {
    const callAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await callAi.models.generateContent({
      model: MODELS.ANALYSIS,
      contents: `You are a licensed analyst from TRN Technologies. Perform a deep psychological and productivity analysis of these notes.
      1. Identify subconscious patterns (complaints, fears, cycles).
      2. Provide a "Brutally Gentle" Weekly Reality Check (one uncomfortable truth, one win, one adjustment).
      Context: ${context}`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: { type: Type.ARRAY, items: { type: Type.STRING } },
            frequentTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
            cognitiveVelocity: { type: Type.NUMBER },
            patternAlerts: { 
              type: Type.ARRAY, 
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  description: { type: Type.STRING },
                  evidence: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            },
            weeklyReport: {
              type: Type.OBJECT,
              properties: {
                uncomfortableTruth: { type: Type.STRING },
                win: { type: Type.STRING },
                adjustment: { type: Type.STRING },
                summary: { type: Type.STRING }
              }
            }
          }
        }
      }
    });
    if (response.text) {
      const data = cleanAndParseJSON(response.text);
      if (!data) return null;
      return {
        lastAnalyzed: new Date(),
        insights: data.insights || [],
        frequentTopics: data.frequentTopics || [],
        patternAlerts: data.patternAlerts || [],
        weeklyReport: { ...data.weeklyReport, date: new Date().toISOString() },
        productivity: {
          peakDay,
          peakTime: `${peakHourStr}:00`,
          noteFrequency: "Active",
          cognitiveVelocity: data.cognitiveVelocity || 50,
          artifactComplexity: recentNotes.filter(n => (n.metadata?.artifacts?.length || 0) > 0).length,
          avoidanceList,
          productiveMood,
          axisDistribution: axisCounts as any
        }
      };
    }
    return null;
  });
}

export const findSmartConnections = async (currentNote: Note, allNotes: Note[]): Promise<SmartLink[]> => {
  if (!currentNote.content || allNotes.length < 2) return [];
  
  return withRetry(async () => {
    const callAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const otherNotesSummary = allNotes
      .filter(n => n.id !== currentNote.id)
      .slice(0, 50)
      .map(n => `ID: ${n.id}, Title: ${n.title}, Summary: ${n.metadata?.summary || n.content.substring(0, 100)}`)
      .join('\n');

    const response = await callAi.models.generateContent({
      model: MODELS.ANALYSIS,
      contents: `Find 1 to 3 relevant connections between the current note and the knowledge base. For each connection, explain the semantic reason why they are related.
      
      CURRENT NOTE:
      Title: ${currentNote.title}
      Content: ${currentNote.content}
      
      KNOWLEDGE BASE:
      ${otherNotesSummary}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              targetId: { type: Type.STRING },
              targetTitle: { type: Type.STRING },
              reason: { type: Type.STRING }
            },
            required: ["targetId", "targetTitle", "reason"]
          }
        }
      }
    });

    return cleanAndParseJSON(response.text) || [];
  });
};

export const getCreativePrompt = async (topic?: string, mood?: string): Promise<{ title: string; prompt: string }> => {
  return withRetry(async () => {
    const callAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await callAi.models.generateContent({
      model: MODELS.EXPANSION,
      contents: `Generate a creative prompt. Topic: ${topic}, Mood: ${mood}.`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            prompt: { type: Type.STRING }
          },
          required: ["title", "prompt"]
        }
      }
    });
    return cleanAndParseJSON(response.text) || { title: "Reflect", prompt: "What is on your mind?" };
  });
};

export const chatWithContext = async (message: string, history: any[], notes: Note[], habits: UserHabits | null, mode: AIContextMode = 'hybrid') => {
  let systemInstruction = "You are Fortuitous, an intelligent second brain licensed by TRN Technologies. Your tone is 'Brutally Gentle' - providing clarity without judgment.";
  let tools: any[] = [];
  if (mode === 'knowledge' || mode === 'hybrid') {
      const knowledgeBase = notes.slice(0, 30).map(n => `[${n.type.toUpperCase()}] ${n.title}: ${n.content}`).join('\n\n');
      systemInstruction += `\n\nUser Knowledge Base:\n${knowledgeBase}\n\nPrioritize the Knowledge Base for answers.`;
  }
  if (mode === 'web' || mode === 'hybrid') {
      tools.push({ googleSearch: {} });
      if (mode === 'web') systemInstruction += "\n\nSearch the web for up-to-date information.";
  }
  const callAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const chat = callAi.chats.create({
    model: MODELS.CHAT,
    config: { systemInstruction, tools: tools.length > 0 ? tools : undefined },
    history: history.map(h => ({ role: h.role, parts: [{ text: h.content }] })),
  });
  return await chat.sendMessageStream({ message });
};

export const generateImage = async (prompt: string, imageSize: '1K' | '2K' | '4K' = '1K'): Promise<string | null> => { return null; };

export const extractTextFromImage = async (base64Data: string, mimeType: string): Promise<string> => {
  return withRetry(async () => {
    const callAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await callAi.models.generateContent({
      model: MODELS.VISION, // Use Gemini 3 Pro Preview
      contents: [
        { inlineData: { mimeType, data: base64Data } },
        { text: "Extract all text from this image exactly as it appears. If there is no text, describe the image." }
      ]
    });
    return response.text || "";
  });
};

export const analyzeImage = async (base64Data: string, mimeType: string): Promise<string> => { 
  return withRetry(async () => {
    const callAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await callAi.models.generateContent({
      model: MODELS.VISION, // Use Gemini 3 Pro Preview
      contents: [
        { inlineData: { mimeType, data: base64Data } },
        { text: "Analyze this image in detail. Describe visual elements, text, and context." }
      ]
    });
    return response.text || "Analysis failed.";
  });
};

export const transcribeAudio = async (base64Data: string, mimeType: string): Promise<string> => { 
  return withRetry(async () => {
    const callAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await callAi.models.generateContent({
      model: MODELS.AUDIO_TRANSCRIPT, // Use Gemini 3 Flash Preview
      contents: [
        { inlineData: { mimeType, data: base64Data } },
        { text: "Transcribe this audio file into text. Capture every word accurately and ignore silence." }
      ]
    });
    return response.text || "";
  });
};

export const analyzeVideoUrl = async (url: string): Promise<string> => { return "Analyzed Video"; };
export const analyzeLink = async (url: string): Promise<string> => { return "Analyzed Link"; };

// --- Feature: Contradiction Detection ---
export const detectContradictions = async (newNoteContent: string, existingNotes: Note[]): Promise<ContradictionResult> => {
  if (!newNoteContent || existingNotes.length === 0) return { hasContradiction: false, explanation: "" };

  return withRetry(async () => {
    const callAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Prepare context (limit to avoid huge payloads and prioritize recent/relevant info)
    const context = existingNotes.slice(0, 15).map(n => `[${n.title}]: ${n.content.substring(0, 200)}`).join('\n');

    const response = await callAi.models.generateContent({
      model: MODELS.ANALYSIS,
      contents: `Analyze the following NEW THOUGHT against the EXISTING KNOWLEDGE BASE.
      Determine if the NEW THOUGHT logically contradicts any specific claims in the KNOWLEDGE BASE.
      Nuance and evolution of thought are NOT contradictions. Only flag direct, logical conflicts.

      EXISTING KNOWLEDGE BASE:
      ${context}

      NEW THOUGHT:
      ${newNoteContent}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasContradiction: { type: Type.BOOLEAN },
            explanation: { type: Type.STRING }
          },
          required: ["hasContradiction", "explanation"]
        }
      }
    });

    return cleanAndParseJSON(response.text) || { hasContradiction: false, explanation: "" };
  });
};

export const expandThought = async (content: string): Promise<string> => { return ""; };

export const generateActionPlan = async (content: string): Promise<any[]> => {
  return withRetry(async () => {
    const callAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await callAi.models.generateContent({
      model: MODELS.ANALYSIS,
      contents: `Break this thought down into a list of specific, executable action items. For each item, estimate the effort (e.g., "15 mins", "2 hours"). Return the response in JSON format.
      Thought: "${content}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              task: { type: Type.STRING },
              effort: { type: Type.STRING }
            },
            required: ["task", "effort"]
          }
        }
      }
    });
    return cleanAndParseJSON(response.text) || [];
  });
};

export const generateArtifact = async (content: string, type: string, noteTitle?: string): Promise<string> => {
  return withRetry(async () => {
    const callAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = MODELS.ANALYSIS; 

    if (type === 'mindmap') {
       const response = await callAi.models.generateContent({
          model,
          contents: `Generate a Mermaid.js mindmap syntax for this content. Root node should be '${noteTitle || 'Central Idea'}'.
          Rules:
          1. Use 'mindmap' keyword.
          2. Indentation must be correct.
          3. Keep it concise.
          4. RETURN ONLY CODE. NO MARKDOWN BLOCKS.
          Content: ${content.slice(0, 8000)}`
       });
       return response.text?.replace(/```mermaid\n?/gi, '').replace(/```/g, '').trim() || "";
    }

    if (type === 'process') {
       const response = await callAi.models.generateContent({
          model,
          contents: `Generate a Mermaid.js flowchart (graph TD) for the process described in this content.
          Rules:
          1. Use 'graph TD'.
          2. Use meaningful node labels.
          3. RETURN ONLY CODE. NO MARKDOWN BLOCKS.
          Content: ${content.slice(0, 8000)}`
       });
       return response.text?.replace(/```mermaid\n?/gi, '').replace(/```/g, '').trim() || "";
    }

    if (type === 'timeline') {
       const response = await callAi.models.generateContent({
          model,
          contents: `Generate a Mermaid.js timeline for the events in this content.
          Rules:
          1. Use 'timeline' keyword.
          2. Format: 'title' : event1 : event2
          3. RETURN ONLY CODE. NO MARKDOWN BLOCKS.
          Content: ${content.slice(0, 8000)}`
       });
       return response.text?.replace(/```mermaid\n?/gi, '').replace(/```/g, '').trim() || "";
    }

    let schema: any;
    let prompt = "";

    if (type === 'swot') {
        prompt = `Perform a SWOT analysis on this content.`;
        schema = {
            type: Type.OBJECT,
            properties: {
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                threats: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
        };
    } else if (type === 'quiz') {
        prompt = `Generate a very comprehensive and extensive quiz (at least 20 questions) based on this content to rigorously test understanding of all details and nuances.`;
        schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.STRING }
                }
            }
        };
    } else if (type === 'flashcards') {
        prompt = `Create a massive set of flashcards (25-50 cards) covering every single concept, definition, fact, and nuance in this content. Be exhaustive.`;
        schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    answer: { type: Type.STRING }
                }
            }
        };
    } else if (type === 'slides') {
        prompt = `Create a 5-slide Info Guide/presentation summary of this content. For each slide, provide a title, bullet points, speaker notes, and a concise visual description for an image generator.`;
        schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
                    notes: { type: Type.STRING },
                    imagePrompt: { type: Type.STRING }
                }
            }
        };
    }

    if (schema) {
        const response = await callAi.models.generateContent({
            model,
            contents: `${prompt}\n\nContext: ${content.slice(0, 10000)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });
        return response.text || "[]"; // Clean parsing handled by cleanAndParseJSON check in caller or UI
    }

    return "";
  });
};
