import { useEffect, useState } from 'react';
import './App.css';
import { useStore } from './store/useStore';
import { getStatus, getVersion, listVoices } from './api';
import Sidebar from './components/Sidebar';
import BlockEditor from './components/BlockEditor';
import VoiceCloning from './components/VoiceCloning';
import { AlertCircle, CheckCircle } from 'lucide-react';

// --- Enterprise UI Logger ---
const appLog = (level: 'INFO' | 'WARN' | 'ERROR', msg: string, data?: any) => {
  const ts = new Date().toISOString();
  const color = level === 'ERROR' ? 'red' : level === 'WARN' ? 'orange' : '#6366f1';
  console.log(`%c[${ts}] [${level}] [NAC_UI] ${msg}`, `color: ${color}; font-weight: bold;`, data || '');
};

function App() {
  const { activeTab, setVoices, setSelectedVoice, selectedVoice } = useStore();
  const [liveStatus, setLiveStatus] = useState<any>({ stage: "Idle" });
  const [appVersion, setAppVersion] = useState<string>('v3.0.0');
  const [status, setStatus] = useState<{ type: 'info' | 'success' | 'error', msg: string } | null>(null);

  useEffect(() => { 
    appLog('INFO', 'Studio Pro v3.0 booting...');
    
    const init = async () => {
      try {
        const [v, ver] = await Promise.all([listVoices(), getVersion()]);
        setVoices(v);
        setAppVersion(ver.version);
      } catch (err) {
        appLog('ERROR', 'System heartbeat failed', err);
      }
    };
    init();

    const interval = setInterval(async () => {
      try {
        const s = await getStatus();
        setLiveStatus(s);
      } catch {
        appLog('WARN', 'Polling heartbeat interrupted');
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-layout">
      <Sidebar liveStatus={liveStatus} appVersion={appVersion} />

      <main className="main-workspace">
        <div className="workspace-content">
          
          {status && (
            <div className="status-toast" style={{ background: status.type === 'error' ? '#fee2e2' : '#dcfce7', color: status.type === 'error' ? '#b91c1c' : '#15803d' }}>
              {status.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
              {status.msg}
            </div>
          )}

          {activeTab === 'studio' && (
            <BlockEditor />
          )}

          {activeTab === 'clone' && (
            <div style={{ maxWidth: '1000px', width: '100%', margin: '0 auto', padding: '4rem' }}>
              <VoiceCloning />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;
