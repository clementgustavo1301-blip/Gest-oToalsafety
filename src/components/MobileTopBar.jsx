import React from 'react';
import { Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import NotificationBell from './NotificationBell';

const MobileTopBar = ({ onOpenSidebar }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="mobile-topbar">
      <button className="mobile-topbar__action" onClick={onOpenSidebar} aria-label="Abrir menu">
        <Menu size={22} />
      </button>

      <img className="mobile-topbar__logo" src="/logo-ecosafety.png" alt="EcoClinic" />

      <div className="mobile-topbar__actions">
        <button className="mobile-topbar__action" onClick={toggleTheme} aria-label={isDark ? 'Usar tema claro' : 'Usar tema escuro'}>
          {isDark ? <Sun size={19} /> : <Moon size={19} />}
        </button>
        <NotificationBell variant="topbar" />
      </div>
    </header>
  );
};

export default MobileTopBar;
