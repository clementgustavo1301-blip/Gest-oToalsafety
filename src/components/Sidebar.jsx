import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Database,
  FileBadge2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Map,
  MessageSquareText,
  Moon,
  Package,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Tv,
  Users,
  WandSparkles,
  Wrench,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAI } from '../context/AIContext';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../lib/supabase';

const routeIsActive = (pathname, path) => {
  if (path === '/' || path === '/ipa') return pathname === path;
  return pathname.startsWith(path);
};

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { signOut, activeLink, setActiveLink } = useAuth();
  const { unreadCount } = useAI();
  const { isDark, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [expandedMenus, setExpandedMenus] = useState({});
  const [pendingTeamCount, setPendingTeamCount] = useState(0);

  const isAdminDiretoria = (activeLink?.role === 'Admin' && activeLink?.sector === 'Diretoria') || activeLink?.sector === 'IPA';
  const isClinicaOrAdmin = activeLink?.sector === 'Clínica' || isAdminDiretoria;
  const isSSTOrAdmin = activeLink?.sector === 'SST' || isAdminDiretoria;
  const isTreinamento = activeLink?.sector === 'Treinamento';

  useEffect(() => {
    try {
      localStorage.setItem('sidebar_collapsed', String(isCollapsed));
    } catch {
      // The layout still works if storage is unavailable.
    }
  }, [isCollapsed]);

  useEffect(() => {
    onClose?.();
  }, [location.pathname, onClose]);

  useEffect(() => {
    if (!isAdminDiretoria) return undefined;

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

    return () => supabase.removeChannel(subscription);
  }, [isAdminDiretoria]);

  const navItems = useMemo(() => isTreinamento ? [
    { name: 'Treinamentos & Turmas', path: '/training-certificates', icon: GraduationCap }
  ] : [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    ...(activeLink?.sector === 'IPA' ? [{
      name: 'Painel IPA',
      icon: Tv,
      badge: 'IPA',
      subItems: [
        { name: 'Dashboard operacional', path: '/ipa', icon: LayoutDashboard },
        { name: 'TV / War Room', path: '/ipa/tv', icon: Tv },
        { name: 'Calendário & agenda', path: '/ipa/calendar', icon: CalendarDays },
        { name: 'Itinerários & mapa', path: '/ipa/map', icon: Map },
        { name: 'Unidade móvel', path: '/ipa/campaigns', icon: Building2 },
        { name: 'Clínicas parceiras', path: '/ipa/partners', icon: Building2 },
        { name: 'Relatórios IPA', path: '/ipa/reports', icon: FileText }
      ]
    }] : []),
    { name: 'Empresas', path: '/companies', icon: Building2 },
    { name: 'Calendário', path: '/calendar', icon: CalendarDays },
    { name: 'Entregáveis', path: '/deliverables', icon: ClipboardCheck },
    {
      name: 'Ferramentas',
      icon: Wrench,
      subItems: [
        ...(isAdminDiretoria ? [{ name: 'Convocações', path: '/convocations', icon: ClipboardList }] : []),
        { name: 'Contatos', path: '/contacts', icon: Users },
        { name: 'Cronograma', path: '/schedule-generator', icon: WandSparkles },
        ...(isClinicaOrAdmin ? [{ name: 'Modelos de mensagem', path: '/exams-budget', icon: MessageSquareText }] : []),
        ...(isSSTOrAdmin ? [{ name: 'Gestão de CATs', path: '/cat', icon: FileBadge2 }] : []),
        ...(isSSTOrAdmin ? [{ name: 'Certificados SST', path: '/certificates', icon: ShieldCheck }] : []),
        ...(isSSTOrAdmin ? [{ name: 'Estoque', path: '/inventory', icon: Package }] : []),
        ...(isAdminDiretoria ? [
          { name: 'Relatórios', path: '/reports', icon: BarChart3 },
          { name: 'Armazenamento', path: '/storage', icon: Database }
        ] : [])
      ]
    },
    { name: 'Assistente IA', path: '/ai-assistant', icon: Sparkles, count: unreadCount },
    { name: 'Configurações', path: '/settings', icon: Settings },
    ...(isAdminDiretoria ? [{
      name: 'Equipe e acessos',
      path: '/team',
      icon: ShieldCheck,
      count: pendingTeamCount
    }] : [])
  ], [activeLink?.sector, isAdminDiretoria, isClinicaOrAdmin, isSSTOrAdmin, isTreinamento, pendingTeamCount, unreadCount]);

  const toggleMenu = (name, isExpanded) => {
    if (isCollapsed) setIsCollapsed(false);
    setExpandedMenus(current => ({ ...current, [name]: !isExpanded }));
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''} ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar__brand">
        <div className="sidebar__brand-wrapper">
          <img className="sidebar__logo" src="/logo-totalsafety.png" alt="TotalSafety" />
          {activeLink && (
            <span className="sidebar__brand-meta" title={`${activeLink.sector} · ${activeLink.role}`}>
              {activeLink.sector} • {activeLink.role}
            </span>
          )}
        </div>
        <span className="sidebar__logo-mark" aria-hidden="true">TS</span>
        <button className="sidebar__collapse hide-on-mobile" onClick={() => setIsCollapsed(value => !value)} title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}>
          {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
        <button className="sidebar__close hide-on-desktop" onClick={onClose} aria-label="Fechar menu">
          <X size={16} />
        </button>
      </div>

      <div className="sidebar__section-label">Navegação</div>
      <nav className="sidebar__nav" aria-label="Navegação principal">
        {navItems.map(item => {
          const Icon = item.icon;

          if (item.subItems) {
            const active = item.subItems.some(sub => routeIsActive(location.pathname, sub.path));
            const expanded = expandedMenus[item.name] ?? active;
            return (
              <div className="sidebar__group" key={item.name}>
                <button className={`sidebar__item ${active ? 'is-active' : ''}`} onClick={() => toggleMenu(item.name, expanded)} title={isCollapsed ? item.name : undefined} aria-expanded={expanded}>
                  <span className="sidebar__item-icon"><Icon size={15} /></span>
                  <span className="sidebar__item-label">{item.name}</span>
                  {item.badge && <span className="sidebar__badge sidebar__badge--soft">{item.badge}</span>}
                  <ChevronDown className={`sidebar__chevron ${expanded ? 'is-open' : ''}`} size={13} />
                </button>

                {expanded && (
                  <div className="sidebar__submenu">
                    {item.subItems.map(subItem => {
                      const SubIcon = subItem.icon;
                      const subActive = routeIsActive(location.pathname, subItem.path);
                      return (
                        <Link className={`sidebar__subitem ${subActive ? 'is-active' : ''}`} key={subItem.name} to={subItem.path}>
                          <SubIcon size={13} />
                          <span>{subItem.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active = routeIsActive(location.pathname, item.path);
          return (
            <Link className={`sidebar__item ${active ? 'is-active' : ''}`} key={item.name} to={item.path} title={isCollapsed ? item.name : undefined}>
              <span className="sidebar__item-icon"><Icon size={15} /></span>
              <span className="sidebar__item-label">{item.name}</span>
              {item.count > 0 && <span className="sidebar__badge">{item.count > 99 ? '99+' : item.count}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar__footer">
        <button className="sidebar__utility" onClick={toggleTheme} title={isDark ? 'Usar tema claro' : 'Usar tema escuro'}>
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
          <span>{isDark ? 'Modo claro' : 'Modo escuro'}</span>
        </button>
        <button className="sidebar__utility" onClick={() => setActiveLink(null)} title="Alterar vínculo">
          <Users size={14} />
          <span>Alterar vínculo</span>
        </button>
        <button className="sidebar__utility sidebar__utility--danger" onClick={signOut} title="Sair do sistema">
          <LogOut size={14} />
          <span>Sair do sistema</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
