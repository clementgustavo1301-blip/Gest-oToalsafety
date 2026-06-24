import React from 'react';
import { Menu, Bell, ShieldCheck } from 'lucide-react';
import { useAI } from '../context/AIContext';

const MobileTopBar = ({ onOpenSidebar }) => {
  const { unreadCount } = useAI();

  return (
    <div className="mobile-topbar">
      <button 
        onClick={onOpenSidebar}
        style={{ color: 'var(--text-secondary)', padding: '0.25rem' }}
      >
        <Menu size={24} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--primary)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <ShieldCheck size={18} />
        </div>
        <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>TotalSafety</h2>
      </div>

      <div style={{ position: 'relative' }}>
        <Bell size={20} color="var(--text-secondary)" />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            backgroundColor: 'var(--danger)', width: 10, height: 10,
            borderRadius: '50%', border: '2px solid var(--surface)'
          }} />
        )}
      </div>
    </div>
  );
};

export default MobileTopBar;
