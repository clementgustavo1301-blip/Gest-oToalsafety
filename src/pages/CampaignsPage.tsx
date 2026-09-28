import React, { useState, useMemo } from 'react';
import {
  Truck, Plus, Search, FileText, Pencil, Trash2, ArrowUpDown
} from 'lucide-react';
import type { Campaign, ToastType } from '../types';
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from '../types';
import { fmtDate, exportToCSV } from '../utils/format';
import { CampaignForm, ConfirmDelete } from '../components/Modals';

interface CampaignsPageProps {
  campaigns: Campaign[];
  addCampaign: (c: Omit<Campaign, 'id'>) => void;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  showToast: (msg: string, type: ToastType) => void;
  onOpenNew?: () => void;
}

export const CampaignsPage: React.FC<CampaignsPageProps> = ({
  campaigns,
  addCampaign,
  updateCampaign,
  deleteCampaign,
  showToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'kit_pending' | 'scan_pending' | 'soc_pending' | 'completed'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'company' | 'count'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Campaign | undefined>();
  const [deleting, setDeleting] = useState<Campaign | undefined>();

  // Filtered and sorted campaigns
  const filteredCampaigns = useMemo(() => {
    let result = campaigns.filter(c => {
      // Search
      const searchMatch =
        c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.location.toLowerCase().includes(searchTerm.toLowerCase());
      if (!searchMatch) return false;

      // Status
      if (statusFilter === 'kit_pending' && c.kitReady) return false;
      if (statusFilter === 'scan_pending' && (c.scanned || c.attendedCount === 0)) return false;
      if (statusFilter === 'soc_pending' && (!c.scanned || c.insertedSOC)) return false;
      if (statusFilter === 'completed' && (!c.scanned || !c.insertedSOC || !c.kitReady)) return false;

      // Type
      if (typeFilter !== 'all' && c.eventType !== typeFilter) return false;

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'date') {
        const cmp = a.date.localeCompare(b.date);
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'company') {
        const cmp = a.company.localeCompare(b.company);
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'count') {
        const cmp = a.expectedCount - b.expectedCount;
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      return 0;
    });

    return result;
  }, [campaigns, searchTerm, statusFilter, typeFilter, sortBy, sortOrder]);

  // Export CSV
  const handleExport = () => {
    const data = filteredCampaigns.map(c => ({
      Empresa: c.company,
      Local: c.location,
      Data: fmtDate(c.date),
      Tipo: EVENT_TYPE_LABELS[c.eventType],
      'Kit Pronto?': c.kitReady ? 'Sim' : 'Não',
      'Vidas Previstas': c.expectedCount,
      'Vidas Atendidas': c.attendedCount,
      'ASOs Retornados': c.returnedAsos,
      'Escaneado?': c.scanned ? 'Sim' : 'Não',
      'Inserido SOC?': c.insertedSOC ? 'Sim' : 'Não',
      Observações: c.notes || ''
    }));
    exportToCSV(`campanhas_ipa_${new Date().toISOString().slice(0, 10)}.csv`, data);
    showToast('Planilha de campanhas exportada com sucesso!', 'success');
  };

  const toggleSort = (field: 'date' | 'company' | 'count') => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Quick summary counts
  const onlyCampaigns = filteredCampaigns.filter(c => c.eventType === 'campanha');
  const totalExpected = onlyCampaigns.reduce((s, c) => s + c.expectedCount, 0);
  const totalAttended = onlyCampaigns.reduce((s, c) => s + c.attendedCount, 0);
  const totalKitsOk = onlyCampaigns.filter(c => c.kitReady).length;

  return (
    <div className="page-wrapper campaigns-management-layout">
      {/* Top Controls Bar */}
      <div className="table-controls-bar">
        <div className="search-filter-row">
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por empresa, filial ou município..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-select-wrap">
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">Todos os Tipos de Eventos</option>
              <option value="campanha">Unidade Móvel</option>
              <option value="acao">Ação em Empresa</option>
              <option value="palestra">Palestra / SIPAT</option>
            </select>
          </div>

          <div className="filter-select-wrap">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
              <option value="all">Todos os Status</option>
              <option value="kit_pending">⚠️ Kits Pendentes</option>
              <option value="scan_pending">📄 Aguardando Escanear</option>
              <option value="soc_pending">💾 Aguardando Inserção SOC</option>
              <option value="completed">✓ 100% Concluídos</option>
            </select>
          </div>
        </div>

        <div className="actions-row-top">
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>
            <FileText size={15} /> Exportar CSV
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { setEditing(undefined); setShowForm(true); }}
          >
            <Plus size={15} /> Nova Campanha
          </button>
        </div>
      </div>

      {/* Mini Stats Ribbon */}
      <div className="campaigns-stats-ribbon">
        <div className="ribbon-item">
          <span className="ribbon-num">{filteredCampaigns.length}</span>
          <span className="ribbon-lbl">Eventos Listados</span>
        </div>
        <div className="ribbon-item">
          <span className="ribbon-num text-cyan">{totalExpected}</span>
          <span className="ribbon-lbl">Vidas Previstas</span>
        </div>
        <div className="ribbon-item">
          <span className="ribbon-num text-emerald">{totalAttended}</span>
          <span className="ribbon-lbl">Exames Realizados</span>
        </div>
        <div className="ribbon-item">
          <span className="ribbon-num">{totalKitsOk} / {filteredCampaigns.filter(c => c.eventType === 'campanha').length}</span>
          <span className="ribbon-lbl">Kits Prontos</span>
        </div>
      </div>

      {/* Main Data Table Card */}
      <div className="card table-card">
        <div className="table-container">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort('company')} style={{ cursor: 'pointer' }}>
                  <div className="th-sort-wrap">
                    <span>Empresa & Local</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th onClick={() => toggleSort('date')} style={{ cursor: 'pointer' }}>
                  <div className="th-sort-wrap">
                    <span>Data</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th>Tipo de Evento</th>
                <th style={{ textAlign: 'center' }}>Kit Pronto?</th>
                <th onClick={() => toggleSort('count')} style={{ cursor: 'pointer' }}>
                  <div className="th-sort-wrap">
                    <span>Atendidos / Prev.</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th style={{ textAlign: 'center' }}>ASOs Retorno</th>
                <th style={{ textAlign: 'center' }}>Escaneado?</th>
                <th style={{ textAlign: 'center' }}>No SOC?</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.map(c => {
                const percentAttended = c.expectedCount > 0
                  ? Math.round((c.attendedCount / c.expectedCount) * 100)
                  : 0;

                return (
                  <tr key={c.id}>
                    <td>
                      <div className="company-col">
                        <strong className="company-title">{c.company}</strong>
                        <span className="company-sub">{c.location}</span>
                        {c.notes && <span className="company-notes">Obs: {c.notes}</span>}
                      </div>
                    </td>
                    <td>
                      <span className="date-badge">{fmtDate(c.date)}</span>
                    </td>
                    <td>
                      <span
                        className="event-pill-tag"
                        style={{
                          borderColor: EVENT_TYPE_COLORS[c.eventType],
                          color: EVENT_TYPE_COLORS[c.eventType],
                          background: `${EVENT_TYPE_COLORS[c.eventType]}14`
                        }}
                      >
                        {EVENT_TYPE_LABELS[c.eventType]}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <label className="checkbox-center" title="Clique para alternar status do kit">
                        <input
                          type="checkbox"
                          className="custom-checkbox"
                          checked={c.kitReady}
                          onChange={() => {
                            updateCampaign(c.id, { kitReady: !c.kitReady });
                            showToast(
                              c.kitReady ? 'Kit desmarcado' : `Kit de ${c.company} pronto para envio!`,
                              'success'
                            );
                          }}
                        />
                      </label>
                    </td>
                    <td>
                      <div className="attendance-cell">
                        {c.eventType !== 'campanha' ? (
                          <span className="attendance-counts" style={{ color: '#64748b' }}>
                            {EVENT_TYPE_LABELS[c.eventType]} (N/A)
                          </span>
                        ) : (
                          <>
                            <span className="attendance-counts">
                              <strong>{c.attendedCount}</strong> / {c.expectedCount} vidas
                            </span>
                            <div className="mini-progress-track">
                              <div
                                className="mini-progress-bar"
                                style={{
                                  width: `${Math.min(100, percentAttended)}%`,
                                  backgroundColor: percentAttended >= 80 ? 'var(--ok)' : 'var(--blue)'
                                }}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="count-badge">
                        {c.eventType === 'campanha' ? (c.returnedAsos || '-') : '-'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <label className="checkbox-center" title="Marcar como digitalizado">
                        <input
                          type="checkbox"
                          className="custom-checkbox"
                          checked={c.scanned}
                          onChange={() => {
                            updateCampaign(c.id, { scanned: !c.scanned });
                            showToast(
                              c.scanned ? 'Status de escaneamento removido' : `ASOs de ${c.company} escaneados!`,
                              'success'
                            );
                          }}
                        />
                      </label>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <label className="checkbox-center" title="Marcar como integrado no SOC">
                        <input
                          type="checkbox"
                          className="custom-checkbox"
                          checked={c.insertedSOC}
                          onChange={() => {
                            updateCampaign(c.id, { insertedSOC: !c.insertedSOC });
                            showToast(
                              c.insertedSOC ? 'Removido do SOC' : `Atendimentos de ${c.company} inseridos no SOC com sucesso!`,
                              'success'
                            );
                          }}
                        />
                      </label>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="actions-cell justify-end">
                        <button
                          className="btn-icon"
                          title="Editar campanha"
                          onClick={() => { setEditing(c); setShowForm(true); }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="btn-icon text-rose"
                          title="Excluir campanha"
                          onClick={() => setDeleting(c)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCampaigns.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty-table-state">
                    <div className="empty-message-wrap">
                      <Truck size={36} className="text-muted" />
                      <h4>Nenhuma campanha encontrada</h4>
                      <p>Ajuste os filtros de busca ou cadastre uma nova campanha agora mesmo.</p>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => { setEditing(undefined); setShowForm(true); }}
                      >
                        <Plus size={14} /> Cadastrar Nova Campanha
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forms and Delete Modals */}
      {showForm && (
        <CampaignForm
          initial={editing}
          existingCompanies={[...new Set(campaigns.map(c => c.company))]}
          onClose={() => setShowForm(false)}
          onSave={data => {
            if (editing) {
              updateCampaign(editing.id, data);
              showToast('Campanha atualizada com sucesso!', 'success');
            } else {
              addCampaign(data);
              showToast('Nova campanha cadastrada com sucesso!', 'success');
            }
          }}
        />
      )}

      {deleting && (
        <ConfirmDelete
          itemName={`Campanha: ${deleting.company}`}
          onClose={() => setDeleting(undefined)}
          onConfirm={() => {
            deleteCampaign(deleting.id);
            showToast('Campanha excluída do sistema.', 'info');
          }}
        />
      )}
    </div>
  );
};
