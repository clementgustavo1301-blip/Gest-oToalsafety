import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, ClipboardList, Settings, ShieldCheck, Building2, FileText, LogOut, Sparkles } from 'lucide-react';
import React from 'react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Empresas', path: '/companies', icon: <Building2 size={20} /> },
    { name: 'Calendário', path: '/calendar', icon: <Calendar size={20} /> },
    { name: 'Entregáveis', path: '/deliverables', icon: <FileText size={20} /> },
    { name: 'Assistente IA', path: '/ai-assistant', icon: <Sparkles size={20} /> },
    { name: 'Configurações', path: '/settings', icon: <Settings size={20} /> },
  ];

  return (
    <aside style={{
      width: '260px',
      backgroundColor: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem',
      height: '100%'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--primary)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <ShieldCheck size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>TotalSafety</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Gestão SST</span>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        {navItems.map((item) => {
          const isActive = item.path !== '#' && (
            item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
          );
          return (
            <Link
              key={item.name}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                fontWeight: isActive ? '600' : '500',
                transition: 'var(--transition)'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--background)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              {item.icon}
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div style={{
        marginTop: 'auto',
        padding: '1rem',
        backgroundColor: 'var(--secondary-light)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--secondary)',
              boxShadow: '0 0 0 2px var(--surface), 0 0 0 4px var(--secondary-light)'
            }} />
            <span style={{ fontSize: '0.875rem', color: 'var(--secondary-hover)', fontWeight: '500' }}>
              Sistema Online
            </span>
          </div>
          <button 
            onClick={signOut}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
              padding: '0.5rem', background: 'transparent', border: 'none',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8125rem',
              fontWeight: '500', transition: 'var(--transition)', borderRadius: 'var(--radius-sm)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.color = 'var(--danger)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <LogOut size={16} /> Sair do Sistema
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
