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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <img src="/logo-totalsafety.png" alt="TotalSafety" style={{ height: '48px', transform: 'scale(1.6)', objectFit: 'contain' }} />
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
