import {
  ArrowRight, CheckCircle, Clock, AlertTriangle, FileText,
  Users, Building2, PauseCircle, XCircle, ShieldCheck, UserCheck,
  CheckCircle2, ChevronRight, Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getContracts, getDeliverables, getTrainings, getCompanies, getGroups, getProfiles
} from '../services/storageService';

// Helpers de normalização e comparação de nomes
function normalizeName(str) {
  if (!str) return '';
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function isSamePerson(nameA, nameB) {
  if (!nameA || !nameB) return false;
  const a = normalizeName(nameA);
  const b = normalizeName(nameB);
  if (!a || !b) return false;
  if (a === b) return true;

  const partsA = a.split(/\s+/).filter(Boolean);
  const partsB = b.split(/\s+/).filter(Boolean);

  if (partsA[0] === partsB[0]) {
    if (partsA.length === 1 || partsB.length === 1) return true;
    if (partsA[partsA.length - 1] === partsB[partsB.length - 1]) return true;
  }
  return false;
}

function isCompanySupervisor(company, personName, personId) {
  if (personId && company.supportResponsibleId === personId) return true;
  if (isSamePerson(company.effSupervisor, personName)) return true;
  if (isSamePerson(company.supervisor, personName)) return true;
  if (isSamePerson(company.supportResponsible, personName)) return true;
  return false;
}

function isCompanyTecnico(company, personName, personId) {
  if (personId && company.responsibleId === personId) return true;
  if (isSamePerson(company.effTecnico, personName)) return true;
  if (isSamePerson(company.tecnicoResponsavel, personName)) return true;
  if (isSamePerson(company.responsible, personName)) return true;
  return false;
}

function isCompanyAssignedTo(company, personName, personId) {
  return isCompanySupervisor(company, personName, personId) || isCompanyTecnico(company, personName, personId);
}

const Dashboard = () => {
  const { user, userProfile, loading: authLoading } = useAuth();

  const [contracts, setContracts] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [groups, setGroups] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tabs de visualização:
  // #1 SUPERVISOR OU TÉCNICO RESPONSÁVEL | #2 VISÃO GERAL
  const [dashMode, setDashMode] = useState('responsavel'); // 'responsavel' (#1) | 'overview' (#2)
  const [filterResp, setFilterResp] = useState(null); // null = aguarda detecção do usuário logado

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
    // Para cada grupo, resolve o Supervisor, Técnico Responsável e Visitas Técnicas
    // considerando o grupo ou qualquer empresa pertencente ao grupo
    const groupResolvedTeam = {};
    groups.forEach(g => {
      const compsInG = companies.filter(c => c.groupId === g.id);
      const sup = g.supervisor || compsInG.find(c => c.supervisor)?.supervisor || compsInG.find(c => c.supportResponsible)?.supportResponsible || '';
      const tec = g.tecnicoResponsavel || compsInG.find(c => c.tecnicoResponsavel)?.tecnicoResponsavel || compsInG.find(c => c.responsible)?.responsible || '';
      const vis = (g.visitasTecnicas && g.visitasTecnicas !== 'N/A')
        ? g.visitasTecnicas
        : (compsInG.find(c => c.visitasTecnicas && c.visitasTecnicas !== 'N/A')?.visitasTecnicas || 'N/A');
      groupResolvedTeam[g.id] = { sup, tec, vis };
    });

    return companies.map(c => {
      const g = groupsMap[c.groupId];
      const gResolved = c.groupId ? groupResolvedTeam[c.groupId] : null;
      const effSupervisor = gResolved?.sup || g?.supervisor || c.supervisor || c.supportResponsible || '';
      const effTecnico = gResolved?.tec || g?.tecnicoResponsavel || c.tecnicoResponsavel || c.responsible || '';
      const effVisitas = (gResolved?.vis && gResolved.vis !== 'N/A') ? gResolved.vis : ((g?.visitasTecnicas && g.visitasTecnicas !== 'N/A') ? g.visitasTecnicas : (c.visitasTecnicas || 'N/A'));
      return {
        ...c,
        groupName: g?.name || 'Sem Grupo',
        effSupervisor: effSupervisor || 'Não definido',
        effTecnico: effTecnico || 'Não definido',
        effVisitas: effVisitas || 'N/A',
      };
    });
  }, [companies, groups, groupsMap]);

  // Prazos: A Vencer em 30 dias (vermelho) e 60 dias (amarelo)
  const today = useMemo(() => {
    const dt = new Date();
    dt.setHours(0, 0, 0, 0);
    return dt;
  }, []);

  const in30Days = useMemo(() => new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), [today]);
  const in60Days = useMemo(() => new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000), [today]);

  const isDelivered = (d) => ['entregue', 'feito', 'concluido'].includes(d.status);

  // Análise Global de Entregáveis
  const deliverablesAnalysis = useMemo(() => {
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

  // Identificação do Usuário Logado
  const loggedUserName = userProfile?.name || user?.user_metadata?.full_name || '';
  const loggedUserId = userProfile?.id || user?.id || '';

  // Lista única de profissionais (Supervisores e Técnicos Responsáveis)
  const responsiblesList = useMemo(() => {
    const map = new Map();
    companiesWithHeritage.forEach(c => {
      if (c.effTecnico && c.effTecnico !== 'Não definido') {
        map.set(c.effTecnico, (map.get(c.effTecnico) || 0) + 1);
      }
      if (c.effSupervisor && c.effSupervisor !== 'Não definido') {
        map.set(c.effSupervisor, (map.get(c.effSupervisor) || 0) + 1);
      }
    });
    profiles.forEach(p => {
      if (p.name && !map.has(p.name)) {
        map.set(p.name, 0);
      }
    });

    return Array.from(map.entries()).map(([name, count]) => ({
      name,
      count,
    })).sort((a, b) => {
      const aIsUser = isSamePerson(a.name, loggedUserName);
      const bIsUser = isSamePerson(b.name, loggedUserName);
      if (aIsUser && !bIsUser) return -1;
      if (!aIsUser && bIsUser) return 1;
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });
  }, [companiesWithHeritage, profiles, loggedUserName]);

  // Nome do responsável correspondente ao usuário logado
  const userMatchingResponsible = useMemo(() => {
    if (!loggedUserName && !loggedUserId) return '';
    // 1. Verifica por ID nos vínculos de empresas
    for (const c of companiesWithHeritage) {
      if (loggedUserId && (c.responsibleId === loggedUserId || c.supportResponsibleId === loggedUserId)) {
        if (c.responsibleId === loggedUserId && c.effTecnico) return c.effTecnico;
        if (c.supportResponsibleId === loggedUserId && c.effSupervisor) return c.effSupervisor;
      }
    }
    // 2. Verifica por nome nas empresas
    for (const c of companiesWithHeritage) {
      if (isSamePerson(c.effSupervisor, loggedUserName)) return c.effSupervisor;
      if (isSamePerson(c.effTecnico, loggedUserName)) return c.effTecnico;
    }
    // 3. Verifica na lista de responsáveis
    const matched = responsiblesList.find(r => isSamePerson(r.name, loggedUserName));
    if (matched) return matched.name;
    return loggedUserName;
  }, [loggedUserName, loggedUserId, companiesWithHeritage, responsiblesList]);

  // Responsável ativo: se filterResp não foi alterado manualmente pelo usuário, usa o usuário logado
  const activePerson = filterResp !== null
    ? filterResp
    : (userMatchingResponsible || (responsiblesList[0]?.name || 'all'));

  const isCurrentActiveUser = isSamePerson(activePerson, loggedUserName);

  // Agrupamento para a visualização comparativa (Multi-Responsáveis)
  const responsibleData = useMemo(() => {
    return responsiblesList.map(({ name }) => {
      const relatedCompanies = companiesWithHeritage.filter(c =>
        isCompanyAssignedTo(c, name, isSamePerson(name, loggedUserName) ? loggedUserId : undefined)
      );
      const companyIds = new Set(relatedCompanies.map(c => c.id));
      const respDeliverables = deliverables.filter(d => companyIds.has(d.companyId));
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

      return {
        name,
        companies: relatedCompanies,
        totalCompanies: relatedCompanies.length,
        totalDeliverables: deliveredDeliverables.length + pendingDeliverables.length,
        deliveredCount: deliveredDeliverables.length,
        pendingDeliverablesCount: pendingDeliverables.length,
        exp30Count: exp30.length,
        exp60Count: exp60.length,
      };
    }).filter(r => r.totalCompanies > 0);
  }, [responsiblesList, companiesWithHeritage, deliverables, in30Days, in60Days, loggedUserName, loggedUserId]);

  // Dados exclusivos para a pessoa selecionada (ou usuário logado)
  const selectedPersonData = useMemo(() => {
    if (activePerson === 'all') return null;

    const personCompanies = companiesWithHeritage.filter(c =>
      isCompanyAssignedTo(c, activePerson, isSamePerson(activePerson, loggedUserName) ? loggedUserId : undefined)
    );

    const asSupervisor = personCompanies.filter(c =>
      isCompanySupervisor(c, activePerson, isSamePerson(activePerson, loggedUserName) ? loggedUserId : undefined)
    );
    const asTecnico = personCompanies.filter(c =>
      isCompanyTecnico(c, activePerson, isSamePerson(activePerson, loggedUserName) ? loggedUserId : undefined)
    );

    const companyIds = new Set(personCompanies.map(c => c.id));
    const personDeliverables = deliverables.filter(d => companyIds.has(d.companyId));
    const delivered = personDeliverables.filter(isDelivered);
    const pending = personDeliverables.filter(d => !isDelivered(d) && d.status !== 'cancelado' && d.status !== 'nao_se_aplica');

    const exp30 = pending.filter(d => {
      const dt = d.validityDate || d.dueDate || d.dataEnvio;
      return dt && new Date(dt) <= in30Days;
    });

    const exp60 = pending.filter(d => {
      const dt = d.validityDate || d.dueDate || d.dataEnvio;
      if (!dt) return false;
      const target = new Date(dt);
      return target > in30Days && target <= in60Days;
    });

    const regular = pending.filter(d => {
      const dt = d.validityDate || d.dueDate || d.dataEnvio;
      if (!dt) return true;
      return new Date(dt) > in60Days;
    });

    const total = delivered.length + pending.length || 1;
    const pctDelivered = Math.round((delivered.length / total) * 100);
    const pct30 = Math.round((exp30.length / total) * 100);
    const pct60 = Math.round((exp60.length / total) * 100);
    const pctRegular = Math.max(0, 100 - pctDelivered - pct30 - pct60);

    const getCompName = (id) => personCompanies.find(c => c.id === id)?.name || 'Empresa';

    const upcomingDeliverables = pending
      .sort((a, b) => (a.validityDate || a.dueDate || a.dataEnvio || '9999').localeCompare(b.validityDate || b.dueDate || b.dataEnvio || '9999'))
      .slice(0, 6)
      .map(d => ({
        ...d,
        companyName: getCompName(d.companyId),
      }));

    const personTrainings = trainings.filter(t => companyIds.has(t.companyId));
    const sched = personTrainings
      .filter(t => t.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(t => ({
        ...t,
        companyName: getCompName(t.companyId),
        isDeliverable: false
      }));

    const pendTrainDeliv = personDeliverables
      .filter(d => d.type === 'treinamento' && !isDelivered(d) && d.status !== 'cancelado')
      .map(d => ({
        id: d.id,
        title: d.title,
        companyName: getCompName(d.companyId),
        date: d.dueDate || '',
        time: 'Pendente de Agendamento',
        status: 'pendente',
        isDeliverable: true
      }));

    const upcomingTrainings = [...sched, ...pendTrainDeliv].slice(0, 6);

    return {
      name: activePerson,
      companies: personCompanies,
      totalCompanies: personCompanies.length,
      asSupervisor,
      asTecnico,
      deliverables: personDeliverables,
      delivered,
      pending,
      exp30,
      exp60,
      regular,
      pctDelivered,
      pct30,
      pct60,
      pctRegular,
      upcomingDeliverables,
      upcomingTrainings,
    };
  }, [activePerson, companiesWithHeritage, deliverables, trainings, in30Days, in60Days, loggedUserName, loggedUserId]);

  if (loading || authLoading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando dados do painel...</div>;
  }

  const activeContracts = contracts.filter(c => c.status === 'ativo').length;
  const pendingDeliverables = deliverables.filter(d => !isDelivered(d) && d.status !== 'cancelado' && d.status !== 'nao_se_aplica').length;
  const completedTrainings = trainings.filter(t => t.status === 'concluido').length;
  const attentionItems = trainings.filter(t => t.status === 'nao_feito' || t.status === 'adiado').length;

  const globalStats = [
    { title: 'Grupos Cadastrados', value: String(groups.length), icon: <Building2 size={24} color="var(--info)" />, trend: 'Total de grupos' },
    { title: 'Empresas Ativas', value: String(companies.length), icon: <Building2 size={24} color="var(--primary)" />, trend: 'Matrizes e filiais' },
    { title: 'Contratos Ativos', value: String(activeContracts), icon: <FileText size={24} color="var(--primary)" />, trend: `${contracts.length} total` },
    { title: 'Entregáveis Pendentes', value: String(pendingDeliverables), icon: <Clock size={24} color="var(--warning)" />, trend: 'Aguardando ação' },
    { title: 'Treinamentos Concluídos', value: String(completedTrainings), icon: <Users size={24} color="var(--secondary)" />, trend: `de ${trainings.length} agendados` },
    { title: 'Atenção Requerida', value: String(attentionItems), icon: <AlertTriangle size={24} color="var(--danger)" />, trend: 'Adiados / Não feitos' },
  ];

  const getCompanyName = (companyId) => companies.find(c => c.id === companyId)?.name || 'N/A';

  const globalUpcomingDeliverables = deliverables
    .filter(d => !isDelivered(d) && d.status !== 'cancelado' && d.status !== 'nao_se_aplica')
    .sort((a, b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31'))
    .slice(0, 5)
    .map(d => ({
      ...d,
      companyName: getCompanyName(d.companyId),
    }));

  const globalUpcomingTrainingsScheduled = trainings
    .filter(t => t.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(t => ({
      ...t,
      companyName: getCompanyName(t.companyId),
      isDeliverable: false
    }));

  const globalPendingTrainingDeliverables = deliverables
    .filter(d => d.type === 'treinamento' && !isDelivered(d) && d.status !== 'cancelado')
    .map(d => ({
      id: d.id,
      title: d.title,
      companyName: getCompanyName(d.companyId),
      date: d.dueDate || '',
      time: 'Pendente de Agendamento',
      status: 'pendente',
      isDeliverable: true
    }));

  const globalUpcomingTrainings = [...globalUpcomingTrainingsScheduled, ...globalPendingTrainingDeliverables].slice(0, 5);

  const statusIcons = {
    concluido: <CheckCircle color="var(--secondary)" size={18} />,
    pendente: <Clock color="var(--warning)" size={18} />,
    em_elaboracao: <AlertTriangle color="var(--primary)" size={18} />,
    agendado: <Clock color="var(--info)" size={18} />,
    adiado: <PauseCircle color="#b45309" size={18} />,
    nao_feito: <XCircle color="var(--danger)" size={18} />,
    entregue: <CheckCircle color="var(--secondary)" size={18} />,
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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Superior */}
      <header className="header-responsive" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="text-h1">Dashboard</h1>
          <p className="text-subtitle">Gestão TotalSafety — Supervisor ou Técnico Responsável e Visão Geral</p>
        </div>
        <Link to="/companies" className="btn btn-primary">
          <Building2 size={18} /> Ver Empresas
        </Link>
      </header>

      {/* Tabs Principais: #1 SUPERVISOR OU TÉCNICO RESPONSÁVEL | #2 VISÃO GERAL */}
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
          <UserCheck size={16} /> #1 Supervisor ou Técnico Responsável
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
      {/* ABA #1: SUPERVISOR OU TÉCNICO RESPONSÁVEL                                 */}
      {/* ========================================================================= */}
      {dashMode === 'responsavel' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Barra de Filtro e Contexto */}
          <div className="card" style={{ padding: '1.125rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%',
                backgroundColor: 'var(--primary-light)', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}>
                <UserCheck size={20} color="var(--primary)" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Painel do Colaborador:
                  </span>
                  {activePerson !== 'all' && (
                    <strong style={{ color: 'var(--primary)', fontSize: '0.9375rem' }}>
                      {activePerson}
                    </strong>
                  )}
                  {isCurrentActiveUser && (
                    <span style={{
                      fontSize: '0.7rem', fontWeight: '700', padding: '0.15rem 0.5rem',
                      borderRadius: '1rem', backgroundColor: '#e0f2fe', color: '#0369a1',
                      border: '1px solid #bae6fd'
                    }}>
                      Você
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Visualizando apenas empresas atribuídas como Supervisor ou Técnico Responsável
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} color="var(--text-secondary)" />
              <label htmlFor="select-responsible-filter" style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                Supervisor ou Técnico Responsável:
              </label>
              <select
                id="select-responsible-filter"
                value={activePerson}
                onChange={(e) => setFilterResp(e.target.value)}
                className="modal-input"
                style={{ minWidth: '260px', padding: '0.45rem 0.75rem', fontSize: '0.8125rem' }}
              >
                {responsiblesList.map(r => {
                  const isUser = isSamePerson(r.name, loggedUserName);
                  return (
                    <option key={r.name} value={r.name}>
                      {r.name} {isUser ? '(Você)' : ''} ({r.count} empresa{r.count !== 1 ? 's' : ''})
                    </option>
                  );
                })}
                <option value="all">
                  🌐 Todos os Supervisores e Técnicos ({responsibleData.length})
                </option>
              </select>
            </div>
          </div>

          {/* MODO 1: DASHBOARD DEDICADO DO PROFISSIONAL (PADRÃO AO ENTRAR) */}
          {activePerson !== 'all' && selectedPersonData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Se o usuário não possui empresas atribuídas */}
              {selectedPersonData.totalCompanies === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
                  <UserCheck size={56} style={{ opacity: 0.3, marginBottom: '1rem', color: 'var(--primary)' }} />
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    Nenhuma empresa vinculada para {activePerson}
                  </h3>
                  <p style={{ maxWidth: '480px', margin: '0 auto 1.25rem auto', fontSize: '0.875rem' }}>
                    {isCurrentActiveUser 
                      ? 'Você ainda não foi designado como Supervisor ou Técnico Responsável em nenhuma empresa cadastrada. Selecione outro colaborador no filtro acima ou vincule empresas ao seu nome na página de Empresas.'
                      : 'Este colaborador não possui empresas vinculadas como Supervisor ou Técnico Responsável no momento.'}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                    <button 
                      type="button" 
                      onClick={() => setFilterResp('all')} 
                      className="btn btn-secondary"
                    >
                      Ver Todos os Colaboradores
                    </button>
                    <Link to="/companies" className="btn btn-primary">
                      Ir para Empresas
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  {/* Grid de Métricas do Responsável */}
                  <div className="grid-responsive-stats">
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p className="text-subtitle" style={{ marginBottom: '0.25rem' }}>Empresas Atendidas</p>
                          <h3 className="text-h1" style={{ margin: 0 }}>{selectedPersonData.totalCompanies}</h3>
                        </div>
                        <div style={{ padding: '0.75rem', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)' }}>
                          <Building2 size={24} color="var(--primary)" />
                        </div>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        Total sob sua gestão
                      </p>
                    </div>

                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p className="text-subtitle" style={{ marginBottom: '0.25rem' }}>Como Supervisor</p>
                          <h3 className="text-h1" style={{ margin: 0, color: '#0369a1' }}>{selectedPersonData.asSupervisor.length}</h3>
                        </div>
                        <div style={{ padding: '0.75rem', backgroundColor: '#e0f2fe', borderRadius: 'var(--radius-md)' }}>
                          <ShieldCheck size={24} color="#0369a1" />
                        </div>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        Supervisão do grupo ou empresa
                      </p>
                    </div>

                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p className="text-subtitle" style={{ marginBottom: '0.25rem' }}>Como Técnico Responsável</p>
                          <h3 className="text-h1" style={{ margin: 0, color: '#0f766e' }}>{selectedPersonData.asTecnico.length}</h3>
                        </div>
                        <div style={{ padding: '0.75rem', backgroundColor: '#ccfbf1', borderRadius: 'var(--radius-md)' }}>
                          <UserCheck size={24} color="#0f766e" />
                        </div>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        Atendimento e visitas técnicas
                      </p>
                    </div>

                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p className="text-subtitle" style={{ marginBottom: '0.25rem' }}>Entregáveis Pendentes</p>
                          <h3 className="text-h1" style={{ margin: 0, color: selectedPersonData.pending.length > 0 ? '#b45309' : '#15803d' }}>
                            {selectedPersonData.pending.length}
                          </h3>
                        </div>
                        <div style={{ padding: '0.75rem', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)' }}>
                          <Clock size={24} color="var(--warning)" />
                        </div>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        {selectedPersonData.delivered.length} entregues ({selectedPersonData.pctDelivered}%)
                      </p>
                    </div>

                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p className="text-subtitle" style={{ marginBottom: '0.25rem' }}>A Vencer ≤ 30 Dias</p>
                          <h3 className="text-h1" style={{ margin: 0, color: '#ef4444' }}>{selectedPersonData.exp30.length}</h3>
                        </div>
                        <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: 'var(--radius-md)' }}>
                          <AlertTriangle size={24} color="#ef4444" />
                        </div>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: '600' }}>
                        🔴 Prazo Crítico
                      </p>
                    </div>

                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p className="text-subtitle" style={{ marginBottom: '0.25rem' }}>A Vencer em 60 Dias</p>
                          <h3 className="text-h1" style={{ margin: 0, color: '#f59e0b' }}>{selectedPersonData.exp60.length}</h3>
                        </div>
                        <div style={{ padding: '0.75rem', backgroundColor: '#fef3c7', borderRadius: 'var(--radius-md)' }}>
                          <Clock size={24} color="#f59e0b" />
                        </div>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: '600' }}>
                        🟡 Alerta de Vencimento
                      </p>
                    </div>
                  </div>

                  {/* Painel de Prazos e Gestão SST do Responsável */}
                  <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ marginBottom: '1.25rem' }}>
                      <h2 className="text-h2" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle2 size={20} color="var(--primary)" /> Prazos dos Entregáveis das Suas Empresas
                      </h2>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        Indicadores de prazos e entregáveis sob responsabilidade de <strong>{activePerson}</strong>
                      </p>
                    </div>

                    {/* Barra Visual Colorida de Prazos (Verde, Amarelo, Vermelho) */}
                    <div style={{ backgroundColor: 'var(--background)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.9375rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Clock size={18} color="var(--primary)" /> Prazos dos Entregáveis (A Vencer)
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {selectedPersonData.delivered.length} Entregues • {selectedPersonData.pending.length} Pendentes
                        </span>
                      </div>

                      {/* Barra Segmentada */}
                      <div style={{ height: '16px', width: '100%', borderRadius: '8px', display: 'flex', overflow: 'hidden', backgroundColor: '#e2e8f0', marginBottom: '0.875rem' }}>
                        {selectedPersonData.delivered.length > 0 && (
                          <div
                            style={{ width: `${selectedPersonData.pctDelivered}%`, backgroundColor: '#10b981', transition: 'width 0.3s' }}
                            title={`Entregues / Concluídos: ${selectedPersonData.delivered.length}`}
                          />
                        )}
                        {selectedPersonData.exp60.length > 0 && (
                          <div
                            style={{ width: `${selectedPersonData.pct60}%`, backgroundColor: '#f59e0b', transition: 'width 0.3s' }}
                            title={`A Vencer em 60 dias (Alerta): ${selectedPersonData.exp60.length}`}
                          />
                        )}
                        {selectedPersonData.exp30.length > 0 && (
                          <div
                            style={{ width: `${selectedPersonData.pct30}%`, backgroundColor: '#ef4444', transition: 'width 0.3s' }}
                            title={`A Vencer em até 30 dias (Crítico): ${selectedPersonData.exp30.length}`}
                          />
                        )}
                        {selectedPersonData.regular.length > 0 && (
                          <div
                            style={{ width: `${selectedPersonData.pctRegular}%`, backgroundColor: '#cbd5e1', transition: 'width 0.3s' }}
                            title={`Pendente regular (>60 dias): ${selectedPersonData.regular.length}`}
                          />
                        )}
                        {selectedPersonData.deliverables.length === 0 && (
                          <div style={{ width: '100%', backgroundColor: '#10b981' }} title="Tudo em dia!" />
                        )}
                      </div>

                      {/* Indicadores Numéricos */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.8125rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', flexShrink: 0 }} />
                          <div>
                            <span style={{ color: '#15803d', fontWeight: '500', fontSize: '0.75rem' }}>Entregues / Concluídos</span>
                            <strong style={{ display: 'block', fontSize: '1rem', color: '#15803d' }}>{selectedPersonData.delivered.length}</strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444', flexShrink: 0 }} />
                          <div>
                            <span style={{ color: '#b91c1c', fontWeight: '500', fontSize: '0.75rem' }}>A Vencer em até 30 dias</span>
                            <strong style={{ display: 'block', fontSize: '1rem', color: '#b91c1c' }}>{selectedPersonData.exp30.length}</strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b', flexShrink: 0 }} />
                          <div>
                            <span style={{ color: '#b45309', fontWeight: '500', fontSize: '0.75rem' }}>A Vencer em 60 dias</span>
                            <strong style={{ display: 'block', fontSize: '1rem', color: '#b45309' }}>{selectedPersonData.exp60.length}</strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#94a3b8', flexShrink: 0 }} />
                          <div>
                            <span style={{ color: '#64748b', fontWeight: '500', fontSize: '0.75rem' }}>Prazo Superior a 60d</span>
                            <strong style={{ display: 'block', fontSize: '1rem', color: '#334155' }}>{selectedPersonData.regular.length}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Lista de Empresas sob Responsabilidade */}
                  <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <h2 className="text-h2" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Building2 size={20} color="var(--primary)" />
                          Empresas Vinculadas a {activePerson}
                        </h2>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          Identificação de papel (Supervisor / Técnico Responsável), periodicidade de visitas e conformidade
                        </span>
                      </div>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: '700', padding: '0.25rem 0.75rem',
                        borderRadius: '1rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary)'
                      }}>
                        {selectedPersonData.companies.length} empresa{selectedPersonData.companies.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '1rem' }}>
                      {selectedPersonData.companies.map(c => {
                        const isSup = isCompanySupervisor(c, activePerson, isSamePerson(activePerson, loggedUserName) ? loggedUserId : undefined);
                        const isTec = isCompanyTecnico(c, activePerson, isSamePerson(activePerson, loggedUserName) ? loggedUserId : undefined);

                        const compDeliverables = deliverables.filter(d => d.companyId === c.id);
                        const compPending = compDeliverables.filter(d => !isDelivered(d) && d.status !== 'cancelado' && d.status !== 'nao_se_aplica');
                        const compExp30 = compPending.filter(d => {
                          const dt = d.validityDate || d.dueDate || d.dataEnvio;
                          return dt && new Date(dt) <= in30Days;
                        });
                        const compExp60 = compPending.filter(d => {
                          const dt = d.validityDate || d.dueDate || d.dataEnvio;
                          if (!dt) return false;
                          const target = new Date(dt);
                          return target > in30Days && target <= in60Days;
                        });

                        return (
                          <div
                            key={c.id}
                            style={{
                              padding: '1.125rem',
                              backgroundColor: 'var(--background)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-md)',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              gap: '0.875rem'
                            }}
                          >
                            <div>
                              {/* Topo do Card da Empresa: Nome e Papel */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <div>
                                  <Link
                                    to={`/company/${c.id}`}
                                    style={{
                                      fontSize: '0.9375rem', fontWeight: '700', color: 'var(--text-primary)',
                                      textDecoration: 'none', display: 'block', lineHeight: 1.3
                                    }}
                                  >
                                    {c.name}
                                  </Link>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                    {c.groupName}
                                  </span>
                                </div>
                              </div>

                              {/* Badges de Atuação: Supervisor / Técnico Responsável */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.75rem' }}>
                                {isSup && isTec ? (
                                  <span style={{
                                    fontSize: '0.72rem', fontWeight: '700', padding: '0.2rem 0.5rem',
                                    borderRadius: '0.375rem', backgroundColor: '#eef2ff', color: '#4338ca',
                                    border: '1px solid #c7d2fe', display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                                  }}>
                                    <CheckCircle size={12} /> Supervisor & Técnico Responsável
                                  </span>
                                ) : isSup ? (
                                  <span style={{
                                    fontSize: '0.72rem', fontWeight: '700', padding: '0.2rem 0.5rem',
                                    borderRadius: '0.375rem', backgroundColor: '#eff6ff', color: '#1d4ed8',
                                    border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                                  }}>
                                    <ShieldCheck size={12} /> Supervisor
                                  </span>
                                ) : (
                                  <span style={{
                                    fontSize: '0.72rem', fontWeight: '700', padding: '0.2rem 0.5rem',
                                    borderRadius: '0.375rem', backgroundColor: '#f0fdfa', color: '#0f766e',
                                    border: '1px solid #99f6e4', display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                                  }}>
                                    <UserCheck size={12} /> Técnico Responsável
                                  </span>
                                )}

                                <span style={{
                                  fontSize: '0.72rem', fontWeight: '600', padding: '0.2rem 0.5rem',
                                  borderRadius: '0.375rem', backgroundColor: 'var(--surface-hover)',
                                  color: 'var(--text-secondary)', border: '1px solid var(--border)',
                                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                                }}>
                                  <Clock size={12} /> Visitas: {c.effVisitas === 'N/A' ? 'N/A' : `${c.effVisitas} dias`}
                                </span>
                              </div>
                            </div>

                            {/* Rodapé do Card da Empresa */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                              <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  {compPending.length} pendente{compPending.length !== 1 ? 's' : ''}
                                </span>
                                {compExp30.length > 0 && (
                                  <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: '700', marginLeft: '6px' }}>
                                    🔴 {compExp30.length} ≤30d
                                  </span>
                                )}
                                {compExp60.length > 0 && (
                                  <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: '700', marginLeft: '6px' }}>
                                    🟡 {compExp60.length} ≤60d
                                  </span>
                                )}
                              </div>
                              <Link
                                to={`/company/${c.id}`}
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem', gap: '0.25rem' }}
                              >
                                Ver Empresa <ChevronRight size={13} />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Entregáveis Pendentes das Empresas deste Responsável */}
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <div>
                        <h2 className="text-h2" style={{ margin: 0, fontSize: '1.05rem' }}>Entregáveis a Cumprir</h2>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Nas empresas vinculadas a {activePerson}
                        </span>
                      </div>
                      <Link to="/deliverables" style={{ color: 'var(--primary)', fontSize: '0.8125rem', fontWeight: '500' }}>
                        Ver todos
                      </Link>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                      {selectedPersonData.upcomingDeliverables.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem' }}>
                          ✅ Nenhum entregável pendente nas suas empresas!
                        </p>
                      ) : selectedPersonData.upcomingDeliverables.map((item) => {
                        const sc = statusColors[item.status] || statusColors.pendente;
                        const targetDate = item.validityDate || item.dueDate || item.dataEnvio;
                        const isExpiring30 = targetDate && new Date(targetDate) <= in30Days;
                        const isExpiring60 = targetDate && new Date(targetDate) > in30Days && new Date(targetDate) <= in60Days;

                        return (
                          <div key={item.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.75rem 0.875rem', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)', backgroundColor: 'var(--background)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                              {statusIcons[item.status] || statusIcons.pendente}
                              <div>
                                <h4 style={{ fontWeight: '600', color: 'var(--text-primary)', margin: 0, fontSize: '0.8125rem' }}>
                                  {item.title}
                                </h4>
                                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '0.125rem 0 0 0' }}>
                                  {item.companyName}
                                  {isExpiring30 && <span style={{ color: '#ef4444', fontWeight: '700', marginLeft: '6px' }}>🔴 ≤30d</span>}
                                  {isExpiring60 && <span style={{ color: '#f59e0b', fontWeight: '700', marginLeft: '6px' }}>🟡 ≤60d</span>}
                                </p>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 0.125rem 0' }}>
                                {targetDate ? new Date(targetDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Sem data'}
                              </p>
                              <span style={{
                                fontSize: '0.65rem', padding: '0.125rem 0.5rem', borderRadius: '1rem',
                                backgroundColor: sc.bg, color: sc.color, fontWeight: '600'
                              }}>
                                {statusLabels[item.status] || item.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* MODO 2: COMPARATIVO GERAL DE TODOS OS SUPERVISORES / TÉCNICOS */}
          {activePerson === 'all' && (
            <div>
              {responsibleData.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  <UserCheck size={48} style={{ opacity: 0.4, marginBottom: '1rem' }} />
                  <p>Nenhum colaborador com empresas atribuídas como Supervisor ou Técnico Responsável.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 540px), 1fr))', gap: '1.25rem' }}>
                  {responsibleData.map(resp => {
                    const isUser = isSamePerson(resp.name, loggedUserName);
                    return (
                      <div key={resp.name} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        
                        {/* Cabeçalho do Responsável */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '42px', height: '42px', borderRadius: '50%',
                              backgroundColor: isUser ? '#e0f2fe' : 'var(--primary-light)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <UserCheck size={20} color={isUser ? '#0369a1' : 'var(--primary)'} />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                                  {resp.name}
                                </h3>
                                {isUser && (
                                  <span style={{
                                    fontSize: '0.6875rem', fontWeight: '700', padding: '0.125rem 0.5rem',
                                    borderRadius: '1rem', backgroundColor: '#e0f2fe', color: '#0369a1',
                                    border: '1px solid #bae6fd'
                                  }}>
                                    Você
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {resp.totalCompanies} empresa{resp.totalCompanies > 1 ? 's' : ''} sob responsabilidade
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setFilterResp(resp.name)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', gap: '0.25rem' }}
                          >
                            Abrir Painel <ArrowRight size={13} />
                          </button>
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
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA #2: VISÃO GERAL (CONSOLIDADA)                                         */}
      {/* ========================================================================= */}
      {dashMode === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Stats Grid Global */}
          <div className="grid-responsive-stats">
            {globalStats.map((stat, index) => (
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

          {/* Painel Central: A Vencer (Barra Amarelo e Vermelho) */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 className="text-h2" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={20} color="var(--primary)" /> Visão Geral de Prazos dos Entregáveis
              </h2>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Consolidação geral de entregáveis a vencer em todas as empresas
              </p>
            </div>

            {/* BARRA VISUAL COLORIDA (VERDE, AMARELO E VERMELHO) */}
            <div style={{ backgroundColor: 'var(--background)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.9375rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} color="#f59e0b" /> Entregáveis a Vencer (Prazos de 30 e 60 Dias)
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Total Pendentes: <strong style={{ color: 'var(--text-primary)' }}>{deliverablesAnalysis.pending.length}</strong>
                </span>
              </div>

              {/* Barra segmentada horizontal */}
              <div style={{ height: '16px', width: '100%', borderRadius: '8px', display: 'flex', overflow: 'hidden', backgroundColor: '#e2e8f0', marginBottom: '0.875rem' }}>
                {deliverablesAnalysis.delivered.length > 0 && (
                  <div 
                    style={{ width: `${deliverablesAnalysis.pctDelivered}%`, backgroundColor: '#10b981', transition: 'width 0.3s' }} 
                    title={`Entregues / Concluídos: ${deliverablesAnalysis.delivered.length}`}
                  />
                )}
                {deliverablesAnalysis.expiring60.length > 0 && (
                  <div 
                    style={{ width: `${deliverablesAnalysis.pct60}%`, backgroundColor: '#f59e0b', transition: 'width 0.3s' }} 
                    title={`A Vencer em 60 dias (Alerta): ${deliverablesAnalysis.expiring60.length}`}
                  />
                )}
                {deliverablesAnalysis.expiring30.length > 0 && (
                  <div 
                    style={{ width: `${deliverablesAnalysis.pct30}%`, backgroundColor: '#ef4444', transition: 'width 0.3s' }} 
                    title={`A Vencer em até 30 dias (Crítico): ${deliverablesAnalysis.expiring30.length}`}
                  />
                )}
                {deliverablesAnalysis.regular.length > 0 && (
                  <div 
                    style={{ width: `${deliverablesAnalysis.pctRegular}%`, backgroundColor: '#cbd5e1', transition: 'width 0.3s' }} 
                    title={`Mais de 60 dias / Regular: ${deliverablesAnalysis.regular.length}`}
                  />
                )}
                {deliverablesAnalysis.total === 0 && (
                  <div style={{ width: '100%', backgroundColor: '#10b981' }} title="Tudo em dia!" />
                )}
              </div>

              {/* Indicadores numéricos detalhados */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981', flexShrink: 0 }} />
                  <div>
                    <span style={{ color: '#15803d', fontWeight: '500' }}>Entregues / Concluídos</span>
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#94a3b8', flexShrink: 0 }} />
                  <div>
                    <span style={{ color: '#64748b', fontWeight: '500' }}>Mais de 60 dias</span>
                    <strong style={{ display: 'block', fontSize: '1.125rem', color: '#334155' }}>{deliverablesAnalysis.regular.length}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Duas Colunas: Entregáveis Pendentes e Treinamentos Globais */}
          <div className="grid-responsive-2">
            {/* Upcoming Deliverables Globais */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="text-h2">Entregáveis Pendentes</h2>
                <Link to="/deliverables" style={{ color: 'var(--primary)', fontSize: '0.875rem', fontWeight: '500' }}>Ver todos</Link>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {globalUpcomingDeliverables.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                    ✅ Nenhum entregável pendente!
                  </p>
                ) : globalUpcomingDeliverables.map((item) => {
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

            {/* Upcoming Trainings Globais */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="text-h2">Treinamentos</h2>
                <Link to="/calendar" style={{ color: 'var(--primary)', fontSize: '0.875rem', fontWeight: '500' }}>Ver calendário</Link>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {globalUpcomingTrainings.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                    Nenhum treinamento registrado.
                  </p>
                ) : globalUpcomingTrainings.map((item) => {
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
