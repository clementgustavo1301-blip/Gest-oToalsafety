import React, { useState, useEffect } from 'react';
import {
  FileText, Search, Filter, Download,
  CheckCircle, Clock, AlertTriangle, FileSpreadsheet, File,
  Building2, ClipboardList
} from 'lucide-react';
import { getAllDeliverablesSummary, getContracts } from '../services/storageService';
import DeliverablesViewer from '../components/DeliverablesViewer';

const TYPE_CONFIG = {
  programa: { label: 'Programa', icon: <FileSpreadsheet size={14} />, color: 'var(--primary)', bg: 'var(--primary-light)' },
  laudo: { label: 'Laudo', icon: <FileText size={14} />, color: '#d97706', bg: '#fef3c7' },
  contrato: { label: 'Contrato', icon: <File size={14} />, color: 'var(--secondary)', bg: 'var(--secondary-light)' },
};

const STATUS_CONFIG = {
  entregue: { label: 'Entregue', icon: <CheckCircle size={12} />, color: 'var(--secondary-hover)', bg: 'var(--secondary-light)' },
  feito: { label: 'Feito', icon: <CheckCircle size={12} />, color: 'var(--secondary-hover)', bg: 'var(--secondary-light)' },
  pendente: { label: 'Pendente', icon: <Clock size={12} />, color: '#b45309', bg: '#fef3c7' },
  agendado: { label: 'Agendado', icon: <Clock size={12} />, color: 'var(--primary)', bg: 'var(--primary-light)' },
  em_elaboracao: { label: 'Em Elaboração', icon: <AlertTriangle size={12} />, color: 'var(--primary)', bg: 'var(--primary-light)' },
};

const DeliverablesPage = () => {
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState('deliverables');

  const [allDeliverables, setAllDeliverables] = useState([]);
  const [allContracts, setAllContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [delivs, contracts] = await Promise.all([
        getAllDeliverablesSummary(),
        getContracts()
      ]);
      setAllDeliverables(delivs);
      setAllContracts(contracts);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando entregáveis...</div>;
  }

  const filtered = allDeliverables.filter(d => {
    const matchType = filterType === 'all' || d.type === filterType;
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    const matchSearch = !searchTerm ||
      d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchType && matchStatus && matchSearch;
  });

  const stats = {
    total: allDeliverables.length,
    entregue: allDeliverables.filter(d => d.status === 'entregue').length,
    pendente: allDeliverables.filter(d => d.status === 'pendente').length,
    em_elaboracao: allDeliverables.filter(d => d.status === 'em_elaboracao').length,
  };

  const statusColors = {
    ativo: { bg: 'var(--secondary-light)', color: 'var(--secondary-hover)' },
    vencido: { bg: '#fee2e2', color: '#dc2626' },
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-h1">Entregáveis & Contratos</h1>
          <p className="text-subtitle">Visualize todos os programas, laudos e entregáveis de cada contrato.</p>
        </div>
      </header>

      {/* View Switcher */}
      <div style={{
        display: 'flex', gap: '0.25rem', marginBottom: '1.5rem',
        backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-lg)',
        padding: '0.25rem', border: '1px solid var(--border)', width: 'fit-content'
      }}>
        {[
          { id: 'deliverables', label: 'Entregáveis', icon: <FileText size={16} /> },
          { id: 'contracts', label: 'Contratos TotalSafety', icon: <ClipboardList size={16} /> },
        ].map(v => (
          <button
            key={v.id}
            onClick={() => setActiveView(v.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 1.25rem', borderRadius: 'var(--radius-md)',
              fontWeight: activeView === v.id ? '600' : '500',
              fontSize: '0.875rem', transition: 'var(--transition)',
              backgroundColor: activeView === v.id ? 'var(--primary)' : 'transparent',
              color: activeView === v.id ? 'white' : 'var(--text-secondary)',
            }}
          >
            {v.icon} {v.label}
          </button>
        ))}
      </div>

      {activeView === 'deliverables' && (
        <DeliverablesViewer />
      )}

      {activeView === 'contracts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {allContracts.map(contract => {
            const contractDeliverables = allDeliverables.filter(d => d.contractId === contract.id);
            const colors = statusColors[contract.status] || statusColors.ativo;
            return (
              <div key={contract.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
                      <h3 style={{ fontWeight: '600', fontSize: '1.0625rem', color: 'var(--text-primary)' }}>
                        {contract.contractNumber}
                      </h3>
                      <span style={{
                        fontSize: '0.75rem', padding: '0.125rem 0.625rem',
                        borderRadius: '1rem', backgroundColor: colors.bg,
                        color: colors.color, fontWeight: '500', textTransform: 'capitalize'
                      }}>
                        {contract.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{contract.description}</p>
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{contract.value}</span>
                </div>

                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.75rem 1rem', backgroundColor: 'var(--background)',
                  borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--text-secondary)',
                  marginBottom: '1rem'
                }}>
                  <span>Vigência: {contract.startDate ? new Date(contract.startDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : ''} → {contract.endDate ? new Date(contract.endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : ''}</span>
                  <span>{contractDeliverables.length} entregáveis vinculados</span>
                </div>

                {contractDeliverables.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {contractDeliverables.map(d => {
                      const typeConf = TYPE_CONFIG[d.type] || TYPE_CONFIG.contrato;
                      const statusConf = STATUS_CONFIG[d.status] || STATUS_CONFIG.pendente;
                      return (
                        <div key={d.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.75rem 1rem', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                              padding: '0.125rem 0.5rem', borderRadius: '1rem',
                              backgroundColor: typeConf.bg, color: typeConf.color,
                              fontSize: '0.6875rem', fontWeight: '600'
                            }}>
                              {typeConf.icon} {typeConf.label}
                            </span>
                            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                              {d.title}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {d.dueDate ? new Date(d.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : ''}
                            </span>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                              padding: '0.125rem 0.5rem', borderRadius: '1rem',
                              backgroundColor: statusConf.bg, color: statusConf.color,
                              fontSize: '0.6875rem', fontWeight: '500'
                            }}>
                              {statusConf.icon} {statusConf.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DeliverablesPage;
