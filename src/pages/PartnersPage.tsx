import React, { useState, useMemo } from 'react';
import {
  Building2, Plus, Search, FileText, Pencil, Trash2, ArrowUpDown
} from 'lucide-react';
import type { PartnerAppointment, ToastType } from '../types';
import { fmtDate, fmtCurrency, exportToCSV } from '../utils/format';
import { PartnerForm, ConfirmDelete } from '../components/Modals';

interface PartnersPageProps {
  partners: PartnerAppointment[];
  addPartner: (p: Omit<PartnerAppointment, 'id'>) => void;
  updatePartner: (id: string, updates: Partial<PartnerAppointment>) => void;
  deletePartner: (id: string) => void;
  showToast: (msg: string, type: ToastType) => void;
}

export const PartnersPage: React.FC<PartnersPageProps> = ({
  partners,
  addPartner,
  updatePartner,
  deletePartner,
  showToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'exams_pending'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'client' | 'value'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PartnerAppointment | undefined>();
  const [deleting, setDeleting] = useState<PartnerAppointment | undefined>();

  // Distinct states for filter
  const availableStates = useMemo(() => {
    const states = Array.from(new Set(partners.map(p => p.state))).filter(Boolean);
    return states.sort();
  }, [partners]);

  // Filtering and sorting
  const filteredPartners = useMemo(() => {
    let result = partners.filter(p => {
      // Search
      const searchMatch =
        p.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.partnerClinic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.invoiceRef.toLowerCase().includes(searchTerm.toLowerCase());
      if (!searchMatch) return false;

      // State
      if (stateFilter !== 'all' && p.state !== stateFilter) return false;

      // Status
      if (statusFilter === 'paid' && !p.paid) return false;
      if (statusFilter === 'unpaid' && p.paid) return false;
      if (statusFilter === 'exams_pending' && p.examsReceived) return false;

      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'date') {
        const cmp = a.date.localeCompare(b.date);
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'client') {
        const cmp = a.client.localeCompare(b.client);
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'value') {
        const cmp = a.value - b.value;
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      return 0;
    });

    return result;
  }, [partners, searchTerm, stateFilter, statusFilter, sortBy, sortOrder]);

  const toggleSort = (field: 'date' | 'client' | 'value') => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleExport = () => {
    const data = filteredPartners.map(p => ({
      Cliente: p.client,
      'Clínica Parceira': p.partnerClinic,
      UF: p.state,
      Data: fmtDate(p.date),
      Valor: fmtCurrency(p.value),
      'Status Faturamento': p.invoiceStatus,
      'Ref. NF': p.invoiceRef || '-',
      'Pago?': p.paid ? 'Sim' : 'Não',
      'Exames Recebidos?': p.examsReceived ? 'Sim' : 'Não',
      Observações: p.notes || ''
    }));
    exportToCSV(`clinicas_parceiras_${new Date().toISOString().slice(0, 10)}.csv`, data);
    showToast('Planilha de clínicas parceiras exportada com sucesso!', 'success');
  };

  // Financial KPI calculations
  const totalValue = filteredPartners.reduce((s, p) => s + p.value, 0);
  const paidValue = filteredPartners.filter(p => p.paid).reduce((s, p) => s + p.value, 0);
  const pendingValue = totalValue - paidValue;
  const examsPendingCount = filteredPartners.filter(p => !p.examsReceived).length;

  return (
    <div className="page-wrapper partners-management-layout">
      {/* Top Controls Bar */}
      <div className="table-controls-bar">
        <div className="search-filter-row">
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por cliente, clínica ou nº de NF..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-select-wrap">
            <select value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
              <option value="all">Todas as UFs</option>
              {availableStates.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div className="filter-select-wrap">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
              <option value="all">Todos os Status Financeiros</option>
              <option value="unpaid">⚠️ Pagamento Pendente</option>
              <option value="paid">✓ Pago / Liquidado</option>
              <option value="exams_pending">📄 ASOs Físicos Pendentes</option>
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
            <Plus size={15} /> Novo Agendamento
          </button>
        </div>
      </div>

      {/* Financial Ribbon */}
      <div className="partners-stats-ribbon">
        <div className="ribbon-item">
          <span className="ribbon-num">{filteredPartners.length}</span>
          <span className="ribbon-lbl">Agendamentos</span>
        </div>
        <div className="ribbon-item">
          <span className="ribbon-num text-cyan">{fmtCurrency(totalValue)}</span>
          <span className="ribbon-lbl">Volume Total</span>
        </div>
        <div className="ribbon-item">
          <span className="ribbon-num text-emerald">{fmtCurrency(paidValue)}</span>
          <span className="ribbon-lbl">Liquidado / Pago</span>
        </div>
        <div className="ribbon-item">
          <span className="ribbon-num text-amber">{fmtCurrency(pendingValue)}</span>
          <span className="ribbon-lbl">Pendente de Pagamento</span>
        </div>
        <div className="ribbon-item">
          <span className="ribbon-num text-rose">{examsPendingCount}</span>
          <span className="ribbon-lbl">ASOs Aguardando Envio</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card table-card">
        <div className="table-container">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort('client')} style={{ cursor: 'pointer' }}>
                  <div className="th-sort-wrap">
                    <span>Cliente (Empresa)</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th>Clínica Credenciada & UF</th>
                <th onClick={() => toggleSort('date')} style={{ cursor: 'pointer' }}>
                  <div className="th-sort-wrap">
                    <span>Data</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th onClick={() => toggleSort('value')} style={{ cursor: 'pointer' }}>
                  <div className="th-sort-wrap">
                    <span>Valor (R$)</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th>Faturamento & NF</th>
                <th style={{ textAlign: 'center' }}>Pago?</th>
                <th style={{ textAlign: 'center' }}>Exames Recebidos?</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="client-cell">
                      <strong className="client-name">{p.client}</strong>
                      {p.notes && <span className="client-notes">Obs: {p.notes}</span>}
                    </div>
                  </td>
                  <td>
                    <div className="clinic-cell">
                      <span>{p.partnerClinic}</span>
                      <span className="uf-badge">{p.state}</span>
                    </div>
                  </td>
                  <td>
                    <span className="date-badge">{fmtDate(p.date)}</span>
                  </td>
                  <td>
                    <strong className="text-emerald font-tabular">
                      {fmtCurrency(p.value)}
                    </strong>
                  </td>
                  <td>
                    <div className="invoice-status-cell">
                      <span className={`invoice-tag ${p.invoiceStatus}`}>
                        {p.invoiceStatus.toUpperCase()}
                      </span>
                      {p.invoiceRef && (
                        <span className="invoice-ref-text">{p.invoiceRef}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <label className="checkbox-center" title="Clique para alternar status de pagamento">
                      <input
                        type="checkbox"
                        className="custom-checkbox"
                        checked={p.paid}
                        onChange={() => {
                          updatePartner(p.id, { paid: !p.paid });
                          showToast(
                            p.paid ? 'Pagamento desmarcado' : `Agendamento de ${p.client} marcado como pago!`,
                            'success'
                          );
                        }}
                      />
                    </label>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <label className="checkbox-center" title="Clique para confirmar recebimento de ASOs físicos">
                      <input
                        type="checkbox"
                        className="custom-checkbox"
                        checked={p.examsReceived}
                        onChange={() => {
                          updatePartner(p.id, { examsReceived: !p.examsReceived });
                          showToast(
                            p.examsReceived ? 'Status de exames removido' : `Exames físicos de ${p.partnerClinic} recebidos!`,
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
                        title="Editar agendamento"
                        onClick={() => { setEditing(p); setShowForm(true); }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="btn-icon text-rose"
                        title="Excluir agendamento"
                        onClick={() => setDeleting(p)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredPartners.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-table-state">
                    <div className="empty-message-wrap">
                      <Building2 size={36} className="text-muted" />
                      <h4>Nenhum agendamento encontrado</h4>
                      <p>Modifique seus filtros de busca ou cadastre um novo encaminhamento para clínicas parceiras.</p>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => { setEditing(undefined); setShowForm(true); }}
                      >
                        <Plus size={14} /> Novo Agendamento
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
        <PartnerForm
          initial={editing}
          onClose={() => setShowForm(false)}
          onSave={data => {
            if (editing) {
              updatePartner(editing.id, data);
              showToast('Agendamento atualizado com sucesso!', 'success');
            } else {
              addPartner(data);
              showToast('Novo agendamento cadastrado com sucesso!', 'success');
            }
          }}
        />
      )}

      {deleting && (
        <ConfirmDelete
          itemName={`Agendamento: ${deleting.client} (${deleting.partnerClinic})`}
          onClose={() => setDeleting(undefined)}
          onConfirm={() => {
            deletePartner(deleting.id);
            showToast('Agendamento removido do sistema.', 'info');
          }}
        />
      )}
    </div>
  );
};
