export interface VoiceBlock {
  id: string;
  text: string;
  audioUrl: string | null;
  serverPath: string | null;
  status: 'idle' | 'queued' | 'generating' | 'completed' | 'error';
  error?: string;
  
  // v3.0 Per-Block Settings
  voice: string;
  style: string;
  speed: number;
  nfeStep: number;
  clarity: number;
  deepness: number;
  sibilance: number;
}

export interface ProjectState {
  blocks: VoiceBlock[];
  splitMode: 'sentence' | 'paragraph';
  
  // v3.0 Master Template (Default settings for new blocks)
  masterVoice: string;
  masterStyle: string;
  masterSpeed: number;
  masterNfeStep: number;
  masterClarity: number;
  masterDeepness: number;
  masterSibilance: number;
}

export interface LiveStatus {
  stage: string;
  detail?: string;
  progress?: number;
}
