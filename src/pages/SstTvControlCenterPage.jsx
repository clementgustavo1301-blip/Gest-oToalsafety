import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, CheckCircle2, AlertTriangle, Maximize2, Minimize2,
  ArrowLeft, ShieldCheck, Radio, BarChart3, Calendar, Clock,
  Users, RefreshCw, Sun, Moon, Play, Pause, Filter,
  Award, Flame, CalendarDays, MapPin, Briefcase
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  getContracts, getDeliverables, getCompanies, getGroups, getProfiles, getTrainings
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

  // Dados do banco
  const [contracts, setContracts] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [groups, setGroups] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [trainings, setTrainings] = useState([]);

  // Controles de Navegação e Alternância de Telas TV (15 segundos)
  const [currentScreen, setCurrentScreen] = useState(1); // 1: Panorama & Validades, 2: Próximos a Vencer, 3: Carteira & Agendamentos
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [timerProgress, setTimerProgress] = useState(0);

  // Filtros interativos
  const [selectedResponsible, setSelectedResponsible] = useState('all');
  const [chartMode, setChartMode] = useState('documentos'); // 'documentos' | 'equipe'
  const [expiringFilter, setExpiringFilter] = useState('proximos'); // 'proximos' | 'criticos' | 'vencidos' | 'todos'

  // Relógio em tempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Rotação Automática de 15 em 15 segundos entre as 3 telas
  useEffect(() => {
    if (!isAutoRotate) return undefined;

    const stepMs = 100;
    const totalMs = 15000; // 15 segundos exatos
    const increment = (stepMs / totalMs) * 100;

    const interval = setInterval(() => {
      setTimerProgress(prev => {
        if (prev + increment >= 100) {
          setCurrentScreen(curr => (curr === 3 ? 1 : curr + 1));
          return 0;
        }
        return prev + increment;
      });
    }, stepMs);

    return () => clearInterval(interval);
  }, [isAutoRotate]);

  const handleSelectScreen = (screenIndex) => {
    setCurrentScreen(screenIndex);
    setTimerProgress(0); // Reinicia o contador de 15s
  };

  const toggleAutoRotate = () => {
    setIsAutoRotate(prev => !prev);
  };

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const [c, d, comp, g, profs, trains] = await Promise.all([
        getContracts(),
        getDeliverables(),
        getCompanies(),
        getGroups(),
        getProfiles(),
        getTrainings()
      ]);
      setContracts(c || []);
      setDeliverables(d || []);
      setCompanies(comp || []);
      setGroups(g || []);
      setProfiles(profs || []);
      setTrainings(trains || []);
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

  const in7Days = useMemo(() => {
    const dt = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    dt.setHours(23, 59, 59, 999);
    return dt;
  }, [today]);

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

  // Dados completos da Carteira por Técnico / Supervisor
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
      const totalMonitored = vigentes + aVencer + vencidos;
      const pctConformidade = totalMonitored > 0 ? Math.round((vigentes / totalMonitored) * 100) : 100;

      const shortName = r.name.split(' ').slice(0, 2).join(' ');
      return {
        name: shortName.length > 14 ? shortName.substring(0, 14) + '…' : shortName,
        fullName: r.name,
        roleLabel: r.roleLabel,
        empresas: compIds.size,
        Vigentes: vigentes,
        'A Vencer (≤30d)': aVencer,
        Vencidos: vencidos,
        pctConformidade,
        totalItems: items.length
      };
    });
  }, [responsiblesList, companiesWithHeritage, deliverables, today, in30Days, in60Days]);

  // Distribuição de Validades (dados para o Donut + detalhamento completo)
  const validityBreakdown = useMemo(() => {
    const expiredCount = metrics.expired.length;
    const exp30Count = metrics.exp30.length;
    const validOver30Count = metrics.validOver30.length;
    const safeDeliveredCount = Math.max(
      0,
      metrics.deliveredVigentes.length - metrics.exp30.filter(d => d.isDeliveredItem).length
    );

    const items = [
      { name: 'Entregues Vigentes', value: safeDeliveredCount, desc: 'Programas válidos e atualizados', color: '#10b981', badgeBg: 'rgba(16,185,129,0.12)' },
      { name: 'Validade > 30 Dias', value: validOver30Count, desc: 'Prazos seguros a médio prazo', color: '#3b82f6', badgeBg: 'rgba(59,130,246,0.12)' },
      { name: 'A Vencer (≤ 30 Dias)', value: exp30Count, desc: 'Renovação / ação imediata', color: '#f59e0b', badgeBg: 'rgba(245,158,11,0.14)' },
      { name: 'Vencidos / Expirados', value: expiredCount, desc: 'Expirados, risco trabalhista', color: '#dc2626', badgeBg: 'rgba(220,38,38,0.14)' },
    ];

    const chartSlices = items.filter(i => i.value > 0);
    return {
      items,
      chartSlices: chartSlices.length > 0 ? chartSlices : [{ name: 'Em Dia', value: 1, color: '#10b981' }],
      totalMonitored: safeDeliveredCount + validOver30Count + exp30Count + expiredCount
    };
  }, [metrics]);

  // Lista dos Próximos a Vencer & Prazos
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

  // Agendamentos dos Próximos 7 Dias (Treinamentos, Visitas Técnicas, DDS e Inspeções)
  const upcomingScheduledItems = useMemo(() => {
    const list = [];

    // 1. Treinamentos e Agendamentos da tabela `trainings`
    trainings.forEach(t => {
      if (!t.date) return;
      const dObj = parseSafeDate(t.date);
      if (!dObj) return;
      dObj.setHours(0, 0, 0, 0);

      if (dObj >= today && dObj <= in7Days) {
        const comp = companiesMap[t.companyId];
        const companyDisplayName = t.isExternal && t.externalCompanyName
          ? t.externalCompanyName
          : (comp?.name || 'Empresa Cliente');

        const daysDiff = Math.round((dObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        list.push({
          id: `train-${t.id}`,
          title: t.title || 'Treinamento SST',
          category: 'Treinamento',
          companyName: companyDisplayName,
          companyId: t.companyId,
          dateStr: t.date,
          dateObj: dObj,
          time: t.time || 'Horário comercial',
          responsible: t.instructor || comp?.effTecnico || 'Instrutor TotalSafety',
          status: t.status || 'agendado',
          participants: t.participants || null,
          daysDiff,
          isToday: daysDiff === 0,
          isTomorrow: daysDiff === 1,
          source: 'training'
        });
      }
    });

    // 2. Entregáveis com status agendado para os próximos 7 dias
    activeDeliverables.forEach(d => {
      if (d.status === 'agendado' || (d.dueDate && !d.isDeliveredItem)) {
        const dObj = parseSafeDate(d.dueDate || d.targetDateStr);
        if (!dObj) return;
        dObj.setHours(0, 0, 0, 0);

        if (dObj >= today && dObj <= in7Days) {
          const daysDiff = Math.round((dObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          list.push({
            id: `deliv-${d.id}`,
            title: d.title || 'Visita / Entrega SST',
            category: 'Visita / Entrega',
            companyName: d.companyName,
            companyId: d.companyId,
            dateStr: d.dueDate || d.targetDateStr,
            dateObj: dObj,
            time: 'A definir',
            responsible: d.tecnico !== 'Não definido' ? d.tecnico : d.supervisor,
            status: d.status || 'agendado',
            participants: null,
            daysDiff,
            isToday: daysDiff === 0,
            isTomorrow: daysDiff === 1,
            source: 'deliverable'
          });
        }
      }
    });

    // Ordenação cronológica por data e horário
    return list.sort((a, b) => {
      const diff = a.dateObj.getTime() - b.dateObj.getTime();
      if (diff !== 0) return diff;
      return (a.time || '').localeCompare(b.time || '');
    });
  }, [trainings, activeDeliverables, companiesMap, today, in7Days]);

  const timeStr = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  const secondsRemaining = Math.max(1, Math.ceil(15 - (timerProgress / 100) * 15));

  const tickerAlerts = useMemo(() => {
    const list = [];
    const dueToday = metrics.allUpcomingValidities.filter(d => d.daysLeft === 0);
    if (dueToday.length > 0) {
      list.push(`🚨 ATENÇÃO HOJE: ${dueToday.length} documento(s) vencem HOJE (${dueToday.map(d => `${d.title} - ${d.companyName}`).slice(0, 3).join(', ')})`);
    }
    if (upcomingScheduledItems.filter(i => i.isToday).length > 0) {
      list.push(`📅 AGENDAMENTOS HOJE: ${upcomingScheduledItems.filter(i => i.isToday).length} evento(s) programados para o dia`);
    }
    if (metrics.exp30.length > 0) {
      list.push(`🔴 PRÓXIMOS A VENCER: ${metrics.exp30.length} programa(s)/documento(s) vencem nos próximos 30 dias em ${metrics.companiesWithExp30Count} empresa(s)`);
    }
    if (metrics.expired.length > 0) {
      list.push(`⚠️ VENCIDOS: ${metrics.expired.length} item(ns) com validade expirada em ${metrics.companiesWithExpiredCount} empresa(s)`);
    }
    list.push(`🏢 PANORAMA SST: ${filteredCompanies.length} empresas monitoradas · ${metrics.deliveredVigentes.length} entregáveis vigentes · ${metrics.pctConformity}% de conformidade`);
    return list;
  }, [metrics, filteredCompanies.length, upcomingScheduledItems]);

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
                TotalSafety · Monitoramento de Vencimentos &amp; Operação
              </h1>
            </div>
          </div>

          <div className="tv2-header-center">
            <span className="tv2-time" style={{ fontSize: '1.35rem' }}>{timeStr}</span>
            <span className="tv2-date">{dateStr}</span>
          </div>

          <div className="tv2-header-right">
            {/* Filtro por Responsável */}
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
                  maxWidth: '175px'
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

            {/* Status Online */}
            <div className="tv2-chip-ok" style={{ padding: '4px 10px', fontSize: '0.62rem' }}>
              <ShieldCheck size={12} />
              <span>SST ONLINE</span>
            </div>

            {/* Ações Rápidas */}
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

        {/* ── BARRA DE CONTROLE DAS 3 TELAS & ROTAÇÃO DE 15s ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '4px 10px',
          gap: '10px',
          flexShrink: 0
        }}>
          {/* Abas das Telas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Tela 1 */}
            <button
              onClick={() => handleSelectScreen(1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '5px 12px',
                borderRadius: '7px',
                fontSize: '0.72rem',
                fontWeight: 700,
                position: 'relative',
                overflow: 'hidden',
                border: currentScreen === 1 ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: currentScreen === 1 ? 'var(--primary-light)' : 'var(--background)',
                color: currentScreen === 1 ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <BarChart3 size={14} />
              <span>1. Panorama SST &amp; Validades</span>
              {currentScreen === 1 && isAutoRotate && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: '3px',
                  backgroundColor: 'var(--primary)',
                  width: `${timerProgress}%`,
                  transition: 'width 0.1s linear'
                }} />
              )}
            </button>

            {/* Tela 2 */}
            <button
              onClick={() => handleSelectScreen(2)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '5px 12px',
                borderRadius: '7px',
                fontSize: '0.72rem',
                fontWeight: 700,
                position: 'relative',
                overflow: 'hidden',
                border: currentScreen === 2 ? '1px solid #ef4444' : '1px solid var(--border)',
                background: currentScreen === 2 ? 'rgba(239, 68, 68, 0.1)' : 'var(--background)',
                color: currentScreen === 2 ? '#ef4444' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Clock size={14} />
              <span>2. Próximos a Vencer &amp; Prazos ({displayedExpirationsList.length})</span>
              {currentScreen === 2 && isAutoRotate && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: '3px',
                  backgroundColor: '#ef4444',
                  width: `${timerProgress}%`,
                  transition: 'width 0.1s linear'
                }} />
              )}
            </button>

            {/* Tela 3 */}
            <button
              onClick={() => handleSelectScreen(3)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '5px 12px',
                borderRadius: '7px',
                fontSize: '0.72rem',
                fontWeight: 700,
                position: 'relative',
                overflow: 'hidden',
                border: currentScreen === 3 ? '1px solid #10b981' : '1px solid var(--border)',
                background: currentScreen === 3 ? 'rgba(16, 185, 129, 0.1)' : 'var(--background)',
                color: currentScreen === 3 ? '#10b981' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Users size={14} />
              <span>3. Carteira da Equipe &amp; Agendamentos 7D ({upcomingScheduledItems.length})</span>
              {currentScreen === 3 && isAutoRotate && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: '3px',
                  backgroundColor: '#10b981',
                  width: `${timerProgress}%`,
                  transition: 'width 0.1s linear'
                }} />
              )}
            </button>
          </div>

          {/* Controlador de Rotação Automática de 15s */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.67rem',
              fontWeight: 700,
              color: isAutoRotate ? 'var(--primary)' : 'var(--text-secondary)'
            }}>
              <span className={`tv2-live-dot ${!isAutoRotate ? 'opacity-40' : ''}`} style={{ backgroundColor: isAutoRotate ? '#10b981' : 'var(--text-secondary)' }} />
              <span>
                {isAutoRotate ? `Alternando a cada 15s (próxima em ${secondsRemaining}s)` : 'Modo Automático Pausado'}
              </span>
            </div>

            <button
              onClick={toggleAutoRotate}
              title={isAutoRotate ? 'Pausar rotação automática' : 'Ativar rotação automática de 15s'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 11px',
                borderRadius: '20px',
                fontSize: '0.64rem',
                fontWeight: 800,
                cursor: 'pointer',
                border: isAutoRotate ? '1px solid var(--primary)' : '1px solid var(--border)',
                backgroundColor: isAutoRotate ? 'var(--primary-light)' : 'var(--background)',
                color: isAutoRotate ? 'var(--primary)' : 'var(--text-secondary)',
                transition: 'all 0.15s'
              }}
            >
              {isAutoRotate ? <Pause size={11} /> : <Play size={11} />}
              <span>{isAutoRotate ? 'PAUSAR' : 'AUTO 15s'}</span>
            </button>
          </div>
        </div>

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
            onClick={() => { handleSelectScreen(2); setExpiringFilter('criticos'); }}
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
            onClick={() => { handleSelectScreen(2); setExpiringFilter('vencidos'); }}
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
            onClick={() => { handleSelectScreen(3); }}
            style={{ padding: '7px 11px', gap: '4px', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="tv2-kpi-icon bg-emerald-dim" style={{ width: 28, height: 28 }}><CalendarDays size={15} /></div>
                <div className="tv2-kpi-body">
                  <span className="tv2-kpi-val" style={{ fontSize: '1.2rem', color: '#10b981' }}>
                    {upcomingScheduledItems.length}
                    <span className="tv2-kpi-sub" style={{ fontSize: '0.7rem' }}> agendados</span>
                  </span>
                  <span className="tv2-kpi-lbl" style={{ fontSize: '0.6rem' }}>Agenda Próximos 7 Dias</span>
                </div>
              </div>
              <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '2px 6px', borderRadius: '10px' }}>
                {contracts.filter(c => c.status === 'ativo').length} Contratos
              </span>
            </div>
            <div className="tv2-kpi-bar"><div className="tv2-kpi-fill" style={{ width: '100%', background: '#10b981' }} /></div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════
            CORPO PRINCIPAL DINÂMICO CONFORME A TELA ATIVA (1, 2 OU 3)
            ══════════════════════════════════════════════════════════════════════════ */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

          {/* ══════════════════════════════════════════════════════════════════
              TELA 1: PANORAMA GERAL POR PROGRAMA/DOCUMENTO SST & DISTRIBUIÇÃO DE VALIDADES
              ══════════════════════════════════════════════════════════════════ */}
          {currentScreen === 1 && (
            <div className="tv2-body" style={{ gridTemplateColumns: '1.35fr 1fr', gap: '10px', height: '100%', flex: 1, minHeight: 0 }}>

              {/* CARD ESQUERDA: Panorama Geral por Programa / Documento SST */}
              <div className="tv2-chart-card card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                <div className="tv2-chart-head" style={{ justifyContent: 'space-between', padding: '8px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={17} className="text-blue" />
                    <div>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800 }}>
                        Panorama Geral por Programa / Documento SST
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>
                        (PGR, PCMSO, LTCAT, eSocial, Rel. Analítico, Psicossocial, LI/LP)
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setChartMode('documentos')}
                      style={{
                        fontSize: '0.64rem',
                        padding: '3px 9px',
                        borderRadius: '5px',
                        border: chartMode === 'documentos' ? '1px solid var(--primary)' : '1px solid var(--border)',
                        background: chartMode === 'documentos' ? 'var(--primary)' : 'var(--background)',
                        color: chartMode === 'documentos' ? '#fff' : 'var(--text-secondary)',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Por Programa SST
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMode('equipe')}
                      style={{
                        fontSize: '0.64rem',
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

                <div className="tv2-chart-area" style={{ flex: 1, minHeight: 0, padding: '10px 14px 4px 4px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartMode === 'documentos' ? documentChartData : teamChartData}
                      margin={{ top: 10, right: 15, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="name"
                        fontSize={11}
                        tick={{ fill: 'var(--text-secondary)', fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        fontSize={11}
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
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                      <Bar dataKey="Vigentes" fill="#10b981" radius={[4, 4, 0, 0]} name="Vigentes / Em Dia" />
                      <Bar dataKey="A Vencer (≤30d)" fill="#f59e0b" radius={[4, 4, 0, 0]} name="A Vencer (≤30d)" />
                      <Bar dataKey="Vencidos" fill="#dc2626" radius={[4, 4, 0, 0]} name="Vencidos" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Faixa inferior de resumo de saúde dos programas */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  padding: '8px 12px',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--background)'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Programas Ativos</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>{activeDeliverables.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Conformidade Global</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#10b981' }}>{metrics.pctConformity}%</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>A Vencer em 30d</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f59e0b' }}>{metrics.exp30.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Vencidos Ação Imediata</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#dc2626' }}>{metrics.expired.length}</span>
                  </div>
                </div>
              </div>

              {/* CARD DIREITA: Distribuição de Validades (Completo, Amplo e Sem Cortes) */}
              <div className="tv2-chart-card card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                <div className="tv2-chart-head" style={{ justifyContent: 'space-between', padding: '8px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Award size={17} className="text-emerald" />
                    <div>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800 }}>Distribuição de Validades</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>
                        Visão Geral de Prazos de Validade da Carteira
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.14)', padding: '3px 9px', borderRadius: '12px' }}>
                    {metrics.pctConformity}% Em Dia
                  </span>
                </div>

                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '12px 14px' }}>
                  {/* Seção Superior: Gráfico Donut de Destaque + Centralizador */}
                  <div style={{ width: '100%', height: '170px', position: 'relative', margin: '0 auto' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={validityBreakdown.chartSlices}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {validityBreakdown.chartSlices.map((entry, idx) => (
                            <Cell key={`slice-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'var(--surface)',
                            borderColor: 'var(--border)',
                            borderRadius: '8px',
                            fontSize: '0.74rem',
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
                      <span style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                        {metrics.pctConformity}%
                      </span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: 3 }}>
                        Regularidade
                      </span>
                    </div>
                  </div>

                  {/* Lista Completa dos 4 Intervalos de Validade */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '8px 0' }}>
                    {validityBreakdown.items.map((item) => (
                      <div
                        key={item.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '7px 12px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--background)',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.76rem' }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>
                              {item.desc}
                            </div>
                          </div>
                        </div>
                        <span style={{
                          fontWeight: 900,
                          fontSize: '0.86rem',
                          color: item.color,
                          backgroundColor: item.badgeBg,
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontVariantNumeric: 'tabular-nums'
                        }}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Barra Segmentada e Resumo no Rodapé */}
                  <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ height: '9px', width: '100%', borderRadius: '5px', display: 'flex', overflow: 'hidden', backgroundColor: 'var(--border)', marginBottom: '8px' }}>
                      {metrics.deliveredSafe.length > 0 && (
                        <div title={`Entregues Vigentes: ${metrics.deliveredSafe.length}`} style={{ width: `${Math.round((metrics.deliveredSafe.length / totalBarRef) * 100)}%`, backgroundColor: '#10b981' }} />
                      )}
                      {metrics.validOver30.length > 0 && (
                        <div title={`Validade > 30 Dias: ${metrics.validOver30.length}`} style={{ width: `${Math.round((metrics.validOver30.length / totalBarRef) * 100)}%`, backgroundColor: '#3b82f6' }} />
                      )}
                      {metrics.exp30.length > 0 && (
                        <div title={`A Vencer (≤30 Dias): ${metrics.exp30.length}`} style={{ width: `${Math.round((metrics.exp30.length / totalBarRef) * 100)}%`, backgroundColor: '#f59e0b' }} />
                      )}
                      {metrics.expired.length > 0 && (
                        <div title={`Vencidos: ${metrics.expired.length}`} style={{ width: `${Math.round((metrics.expired.length / totalBarRef) * 100)}%`, backgroundColor: '#dc2626' }} />
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      <span>Empresas 100% Regulares: <strong style={{ color: 'var(--text-primary)' }}>{metrics.regularCompaniesCount} / {filteredCompanies.length}</strong></span>
                      <span>Itens Monitorados: <strong style={{ color: 'var(--primary)' }}>{metrics.allUpcomingValidities.length + metrics.expired.length}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TELA 2: PRÓXIMOS A VENCER & CONTROLE DE PRAZOS (TELA DEDICADA DE ALTA DENSIDADE)
              ══════════════════════════════════════════════════════════════════ */}
          {currentScreen === 2 && (
            <div className="tv2-chart-card card" style={{ height: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Cabeçalho da Tela 2 */}
              <div className="tv2-chart-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', padding: '8px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} style={{ color: '#ef4444' }} />
                  <div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 900 }}>
                      PRÓXIMOS A VENCER &amp; CONTROLE DE PRAZOS ({displayedExpirationsList.length})
                    </span>
                    <span style={{ fontSize: '0.64rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>
                      Monitoramento Contínuo de Programas, Laudos e Documentos SST
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'proximos', label: `A Vencer (${metrics.allUpcomingValidities.length})`, color: 'var(--primary)' },
                    { id: 'criticos', label: `Críticos ≤30d (${metrics.exp30.length})`, color: '#f59e0b' },
                    { id: 'vencidos', label: `Vencidos (${metrics.expired.length})`, color: '#dc2626' },
                    { id: 'todos', label: 'Todos os Prazos', color: 'var(--text-primary)' }
                  ].map(tab => {
                    const active = expiringFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setExpiringFilter(tab.id)}
                        style={{
                          fontSize: '0.64rem',
                          padding: '3px 9px',
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

              {/* Tabela de Largura Total e Alta Densidade */}
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
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '4rem 1rem', fontSize: '0.85rem' }}>
                    Carregando cronograma completo de vencimentos SST...
                  </div>
                ) : displayedExpirationsList.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '4rem 1rem' }}>
                    <CheckCircle2 size={36} style={{ color: '#10b981', margin: '0 auto 8px auto' }} />
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                      Nenhum documento com vencimento crítico nesta categoria!
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Todos os programas monitorados estão regulares.
                    </div>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '0.72rem' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--surface)', zIndex: 2, boxShadow: '0 1px 0 var(--border)' }}>
                      <tr style={{ color: 'var(--text-secondary)', fontSize: '0.62rem', textTransform: 'uppercase', textAlign: 'left' }}>
                        <th style={{ padding: '7px 12px', width: '26%', fontWeight: 800 }}>Documento / Programa SST</th>
                        <th style={{ padding: '7px 10px', width: '28%', fontWeight: 800 }}>Empresa &amp; Grupo</th>
                        <th style={{ padding: '7px 10px', width: '20%', fontWeight: 800 }}>Técnico / Supervisor</th>
                        <th style={{ padding: '7px 8px', width: '12%', fontWeight: 800, textAlign: 'center' }}>Data Validade</th>
                        <th style={{ padding: '7px 12px', width: '14%', fontWeight: 800, textAlign: 'right' }}>Prazo Restante</th>
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
                        let countdownText = days !== null ? `${days}d restantes` : '—';

                        if (isExpired) {
                          dotColor = '#dc2626';
                          badgeBg = '#dc2626';
                          badgeColor = '#ffffff';
                          countdownText = days !== null ? `-${Math.abs(days)}d VENCIDO` : 'VENCIDO';
                        } else if (isToday) {
                          dotColor = '#dc2626';
                          badgeBg = '#dc2626';
                          badgeColor = '#ffffff';
                          countdownText = '🚨 VENCE HOJE!';
                        } else if (isTomorrow) {
                          dotColor = '#ea580c';
                          badgeBg = '#ea580c';
                          badgeColor = '#ffffff';
                          countdownText = '⚠️ AMANHÃ';
                        } else if (isUrgent15) {
                          dotColor = '#ef4444';
                          badgeBg = 'rgba(239, 68, 68, 0.16)';
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
                              cursor: 'pointer',
                              transition: 'background 0.15s'
                            }}
                          >
                            {/* Col 1: Documento */}
                            <td style={{ padding: '6px 12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                                    {shortenDocTitle(item.title)}
                                  </span>
                                  {item.type && (
                                    <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                                      · {item.type}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Col 2: Empresa & Grupo */}
                            <td style={{ padding: '6px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: 700, color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.companyName}
                              </div>
                              <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.groupName}
                              </div>
                            </td>

                            {/* Col 3: Técnico e Supervisor */}
                            <td style={{ padding: '6px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.tecnico !== 'Não definido' ? item.tecnico : item.supervisor}
                              </div>
                              <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                Sup: {item.supervisor}
                              </div>
                            </td>

                            {/* Col 4: Data de Validade */}
                            <td style={{
                              padding: '6px 8px',
                              textAlign: 'center',
                              fontWeight: 800,
                              color: isExpired || isToday ? '#dc2626' : 'var(--text-primary)',
                              fontVariantNumeric: 'tabular-nums',
                              whiteSpace: 'nowrap',
                              fontSize: '0.72rem'
                            }}>
                              {formatDateBR(item.targetDateStr)}
                            </td>

                            {/* Col 5: Prazo Restante */}
                            <td style={{ padding: '6px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <span style={{
                                display: 'inline-block',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '5px',
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
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TELA 3: CARTEIRA POR TÉCNICO/SUPERVISOR & AGENDAMENTOS DOS PRÓXIMOS 7 DIAS
              ══════════════════════════════════════════════════════════════════ */}
          {currentScreen === 3 && (
            <div className="tv2-body" style={{ gridTemplateColumns: '1.05fr 1fr', gap: '10px', height: '100%', flex: 1, minHeight: 0 }}>

              {/* CARD ESQUERDA: Carteira por Técnico / Supervisor */}
              <div className="tv2-chart-card card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
                <div className="tv2-chart-head" style={{ justifyContent: 'space-between', padding: '8px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={17} className="text-blue" />
                    <div>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800 }}>Carteira por Técnico / Supervisor</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>
                        Distribuição de Empresas e Desempenho da Equipe SST
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {selectedResponsible !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setSelectedResponsible('all')}
                        style={{
                          fontSize: '0.62rem',
                          padding: '2px 8px',
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
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                      {teamChartData.length} profissionais
                    </span>
                  </div>
                </div>

                <div style={{ flex: 1, minHeight: 0, padding: 0, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--surface)', zIndex: 2, boxShadow: '0 1px 0 var(--border)' }}>
                      <tr style={{ color: 'var(--text-secondary)', fontSize: '0.62rem', textTransform: 'uppercase', textAlign: 'left' }}>
                        <th style={{ padding: '7px 10px', fontWeight: 800 }}>Profissional</th>
                        <th style={{ padding: '7px 6px', fontWeight: 800, textAlign: 'center' }}>Função</th>
                        <th style={{ padding: '7px 6px', fontWeight: 800, textAlign: 'center' }}>Emp.</th>
                        <th style={{ padding: '7px 6px', fontWeight: 800, textAlign: 'center', color: '#10b981' }}>Em Dia</th>
                        <th style={{ padding: '7px 6px', fontWeight: 800, textAlign: 'center', color: '#d97706' }}>≤ 30d</th>
                        <th style={{ padding: '7px 6px', fontWeight: 800, textAlign: 'center', color: '#dc2626' }}>Venc.</th>
                        <th style={{ padding: '7px 10px', fontWeight: 800, textAlign: 'right' }}>Saúde</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamChartData.map((resp, idx) => {
                        const isSelected = selectedResponsible === resp.fullName;
                        return (
                          <tr
                            key={resp.fullName}
                            onClick={() => setSelectedResponsible(isSelected ? 'all' : resp.fullName)}
                            title={`Filtrar painel por ${resp.fullName}`}
                            style={{
                              borderBottom: '1px solid var(--border)',
                              backgroundColor: isSelected ? 'var(--primary-light)' : (idx % 2 === 0 ? 'transparent' : 'var(--background)'),
                              cursor: 'pointer',
                              transition: 'background 0.15s'
                            }}
                          >
                            <td style={{ padding: '8px 10px', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: 24, height: 24, borderRadius: '50%',
                                  backgroundColor: resp.roleLabel === 'Supervisor' ? 'rgba(37,99,235,0.15)' : 'rgba(16,185,129,0.15)',
                                  color: resp.roleLabel === 'Supervisor' ? '#2563eb' : '#059669',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '0.62rem', fontWeight: 800
                                }}>
                                  {resp.fullName.slice(0, 2).toUpperCase()}
                                </div>
                                <span>{resp.fullName}</span>
                              </div>
                            </td>
                            <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                              <span style={{
                                fontSize: '0.6rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: resp.roleLabel === 'Supervisor' ? 'rgba(37,99,235,0.12)' : 'rgba(16,185,129,0.12)',
                                color: resp.roleLabel === 'Supervisor' ? '#2563eb' : '#059669'
                              }}>
                                {resp.roleLabel}
                              </span>
                            </td>
                            <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                              {resp.empresas}
                            </td>
                            <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 800, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>
                              {resp.Vigentes}
                            </td>
                            <td style={{ padding: '8px 6px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                              {resp['A Vencer (≤30d)'] > 0 ? (
                                <span style={{ background: 'rgba(245,158,11,0.16)', color: '#d97706', padding: '2px 7px', borderRadius: '4px', fontWeight: 800, fontSize: '0.68rem' }}>
                                  {resp['A Vencer (≤30d)']}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>0</span>
                              )}
                            </td>
                            <td style={{ padding: '8px 6px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                              {resp.Vencidos > 0 ? (
                                <span style={{ background: 'rgba(220,38,38,0.15)', color: '#dc2626', padding: '2px 7px', borderRadius: '4px', fontWeight: 800, fontSize: '0.68rem' }}>
                                  {resp.Vencidos}
                                </span>
                              ) : (
                                <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.68rem' }}>✓ 0</span>
                              )}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                color: resp.pctConformidade >= 85 ? '#10b981' : (resp.pctConformidade >= 70 ? '#f59e0b' : '#dc2626')
                              }}>
                                {resp.pctConformidade}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Rodapé do Card Equipe */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--background)',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)'
                }}>
                  <span>Total Coberto: <strong style={{ color: 'var(--text-primary)' }}>{filteredCompanies.length} empresas</strong></span>
                  <span>Profissionais Ativos: <strong style={{ color: 'var(--primary)' }}>{teamChartData.length}</strong></span>
                </div>
              </div>

              {/* CARD DIREITA: Agendamentos dos Próximos 7 Dias */}
              <div className="tv2-chart-card card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
                <div className="tv2-chart-head" style={{ justifyContent: 'space-between', padding: '8px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CalendarDays size={17} className="text-emerald" />
                    <div>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800 }}>Agendamentos dos Próximos 7 Dias</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>
                        Visitas Técnicas, Treinamentos, DDS e Entregas Programadas
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '2px 8px', borderRadius: '10px' }}>
                    {upcomingScheduledItems.length} agendados
                  </span>
                </div>

                <div style={{ flex: 1, minHeight: 0, padding: '8px 10px', overflowY: 'auto' }}>
                  {upcomingScheduledItems.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3.5rem 1rem' }}>
                      <CheckCircle2 size={36} style={{ color: '#10b981', margin: '0 auto 8px auto' }} />
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                        Nenhum agendamento para os próximos 7 dias!
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        A agenda da equipe técnica está livre para novos treinamentos e visitas.
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      {upcomingScheduledItems.map((event) => {
                        return (
                          <div
                            key={event.id}
                            onClick={() => event.companyId && navigate(`/company/${event.companyId}`)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              backgroundColor: event.isToday ? 'rgba(239, 68, 68, 0.06)' : 'var(--background)',
                              border: event.isToday ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)',
                              cursor: event.companyId ? 'pointer' : 'default',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {/* Bloco Data & Horário */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                              <div style={{
                                width: 50,
                                textAlign: 'center',
                                padding: '3px 0',
                                borderRadius: '6px',
                                backgroundColor: event.isToday ? '#ef4444' : (event.isTomorrow ? '#ea580c' : 'var(--primary-light)'),
                                color: event.isToday || event.isTomorrow ? '#fff' : 'var(--primary)',
                                fontWeight: 800,
                                flexShrink: 0
                              }}>
                                <div style={{ fontSize: '0.58rem', textTransform: 'uppercase', lineHeight: 1 }}>
                                  {event.isToday ? 'HOJE' : (event.isTomorrow ? 'AMANHÃ' : formatDateBR(event.dateStr, true).slice(0, 5))}
                                </div>
                                <div style={{ fontSize: '0.68rem', fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>
                                  {event.time.slice(0, 5)}
                                </div>
                              </div>

                              {/* Título, Empresa e Instrutor */}
                              <div style={{ overflow: 'hidden', minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.76rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {event.title}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.64rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{event.companyName}</span>
                                  <span>·</span>
                                  <span>Instrutor/Téc: <strong style={{ color: 'var(--text-primary)' }}>{event.responsible}</strong></span>
                                </div>
                              </div>
                            </div>

                            {/* Badges de Status & Categoria */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                              <span style={{
                                fontSize: '0.58rem',
                                fontWeight: 800,
                                padding: '2px 7px',
                                borderRadius: '4px',
                                backgroundColor: event.category === 'Treinamento' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                color: event.category === 'Treinamento' ? '#2563eb' : '#059669',
                                textTransform: 'uppercase'
                              }}>
                                {event.category}
                              </span>
                              <span style={{
                                fontSize: '0.58rem',
                                fontWeight: 700,
                                color: event.status === 'concluido' ? '#10b981' : (event.status === 'adiado' ? '#b45309' : 'var(--text-secondary)')
                              }}>
                                {event.status === 'concluido' ? 'Concluído' : (event.status === 'adiado' ? 'Adiado' : 'Confirmado')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Rodapé do Card de Agendamentos */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--background)',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)'
                }}>
                  <span>Janela: <strong style={{ color: 'var(--text-primary)' }}>{formatDateBR(today)} até {formatDateBR(in7Days)}</strong></span>
                  <span>Eventos Programados: <strong style={{ color: '#10b981' }}>{upcomingScheduledItems.length}</strong></span>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* ── RODAPÉ TICKER (RADAR SST) ── */}
        <footer className="tv2-ticker" style={{ height: '28px', flexShrink: 0 }}>
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