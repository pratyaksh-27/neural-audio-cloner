import React from 'react';
import { useStore } from '../store/useStore';

const GoldenTouchPanel: React.FC = () => {
  const { 
    voices, selectedVoice, setSelectedVoice,
    style, setStyle,
    deepness, setDeepness,
    clarity, setClarity,
    speed, setSpeed,
    nfeStep, setNfeStep
  } = useStore();

  return (
    <div className="bento-card col-4">
      <h3 style={{ marginBottom: '2rem' }}>Golden Touch</h3>
      
      <div className="control-group">
        <label className="control-label">Voice</label>
        <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)}>
          <option value="">-- Select Voice --</option>
          {voices.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      <div className="control-group">
        <label className="control-label">Mood / Style</label>
        <select value={style} onChange={(e) => setStyle(e.target.value)}>
          <option value="Default">Default</option>
          <option value="Narration">Professional Narration</option>
          <option value="Dark Cinematic">Dark Cinematic</option>
          <option value="Storyteller">Storyteller</option>
          <option value="Calm">Calm & Peaceful</option>
          <option value="Energetic">Energetic & Upbeat</option>
          <option value="Whisper">Whisper</option>
        </select>
      </div>

      <div className="control-group">
        <label className="control-label">Voice Deepness <span>{deepness.toFixed(1)}x</span></label>
        <input type="range" min="0.8" max="1.2" step="0.05" value={deepness} onChange={(e) => setDeepness(parseFloat(e.target.value))} />
      </div>

      <div className="control-group">
        <label className="control-label">Vocal Clarity <span>{clarity.toFixed(1)}x</span></label>
        <input type="range" min="1.0" max="1.5" step="0.1" value={clarity} onChange={(e) => setClarity(parseFloat(e.target.value))} />
      </div>

      <div className="control-group">
        <label className="control-label">Sibilance Reduction <span>{(sibilance * 100).toFixed(0)}%</span></label>
        <input type="range" min="0" max="1.0" step="0.05" value={sibilance} onChange={(e) => setSibilance(parseFloat(e.target.value))} />
      </div>

      <div className="control-group">
        <label className="control-label">Speech Speed <span>{speed.toFixed(1)}x</span></label>
        <input type="range" min="0.5" max="2.0" step="0.1" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} />
      </div>

      <div className="control-group">
        <label className="control-label">Quality (NFE) <span>{nfeStep}</span></label>
        <input type="range" min="16" max="128" step="16" value={nfeStep} onChange={(e) => setNfeStep(parseInt(e.target.value))} />
      </div>
    </div>
  );
};

export default GoldenTouchPanel;
