import React from 'react';
import { useStore } from '../store/useStore';
import { Trash2, User, Play, Music } from 'lucide-react';
import { deleteVoice, listVoices } from '../api';

const VoiceLibrary: React.FC = () => {
  const { voices, setVoices, setSelectedVoice, setActiveTab } = useStore();

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await deleteVoice(name);
      const v = await listVoices();
      setVoices(v);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleUseVoice = (name: string) => {
    setSelectedVoice(name);
    setActiveTab('studio');
  };

  return (
    <div style={{ maxWidth: '1000px', width: '100%', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Voice Library</h2>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>{voices.length} Voices Stored</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {voices.map(v => (
          <div key={v} className="block-segment" style={{ padding: '1.5rem', marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '48px', height: '48px', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem' }}>{v}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Studio Voice</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-v3" style={{ flex: 1 }} onClick={() => handleUseVoice(v)}>
                <Music size={16} /> Use in Studio
              </button>
              <button className="btn-icon" onClick={() => handleDelete(v)} title="Delete Voice">
                <Trash2 size={16} className="text-red" />
              </button>
            </div>
          </div>
        ))}

        {voices.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '16px', border: '1px dashed var(--border-light)' }}>
            <div style={{ opacity: 0.3, marginBottom: '1rem' }}><User size={48} style={{ margin: '0 auto' }} /></div>
            <p style={{ color: 'var(--text-dim)' }}>No voices found. Go to "Voice Cloning" to add your first one.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceLibrary;
