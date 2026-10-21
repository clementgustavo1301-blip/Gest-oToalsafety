import {
  ArrowRight, CheckCircle, Clock, AlertTriangle, FileText,
  Users, Building2, PauseCircle, XCircle, ShieldCheck, UserCheck,
  Calendar, CheckCircle2, ChevronRight, Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import React, { useState, useEffect, useMemo } from 'react';
import {
  getContracts, getDeliverables, getTrainings, getCompanies, getGroups, getProfiles
} from '../services/storageService';

const Dashboard = () => {
  const [contracts, setContracts] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [groups, setGroups] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tabs de visualização conforme especificado no bilhete:
  // #1 POR RESPONSÁVEL | #2 VISÃO GERAL
  const [dashMode, setDashMode] = useState('responsavel'); // 'responsavel' (#1) | 'overview' (#2)
  const [filterResp, setFilterResp] = useState('all');

  useEffect(() => {
    async function loadData() {
      const [c, d, t, comp, g, profs] = await Promise.all([
        getContracts(),
        getDeliverables(),
        getTrainings(),
        getCompanies(),
        getGroups(),
        getProfiles()
      ]);
      setContracts(c || []);
      setDeliverables(d || []);
      setTrainings(t || []);
      setCompanies(comp || []);
      setGroups(g || []);
      setProfiles(profs || []);
      setLoading(false);
    }
    loadData();
  }, []);

  const groupsMap = useMemo(() => {
    const map = {};
    groups.forEach(g => { map[g.id] = g; });
    return map;
  }, [groups]);

  const companiesWithHeritage = useMemo(() => {
    return companies.map(c => {
      const g = groupsMap[c.groupId];
      const effSupervisor = c.supervisor || g?.supervisor || c.supportResponsible || '';
      const effTecnico = c.tecnicoResponsavel || g?.tecnicoResponsavel || c.responsible || '';
      const effVisitas = c.visitasTecnicas || g?.visitasTecnicas || 'N/A';
      return {
        ...c,
        groupName: g?.name || 'Sem Grupo',
        effSupervisor: effSupervisor || 'Não definido',
        effTecnico: effTecnico || 'Não definido',
        effVisitas: effVisitas || 'N/A',
        gestaoPgr: c.gestaoPgr || 'pendente',
        gestaoSipat: c.gestaoSipat || 'pendente',
      };
    });
  }, [companies, groupsMap]);

  // Prazos: A Vencer em 30 dias (vermelho) e 60 dias (amarelo)
  const today = useMemo(() => {
    const dt = new Date();
    dt.setHours(0, 0, 0, 0);
    return dt;
  }, []);

  const in30Days = useMemo(() => new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), [today]);
  const in60Days = useMemo(() => new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000), [today]);

  const deliverablesAnalysis = useMemo(() => {
    const isDelivered = (d) => ['entregue', 'feito', 'concluido'].includes(d.status);
    const delivered = deliverables.filter(isDelivered);
    const pending = deliverables.filter(d => !isDelivered(d) && d.status !== 'cancelado' && d.status !== 'nao_se_aplica');
    const expiring30 = [];
    const expiring60 = [];
    const regular = [];

    pending.forEach(d => {
      const targetDate = d.validityDate || d.dueDate || d.dataEnvio;
      if (!targetDate) {
        regular.push(d);
        return;
      }
      const dt = new Date(targetDate);
      if (dt <= in30Days) {
        expiring30.push(d);
      } else if (dt <= in60Days) {
        expiring60.push(d);
      } else {
        regular.push(d);
      }
    });

    const total = delivered.length + pending.length || 1;
    return {
      total: delivered.length + pending.length,
      delivered,
      pending,
      expiring30,
      expiring60,
      regular,
      pctDelivered: Math.round((delivered.length / total) * 100),
      pct30: Math.round((expiring30.length / total) * 100),
      pct60: Math.round((expiring60.length / total) * 100),
      pctRegular: Math.max(0, 100 - Math.round((delivered.length / total) * 100) - Math.round((expiring30.length / total) * 100) - Math.round((expiring60.length / total) * 100)),
    };
  }, [deliverables, in30Days, in60Days]);

  // Lista única de responsáveis (Técnicos e Supervisores)
  const responsiblesList = useMemo(() => {
    const set = new Set();
    companiesWithHeritage.forEach(c => {
      if (c.effTecnico && c.effTecnico !== 'Não definido') set.add(c.effTecnico);
      if (c.effSupervisor && c.effSupervisor !== 'Não definido') set.add(c.effSupervisor);
    });
    profiles.forEach(p => {
      if (p.name) set.add(p.name);
    });
    return Array.from(set).sort();
  }, [companiesWithHeritage, profiles]);

  // Agrupamento por Responsável para a visualização #1
  const responsibleData = useMemo(() => {
    return responsiblesList.map(name => {
      const relatedCompanies = companiesWithHeritage.filter(
        c => c.effTecnico === name || c.effSupervisor === name
      );
      const companyIds = new Set(relatedCompanies.map(c => c.id));
      const respDeliverables = deliverables.filter(d => companyIds.has(d.companyId));
      const isDelivered = (d) => ['entregue', 'feito', 'concluido'].includes(d.status);
      const deliveredDeliverables = respDeliverables.filter(isDelivered);
      const pendingDeliverables = respDeliverables.filter(d => !isDelivered(d) && d.status !== 'cancelado' && d.status !== 'nao_se_aplica');

      const exp30 = pendingDeliverables.filter(d => {
        const dt = d.validityDate || d.dueDate || d.dataEnvio;
        return dt && new Date(dt) <= in30Days;
      });

      const exp60 = pendingDeliverables.filter(d => {
        const dt = d.validityDate || d.dueDate || d.dataEnvio;
        if (!dt) return false;
        const target = new Date(dt);
        return target > in30Days && target <= in60Days;
      });

      const pgrSummary = {
        implementado: relatedCompanies.filter(c => c.gestaoPgr === 'implementado').length,
        pendente: relatedCompanies.filter(c => c.gestaoPgr === 'pendente').length,
        nao_implementado: relatedCompanies.filter(c => c.gestaoPgr === 'nao_implementado').length,
      };

      const sipatSummary = {
        implementado: relatedCompanies.filter(c => c.gestaoSipat === 'implementado').length,
        pendente: relatedCompanies.filter(c => c.gestaoSipat === 'pendente').length,
        nao_implementado: relatedCompanies.filter(c => c.gestaoSipat === 'nao_implementado').length,
      };

      return {
        name,
        companies: relatedCompanies,
        totalCompanies: relatedCompanies.length,
        totalDeliverables: deliveredDeliverables.length + pendingDeliverables.length,
        deliveredCount: deliveredDeliverables.length,
        pendingDeliverablesCount: pendingDeliverables.length,
        exp30Count: exp30.length,
        exp60Count: exp60.length,
        pgrSummary,
        sipatSummary,
      };
    }).filter(r => r.totalCompanies > 0);
  }, [responsiblesList, companiesWithHeritage, deliverables, in30Days, in60Days]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando dados do painel...</div>;
  }

  const activeContracts = contracts.filter(c => c.status === 'ativo').length;
  const pendingDeliverables = deliverables.filter(d => d.status === 'pendente').length;
  const completedTrainings = trainings.filter(t => t.status === 'concluido').length;
  const attentionItems = trainings.filter(t => t.status === 'nao_feito' || t.status === 'adiado').length;

  const stats = [
    { title: 'Grupos Cadastrados', value: String(groups.length), icon: <Building2 size={24} color="var(--info)" />, trend: 'Total de grupos' },
    { title: 'Empresas Ativas', value: String(companies.length), icon: <Building2 size={24} color="var(--primary)" />, trend: 'Matrizes e filiais' },
    { title: 'Contratos Ativos', value: String(activeContracts), icon: <FileText size={24} color="var(--primary)" />, trend: `${contracts.length} total` },
    { title: 'Entregáveis Pendentes', value: String(pendingDeliverables), icon: <Clock size={24} color="var(--warning)" />, trend: 'Aguardando ação' },
    { title: 'Treinamentos Concluídos', value: String(completedTrainings), icon: <Users size={24} color="var(--secondary)" />, trend: `de ${trainings.length} agendados` },
    { title: 'Atenção Requerida', value: String(attentionItems), icon: <AlertTriangle size={24} color="var(--danger)" />, trend: 'Adiados / Não feitos' },
  ];

  const getCompanyName = (companyId) => companies.find(c => c.id === companyId)?.name || 'N/A';

  const upcomingDeliverables = deliverables
    .filter(d => d.status === 'pendente')
    .sort((a, b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31'))
    .slice(0, 5)
    .map(d => ({
      ...d,
      companyName: getCompanyName(d.companyId),
    }));

  const upcomingTrainingsScheduled = trainings
    .filter(t => t.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(t => ({
      ...t,
      companyName: getCompanyName(t.companyId),
      isDeliverable: false
    }));

  const pendingTrainingDeliverables = deliverables
    .filter(d => d.type === 'treinamento' && d.status === 'pendente')
    .map(d => ({
      id: d.id,
      title: d.title,
      companyName: getCompanyName(d.companyId),
      date: d.dueDate || '',
      time: 'Pendente de Agendamento',
      status: 'pendente',
      isDeliverable: true
    }));

  const upcomingTrainings = [...upcomingTrainingsScheduled, ...pendingTrainingDeliverables].slice(0, 5);

  const statusIcons = {
    concluido: <CheckCircle color="var(--secondary)" size={18} />,
    pendente: <Clock color="var(--warning)" size={18} />,
    em_elaboracao: <AlertTriangle color="var(--primary)" size={18} />,
    agendado: <Clock color="var(--info)" size={18} />,
    adiado: <PauseCircle color="#b45309" size={18} />,
    nao_feito: <XCircle color="var(--danger)" size={18} />,
  };

  const statusLabels = {
    concluido: 'Concluído', pendente: 'Pendente', em_elaboracao: 'Em Elaboração',
    agendado: 'Agendado', adiado: 'Adiado', nao_feito: 'Não Feito', entregue: 'Entregue',
  };

  const statusColors = {
    concluido: { bg: 'var(--secondary-light)', color: 'var(--secondary-hover)' },
    pendente: { bg: '#fef3c7', color: '#b45309' },
    em_elaboracao: { bg: 'var(--primary-light)', color: 'var(--primary)' },
    agendado: { bg: 'var(--primary-light)', color: 'var(--primary-hover)' },
    adiado: { bg: '#fef3c7', color: '#b45309' },
    nao_feito: { bg: '#fee2e2', color: 'var(--danger)' },
    entregue: { bg: 'var(--secondary-light)', color: 'var(--secondary-hover)' },
  };

  // PGR & SIPAT Globais
  const globalPgr = {
    implementado: companiesWithHeritage.filter(c => c.gestaoPgr === 'implementado').length,
    pendente: companiesWithHeritage.filter(c => c.gestaoPgr === 'pendente').length,
    nao_implementado: companiesWithHeritage.filter(c => c.gestaoPgr === 'nao_implementado').length,
  };

  const globalSipat = {
    implementado: companiesWithHeritage.filter(c => c.gestaoSipat === 'implementado').length,
    pendente: companiesWithHeritage.filter(c => c.gestaoSipat === 'pendente').length,
    nao_implementado: companiesWithHeritage.filter(c => c.gestaoSipat === 'nao_implementado').length,
  };

  const filteredResponsibles = filterResp === 'all'
    ? responsibleData
    : responsibleData.filter(r => r.name === filterResp);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <header className="header-responsive" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="text-h1">Dashboard</h1>
          <p className="text-subtitle">Gestão TotalSafety — Acompanhamento por Responsável e Visão Geral</p>
        </div>
        <Link to="/companies" className="btn btn-primary">
          <Building2 size={18} /> Ver Empresas
        </Link>
      </header>

      {/* Tabs Principais do Bilhete: #1 POR RESPONSÁVEL | #2 VISÃO GERAL */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.375rem',
        backgroundColor: 'var(--surface-hover, #f1f5f9)',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--border, #e2e8f0)',
        marginBottom: '1.75rem',
        width: 'fit-content'
      }}>
        <button
          type="button"
          onClick={() => setDashMode('responsavel')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.25rem',
            borderRadius: 'var(--radius-md, 8px)',
            border: 'none',
            fontSize: '0.875rem',
            fontWeight: dashMode === 'responsavel' ? '700' : '500',
            backgroundColor: dashMode === 'responsavel' ? 'var(--primary, #0ea5e9)' : 'transparent',
            color: dashMode === 'responsavel' ? '#ffffff' : 'var(--text-secondary, #64748b)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: dashMode === 'responsavel' ? '0 2px 8px rgba(14, 165, 233, 0.3)' : 'none'
          }}
        >
          <UserCheck size={16} /> #1 Por Responsável
        </button>

        <button
          type="button"
          onClick={() => setDashMode('overview')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.25rem',
            borderRadius: 'var(--radius-md, 8px)',
            border: 'none',
            fontSize: '0.875rem',
            fontWeight: dashMode === 'overview' ? '700' : '500',
            backgroundColor: dashMode === 'overview' ? 'var(--primary, #0ea5e9)' : 'transparent',
            color: dashMode === 'overview' ? '#ffffff' : 'var(--text-secondary, #64748b)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: dashMode === 'overview' ? '0 2px 8px rgba(14, 165, 233, 0.3)' : 'none'
          }}
        >
          <Building2 size={16} /> #2 Visão Geral
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA #1: POR RESPONSÁVEL                                                   */}
      {/* ========================================================================= */}
      {dashMode === 'responsavel' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Barra de Filtro de Responsável */}
          <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <Filter size={18} color="var(--primary)" />
              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                Filtrar por Responsável (Técnico / Supervisor):
              </span>
            </div>
            <select
              value={filterResp}
              onChange={(e) => setFilterResp(e.target.value)}
              className="modal-input"
              style={{ maxWidth: '280px' }}
            >
              <option value="all">Todos os Responsáveis ({responsibleData.length})</option>
              {responsibleData.map(r => (
                <option key={r.name} value={r.name}>
                  {r.name} ({r.totalCompanies} empresa{r.totalCompanies > 1 ? 's' : ''})
                </option>
              ))}
            </select>
          </div>

          {/* Cards dos Responsáveis */}
          {filteredResponsibles.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <UserCheck size={48} style={{ opacity: 0.4, marginBottom: '1rem' }} />
              <p>Nenhum responsável com empresas vinculadas encontrado.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 540px), 1fr))', gap: '1.25rem' }}>
              {filteredResponsibles.map(resp => (
                <div key={resp.name} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Cabeçalho do Responsável */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '42px', height: '42px', borderRadius: '50%',
                        backgroundColor: 'var(--primary-light)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center'
                      }}>
                        <UserCheck size={20} color="var(--primary)" />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {resp.name}
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {resp.totalCompanies} empresa{resp.totalCompanies > 1 ? 's' : ''} sob responsabilidade
                        </span>
                      </div>
                    </div>

                    <span style={{
                      fontSize: '0.75rem', fontWeight: '700', padding: '0.25rem 0.625rem', borderRadius: '1rem',
                      backgroundColor: resp.pendingDeliverablesCount > 0 ? '#fef3c7' : '#dcfce7',
                      color: resp.pendingDeliverablesCount > 0 ? '#b45309' : '#15803d',
                      border: `1px solid ${resp.pendingDeliverablesCount > 0 ? '#fde68a' : '#86efac'}`
                    }}>
                      {resp.pendingDeliverablesCount} pendente{resp.pendingDeliverablesCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Barra de Status e Vencimentos dos Entregáveis do Responsável */}
                  <div style={{ backgroundColor: 'var(--background)', padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        Status e Prazos dos Entregáveis:
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {resp.deliveredCount} de {resp.totalDeliverables} entregues
                      </span>
                    </div>

                    {/* Segmented bar */}
                    <div style={{ height: '8px', width: '100%', borderRadius: '4px', display: 'flex', overflow: 'hidden', backgroundColor: '#e2e8f0', marginBottom: '0.5rem' }}>
                      {resp.deliveredCount > 0 && (
                        <div style={{ width: `${(resp.deliveredCount / (resp.totalDeliverables || 1)) * 100}%`, backgroundColor: '#10b981' }} title={`Entregues: ${resp.deliveredCount}`} />
                      )}
                      {resp.exp60Count > 0 && (
                        <div style={{ width: `${(resp.exp60Count / (resp.totalDeliverables || 1)) * 100}%`, backgroundColor: '#f59e0b' }} title={`A Vencer em 60 dias: ${resp.exp60Count}`} />
                      )}
                      {resp.exp30Count > 0 && (
                        <div style={{ width: `${(resp.exp30Count / (resp.totalDeliverables || 1)) * 100}%`, backgroundColor: '#ef4444' }} title={`A Vencer em até 30 dias: ${resp.exp30Count}`} />
                      )}
                      {resp.totalDeliverables === 0 && (
                        <div style={{ width: '100%', backgroundColor: '#cbd5e1' }} />
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem', fontSize: '0.75rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                        Entregues: <strong style={{ color: '#10b981' }}>{resp.deliveredCount}</strong>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                        30 dias: <strong style={{ color: '#ef4444' }}>{resp.exp30Count}</strong>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                        60 dias: <strong style={{ color: '#f59e0b' }}>{resp.exp60Count}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Resumo Gestão PGR e Gestão SIPAT */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.75rem' }}>
                    <div style={{ padding: '0.625rem', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <span style={{ fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>Gestão PGR:</span>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ color: '#15803d' }}>Impl: {resp.pgrSummary.implementado}</span>
                        <span style={{ color: '#b45309' }}>Pend: {resp.pgrSummary.pendente}</span>
                        <span style={{ color: '#b91c1c' }}>Não: {resp.pgrSummary.nao_implementado}</span>
                      </div>
                    </div>

                    <div style={{ padding: '0.625rem', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <span style={{ fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>Gestão SIPAT:</span>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ color: '#15803d' }}>Impl: {resp.sipatSummary.implementado}</span>
                        <span style={{ color: '#b45309' }}>Pend: {resp.sipatSummary.pendente}</span>
                        <span style={{ color: '#b91c1c' }}>Não: {resp.sipatSummary.nao_implementado}</span>
                      </div>
                    </div>
                  </div>

                  {/* Lista de Empresas do Responsável */}
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                      Empresas Atendidas:
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: '180px', overflowY: 'auto' }}>
                      {resp.companies.map(c => (
                        <Link
                          key={c.id}
                          to={`/company/${c.id}`}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.5rem 0.75rem', backgroundColor: 'var(--surface-hover)',
                            borderRadius: 'var(--radius-sm)', textDecoration: 'none', color: 'inherit',
                            fontSize: '0.8125rem', transition: 'all 0.15s ease'
                          }}
                        >
                          <div>
                            <strong style={{ color: 'var(--text-primary)' }}>{c.name}</strong>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>
                              {c.groupName} • Visitas: {c.effVisitas === 'N/A' ? 'N/A' : `${c.effVisitas} dias`}
                            </span>
                          </div>
                          <ChevronRight size={14} color="var(--text-secondary)" />
                        </Link>
                      ))}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA #2: VISÃO GERAL                                                       */}
      {/* ========================================================================= */}
      {dashMode === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Stats Grid */}
          <div className="grid-responsive-stats">
            {stats.map((stat, index) => (
              <div key={index} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p className="text-subtitle" style={{ marginBottom: '0.25rem' }}>{stat.title}</p>
                    <h3 className="text-h1" style={{ margin: 0 }}>{stat.value}</h3>
                  </div>
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: 'var(--background)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    {stat.icon}
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                  {stat.trend}
                </p>
              </div>
            ))}
          </div>

          {/* Painel Central: A Vencer (Barra Amarelo e Vermelho) + Gestão PGR + Gestão SIPAT */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 className="text-h2" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={20} color="var(--primary)" /> Visão Geral de Prazos e Programas SST
              </h2>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Consolidação geral de entregáveis a vencer e conformidade do PGR e SIPAT em todas as empresas
              </p>
            </div>

            {/* BARRA VISUAL COLORIDA (VERDE, AMARELO E VERMELHO) */}
            <div style={{ backgroundColor: 'var(--background)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.9375rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} color="#f59e0b" /> Status e Prazos dos Entregáveis (Total Geral)
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Total: <strong style={{ color: 'var(--text-primary)' }}>{deliverablesAnalysis.total}</strong> • Entregues: <strong style={{ color: '#10b981' }}>{deliverablesAnalysis.delivered.length}</strong> • Pendentes: <strong style={{ color: deliverablesAnalysis.pending.length > 0 ? '#ef4444' : 'var(--text-secondary)' }}>{deliverablesAnalysis.pending.length}</strong>
                </span>
              </div>

              {/* Barra segmentada horizontal */}
              <div style={{ height: '16px', width: '100%', borderRadius: '8px', display: 'flex', overflow: 'hidden', backgroundColor: '#e2e8f0', marginBottom: '0.875rem' }}>
                {deliverablesAnalysis.delivered.length > 0 && (
                  <div 
                    style={{ width: `${(deliverablesAnalysis.delivered.length / (deliverablesAnalysis.total || 1)) * 100}%`, backgroundColor: '#10b981', transition: 'width 0.3s' }} 
                    title={`Entregues (Concluídos): ${deliverablesAnalysis.delivered.length} (${deliverablesAnalysis.pctDelivered}%)`}
                  />
                )}
                {deliverablesAnalysis.regular.length > 0 && (
                  <div 
                    style={{ width: `${(deliverablesAnalysis.regular.length / (deliverablesAnalysis.total || 1)) * 100}%`, backgroundColor: '#3b82f6', transition: 'width 0.3s' }} 
                    title={`Mais de 60 dias / Regular: ${deliverablesAnalysis.regular.length}`}
                  />
                )}
                {deliverablesAnalysis.expiring60.length > 0 && (
                  <div 
                    style={{ width: `${(deliverablesAnalysis.expiring60.length / (deliverablesAnalysis.total || 1)) * 100}%`, backgroundColor: '#f59e0b', transition: 'width 0.3s' }} 
                    title={`A Vencer em 60 dias (Alerta): ${deliverablesAnalysis.expiring60.length}`}
                  />
                )}
                {deliverablesAnalysis.expiring30.length > 0 && (
                  <div 
                    style={{ width: `${(deliverablesAnalysis.expiring30.length / (deliverablesAnalysis.total || 1)) * 100}%`, backgroundColor: '#ef4444', transition: 'width 0.3s' }} 
                    title={`A Vencer em até 30 dias (Crítico): ${deliverablesAnalysis.expiring30.length}`}
                  />
                )}
                {deliverablesAnalysis.total === 0 && (
                  <div style={{ width: '100%', backgroundColor: '#cbd5e1' }} title="Nenhum entregável cadastrado" />
                )}
              </div>

              {/* Indicadores numéricos detalhados */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.875rem', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981', flexShrink: 0 }} />
                  <div>
                    <span style={{ color: '#15803d', fontWeight: '500' }}>Entregues</span>
                    <strong style={{ display: 'block', fontSize: '1.125rem', color: '#15803d' }}>{deliverablesAnalysis.delivered.length}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444', flexShrink: 0 }} />
                  <div>
                    <span style={{ color: '#b91c1c', fontWeight: '500' }}>A Vencer em até 30 dias</span>
                    <strong style={{ display: 'block', fontSize: '1.125rem', color: '#b91c1c' }}>{deliverablesAnalysis.expiring30.length}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f59e0b', flexShrink: 0 }} />
                  <div>
                    <span style={{ color: '#b45309', fontWeight: '500' }}>A Vencer em 60 dias</span>
                    <strong style={{ display: 'block', fontSize: '1.125rem', color: '#b45309' }}>{deliverablesAnalysis.expiring60.length}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem', backgroundColor: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#3b82f6', flexShrink: 0 }} />
                  <div>
                    <span style={{ color: '#1d4ed8', fontWeight: '500' }}>Mais de 60 dias</span>
                    <strong style={{ display: 'block', fontSize: '1.125rem', color: '#1d4ed8' }}>{deliverablesAnalysis.regular.length}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Painel Gestão PGR e Gestão SIPAT Consolidados */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {/* Card Gestão PGR Geral */}
              <div style={{ padding: '1.25rem', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Gestão PGR (Total de Empresas: {companies.length})
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: '#f0fdf4', borderRadius: 'var(--radius-sm)', border: '1px solid #dcfce7' }}>
                    <span style={{ color: '#15803d', fontWeight: '600', fontSize: '0.875rem' }}>Implementado</span>
                    <strong style={{ color: '#15803d', fontSize: '1rem' }}>{globalPgr.implementado}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: '#fffbeb', borderRadius: 'var(--radius-sm)', border: '1px solid #fef3c7' }}>
                    <span style={{ color: '#b45309', fontWeight: '600', fontSize: '0.875rem' }}>Pendente</span>
                    <strong style={{ color: '#b45309', fontSize: '1rem' }}>{globalPgr.pendente}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: '#fef2f2', borderRadius: 'var(--radius-sm)', border: '1px solid #fee2e2' }}>
                    <span style={{ color: '#b91c1c', fontWeight: '600', fontSize: '0.875rem' }}>Não Implementado</span>
                    <strong style={{ color: '#b91c1c', fontSize: '1rem' }}>{globalPgr.nao_implementado}</strong>
                  </div>
                </div>
              </div>

              {/* Card Gestão SIPAT Geral */}
              <div style={{ padding: '1.25rem', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Gestão de SIPAT (Total de Empresas: {companies.length})
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: '#f0fdf4', borderRadius: 'var(--radius-sm)', border: '1px solid #dcfce7' }}>
                    <span style={{ color: '#15803d', fontWeight: '600', fontSize: '0.875rem' }}>Implementado</span>
                    <strong style={{ color: '#15803d', fontSize: '1rem' }}>{globalSipat.implementado}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: '#fffbeb', borderRadius: 'var(--radius-sm)', border: '1px solid #fef3c7' }}>
                    <span style={{ color: '#b45309', fontWeight: '600', fontSize: '0.875rem' }}>Pendente</span>
                    <strong style={{ color: '#b45309', fontSize: '1rem' }}>{globalSipat.pendente}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: '#fef2f2', borderRadius: 'var(--radius-sm)', border: '1px solid #fee2e2' }}>
                    <span style={{ color: '#b91c1c', fontWeight: '600', fontSize: '0.875rem' }}>Não Implementado</span>
                    <strong style={{ color: '#b91c1c', fontSize: '1rem' }}>{globalSipat.nao_implementado}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Duas Colunas: Entregáveis Pendentes e Treinamentos */}
          <div className="grid-responsive-2">
            {/* Upcoming Deliverables */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="text-h2">Entregáveis Pendentes</h2>
                <Link to="/deliverables" style={{ color: 'var(--primary)', fontSize: '0.875rem', fontWeight: '500' }}>Ver todos</Link>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {upcomingDeliverables.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                    ✅ Nenhum entregável pendente!
                  </p>
                ) : upcomingDeliverables.map((item) => {
                  const sc = statusColors[item.status] || statusColors.pendente;
                  const targetDate = item.validityDate || item.dueDate || item.dataEnvio;
                  const isExpiring30 = targetDate && new Date(targetDate) <= in30Days;
                  const isExpiring60 = targetDate && new Date(targetDate) > in30Days && new Date(targetDate) <= in60Days;

                  return (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.875rem', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)', backgroundColor: 'var(--background)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {statusIcons[item.status] || statusIcons.pendente}
                        <div>
                          <h4 style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.125rem', fontSize: '0.875rem' }}>{item.title}</h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {item.companyName}
                            {isExpiring30 && <span style={{ color: '#ef4444', fontWeight: '700', marginLeft: '6px' }}>🔴 A Vencer (≤30d)</span>}
                            {isExpiring60 && <span style={{ color: '#f59e0b', fontWeight: '700', marginLeft: '6px' }}>🟡 A Vencer (≤60d)</span>}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                          {targetDate ? new Date(targetDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Sem data'}
                        </p>
                        <span style={{
                          fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '1rem',
                          backgroundColor: sc.bg, color: sc.color, fontWeight: '500'
                        }}>
                          {statusLabels[item.status] || item.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming Trainings */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="text-h2">Treinamentos</h2>
                <Link to="/calendar" style={{ color: 'var(--primary)', fontSize: '0.875rem', fontWeight: '500' }}>Ver calendário</Link>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {upcomingTrainings.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                    Nenhum treinamento registrado.
                  </p>
                ) : upcomingTrainings.map((item) => {
                  const sc = statusColors[item.status] || statusColors.agendado;
                  return (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.875rem', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)', backgroundColor: 'var(--background)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {statusIcons[item.status] || statusIcons.agendado}
                        <div>
                          <h4 style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.125rem', fontSize: '0.875rem' }}>{item.title}</h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {item.companyName} • {item.isDeliverable ? <span style={{color: '#b45309', fontWeight: '600'}}>Aguardando Agendamento</span> : item.time}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                          {item.isDeliverable && !item.date 
                            ? 'Sem data definida' 
                            : item.date 
                              ? new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) 
                              : 'Sem data'}
                        </p>
                        <span style={{
                          fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '1rem',
                          backgroundColor: sc.bg, color: sc.color, fontWeight: '500'
                        }}>
                          {statusLabels[item.status] || item.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default Dashboard;
