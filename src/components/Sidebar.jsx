import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, ClipboardList, Settings, ShieldCheck, Building2, FileText, LogOut, Sparkles, Bell, Package, X, ClipboardCheck, Users, ChevronLeft, ChevronRight, Wrench, ChevronDown, ChevronUp, Wand2, BarChart3, Database, Stethoscope, MessageSquare, Map } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAI } from '../context/AIContext';
import { supabase } from '../lib/supabase';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { signOut, userProfile, activeLink, setActiveLink } = useAuth();
  const { unreadCount } = useAI();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [pendingTeamCount, setPendingTeamCount] = useState(0);

  const isAdminDiretoria = activeLink?.role === 'Admin' && activeLink?.sector === 'Diretoria';
  const isClinicaOrAdmin = activeLink?.sector === 'Clínica' || isAdminDiretoria;
  const isSSTOrAdmin = activeLink?.sector === 'SST' || activeLink?.role === 'Admin';

  useEffect(() => {
    if (isAdminDiretoria) {
      const fetchPending = async () => {
        const { count } = await supabase
          .from('user_links')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        setPendingTeamCount(count || 0);
      };
      fetchPending();

      const subscription = supabase
        .channel('public:user_links')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_links' }, fetchPending)
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [isAdminDiretoria]);

  const toggleMenu = (name) => {
    setExpandedMenus(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Empresas', path: '/companies', icon: <Building2 size={20} /> },
    ...(activeLink?.role === 'Admin' ? [{ name: 'Logística', path: '/logistics', icon: <Map size={20} />, badge: 'DEMO' }] : []),
    { name: 'Calendário', path: '/calendar', icon: <Calendar size={20} /> },
    { name: 'Entregáveis', path: '/deliverables', icon: <FileText size={20} /> },
    { 
      name: 'Ferramentas', 
      icon: <Wrench size={20} />, 
      subItems: [
        ...(isAdminDiretoria ? [
          { name: 'Convocações', path: '/convocations', icon: <ClipboardCheck size={18} /> }
        ] : []),
        { name: 'Contatos', path: '/contacts', icon: <Users size={18} /> },
        { name: 'Cronograma', path: '/schedule-generator', icon: <Wand2 size={18} /> },
        ...(isClinicaOrAdmin ? [
          { name: 'Modelos de Mensagem', path: '/exams-budget', icon: <MessageSquare size={18} /> }
        ] : []),
        ...(isSSTOrAdmin ? [
          { name: 'Gestão de CATs', path: '/cat', icon: <ClipboardList size={18} /> },
          { name: 'Certificados', path: '/certificates', icon: <FileText size={18} /> },
          { name: 'Estoque', path: '/inventory', icon: <Package size={18} /> }
        ] : []),
        ...(isAdminDiretoria ? [
          { name: 'Relatórios', path: '/reports', icon: <BarChart3 size={18} /> },
          { name: 'Armazenamento', path: '/storage', icon: <Database size={18} /> }
        ] : [])
      ]
    },
    { name: 'Assistente IA', path: '/ai-assistant', icon: <Sparkles size={20} /> },
    { name: 'Configurações', path: '/settings', icon: <Settings size={20} /> },
    ...(isAdminDiretoria ? [
      { name: 'Equipe e Acessos', path: '/team', icon: <ShieldCheck size={20} />, badge: pendingTeamCount > 0 ? '!' : null }
    ] : [])
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`} style={{ 
      width: isCollapsed ? '88px' : '300px', 
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s',
      padding: isCollapsed ? '1.5rem 0.75rem' : '1.5rem',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        position: 'relative',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: '2.5rem', 
        width: '100%',
        minHeight: '48px'
      }}>
        
        {!isCollapsed ? (
          <img src="/logo-totalsafety.png" alt="TotalSafety" style={{ width: '100%', maxWidth: '240px', height: 'auto', maxHeight: '120px', objectFit: 'contain', transform: 'scale(1.5)' }} />
        ) : (
          <div style={{ 
            width: '40px', height: '40px', backgroundColor: 'var(--primary-light)', 
            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            color: 'var(--primary)', fontWeight: '900', fontSize: '1.25rem' 
          }}>
            TS
          </div>
        )}

        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hide-on-mobile"
          style={{ 
            position: 'absolute', 
            right: isCollapsed ? '-24px' : '-36px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            backgroundColor: 'var(--surface)', 
            border: '1px solid var(--border)', 
            borderRadius: '50%', 
            padding: '6px', 
            cursor: 'pointer', 
            zIndex: 100, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--text-secondary)', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            transition: 'right 0.3s'
          }}
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {!isCollapsed && (
          <button 
            className="hide-on-desktop" 
            onClick={onClose}
            style={{ position: 'absolute', right: 0, color: 'var(--text-secondary)', padding: '0.25rem' }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      <nav style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1,
        overflowY: 'auto', overflowX: 'hidden', minHeight: 0
      }}>
        {/* Renderiza o menu apenas se o usuário tiver escolhido um vínculo (Cadeado Aberto) */}
        {!activeLink ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <ShieldCheck size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>Selecione um vínculo para desbloquear o menu.</p>
          </div>
        ) : (
          navItems.map((item) => {
            if (item.subItems) {
              const isExpanded = expandedMenus[item.name];
              const isAnySubActive = item.subItems.some(sub => 
                sub.path !== '#' && location.pathname.startsWith(sub.path)
              );
              
              return (
                <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <button 
                    onClick={() => {
                      if (isCollapsed) {
                        setIsCollapsed(false);
                        if (!isExpanded) toggleMenu(item.name);
                      } else {
                        toggleMenu(item.name);
                      }
                    }}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: isCollapsed ? '0.75rem' : '0.75rem 1rem',
                      justifyContent: isCollapsed ? 'center' : 'space-between',
                      borderRadius: 'var(--radius-md)',
                      color: isAnySubActive ? 'var(--primary)' : 'var(--text-secondary)',
                      backgroundColor: isAnySubActive && !isExpanded ? 'var(--primary-light)' : 'transparent',
                      fontWeight: isAnySubActive ? '600' : '500',
                      transition: 'var(--transition)',
                      border: 'none',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      if (!isAnySubActive || isExpanded) {
                        e.currentTarget.style.backgroundColor = 'var(--background)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isAnySubActive || isExpanded) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }
                    }}
                    title={isCollapsed ? item.name : ''}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: isCollapsed ? 0 : 1 }}>
                      <div>{item.icon}</div>
                      {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.name}</span>}
                    </div>
                    {!isCollapsed && (
                      <div>{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
                    )}
                  </button>
                  
                  {isExpanded && !isCollapsed && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '1rem', marginTop: '0.25rem' }}>
                      {item.subItems.map((subItem) => {
                        const isSubActive = subItem.path !== '#' && location.pathname.startsWith(subItem.path);
                        return (
                          <Link 
                            key={subItem.name}
                            to={subItem.path}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              padding: '0.5rem 1rem',
                              borderRadius: 'var(--radius-md)',
                              color: isSubActive ? 'var(--primary)' : 'var(--text-secondary)',
                              backgroundColor: isSubActive ? 'var(--primary-light)' : 'transparent',
                              fontWeight: isSubActive ? '600' : '500',
                              transition: 'var(--transition)',
                              fontSize: '0.9em'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSubActive) {
                                e.currentTarget.style.backgroundColor = 'var(--background)';
                                e.currentTarget.style.color = 'var(--text-primary)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSubActive) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                              }
                            }}
                          >
                            <div>{subItem.icon}</div>
                            <span style={{ whiteSpace: 'nowrap' }}>{subItem.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = item.path !== '#' && (
              item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
            );
            return (
              <Link 
                key={item.name}
                to={item.path}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: isCollapsed ? '0.75rem' : '0.75rem 1rem',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
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
                title={isCollapsed ? item.name : ''}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', flex: isCollapsed ? 0 : 1 
                }}>
                  <div>{item.icon}</div>
                  {!isCollapsed && (
                    <span style={{ 
                      whiteSpace: 'nowrap',
                      color: item.badge && !isActive ? 'var(--danger)' : 'inherit'
                    }}>
                      {item.name}
                    </span>
                  )}
                </div>
                
                {item.badge && !isCollapsed && (
                  <div style={{
                    color: item.badge === 'DEMO' ? 'white' : 'var(--danger)',
                    backgroundColor: item.badge === 'DEMO' ? 'var(--primary)' : 'transparent',
                    padding: item.badge === 'DEMO' ? '2px 6px' : '0',
                    borderRadius: item.badge === 'DEMO' ? '12px' : '0',
                    fontWeight: 'bold',
                    fontSize: item.badge === 'DEMO' ? '0.7rem' : '1rem',
                    marginLeft: 'auto'
                  }}>
                    {item.badge}
                  </div>
                )}
                {item.badge && isCollapsed && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    backgroundColor: item.badge === 'DEMO' ? 'var(--primary)' : 'var(--danger)',
                    color: 'white',
                    fontSize: item.badge === 'DEMO' ? '0.5rem' : '0.625rem',
                    fontWeight: 'bold',
                    width: item.badge === 'DEMO' ? 'auto' : '16px',
                    height: '16px',
                    padding: item.badge === 'DEMO' ? '0 4px' : '0',
                    borderRadius: item.badge === 'DEMO' ? '8px' : '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {item.badge === 'DEMO' ? 'D' : item.badge}
                  </div>
                )}
                
                {item.path === '/ai-assistant' && (
                  <div style={{
                    backgroundColor: unreadCount > 0 && !isCollapsed ? 'var(--danger)' : 'transparent',
                    color: unreadCount > 0 ? 'white' : 'var(--text-secondary)',
                    fontSize: '0.6875rem',
                    fontWeight: 'bold',
                    padding: unreadCount > 0 && !isCollapsed ? '0.125rem 0.5rem' : '0',
                    borderRadius: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    justifyContent: 'center',
                    position: isCollapsed ? 'absolute' : 'static',
                    right: isCollapsed ? '8px' : 'auto',
                    top: isCollapsed ? '8px' : 'auto',
                    minWidth: '20px',
                    transition: 'var(--transition)'
                  }}>
                    {unreadCount > 0 ? (
                      isCollapsed ? (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--danger)' }} title={`${unreadCount} notificações`} />
                      ) : (
                        <><Bell size={14} fill="currentColor" /> {unreadCount}</>
                      )
                    ) : (
                      !isCollapsed && <Bell size={16} />
                    )}
                  </div>
                )}
              </Link>
            );
          })
        )}
      </nav>

      <div style={{
        marginTop: 'auto',
        padding: isCollapsed ? '1rem 0.5rem' : '1rem',
        backgroundColor: 'var(--secondary-light)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
        transition: 'padding 0.3s'
      }}>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: isCollapsed ? 'center' : 'stretch' }}>
          <div style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '0.75rem', marginBottom: '0.5rem', padding: isCollapsed ? '0.25rem 0' : '0 0.5rem' }}
                title={isCollapsed ? "Sistema Online" : ""}
          >
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--secondary)',
              boxShadow: '0 0 0 2px var(--surface), 0 0 0 4px var(--secondary-light)',
              flexShrink: 0
            }} />
            {!isCollapsed && (
              <span style={{ fontSize: '0.875rem', color: 'var(--secondary-hover)', fontWeight: '500', whiteSpace: 'nowrap' }}>
                Sistema Online
              </span>
            )}
          </div>
          <div style={{ width: '100%', height: '1px', backgroundColor: 'var(--border)', margin: '0.5rem 0' }} />
          
          {activeLink && (
            <button 
              onClick={() => setActiveLink(null)}
              title={isCollapsed ? "Alterar Vínculo" : ""}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '0.5rem', width: '100%',
                padding: '0.5rem', background: 'transparent', border: 'none',
                color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8125rem',
                fontWeight: '600', transition: 'var(--transition)', borderRadius: 'var(--radius-sm)',
                marginBottom: '0.25rem'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary-light)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <Users size={16} style={{ flexShrink: 0 }} /> 
              {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Alterar Vínculo</span>}
            </button>
          )}

          <button 
            onClick={signOut}
            title={isCollapsed ? "Sair do Sistema" : ""}
            style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '0.5rem', width: '100%',
              padding: '0.5rem', background: 'transparent', border: 'none',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8125rem',
              fontWeight: '500', transition: 'var(--transition)', borderRadius: 'var(--radius-sm)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.color = 'var(--danger)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <LogOut size={16} style={{ flexShrink: 0 }} /> 
            {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Sair do Sistema</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
