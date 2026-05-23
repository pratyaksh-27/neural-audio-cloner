import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { 
  Play, Download, Trash2, 
  Loader2, CheckCircle, Sparkles, 
  Plus, Link, X, Layers, ChevronDown
} from 'lucide-react';
import { generateAudio, getPreviewUrl, exportProject } from '../api';
import { CustomSelect } from './CustomSelect';

const useAutosizeTextArea = (textAreaRef: HTMLTextAreaElement | null, value: string) => {
  useLayoutEffect(() => {
    if (textAreaRef) {
      textAreaRef.style.height = "0px";
      const scrollHeight = textAreaRef.scrollHeight;
      textAreaRef.style.height = scrollHeight + "px";
    }
  }, [textAreaRef, value]);
};

const BlockToolbar: React.FC<{ block: any }> = ({ block }) => {
  const { voices, updateBlockSettings } = useStore();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSpeed, setShowSpeed] = useState(false);

  return (
    <div className="block-header-strip" onClick={(e) => e.stopPropagation()}>
      {/* Group 1: Identity */}
      <div className="pill-group">
        <CustomSelect 
          options={voices} 
          value={block.voice} 
          onChange={(val) => updateBlockSettings(block.id, { voice: val })}
          className="toolbar-select"
        />
        <CustomSelect 
          options={[
            { label: 'General Narration', value: 'Default' },
            { label: 'Dark Cinematic', value: 'Dark Cinematic' },
            { label: 'Storyteller', value: 'Storyteller' },
            { label: 'Calm', value: 'Calm' },
            { label: 'Energetic', value: 'Energetic' },
            { label: 'Whisper', value: 'Whisper' }
          ]} 
          value={block.style} 
          onChange={(val) => updateBlockSettings(block.id, { style: val })}
          className="toolbar-select"
        />
      </div>

      <div className="divider-v" />

      {/* Group 2: Performance */}
      <div className="pill-group" style={{ position: 'relative' }}>
        <button className={`pill-btn ${showSpeed ? 'active' : ''}`} onClick={() => setShowSpeed(!showSpeed)}>
          <span className="pill-label">Speed</span>
          <span>{block.speed}x</span>
          <ChevronDown size={12} />
        </button>
        
        {showSpeed && (
          <div className="mastering-popover" style={{ width: '150px' }}>
             <input type="range" min="0.5" max="2.0" step="0.1" value={block.speed} onChange={(e) => updateBlockSettings(block.id, { speed: parseFloat(e.target.value) })} />
             <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.65rem', fontWeight: 900 }}>{block.speed}x</div>
             <button className="btn-v3" style={{ width: '100%', marginTop: '8px', padding: '4px' }} onClick={() => setShowSpeed(false)}>DONE</button>
          </div>
        )}

        <button className={`pill-btn ${showAdvanced ? 'active' : ''}`} onClick={() => setShowAdvanced(!showAdvanced)}>
          <Sparkles size={14} />
          <span>MASTERING</span>
          <ChevronDown size={12} />
        </button>

        {showAdvanced && (
          <div className="mastering-popover shadow-lift">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 900 }}>ADVANCED FX</span>
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setShowAdvanced(false)} />
            </div>
            <div className="control-group" style={{ marginBottom: '0.75rem' }}>
              <div className="control-label"><span>Clarity</span> <span>{block.clarity}x</span></div>
              <input type="range" min="1.0" max="1.5" step="0.1" value={block.clarity} onChange={(e) => updateBlockSettings(block.id, { clarity: parseFloat(e.target.value) })} />
            </div>
            <div className="control-group" style={{ marginBottom: '0.75rem' }}>
              <div className="control-label"><span>Deepness</span> <span>{block.deepness}x</span></div>
              <input type="range" min="0.8" max="1.2" step="0.05" value={block.deepness} onChange={(e) => updateBlockSettings(block.id, { deepness: parseFloat(e.target.value) })} />
            </div>
            <div className="control-group">
              <div className="control-label"><span>De-Esser</span> <span>{(block.sibilance * 100).toFixed(0)}%</span></div>
              <input type="range" min="0" max="1.0" step="0.05" value={block.sibilance} onChange={(e) => updateBlockSettings(block.id, { sibilance: parseFloat(e.target.value) })} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const VoiceBlockRow: React.FC<{ block: any, index: number, focused: boolean, onFocus: () => void }> = ({ block, index, focused, onFocus }) => {
  const { updateBlockText, mergeBlockWithNext, addBlock, removeBlock, setBlockStatus, setBlockAudio, blocks } = useStore();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  useAutosizeTextArea(textAreaRef.current, block.text);

  const handleGenerate = async () => {
    if (!block.voice) return;
    setBlockStatus(block.id, 'generating');
    try {
      const res = await generateAudio({ id: block.id, ref_voice: block.voice, gen_text: block.text, style: block.style, speed: block.speed, nfe_step: block.nfeStep, clarity: block.clarity, deepness: block.deepness, sibilance: block.sibilance });
      if (res.status === 'success') setBlockAudio(block.id, getPreviewUrl(res.path), res.path);
      else setBlockStatus(block.id, 'error');
    } catch { setBlockStatus(block.id, 'error'); }
  };

  return (
    <div className={`block-segment ${focused ? 'focused' : ''}`} onClick={(e) => { e.stopPropagation(); onFocus(); }}>
      {/* LEFT GUTTER */}
      <div className="side-actions-left" onClick={(e) => e.stopPropagation()}>
        <button className="btn-icon-side" title="Add New Block" onClick={() => addBlock('')}><Plus size={16} /></button>
        {index < blocks.length - 1 && (
          <button className="btn-icon-side" title="Merge with Next" onClick={() => mergeBlockWithNext(block.id)}><Link size={16} /></button>
        )}
      </div>

      <div className="block-main-content">
        <BlockToolbar block={block} />
        <div className="block-body">
          <textarea 
            ref={textAreaRef}
            className="block-textarea"
            value={block.text}
            onChange={(e) => updateBlockText(block.id, e.target.value)}
            onFocus={onFocus}
            placeholder="Script content..."
          />
          {block.audioUrl && <audio src={block.audioUrl} controls className="row-audio-mini" />}
        </div>
      </div>

      {/* RIGHT GUTTER */}
      <div className="side-actions-right" onClick={(e) => e.stopPropagation()}>
        <button 
          className={`btn-icon-side ${block.status !== 'completed' ? 'primary' : ''}`}
          onClick={handleGenerate}
          disabled={block.status === 'generating'}
          title="Generate Audio"
        >
          {block.status === 'generating' ? <Loader2 size={16} className="animate-spin" /> : <Play size={18} fill={block.status === 'completed' ? 'none' : 'currentColor'} />}
        </button>
        <button className="btn-icon-side danger" title="Delete Segment" onClick={() => removeBlock(block.id)}><X size={18} /></button>
      </div>
    </div>
  );
};

const BlockEditor: React.FC = () => {
  const { blocks, addBlock, clearAllBlocks, splitMode, setSplitMode, masterVoice, setMasterVoice, voices } = useStore();
  const [inputText, setInputText] = useState('');
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [focusedBlock, setFocusedBlock] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalClick = () => setFocusedBlock(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleImport = () => {
    if (!inputText.trim()) return;
    let parts = splitMode === 'paragraph' ? inputText.split(/\n\n+/) : (inputText.match(/[^.!?]+[.!?]+(?!\.\.)[\s\n]*/g) || [inputText]);
    parts.forEach(p => { if (p.trim()) addBlock(p.trim()); });
    setInputText('');
  };

  const handleGenerateAll = async () => {
    setIsGeneratingAll(true);
    for (const block of blocks) {
      if (block.status !== 'completed') {
        const res = await generateAudio({ id: block.id, ref_voice: block.voice, gen_text: block.text, style: block.style, speed: block.speed, nfe_step: block.nfeStep, clarity: block.clarity, deepness: block.deepness, sibilance: block.sibilance });
        if (res.status === 'success') useStore.getState().setBlockAudio(block.id, getPreviewUrl(res.path), res.path);
        else useStore.getState().setBlockStatus(block.id, 'error');
      }
    }
    setIsGeneratingAll(false);
  };

  const handleExport = async () => {
    const paths = blocks.map(b => b.serverPath).filter(p => p !== null) as string[];
    if (paths.length === 0) return;
    setIsExporting(true);
    try {
      const res = await exportProject(paths);
      if (res.status === 'success') {
        const link = document.createElement('a');
        link.href = getPreviewUrl(res.path);
        link.download = `Master_Final_${Date.now()}.wav`;
        link.click();
      }
    } catch { alert("Export failed"); }
    setIsExporting(false);
  };

  return (
    <div style={{ width: '100%' }}>
      <div className="studio-toolbar">
        <div className="segmented-control">
          <button className={splitMode === 'paragraph' ? 'active' : ''} onClick={(e) => { e.stopPropagation(); setSplitMode('paragraph'); }}>PARAGRAPHS</button>
          <button className={splitMode === 'sentence' ? 'active' : ''} onClick={(e) => { e.stopPropagation(); setSplitMode('sentence'); }}>SENTENCES</button>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-icon-side" style={{ opacity: 1, color: 'var(--text-dim)' }} onClick={(e) => { e.stopPropagation(); clearAllBlocks(); }} title="Clear Studio"><Trash2 size={18} /></button>
          <button className="btn-v3" onClick={(e) => { e.stopPropagation(); handleGenerateAll(); }} disabled={isGeneratingAll || blocks.length === 0}>
            {isGeneratingAll ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} GENERATE FULL PROJECT
          </button>
          <button className="btn-v3" style={{ background: 'var(--success)' }} onClick={(e) => { e.stopPropagation(); handleExport(); }} disabled={isExporting || blocks.filter(b => b.status === 'completed').length === 0}>
            <Download size={16} /> EXPORT AUDIO
          </button>
        </div>
      </div>

      {blocks.length === 0 && (
        <div className="block-segment focused" style={{ padding: '2rem' }} onClick={(e) => e.stopPropagation()}>
          <div className="block-main-content" style={{ border: 'none' }}>
            <textarea className="block-textarea" placeholder="Paste your script here..." value={inputText} onChange={(e) => setInputText(e.target.value)} style={{ minHeight: '150px' }} />
            <div className="block-actions-row" style={{ border: 'none' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                 <span style={{ fontSize: '0.65rem', fontWeight: 900 }}>DEFAULT VOICE:</span>
                 <CustomSelect options={voices} value={masterVoice} onChange={setMasterVoice} className="toolbar-select" />
               </div>
               <button className="btn-v3" onClick={handleImport}><Plus size={16} /> IMPORT TO TIMELINE</button>
            </div>
          </div>
        </div>
      )}

      <div className="block-editor-v3">
        {blocks.map((block, index) => (
          <VoiceBlockRow key={block.id} block={block} index={index} focused={focusedBlock === block.id} onFocus={() => setFocusedBlock(block.id)} />
        ))}
      </div>

      {blocks.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <button className="btn-v3" style={{ background: 'white', color: 'var(--accent)', border: '1px solid var(--accent)', margin: '0 auto' }} onClick={() => addBlock('')}>
            <Plus size={16} /> ADD NEW PARAGRAPH
          </button>
        </div>
      )}
    </div>
  );
};

export default BlockEditor;
