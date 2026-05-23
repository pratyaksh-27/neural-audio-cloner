import { useEffect, useState } from 'react';
import './App.css';
import { useStore } from './store/useStore';
import { getStatus, getVersion, listVoices } from './api';
import Sidebar from './components/Sidebar';
import BlockEditor from './components/BlockEditor';
import VoiceCloning from './components/VoiceCloning';
import VoiceLibrary from './components/VoiceLibrary';
import { AlertCircle, CheckCircle, Activity } from 'lucide-react';

function App() {
  const { activeTab, setVoices, setSelectedVoice, selectedVoice } = useStore();
  const [liveStatus, setLiveStatus] = useState<any>({ stage: "Idle" });
  const [appVersion, setAppVersion] = useState<string>('v3.0.0');
  const [status, setStatus] = useState<{ type: 'info' | 'success' | 'error', msg: string } | null>(null);

  useEffect(() => { 
    const init = async () => {
      try {
        const [v, ver] = await Promise.all([listVoices(), getVersion()]);
        setVoices(v);
        setAppVersion(ver.version);
      } catch (err) {
        console.error('System heartbeat failed', err);
      }
    };
    init();

    const interval = setInterval(async () => {
      try {
        const s = await getStatus();
        setLiveStatus(s);
      } catch {
        console.warn('Polling heartbeat interrupted');
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-layout">
      {/* 1. TOP NAV (Inverse L) */}
      <header className="top-nav">
        <div className="top-nav-logo">
          <Activity size={28} />
          <span>NAC STUDIO <span style={{ opacity: 0.4, fontWeight: 500 }}>PRO</span></span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className={`pulse-dot ${liveStatus.stage !== 'Idle' ? 'busy' : ''}`} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)' }}>
            {liveStatus.stage.toUpperCase()}
          </span>
        </div>
      </header>

      <div className="main-container">
        {/* 2. LEFT RAIL */}
        <Sidebar liveStatus={liveStatus} appVersion={appVersion} />

        {/* 3. MAIN WORKSPACE */}
        <main className="main-workspace">
          {status && (
            <div className="status-toast" style={{ background: status.type === 'error' ? '#fee2e2' : '#dcfce7', color: status.type === 'error' ? '#b91c1c' : '#15803d' }}>
              {status.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
              {status.msg}
            </div>
          )}

          <div className="infinite-canvas">
            {activeTab === 'studio' && <BlockEditor />}
            {activeTab === 'clone' && <VoiceCloning />}
            {activeTab === 'library' && <VoiceLibrary />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
