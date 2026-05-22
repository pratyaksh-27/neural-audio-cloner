import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { 
  Type, Scissors, PlayCircle, Download, 
  Trash2, RefreshCcw, Loader2, CheckCircle,
  Sparkles, Info, Plus, Link, ChevronDown,
  MoreVertical, Wand2, X
} from 'lucide-react';
import { generateAudio, getPreviewUrl, exportProject } from '../api';

// --- Sub-Component: Floating Toolbar ---
const BlockToolbar: React.FC<{ block: any }> = ({ block }) => {
  const { voices, updateBlockSettings, removeBlock } = useStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="block-toolbar">
      {/* Voice Select */}
      <div className="toolbar-item">
        <select 
          value={block.voice} 
          onChange={(e) => updateBlockSettings(block.id, { voice: e.target.value })}
          style={{ background: 'transparent', border: 'none', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', cursor: 'pointer', outline: 'none' }}
        >
          {voices.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      {/* Style Select */}
      <div className="toolbar-item">
        <select 
          value={block.style} 
          onChange={(e) => updateBlockSettings(block.id, { style: e.target.value })}
          style={{ background: 'transparent', border: 'none', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', cursor: 'pointer', outline: 'none' }}
        >
          {['Default', 'Narration', 'Dark Cinematic', 'Storyteller', 'Calm', 'Energetic', 'Whisper'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Speed Slider Mini */}
      <div className="toolbar-item" style={{ gap: '0.25rem' }}>
        <span>{block.speed}x</span>
        <input 
          type="range" min="0.5" max="2.0" step="0.1" 
          value={block.speed} 
          onChange={(e) => updateBlockSettings(block.id, { speed: parseFloat(e.target.value) })}
          style={{ width: '60px', accentColor: 'var(--accent)' }}
        />
      </div>

      <div className="toolbar-item" onClick={() => setShowAdvanced(!showAdvanced)} style={{ color: showAdvanced ? 'var(--accent)' : '' }}>
        <Sparkles size={14} /> Golden Touch
      </div>

      <div className="toolbar-item op-delete" onClick={() => removeBlock(block.id)}>
        <Trash2 size={14} />
      </div>

      {showAdvanced && (
        <div className="mastering-popover">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.8rem', textTransform: 'uppercase' }}>Advanced Mastering</h4>
            <X size={14} style={{ cursor: 'pointer' }} onClick={() => setShowAdvanced(false)} />
          </div>
          
          {/* Clarity */}
          <div className="control-group">
            <div className="control-label">
              <span>Clarity <Info size={12} className="info-icon tooltip" data-tip="Boosts high-frequency presence" /></span>
              <span>{block.clarity}x</span>
            </div>
            <input type="range" min="1.0" max="1.5" step="0.1" value={block.clarity} onChange={(e) => updateBlockSettings(block.id, { clarity: parseFloat(e.target.value) })} />
          </div>

          {/* Deepness */}
          <div className="control-group">
            <div className="control-label">
              <span>Deepness <Info size={12} className="info-icon tooltip" data-tip="Adds resonance to lower frequencies" /></span>
              <span>{block.deepness}x</span>
            </div>
            <input type="range" min="0.8" max="1.2" step="0.05" value={block.deepness} onChange={(e) => updateBlockSettings(block.id, { deepness: parseFloat(e.target.value) })} />
          </div>

          {/* Sibilance */}
          <div className="control-group">
            <div className="control-label">
              <span>De-Esser <Info size={12} className="info-icon tooltip" data-tip="Reduces harsh 'S' sounds" /></span>
              <span>{(block.sibilance * 100).toFixed(0)}%</span>
            </div>
            <input type="range" min="0" max="1.0" step="0.05" value={block.sibilance} onChange={(e) => updateBlockSettings(block.id, { sibilance: parseFloat(e.target.value) })} />
          </div>

          {/* NFE */}
          <div className="control-group">
            <div className="control-label">
              <span>Quality (NFE)</span>
              <span>{block.nfeStep}</span>
            </div>
            <input type="range" min="16" max="128" step="16" value={block.nfeStep} onChange={(e) => updateBlockSettings(block.id, { nfeStep: parseInt(e.target.value) })} />
          </div>
        </div>
      )}
    </div>
  );
};

const BlockEditor: React.FC = () => {
  const { 
    blocks, addBlock, updateBlockText, mergeBlockWithNext, clearAllBlocks,
    splitMode, setSplitMode, masterVoice, setMasterVoice,
    setBlockStatus, setBlockAudio, voices
  } = useStore();

  const [inputText, setInputText] = useState('');
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleImport = () => {
    if (!inputText.trim()) return;
    
    let parts: string[] = [];
    if (splitMode === 'paragraph') {
      parts = inputText.split(/\n\n+/);
    } else {
      // Protect "..." using negative lookahead
      parts = inputText.match(/[^.!?]+[.!?]+(?!\.\.)[\s\n]*/g) || [inputText];
    }

    parts.forEach(p => {
      const clean = p.trim();
      if (clean) addBlock(clean);
    });
    setInputText('');
  };

  const handleGenerateBlock = async (id: string) => {
    const block = useStore.getState().blocks.find(b => b.id === id);
    if (!block) return;
    if (!block.voice) { alert("Please select a voice first"); return; }

    setBlockStatus(id, 'generating');
    try {
      const res = await generateAudio({
        id,
        ref_voice: block.voice,
        gen_text: block.text,
        style: block.style,
        speed: block.speed,
        nfe_step: block.nfeStep,
        clarity: block.clarity,
        deepness: block.deepness,
        sibilance: block.sibilance
      });

      if (res.status === 'success') {
        setBlockAudio(id, getPreviewUrl(res.path), res.path);
      } else {
        setBlockStatus(id, 'error');
      }
    } catch {
      setBlockStatus(id, 'error');
    }
  };

  const handleGenerateAll = async () => {
    setIsGeneratingAll(true);
    for (const block of blocks) {
      if (block.status !== 'completed') {
        await handleGenerateBlock(block.id);
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
        link.download = `Studio_Export_${Date.now()}.wav`;
        link.click();
      }
    } catch {
      alert("Export failed");
    }
    setIsExporting(false);
  };

  return (
    <div className="infinite-canvas">
      {/* 1. Header Toolbar */}
      <div className="editor-header" style={{ position: 'sticky', top: 0, background: 'white', padding: '1rem 0', z-index: 200, marginBottom: '2rem', borderBottom: '1px solid var(--border-light)' }}>
        <div className="header-left">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Studio Workspace</h2>
          <div className="split-toggle">
            <button className={splitMode === 'paragraph' ? 'active' : ''} onClick={() => setSplitMode('paragraph')}>Paragraphs</button>
            <button className={splitMode === 'sentence' ? 'active' : ''} onClick={() => setSplitMode('sentence')}>Sentences</button>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn-v3-outline" onClick={clearAllBlocks} title="Clear Canvas"><Trash2 size={16} /></button>
          <button className="btn-v3" onClick={handleGenerateAll} disabled={isGeneratingAll || blocks.length === 0}>
            {isGeneratingAll ? <Loader2 className="animate-spin" size={18} /> : <PlayCircle size={18} />}
            Generate All
          </button>
          <button className="btn-v3" style={{ background: 'var(--success)' }} onClick={handleExport} disabled={isExporting || blocks.filter(b => b.status === 'completed').length === 0}>
            <Download size={18} /> Export
          </button>
        </div>
      </div>

      {/* 2. Paste Tray (Integrated) */}
      {blocks.length === 0 && (
        <div className="paste-tray">
          <textarea 
            placeholder="Paste your script here... v3.0 will intelligently split and preserve your pauses ('...')."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <div className="tray-controls">
            <div className="tray-left">
              <div className="toolbar-item">
                <span>Default Voice:</span>
                <select value={masterVoice} onChange={(e) => setMasterVoice(e.target.value)} style={{ padding: '4px', borderRadius: '6px', border: '1px solid var(--border-strong)', outline: 'none' }}>
                  <option value="">-- Auto --</option>
                  {voices.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <button className="btn-v3" onClick={handleImport}>
              <Sparkles size={18} /> Import to Canvas
            </button>
          </div>
        </div>
      )}

      {/* 3. The Canvas Workspace */}
      <div className="block-editor-v3">
        {blocks.map((block, index) => (
          <div key={block.id} className="block-segment">
            {/* Gutter Tools */}
            <div className="gutter-trigger" style={{ top: '1.5rem' }}>
              <Plus size={16} title="Add block here" />
            </div>

            <BlockToolbar block={block} />

            <textarea 
              className="block-textarea"
              value={block.text}
              onChange={(e) => updateBlockText(block.id, e.target.value)}
              rows={1}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
              placeholder="Type or paste content..."
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
              {block.audioUrl && <audio src={block.audioUrl} controls className="row-audio-mini" />}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {block.status === 'generating' && <Loader2 size={16} className="animate-spin text-accent" />}
                {block.status === 'completed' && <CheckCircle size={16} className="text-green" />}
                {block.status === 'error' && <RefreshCcw size={16} className="text-red" onClick={() => handleGenerateBlock(block.id)} style={{ cursor: 'pointer' }} />}
                
                <button 
                  onClick={() => handleGenerateBlock(block.id)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }}
                  title="Generate this segment"
                >
                  <Wand2 size={16} />
                </button>
              </div>
            </div>

            {/* Merge Gutter */}
            {index < blocks.length - 1 && (
              <div 
                className="gutter-trigger" 
                style={{ bottom: '-15px', height: '1px', width: '100px', background: 'var(--border-light)', left: '50%', transform: 'translateX(-50%)', opacity: 0.3 }}
                onClick={() => mergeBlockWithNext(block.id)}
                title="Merge segments"
              >
                <Link size={12} />
              </div>
            )}
          </div>
        ))}
      </div>

      {blocks.length > 0 && (
        <div style={{ marginTop: '4rem', textAlign: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '2rem' }}>
           <button className="btn-v3-outline" onClick={() => addBlock('')} style={{ margin: '0 auto' }}>
             <Plus size={16} /> Add Paragraph
           </button>
        </div>
      )}
    </div>
  );
};

export default BlockEditor;
