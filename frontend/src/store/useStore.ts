import { create } from 'zustand';
import type { VoiceBlock, ProjectState } from '../types';

interface AppState extends ProjectState {
  activeTab: 'clone' | 'studio';
  voices: string[];
  isGenerating: boolean;
  generatedAudioUrl: string | null;
  
  // Actions
  setActiveTab: (tab: 'clone' | 'studio') => void;
  setVoices: (voices: string[]) => void;
  setSplitMode: (mode: 'sentence' | 'paragraph') => void;
  
  // Master Template Actions
  setMasterVoice: (voice: string) => void;
  setMasterStyle: (style: string) => void;
  setMasterSpeed: (speed: number) => void;
  setMasterNfeStep: (step: number) => void;
  setMasterClarity: (clarity: number) => void;
  setMasterDeepness: (deepness: number) => void;
  setMasterSibilance: (sibilance: number) => void;
  
  // Block Actions
  addBlock: (text: string) => void;
  updateBlockText: (id: string, text: string) => void;
  updateBlockSettings: (id: string, settings: Partial<Pick<VoiceBlock, 'voice' | 'style' | 'speed' | 'nfeStep' | 'clarity' | 'deepness' | 'sibilance'>>) => void;
  removeBlock: (id: string) => void;
  mergeBlockWithNext: (id: string) => void;
  clearAllBlocks: () => void;
  setBlockStatus: (id: string, status: VoiceBlock['status']) => void;
  setBlockAudio: (id: string, audioUrl: string, serverPath: string) => void;
  reorderBlocks: (startIndex: number, endIndex: number) => void;
}

export const useStore = create<AppState>((set) => ({
  activeTab: 'studio',
  voices: [],
  blocks: [],
  splitMode: 'paragraph',
  
  // Master Defaults
  masterVoice: '',
  masterStyle: 'Default',
  masterSpeed: 1.0,
  masterNfeStep: 32,
  masterClarity: 1.0,
  masterDeepness: 1.0,
  masterSibilance: 0.5,
  
  isGenerating: false,
  generatedAudioUrl: null,

  setActiveTab: (activeTab) => set({ activeTab }),
  setVoices: (voices) => set({ voices }),
  setSplitMode: (splitMode) => set({ splitMode }),

  setMasterVoice: (masterVoice) => set({ masterVoice }),
  setMasterStyle: (masterStyle) => set({ masterStyle }),
  setMasterSpeed: (masterSpeed) => set({ masterSpeed }),
  setMasterNfeStep: (masterNfeStep) => set({ masterNfeStep }),
  setMasterClarity: (masterClarity) => set({ masterClarity }),
  setMasterDeepness: (masterDeepness) => set({ masterDeepness }),
  setMasterSibilance: (masterSibilance) => set({ masterSibilance }),

  addBlock: (text) => set((state) => ({
    blocks: [...state.blocks, {
      id: Math.random().toString(36).substr(2, 9),
      text,
      audioUrl: null,
      serverPath: null,
      status: 'idle',
      // Inherit from master template
      voice: state.masterVoice || (state.voices[0] || ''),
      style: state.masterStyle,
      speed: state.masterSpeed,
      nfeStep: state.masterNfeStep,
      clarity: state.masterClarity,
      deepness: state.masterDeepness,
      sibilance: state.masterSibilance
    }]
  })),

  updateBlockText: (id, text) => set((state) => ({
    blocks: state.blocks.map(b => b.id === id ? { ...b, text, audioUrl: null, serverPath: null, status: 'idle' } : b)
  })),

  updateBlockSettings: (id, settings) => set((state) => ({
    blocks: state.blocks.map(b => b.id === id ? { ...b, ...settings, audioUrl: null, serverPath: null, status: 'idle' } : b)
  })),

  removeBlock: (id) => set((state) => ({
    blocks: state.blocks.filter(b => b.id !== id)
  })),

  mergeBlockWithNext: (id) => set((state) => {
    const idx = state.blocks.findIndex(b => b.id === id);
    if (idx === -1 || idx === state.blocks.length - 1) return state;
    
    const current = state.blocks[idx];
    const next = state.blocks[idx + 1];
    
    const mergedBlock = {
      ...current,
      text: (current.text + "\n" + next.text).trim(),
      audioUrl: null,
      serverPath: null,
      status: 'idle'
    };
    
    const newBlocks = [...state.blocks];
    newBlocks.splice(idx, 2, mergedBlock);
    return { blocks: newBlocks };
  }),

  clearAllBlocks: () => set({ blocks: [] }),

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
