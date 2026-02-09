
// Secrets must be provided via environment variables for security.
// Do not commit hardcoded keys to version control.

// Using provided credentials as defaults
export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tcsbxzbpriqstjyluaqg.supabase.co';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjc2J4emJwcmlxc3RqeWx1YXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTQ2NDUsImV4cCI6MjA4NjEzMDY0NX0.2SUyeew9LF1CFIO83z9FPrTxBQFexa0jzCw6n5JET_I';

// The API key must be obtained exclusively from the environment variable process.env.API_KEY
// User explicitly requested to use this key for fixes.
export const GEMINI_API_KEY = process.env.API_KEY || 'AIzaSyAV7jn8VhjsUvwfMI0uWfSNXSmVbEcYoi4';

export const MODELS = {
  ANALYSIS: 'gemini-3-flash-preview',
  CHAT: 'gemini-3-flash-preview', 
  EXPANSION: 'gemini-3-flash-preview',
  VISION: 'gemini-3-pro-preview', 
  IMAGE_GEN: 'gemini-3-pro-image-preview', 
  AUDIO_TRANSCRIPT: 'gemini-3-flash-preview', 
  THINKING: 'gemini-3-pro-preview', 
  TTS: 'gemini-2.5-flash-preview-tts', 
  LIVE: 'gemini-2.5-flash-native-audio-preview-12-2025'
};
