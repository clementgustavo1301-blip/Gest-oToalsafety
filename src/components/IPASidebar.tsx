import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity, LayoutDashboard, Truck, Building2,
  CalendarDays, Map as MapIcon, FileText, ChevronRight, Tv
} from 'lucide-react';
import type { Campaign, PartnerAppointment } from '../types';

interface SidebarProps {
  campaigns: Campaign[];
  partners: PartnerAppointment[];
}

export const Sidebar: React.FC<SidebarProps> = ({ campaigns, partners }) => {
  const pendingKits = campaigns.filter(c => !c.kitReady).length;
  const pendingSOC = campaigns.filter(c => !c.insertedSOC && c.attendedCount > 0).length;
  const pendingInvoices = partners.filter(p => !p.paid).length;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">
          <Activity size={24} />
        </div>
        <div className="sidebar-logo-text">
          <span className="brand-title">SISTEMA IPA</span>
          <span className="brand-subtitle">Saúde & Gestão Ocupacional</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-group-title">OPERAÇÃO EM TEMPO REAL</div>

        <NavLink to="/ipa" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={18} />
          <span className="nav-label">Dashboard Operacional</span>
          <ChevronRight size={14} className="nav-arrow" />
        </NavLink>

        <NavLink to="/ipa/tv" className={({ isActive }) => `nav-item tv-nav-item ${isActive ? 'active' : ''}`}>
          <Tv size={18} className="text-cyan" />
          <span className="nav-label">Central de Controle (TV)</span>
          <span className="nav-counter live-pulse-badge">WAR ROOM</span>
        </NavLink>

        <NavLink to="/ipa/calendar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <CalendarDays size={18} />
          <span className="nav-label">Calendário & Agenda</span>
          <span className="nav-counter info">{campaigns.length + partners.length}</span>
        </NavLink>

        <NavLink to="/ipa/map" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <MapIcon size={18} />
          <span className="nav-label">Itinerários & Mapa</span>
          <ChevronRight size={14} className="nav-arrow" />
        </NavLink>

        <div className="nav-group-title" style={{ marginTop: '16px' }}>GESTÃO DE ATENDIMENTOS</div>

        <NavLink to="/ipa/campaigns" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Truck size={18} />
          <span className="nav-label">Unidade Móvel / Eventos</span>
          {pendingKits > 0 && (
            <span className="nav-counter warning" title={`${pendingKits} kits pendentes`}>
              {pendingKits} kit
            </span>
          )}
        </NavLink>

        <NavLink to="/ipa/partners" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Building2 size={18} />
          <span className="nav-label">Clínicas Parceiras</span>
          {pendingInvoices > 0 && (
            <span className="nav-counter danger" title={`${pendingInvoices} pagamentos pendentes`}>
              {pendingInvoices}
            </span>
          )}
        </NavLink>

        <NavLink to="/ipa/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <FileText size={18} />
          <span className="nav-label">Relatórios Gerenciais</span>
          <ChevronRight size={14} className="nav-arrow" />
        </NavLink>
      </nav>

      {/* Operational mini status widget */}
      <div className="sidebar-status-box">
        <div className="status-indicator-row">
          <span className="pulse-dot" />
          <span className="status-text">Servidor Online</span>
        </div>
        <div className="status-metrics-mini">
          <div className="mini-metric">
            <span className="mini-num">{pendingSOC}</span>
            <span className="mini-label">Pendente SOC</span>
          </div>
          <div className="mini-divider" />
          <div className="mini-metric">
            <span className="mini-num">{campaigns.length}</span>
            <span className="mini-label">Campanhas</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px 16px', marginTop: 'auto' }}>
        <a href="/" className="nav-item" style={{ color: 'var(--text-secondary)' }}>
          <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
          <span className="nav-label">Voltar ao Menu</span>
        </a>
      </div>
    </aside>
  );
};
