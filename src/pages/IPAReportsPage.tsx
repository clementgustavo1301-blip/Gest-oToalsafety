import React, { useState } from 'react';
import {
  Printer, Download, TrendingUp, DollarSign, ShieldAlert
} from 'lucide-react';
import type { Campaign, PartnerAppointment, ToastType } from '../types';
import { fmtDate, fmtCurrency, exportToCSV } from '../utils/format';

interface ReportsPageProps {
  campaigns: Campaign[];
  partners: PartnerAppointment[];
  showToast: (msg: string, type: ToastType) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  campaigns,
  partners,
  showToast,
}) => {
  const [activeReportTab, setActiveReportTab] = useState<'prod' | 'scan' | 'fin'>('prod');

  // Calculations for Prod
  const executedCampaigns = campaigns.filter(c => c.attendedCount > 0);
  const totalPrevisto = campaigns.reduce((s, c) => s + c.expectedCount, 0);
  const totalRealizado = campaigns.reduce((s, c) => s + c.attendedCount, 0);
  const taxaGeral = totalPrevisto > 0 ? Math.round((totalRealizado / totalPrevisto) * 100) : 0;

  // Calculations for Scan / SOC
  const pendingScans = campaigns.filter(c => c.attendedCount > 0 && !c.scanned);
  const pendingSOC = campaigns.filter(c => c.scanned && !c.insertedSOC);
  const fullSOC = campaigns.filter(c => c.insertedSOC);

  // Calculations for Financial
  const totalValue = partners.reduce((s, p) => s + p.value, 0);
  const paidValue = partners.filter(p => p.paid).reduce((s, p) => s + p.value, 0);
  const unpaidPartners = partners.filter(p => !p.paid);
  const unpaidTotal = unpaidPartners.reduce((s, p) => s + p.value, 0);

  // Export current active report
  const handleExportCurrent = () => {
    if (activeReportTab === 'prod') {
      const data = campaigns.map(c => ({
        Empresa: c.company,
        Data: fmtDate(c.date),
        Local: c.location,
        'Previstos': c.expectedCount,
        'Atendidos': c.attendedCount,
        'Comparecimento %': c.expectedCount > 0 ? `${Math.round((c.attendedCount / c.expectedCount) * 100)}%` : '0%',
      }));
      exportToCSV(`relatorio_produtividade_${new Date().toISOString().slice(0, 10)}.csv`, data);
    } else if (activeReportTab === 'scan') {
      const data = campaigns.map(c => ({
        Empresa: c.company,
        Data: fmtDate(c.date),
        Atendidos: c.attendedCount,
        'ASOs Físicos': c.returnedAsos,
        'Escaneado?': c.scanned ? 'Sim' : 'Não',
        'Lançado SOC?': c.insertedSOC ? 'Sim' : 'Não',
      }));
      exportToCSV(`relatorio_digitalizacao_soc_${new Date().toISOString().slice(0, 10)}.csv`, data);
    } else {
      const data = partners.map(p => ({
        Cliente: p.client,
        Clinica: p.partnerClinic,
        UF: p.state,
        Data: fmtDate(p.date),
        Valor: fmtCurrency(p.value),
        Status: p.paid ? 'Pago' : 'Pendente',
        'Ref NF': p.invoiceRef || '-',
      }));
      exportToCSV(`relatorio_financeiro_parceiras_${new Date().toISOString().slice(0, 10)}.csv`, data);
    }
    showToast('Relatório exportado em formato CSV!', 'success');
  };

  return (
    <div className="page-wrapper reports-page-layout">
      {/* Report Tabs Selector */}
      <div className="reports-nav-grid">
        <div
          className={`report-selector-card ${activeReportTab === 'prod' ? 'active' : ''}`}
          onClick={() => setActiveReportTab('prod')}
        >
          <div className="selector-icon bg-blue-dim text-blue">
            <TrendingUp size={22} />
          </div>
          <div className="selector-content">
            <h4>Produtividade & Execução</h4>
            <p>Comparativo entre vidas previstas e atendimentos realizados em campo</p>
            <span className="selector-badge">{taxaGeral}% de adesão geral</span>
          </div>
        </div>

        <div
          className={`report-selector-card ${activeReportTab === 'scan' ? 'active' : ''}`}
          onClick={() => setActiveReportTab('scan')}
        >
          <div className="selector-icon bg-amber-dim text-amber">
            <ShieldAlert size={22} />
          </div>
          <div className="selector-content">
            <h4>Digitalização & Lançamento SOC</h4>
            <p>Controle do fluxo de guias físicas, escaneamento e input no sistema SOC</p>
            <span className="selector-badge warning">
              {pendingScans.length + pendingSOC.length} pendências em aberto
            </span>
          </div>
        </div>

        <div
          className={`report-selector-card ${activeReportTab === 'fin' ? 'active' : ''}`}
          onClick={() => setActiveReportTab('fin')}
        >
          <div className="selector-icon bg-emerald-dim text-emerald">
            <DollarSign size={22} />
          </div>
          <div className="selector-content">
            <h4>Financeiro — Clínicas Credenciadas</h4>
            <p>Faturamento, repasses e cobranças da rede credenciada em todo o país</p>
            <span className="selector-badge emerald">
              {fmtCurrency(unpaidTotal)} pendente
            </span>
          </div>
        </div>
      </div>

      {/* Report Header Actions */}
      <div className="card report-main-card">
        <div className="report-card-header-bar">
          <div>
            <h3 className="report-main-title">
              {activeReportTab === 'prod' && 'Relatório Detalhado de Produtividade em Campo'}
              {activeReportTab === 'scan' && 'Painel de Acompanhamento de Digitalização e SOC'}
              {activeReportTab === 'fin' && 'Demonstrativo Financeiro de Clínicas Parceiras'}
            </h3>
            <p className="report-main-subtitle">
              Emissão gerada em {new Date().toLocaleDateString('pt-BR')} • Dados consolidados da operação
            </p>
          </div>

          <div className="report-header-buttons">
            <button className="btn btn-secondary btn-sm" onClick={handleExportCurrent}>
              <Download size={15} /> Exportar CSV
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
              <Printer size={15} /> Imprimir Relatório
            </button>
          </div>
        </div>

        {/* Tab 1: Produtividade */}
        {activeReportTab === 'prod' && (
          <div className="report-body-section">
            <div className="report-kpi-row">
              <div className="report-kpi-box">
                <span className="kpi-label">Vidas Previstas</span>
                <span className="kpi-value">{totalPrevisto}</span>
              </div>
              <div className="report-kpi-box">
                <span className="kpi-label">Exames Realizados</span>
                <span className="kpi-value text-emerald">{totalRealizado}</span>
              </div>
              <div className="report-kpi-box">
                <span className="kpi-label">Comparecimento Médio</span>
                <span className="kpi-value text-cyan">{taxaGeral}%</span>
              </div>
              <div className="report-kpi-box">
                <span className="kpi-label">Campanhas Executadas</span>
                <span className="kpi-value">{executedCampaigns.length} / {campaigns.length}</span>
              </div>
            </div>

            <div className="table-container" style={{ marginTop: '20px' }}>
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>Empresa Contratante</th>
                    <th>Data</th>
                    <th>Município / Local</th>
                    <th>Vidas Previstas</th>
                    <th>Atendidos</th>
                    <th>Taxa de Adesão</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => {
                    const rate = c.expectedCount > 0 ? Math.round((c.attendedCount / c.expectedCount) * 100) : 0;
                    return (
                      <tr key={c.id}>
                        <td><strong>{c.company}</strong></td>
                        <td>{fmtDate(c.date)}</td>
                        <td>{c.location}</td>
                        <td>{c.expectedCount} vidas</td>
                        <td>{c.attendedCount} vidas</td>
                        <td>
                          <div className="progress-cell-wrap">
                            <span className="progress-num font-tabular">{rate}%</span>
                            <div className="mini-track">
                              <div
                                className="mini-bar"
                                style={{
                                  width: `${Math.min(100, rate)}%`,
                                  backgroundColor: rate >= 90 ? 'var(--ok)' : rate >= 60 ? 'var(--warn)' : 'var(--blue)'
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${rate >= 90 ? 'success' : rate > 0 ? 'warning' : 'neutral'}`}>
                            {rate >= 90 ? 'Excelente' : rate > 0 ? 'Regular' : 'Programada'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Digitalização & SOC */}
        {activeReportTab === 'scan' && (
          <div className="report-body-section">
            <div className="report-kpi-row">
              <div className="report-kpi-box">
                <span className="kpi-label">Aguardando Escaneamento</span>
                <span className="kpi-value text-amber">{pendingScans.length}</span>
              </div>
              <div className="report-kpi-box">
                <span className="kpi-label">Escaneados (Fora do SOC)</span>
                <span className="kpi-value text-rose">{pendingSOC.length}</span>
              </div>
              <div className="report-kpi-box">
                <span className="kpi-label">100% Integrados no SOC</span>
                <span className="kpi-value text-emerald">{fullSOC.length}</span>
              </div>
              <div className="report-kpi-box">
                <span className="kpi-label">Taxa de Conclusão</span>
                <span className="kpi-value text-cyan">
                  {campaigns.length > 0 ? Math.round((fullSOC.length / campaigns.length) * 100) : 0}%
                </span>
              </div>
            </div>

            <div className="table-container" style={{ marginTop: '20px' }}>
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Data Atendimento</th>
                    <th>Atendidos</th>
                    <th>ASOs Físicos</th>
                    <th>Digitalização (Scan)</th>
                    <th>Inserção no SOC</th>
                    <th>Situação do Fluxo</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => {
                    const isFullyDone = c.insertedSOC;
                    const isScanPending = c.attendedCount > 0 && !c.scanned;
                    const isSocPending = c.scanned && !c.insertedSOC;

                    return (
                      <tr key={c.id}>
                        <td><strong>{c.company}</strong></td>
                        <td>{fmtDate(c.date)}</td>
                        <td>{c.attendedCount}</td>
                        <td>{c.returnedAsos || '-'}</td>
                        <td>
                          {c.scanned ? (
                            <span className="badge success">✓ Escaneado</span>
                          ) : (
                            <span className="badge danger">Pendente</span>
                          )}
                        </td>
                        <td>
                          {c.insertedSOC ? (
                            <span className="badge success">✓ Inserido no SOC</span>
                          ) : (
                            <span className="badge danger">Pendente</span>
                          )}
                        </td>
                        <td>
                          {isFullyDone ? (
                            <span className="flow-status ok">Concluído & Arquivado</span>
                          ) : isSocPending ? (
                            <span className="flow-status warn">Aguardando Input SOC</span>
                          ) : isScanPending ? (
                            <span className="flow-status err">Pendente de Escaneamento</span>
                          ) : (
                            <span className="flow-status neutral">Aguardando Atendimento</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Financeiro Parceiras */}
        {activeReportTab === 'fin' && (
          <div className="report-body-section">
            <div className="report-kpi-row">
              <div className="report-kpi-box">
                <span className="kpi-label">Volume Total Contratado</span>
                <span className="kpi-value text-cyan">{fmtCurrency(totalValue)}</span>
              </div>
              <div className="report-kpi-box">
                <span className="kpi-label">Faturas Liquidadas</span>
                <span className="kpi-value text-emerald">{fmtCurrency(paidValue)}</span>
              </div>
              <div className="report-kpi-box">
                <span className="kpi-label">Total a Liquidar</span>
                <span className="kpi-value text-amber">{fmtCurrency(unpaidTotal)}</span>
              </div>
              <div className="report-kpi-box">
                <span className="kpi-label">Atendimentos Pendentes</span>
                <span className="kpi-value text-rose">{unpaidPartners.length} de {partners.length}</span>
              </div>
            </div>

            <div className="table-container" style={{ marginTop: '20px' }}>
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>Cliente Contratante</th>
                    <th>Clínica Credenciada</th>
                    <th>UF</th>
                    <th>Data Atendimento</th>
                    <th>Valor do Exame</th>
                    <th>Status Financeiro</th>
                    <th>Nº da Fatura / NF</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map(p => (
                    <tr key={p.id}>
                      <td><strong>{p.client}</strong></td>
                      <td>{p.partnerClinic}</td>
                      <td><span className="uf-badge">{p.state}</span></td>
                      <td>{fmtDate(p.date)}</td>
                      <td><strong className="text-emerald font-tabular">{fmtCurrency(p.value)}</strong></td>
                      <td>
                        <span className={`badge ${p.paid ? 'success' : 'warning'}`}>
                          {p.paid ? '✓ Liquidado' : '⚠️ Pendente'}
                        </span>
                      </td>
                      <td>{p.invoiceRef || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="financial-total-bar">
              <div className="total-bar-left">
                <span>Resumo da conciliação bancária de credenciadas</span>
              </div>
              <div className="total-bar-right">
                <span>Saldo Pendente de Pagamento: </span>
                <strong className="text-amber font-tabular">{fmtCurrency(unpaidTotal)}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
