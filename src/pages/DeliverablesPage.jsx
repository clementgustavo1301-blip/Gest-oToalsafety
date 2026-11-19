import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Search, Filter,
  CheckCircle, Clock, AlertTriangle, FileSpreadsheet, File,
  ClipboardList, ShieldCheck, UserCheck, RotateCcw
} from 'lucide-react';
import {
  getAllDeliverablesSummary, getContracts, getCompanies, getGroups, resolveCompaniesWithHeritage
} from '../services/storageService';
import { isPcaPprAet } from '../utils/deliverableTiming';
import DeliverablesViewer from '../components/DeliverablesViewer';
import HasAccess from '../components/HasAccess';

const TYPE_CONFIG = {
  programa: { label: 'Programa', icon: <FileSpreadsheet size={14} />, color: 'var(--primary)', bg: 'var(--primary-light)' },
  laudo: { label: 'Laudo', icon: <FileText size={14} />, color: '#d97706', bg: '#fef3c7' },
  contrato: { label: 'Contrato', icon: <File size={14} />, color: 'var(--secondary)', bg: 'var(--secondary-light)' },
  documento: { label: 'Documento', icon: <FileText size={14} />, color: '#6366f1', bg: '#e0e7ff' },
  treinamento: { label: 'Treinamento', icon: <FileText size={14} />, color: 'var(--info)', bg: '#e0f2fe' },
  visita_tecnica: { label: 'Visita Técnica', icon: <FileText size={14} />, color: '#059669', bg: '#d1fae5' },
};

const STATUS_CONFIG = {
  entregue: { label: 'Entregue', icon: <CheckCircle size={12} />, color: 'var(--secondary-hover)', bg: 'var(--secondary-light)' },
  feito: { label: 'Feito', icon: <CheckCircle size={12} />, color: 'var(--secondary-hover)', bg: 'var(--secondary-light)' },
  pendente: { label: 'Pendente', icon: <Clock size={12} />, color: '#b45309', bg: '#fef3c7' },
  agendado: { label: 'Agendado', icon: <Clock size={12} />, color: 'var(--primary)', bg: 'var(--primary-light)' },
  em_elaboracao: { label: 'Em Elaboração', icon: <AlertTriangle size={12} />, color: 'var(--primary)', bg: 'var(--primary-light)' },
  adiado: { label: 'Adiado', icon: <AlertTriangle size={12} />, color: '#b45309', bg: '#fef3c7' },
  cancelado: { label: 'Cancelado', icon: <AlertTriangle size={12} />, color: 'var(--danger)', bg: '#fee2e2' },
  nao_se_aplica: { label: 'Não Se Aplica', icon: <AlertTriangle size={12} />, color: '#4b5563', bg: '#f3f4f6' },
};

const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
const normalizeText = (v) => String(v || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const DeliverablesPage = () => {
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterResponsible, setFilterResponsible] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState('deliverables');

  const [allDeliverables, setAllDeliverables] = useState([]);
  const [allContracts, setAllContracts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [delivs, contracts, comps, grps] = await Promise.all([
        getAllDeliverablesSummary(),
        getContracts(),
        getCompanies(),
        getGroups()
      ]);
      setAllDeliverables(delivs);
      setAllContracts(contracts);
      setCompanies(resolveCompaniesWithHeritage(comps, grps));
      setGroups(grps);
      setLoading(false);
    }
    load();
  }, []);

  const sortedGroups = useMemo(() => [...groups].sort((a, b) => collator.compare(a.name, b.name)), [groups]);

  const responsiblesOptions = useMemo(() => {
    const map = new Map();
    const add = (rawName, role) => {
      const name = String(rawName || '').trim();
      if (!name || name === 'Não definido') return;
      const key = normalizeText(name);
      if (!map.has(key)) map.set(key, { name, isSup: false, isTec: false });
      const item = map.get(key);
      if (role === 'sup') item.isSup = true;
      if (role === 'tec') item.isTec = true;
    };
    companies.forEach(c => {
      add(c.effSupervisor, 'sup');
      add(c.effTecnico, 'tec');
    });
    return Array.from(map.values())
      .map(e => ({
        name: e.name,
        label: `${e.name} (${e.isSup && e.isTec ? 'Supervisor / Resp. Técnico' : e.isSup ? 'Supervisor' : 'Resp. Técnico'})`
      }))
      .sort((a, b) => collator.compare(a.name, b.name));
  }, [companies]);

  const filteredCompaniesOptions = useMemo(() => {
    const normResp = normalizeText(filterResponsible);
    return [...companies]
      .filter(c => {
        const mGroup = filterGroup === 'all' || c.groupId === filterGroup;
        const mResp = filterResponsible === 'all' ||
          normalizeText(c.effSupervisor) === normResp ||
          normalizeText(c.effTecnico) === normResp;
        return mGroup && mResp;
      })
      .sort((a, b) => collator.compare(a.name, b.name));
  }, [companies, filterGroup, filterResponsible]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando entregáveis...</div>;
  }

  const normResp = normalizeText(filterResponsible);
  const q = normalizeText(searchTerm);

  const filtered = allDeliverables.filter(d => {
    const matchGroup = filterGroup === 'all' || d.groupId === filterGroup;
    const matchCompany = filterCompany === 'all' || d.companyId === filterCompany;
    const matchResponsible = filterResponsible === 'all' ||
      normalizeText(d.supervisor) === normResp ||
      normalizeText(d.tecnicoResponsavel) === normResp;
    const matchType = filterType === 'all' || d.type === filterType;
    const effectiveStatus = isPcaPprAet(d) && d.status === 'pendente' ? 'nao_se_aplica' : d.status;
    const matchStatus = filterStatus === 'all' || effectiveStatus === filterStatus;
    const matchSearch = !q ||
      normalizeText(d.title).includes(q) ||
      normalizeText(d.companyName).includes(q) ||
      normalizeText(d.groupName).includes(q) ||
      normalizeText(d.supervisor).includes(q) ||
      normalizeText(d.tecnicoResponsavel).includes(q);
    return matchGroup && matchCompany && matchResponsible && matchType && matchStatus && matchSearch;
  });

  const companiesById = new Map(companies.map(c => [c.id, c]));

  const hasContractFilter = Boolean(
    filterGroup !== 'all' ||
    filterCompany !== 'all' ||
    filterResponsible !== 'all' ||
    filterStatus !== 'all' ||
    filterType !== 'all' ||
    searchTerm.trim() !== ''
  );

  const statusColors = {
    ativo: { bg: 'var(--secondary-light)', color: 'var(--secondary-hover)' },
    vencido: { bg: '#fee2e2', color: '#dc2626' },
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <header className="header-responsive">
        <div>
          <h1 className="text-h1">Entregáveis & Contratos</h1>
          <p className="text-subtitle">Visualize todos os programas, laudos e entregáveis de cada contrato.</p>
        </div>
        <HasAccess sectors={['SST']} roles={['Técnico', 'Supervisor']}>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={16} /> Gerar Laudo PCMSO (Acesso Restrito)
          </button>
        </HasAccess>
      </header>

      {/* View Switcher */}
      <div className="tabs-container">
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
        <>
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem', display: 'flex', gap: '0.85rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
              <Search size={18} color="var(--text-secondary)" />
              <input
                type="text"
                placeholder="Buscar entregável, empresa, grupo ou responsável..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1, border: 'none', outline: 'none', fontSize: '0.875rem',
                  backgroundColor: 'transparent', color: 'var(--text-primary)', fontFamily: 'inherit'
                }}
              />
            </div>
            <div className="filters-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              <Filter size={16} color="var(--text-secondary)" />
              <select
                value={filterGroup}
                onChange={(e) => {
                  const next = e.target.value;
                  setFilterGroup(next);
                  if (next !== 'all' && filterCompany !== 'all') {
                    const comp = companiesById.get(filterCompany);
                    if (comp && comp.groupId !== next) setFilterCompany('all');
                  }
                }}
                className="filter-select"
              >
                <option value="all">Todos os grupos</option>
                {sortedGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="filter-select"
              >
                <option value="all">Todas as empresas</option>
                {filteredCompaniesOptions.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={filterResponsible}
                onChange={(e) => setFilterResponsible(e.target.value)}
                className="filter-select"
              >
                <option value="all">Todos os responsáveis</option>
                {responsiblesOptions.map(r => (
                  <option key={r.name} value={r.name}>{r.label}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">Todos os status</option>
                <option value="pendente">Pendentes</option>
                <option value="em_elaboracao">Em Elaboração</option>
                <option value="agendado">Agendados</option>
                <option value="entregue">Entregues</option>
                <option value="adiado">Adiados</option>
                <option value="cancelado">Cancelados</option>
                <option value="nao_se_aplica">Não Se Aplica</option>
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="filter-select"
              >
                <option value="all">Todos os tipos</option>
                <option value="programa">Programas</option>
                <option value="laudo">Laudos</option>
                <option value="contrato">Contratos</option>
                <option value="documento">Documentos</option>
                <option value="treinamento">Treinamentos</option>
                <option value="visita_tecnica">Visitas Técnicas</option>
              </select>
              {hasContractFilter && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setFilterGroup('all');
                    setFilterCompany('all');
                    setFilterResponsible('all');
                    setFilterStatus('all');
                    setFilterType('all');
                    setSearchTerm('');
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
                >
                  <RotateCcw size={14} /> Limpar
                </button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {allContracts.map(contract => {
              const contractCompany = companiesById.get(contract.companyId);
              const contractMatchesCompanyScope = (
                (filterGroup === 'all' || contractCompany?.groupId === filterGroup) &&
                (filterCompany === 'all' || contract.companyId === filterCompany) &&
                (filterResponsible === 'all' ||
                  normalizeText(contractCompany?.effSupervisor) === normResp ||
                  normalizeText(contractCompany?.effTecnico) === normResp)
              );
              const contractDeliverables = filtered.filter(d => d.contractId === contract.id);
              if (!contractMatchesCompanyScope) return null;
              if (contractDeliverables.length === 0 && (filterStatus !== 'all' || filterType !== 'all' || searchTerm)) {
                return null;
              }
              const colors = statusColors[contract.status] || statusColors.ativo;
              return (
                <div key={contract.id} className="card">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
                        <h3 style={{ fontWeight: '600', fontSize: '1.0625rem', color: 'var(--text-primary)' }}>
                          {contract.contractNumber}
                        </h3>
                        {contractCompany && (
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            {contractCompany.name}{contractCompany.groupName && contractCompany.groupName !== 'Sem Grupo' ? ` (${contractCompany.groupName})` : ''}
                          </span>
                        )}
                        <span style={{
                          fontSize: '0.75rem', padding: '0.125rem 0.625rem',
                          borderRadius: '1rem', backgroundColor: colors.bg,
                          color: colors.color, fontWeight: '500', textTransform: 'capitalize'
                        }}>
                          {contract.status}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{contract.description}</p>
                      {contractCompany && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <ShieldCheck size={12} color="var(--primary)" /> Supervisor: <strong style={{ color: 'var(--text-primary)' }}>{contractCompany.effSupervisor}</strong>
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <UserCheck size={12} color="var(--secondary)" /> Resp. Técnico: <strong style={{ color: 'var(--text-primary)' }}>{contractCompany.effTecnico}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{contract.value}</span>
                  </div>

                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center',
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
                            display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.75rem 1rem', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                Sup: {d.supervisor || 'Não definido'} • Téc: {d.tecnicoResponsavel || 'Não definido'}
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
        </>
      )}
    </div>
  );
};

export default DeliverablesPage;
