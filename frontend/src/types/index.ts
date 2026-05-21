export interface VoiceBlock {
  id: string;
  text: string;
  audioUrl: string | null;
  serverPath: string | null; // NEW: The absolute path on the backend
  status: 'idle' | 'queued' | 'generating' | 'completed' | 'error';
  error?: string;
}

export interface ProjectState {
  blocks: VoiceBlock[];
  selectedVoice: string;
  speed: number;
  nfeStep: number;
  style: string;
  clarity: number;
  deepness: number;
  sibilance: number;
}

export interface LiveStatus {
  stage: string;
  detail?: string;
  progress?: number;
}
