import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Mic, Square, Wand2, Loader2, FileAudio, Edit3 } from 'lucide-react';
import { uploadVoice, getPreviewUrl, confirmVoice, listVoices } from '../api';

const VoiceCloning: React.FC = () => {
  const { setVoices } = useStore();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<any>(null);
  const [cleanedAudioPath, setCleanedAudioPath] = useState<string | null>(null);
  const [studioMark, setStudioMark] = useState<any>(null);
  const [refText, setRefText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [voiceName, setVoiceName] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => { 
        setAudioBlob(new Blob(audioChunksRef.current, { type: 'audio/wav' })); 
      };
      recorder.start();
      setIsRecording(true);
      setSelectedFileName("Live Recording");
    } catch (err) { console.error("Mic access denied", err); }
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
    }
  };

  const handleUploadAndClean = async () => {
    if (!audioBlob) return;
    setIsCleaning(true);
    try {
      const file = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
      const data = await uploadVoice(file);
      setCleanedAudioPath(data.temp_path);
      setStudioMark(data.studio_mark);
      setRefText(data.transcription || '');
      setAudioBlob(null);
      setSelectedFileName(null);
    } catch (err) { console.error("Process failed", err); }
    finally { setIsCleaning(false); }
  };

  const handleConfirm = async () => {
    if (!voiceName || !cleanedAudioPath || isSaving) return;
    setIsSaving(true);
    try {
      await confirmVoice(voiceName, cleanedAudioPath, refText);
      setVoiceName('');
      setCleanedAudioPath(null);
      setStudioMark(null);
      setRefText('');
      const v = await listVoices();
      setVoices(v);
    } catch (err) { console.error("Save failed", err); }
    finally { setIsSaving(false); }
  };

  return (
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
              <div className="studio-mark-badge" style={{ color: studioMark.studio_mark_score >= 85 ? '#10b981' : '#f59e0b' }}>
                <span className="score">{studioMark.studio_mark_score}%</span>
                <span className="readiness">{studioMark.studio_mark_score >= 85 ? 'Studio Ready' : 'Low Quality'}</span>
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
  );
};

export default VoiceCloning;
