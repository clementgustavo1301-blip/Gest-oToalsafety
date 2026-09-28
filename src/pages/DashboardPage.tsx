import React, { useState } from 'react';
import {
  Activity, Truck, Building2, FileText, CheckCircle2,
  AlertTriangle, Clock, Plus, Eye, BarChart3, PieChart as PieIcon
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import type { Campaign, PartnerAppointment } from '../types';
import { fmtCurrency, fmtDate } from '../utils/format';

interface DashboardPageProps {
  campaigns: Campaign[];
  partners: PartnerAppointment[];
  onNewCampaign: () => void;
  onNewPartner: () => void;
}

const PIE_COLORS = ['#00d68f', '#ffab00', '#ff3366', '#0066ff'];

export const DashboardPage: React.FC<DashboardPageProps> = ({
  campaigns,
  partners,
  onNewCampaign,
  onNewPartner
}) => {
  const navigate = useNavigate();
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'month' | 'urgent'>('all');

  // Filter calculations
  const filteredCampaigns = campaigns.filter(c => {
    if (filterPeriod === 'all') return true;
    if (filterPeriod === 'urgent') return c.eventType === 'campanha' && (!c.kitReady || (!c.insertedSOC && c.attendedCount > 0));
    // Month filter (October / current month)
    return c.date.startsWith('2026-10');
  });

  const onlyCampaigns = filteredCampaigns.filter(c => c.eventType === 'campanha');

  const totalExpected = onlyCampaigns.reduce((s, c) => s + c.expectedCount, 0);
  const totalAttended = onlyCampaigns.reduce((s, c) => s + c.attendedCount, 0);
  const kitsNotReady = onlyCampaigns.filter(c => !c.kitReady).length;
  const awaitingSOC = onlyCampaigns.filter(c => !c.insertedSOC && c.attendedCount > 0).length;
  const totalPartnersValue = partners.reduce((s, p) => s + p.value, 0);
  const unpaidPartners = partners.filter(p => !p.paid).length;

  // Chart data
  const barData = onlyCampaigns.slice(0, 7).map(c => ({
    name: c.company.length > 14 ? c.company.substring(0, 14) + '…' : c.company,
    Previstos: c.expectedCount,
    Atendidos: c.attendedCount,
  }));

  const insertedCount = onlyCampaigns.filter(c => c.insertedSOC).length;
  const scannedOnlyCount = onlyCampaigns.filter(c => c.scanned && !c.insertedSOC).length;
  const pendingCount = onlyCampaigns.filter(c => !c.scanned && c.attendedCount > 0).length;

  const pieData = [
    { name: 'Integrados no SOC', value: insertedCount || 1 },
    { name: 'Apenas Escaneados', value: scannedOnlyCount || 0 },
    { name: 'Aguardando Escaneamento', value: pendingCount || 0 },
  ].filter(d => d.value > 0);

  // Urgent action items
  const urgentKits = filteredCampaigns.filter(c => !c.kitReady);
  const urgentSOC = filteredCampaigns.filter(c => c.attendedCount > 0 && !c.insertedSOC);

  return (
    <div className="page-wrapper dashboard-view">
      {/* Top action & filter bar */}
      <div className="dashboard-controls-bar">
        <div className="period-filter-tabs">
          <button
            className={`filter-tab ${filterPeriod === 'all' ? 'active' : ''}`}
            onClick={() => setFilterPeriod('all')}
          >
            Visão Geral Completa ({campaigns.filter(c => c.eventType === 'campanha').length})
          </button>
          <button
            className={`filter-tab ${filterPeriod === 'month' ? 'active' : ''}`}
            onClick={() => setFilterPeriod('month')}
          >
            Mês de Outubro ({campaigns.filter(c => c.date.startsWith('2026-10') && c.eventType === 'campanha').length})
          </button>
          <button
            className={`filter-tab ${filterPeriod === 'urgent' ? 'active' : ''}`}
            onClick={() => setFilterPeriod('urgent')}
          >
            ⚠️ Atenção Operacional ({campaigns.filter(c => c.eventType === 'campanha' && (!c.kitReady || (!c.insertedSOC && c.attendedCount > 0))).length})
          </button>
        </div>

        <div className="quick-actions-group">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/ipa/calendar')}>
            <Clock size={15} /> Ver Agenda Completa
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onNewPartner}>
            <Plus size={15} /> Novo Parceiro
          </button>
          <button className="btn btn-primary btn-sm" onClick={onNewCampaign}>
            <Plus size={15} /> Nova Campanha
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="dashboard-grid stats-container">
        <div className="card stat-card stat-primary">
          <div className="stat-card-header">
            <div>
              <span className="label">CAMPANHAS & ATENDIMENTOS</span>
              <div className="value-group">
                <span className="value">{campaigns.filter(c => c.eventType === 'campanha').length}</span>
                <span className="value-badge success">{totalAttended} realizados</span>
              </div>
            </div>
            <div className="stat-icon-wrapper bg-blue-dim text-blue">
              <Activity size={22} />
            </div>
          </div>
          <div className="stat-progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${totalExpected > 0 ? Math.min(100, Math.round((totalAttended / totalExpected) * 100)) : 0}%` }}
            />
          </div>
          <span className="stat-footer-text">
            {totalExpected} exames previstos no ciclo ({totalExpected > 0 ? Math.round((totalAttended / totalExpected) * 100) : 0}% executado)
          </span>
        </div>

        <div className="card stat-card stat-warning" onClick={() => navigate('/ipa/campaigns')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-header">
            <div>
              <span className="label">KITS PENDENTES DE MONTAGEM</span>
              <div className="value-group">
                <span className="value text-amber">{kitsNotReady}</span>
                <span className="value-badge warning">Ação Imediata</span>
              </div>
            </div>
            <div className="stat-icon-wrapper bg-amber-dim text-amber">
              <Truck size={22} />
            </div>
          </div>
          <span className="stat-footer-text">
            {kitsNotReady === 0 ? '✓ Todos os kits foram conferidos e liberados' : 'Separar insumos, tubos e guias antes da saída da unidade'}
          </span>
        </div>

        <div className="card stat-card stat-danger" onClick={() => navigate('/ipa/reports')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-header">
            <div>
              <span className="label">AGUARDANDO INSERÇÃO SOC</span>
              <div className="value-group">
                <span className="value text-rose">{awaitingSOC}</span>
                <span className="value-badge danger">Pendentes</span>
              </div>
            </div>
            <div className="stat-icon-wrapper bg-rose-dim text-rose">
              <FileText size={22} />
            </div>
          </div>
          <span className="stat-footer-text">
            {awaitingSOC === 0 ? '✓ Sistema SOC 100% atualizado' : 'Exames já realizados aguardando input no sistema SGS/SOC'}
          </span>
        </div>

        <div className="card stat-card stat-success" onClick={() => navigate('/ipa/partners')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-header">
            <div>
              <span className="label">REDE CREDENCIADA (PARCEIRAS)</span>
              <div className="value-group">
                <span className="value text-emerald">{partners.length}</span>
                <span className="value-badge success">{fmtCurrency(totalPartnersValue)}</span>
              </div>
            </div>
            <div className="stat-icon-wrapper bg-emerald-dim text-emerald">
              <Building2 size={22} />
            </div>
          </div>
          <span className="stat-footer-text">
            {unpaidPartners > 0 ? `${unpaidPartners} agendamentos com fatura em aberto` : 'Todas as faturas conferidas'}
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="dashboard-grid charts-grid">
        <div className="card chart-card">
          <div className="card-header-row">
            <div>
              <h3 className="card-title">
                <BarChart3 size={18} className="text-blue" />
                Comparativo: Previsto vs Atendido por Campanha
              </h3>
              <p className="card-subtitle">Volume de trabalhadores participantes em cada evento</p>
            </div>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" fontSize={11} tick={{ fill: 'var(--t40)' }} />
                <YAxis fontSize={11} tick={{ fill: 'var(--t40)' }} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'var(--s3)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    color: 'var(--t100)',
                    boxShadow: 'var(--sh3)'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Previstos" fill="#2d3748" radius={[4, 4, 0, 0]} name="Previstos" />
                <Bar dataKey="Atendidos" fill="#0066ff" radius={[4, 4, 0, 0]} name="Atendidos (Real)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <div className="card-header-row">
            <div>
              <h3 className="card-title">
                <PieIcon size={18} className="text-cyan" />
                Pipeline de Digitalização & Lançamento de ASOs
              </h3>
              <p className="card-subtitle">Fluxo de retorno de guias e entrada no prontuário eletrônico</p>
            </div>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={290}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'var(--s3)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    color: 'var(--t100)'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Operational Watchlist / Action Items */}
      <div className="card watchlist-card">
        <div className="card-header-row">
          <div>
            <h3 className="card-title">
              <AlertTriangle size={18} className="text-amber" />
              Painel de Alertas Operacionais Imediatos
            </h3>
            <p className="card-subtitle">Campanhas e encaminhamentos que exigem ação da equipe hoje</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/ipa/campaigns')}>
            <Eye size={14} /> Abrir Módulo de Campanhas
          </button>
        </div>

        <div className="watchlist-grid">
          <div className="watchlist-col">
            <div className="watchlist-col-title">
              <span className="dot dot-amber" />
              <span>Kits que Necessitam Montagem ({urgentKits.length})</span>
            </div>
            {urgentKits.length === 0 ? (
              <div className="empty-mini-alert">
                <CheckCircle2 size={16} className="text-emerald" /> Todos os kits estão prontos!
              </div>
            ) : (
              <div className="watchlist-items-list">
                {urgentKits.map(c => (
                  <div key={c.id} className="watchlist-item" onClick={() => navigate('/ipa/campaigns')}>
                    <div className="item-info">
                      <strong>{c.company}</strong>
                      <span>Data: {fmtDate(c.date)} • {c.location}</span>
                    </div>
                    <span className="badge warning">Separar Kit</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="watchlist-col">
            <div className="watchlist-col-title">
              <span className="dot dot-rose" />
              <span>Pendentes de Lançamento SOC ({urgentSOC.length})</span>
            </div>
            {urgentSOC.length === 0 ? (
              <div className="empty-mini-alert">
                <CheckCircle2 size={16} className="text-emerald" /> Nenhuma pendência de lançamento no SOC!
              </div>
            ) : (
              <div className="watchlist-items-list">
                {urgentSOC.map(c => (
                  <div key={c.id} className="watchlist-item" onClick={() => navigate('/ipa/campaigns')}>
                    <div className="item-info">
                      <strong>{c.company}</strong>
                      <span>{c.attendedCount} atendidos • Retorno: {c.returnedAsos} ASOs</span>
                    </div>
                    <span className="badge danger">Lançar SOC</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
