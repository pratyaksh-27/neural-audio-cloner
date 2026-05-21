import React from 'react';
import { useStore } from '../store/useStore';
import { Music, Mic, Activity, Trash2 } from 'lucide-react';
import { deleteVoice, listVoices } from '../api';

interface SidebarProps {
  liveStatus: any;
  appVersion: string;
}

const Sidebar: React.FC<SidebarProps> = ({ liveStatus, appVersion }) => {
  const { 
    activeTab, setActiveTab, voices, setVoices, 
    setSelectedVoice, setSelectedVoice: selectForStudio 
  } = useStore();

  const handleDeleteVoice = async (name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await deleteVoice(name);
      const v = await listVoices();
      setVoices(v);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  return (
    <aside className="sidebar">
      <div className="logo"><Activity size={24} /> <span>NAC STUDIO</span></div>
      <nav className="nav-menu">
        <button 
          className={`nav-item ${activeTab === 'studio' ? 'active' : ''}`} 
          onClick={() => setActiveTab('studio')}
        >
          <Music size={18} /> Audio Studio
        </button>
        <button 
          className={`nav-item ${activeTab === 'clone' ? 'active' : ''}`} 
          onClick={() => setActiveTab('clone')}
        >
          <Mic size={18} /> Voice Cloning
        </button>
      </nav>
      
      <div className="sidebar-title">Your Voices</div>
      <div className="voice-library-list">
        {voices.map(v => (
          <div key={v} className="voice-list-item">
            <span onClick={() => { setSelectedVoice(v); setActiveTab('studio'); }}>{v}</span>
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
  );
};

export default Sidebar;
