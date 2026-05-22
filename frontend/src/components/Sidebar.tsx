import React from 'react';
import { useStore } from '../store/useStore';
import { Music, Mic, Activity, Library } from 'lucide-react';

interface SidebarProps {
  liveStatus: any;
  appVersion: string;
}

const Sidebar: React.FC<SidebarProps> = ({ liveStatus, appVersion }) => {
  const { activeTab, setActiveTab } = useStore();

  const isBusy = liveStatus.stage !== "Idle";

  return (
    <aside className="sidebar-rail">
      <div className="rail-logo">
        <Activity size={32} />
      </div>

      <nav className="rail-nav">
        <button 
          className={`rail-item ${activeTab === 'studio' ? 'active' : ''}`}
          onClick={() => setActiveTab('studio')}
          title="Audio Studio"
        >
          <Music size={22} />
        </button>
        
        <button 
          className={`rail-item ${activeTab === 'clone' ? 'active' : ''}`}
          onClick={() => setActiveTab('clone')}
          title="Voice Library"
        >
          <Library size={22} />
        </button>
      </nav>

      <div className="status-rail">
        <div 
          className={`pulse-dot ${isBusy ? 'busy' : ''}`} 
          title={`Worker Status: ${liveStatus.stage}`}
        />
        <div style={{ opacity: 0.1, fontSize: '0.6rem', fontWeight: 900, transform: 'rotate(-90deg)', whiteSpace: 'nowrap' }}>
          NAC v3.0
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
