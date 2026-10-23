import React from 'react';
import { Bell, Menu, Moon, Sun } from 'lucide-react';
import { useAI } from '../context/AIContext';
import { useTheme } from '../hooks/useTheme';

const MobileTopBar = ({ onOpenSidebar }) => {
  const { unreadCount } = useAI();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="mobile-topbar">
      <button className="mobile-topbar__action" onClick={onOpenSidebar} aria-label="Abrir menu">
        <Menu size={22} />
      </button>

      <img className="mobile-topbar__logo" src="/logo-totalsafety.png" alt="TotalSafety" />

      <div className="mobile-topbar__actions">
        <button className="mobile-topbar__action" onClick={toggleTheme} aria-label={isDark ? 'Usar tema claro' : 'Usar tema escuro'}>
          {isDark ? <Sun size={19} /> : <Moon size={19} />}
        </button>
        <span className="mobile-topbar__notification" aria-label={`${unreadCount} notificações`}>
          <Bell size={19} />
          {unreadCount > 0 && <span className="mobile-topbar__notification-dot" />}
        </span>
      </div>
    </header>
  );
};

export default MobileTopBar;
