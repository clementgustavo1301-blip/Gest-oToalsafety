import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, CheckCircle2, AlertTriangle, Maximize2, Minimize2,
  ArrowLeft, BarChart3, Clock, Users, Play, Pause,
  Award, Flame, CalendarDays, ArrowLeftRight
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

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dados do banco
  const [contracts, setContracts] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [groups, setGroups] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [trainings, setTrainings] = useState([]);

  // Controles de Navegação e Alternância de Telas TV (15 segundos)
  const [currentScreen, setCurrentScreen] = useState(2); // 1: Panorama & Validades, 2: 3 Tabelas de Prazos, 3: Carteira & Agendamentos
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [timerProgress, setTimerProgress] = useState(0);

  // Filtros e ordenação da Tela 2
  const [tableOrder, setTableOrder] = useState('60_30_venc'); // '60_30_venc' | 'venc_30_60'
  const [view60dFilter, setView60dFilter] = useState('60d'); // '60d' (31-60 dias) | 'allOver30' (todos >30 dias)
  const [selectedResponsible, setSelectedResponsible] = useState('all');
  const [chartMode, setChartMode] = useState('documentos'); // 'documentos' | 'equipe'

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
    setTimerProgress(0); // Reinicia os 15s na tela selecionada
  };

  const toggleAutoRotate = () => {
    setIsAutoRotate(prev => !prev);
  };

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
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

  // 3 Listas Dedicadas para a Tela 2: Até 60 Dias, Até 30 Dias e Vencidos
  const listVencidos = useMemo(() => {
    return activeDeliverables
      .filter(d => d.isExpired || (d.daysLeft !== null && d.daysLeft < 0))
      .sort((a, b) => {
        // Ordena dos mais atrasados para os mais recentes
        return (a.daysLeft ?? -9999) - (b.daysLeft ?? -9999);
      });
  }, [activeDeliverables]);

  const listAte30d = useMemo(() => {
    return activeDeliverables
      .filter(d => !d.isExpired && d.daysLeft !== null && d.daysLeft >= 0 && d.daysLeft <= 30)
      .sort((a, b) => {
        // Ordena dos que vencem primeiro (hoje, amanhã, 5 dias...)
        return (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999);
      });
  }, [activeDeliverables]);

  const listAte60d = useMemo(() => {
    return activeDeliverables
      .filter(d => !d.isExpired && d.daysLeft !== null && d.daysLeft > 30 && d.daysLeft <= 60)
      .sort((a, b) => {
        return (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999);
      });
  }, [activeDeliverables]);

  const listOver60d = useMemo(() => {
    return activeDeliverables
      .filter(d => !d.isExpired && d.daysLeft !== null && d.daysLeft > 60)
      .sort((a, b) => {
        return (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999);
      });
  }, [activeDeliverables]);

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

  // Distribuição de Validades (dados para o Donut)
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
      totalMonitored: safeDeliveredCount + validOver30Count + exp30Count + expiredCount
    };
  }, [metrics]);

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

    return list.sort((a, b) => {
      const diff = a.dateObj.getTime() - b.dateObj.getTime();
      if (diff !== 0) return diff;
      return (a.time || '').localeCompare(b.time || '');
    });
  }, [trainings, activeDeliverables, companiesMap, today, in7Days]);

  const secondsRemaining = Math.max(1, Math.ceil(15 - (timerProgress / 100) * 15));
  const totalBarRef = Math.max(1, validityBreakdown.totalMonitored);

  // Helper para renderizar linhas das tabelas com estilo uniforme e de alta densidade
  const renderDeliverableRows = (items, categoryType) => {
    if (!items || items.length === 0) {
      return (
        <tr>
          <td colSpan={4} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={32} style={{ color: '#10b981', margin: '0 auto 6px auto' }} />
            <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
              Nenhum documento nesta faixa!
            </div>
          </td>
        </tr>
      );
    }

    return items.map((item, idx) => {
      const days = item.daysLeft;
      const isExpired = categoryType === 'vencidos' || item.isExpired || (days !== null && days < 0);
      const isToday = !isExpired && days === 0;
      const isTomorrow = !isExpired && days === 1;
      const isUrgent15 = !isExpired && days !== null && days <= 15;

      let dotColor = '#3b82f6';
      let badgeBg = 'rgba(59, 130, 246, 0.14)';
      let badgeColor = '#3b82f6';
      let countdownText = days !== null ? `${days}d` : '—';

      if (isExpired) {
        dotColor = '#dc2626';
        badgeBg = '#dc2626';
        badgeColor = '#ffffff';
        countdownText = days !== null ? `-${Math.abs(days)}d VENCIDO` : 'VENCIDO';
      } else if (isToday) {
        dotColor = '#dc2626';
        badgeBg = '#dc2626';
        badgeColor = '#ffffff';
        countdownText = '🚨 HOJE!';
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
      } else if (categoryType === 'ate30d') {
        dotColor = '#f59e0b';
        badgeBg = 'rgba(245, 158, 11, 0.16)';
        badgeColor = '#d97706';
        countdownText = `${days} dias`;
      } else {
        dotColor = '#2563eb';
        badgeBg = 'rgba(37, 99, 235, 0.14)';
        badgeColor = '#2563eb';
        countdownText = `${days} dias`;
      }

      return (
        <tr
          key={item.id || idx}
          onClick={() => navigate(`/company/${item.companyId}`)}
          title={`${item.title} — ${item.companyName} (Téc: ${item.tecnico})`}
          style={{
            borderBottom: '1px solid var(--border)',
            backgroundColor: isToday || isExpired ? 'rgba(220, 38, 38, 0.04)' : (idx % 2 === 0 ? 'transparent' : 'var(--background)'),
            cursor: 'pointer',
            transition: 'background 0.15s'
          }}
        >
          {/* Col 1: Documento */}
          <td style={{ padding: '6px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />
              <span style={{ fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {shortenDocTitle(item.title)}
              </span>
            </div>
          </td>

          {/* Col 2: Empresa & Técnico */}
          <td style={{ padding: '6px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <div style={{ fontWeight: 700, color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.15 }}>
              {item.companyName}
            </div>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.1 }}>
              {item.tecnico !== 'Não definido' ? item.tecnico : item.supervisor}
            </div>
          </td>

          {/* Col 3: Data de Validade */}
          <td style={{
            padding: '6px 6px',
            textAlign: 'center',
            fontWeight: 800,
            color: isExpired || isToday ? '#dc2626' : 'var(--text-primary)',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
            fontSize: '0.72rem'
          }}>
            {formatDateBR(item.targetDateStr, true)}
          </td>

          {/* Col 4: Prazo Restante */}
          <td style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
            <span style={{
              display: 'inline-block',
              fontSize: '0.62rem',
              fontWeight: 800,
              padding: '2px 7px',
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
    });
  };

  return (
    <div className="tv-fullscreen-wrapper">
      <div className="tv2" style={{ padding: '8px', gap: '8px', height: '100vh', maxHeight: '100vh', overflow: 'hidden' }}>

        {/* ── BARRA ÚNICA SUPERIOR: APENAS O BOTÃO DE VOLTAR + INFORMAÇÕES (KPIS) + CONTROLE DISCRETO 15S ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
          width: '100%'
        }}>
          {/* Botão de Voltar */}
          <button
            onClick={() => navigate('/')}
            title="Voltar ao Painel Geral"
            style={{
              height: '46px',
              padding: '0 14px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.78rem',
              boxShadow: 'var(--shadow-sm)',
              flexShrink: 0,
              transition: 'all 0.15s ease'
            }}
          >
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </button>

          {/* Faixa de Informações (5 KPIs Compactos) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px',
            flex: 1,
            minWidth: 0
          }}>
            {/* KPI 1: Empresas Monitoradas */}
            <div className="tv2-kpi-card" style={{ padding: '5px 10px', gap: '2px', height: '46px', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <div className="tv2-kpi-icon bg-blue-dim" style={{ width: 26, height: 26 }}><Building2 size={13} /></div>
                  <div className="tv2-kpi-body">
                    <span className="tv2-kpi-val" style={{ fontSize: '1.05rem', lineHeight: 1 }}>
                      {filteredCompanies.length}
                      <span className="tv2-kpi-sub" style={{ fontSize: '0.62rem' }}> ({metrics.pctRegularCompanies}%)</span>
                    </span>
                    <span className="tv2-kpi-lbl" style={{ fontSize: '0.55rem' }}>Empresas</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '1px 5px', borderRadius: '8px' }}>
                  {groups.length} Grupos
                </span>
              </div>
            </div>

            {/* KPI 2: Programas Vigentes */}
            <div className="tv2-kpi-card" style={{ padding: '5px 10px', gap: '2px', height: '46px', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <div className="tv2-kpi-icon bg-emerald-dim" style={{ width: 26, height: 26 }}><CheckCircle2 size={13} /></div>
                  <div className="tv2-kpi-body">
                    <span className="tv2-kpi-val" style={{ fontSize: '1.05rem', lineHeight: 1 }}>
                      {metrics.deliveredVigentes.length}
                      <span className="tv2-kpi-sub" style={{ fontSize: '0.62rem' }}> vigentes</span>
                    </span>
                    <span className="tv2-kpi-lbl" style={{ fontSize: '0.55rem' }}>Entregues SST</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '1px 5px', borderRadius: '8px' }}>
                  {metrics.pctConformity}% Conf.
                </span>
              </div>
            </div>

            {/* KPI 3: Próximos a Vencer */}
            <div
              className={`tv2-kpi-card ${metrics.exp30.length > 0 ? 'tv2-kpi-warn' : ''}`}
              onClick={() => handleSelectScreen(2)}
              style={{ padding: '5px 10px', gap: '2px', height: '46px', justifyContent: 'center', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <div className="tv2-kpi-icon" style={{ width: 26, height: 26, backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                    <Flame size={13} />
                  </div>
                  <div className="tv2-kpi-body">
                    <span className="tv2-kpi-val" style={{ fontSize: '1.05rem', lineHeight: 1, color: metrics.exp30.length > 0 ? '#ef4444' : undefined }}>
                      {metrics.exp30.length}
                      <span className="tv2-kpi-sub" style={{ fontSize: '0.62rem' }}> ({metrics.companiesWithExp30Count} emp.)</span>
                    </span>
                    <span className="tv2-kpi-lbl" style={{ fontSize: '0.55rem' }}>A Vencer (≤30d)</span>
                  </div>
                </div>
                {metrics.expTodayOr7d.length > 0 && (
                  <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#fff', background: '#ef4444', padding: '1px 5px', borderRadius: '8px' }}>
                    {metrics.expTodayOr7d.length} ≤7d
                  </span>
                )}
              </div>
            </div>

            {/* KPI 4: Vencidos */}
            <div
              className={`tv2-kpi-card ${metrics.expired.length > 0 ? 'tv2-kpi-danger' : ''}`}
              onClick={() => handleSelectScreen(2)}
              style={{ padding: '5px 10px', gap: '2px', height: '46px', justifyContent: 'center', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <div className="tv2-kpi-icon" style={{ width: 26, height: 26, backgroundColor: 'rgba(220,38,38,0.12)', color: '#dc2626' }}>
                    <AlertTriangle size={13} />
                  </div>
                  <div className="tv2-kpi-body">
                    <span className="tv2-kpi-val" style={{ fontSize: '1.05rem', lineHeight: 1, color: metrics.expired.length > 0 ? '#dc2626' : undefined }}>
                      {metrics.expired.length}
                      <span className="tv2-kpi-sub" style={{ fontSize: '0.62rem' }}> ({metrics.companiesWithExpiredCount} emp.)</span>
                    </span>
                    <span className="tv2-kpi-lbl" style={{ fontSize: '0.55rem' }}>Vencidos</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#dc2626', background: 'rgba(220,38,38,0.12)', padding: '1px 5px', borderRadius: '8px' }}>
                  Ação Imediata
                </span>
              </div>
            </div>

            {/* KPI 5: Agendamentos 7 Dias */}
            <div
              className="tv2-kpi-card"
              onClick={() => handleSelectScreen(3)}
              style={{ padding: '5px 10px', gap: '2px', height: '46px', justifyContent: 'center', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <div className="tv2-kpi-icon bg-emerald-dim" style={{ width: 26, height: 26 }}><CalendarDays size={13} /></div>
                  <div className="tv2-kpi-body">
                    <span className="tv2-kpi-val" style={{ fontSize: '1.05rem', lineHeight: 1, color: '#10b981' }}>
                      {upcomingScheduledItems.length}
                      <span className="tv2-kpi-sub" style={{ fontSize: '0.62rem' }}> eventos</span>
                    </span>
                    <span className="tv2-kpi-lbl" style={{ fontSize: '0.55rem' }}>Agenda 7 Dias</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '1px 5px', borderRadius: '8px' }}>
                  {contracts.filter(c => c.status === 'ativo').length} Contratos
                </span>
              </div>
            </div>
          </div>

          {/* Controle Discreto da Alternância de Telas (15s) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '4px 10px',
            height: '46px',
            flexShrink: 0,
            boxShadow: 'var(--shadow-sm)'
          }}>
            {/* Pontos Indicadores de Tela 1, 2, 3 com animação de progresso */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {[
                { id: 1, label: '1' },
                { id: 2, label: '2' },
                { id: 3, label: '3' }
              ].map(s => {
                const active = currentScreen === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelectScreen(s.id)}
                    title={`Tela ${s.id}`}
                    style={{
                      width: active ? '32px' : '18px',
                      height: '24px',
                      borderRadius: '6px',
                      border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
                      backgroundColor: active ? 'var(--primary)' : 'var(--background)',
                      color: active ? '#fff' : 'var(--text-secondary)',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>{s.label}</span>
                    {active && isAutoRotate && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        height: '3px',
                        backgroundColor: '#fff',
                        width: `${timerProgress}%`,
                        opacity: 0.9,
                        transition: 'width 0.1s linear'
                      }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Botão Pausar / Play de 15s */}
            <button
              onClick={toggleAutoRotate}
              title={isAutoRotate ? 'Pausar rotação' : 'Ativar rotação automática de 15s'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.66rem',
                fontWeight: 800,
                border: 'none',
                background: isAutoRotate ? 'var(--primary-light)' : 'var(--background)',
                color: isAutoRotate ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {isAutoRotate ? <Pause size={11} /> : <Play size={11} />}
              <span>{isAutoRotate ? `${secondsRemaining}s` : 'PAUSA'}</span>
            </button>

            {/* Tela Cheia */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Sair da Tela Cheia' : 'Modo Tela Cheia (TV)'}
              style={{
                width: 28,
                height: 28,
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════
            CORPO PRINCIPAL EXPANDIDO — APROVEITANDO O ESPAÇO MÁXIMO DA TELA
            ══════════════════════════════════════════════════════════════════════════ */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

          {/* ══════════════════════════════════════════════════════════════════
              TELA 1: PANORAMA GERAL POR PROGRAMA/DOCUMENTO SST & DISTRIBUIÇÃO DE VALIDADES
              ══════════════════════════════════════════════════════════════════ */}
          {currentScreen === 1 && (
            <div className="tv2-body" style={{ gridTemplateColumns: '1.35fr 1fr', gap: '8px', height: '100%', flex: 1, minHeight: 0 }}>

              {/* CARD ESQUERDA: Panorama Geral por Programa / Documento SST */}
              <div className="tv2-chart-card card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, padding: 0 }}>
                <div className="tv2-chart-head" style={{ justifyContent: 'space-between', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={17} className="text-blue" />
                    <span style={{ fontSize: '0.86rem', fontWeight: 800 }}>
                      Panorama Geral SST por Programa / Documento
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setChartMode('documentos')}
                      style={{
                        fontSize: '0.64rem',
                        padding: '3px 10px',
                        borderRadius: '5px',
                        border: chartMode === 'documentos' ? '1px solid var(--primary)' : '1px solid var(--border)',
                        background: chartMode === 'documentos' ? 'var(--primary)' : 'var(--background)',
                        color: chartMode === 'documentos' ? '#fff' : 'var(--text-secondary)',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Por Programa
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMode('equipe')}
                      style={{
                        fontSize: '0.64rem',
                        padding: '3px 10px',
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

                <div className="tv2-chart-area" style={{ flex: 1, minHeight: 0, padding: '12px 14px 10px 4px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartMode === 'documentos' ? documentChartData : teamChartData}
                      margin={{ top: 10, right: 15, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="name"
                        fontSize={12}
                        tick={{ fill: 'var(--text-secondary)', fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        fontSize={12}
                        tick={{ fill: 'var(--text-secondary)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'var(--surface)',
                          borderColor: 'var(--border)',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          color: 'var(--text-primary)'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                      <Bar dataKey="Vigentes" fill="#10b981" radius={[4, 4, 0, 0]} name="Vigentes / Em Dia" />
                      <Bar dataKey="A Vencer (≤30d)" fill="#f59e0b" radius={[4, 4, 0, 0]} name="A Vencer (≤30d)" />
                      <Bar dataKey="Vencidos" fill="#dc2626" radius={[4, 4, 0, 0]} name="Vencidos" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CARD DIREITA: Distribuição de Validades (Amplo, Limpo e Sem Ruído) */}
              <div className="tv2-chart-card card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, padding: 0 }}>
                <div className="tv2-chart-head" style={{ justifyContent: 'space-between', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Award size={17} className="text-emerald" />
                    <span style={{ fontSize: '0.86rem', fontWeight: 800 }}>Distribuição de Validades</span>
                  </div>
                  <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#10b981', background: 'rgba(16,185,129,0.14)', padding: '3px 10px', borderRadius: '12px' }}>
                    {metrics.pctConformity}% Em Dia
                  </span>
                </div>

                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '14px 16px' }}>
                  {/* Gráfico Donut de Destaque */}
                  <div style={{ width: '100%', height: '190px', position: 'relative', margin: '0 auto' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={validityBreakdown.chartSlices}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={82}
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
                            fontSize: '0.76rem',
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
                      <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                        {metrics.pctConformity}%
                      </span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: 4 }}>
                        Regularidade
                      </span>
                    </div>
                  </div>

                  {/* 4 Linhas Limpas de Validade */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '10px 0' }}>
                    {validityBreakdown.items.map((item) => (
                      <div
                        key={item.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--background)',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                          <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                            {item.name}
                          </span>
                        </div>
                        <span style={{
                          fontWeight: 900,
                          fontSize: '0.92rem',
                          color: item.color,
                          backgroundColor: item.badgeBg,
                          padding: '3px 12px',
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                      <span>Empresas 100% Regulares: <strong style={{ color: 'var(--text-primary)' }}>{metrics.regularCompaniesCount} / {filteredCompanies.length}</strong></span>
                      <span>Itens Monitorados: <strong style={{ color: 'var(--primary)' }}>{metrics.allUpcomingValidities.length + metrics.expired.length}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TELA 2: 3 TABELAS DEDICADAS (ATÉ 60 DIAS, ATÉ 30 DIAS E VENCIDOS)
              ══════════════════════════════════════════════════════════════════ */}
          {currentScreen === 2 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              height: '100%',
              flex: 1,
              minHeight: 0
            }}>

              {/* ── CARD 1: ATÉ 60 DIAS (OU VENCIDOS CONFORME ORDEM) ── */}
              {tableOrder === '60_30_venc' ? (
                /* TABELA ATÉ 60 DIAS */
                <div className="tv2-chart-card card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, padding: 0, overflow: 'hidden' }}>
                  <div className="tv2-chart-head" style={{ justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <Clock size={16} style={{ color: '#2563eb' }} />
                      <span style={{ fontSize: '0.84rem', fontWeight: 900 }}>ATÉ 60 DIAS</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setView60dFilter(f => (f === '60d' ? 'allOver30' : '60d'))}
                        title={view60dFilter === '60d' ? 'Exibindo 31 a 60 dias (clique para ver todos >30d)' : 'Exibindo todos >30 dias (clique para filtrar até 60d)'}
                        style={{
                          fontSize: '0.58rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--background)',
                          color: 'var(--text-secondary)',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {view60dFilter === '60d' ? '31–60d' : 'Todos >30d'}
                      </button>

                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 900,
                        color: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.12)',
                        padding: '2px 8px',
                        borderRadius: '10px'
                      }}>
                        {view60dFilter === '60d' ? listAte60d.length : (listAte60d.length + listOver60d.length)}
                      </span>

                      <button
                        type="button"
                        onClick={() => setTableOrder('venc_30_60')}
                        title="Inverter ordem das tabelas"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <ArrowLeftRight size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="tv2-chart-area" style={{ padding: 0, overflowY: 'auto', flex: 1, minHeight: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '0.7rem' }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--surface)', zIndex: 2, boxShadow: '0 1px 0 var(--border)' }}>
                        <tr style={{ color: 'var(--text-secondary)', fontSize: '0.6rem', textTransform: 'uppercase', textAlign: 'left' }}>
                          <th style={{ padding: '6px 8px', width: '31%', fontWeight: 800 }}>Documento</th>
                          <th style={{ padding: '6px 8px', width: '37%', fontWeight: 800 }}>Empresa / Téc.</th>
                          <th style={{ padding: '6px 6px', width: '17%', fontWeight: 800, textAlign: 'center' }}>Validade</th>
                          <th style={{ padding: '6px 8px', width: '15%', fontWeight: 800, textAlign: 'right' }}>Prazo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {renderDeliverableRows(view60dFilter === '60d' ? listAte60d : [...listAte60d, ...listOver60d], 'ate60d')}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* TABELA VENCIDOS (QUANDO INVERTIDO) */
                <div className="tv2-chart-card card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, padding: 0, overflow: 'hidden' }}>
                  <div className="tv2-chart-head" style={{ justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <AlertTriangle size={16} style={{ color: '#dc2626' }} />
                      <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#dc2626' }}>VENCIDOS</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 900,
                        color: '#dc2626',
                        backgroundColor: 'rgba(220, 38, 38, 0.12)',
                        padding: '2px 8px',
                        borderRadius: '10px'
                      }}>
                        {listVencidos.length} expirados
                      </span>

                      <button
                        type="button"
                        onClick={() => setTableOrder('60_30_venc')}
                        title="Inverter ordem das tabelas"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <ArrowLeftRight size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="tv2-chart-area" style={{ padding: 0, overflowY: 'auto', flex: 1, minHeight: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '0.7rem' }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--surface)', zIndex: 2, boxShadow: '0 1px 0 var(--border)' }}>
                        <tr style={{ color: 'var(--text-secondary)', fontSize: '0.6rem', textTransform: 'uppercase', textAlign: 'left' }}>
                          <th style={{ padding: '6px 8px', width: '31%', fontWeight: 800 }}>Documento</th>
                          <th style={{ padding: '6px 8px', width: '37%', fontWeight: 800 }}>Empresa / Téc.</th>
                          <th style={{ padding: '6px 6px', width: '17%', fontWeight: 800, textAlign: 'center' }}>Validade</th>
                          <th style={{ padding: '6px 8px', width: '15%', fontWeight: 800, textAlign: 'right' }}>Prazo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {renderDeliverableRows(listVencidos, 'vencidos')}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── CARD 2 (CENTRAL): ATÉ 30 DIAS ── */}
              <div className="tv2-chart-card card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, padding: 0, overflow: 'hidden' }}>
                <div className="tv2-chart-head" style={{ justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <Flame size={16} style={{ color: '#ea580c' }} />
                    <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#ea580c' }}>ATÉ 30 DIAS</span>
                  </div>

                  <span style={{
                    fontSize: '0.66rem',
                    fontWeight: 900,
                    color: '#ea580c',
                    backgroundColor: 'rgba(234, 88, 12, 0.12)',
                    padding: '2px 8px',
                    borderRadius: '10px'
                  }}>
                    {listAte30d.length} críticos
                  </span>
                </div>

                <div className="tv2-chart-area" style={{ padding: 0, overflowY: 'auto', flex: 1, minHeight: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '0.7rem' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--surface)', zIndex: 2, boxShadow: '0 1px 0 var(--border)' }}>
                      <tr style={{ color: 'var(--text-secondary)', fontSize: '0.6rem', textTransform: 'uppercase', textAlign: 'left' }}>
                        <th style={{ padding: '6px 8px', width: '31%', fontWeight: 800 }}>Documento</th>
                        <th style={{ padding: '6px 8px', width: '37%', fontWeight: 800 }}>Empresa / Téc.</th>
                        <th style={{ padding: '6px 6px', width: '17%', fontWeight: 800, textAlign: 'center' }}>Validade</th>
                        <th style={{ padding: '6px 8px', width: '15%', fontWeight: 800, textAlign: 'right' }}>Prazo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderDeliverableRows(listAte30d, 'ate30d')}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── CARD 3 (DIREITA): VENCIDOS (OU ATÉ 60 DIAS CONFORME ORDEM) ── */}
              {tableOrder === '60_30_venc' ? (
                /* TABELA VENCIDOS */
                <div className="tv2-chart-card card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, padding: 0, overflow: 'hidden' }}>
                  <div className="tv2-chart-head" style={{ justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <AlertTriangle size={16} style={{ color: '#dc2626' }} />
                      <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#dc2626' }}>VENCIDOS</span>
                    </div>

                    <span style={{
                      fontSize: '0.66rem',
                      fontWeight: 900,
                      color: '#dc2626',
                      backgroundColor: 'rgba(220, 38, 38, 0.12)',
                      padding: '2px 8px',
                      borderRadius: '10px'
                    }}>
                      {listVencidos.length} expirados
                    </span>
                  </div>

                  <div className="tv2-chart-area" style={{ padding: 0, overflowY: 'auto', flex: 1, minHeight: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '0.7rem' }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--surface)', zIndex: 2, boxShadow: '0 1px 0 var(--border)' }}>
                        <tr style={{ color: 'var(--text-secondary)', fontSize: '0.6rem', textTransform: 'uppercase', textAlign: 'left' }}>
                          <th style={{ padding: '6px 8px', width: '31%', fontWeight: 800 }}>Documento</th>
                          <th style={{ padding: '6px 8px', width: '37%', fontWeight: 800 }}>Empresa / Téc.</th>
                          <th style={{ padding: '6px 6px', width: '17%', fontWeight: 800, textAlign: 'center' }}>Validade</th>
                          <th style={{ padding: '6px 8px', width: '15%', fontWeight: 800, textAlign: 'right' }}>Prazo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {renderDeliverableRows(listVencidos, 'vencidos')}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* TABELA ATÉ 60 DIAS (QUANDO INVERTIDO) */
                <div className="tv2-chart-card card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, padding: 0, overflow: 'hidden' }}>
                  <div className="tv2-chart-head" style={{ justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <Clock size={16} style={{ color: '#2563eb' }} />
                      <span style={{ fontSize: '0.84rem', fontWeight: 900 }}>ATÉ 60 DIAS</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setView60dFilter(f => (f === '60d' ? 'allOver30' : '60d'))}
                        style={{
                          fontSize: '0.58rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--background)',
                          color: 'var(--text-secondary)',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {view60dFilter === '60d' ? '31–60d' : 'Todos >30d'}
                      </button>

                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 900,
                        color: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.12)',
                        padding: '2px 8px',
                        borderRadius: '10px'
                      }}>
                        {view60dFilter === '60d' ? listAte60d.length : (listAte60d.length + listOver60d.length)}
                      </span>
                    </div>
                  </div>

                  <div className="tv2-chart-area" style={{ padding: 0, overflowY: 'auto', flex: 1, minHeight: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '0.7rem' }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--surface)', zIndex: 2, boxShadow: '0 1px 0 var(--border)' }}>
                        <tr style={{ color: 'var(--text-secondary)', fontSize: '0.6rem', textTransform: 'uppercase', textAlign: 'left' }}>
                          <th style={{ padding: '6px 8px', width: '31%', fontWeight: 800 }}>Documento</th>
                          <th style={{ padding: '6px 8px', width: '37%', fontWeight: 800 }}>Empresa / Téc.</th>
                          <th style={{ padding: '6px 6px', width: '17%', fontWeight: 800, textAlign: 'center' }}>Validade</th>
                          <th style={{ padding: '6px 8px', width: '15%', fontWeight: 800, textAlign: 'right' }}>Prazo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {renderDeliverableRows(view60dFilter === '60d' ? listAte60d : [...listAte60d, ...listOver60d], 'ate60d')}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TELA 3: CARTEIRA POR TÉCNICO/SUPERVISOR & AGENDAMENTOS DOS PRÓXIMOS 7 DIAS
              ══════════════════════════════════════════════════════════════════ */}
          {currentScreen === 3 && (
            <div className="tv2-body" style={{ gridTemplateColumns: '1.05fr 1fr', gap: '8px', height: '100%', flex: 1, minHeight: 0 }}>

              {/* CARD ESQUERDA: Carteira por Técnico / Supervisor */}
              <div className="tv2-chart-card card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', padding: 0 }}>
                <div className="tv2-chart-head" style={{ justifyContent: 'space-between', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={17} className="text-blue" />
                    <span style={{ fontSize: '0.86rem', fontWeight: 800 }}>Carteira por Técnico / Supervisor</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {selectedResponsible !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setSelectedResponsible('all')}
                        style={{
                          fontSize: '0.64rem',
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
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                      {teamChartData.length} profissionais
                    </span>
                  </div>
                </div>

                <div style={{ flex: 1, minHeight: 0, padding: 0, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--surface)', zIndex: 2, boxShadow: '0 1px 0 var(--border)' }}>
                      <tr style={{ color: 'var(--text-secondary)', fontSize: '0.64rem', textTransform: 'uppercase', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px', fontWeight: 800 }}>Profissional</th>
                        <th style={{ padding: '8px 8px', fontWeight: 800, textAlign: 'center' }}>Função</th>
                        <th style={{ padding: '8px 8px', fontWeight: 800, textAlign: 'center' }}>Emp.</th>
                        <th style={{ padding: '8px 8px', fontWeight: 800, textAlign: 'center', color: '#10b981' }}>Em Dia</th>
                        <th style={{ padding: '8px 8px', fontWeight: 800, textAlign: 'center', color: '#d97706' }}>≤ 30d</th>
                        <th style={{ padding: '8px 8px', fontWeight: 800, textAlign: 'center', color: '#dc2626' }}>Venc.</th>
                        <th style={{ padding: '8px 12px', fontWeight: 800, textAlign: 'right' }}>Saúde</th>
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
                            <td style={{ padding: '9px 12px', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: 26, height: 26, borderRadius: '50%',
                                  backgroundColor: resp.roleLabel === 'Supervisor' ? 'rgba(37,99,235,0.15)' : 'rgba(16,185,129,0.15)',
                                  color: resp.roleLabel === 'Supervisor' ? '#2563eb' : '#059669',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '0.64rem', fontWeight: 800
                                }}>
                                  {resp.fullName.slice(0, 2).toUpperCase()}
                                </div>
                                <span>{resp.fullName}</span>
                              </div>
                            </td>
                            <td style={{ padding: '9px 8px', textAlign: 'center' }}>
                              <span style={{
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '4px',
                                backgroundColor: resp.roleLabel === 'Supervisor' ? 'rgba(37,99,235,0.12)' : 'rgba(16,185,129,0.12)',
                                color: resp.roleLabel === 'Supervisor' ? '#2563eb' : '#059669'
                              }}>
                                {resp.roleLabel}
                              </span>
                            </td>
                            <td style={{ padding: '9px 8px', textAlign: 'center', fontWeight: 800, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                              {resp.empresas}
                            </td>
                            <td style={{ padding: '9px 8px', textAlign: 'center', fontWeight: 900, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>
                              {resp.Vigentes}
                            </td>
                            <td style={{ padding: '9px 8px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                              {resp['A Vencer (≤30d)'] > 0 ? (
                                <span style={{ background: 'rgba(245,158,11,0.16)', color: '#d97706', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '0.72rem' }}>
                                  {resp['A Vencer (≤30d)']}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>0</span>
                              )}
                            </td>
                            <td style={{ padding: '9px 8px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                              {resp.Vencidos > 0 ? (
                                <span style={{ background: 'rgba(220,38,38,0.15)', color: '#dc2626', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '0.72rem' }}>
                                  {resp.Vencidos}
                                </span>
                              ) : (
                                <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.72rem' }}>✓ 0</span>
                              )}
                            </td>
                            <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                              <span style={{
                                fontSize: '0.72rem',
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

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 14px',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--background)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)'
                }}>
                  <span>Total Coberto: <strong style={{ color: 'var(--text-primary)' }}>{filteredCompanies.length} empresas</strong></span>
                  <span>Profissionais na Carteira: <strong style={{ color: 'var(--primary)' }}>{teamChartData.length}</strong></span>
                </div>
              </div>

              {/* CARD DIREITA: Agendamentos dos Próximos 7 Dias */}
              <div className="tv2-chart-card card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', padding: 0 }}>
                <div className="tv2-chart-head" style={{ justifyContent: 'space-between', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CalendarDays size={17} className="text-emerald" />
                    <span style={{ fontSize: '0.86rem', fontWeight: 800 }}>Agendamentos dos Próximos 7 Dias</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '2px 8px', borderRadius: '10px' }}>
                    {upcomingScheduledItems.length} agendados
                  </span>
                </div>

                <div style={{ flex: 1, minHeight: 0, padding: '10px 12px', overflowY: 'auto' }}>
                  {upcomingScheduledItems.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '4rem 1rem' }}>
                      <CheckCircle2 size={40} style={{ color: '#10b981', margin: '0 auto 8px auto' }} />
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                        Nenhum agendamento para os próximos 7 dias!
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        A agenda da equipe técnica está livre para novos treinamentos e visitas.
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {upcomingScheduledItems.map((event) => {
                        return (
                          <div
                            key={event.id}
                            onClick={() => event.companyId && navigate(`/company/${event.companyId}`)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '9px 12px',
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
                                width: 52,
                                textAlign: 'center',
                                padding: '4px 0',
                                borderRadius: '6px',
                                backgroundColor: event.isToday ? '#ef4444' : (event.isTomorrow ? '#ea580c' : 'var(--primary-light)'),
                                color: event.isToday || event.isTomorrow ? '#fff' : 'var(--primary)',
                                fontWeight: 800,
                                flexShrink: 0
                              }}>
                                <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', lineHeight: 1 }}>
                                  {event.isToday ? 'HOJE' : (event.isTomorrow ? 'AMANHÃ' : formatDateBR(event.dateStr, true).slice(0, 5))}
                                </div>
                                <div style={{ fontSize: '0.72rem', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
                                  {event.time.slice(0, 5)}
                                </div>
                              </div>

                              {/* Título, Empresa e Instrutor */}
                              <div style={{ overflow: 'hidden', minWidth: 0 }}>
                                <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {event.title}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.66rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{event.companyName}</span>
                                  <span>·</span>
                                  <span>Instrutor/Téc: <strong style={{ color: 'var(--text-primary)' }}>{event.responsible}</strong></span>
                                </div>
                              </div>
                            </div>

                            {/* Badges de Status & Categoria */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                              <span style={{
                                fontSize: '0.6rem',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: event.category === 'Treinamento' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                color: event.category === 'Treinamento' ? '#2563eb' : '#059669',
                                textTransform: 'uppercase'
                              }}>
                                {event.category}
                              </span>
                              <span style={{
                                fontSize: '0.6rem',
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

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 14px',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--background)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)'
                }}>
                  <span>Janela: <strong style={{ color: 'var(--text-primary)' }}>{formatDateBR(today)} até {formatDateBR(in7Days)}</strong></span>
                  <span>Eventos Programados: <strong style={{ color: '#10b981' }}>{upcomingScheduledItems.length}</strong></span>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default SstTvControlCenterPage;