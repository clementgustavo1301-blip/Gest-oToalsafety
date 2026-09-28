import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Bell, Calendar as CalendarIcon, ShieldCheck, Tv } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onNewCampaign?: () => void;
  onNewPartner?: () => void;
  pendingAlertsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onNewCampaign,
  onNewPartner,
  pendingAlertsCount = 0
}) => {
  const navigate = useNavigate();
  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <header className="global-header">
      <div className="header-left">
        <h1 className="header-title">{title}</h1>
        {subtitle && <p className="header-subtitle">{subtitle}</p>}
      </div>

      <div className="header-right">
        <div className="header-date-badge">
          <CalendarIcon size={14} />
          <span>{todayFormatted}</span>
        </div>

        <div className="header-soc-badge" title="Conexão com SOC / SGS ativa">
          <ShieldCheck size={14} className="text-emerald" />
          <span>SOC Sync Ativo</span>
        </div>

        {pendingAlertsCount > 0 && (
          <div className="header-alert-pill" title={`${pendingAlertsCount} pendências requerem atenção`}>
            <Bell size={14} />
            <span>{pendingAlertsCount} pendência{pendingAlertsCount > 1 ? 's' : ''}</span>
          </div>
        )}

        <div className="header-actions">
          <button
            className="btn btn-secondary btn-tv-launch"
            onClick={() => navigate('/ipa/tv')}
            title="Abrir Central de Controle para TV da Sala"
          >
            <Tv size={15} className="text-cyan" /> Modo TV
          </button>
          {onNewCampaign && (
            <button className="btn btn-primary" onClick={onNewCampaign}>
              <Plus size={16} /> Nova Campanha
            </button>
          )}
          {onNewPartner && (
            <button className="btn btn-secondary" onClick={onNewPartner}>
              <Plus size={16} /> Novo Parceiro
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
