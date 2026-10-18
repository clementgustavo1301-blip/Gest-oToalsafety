import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, ClipboardList, Settings, ShieldCheck, Building2, FileText, LogOut, Sparkles, Bell, Package, X, ClipboardCheck, Users, ChevronLeft, ChevronRight, Wrench, ChevronDown, ChevronUp, Wand2, BarChart3, Database, MessageSquare, Map, Tv, Award } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAI } from '../context/AIContext';
import { supabase } from '../lib/supabase';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { signOut, activeLink, setActiveLink } = useAuth();
  const { unreadCount } = useAI();
  // Always keep sidebar collapsed by default as requested
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem('sidebar_collapsed', 'true');
    } catch {}
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(prev => !prev);
  };
  const [expandedMenus, setExpandedMenus] = useState({});
  const [pendingTeamCount, setPendingTeamCount] = useState(0);

  const isAdminDiretoria = (activeLink?.role === 'Admin' && activeLink?.sector === 'Diretoria') || activeLink?.sector === 'IPA';
  const isClinicaOrAdmin = activeLink?.sector === 'Clínica' || isAdminDiretoria;
  const isSSTOrAdmin = activeLink?.sector === 'SST' || isAdminDiretoria;
  const canAccessCertificates = isSSTOrAdmin;

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

  const isTreinamento = activeLink?.sector === 'Treinamento';

  const navItems = isTreinamento ? [
    { name: 'Treinamentos & Turmas', path: '/training-certificates', icon: <Award size={17} /> }
  ] : [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={17} /> },
    ...(activeLink?.sector === 'IPA' ? [
      { 
        name: 'Painel IPA', 
        icon: <Tv size={17} />, 
        badge: 'IPA',
        subItems: [
          { name: 'Dashboard Operacional', path: '/ipa', icon: <LayoutDashboard size={15} /> },
          { name: 'TV / War Room', path: '/ipa/tv', icon: <Tv size={15} /> },
          { name: 'Calendário & Agenda', path: '/ipa/calendar', icon: <Calendar size={15} /> },
          { name: 'Itinerários & Mapa', path: '/ipa/map', icon: <Map size={15} /> },
          { name: 'Unidade Móvel', path: '/ipa/campaigns', icon: <Building2 size={15} /> },
          { name: 'Clínicas Parceiras', path: '/ipa/partners', icon: <Building2 size={15} /> },
          { name: 'Relatórios IPA', path: '/ipa/reports', icon: <FileText size={15} /> }
        ]
      }
    ] : []),
    { name: 'Empresas', path: '/companies', icon: <Building2 size={17} /> },

    { name: 'Calendário', path: '/calendar', icon: <Calendar size={17} /> },
    { name: 'Entregáveis', path: '/deliverables', icon: <FileText size={17} /> },
    { 
      name: 'Ferramentas', 
      icon: <Wrench size={17} />, 
      subItems: [
        ...(isAdminDiretoria ? [
          { name: 'Convocações', path: '/convocations', icon: <ClipboardCheck size={15} /> }
        ] : []),
        { name: 'Contatos', path: '/contacts', icon: <Users size={15} /> },
        { name: 'Cronograma', path: '/schedule-generator', icon: <Wand2 size={15} /> },
        ...(isClinicaOrAdmin ? [
          { name: 'Modelos de Mensagem', path: '/exams-budget', icon: <MessageSquare size={15} /> }
        ] : []),
        ...(isSSTOrAdmin ? [
          { name: 'Gestão de CATs', path: '/cat', icon: <ClipboardList size={15} /> }
        ] : []),
        ...(canAccessCertificates ? [
          { name: 'Certificados SST', path: '/certificates', icon: <FileText size={15} /> }
        ] : []),
        ...(isSSTOrAdmin ? [
          { name: 'Estoque', path: '/inventory', icon: <Package size={15} /> }
        ] : []),
        ...(isAdminDiretoria ? [
          { name: 'Relatórios', path: '/reports', icon: <BarChart3 size={15} /> },
          { name: 'Armazenamento', path: '/storage', icon: <Database size={15} /> }
        ] : [])
      ]
    },
    { name: 'Assistente IA', path: '/ai-assistant', icon: <Sparkles size={17} /> },
    { name: 'Configurações', path: '/settings', icon: <Settings size={17} /> },
    ...(isAdminDiretoria ? [
      { name: 'Equipe e Acessos', path: '/team', icon: <ShieldCheck size={17} />, badge: pendingTeamCount > 0 ? '!' : null }
    ] : [])
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`} style={{ 
      width: isCollapsed ? '68px' : '225px', 
      transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), padding 0.25s',
      padding: isCollapsed ? '0.85rem 0.35rem' : '0.85rem 0.65rem',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        position: 'relative',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: '0.85rem', 
        width: '100%',
        minHeight: '38px'
      }}>
        
        {!isCollapsed ? (
          <img src="/logo-totalsafety.png" alt="TotalSafety" style={{ width: '100%', maxWidth: '130px', height: 'auto', maxHeight: '34px', objectFit: 'contain' }} />
        ) : (
          <div style={{ 
            width: '34px', height: '34px', backgroundColor: 'var(--primary-light)', 
            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            color: 'var(--primary)', fontWeight: '900', fontSize: '0.95rem' 
          }}>
            TS
          </div>
        )}

        <button 
          onClick={toggleCollapse}
          className="hide-on-mobile"
          style={{ 
            position: 'absolute', 
            right: '-12px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            backgroundColor: 'var(--surface)', 
            border: '1px solid var(--border)', 
            borderRadius: '50%', 
            width: '24px',
            height: '24px',
            padding: 0,
            cursor: 'pointer', 
            zIndex: 100, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--text-secondary)', 
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease'
          }}
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {!isCollapsed && (
          <button 
            className="hide-on-desktop" 
            onClick={onClose}
            style={{ position: 'absolute', right: 0, color: 'var(--text-secondary)', padding: '0.2rem' }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1,
        overflowY: 'auto', overflowX: 'hidden', minHeight: 0
      }}>
        {/* Renderiza o menu apenas se o usuário tiver escolhido um vínculo (Cadeado Aberto) */}
        {!activeLink ? (
          <div style={{ padding: '1.5rem 0.75rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
            <ShieldCheck size={28} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
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
                <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <button 
                    onClick={() => {
                      if (isCollapsed) {
                        setIsCollapsed(false);
                        try { localStorage.setItem('sidebar_collapsed', 'false'); } catch {}
                        if (!isExpanded) toggleMenu(item.name);
                      } else {
                        toggleMenu(item.name);
                      }
                    }}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: isCollapsed ? '0.45rem' : '0.42rem 0.65rem',
                      justifyContent: isCollapsed ? 'center' : 'space-between',
                      borderRadius: 'var(--radius-md)',
                      color: isAnySubActive ? 'var(--primary)' : 'var(--text-secondary)',
                      backgroundColor: isAnySubActive && !isExpanded ? 'var(--primary-light)' : 'transparent',
                      fontWeight: isAnySubActive ? '600' : '500',
                      fontSize: '0.8125rem',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: isCollapsed ? 0 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px' }}>{item.icon}</div>
                      {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.name}</span>}
                    </div>
                    {!isCollapsed && (
                      <div style={{ display: 'flex', alignItems: 'center' }}>{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>
                    )}
                  </button>
                  
                  {isExpanded && !isCollapsed && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', paddingLeft: '0.85rem', marginTop: '0.15rem' }}>
                      {item.subItems.map((subItem) => {
                        const isSubActive = subItem.path !== '#' && location.pathname.startsWith(subItem.path);
                        return (
                          <Link 
                            key={subItem.name}
                            to={subItem.path}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.35rem 0.65rem',
                              borderRadius: 'var(--radius-md)',
                              color: isSubActive ? 'var(--primary)' : 'var(--text-secondary)',
                              backgroundColor: isSubActive ? 'var(--primary-light)' : 'transparent',
                              fontWeight: isSubActive ? '600' : '500',
                              transition: 'var(--transition)',
                              fontSize: '0.75rem'
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
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '18px' }}>{subItem.icon}</div>
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
                  gap: '0.6rem',
                  padding: isCollapsed ? '0.45rem' : '0.42rem 0.65rem',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '0.8125rem',
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
                  display: 'flex', alignItems: 'center', gap: '0.6rem', flex: isCollapsed ? 0 : 1 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px' }}>{item.icon}</div>
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
                    padding: item.badge === 'DEMO' ? '1px 5px' : '0',
                    borderRadius: item.badge === 'DEMO' ? '10px' : '0',
                    fontWeight: 'bold',
                    fontSize: item.badge === 'DEMO' ? '0.625rem' : '0.8125rem',
                    marginLeft: 'auto'
                  }}>
                    {item.badge}
                  </div>
                )}
                {item.badge && isCollapsed && (
                  <div style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    backgroundColor: item.badge === 'DEMO' ? 'var(--primary)' : 'var(--danger)',
                    color: 'white',
                    fontSize: item.badge === 'DEMO' ? '0.5rem' : '0.625rem',
                    fontWeight: 'bold',
                    width: item.badge === 'DEMO' ? 'auto' : '14px',
                    height: '14px',
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
                    fontSize: '0.625rem',
                    fontWeight: 'bold',
                    padding: unreadCount > 0 && !isCollapsed ? '0.1rem 0.4rem' : '0',
                    borderRadius: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    justifyContent: 'center',
                    position: isCollapsed ? 'absolute' : 'static',
                    right: isCollapsed ? '6px' : 'auto',
                    top: isCollapsed ? '6px' : 'auto',
                    minWidth: '18px',
                    transition: 'var(--transition)'
                  }}>
                    {unreadCount > 0 ? (
                      isCollapsed ? (
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--danger)' }} title={`${unreadCount} notificações`} />
                      ) : (
                        <><Bell size={12} fill="currentColor" /> {unreadCount}</>
                      )
                    ) : (
                      !isCollapsed && <Bell size={14} />
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
        padding: isCollapsed ? '0.5rem 0.35rem' : '0.5rem 0.6rem',
        backgroundColor: 'var(--secondary-light)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.35rem',
        transition: 'padding 0.3s'
      }}>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: isCollapsed ? 'center' : 'stretch' }}>
          <div style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '0.5rem', marginBottom: '0.2rem', padding: isCollapsed ? '0.2rem 0' : '0 0.35rem' }}
                title={isCollapsed ? "Sistema Online" : ""}
          >
            <div style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: 'var(--secondary)',
              boxShadow: '0 0 0 2px var(--surface), 0 0 0 3px var(--secondary-light)',
              flexShrink: 0
            }} />
            {!isCollapsed && (
              <span style={{ fontSize: '0.75rem', color: 'var(--secondary-hover)', fontWeight: '500', whiteSpace: 'nowrap' }}>
                Sistema Online
              </span>
            )}
          </div>
          <div style={{ width: '100%', height: '1px', backgroundColor: 'var(--border)', margin: '0.25rem 0' }} />
          
          {activeLink && (
            <button 
              onClick={() => setActiveLink(null)}
              title={isCollapsed ? "Alterar Vínculo" : ""}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '0.45rem', width: '100%',
                padding: '0.32rem 0.45rem', background: 'transparent', border: 'none',
                color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem',
                fontWeight: '600', transition: 'var(--transition)', borderRadius: 'var(--radius-sm)',
                marginBottom: '0.15rem'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary-light)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <Users size={14} style={{ flexShrink: 0 }} /> 
              {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Alterar Vínculo</span>}
            </button>
          )}

          <button 
            onClick={signOut}
            title={isCollapsed ? "Sair do Sistema" : ""}
            style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '0.45rem', width: '100%',
              padding: '0.32rem 0.45rem', background: 'transparent', border: 'none',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem',
              fontWeight: '500', transition: 'var(--transition)', borderRadius: 'var(--radius-sm)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.color = 'var(--danger)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <LogOut size={14} style={{ flexShrink: 0 }} /> 
            {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Sair do Sistema</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
