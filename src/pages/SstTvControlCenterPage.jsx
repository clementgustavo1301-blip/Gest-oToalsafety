import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, CheckCircle2, AlertTriangle, Maximize2, Minimize2,
  ArrowLeft, ShieldCheck, Radio, BarChart3, Calendar, Clock,
  Users, RefreshCw, Sun, Moon, Play, Pause, Filter,
  Award, Flame
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  getContracts, getDeliverables, getCompanies, getGroups, getProfiles
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

// Helpers de normalização de nomes
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

function isCompanySupervisor(company, personName) {
  return (
    isSamePerson(company.effSupervisor, personName) ||
    isSamePerson(company.supervisor, personName) ||
    isSamePerson(company.supportResponsible, personName)
  );
}

function isCompanyTecnico(company, personName) {
  return (
    isSamePerson(company.effTecnico, personName) ||
    isSamePerson(company.tecnicoResponsavel, personName) ||
    isSamePerson(company.responsible, personName)
  );
}

function isCompanyAssignedTo(company, personName) {
  if (!personName || personName === 'all') return true;
  return isCompanySupervisor(company, personName) || isCompanyTecnico(company, personName);
}

function formatDateBR(val, shortYear = false) {
  const d = parseSafeDate(val);
  if (!d) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = shortYear ? String(d.getFullYear()).slice(-2) : d.getFullYear();
  return `${day}/${month}/${year}`;
}

function shortenDocTitle(title) {
  if (!title) return 'Documento';
  const t = title.trim();
  if (/relat[óo]rio anal[íi]tico do pcmso/i.test(t)) return 'Rel. Analítico PCMSO';
  if (/mapeamento psicossocial/i.test(t)) return 'Map. Psicossocial';
  if (/ordem de servi[çc]o/i.test(t)) return 'Ordem de Serviço';
  return t;
}

const SstTvControlCenterPage = () => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [contracts, setContracts] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
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

  // Rotação automática opcional para modo TV
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
      const [c, d, comp, g, profs] = await Promise.all([
        getContracts(),
        getDeliverables(),
        getCompanies(),
        getGroups(),
        getProfiles()
      ]);
      setContracts(c || []);
      setDeliverables(d || []);
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

    const interval = setInterval(() => loadData(true), 60000);
    const channel = supabase
      .channel('sst-tv-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliverables' }, () => loadData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => loadData(true))
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

  // Lista completa de Técnicos e Supervisores
  const responsiblesList = useMemo(() => {
    const map = new Map();
    companiesWithHeritage.forEach(c => {
      if (c.effTecnico && c.effTecnico !== 'Não definido') {
        const prev = map.get(c.effTecnico) || { count: 0, asTec: 0, asSup: 0 };
        prev.count += 1;
        prev.asTec += 1;
        map.set(c.effTecnico, prev);
      }
      if (c.effSupervisor && c.effSupervisor !== 'Não definido') {
        const existingKey = Array.from(map.keys()).find(k => isSamePerson(k, c.effSupervisor)) || c.effSupervisor;
        const prev = map.get(existingKey) || { count: 0, asTec: 0, asSup: 0 };
        if (!isSamePerson(c.effSupervisor, c.effTecnico)) {
          prev.count += 1;
        }
        prev.asSup += 1;
        map.set(existingKey, prev);
      }
    });
    profiles.forEach(p => {
      if (p.name && !Array.from(map.keys()).some(k => isSamePerson(k, p.name))) {
        map.set(p.name, { count: 0, asTec: 0, asSup: 0 });
      }
    });
    return Array.from(map.entries())
      .map(([name, info]) => ({
        name,
        count: info.count,
        roleLabel: info.asSup > 0 && info.asTec > 0 ? 'Sup / Téc' : info.asSup > 0 ? 'Supervisor' : 'Técnico'
      }))
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

  // Empresas filtradas
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
          supervisor: comp?.effSupervisor || '—',
          tecnico: comp?.effTecnico || '—',
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

  // Métricas Globais SST
  const metrics = useMemo(() => {
    const expired = activeDeliverables.filter(d => d.isExpired);
    const expTodayOr7d = activeDeliverables.filter(d => !d.isExpired && d.daysLeft !== null && d.daysLeft >= 0 && d.daysLeft <= 7);
    const exp30 = activeDeliverables.filter(d => d.isExp30);
    const exp60 = activeDeliverables.filter(d => d.isExp60);
    const exp90 = activeDeliverables.filter(d => d.isExp90);
    const deliveredVigentes = activeDeliverables.filter(d => d.isDeliveredItem && !d.isExpired);
    const deliveredSafe = activeDeliverables.filter(d => d.isDeliveredItem && !d.isExpired && !d.isExp30 && !d.isExp60);

    const allUpcomingValidities = activeDeliverables
      .filter(d => !d.isExpired && d.daysLeft !== null && d.daysLeft >= 0)
      .sort((a, b) => (a.daysLeft ?? 99999) - (b.daysLeft ?? 99999));

    const validOver30 = allUpcomingValidities.filter(d => d.daysLeft > 30);

    const companiesWithExpired = new Set(expired.map(d => d.companyId));
    const companiesWithExp30 = new Set(exp30.map(d => d.companyId));
    const totalComps = filteredCompanies.length || 1;
    const regularCompaniesCount = Math.max(0, filteredCompanies.length - companiesWithExpired.size);
    const pctRegularCompanies = Math.round((regularCompaniesCount / totalComps) * 100);

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

  // Dados completos da Carteira por Técnico / Supervisor (todos os profissionais)
  const teamChartData = useMemo(() => {
    const allDeliverablesWithFlags = deliverables
      .filter(d => d.status !== 'cancelado' && d.status !== 'nao_se_aplica')
      .map(d => ({
        ...d,
        isExpired: isItemExpired(d, today),
        isExp30: isItemExpiring30(d, today, in30Days),
        isExp60: isItemExpiring60(d, today, in30Days, in60Days),
        isDeliveredItem: isDelivered(d)
      }));

    return responsiblesList.map(r => {
      const compIds = new Set(
        companiesWithHeritage
          .filter(c => isCompanyAssignedTo(c, r.name))
          .map(c => c.id)
      );
      const items = allDeliverablesWithFlags.filter(d => compIds.has(d.companyId));
      const vigentes = items.filter(d => d.isDeliveredItem && !d.isExpired && !d.isExp30).length;
      const aVencer = items.filter(d => d.isExp30 || d.isExp60).length;
      const vencidos = items.filter(d => d.isExpired).length;

      const shortName = r.name.split(' ').slice(0, 2).join(' ');
      return {
        name: shortName.length > 14 ? shortName.substring(0, 14) + '…' : shortName,
        fullName: r.name,
        roleLabel: r.roleLabel,
        empresas: compIds.size,
        Vigentes: vigentes,
        'A Vencer (≤30d)': aVencer,
        Vencidos: vencidos
      };
    });
  }, [responsiblesList, companiesWithHeritage, deliverables, today, in30Days, in60Days]);

  // Distribuição de Validades (dados completos para o Donut + Legenda dedicada sem corte)
  const validityBreakdown = useMemo(() => {
    const expiredCount = metrics.expired.length;
    const exp30Count = metrics.exp30.length;
    const validOver30Count = metrics.validOver30.length;
    const safeDeliveredCount = Math.max(
      0,
      metrics.deliveredVigentes.length - metrics.exp30.filter(d => d.isDeliveredItem).length
    );

    const items = [
      { name: 'Entregues Vigentes', value: safeDeliveredCount, color: '#10b981', badgeBg: 'rgba(16,185,129,0.12)' },
      { name: 'Validade > 30 Dias', value: validOver30Count, color: '#3b82f6', badgeBg: 'rgba(59,130,246,0.12)' },
      { name: 'A Vencer (≤ 30 Dias)', value: exp30Count, color: '#f59e0b', badgeBg: 'rgba(245,158,11,0.14)' },
      { name: 'Vencidos / Expirados', value: expiredCount, color: '#dc2626', badgeBg: 'rgba(220,38,38,0.14)' },
    ];

    const chartSlices = items.filter(i => i.value > 0);
    return {
      items,
      chartSlices: chartSlices.length > 0 ? chartSlices : [{ name: 'Em Dia', value: 1, color: '#10b981' }],
      totalMonitored: safeDeliveredCount + exp30Count + expiredCount
    };
  }, [metrics]);

  // Lista da Direita: Próximos a Vencer & Vencidos
  const displayedExpirationsList = useMemo(() => {
    const upcoming = [...metrics.allUpcomingValidities].sort((a, b) => {
      if ((a.daysLeft ?? 9999) !== (b.daysLeft ?? 9999)) {
        return (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999);
      }
      return a.companyName.localeCompare(b.companyName);
    });

    const expired = [...metrics.expired].sort((a, b) => {
      return (b.daysLeft ?? -9999) - (a.daysLeft ?? -9999);
    });

    if (expiringFilter === 'proximos') return upcoming;
    if (expiringFilter === 'criticos') {
      const crit = upcoming.filter(d => (d.daysLeft ?? 999) <= 30);
      return [...crit, ...expired];
    }
    if (expiringFilter === 'vencidos') return expired;
    return [...upcoming, ...expired];
  }, [metrics, expiringFilter]);

  const timeStr = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

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

  const totalBarRef = Math.max(1, validityBreakdown.totalMonitored);

  return (
    <div className="tv-fullscreen-wrapper">
      <div className="tv2" style={{ padding: '8px 10px', gap: '8px' }}>
        {/* ── HEADER TV SST ── */}
        <header className="tv2-header" style={{ padding: '6px 14px' }}>
          <div className="tv2-header-left">
            <button
              className="tv2-back"
              onClick={() => navigate('/')}
              title="Voltar ao Dashboard SST"
            >
              <ArrowLeft size={14} />
            </button>
            <div className="tv2-logo" style={{ width: 30, height: 30 }}>
              <Radio size={15} />
            </div>
            <div className="tv2-brand">
              <span className="tv2-live-tag">
                <span className="tv2-live-dot" />
                CENTRAL DE CONTROLE SST — PAINEL TV
              </span>
              <h1 className="tv2-title" style={{ fontSize: '0.84rem' }}>
                SST · Panorama Geral &amp; Controle de Vencimentos
              </h1>
            </div>
          </div>

          <div className="tv2-header-center">
            <span className="tv2-time" style={{ fontSize: '1.35rem' }}>{timeStr}</span>
            <span className="tv2-date">{dateStr}</span>
          </div>

          <div className="tv2-header-right">
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
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  maxWidth: '185px'
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

            <button
              type="button"
              onClick={() => setAutoCycle(v => !v)}
              title={autoCycle ? 'Pausar rotação automática de abas da TV' : 'Ativar rotação automática para TV'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 9px',
                borderRadius: '20px',
                fontSize: '0.62rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: autoCycle ? '1px solid var(--primary)' : '1px solid var(--border)',
                backgroundColor: autoCycle ? 'var(--primary-light)' : 'var(--background)',
                color: autoCycle ? 'var(--primary)' : 'var(--text-secondary)'
              }}
            >
              {autoCycle ? <Pause size={10} /> : <Play size={10} />}
              <span>{autoCycle ? 'AUTO TV ON' : 'AUTO TV'}</span>
            </button>

            <div className="tv2-chip-ok" style={{ padding: '4px 10px', fontSize: '0.62rem' }}>
              <ShieldCheck size={12} />
              <span>SST ONLINE</span>
            </div>

            <button className="tv2-fs-btn" style={{ width: 30, height: 30 }} onClick={() => loadData(true)} title="Atualizar dados agora">
              <RefreshCw size={13} className={refreshing ? 'spin' : ''} />
            </button>

            <button className="tv2-fs-btn" style={{ width: 30, height: 30 }} onClick={toggleTheme} title={isDark ? 'Modo Claro' : 'Modo Escuro'}>
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <button className="tv2-fs-btn" style={{ width: 30, height: 30 }} onClick={toggleFullscreen} title={isFullscreen ? 'Sair da Tela Cheia' : 'Modo Tela Cheia (TV)'}>
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </header>

        {/* ── FAIXA DE KPIs COMPACTA (5 CARDS) ── */}
        <div className="tv2-kpi-strip" style={{ gap: '8px' }}>
          <div className="tv2-kpi-card" style={{ padding: '7px 11px', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="tv2-kpi-icon bg-blue-dim" style={{ width: 28, height: 28 }}><Building2 size={15} /></div>
                <div className="tv2-kpi-body">
                  <span className="tv2-kpi-val" style={{ fontSize: '1.2rem' }}>
                    {filteredCompanies.length}
                    <span className="tv2-kpi-sub" style={{ fontSize: '0.7rem' }}> ({metrics.pctRegularCompanies}% em dia)</span>
                  </span>
                  <span className="tv2-kpi-lbl" style={{ fontSize: '0.6rem' }}>Empresas Monitoradas</span>
                </div>
              </div>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 6px', borderRadius: '10px' }}>
                {groups.length} Grupos
              </span>
            </div>
            <div className="tv2-kpi-bar"><div className="tv2-kpi-fill" style={{ width: `${metrics.pctRegularCompanies}%`, background: '#2563eb' }} /></div>
          </div>

          <div className="tv2-kpi-card" style={{ padding: '7px 11px', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="tv2-kpi-icon bg-emerald-dim" style={{ width: 28, height: 28 }}><CheckCircle2 size={15} /></div>
                <div className="tv2-kpi-body">
                  <span className="tv2-kpi-val" style={{ fontSize: '1.2rem' }}>
                    {metrics.deliveredVigentes.length}
                    <span className="tv2-kpi-sub" style={{ fontSize: '0.7rem' }}> vigentes</span>
                  </span>
                  <span className="tv2-kpi-lbl" style={{ fontSize: '0.6rem' }}>Programas &amp; Laudos Entregues</span>
                </div>
              </div>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '2px 6px', borderRadius: '10px' }}>
                {metrics.pctConformity}% Conf.
              </span>
            </div>
            <div className="tv2-kpi-bar"><div className="tv2-kpi-fill" style={{ width: `${metrics.pctConformity}%`, background: '#10b981' }} /></div>
          </div>

          <div
            className={`tv2-kpi-card ${metrics.exp30.length > 0 ? 'tv2-kpi-warn' : ''}`}
            onClick={() => setExpiringFilter('proximos')}
            style={{ padding: '7px 11px', gap: '4px', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="tv2-kpi-icon" style={{ width: 28, height: 28, backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                  <Flame size={15} />
                </div>
                <div className="tv2-kpi-body">
                  <span className="tv2-kpi-val" style={{ fontSize: '1.2rem', color: metrics.exp30.length > 0 ? '#ef4444' : undefined }}>
                    {metrics.exp30.length}
                    <span className="tv2-kpi-sub" style={{ fontSize: '0.7rem' }}> ({metrics.companiesWithExp30Count} emp.)</span>
                  </span>
                  <span className="tv2-kpi-lbl" style={{ fontSize: '0.6rem' }}>Próximos a Vencer (≤ 30d)</span>
                </div>
              </div>
              {metrics.expTodayOr7d.length > 0 && (
                <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#fff', background: '#ef4444', padding: '2px 6px', borderRadius: '10px' }}>
                  {metrics.expTodayOr7d.length} ≤7d
                </span>
              )}
            </div>
            <div className="tv2-kpi-bar">
              <div className="tv2-kpi-fill" style={{ width: `${Math.min(100, (metrics.exp30.length / Math.max(1, metrics.allUpcomingValidities.length)) * 100)}%`, background: '#ef4444' }} />
            </div>
          </div>

          <div
            className={`tv2-kpi-card ${metrics.expired.length > 0 ? 'tv2-kpi-danger' : ''}`}
            onClick={() => setExpiringFilter('vencidos')}
            style={{ padding: '7px 11px', gap: '4px', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="tv2-kpi-icon" style={{ width: 28, height: 28, backgroundColor: 'rgba(220,38,38,0.12)', color: '#dc2626' }}>
                  <AlertTriangle size={15} />
                </div>
                <div className="tv2-kpi-body">
                  <span className="tv2-kpi-val" style={{ fontSize: '1.2rem', color: metrics.expired.length > 0 ? '#dc2626' : undefined }}>
                    {metrics.expired.length}
                    <span className="tv2-kpi-sub" style={{ fontSize: '0.7rem' }}> expirados</span>
                  </span>
                  <span className="tv2-kpi-lbl" style={{ fontSize: '0.6rem' }}>Vencidos · Ação Imediata</span>
                </div>
              </div>
              <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#dc2626', background: 'rgba(220,38,38,0.12)', padding: '2px 6px', borderRadius: '10px' }}>
                {metrics.companiesWithExpiredCount} emp.
              </span>
            </div>
            <div className="tv2-kpi-bar"><div className="tv2-kpi-fill" style={{ width: metrics.expired.length > 0 ? '100%' : '0%', background: '#dc2626' }} /></div>
          </div>

          <div
            className="tv2-kpi-card"
            onClick={() => setExpiringFilter('todos')}
            style={{ padding: '7px 11px', gap: '4px', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="tv2-kpi-icon bg-blue-dim" style={{ width: 28, height: 28 }}><Calendar size={15} /></div>
                <div className="tv2-kpi-body">
                  <span className="tv2-kpi-val" style={{ fontSize: '1.2rem' }}>
                    {metrics.allUpcomingValidities.length}
                    <span className="tv2-kpi-sub" style={{ fontSize: '0.7rem' }}> futuros</span>
                  </span>
                  <span className="tv2-kpi-lbl" style={{ fontSize: '0.6rem' }}>Total c/ Validade a Vencer</span>
                </div>
              </div>
              <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#3b82f6', background: 'rgba(59,130,246,0.12)', padding: '2px 6px', borderRadius: '10px' }}>
                {contracts.filter(c => c.status === 'ativo').length} Contratos
              </span>
            </div>
            <div className="tv2-kpi-bar"><div className="tv2-kpi-fill" style={{ width: '100%', background: '#3b82f6' }} /></div>
          </div>
        </div>

        {/* ── CORPO PRINCIPAL: ESQUERDA (1.72fr - PANORAMA GERAL, DISTRIBUIÇÃO & CARTEIRA COMPLETOS) | DIREITA (1fr - TABELA COMPACTA PRÓXIMOS A VENCER) ── */}
        <div className="tv2-body" style={{ gridTemplateColumns: '1.72fr 1fr', gap: '8px' }}>

          {/* ═══ COLUNA ESQUERDA: PANORAMA GERAL + DISTRIBUIÇÃO DE VALIDADES + CARTEIRA POR TÉCNICO/SUPERVISOR ═══ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0, overflow: 'hidden' }}>

            {/* LINHA 1 ESQUERDA: Gráfico de Barras do Panorama Geral */}
            <div className="tv2-chart-card card" style={{ flex: 1.02, minHeight: 0 }}>
              <div className="tv2-chart-head" style={{ justifyContent: 'space-between', padding: '7px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BarChart3 size={15} className="text-blue" />
                  <span style={{ fontSize: '0.78rem' }}>
                    {chartMode === 'documentos'
                      ? 'Panorama Geral por Programa / Documento SST (PGR, PCMSO, LTCAT, eSocial)'
                      : 'Panorama Geral Comparativo por Supervisor / Técnico Responsável'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setChartMode('documentos')}
                    style={{
                      fontSize: '0.62rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
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
                      fontSize: '0.62rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
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

              <div className="tv2-chart-area" style={{ padding: '6px 10px 2px 0' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartMode === 'documentos' ? documentChartData : teamChartData}
                    margin={{ top: 6, right: 10, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="name"
                      fontSize={10}
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
                        fontSize: '0.72rem',
                        color: 'var(--text-primary)'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '0px' }} />
                    <Bar dataKey="Vigentes" fill="#10b981" radius={[4, 4, 0, 0]} name="Vigentes / Em Dia" />
                    <Bar dataKey="A Vencer (≤30d)" fill="#f59e0b" radius={[4, 4, 0, 0]} name="A Vencer (≤30d)" />
                    <Bar dataKey="Vencidos" fill="#dc2626" radius={[4, 4, 0, 0]} name="Vencidos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* LINHA 2 ESQUERDA: DISTRIBUIÇÃO DE VALIDADES + CARTEIRA POR TÉCNICO / SUPERVISOR (100% VISÍVEIS POR COMPLETO) */}
            <div style={{ display: 'grid', gridTemplateColumns: '0.92fr 1.08fr', gap: '8px', flex: 1.08, minHeight: 0 }}>

              {/* CARD 1: Distribuição de Validades (Completo, com Rosca + Quadro Numérico + Barra de Conformidade) */}
              <div className="tv2-chart-card card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div className="tv2-chart-head" style={{ justifyContent: 'space-between', padding: '7px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={15} className="text-emerald" />
                    <span style={{ fontSize: '0.78rem' }}>Distribuição de Validades</span>
                  </div>
                  <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '2px 7px', borderRadius: '10px' }}>
                    {metrics.pctConformity}% Conformidade
                  </span>
                </div>

                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '8px 12px' }}>
                  {/* Meio: Gráfico Donut à esquerda + Todos os 4 indicadores completos à direita */}
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '10px', flex: 1, minHeight: 0 }}>
                    <div style={{ width: '120px', height: '120px', position: 'relative', margin: '0 auto' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={validityBreakdown.chartSlices}
                            cx="50%"
                            cy="50%"
                            innerRadius={34}
                            outerRadius={54}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {validityBreakdown.chartSlices.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: 'var(--surface)',
                              borderColor: 'var(--border)',
                              borderRadius: '6px',
                              fontSize: '0.7rem',
                              color: 'var(--text-primary)'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none'
                      }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                          {metrics.pctConformity}%
                        </span>
                        <span style={{ fontSize: '0.52rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: 2 }}>
                          Em Dia
                        </span>
                      </div>
                    </div>

                    {/* Lista completa de todas as faixas de validade */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {validityBreakdown.items.map((item) => (
                        <div
                          key={item.name}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--background)',
                            border: '1px solid var(--border)',
                            fontSize: '0.71rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                            <span style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                              {item.name}
                            </span>
                          </div>
                          <span style={{
                            fontWeight: 800,
                            fontSize: '0.74rem',
                            color: item.color,
                            backgroundColor: item.badgeBg,
                            padding: '1px 7px',
                            borderRadius: '5px',
                            fontVariantNumeric: 'tabular-nums'
                          }}>
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rodapé do Card: Barra Segmentada + Resumo Rápido */}
                  <div style={{ paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ height: '8px', width: '100%', borderRadius: '4px', display: 'flex', overflow: 'hidden', backgroundColor: 'var(--border)', marginBottom: '5px' }}>
                      {metrics.deliveredSafe.length > 0 && (
                        <div style={{ width: `${Math.round((metrics.deliveredSafe.length / totalBarRef) * 100)}%`, backgroundColor: '#10b981' }} />
                      )}
                      {metrics.validOver30.length > 0 && (
                        <div style={{ width: `${Math.round((metrics.validOver30.length / totalBarRef) * 100)}%`, backgroundColor: '#3b82f6' }} />
                      )}
                      {metrics.exp30.length > 0 && (
                        <div style={{ width: `${Math.round((metrics.exp30.length / totalBarRef) * 100)}%`, backgroundColor: '#f59e0b' }} />
                      )}
                      {metrics.expired.length > 0 && (
                        <div style={{ width: `${Math.round((metrics.expired.length / totalBarRef) * 100)}%`, backgroundColor: '#dc2626' }} />
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      <span>Empresas 100% Regulares: <strong style={{ color: 'var(--text-primary)' }}>{metrics.regularCompaniesCount}/{filteredCompanies.length}</strong></span>
                      <span>Monitorados c/ Validade: <strong style={{ color: 'var(--primary)' }}>{ metrics.allUpcomingValidities.length + metrics.expired.length }</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: Carteira por Técnico / Supervisor (Tabela completa sem corte para caber todos na tela) */}
              <div className="tv2-chart-card card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div className="tv2-chart-head" style={{ justifyContent: 'space-between', padding: '7px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={15} className="text-blue" />
                    <span style={{ fontSize: '0.78rem' }}>Carteira por Técnico / Supervisor</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {selectedResponsible !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setSelectedResponsible('all')}
                        style={{
                          fontSize: '0.6rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--primary)',
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Limpar filtro
                      </button>
                    )}
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {teamChartData.length} profissionais
                    </span>
                  </div>
                </div>

                <div style={{ flex: 1, minHeight: 0, padding: '6px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.61rem', textTransform: 'uppercase', textAlign: 'left' }}>
                        <th style={{ padding: '3px 6px', fontWeight: 700 }}>Profissional</th>
                        <th style={{ padding: '3px 4px', fontWeight: 700, textAlign: 'center' }}>Função</th>
                        <th style={{ padding: '3px 4px', fontWeight: 700, textAlign: 'center' }}>Emp.</th>
                        <th style={{ padding: '3px 4px', fontWeight: 700, textAlign: 'center', color: '#10b981' }}>Em Dia</th>
                        <th style={{ padding: '3px 4px', fontWeight: 700, textAlign: 'center', color: '#d97706' }}>≤ 30d</th>
                        <th style={{ padding: '3px 6px', fontWeight: 700, textAlign: 'center', color: '#dc2626' }}>Venc.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamChartData.map((resp) => {
                        const isSelected = selectedResponsible === resp.fullName;
                        return (
                          <tr
                            key={resp.fullName}
                            onClick={() => setSelectedResponsible(isSelected ? 'all' : resp.fullName)}
                            title="Clique para filtrar o painel por este profissional"
                            style={{
                              borderBottom: '1px solid var(--border)',
                              backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                              cursor: 'pointer',
                              transition: 'background 0.15s'
                            }}
                          >
                            <td style={{ padding: '5px 6px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                              {resp.fullName}
                            </td>
                            <td style={{ padding: '5px 4px', textAlign: 'center' }}>
                              <span style={{
                                fontSize: '0.58rem',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                backgroundColor: resp.roleLabel === 'Supervisor' ? 'rgba(37,99,235,0.12)' : 'rgba(16,185,129,0.12)',
                                color: resp.roleLabel === 'Supervisor' ? '#2563eb' : '#059669'
                              }}>
                                {resp.roleLabel}
                              </span>
                            </td>
                            <td style={{ padding: '5px 4px', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                              {resp.empresas}
                            </td>
                            <td style={{ padding: '5px 4px', textAlign: 'center', fontWeight: 800, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>
                              {resp.Vigentes}
                            </td>
                            <td style={{ padding: '5px 4px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                              {resp['A Vencer (≤30d)'] > 0 ? (
                                <span style={{ background: 'rgba(245,158,11,0.16)', color: '#d97706', padding: '1px 6px', borderRadius: '4px', fontWeight: 800, fontSize: '0.65rem' }}>
                                  {resp['A Vencer (≤30d)']}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>0</span>
                              )}
                            </td>
                            <td style={{ padding: '5px 6px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                              {resp.Vencidos > 0 ? (
                                <span style={{ background: 'rgba(220,38,38,0.15)', color: '#dc2626', padding: '1px 6px', borderRadius: '4px', fontWeight: 800, fontSize: '0.65rem' }}>
                                  {resp.Vencidos}
                                </span>
                              ) : (
                                <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.65rem' }}>✓ 0</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>

          {/* ═══ COLUNA DIREITA (COMPACTA): TABELA DE ALTA DENSIDADE — PRÓXIMOS A VENCER & CONTROLE DE PRAZOS ═══ */}
          <div className="tv2-right">
            <div className="tv2-chart-card card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
              {/* Cabeçalho Compacto */}
              <div className="tv2-chart-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px', padding: '7px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={14} style={{ color: '#ef4444' }} />
                  <span style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                    PRÓXIMOS A VENCER &amp; PRAZOS ({displayedExpirationsList.length})
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'proximos', label: `A Vencer (${metrics.allUpcomingValidities.length})` },
                    { id: 'criticos', label: `≤30d (${metrics.exp30.length})` },
                    { id: 'vencidos', label: `Venc. (${metrics.expired.length})` },
                    { id: 'todos', label: 'Todos' }
                  ].map(tab => {
                    const active = expiringFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setExpiringFilter(tab.id)}
                        style={{
                          fontSize: '0.59rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
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

              {/* Tabela Compacta de Alta Densidade para caber muito mais itens na TV */}
              <div
                className="tv2-chart-area"
                style={{
                  padding: 0,
                  overflowY: 'auto',
                  flex: 1,
                  minHeight: 0
                }}
              >
                {loading ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2.5rem 1rem', fontSize: '0.78rem' }}>
                    Carregando cronograma de vencimentos...
                  </div>
                ) : displayedExpirationsList.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2.5rem 1rem' }}>
                    <CheckCircle2 size={30} style={{ color: '#10b981', margin: '0 auto 6px auto' }} />
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                      Nenhum item nesta categoria!
                    </div>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '0.67rem' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--surface)', zIndex: 2, boxShadow: '0 1px 0 var(--border)' }}>
                      <tr style={{ color: 'var(--text-secondary)', fontSize: '0.58rem', textTransform: 'uppercase', textAlign: 'left' }}>
                        <th style={{ padding: '5px 8px', width: '28%', fontWeight: 700 }}>Documento</th>
                        <th style={{ padding: '5px 6px', width: '36%', fontWeight: 700 }}>Empresa / Téc.</th>
                        <th style={{ padding: '5px 4px', width: '17%', fontWeight: 700, textAlign: 'center' }}>Venc.</th>
                        <th style={{ padding: '5px 8px', width: '19%', fontWeight: 700, textAlign: 'right' }}>Prazo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedExpirationsList.map((item, idx) => {
                        const days = item.daysLeft;
                        const isExpired = item.isExpired || (days !== null && days < 0);
                        const isToday = !isExpired && days === 0;
                        const isTomorrow = !isExpired && days === 1;
                        const isUrgent15 = !isExpired && days !== null && days <= 15;
                        const isCrit30 = !isExpired && days !== null && days <= 30;
                        const isWarn60 = !isExpired && days !== null && days > 30 && days <= 60;

                        let dotColor = '#3b82f6';
                        let badgeBg = 'rgba(59, 130, 246, 0.14)';
                        let badgeColor = '#3b82f6';
                        let countdownText = days !== null ? `${days}d` : '—';

                        if (isExpired) {
                          dotColor = '#dc2626';
                          badgeBg = '#dc2626';
                          badgeColor = '#ffffff';
                          countdownText = days !== null ? `-${Math.abs(days)}d` : 'VENC.';
                        } else if (isToday) {
                          dotColor = '#dc2626';
                          badgeBg = '#dc2626';
                          badgeColor = '#ffffff';
                          countdownText = 'HOJE!';
                        } else if (isTomorrow) {
                          dotColor = '#ea580c';
                          badgeBg = '#ea580c';
                          badgeColor = '#ffffff';
                          countdownText = 'AMANHÃ';
                        } else if (isUrgent15) {
                          dotColor = '#ef4444';
                          badgeBg = 'rgba(239, 68, 68, 0.15)';
                          badgeColor = '#ef4444';
                          countdownText = `${days} dias`;
                        } else if (isCrit30) {
                          dotColor = '#f59e0b';
                          badgeBg = 'rgba(245, 158, 11, 0.16)';
                          badgeColor = '#d97706';
                          countdownText = `${days} dias`;
                        } else if (isWarn60) {
                          dotColor = '#eab308';
                          badgeBg = 'rgba(234, 179, 8, 0.15)';
                          badgeColor = '#ca8a04';
                          countdownText = `${days} dias`;
                        }

                        return (
                          <tr
                            key={item.id || idx}
                            onClick={() => navigate(`/company/${item.companyId}`)}
                            title={`${item.title} — ${item.companyName} (Téc: ${item.tecnico} | Sup: ${item.supervisor})`}
                            style={{
                              borderBottom: '1px solid var(--border)',
                              backgroundColor: isToday || isExpired ? 'rgba(220, 38, 38, 0.04)' : (idx % 2 === 0 ? 'transparent' : 'var(--background)'),
                              cursor: 'pointer'
                            }}
                          >
                            {/* Col 1: Documento */}
                            <td style={{ padding: '4px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />
                                <span style={{ fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {shortenDocTitle(item.title)}
                                </span>
                              </div>
                            </td>

                            {/* Col 2: Empresa + Técnico */}
                            <td style={{ padding: '4px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: 600, color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.15 }}>
                                {item.companyName}
                              </div>
                              <div style={{ fontSize: '0.57rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.1 }}>
                                {item.tecnico !== 'Não definido' ? item.tecnico : item.supervisor}
                              </div>
                            </td>

                            {/* Col 3: Data de Vencimento */}
                            <td style={{
                              padding: '4px 4px',
                              textAlign: 'center',
                              fontWeight: 700,
                              color: isExpired || isToday ? '#dc2626' : 'var(--text-primary)',
                              fontVariantNumeric: 'tabular-nums',
                              whiteSpace: 'nowrap',
                              fontSize: '0.64rem'
                            }}>
                              {formatDateBR(item.targetDateStr, true)}
                            </td>

                            {/* Col 4: Prazo / Contagem Regressiva */}
                            <td style={{ padding: '4px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <span style={{
                                display: 'inline-block',
                                fontSize: '0.58rem',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: badgeBg,
                                color: badgeColor,
                                fontVariantNumeric: 'tabular-nums'
                              }}>
                                {countdownText}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* ── RODAPÉ TICKER (RADAR SST) ── */}
        <footer className="tv2-ticker" style={{ height: '28px' }}>
          <div className="tv2-ticker-tag" style={{ fontSize: '0.6rem' }}>
            <AlertTriangle size={12} />
            RADAR SST
          </div>
          <div className="tv2-ticker-track">
            <div className="tv2-ticker-scroll" style={{ lineHeight: '28px', fontSize: '0.7rem' }}>
              {tickerAlerts.join('     ·     ')}
            </div>
          </div>
          <div className="tv2-ticker-time" style={{ fontSize: '0.7rem' }}>{timeStr}</div>
        </footer>
      </div>
    </div>
  );
};

export default SstTvControlCenterPage;
