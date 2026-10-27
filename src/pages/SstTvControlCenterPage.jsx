import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, CheckCircle2, AlertTriangle, Maximize2, Minimize2,
  ArrowLeft, ShieldCheck, Radio, BarChart3, Calendar, Clock,
  Users, FileText, RefreshCw, Sun, Moon, Play, Pause, Filter,
  Award, Flame
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  getContracts, getDeliverables, getTrainings, getCompanies, getGroups, getProfiles
} from '../services/storageService';
import {
  parseSafeDate,
  isDelivered,
  isItemExpired,
  isItemExpiring30,
  isItemExpiring60,
  getExpirationTargetDate,
  getDaysUntilExpiration
} from '../utils/deliverableTiming';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../lib/supabase';
import '../tv2.css';

// Helpers de normalização de nomes (mesmo padrão do Dashboard SST)
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

function isCompanyAssignedTo(company, personName) {
  if (!personName || personName === 'all') return true;
  return (
    isSamePerson(company.effSupervisor, personName) ||
    isSamePerson(company.supervisor, personName) ||
    isSamePerson(company.supportResponsible, personName) ||
    isSamePerson(company.effTecnico, personName) ||
    isSamePerson(company.tecnicoResponsavel, personName) ||
    isSamePerson(company.responsible, personName)
  );
}

function formatDateBR(val) {
  const d = parseSafeDate(val);
  if (!d) return 'Sem data';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

const TYPE_LABELS = {
  programa: 'Programa',
  laudo: 'Laudo',
  documento: 'Documento',
  treinamento: 'Treinamento',
  contrato: 'Contrato',
  visita_tecnica: 'Visita Técnica'
};

const SstTvControlCenterPage = () => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [contracts, setContracts] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [groups, setGroups] = useState([]);
  const [profiles, setProfiles] = useState([]);

  // Controles interativos do Painel TV
  const [selectedResponsible, setSelectedResponsible] = useState('all');
  const [chartMode, setChartMode] = useState('documentos'); // 'documentos' | 'equipe'
  const [expiringFilter, setExpiringFilter] = useState('proximos'); // 'proximos' | 'criticos' | 'vencidos' | 'todos'
  const [autoCycle, setAutoCycle] = useState(false);

  // Relógio em tempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Rotação automática opcional para modo TV na parede
  useEffect(() => {
    if (!autoCycle) return undefined;
    const cycleTimer = setInterval(() => {
      setChartMode(prev => (prev === 'documentos' ? 'equipe' : 'documentos'));
      setExpiringFilter(prev => {
        const order = ['proximos', 'criticos', 'vencidos', 'todos'];
        const nextIdx = (order.indexOf(prev) + 1) % order.length;
        return order[nextIdx];
      });
    }, 18000);
    return () => clearInterval(cycleTimer);
  }, [autoCycle]);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
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
    } catch (err) {
      console.error('Erro ao carregar dados do Painel TV SST:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);

    // Atualização periódica e Realtime via Supabase
    const interval = setInterval(() => loadData(true), 60000);
    const channel = supabase
      .channel('sst-tv-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliverables' }, () => loadData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => loadData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trainings' }, () => loadData(true))
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Resolução de herança de grupo (Supervisor, Técnico Responsável e Visitas)
  const companiesWithHeritage = useMemo(() => {
    const groupsMap = {};
    groups.forEach(g => { groupsMap[g.id] = g; });

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
      const effVisitas = (gResolved?.vis && gResolved.vis !== 'N/A')
        ? gResolved.vis
        : ((g?.visitasTecnicas && g.visitasTecnicas !== 'N/A') ? g.visitasTecnicas : (c.visitasTecnicas || 'N/A'));
      return {
        ...c,
        groupName: g?.name || 'Sem Grupo',
        effSupervisor: effSupervisor || 'Não definido',
        effTecnico: effTecnico || 'Não definido',
        effVisitas: effVisitas || 'N/A',
      };
    });
  }, [companies, groups]);

  // Lista de responsáveis para o filtro da TV
  const responsiblesList = useMemo(() => {
    const map = new Map();
    companiesWithHeritage.forEach(c => {
      if (c.effTecnico && c.effTecnico !== 'Não definido') {
        map.set(c.effTecnico, (map.get(c.effTecnico) || 0) + 1);
      }
      if (c.effSupervisor && c.effSupervisor !== 'Não definido' && !isSamePerson(c.effSupervisor, c.effTecnico)) {
        map.set(c.effSupervisor, (map.get(c.effSupervisor) || 0) + 1);
      }
    });
    profiles.forEach(p => {
      if (p.name && !map.has(p.name)) map.set(p.name, 0);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [companiesWithHeritage, profiles]);

  // Datas de referência
  const today = useMemo(() => {
    const dt = new Date();
    dt.setHours(0, 0, 0, 0);
    return dt;
  }, []);

  const in30Days = useMemo(() => new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), [today]);
  const in60Days = useMemo(() => new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000), [today]);
  const in90Days = useMemo(() => new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000), [today]);

  // Empresas filtradas (Geral ou por Responsável)
  const filteredCompanies = useMemo(() => {
    if (selectedResponsible === 'all') return companiesWithHeritage;
    return companiesWithHeritage.filter(c => isCompanyAssignedTo(c, selectedResponsible));
  }, [companiesWithHeritage, selectedResponsible]);

  const filteredCompanyIds = useMemo(() => new Set(filteredCompanies.map(c => c.id)), [filteredCompanies]);

  const companiesMap = useMemo(() => {
    const map = {};
    companiesWithHeritage.forEach(c => { map[c.id] = c; });
    return map;
  }, [companiesWithHeritage]);

  // Entregáveis ativos filtrados
  const activeDeliverables = useMemo(() => {
    return deliverables
      .filter(d => filteredCompanyIds.has(d.companyId) && d.status !== 'cancelado' && d.status !== 'nao_se_aplica')
      .map(d => {
        const comp = companiesMap[d.companyId];
        const daysLeft = getDaysUntilExpiration(d, today);
        const targetDateObj = getExpirationTargetDate(d);
        const expired = isItemExpired(d, today);
        const exp30 = isItemExpiring30(d, today, in30Days);
        const exp60 = isItemExpiring60(d, today, in30Days, in60Days);
        const exp90 = !expired && !exp30 && !exp60 && targetDateObj && targetDateObj > in60Days && targetDateObj <= in90Days;
        const delivered = isDelivered(d);

        return {
          ...d,
          companyName: comp?.name || 'Empresa',
          groupName: comp?.groupName || 'Sem Grupo',
          supervisor: comp?.effSupervisor || 'Não definido',
          tecnico: comp?.effTecnico || 'Não definido',
          daysLeft,
          targetDateStr: d.validityDate || (!delivered ? (d.dueDate || d.dataEnvio || d.dataEmissao) : null),
          isExpired: expired,
          isExp30: exp30,
          isExp60: exp60,
          isExp90: Boolean(exp90),
          isDeliveredItem: delivered
        };
      });
  }, [deliverables, filteredCompanyIds, companiesMap, today, in30Days, in60Days, in90Days]);

  // Métricas Globais SST para o Painel TV
  const metrics = useMemo(() => {
    const expired = activeDeliverables.filter(d => d.isExpired);
    const expTodayOr7d = activeDeliverables.filter(d => !d.isExpired && d.daysLeft !== null && d.daysLeft >= 0 && d.daysLeft <= 7);
    const exp30 = activeDeliverables.filter(d => d.isExp30);
    const exp60 = activeDeliverables.filter(d => d.isExp60);
    const exp90 = activeDeliverables.filter(d => d.isExp90);
    const deliveredVigentes = activeDeliverables.filter(d => d.isDeliveredItem && !d.isExpired);
    const deliveredSafe = activeDeliverables.filter(d => d.isDeliveredItem && !d.isExpired && !d.isExp30 && !d.isExp60);

    // Itens com data de validade futura (próximos a vencer ordenados por proximidade)
    const allUpcomingValidities = activeDeliverables
      .filter(d => !d.isExpired && d.daysLeft !== null && d.daysLeft >= 0)
      .sort((a, b) => (a.daysLeft ?? 99999) - (b.daysLeft ?? 99999));

    const validOver30 = allUpcomingValidities.filter(d => d.daysLeft > 30);

    const companiesWithExpired = new Set(expired.map(d => d.companyId));
    const companiesWithExp30 = new Set(exp30.map(d => d.companyId));
    const totalComps = filteredCompanies.length || 1;
    const regularCompaniesCount = Math.max(0, filteredCompanies.length - companiesWithExpired.size);
    const pctRegularCompanies = Math.round((regularCompaniesCount / totalComps) * 100);

    // Taxa de conformidade entre os itens entregues/monitorados com validade
    const totalMonitoredWithStatus = deliveredVigentes.length + expired.length;
    const pctConformity = totalMonitoredWithStatus > 0
      ? Math.round((deliveredVigentes.length / totalMonitoredWithStatus) * 100)
      : 100;

    return {
      totalActive: activeDeliverables.length,
      expired,
      expTodayOr7d,
      exp30,
      exp60,
      exp90,
      validOver30,
      deliveredVigentes,
      deliveredSafe,
      allUpcomingValidities,
      companiesWithExpiredCount: companiesWithExpired.size,
      companiesWithExp30Count: companiesWithExp30.size,
      regularCompaniesCount,
      pctRegularCompanies,
      pctConformity
    };
  }, [activeDeliverables, filteredCompanies.length]);

  // Gráfico 1: Panorama Geral por Programa / Documento SST
  const documentChartData = useMemo(() => {
    const categories = [
      { key: 'PGR', match: (t) => t.toUpperCase().includes('PGR') },
      { key: 'PCMSO', match: (t) => t.toUpperCase() === 'PCMSO' || (t.toUpperCase().includes('PCMSO') && !t.toUpperCase().includes('ANAL')) },
      { key: 'Rel. Analítico', match: (t) => t.toUpperCase().includes('ANALÍTICO') || t.toUpperCase().includes('ANALITICO') },
      { key: 'LTCAT', match: (t) => t.toUpperCase().includes('LTCAT') },
      { key: 'eSocial', match: (t) => t.toUpperCase().includes('ESOCIAL') || t.toUpperCase().includes('2240') },
      { key: 'Psicossocial', match: (t) => t.toUpperCase().includes('PSICOSSOCIAL') },
      { key: 'LI / LP', match: (t) => ['LI', 'LP'].includes(t.toUpperCase().trim()) || t.toUpperCase().includes('INSALUBRIDADE') || t.toUpperCase().includes('PERICULOSIDADE') },
      { key: 'OS / Outros', match: () => true }
    ];

    const buckets = categories.map(c => ({
      name: c.key,
      Vigentes: 0,
      'A Vencer (≤30d)': 0,
      Vencidos: 0,
      Pendentes: 0
    }));

    activeDeliverables.forEach(d => {
      const title = d.title || '';
      let idx = categories.findIndex((c, i) => i < categories.length - 1 && c.match(title));
      if (idx === -1) idx = categories.length - 1;

      if (d.isExpired) {
        buckets[idx].Vencidos += 1;
      } else if (d.isExp30 || d.isExp60) {
        buckets[idx]['A Vencer (≤30d)'] += 1;
      } else if (d.isDeliveredItem) {
        buckets[idx].Vigentes += 1;
      } else {
        buckets[idx].Pendentes += 1;
      }
    });

    return buckets.filter(b => (b.Vigentes + b['A Vencer (≤30d)'] + b.Vencidos + b.Pendentes) > 0);
  }, [activeDeliverables]);

  // Gráfico 2: Panorama por Supervisor / Técnico Responsável
  const teamChartData = useMemo(() => {
    return responsiblesList.slice(0, 7).map(r => {
      const compIds = new Set(
        companiesWithHeritage
          .filter(c => isCompanyAssignedTo(c, r.name))
          .map(c => c.id)
      );
      const items = activeDeliverables.filter(d => compIds.has(d.companyId));
      const vigentes = items.filter(d => d.isDeliveredItem && !d.isExpired && !d.isExp30).length;
      const aVencer = items.filter(d => d.isExp30 || d.isExp60).length;
      const vencidos = items.filter(d => d.isExpired).length;

      const shortName = r.name.split(' ').slice(0, 2).join(' ');
      return {
        name: shortName.length > 14 ? shortName.substring(0, 14) + '…' : shortName,
        fullName: r.name,
        empresas: compIds.size,
        Vigentes: vigentes,
        'A Vencer (≤30d)': aVencer,
        Vencidos: vencidos
      };
    });
  }, [responsiblesList, companiesWithHeritage, activeDeliverables]);

  // Gráfico Donut: Distribuição das Validades Monitoradas
  const validityPieData = useMemo(() => {
    const expiredCount = metrics.expired.length;
    const exp30Count = metrics.exp30.length;
    const exp60_90Count = metrics.exp60.length + metrics.exp90.length;
    const safeDeliveredCount = Math.max(0, metrics.deliveredVigentes.length - metrics.exp30.filter(d => d.isDeliveredItem).length - metrics.exp60.filter(d => d.isDeliveredItem).length);

    const data = [
      { name: 'Vigentes (>30d)', value: safeDeliveredCount, color: '#10b981' },
      { name: 'A Vencer ≤30d', value: exp30Count, color: '#f59e0b' },
      { name: 'A Vencer 31-90d', value: exp60_90Count, color: '#3b82f6' },
      { name: 'Vencidos', value: expiredCount, color: '#dc2626' },
    ].filter(item => item.value > 0);

    return data.length > 0 ? data : [{ name: 'Em Dia', value: 1, color: '#10b981' }];
  }, [metrics]);

  // Lista da Direita: Próximos a Vencer & Vencidos
  const displayedExpirationsList = useMemo(() => {
    // 1. Próximos a Vencer: ordenados estritamente do mais próximo de hoje para o mais distante
    const upcoming = [...metrics.allUpcomingValidities].sort((a, b) => {
      if ((a.daysLeft ?? 9999) !== (b.daysLeft ?? 9999)) {
        return (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999);
      }
      return a.companyName.localeCompare(b.companyName);
    });

    // 2. Vencidos: ordenados dos vencidos mais recentemente para os mais antigos
    const expired = [...metrics.expired].sort((a, b) => {
      return (b.daysLeft ?? -9999) - (a.daysLeft ?? -9999);
    });

    if (expiringFilter === 'proximos') {
      return upcoming;
    }
    if (expiringFilter === 'criticos') {
      const crit = upcoming.filter(d => (d.daysLeft ?? 999) <= 30);
      return [...crit, ...expired];
    }
    if (expiringFilter === 'vencidos') {
      return expired;
    }
    // 'todos'
    return [...upcoming, ...expired];
  }, [metrics, expiringFilter]);

  // Formatação de hora e data para o cabeçalho
  const timeStr = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  // Alertas para o Ticker inferior (RADAR SST)
  const tickerAlerts = useMemo(() => {
    const list = [];
    const dueToday = metrics.allUpcomingValidities.filter(d => d.daysLeft === 0);
    if (dueToday.length > 0) {
      list.push(`🚨 ATENÇÃO HOJE: ${dueToday.length} documento(s) vencem HOJE (${dueToday.map(d => `${d.title} - ${d.companyName}`).slice(0, 3).join(', ')})`);
    }
    if (metrics.exp30.length > 0) {
      list.push(`🔴 PRÓXIMOS A VENCER: ${metrics.exp30.length} programa(s)/documento(s) vencem nos próximos 30 dias em ${metrics.companiesWithExp30Count} empresa(s)`);
    }
    if (metrics.expired.length > 0) {
      list.push(`⚠️ VENCIDOS: ${metrics.expired.length} item(ns) com validade expirada em ${metrics.companiesWithExpiredCount} empresa(s) aguardando renovação`);
    }
    list.push(`🏢 PANORAMA SST: ${filteredCompanies.length} empresas monitoradas · ${metrics.deliveredVigentes.length} entregáveis vigentes · ${metrics.pctConformity}% de conformidade nas validades`);
    return list;
  }, [metrics, filteredCompanies.length]);

  const totalBarRef = Math.max(1, metrics.expired.length + metrics.exp30.length + metrics.validOver30.length + Math.max(0, metrics.deliveredSafe.length - metrics.validOver30.length));

  return (
    <div className="tv-fullscreen-wrapper">
      <div className="tv2">
        {/* ── HEADER TV SST ── */}
        <header className="tv2-header">
          <div className="tv2-header-left">
            <button
              className="tv2-back"
              onClick={() => navigate('/')}
              title="Voltar ao Dashboard SST"
            >
              <ArrowLeft size={14} />
            </button>
            <div className="tv2-logo">
              <Radio size={16} />
            </div>
            <div className="tv2-brand">
              <span className="tv2-live-tag">
                <span className="tv2-live-dot" />
                CENTRAL DE CONTROLE SST — PAINEL TV
              </span>
              <h1 className="tv2-title">
                SST · Panorama Geral & Controle de Vencimentos
              </h1>
            </div>
          </div>

          <div className="tv2-header-center">
            <span className="tv2-time">{timeStr}</span>
            <span className="tv2-date">{dateStr}</span>
          </div>

          <div className="tv2-header-right">
            {/* Filtro por Supervisor ou Técnico Responsável */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '3px 8px' }}>
              <Filter size={12} className="text-blue" />
              <select
                value={selectedResponsible}
                onChange={(e) => setSelectedResponsible(e.target.value)}
                aria-label="Filtrar por responsável"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  maxWidth: '190px'
                }}
              >
                <option value="all" style={{ background: 'var(--surface)', color: 'var(--text-primary)' }}>
                  🌐 Todas as Empresas ({companiesWithHeritage.length})
                </option>
                {responsiblesList.map(r => (
                  <option key={r.name} value={r.name} style={{ background: 'var(--surface)', color: 'var(--text-primary)' }}>
                    {r.name} ({r.count} emp.)
                  </option>
                ))}
              </select>
            </div>

            {/* Botão de Auto-Rotação para TV */}
            <button
              type="button"
              onClick={() => setAutoCycle(v => !v)}
              title={autoCycle ? 'Pausar rotação automática de abas da TV' : 'Ativar rotação automática para TV'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                borderRadius: '20px',
                fontSize: '0.65rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: autoCycle ? '1px solid var(--primary)' : '1px solid var(--border)',
                backgroundColor: autoCycle ? 'var(--primary-light)' : 'var(--background)',
                color: autoCycle ? 'var(--primary)' : 'var(--text-secondary)'
              }}
            >
              {autoCycle ? <Pause size={11} /> : <Play size={11} />}
              <span>{autoCycle ? 'AUTO TV ON' : 'AUTO TV'}</span>
            </button>

            <div className="tv2-chip-ok">
              <ShieldCheck size={13} />
              <span>SST ONLINE</span>
            </div>

            <button
              className="tv2-fs-btn"
              onClick={() => loadData(true)}
              title="Atualizar dados agora"
            >
              <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            </button>

            <button
              className="tv2-fs-btn"
              onClick={toggleTheme}
              title={isDark ? 'Modo Claro' : 'Modo Escuro'}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <button
              className="tv2-fs-btn"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Sair da Tela Cheia' : 'Modo Tela Cheia (TV)'}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        </header>

        {/* ── FAIXA DE KPIs (5 CARDS) ── */}
        <div className="tv2-kpi-strip">
          {/* KPI 1: Empresas Monitoradas */}
          <div className="tv2-kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="tv2-kpi-icon bg-blue-dim"><Building2 size={18} /></div>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 7px', borderRadius: '12px' }}>
                {groups.length} Grupos
              </span>
            </div>
            <div className="tv2-kpi-body">
              <span className="tv2-kpi-val">
                {filteredCompanies.length}
                <span className="tv2-kpi-sub"> ({metrics.pctRegularCompanies}% em dia)</span>
              </span>
              <span className="tv2-kpi-lbl">Empresas Monitoradas</span>
            </div>
            <div className="tv2-kpi-bar">
              <div className="tv2-kpi-fill" style={{ width: `${metrics.pctRegularCompanies}%`, background: '#2563eb' }} />
            </div>
          </div>

          {/* KPI 2: Entregáveis Vigentes / Entregues */}
          <div className="tv2-kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="tv2-kpi-icon bg-emerald-dim"><CheckCircle2 size={18} /></div>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '2px 7px', borderRadius: '12px' }}>
                {metrics.pctConformity}% Conformidade
              </span>
            </div>
            <div className="tv2-kpi-body">
              <span className="tv2-kpi-val">
                {metrics.deliveredVigentes.length}
                <span className="tv2-kpi-sub"> vigentes</span>
              </span>
              <span className="tv2-kpi-lbl">Programas & Laudos Entregues</span>
            </div>
            <div className="tv2-kpi-bar">
              <div className="tv2-kpi-fill" style={{ width: `${metrics.pctConformity}%`, background: '#10b981' }} />
            </div>
          </div>

          {/* KPI 3: Próximos a Vencer <= 30 Dias (CRÍTICO) */}
          <div
            className={`tv2-kpi-card ${metrics.exp30.length > 0 ? 'tv2-kpi-warn' : ''}`}
            onClick={() => setExpiringFilter('proximos')}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="tv2-kpi-icon" style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                <Flame size={18} />
              </div>
              {metrics.expTodayOr7d.length > 0 && (
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#fff', background: '#ef4444', padding: '2px 7px', borderRadius: '12px' }}>
                  {metrics.expTodayOr7d.length} em ≤ 7 dias!
                </span>
              )}
            </div>
            <div className="tv2-kpi-body">
              <span className="tv2-kpi-val" style={{ color: metrics.exp30.length > 0 ? '#ef4444' : undefined }}>
                {metrics.exp30.length}
                <span className="tv2-kpi-sub"> ({metrics.companiesWithExp30Count} emp.)</span>
              </span>
              <span className="tv2-kpi-lbl">Próximos a Vencer (≤ 30 Dias)</span>
            </div>
            <div className="tv2-kpi-bar">
              <div className="tv2-kpi-fill" style={{ width: `${Math.min(100, (metrics.exp30.length / Math.max(1, metrics.allUpcomingValidities.length)) * 100)}%`, background: '#ef4444' }} />
            </div>
          </div>

          {/* KPI 4: Vencidos / Atrasados */}
          <div
            className={`tv2-kpi-card ${metrics.expired.length > 0 ? 'tv2-kpi-danger' : ''}`}
            onClick={() => setExpiringFilter('vencidos')}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="tv2-kpi-icon" style={{ backgroundColor: 'rgba(220,38,38,0.12)', color: '#dc2626' }}>
                <AlertTriangle size={18} />
              </div>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#dc2626', background: 'rgba(220,38,38,0.12)', padding: '2px 7px', borderRadius: '12px' }}>
                {metrics.companiesWithExpiredCount} empresa(s)
              </span>
            </div>
            <div className="tv2-kpi-body">
              <span className="tv2-kpi-val" style={{ color: metrics.expired.length > 0 ? '#dc2626' : undefined }}>
                {metrics.expired.length}
                <span className="tv2-kpi-sub"> expirados</span>
              </span>
              <span className="tv2-kpi-lbl">Vencidos · Renovação Imediata</span>
            </div>
            <div className="tv2-kpi-bar">
              <div className="tv2-kpi-fill" style={{ width: metrics.expired.length > 0 ? '100%' : '0%', background: '#dc2626' }} />
            </div>
          </div>

          {/* KPI 5: Validades Futuras (> 30 dias) */}
          <div
            className="tv2-kpi-card"
            onClick={() => setExpiringFilter('todos')}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="tv2-kpi-icon bg-blue-dim"><Calendar size={18} /></div>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#3b82f6', background: 'rgba(59,130,246,0.12)', padding: '2px 7px', borderRadius: '12px' }}>
                Monitorados
              </span>
            </div>
            <div className="tv2-kpi-body">
              <span className="tv2-kpi-val">
                {metrics.allUpcomingValidities.length}
                <span className="tv2-kpi-sub"> programados</span>
              </span>
              <span className="tv2-kpi-lbl">Total c/ Validade a Vencer</span>
            </div>
            <div className="tv2-kpi-bar">
              <div className="tv2-kpi-fill" style={{ width: '100%', background: '#3b82f6' }} />
            </div>
          </div>
        </div>

        {/* ── CORPO PRINCIPAL: ESQUERDA (PANORAMA GERAL COM GRÁFICO) | DIREITA (PRÓXIMOS A VENCER) ── */}
        <div className="tv2-body" style={{ gridTemplateColumns: '1.35fr 1fr' }}>
          {/* ═══ COLUNA ESQUERDA: PANORAMA GERAL COM GRÁFICOS ═══ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0, overflow: 'hidden' }}>

            {/* 1. Barra de Panorama Geral de Validades e Conformidade */}
            <div className="card" style={{ padding: '10px 14px', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <ShieldCheck size={16} className="text-blue" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    PANORAMA GERAL DE CONFORMIDADE & VALIDADES SST
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.7rem', fontWeight: 600 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} />
                    Vencidos: <strong>{metrics.expired.length}</strong>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                    A Vencer ≤30d: <strong>{metrics.exp30.length}</strong>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#3b82f6' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
                    Validade &gt;30d: <strong>{metrics.validOver30.length}</strong>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                    Entregues Vigentes: <strong>{metrics.deliveredVigentes.length}</strong>
                  </span>
                </div>
              </div>

              {/* Barra de Progresso Segmentada */}
              <div style={{ height: '12px', width: '100%', borderRadius: '6px', display: 'flex', overflow: 'hidden', backgroundColor: 'var(--border)' }}>
                {metrics.deliveredSafe.length > 0 && (
                  <div
                    style={{ width: `${Math.round((metrics.deliveredSafe.length / totalBarRef) * 100)}%`, backgroundColor: '#10b981', transition: 'width 0.5s' }}
                    title={`Entregues e Regulares: ${metrics.deliveredSafe.length}`}
                  />
                )}
                {metrics.validOver30.length > 0 && (
                  <div
                    style={{ width: `${Math.round((metrics.validOver30.length / totalBarRef) * 100)}%`, backgroundColor: '#3b82f6', transition: 'width 0.5s' }}
                    title={`Com validade acima de 30 dias: ${metrics.validOver30.length}`}
                  />
                )}
                {metrics.exp30.length > 0 && (
                  <div
                    style={{ width: `${Math.round((metrics.exp30.length / totalBarRef) * 100)}%`, backgroundColor: '#f59e0b', transition: 'width 0.5s' }}
                    title={`A Vencer em até 30 dias: ${metrics.exp30.length}`}
                  />
                )}
                {metrics.expired.length > 0 && (
                  <div
                    style={{ width: `${Math.round((metrics.expired.length / totalBarRef) * 100)}%`, backgroundColor: '#dc2626', transition: 'width 0.5s' }}
                    title={`Vencidos: ${metrics.expired.length}`}
                  />
                )}
              </div>
            </div>

            {/* 2. Gráfico Principal de Barras: Por Programa/Documento OU Por Equipe Técnica */}
            <div className="tv2-chart-card card" style={{ flex: 1.25 }}>
              <div className="tv2-chart-head" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BarChart3 size={15} className="text-blue" />
                  <span>
                    {chartMode === 'documentos'
                      ? 'Panorama Geral por Programa / Documento SST (PGR, PCMSO, LTCAT, eSocial)'
                      : 'Panorama Geral por Supervisor / Técnico Responsável'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setChartMode('documentos')}
                    style={{
                      fontSize: '0.65rem',
                      padding: '3px 9px',
                      borderRadius: '5px',
                      border: chartMode === 'documentos' ? '1px solid var(--primary)' : '1px solid var(--border)',
                      background: chartMode === 'documentos' ? 'var(--primary)' : 'var(--background)',
                      color: chartMode === 'documentos' ? '#fff' : 'var(--text-secondary)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Por Programa / Doc
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMode('equipe')}
                    style={{
                      fontSize: '0.65rem',
                      padding: '3px 9px',
                      borderRadius: '5px',
                      border: chartMode === 'equipe' ? '1px solid var(--primary)' : '1px solid var(--border)',
                      background: chartMode === 'equipe' ? 'var(--primary)' : 'var(--background)',
                      color: chartMode === 'equipe' ? '#fff' : 'var(--text-secondary)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Por Responsável
                  </button>
                </div>
              </div>

              <div className="tv2-chart-area" style={{ padding: '8px 12px 4px 4px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartMode === 'documentos' ? documentChartData : teamChartData}
                    margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="name"
                      fontSize={11}
                      tick={{ fill: 'var(--text-secondary)', fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      fontSize={10}
                      tick={{ fill: 'var(--text-secondary)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        color: 'var(--text-primary)'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '2px' }} />
                    <Bar dataKey="Vigentes" fill="#10b981" radius={[4, 4, 0, 0]} name="Vigentes / Em Dia" />
                    <Bar dataKey="A Vencer (≤30d)" fill="#f59e0b" radius={[4, 4, 0, 0]} name="A Vencer (≤30d)" />
                    <Bar dataKey="Vencidos" fill="#dc2626" radius={[4, 4, 0, 0]} name="Vencidos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. Linha Inferior Esquerda: Gráfico Rosca de Validades + Quadro de Equipe Técnica */}
            <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: '10px', flex: 0.95, minHeight: 0 }}>
              {/* Donut Chart: Status das Validades */}
              <div className="tv2-chart-card card">
                <div className="tv2-chart-head">
                  <Award size={15} className="text-emerald" />
                  <span>Distribuição de Validades</span>
                </div>
                <div className="tv2-chart-area" style={{ display: 'flex', alignItems: 'center' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={validityPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={62}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {validityPieData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'var(--surface)',
                          borderColor: 'var(--border)',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          color: 'var(--text-primary)'
                        }}
                      />
                      <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        wrapperStyle={{ fontSize: '11px', lineHeight: '18px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Card Resumo por Supervisor / Técnico Responsável */}
              <div className="tv2-chart-card card">
                <div className="tv2-chart-head" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={15} className="text-blue" />
                    <span>Carteira por Técnico / Supervisor</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Clique p/ filtrar
                  </span>
                </div>
                <div className="tv2-chart-area" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px', padding: '6px 10px' }}>
                  {teamChartData.map((resp) => {
                    const isSelected = selectedResponsible === resp.fullName;
                    return (
                      <div
                        key={resp.fullName}
                        onClick={() => setSelectedResponsible(isSelected ? 'all' : resp.fullName)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--background)',
                          border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                          cursor: 'pointer',
                          fontSize: '0.72rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {resp.fullName}
                          </span>
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
                            ({resp.empresas} emp.)
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <span style={{ color: '#10b981', fontWeight: 700 }} title="Vigentes">
                            ✓ {resp.Vigentes}
                          </span>
                          {resp['A Vencer (≤30d)'] > 0 && (
                            <span style={{ background: 'rgba(245,158,11,0.15)', color: '#d97706', padding: '1px 5px', borderRadius: '4px', fontWeight: 700, fontSize: '0.64rem' }}>
                              ⏳ {resp['A Vencer (≤30d)']}
                            </span>
                          )}
                          {resp.Vencidos > 0 && (
                            <span style={{ background: 'rgba(220,38,38,0.15)', color: '#dc2626', padding: '1px 5px', borderRadius: '4px', fontWeight: 700, fontSize: '0.64rem' }}>
                              ⚠ {resp.Vencidos}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 4. Faixa de Resumo Consolidado (Summary Strip) */}
            <div className="tv2-summary card">
              <div className="tv2-sum-item">
                <span className="tv2-sum-val" style={{ color: '#10b981' }}>{metrics.pctConformity}%</span>
                <span className="tv2-sum-lbl">Conformidade Validades</span>
              </div>
              <div className="tv2-sum-divider" />
              <div className="tv2-sum-item">
                <span className="tv2-sum-val" style={{ color: '#2563eb' }}>
                  {metrics.regularCompaniesCount}/{filteredCompanies.length}
                </span>
                <span className="tv2-sum-lbl">Empresas Sem Vencidos</span>
              </div>
              <div className="tv2-sum-divider" />
              <div className="tv2-sum-item">
                <span className="tv2-sum-val" style={{ color: '#ef4444' }}>{metrics.exp30.length}</span>
                <span className="tv2-sum-lbl">Vencem em ≤ 30 Dias</span>
              </div>
              <div className="tv2-sum-divider" />
              <div className="tv2-sum-item">
                <span className="tv2-sum-val" style={{ color: '#8b5cf6' }}>
                  {contracts.filter(c => c.status === 'ativo').length}
                </span>
                <span className="tv2-sum-lbl">Contratos Ativos</span>
              </div>
            </div>

          </div>

          {/* ═══ COLUNA DIREITA: PRÓXIMOS A VENCER & ALERTAS DE VALIDADE ═══ */}
          <div className="tv2-right">
            <div className="tv2-chart-card card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
              {/* Cabeçalho da Lista de Próximos a Vencer */}
              <div className="tv2-chart-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Clock size={16} style={{ color: '#ef4444' }} />
                  <span style={{ fontSize: '0.84rem', fontWeight: 800 }}>
                    PRÓXIMOS A VENCER & CONTROLE DE PRAZOS
                  </span>
                </div>

                {/* Botões de filtro rápido */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'proximos', label: `Próximos a Vencer (${metrics.allUpcomingValidities.length})` },
                    { id: 'criticos', label: `Críticos ≤30d (${metrics.exp30.length})` },
                    { id: 'vencidos', label: `Vencidos (${metrics.expired.length})` },
                    { id: 'todos', label: 'Todos' }
                  ].map(tab => {
                    const active = expiringFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setExpiringFilter(tab.id)}
                        style={{
                          fontSize: '0.64rem',
                          padding: '3px 8px',
                          borderRadius: '5px',
                          border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
                          background: active ? 'var(--primary)' : 'var(--background)',
                          color: active ? '#fff' : 'var(--text-secondary)',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subbarra informativa */}
              <div style={{
                padding: '6px 14px',
                backgroundColor: 'var(--background)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.68rem',
                color: 'var(--text-secondary)',
                flexShrink: 0
              }}>
                <span>
                  Ordenado por proximidade da data de vencimento ({displayedExpirationsList.length} {displayedExpirationsList.length === 1 ? 'item listado' : 'itens listados'})
                </span>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                  Data Base: {formatDateBR(today)}
                </span>
              </div>

              {/* Lista Rolável de Próximos a Vencer */}
              <div
                className="tv2-chart-area"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '7px',
                  padding: '8px 10px',
                  overflowY: 'auto'
                }}
              >
                {loading ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem 1rem', fontSize: '0.85rem' }}>
                    Carregando cronograma de vencimentos SST...
                  </div>
                ) : displayedExpirationsList.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem 1rem' }}>
                    <CheckCircle2 size={36} style={{ color: '#10b981', margin: '0 auto 8px auto' }} />
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      Nenhum item nesta categoria!
                    </div>
                    <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                      Todos os programas e entregáveis estão regulares para o filtro selecionado.
                    </div>
                  </div>
                ) : (
                  displayedExpirationsList.map((item, idx) => {
                    const days = item.daysLeft;
                    const isExpired = item.isExpired || (days !== null && days < 0);
                    const isToday = !isExpired && days === 0;
                    const isTomorrow = !isExpired && days === 1;
                    const isUrgent15 = !isExpired && days !== null && days <= 15;
                    const isCrit30 = !isExpired && days !== null && days <= 30;
                    const isWarn60 = !isExpired && days !== null && days > 30 && days <= 60;

                    let borderColor = '#10b981';
                    let badgeBg = 'rgba(16, 185, 129, 0.14)';
                    let badgeColor = '#10b981';
                    let countdownText = days !== null ? `Faltam ${days} dias` : 'Programado';

                    if (isExpired) {
                      borderColor = '#dc2626';
                      badgeBg = '#dc2626';
                      badgeColor = '#ffffff';
                      countdownText = days !== null ? `VENCIDO HÁ ${Math.abs(days)}d` : 'VENCIDO';
                    } else if (isToday) {
                      borderColor = '#dc2626';
                      badgeBg = '#dc2626';
                      badgeColor = '#ffffff';
                      countdownText = '🚨 VENCE HOJE!';
                    } else if (isTomorrow) {
                      borderColor = '#ea580c';
                      badgeBg = '#ea580c';
                      badgeColor = '#ffffff';
                      countdownText = '🔴 VENCE AMANHÃ';
                    } else if (isUrgent15) {
                      borderColor = '#ef4444';
                      badgeBg = 'rgba(239, 68, 68, 0.15)';
                      badgeColor = '#ef4444';
                      countdownText = `🔴 Faltam ${days} dias`;
                    } else if (isCrit30) {
                      borderColor = '#f59e0b';
                      badgeBg = 'rgba(245, 158, 11, 0.16)';
                      badgeColor = '#d97706';
                      countdownText = `🟠 Faltam ${days} dias`;
                    } else if (isWarn60) {
                      borderColor = '#eab308';
                      badgeBg = 'rgba(234, 179, 8, 0.15)';
                      badgeColor = '#ca8a04';
                      countdownText = `🟡 Faltam ${days} dias`;
                    } else {
                      borderColor = '#3b82f6';
                      badgeBg = 'rgba(59, 130, 246, 0.14)';
                      badgeColor = '#3b82f6';
                    }

                    return (
                      <div
                        key={item.id || idx}
                        onClick={() => navigate(`/company/${item.companyId}`)}
                        title="Clique para abrir os detalhes da empresa"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '9px 12px',
                          backgroundColor: isToday || isExpired ? 'rgba(220, 38, 38, 0.05)' : 'var(--background)',
                          borderRadius: '8px',
                          border: `1px solid ${isToday || isExpired ? 'rgba(220, 38, 38, 0.35)' : 'var(--border)'}`,
                          borderLeft: `4px solid ${borderColor}`,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          flexShrink: 0
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, flex: 1, paddingRight: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '0.84rem',
                              fontWeight: 800,
                              color: 'var(--text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {item.title}
                            </span>
                            <span style={{
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--surface)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border)',
                              textTransform: 'uppercase'
                            }}>
                              {TYPE_LABELS[item.type] || item.type}
                            </span>
                          </div>

                          <div style={{
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            color: 'var(--primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {item.companyName}
                          </div>

                          <div style={{
                            fontSize: '0.65rem',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            gap: '8px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            <span>Téc: <strong>{item.tecnico}</strong></span>
                            <span>·</span>
                            <span>Sup: <strong>{item.supervisor}</strong></span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                          <span style={{
                            fontSize: '0.64rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '5px',
                            backgroundColor: badgeBg,
                            color: badgeColor,
                            letterSpacing: '0.3px',
                            whiteSpace: 'nowrap'
                          }}>
                            {countdownText}
                          </span>
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            color: isExpired || isToday ? '#dc2626' : 'var(--text-primary)',
                            fontVariantNumeric: 'tabular-nums'
                          }}>
                            Venc: {formatDateBR(item.targetDateStr)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── RODAPÉ TICKER (RADAR SST) ── */}
        <footer className="tv2-ticker">
          <div className="tv2-ticker-tag">
            <AlertTriangle size={13} />
            RADAR SST
          </div>
          <div className="tv2-ticker-track">
            <div className="tv2-ticker-scroll">{tickerAlerts.join('     ·     ')}</div>
          </div>
          <div className="tv2-ticker-time">{timeStr}</div>
        </footer>
      </div>
    </div>
  );
};

export default SstTvControlCenterPage;
