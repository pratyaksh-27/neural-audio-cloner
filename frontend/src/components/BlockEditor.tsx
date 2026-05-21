import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { 
  Layers, Play, Loader2, Download, 
  Trash2, ChevronUp, ChevronDown, 
  Scissors, Type, Wand2, CheckCircle, Save,
  RefreshCcw
} from 'lucide-react';
import { generateAudio, getPreviewUrl, exportProject } from '../api';

const BlockEditor: React.FC = () => {
  const { 
    blocks, addBlock, updateBlockText, removeBlock, reorderBlocks,
    selectedVoice, speed, nfeStep, style, clarity, deepness, sibilance,
    setBlockStatus, setBlockAudio
  } = useStore();

  const [importText, setImportText] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [finalAudioUrl, setFinalAudioUrl] = useState<string | null>(null);

  // PROJECT PERSISTENCE (Bonus Feature)
  useEffect(() => {
    const saved = localStorage.getItem('nac_project_blocks');
    if (saved && blocks.length === 0) {
      try {
        const parsed = JSON.parse(saved);
        parsed.forEach((b: any) => {
          // Re-add to store
          useStore.getState().addBlock(b.text);
          const newId = useStore.getState().blocks.slice(-1)[0].id;
          if (b.audioUrl && b.serverPath) {
             useStore.getState().setBlockAudio(newId, b.audioUrl, b.serverPath);
          }
        });
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (blocks.length > 0) {
      localStorage.setItem('nac_project_blocks', JSON.stringify(blocks));
    }
  }, [blocks]);

  const handleImport = () => {
    if (!importText.trim()) return;
    const chunks = importText.split(/\n\n|\.\s/).filter(t => t.trim().length > 0);
    chunks.forEach(chunk => {
       const text = chunk.trim();
       addBlock(text.endsWith('.') ? text : text + ".");
    });
    setImportText('');
  };

  const handleGenerateBlock = async (id: string, text: string) => {
    if (!selectedVoice || !text) return;
    setBlockStatus(id, 'generating');
    try {
      const data = await generateAudio(selectedVoice, text, speed, nfeStep, style, clarity, deepness, sibilance);
      if (data.status === 'success') {
        const url = getPreviewUrl(data.path);
        setBlockAudio(id, url, data.path);
      }
    } catch (err) {
      setBlockStatus(id, 'error');
    }
  };

  const generateAllEmpty = async () => {
    const emptyBlocks = blocks.filter(b => b.status === 'idle' || b.status === 'error');
    for (const b of emptyBlocks) {
      await handleGenerateBlock(b.id, b.text);
    }
  };

  const handleExport = async () => {
    const paths = blocks.map(b => b.serverPath).filter(p => p !== null) as string[];
    if (paths.length === 0) return;
    
    setIsExporting(true);
    setFinalAudioUrl(null);
    try {
      const data = await exportProject(paths);
      if (data.status === 'success') {
        setFinalAudioUrl(getPreviewUrl(data.path));
      }
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  const clearProject = () => {
    if (!window.confirm("Clear all blocks and start fresh?")) return;
    localStorage.removeItem('nac_project_blocks');
    window.location.reload(); // Quickest way to reset store
  };

  return (
    <div className="col-8" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. SCRIPT IMPORT TOOL */}
      <div className="bento-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
           <h4 className="control-label">Import Script</h4>
           <button onClick={clearProject} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <RefreshCcw size={12} /> CLEAR PROJECT
           </button>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <textarea 
            className="studio-editor"
            style={{ flex: 1, minHeight: '80px', marginBottom: 0 }}
            placeholder="Paste your full script here to split into blocks..."
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <button className="btn-primary" style={{ width: 'auto', padding: '1.25rem 2rem' }} onClick={handleImport}>
            <Scissors size={18} /> Split Blocks
          </button>
        </div>
      </div>

      {/* 2. THE TIMELINE (BLOCKS) */}
      <div className="timeline-container">
        {blocks.map((block, index) => (
          <div key={block.id} className={`bento-card timeline-block ${block.status === 'completed' ? 'active' : ''}`} style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: 0.4 }}>
                <button className="trash-btn" style={{ opacity: 1, padding: 0 }} onClick={() => reorderBlocks(index, index - 1)} disabled={index === 0}><ChevronUp size={16} /></button>
                <button className="trash-btn" style={{ opacity: 1, padding: 0 }} onClick={() => reorderBlocks(index, index + 1)} disabled={index === blocks.length - 1}><ChevronDown size={16} /></button>
              </div>
              
              <div style={{ flex: 1 }}>
                <textarea 
                  value={block.text}
                  onChange={(e) => updateBlockText(block.id, e.target.value)}
                  rows={Math.max(1, block.text.split('\n').length)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {block.audioUrl && (
                  <audio src={block.audioUrl} style={{ height: '30px', width: '140px' }} controls />
                )}
                
                <button 
                  className="btn-primary" 
                  style={{ width: '110px', padding: '0.6rem', fontSize: '0.8rem', background: block.status === 'completed' ? 'var(--bg-deep)' : 'var(--accent)', border: block.status === 'completed' ? '1px solid var(--border)' : 'none' }}
                  onClick={() => handleGenerateBlock(block.id, block.text)}
                  disabled={block.status === 'generating' || !selectedVoice}
                >
                  {block.status === 'generating' ? <Loader2 size={14} className="spinner" /> : 
                   block.status === 'completed' ? <CheckCircle size={14} color="#10b981" /> : <Wand2 size={14} />}
                  <span style={{ marginLeft: '4px' }}>
                    {block.status === 'generating' ? 'Wait' : block.status === 'completed' ? 'Redo' : 'Generate'}
                  </span>
                </button>

                <button className="trash-btn" style={{ opacity: 0.6 }} onClick={() => removeBlock(block.id)}><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. GLOBAL ACTIONS */}
      {blocks.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button className="btn-primary" style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={generateAllEmpty}>
            Generate All Missing Blocks
          </button>
          <button className="btn-primary" style={{ flex: 1.5, background: '#10b981' }} onClick={handleExport} disabled={isExporting || blocks.some(b => !b.audioUrl)}>
            {isExporting ? <Loader2 size={18} className="spinner" /> : <><Save size={18} /> Export Master Project</>}
          </button>
        </div>
      )}

      {finalAudioUrl && (
        <div className="bento-card" style={{ border: '2px solid #10b981', marginTop: '1.5rem', background: 'rgba(16, 185, 129, 0.05)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle color="#10b981" size={24} />
                <h3 style={{ margin: 0 }}>Project Mastered!</h3>
              </div>
              <a href={finalAudioUrl} download="master_export.wav" style={{ color: '#10b981', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                <Download size={18} /> DOWNLOAD WAV
              </a>
            </div>
            <audio controls src={finalAudioUrl} style={{ width: '100%', marginTop: '1.5rem' }} />
        </div>
      )}

      {blocks.length === 0 && (
        <div style={{ padding: '4rem', textAlign: 'center', opacity: 0.3 }}>
          <Type size={48} style={{ marginBottom: '1rem' }} />
          <h3>Timeline Empty</h3>
          <p>Paste a script above to begin your professional project.</p>
        </div>
      )}
    </div>
  );
};

export default BlockEditor;
