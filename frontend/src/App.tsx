import { useState, useEffect, useRef } from 'react';
import './App.css';
import { uploadVoice, confirmVoice, listVoices, generateAudio, getPreviewUrl, deleteVoice, getStatus, getVersion } from './api';
import { 
  Mic, Play, Square, Save, Music, 
  CheckCircle, AlertCircle, Edit3, Clock, Wand2, 
  Activity, Layers, Trash2, FileAudio, Loader2, Download
} from 'lucide-react';

// --- NEW: Enterprise UI Logger ---
const appLog = (level: 'INFO' | 'WARN' | 'ERROR', msg: string, data?: any) => {
  const ts = new Date().toISOString();
  const color = level === 'ERROR' ? 'red' : level === 'WARN' ? 'orange' : '#6366f1';
  console.log(`%c[${ts}] [${level}] [NAC_UI] ${msg}`, `color: ${color}; font-weight: bold;`, data || '');
};

function App() {
  const [activeTab, setActiveTab] = useState<'clone' | 'studio'>('studio');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<any>(null);
  const [cleanedAudioPath, setCleanedAudioPath] = useState<string | null>(null);
  const [studioMark, setStudioMark] = useState<any>(null);
  const [refText, setRefText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'info' | 'success' | 'error', msg: string } | null>(null);
  const [liveStatus, setLiveStatus] = useState<any>({ stage: "Idle" });
  const [appVersion, setAppVersion] = useState<string>('v1.0.0');
  
  const [voiceName, setVoiceName] = useState('');
  const [voices, setVoices] = useState<string[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [script, setScript] = useState('');
  const [speed, setSpeed] = useState(1.0);
  const [nfeStep, setNfeStep] = useState(32);
  const [selectedStyle, setSelectedVoiceStyle] = useState('Default');
  const [clarity, setClarity] = useState(1.0);
  const [deepness, setDeepness] = useState(1.0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => { 
    appLog('INFO', 'Application Booting...');
    fetchVoices(); 

    // Fetch Version from API
    getVersion().then(v => setAppVersion(v.version)).catch(() => {});

    const interval = setInterval(async () => {
      try {
        const s = await getStatus();
        if (s.stage !== liveStatus.stage) {
           appLog('INFO', `Worker Stage Transition: ${s.stage}`);
        }
        setLiveStatus(s);
      } catch (err) {
        appLog('WARN', 'Worker Status Polling failed (is backend down?)');
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [liveStatus.stage]);

  const fetchVoices = async () => {
    try {
      const v = await listVoices();
      setVoices(v);
      if (v.length > 0 && !selectedVoice) setSelectedVoice(v[0]);
    } catch (err) { appLog('ERROR', 'Failed to fetch voice library', err); }
  };

  const handleDeleteVoice = async (name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await deleteVoice(name);
      appLog('WARN', `Deleted voice: ${name}`);
      fetchVoices();
      setStatus({ type: 'success', msg: `Deleted ${name}` });
    } catch (err) { setStatus({ type: 'error', msg: 'Delete failed' }); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => { 
        setAudioBlob(new Blob(audioChunksRef.current, { type: 'audio/wav' })); 
        appLog('INFO', 'Mic Recording Capture Complete');
      };
      recorder.start();
      setIsRecording(true);
      setSelectedFileName("Live Recording");
    } catch (err) { 
      appLog('ERROR', 'Microphone Access Denied', err);
      setStatus({ type: 'error', msg: 'Mic access denied' }); 
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioBlob(e.target.files[0]);
      setSelectedFileName(e.target.files[0].name);
      appLog('INFO', `File Selected: ${e.target.files[0].name}`);
    }
  };

  const handleUploadAndClean = async () => {
    if (!audioBlob) return;
    setIsCleaning(true);
    appLog('INFO', 'Initiating Audio Clean & Verify Task');
    try {
      const file = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
      const data = await uploadVoice(file);
      setCleanedAudioPath(data.temp_path);
      setStudioMark(data.studio_mark);
      setRefText(data.transcription || '');
      setAudioBlob(null);
      setSelectedFileName(null);
      appLog('INFO', 'Verification Result Received', data.studio_mark);
    } catch (err) { 
      appLog('ERROR', 'Process failed during verification', err);
      setStatus({ type: 'error', msg: 'Process failed' }); 
    }
    finally { setIsCleaning(false); }
  };

  const handleConfirm = async () => {
    if (!voiceName || !cleanedAudioPath || isSaving) return;
    setIsSaving(true);
    appLog('INFO', `Saving Voice Identity: ${voiceName}`);
    try {
      await confirmVoice(voiceName, cleanedAudioPath, refText);
      setStatus({ type: 'success', msg: `Saved ${voiceName}` });
      setVoiceName('');
      setCleanedAudioPath(null);
      setStudioMark(null);
      setRefText('');
      fetchVoices();
    } catch (err) { 
      appLog('ERROR', 'Save Operation Failed', err);
      setStatus({ type: 'error', msg: 'Save failed' }); 
    }
    finally { setIsSaving(false); }
  };

  const handleGenerate = async () => {
    if (!selectedVoice || !script) return;
    setIsGenerating(true);
    setGeneratedAudioUrl(null);
    appLog('INFO', `Studio Generation Started for ${selectedVoice}`);
    try {
      const blob = await generateAudio(selectedVoice, script, speed, nfeStep, selectedStyle, clarity, deepness);
      setGeneratedAudioUrl(URL.createObjectURL(blob));
      appLog('INFO', 'Generation Complete - Audio Polished');
    } catch (err) { 
      appLog('ERROR', 'Studio Generation Failed', err);
      setStatus({ type: 'error', msg: 'Generation failed.' }); 
    }
    finally { setIsGenerating(false); }
  };

  return (
    <div className="app-layout">
      {/* --- SIDEBAR --- */}
      <aside className="sidebar">
        <div className="logo"><Activity size={24} /> <span>NAC STUDIO</span></div>
        <nav className="nav-menu">
          <button className={`nav-item ${activeTab === 'studio' ? 'active' : ''}`} onClick={() => setActiveTab('studio')}><Music size={18} /> Audio Studio</button>
          <button className={`nav-item ${activeTab === 'clone' ? 'active' : ''}`} onClick={() => setActiveTab('clone')}><Mic size={18} /> Voice Cloning</button>
        </nav>
        
        <div className="sidebar-title">Your Voices</div>
        <div className="voice-library-list">
          {voices.map(v => (
            <div key={v} className="voice-list-item">
              <span onClick={() => {setSelectedVoice(v); setActiveTab('studio'); appLog('INFO', `Selected Voice: ${v}`); }}>{v}</span>
              <button className="trash-btn" onClick={() => handleDeleteVoice(v)}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>

        <div className="status-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800 }}>WORKER STATUS</span>
            <span className="status-badge">{liveStatus.stage}</span>
          </div>
          {liveStatus.stage !== "Idle" && (
            <>
              <div className="progress-container"><div className="progress-bar" style={{ width: `${liveStatus.progress || 50}%` }}></div></div>
              <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{liveStatus.detail}</div>
            </>
          )}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', textAlign: 'center', opacity: 0.3, fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          NAC STUDIO {appVersion}
        </div>
      </aside>

      {/* --- MAIN WORKSPACE --- */}
      <main className="main-workspace">
        <div className="workspace-content">
          
          {status && (
            <div style={{ background: status.type === 'error' ? '#fee2e2' : '#dcfce7', color: status.type === 'error' ? '#b91c1c' : '#15803d', padding: '1rem', borderRadius: '10px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
              {status.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
              {status.msg}
            </div>
          )}

          {activeTab === 'studio' && (
            <div className="bento-grid studio-view">
              <div className="col-8" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="bento-card" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Script Editor</h3>
                    <Layers size={18} color="var(--accent)" />
                  </div>
                  <textarea className="studio-editor" placeholder="Type what you want to say..." value={script} onChange={(e) => setScript(e.target.value)} />
                  <button className="btn-primary" onClick={handleGenerate} disabled={isGenerating || !selectedVoice || !script}>
                    {isGenerating ? <><Loader2 className="spinner" /> Generating...</> : <><Play size={18} /> Generate Studio Audio</>}
                  </button>
                </div>

                {generatedAudioUrl && (
                  <div className="bento-card" style={{ border: '2px solid var(--accent)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0 }}>Polished Result</h3>
                      <a href={generatedAudioUrl} download="polished_speech.wav" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                        <Download size={16} /> Download WAV
                      </a>
                    </div>
                    <audio controls src={generatedAudioUrl} style={{ width: '100%', marginTop: '1.5rem' }} />
                  </div>
                )}
              </div>

              <div className="bento-card col-4">
                <h3 style={{ marginBottom: '2rem' }}>Golden Touch</h3>
                <div className="control-group">
                  <label className="control-label">Voice</label>
                  <select value={selectedVoice} onChange={(e) => { setSelectedVoice(e.target.value); appLog('INFO', `Voice Switched to ${e.target.value}`); }}>
                    <option value="">-- Select Voice --</option>
                    {voices.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="control-group">
                  <label className="control-label">Mood / Style</label>
                  <select value={selectedStyle} onChange={(e) => setSelectedVoiceStyle(e.target.value)}>
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
                  <label className="control-label">Speech Speed <span>{speed.toFixed(1)}x</span></label>
                  <input type="range" min="0.5" max="2.0" step="0.1" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} />
                </div>
                <div className="control-group">
                  <label className="control-label">Quality (NFE) <span>{nfeStep}</span></label>
                  <input type="range" min="16" max="128" step="16" value={nfeStep} onChange={(e) => setNfeStep(parseInt(e.target.value))} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clone' && (
            <div className={`bento-grid cloning-view ${!cleanedAudioPath ? 'centered-grid' : ''}`}>
              <div className={cleanedAudioPath ? "bento-card col-8" : "bento-card col-10"}>
                <h3>Voice Cloning</h3>
                <div className="recording-script">"In the heart of the ancient forest, where the sunlight filters through the dense canopy in golden streaks, nature possesses a profound beauty."</div>
                
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
                  {!isRecording ? (<button className="btn-primary" style={{flex: 1}} onClick={startRecording}><Mic size={18} /> Record</button>) : 
                   (<button className="btn-primary" style={{ background: '#ef4444', flex: 1 }} onClick={stopRecording}><Square size={18} /> Stop</button>)}
                  
                  <input type="file" accept="audio/*" onChange={handleFileChange} id="file-upload" style={{ display: 'none' }} />
                  <label htmlFor="file-upload" className="btn-primary" style={{ background: '#27272a', flex: 1, textAlign: 'center', cursor: 'pointer' }}>Upload File</label>

                  <button className="btn-primary" style={{ background: '#10b981', flex: 1.5 }} onClick={handleUploadAndClean} disabled={!audioBlob || isCleaning}>
                    {isCleaning ? <><Loader2 className="spinner" size={18} /> Processing...</> : <><Wand2 size={18} /> Clean & Verify</>}
                  </button>
                </div>
                {selectedFileName && <div style={{ marginTop: '1.25rem', color: 'var(--accent)', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileAudio size={16} /> {selectedFileName} is ready</div>}
              </div>

              {cleanedAudioPath && (
                <div className="bento-card col-4">
                  <div className="control-group">
                    <label className="control-label">Audio Score</label>
                    {studioMark && (
                      <div 
                        className="studio-mark-badge" 
                        style={{ color: studioMark.studio_mark_score >= 85 ? '#10b981' : '#f59e0b' }}
                      >
                        <span className="score">{studioMark.studio_mark_score}%</span>
                        <span className="readiness">
                          {studioMark.studio_mark_score >= 85 ? 'Studio Ready' : 'Low Quality'}
                        </span>
                      </div>
                    )}
                  </div>
                  <audio controls src={getPreviewUrl(cleanedAudioPath)} style={{ width: '100%', marginBottom: '1rem' }} />
                  <div className="save-voice-group">
                    <div className="control-group">
                      <label className="control-label" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
                        <Edit3 size={14} /> Transcription
                      </label>
                      <textarea className="confirm-text-area" value={refText} onChange={(e) => setRefText(e.target.value)} />
                    </div>
                    <div className="control-group">
                      <label className="control-label">Identity Name</label>
                      <input type="text" placeholder="e.g. My Studio Voice" value={voiceName} onChange={(e) => setVoiceName(e.target.value)} />
                    </div>
                    <button className="btn-primary" onClick={handleConfirm} disabled={!voiceName || isSaving}>
                      {isSaving ? <><Loader2 className="spinner" /> Saving...</> : "Save Voice Identity"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
