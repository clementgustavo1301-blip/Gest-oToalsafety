import React, { useState, useEffect } from 'react';
import {
  FileText, Search, Filter, Download,
  CheckCircle, Clock, AlertTriangle, FileSpreadsheet, File,
  Building2, ClipboardList
} from 'lucide-react';
import { getAllDeliverablesSummary, getContracts } from '../services/storageService';

const TYPE_CONFIG = {
  programa: { label: 'Programa', icon: <FileSpreadsheet size={14} />, color: 'var(--primary)', bg: 'var(--primary-light)' },
  laudo: { label: 'Laudo', icon: <FileText size={14} />, color: '#d97706', bg: '#fef3c7' },
  contrato: { label: 'Contrato', icon: <File size={14} />, color: 'var(--secondary)', bg: 'var(--secondary-light)' },
};

const STATUS_CONFIG = {
  entregue: { label: 'Entregue', icon: <CheckCircle size={12} />, color: 'var(--secondary-hover)', bg: 'var(--secondary-light)' },
  pendente: { label: 'Pendente', icon: <Clock size={12} />, color: '#b45309', bg: '#fef3c7' },
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
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total', value: stats.total, color: 'var(--text-primary)', bg: 'var(--background)' },
              { label: 'Entregues', value: stats.entregue, color: 'var(--secondary)', bg: 'var(--secondary-light)' },
              { label: 'Pendentes', value: stats.pendente, color: '#b45309', bg: '#fef3c7' },
              { label: 'Em Elaboração', value: stats.em_elaboracao, color: 'var(--primary)', bg: 'var(--primary-light)' },
            ].map((s, i) => (
              <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  backgroundColor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', color: s.color }}>{s.value}</span>
                </div>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
              <Search size={18} color="var(--text-secondary)" />
              <input
                id="search-all-deliverables"
                type="text"
                placeholder="Buscar por título ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1, border: 'none', outline: 'none', fontSize: '0.875rem',
                  backgroundColor: 'transparent', color: 'var(--text-primary)', fontFamily: 'inherit'
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} color="var(--text-secondary)" />
              <select
                id="filter-all-type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', fontSize: '0.8125rem',
                  backgroundColor: 'var(--surface)', color: 'var(--text-primary)',
                  fontFamily: 'inherit', cursor: 'pointer'
                }}
              >
                <option value="all">Todos os tipos</option>
                <option value="programa">Programas</option>
                <option value="laudo">Laudos</option>
                <option value="contrato">Contratos</option>
              </select>
              <select
                id="filter-all-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', fontSize: '0.8125rem',
                  backgroundColor: 'var(--surface)', color: 'var(--text-primary)',
                  fontFamily: 'inherit', cursor: 'pointer'
                }}
              >
                <option value="all">Todos os status</option>
                <option value="entregue">Entregues</option>
                <option value="pendente">Pendentes</option>
                <option value="em_elaboracao">Em Elaboração</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--background)' }}>
                  {['Entregável', 'Empresa', 'Tipo', 'Vencimento', 'Status', 'Arquivo'].map(col => (
                    <th key={col} style={{
                      padding: '0.875rem 1.25rem', textAlign: 'left',
                      fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      borderBottom: '1px solid var(--border)'
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const typeConf = TYPE_CONFIG[d.type] || TYPE_CONFIG.contrato;
                  const statusConf = STATUS_CONFIG[d.status] || STATUS_CONFIG.pendente;

                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--border)', transition: 'var(--transition)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--background)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{ fontWeight: '500', fontSize: '0.875rem', color: 'var(--text-primary)' }}>{d.title}</span>
                        <br />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{d.contractNumber}</span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                          <Building2 size={14} color="var(--text-secondary)" /> {d.companyName}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                          padding: '0.25rem 0.625rem', borderRadius: '1rem',
                          backgroundColor: typeConf.bg, color: typeConf.color,
                          fontSize: '0.75rem', fontWeight: '600'
                        }}>
                          {typeConf.icon} {typeConf.label}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                        {d.dueDate ? new Date(d.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : ''}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                          padding: '0.125rem 0.5rem', borderRadius: '1rem',
                          backgroundColor: statusConf.bg, color: statusConf.color,
                          fontSize: '0.6875rem', fontWeight: '500'
                        }}>
                          {statusConf.icon} {statusConf.label}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {d.fileName ? (
                          <button
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.375rem',
                              fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '500',
                              padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-md)',
                              backgroundColor: 'var(--primary-light)', cursor: 'pointer',
                              transition: 'var(--transition)', border: 'none'
                            }}
                          >
                            <Download size={12} /> PDF
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <FileText size={40} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                <p>Nenhum entregável encontrado.</p>
              </div>
            )}
          </div>
        </>
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
