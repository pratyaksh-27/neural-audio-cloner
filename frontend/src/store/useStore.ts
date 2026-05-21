import { create } from 'zustand';
import { VoiceBlock, ProjectState } from '../types';

interface AppState extends ProjectState {
  activeTab: 'clone' | 'studio';
  voices: string[];
  isGenerating: boolean;
  generatedAudioUrl: string | null;
  
  // Actions
  setActiveTab: (tab: 'clone' | 'studio') => void;
  setVoices: (voices: string[]) => void;
  setSelectedVoice: (voice: string) => void;
  setSpeed: (speed: number) => void;
  setNfeStep: (step: number) => void;
  setStyle: (style: string) => void;
  setClarity: (clarity: number) => void;
  setDeepness: (deepness: number) => void;
  setSibilance: (sibilance: number) => void;
  
  // Block Actions
  addBlock: (text: string) => void;
  updateBlockText: (id: string, text: string) => void;
  removeBlock: (id: string) => void;
  setBlockStatus: (id: string, status: VoiceBlock['status']) => void;
  setBlockAudio: (id: string, url: string, serverPath: string) => void; // UPDATED
  reorderBlocks: (startIndex: number, endIndex: number) => void;
}

export const useStore = create<AppState>((set) => ({
  activeTab: 'studio',
  voices: [],
  blocks: [],
  selectedVoice: '',
  speed: 1.0,
  nfeStep: 32,
  style: 'Default',
  clarity: 1.0,
  deepness: 1.0,
  sibilance: 0.5,
  isGenerating: false,
  generatedAudioUrl: null,

  setActiveTab: (activeTab) => set({ activeTab }),
  setVoices: (voices) => set({ voices }),
  setSelectedVoice: (selectedVoice) => set({ selectedVoice }),
  setSpeed: (speed) => set({ speed }),
  setNfeStep: (nfeStep) => set({ nfeStep }),
  setStyle: (style) => set({ style }),
  setClarity: (clarity) => set({ clarity }),
  setDeepness: (deepness) => set({ deepness }),
  setSibilance: (sibilance) => set({ sibilance }),

  addBlock: (text) => set((state) => ({
    blocks: [...state.blocks, {
      id: Math.random().toString(36).substr(2, 9),
      text,
      audioUrl: null,
      serverPath: null,
      status: 'idle'
    }]
  })),

  updateBlockText: (id, text) => set((state) => ({
    blocks: state.blocks.map(b => b.id === id ? { ...b, text, audioUrl: null, serverPath: null, status: 'idle' } : b)
  })),

  removeBlock: (id) => set((state) => ({
    blocks: state.blocks.filter(b => b.id !== id)
  })),

  setBlockStatus: (id, status) => set((state) => ({
    blocks: state.blocks.map(b => b.id === id ? { ...b, status } : b)
  })),

  setBlockAudio: (id, audioUrl, serverPath) => set((state) => ({
    blocks: state.blocks.map(b => b.id === id ? { ...b, audioUrl, serverPath, status: 'completed' } : b)
  })),

  reorderBlocks: (startIndex, endIndex) => set((state) => {
    const result = Array.from(state.blocks);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return { blocks: result };
  })
}));
