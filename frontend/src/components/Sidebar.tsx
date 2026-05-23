import React from 'react';
import { useStore } from '../store/useStore';
import { Music, Mic, Library } from 'lucide-react';

interface SidebarProps {
  liveStatus: any;
  appVersion: string;
}

const Sidebar: React.FC<SidebarProps> = ({ liveStatus, appVersion }) => {
  const { activeTab, setActiveTab } = useStore();

  return (
    <aside className="sidebar-rail">
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
          title="Voice Cloning"
        >
          <Mic size={22} />
        </button>

        <button 
          className={`rail-item ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => setActiveTab('library')}
          title="Voice Library"
        >
          <Library size={22} />
        </button>
      </nav>

      <div style={{ marginTop: 'auto', opacity: 0.1, fontSize: '0.6rem', fontWeight: 900, transform: 'rotate(-90deg)', whiteSpace: 'nowrap', paddingBottom: '2rem' }}>
        {appVersion}
      </div>
    </aside>
  );
};

export default Sidebar;
