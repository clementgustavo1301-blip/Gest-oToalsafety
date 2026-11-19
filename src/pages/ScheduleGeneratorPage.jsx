import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Calendar, CalendarRange, Building2, ShieldCheck, UserCheck, Filter, Search,
  RotateCcw, Download, FileText, Sparkles, Upload, Plus, Trash2, Edit3,
  CheckCircle2, AlertTriangle, Clock, Layers, Table as TableIcon, BarChart3,
  Save, ArrowRight, Loader2, CheckSquare, Square, Briefcase
} from 'lucide-react';
import {
  getGroups, getCompanies, getAllDeliverablesSummary, getProfiles,
  addGroup, addCompany, addDeliverable, updateDeliverable, resolveCompaniesWithHeritage
} from '../services/storageService';
import { extractTextFromPDF } from '../utils/pdfParser';
import { logoBase64 } from '../assets/logoBase64.js';
import EditDeliverableModal from '../components/EditDeliverableModal';
import {
  isPcaPprAet, isPendingDeliverable, isDelivered, isItemExpired,
  isItemExpiring30, isItemExpiring60, getEffectiveValidityDate,
  getDeliverableTimingInfo, parseSafeDate, isProgram
} from '../utils/deliverableTiming';

const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
const normalizeText = (v) => String(v || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const PHASE_LABELS = {
  1: 'Fase 1 — Implantação & Diagnóstico',
  2: 'Fase 2 — Execução & Programas/Laudos',
  3: 'Fase 3 — Monitoramento & Treinamentos',
};

const KICKOFF_CATALOG = [
  { id: 'pgr', title: 'PGR', label: 'PGR (NR-01)', type: 'programa', phase: 1, durationDays: 25, defaultStatus: 'pendente', description: 'Programa de Gerenciamento de Riscos (NR-1)', keywords: ['pgr', 'gerenciamento de risco'] },
  { id: 'pcmso', title: 'PCMSO', label: 'PCMSO (NR-07)', type: 'programa', phase: 1, durationDays: 20, defaultStatus: 'pendente', description: 'Programa de Controle Médico de Saúde Ocupacional (NR-7)', keywords: ['pcmso', 'controle medico', 'controle médico'] },
  { id: 'ltcat', title: 'LTCAT', label: 'LTCAT', type: 'laudo', phase: 2, durationDays: 25, defaultStatus: 'pendente', description: 'Laudo Técnico das Condições Ambientais de Trabalho', keywords: ['ltcat', 'condicoes ambientais', 'condições ambientais'] },
  { id: 'li', title: 'LI', label: 'Laudo de Insalubridade (LI)', type: 'laudo', phase: 2, durationDays: 20, defaultStatus: 'pendente', description: 'Laudo de Insalubridade (NR-15)', keywords: ['insalubridade', 'ltip', 'nr-15', 'nr 15'] },
  { id: 'lp', title: 'LP', label: 'Laudo de Periculosidade (LP)', type: 'laudo', phase: 2, durationDays: 15, defaultStatus: 'pendente', description: 'Laudo de Periculosidade (NR-16)', keywords: ['periculosidade', 'nr-16', 'nr 16'] },
  { id: 'psicossocial', title: 'Mapeamento Psicossocial', label: 'Mapeamento Psicossocial', type: 'laudo', phase: 1, durationDays: 15, defaultStatus: 'pendente', description: 'Avaliação e Mapeamento de Fatores Psicossociais', keywords: ['psicossocial', 'psicossociais'] },
  { id: 'analitico', title: 'Relatório Analítico do PCMSO', label: 'Relatório Analítico PCMSO', type: 'laudo', phase: 3, durationDays: 15, defaultStatus: 'pendente', description: 'Relatório Analítico Anual do PCMSO', keywords: ['analitico', 'analítico'] },
  { id: 'os', title: 'Ordem de Serviço', label: 'Ordem de Serviço (NR-01)', type: 'documento', phase: 1, durationDays: 10, defaultStatus: 'pendente', description: 'Ordens de Serviço de Segurança e Medicina do Trabalho', keywords: ['ordem de servico', 'ordem de serviço', 'ordens de servico'] },
  { id: 'treinamentos_nr', title: 'Treinamentos NRs', label: 'Treinamentos NRs', type: 'treinamento', phase: 3, durationDays: 20, defaultStatus: 'pendente', description: 'Treinamentos normativos aplicáveis (NR-5, NR-6, NR-10, NR-12, NR-35)', keywords: ['treinamento', 'capacitacao', 'capacitação', 'nr-35', 'nr-10', 'nr-12'] },
  { id: 'visitas', title: 'Visitas Técnicas', label: 'Visitas Técnicas Periódicas', type: 'visita_tecnica', phase: 3, durationDays: 15, defaultStatus: 'pendente', description: 'Visitas técnicas periódicas e inspeções de segurança', keywords: ['visita tecnica', 'visita técnica', 'inspecao', 'inspeção'] },
  { id: 'cipa', title: 'Gestão de CIPA', label: 'Gestão de CIPA (NR-05)', type: 'documento', phase: 2, durationDays: 15, defaultStatus: 'pendente', description: 'Constituição, acompanhamento e treinamento da CIPA (NR-5)', keywords: ['cipa', 'nr-05', 'nr-5', 'cipamin'] },
  { id: 'epi', title: 'Gestão de EPI', label: 'Gestão de EPI (NR-06)', type: 'documento', phase: 2, durationDays: 10, defaultStatus: 'pendente', description: 'Controle de entrega, validade e CA dos EPIs (NR-6)', keywords: ['epi', 'nr-06', 'nr-6'] },
  { id: 'esocial', title: 'eSocial S-2240', label: 'eSocial SST (S-2240)', type: 'documento', phase: 2, durationDays: 15, defaultStatus: 'pendente', description: 'Envio mensal de eventos SST ao eSocial (S-2210, S-2220, S-2240)', keywords: ['esocial', 's-2240', 's2240', '2240'] },
  { id: 'pca', title: 'PCA', label: 'PCA (Não Se Aplica)', type: 'programa', phase: 2, durationDays: 10, defaultStatus: 'nao_se_aplica', description: 'Programa de Conservação Auditiva', keywords: ['pca', 'conservacao auditiva', 'conservação auditiva'] },
  { id: 'ppr', title: 'PPR', label: 'PPR (Não Se Aplica)', type: 'programa', phase: 2, durationDays: 10, defaultStatus: 'nao_se_aplica', description: 'Programa de Proteção Respiratória', keywords: ['ppr', 'protecao respiratoria', 'proteção respiratória'] },
  { id: 'aet', title: 'AET', label: 'AET (Não Se Aplica)', type: 'laudo', phase: 2, durationDays: 15, defaultStatus: 'nao_se_aplica', description: 'Análise Ergonômica do Trabalho (NR-17)', keywords: ['aet', 'ergonomica', 'ergonômica', 'nr-17'] },
];

const DEFAULT_TOTALSAFETY_IDS = ['pgr', 'pcmso', 'ltcat', 'li', 'lp', 'psicossocial', 'analitico', 'os', 'treinamentos_nr', 'visitas', 'cipa', 'epi', 'pca', 'ppr', 'aet'];

const TYPE_OPTIONS = [
  { value: 'programa', label: 'Programa' },
  { value: 'laudo', label: 'Laudo' },
  { value: 'documento', label: 'Documento' },
  { value: 'treinamento', label: 'Treinamento' },
  { value: 'visita_tecnica', label: 'Visita Técnica' },
  { value: 'contrato', label: 'Contrato' },
];

const STATUS_STYLE = {
  entregue: { label: 'Entregue / Vigente', color: '#15803d', bg: '#dcfce7', border: '#86efac', bar: '#10b981' },
  vencido: { label: 'Vencido', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', bar: '#dc2626' },
  expiring30: { label: 'A Vencer (≤30d)', color: '#c2410c', bg: '#ffedd5', border: '#fdba74', bar: '#ea580c' },
  expiring60: { label: 'A Vencer (≤60d)', color: '#b45309', bg: '#fef3c7', border: '#fde68a', bar: '#f59e0b' },
  em_elaboracao: { label: 'Em Elaboração', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', bar: '#2563eb' },
  agendado: { label: 'Agendado', color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4', bar: '#0d9488' },
  pendente: { label: 'Pendente', color: '#b45309', bg: '#fef3c7', border: '#fde68a', bar: '#d97706' },
  adiado: { label: 'Adiado', color: '#b45309', bg: '#fef3c7', border: '#fde68a', bar: '#f59e0b' },
  cancelado: { label: 'Cancelado', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1', bar: '#94a3b8' },
  nao_se_aplica: { label: 'Não Se Aplica', color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0', bar: '#94a3b8' },
};

function getNextMondayStr() {
  const today = new Date();
  const day = today.getDay();
  const daysUntilMonday = day === 0 ? 1 : (8 - day);
  const next = new Date(today);
  next.setDate(today.getDate() + daysUntilMonday);
  return next.toISOString().split('T')[0];
}

function addBusinessDays(startStr, numDays) {
  const d = parseSafeDate(startStr) || new Date();
  const result = new Date(d.getTime());
  let added = 0;
  const target = Math.max(1, parseInt(numDays, 10) || 1);
  while (added < target) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

function formatDateBR(val) {
  if (!val) return '—';
  const d = parseSafeDate(val);
  if (!d) return '—';
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatCNPJ(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function drawPdfLogo(doc, x, y, maxW, maxH) {
  if (!logoBase64) return;
  try {
    const props = doc.getImageProperties(logoBase64);
    const ratio = props.width / props.height;
    let w = maxW;
    let h = w / ratio;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }
    doc.addImage(logoBase64, 'PNG', x + (maxW - w) / 2, y + (maxH - h) / 2, w, h, undefined, 'FAST');
  } catch {
    // Logo optional
  }
}

function classifyOverviewItem(d, today) {
  if (d.status === 'cancelado') return { key: 'cancelado', ...STATUS_STYLE.cancelado };
  if (d.status === 'nao_se_aplica' || (isPcaPprAet(d) && !isDelivered(d))) {
    return { key: 'nao_se_aplica', ...STATUS_STYLE.nao_se_aplica };
  }
  const info = getDeliverableTimingInfo(d, today);
  return { key: info.statusKey, ...(STATUS_STYLE[info.statusKey] || STATUS_STYLE.pendente), label: info.label };
}

function analyzeContractLocally(text, fallbackStart) {
  const norm = normalizeText(text);
  const items = [];
  const seenTitles = new Set();

  KICKOFF_CATALOG.forEach((cat) => {
    const matched = cat.keywords.some(kw => norm.includes(normalizeText(kw)));
    if (matched && !seenTitles.has(cat.title)) {
      seenTitles.add(cat.title);
      items.push({
        uid: `${cat.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        catalogId: cat.id,
        title: cat.title,
        type: cat.type,
        phase: cat.phase,
        durationDays: cat.durationDays,
        status: isPcaPprAet({ title: cat.title, type: cat.type }) ? 'nao_se_aplica' : cat.defaultStatus,
        description: cat.description,
      });
    }
  });

  if (items.length === 0) {
    DEFAULT_TOTALSAFETY_IDS.forEach((cid) => {
      const cat = KICKOFF_CATALOG.find(x => x.id === cid);
      if (cat) {
        items.push({
          uid: `${cat.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          catalogId: cat.id,
          title: cat.title,
          type: cat.type,
          phase: cat.phase,
          durationDays: cat.durationDays,
          status: cat.defaultStatus,
          description: cat.description,
        });
      }
    });
  }

  // Try extracting client name & duration
  let clientName = '';
  const nameMatch = text.match(/(?:CONTRATANTE|RAZ[ÃA]O SOCIAL|EMPRESA)\s*[:\-–]\s*([^\n\r,;]{4,80})/i);
  if (nameMatch) clientName = nameMatch[1].trim();

  let durationMonths = 12;
  const durMatch = text.match(/(\d{1,2})\s*(?:meses|m[êe]s)/i);
  if (durMatch) {
    const n = parseInt(durMatch[1], 10);
    if (n >= 1 && n <= 60) durationMonths = n;
  }

  return {
    clientName,
    durationMonths,
    startDate: fallbackStart,
    items,
  };
}

function buildStaggeredItems(rawItems, startDateStr) {
  const phaseStart = { 1: new Date((startDateStr || getNextMondayStr()) + 'T00:00:00') };
  const sorted = [...rawItems].sort((a, b) => (a.phase || 1) - (b.phase || 1));

  let phase1End = new Date(phaseStart[1]);
  let phase2End = new Date(phaseStart[1]);

  sorted.forEach(item => {
    if ((item.phase || 1) === 1) {
      const s = item.manualStartDate ? new Date(item.manualStartDate + 'T00:00:00') : phaseStart[1];
      const e = addBusinessDays(s.toISOString().split('T')[0], item.durationDays || 15);
      if (e > phase1End) phase1End = e;
    }
  });

  phaseStart[2] = new Date(phase1End);
  phaseStart[2].setDate(phaseStart[2].getDate() + 5);

  sorted.forEach(item => {
    if ((item.phase || 1) === 2) {
      const s = item.manualStartDate ? new Date(item.manualStartDate + 'T00:00:00') : phaseStart[2];
      const e = addBusinessDays(s.toISOString().split('T')[0], item.durationDays || 15);
      if (e > phase2End) phase2End = e;
    }
  });

  phaseStart[3] = new Date(phase2End > phase1End ? phase2End : phase1End);
  phaseStart[3].setDate(phaseStart[3].getDate() + 5);

  const cursors = {
    1: new Date(phaseStart[1]),
    2: new Date(phaseStart[2]),
    3: new Date(phaseStart[3]),
  };

  return sorted.map(item => {
    const ph = item.phase || 1;
    let startObj;
    if (item.manualStartDate) {
      startObj = new Date(item.manualStartDate + 'T00:00:00');
    } else {
      startObj = new Date(cursors[ph]);
      const step = Math.max(3, Math.floor((item.durationDays || 10) * 0.25));
      cursors[ph] = addBusinessDays(cursors[ph].toISOString().split('T')[0], step);
    }
    const startISO = startObj.toISOString().split('T')[0];
    const endObj = addBusinessDays(startISO, item.durationDays || 10);
    const endISO = endObj.toISOString().split('T')[0];
    const pcaPprAet = isPcaPprAet({ title: item.title, type: item.type });

    return {
      ...item,
      effectiveStatus: pcaPprAet && item.status === 'pendente' ? 'nao_se_aplica' : (item.status || 'pendente'),
      computedStartDate: startISO,
      computedEndDate: endISO,
      startObj,
      endObj,
    };
  });
}

const ScheduleGeneratorPage = () => {
  const navigate = useNavigate();

  // Main Tabs: 'overview' (Cronograma Geral SST) | 'kickoff' (Planejador & Gerador Kickoff)
  const [activeTab, setActiveTab] = useState('overview');

  // Shared Master Data
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [profiles, setProfiles] = useState([]);

  // === ABA 1: CRONOGRAMA GERAL SST ===
  const currentYear = new Date().getFullYear();
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterResponsible, setFilterResponsible] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [searchTerm, setSearchTerm] = useState('');
  const [overviewMode, setOverviewMode] = useState('gantt'); // 'gantt' | 'table'
  const [editingDeliverable, setEditingDeliverable] = useState(null);

  // === ABA 2: PLANEJADOR & GERADOR KICKOFF ===
  const [companyMode, setCompanyMode] = useState('existing'); // 'existing' | 'new'
  const [selectedExistingCompanyId, setSelectedExistingCompanyId] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyCnpj, setNewCompanyCnpj] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [kickoffSupervisor, setKickoffSupervisor] = useState('');
  const [kickoffTecnico, setKickoffTecnico] = useState('');

  const [kickoffStartDate, setKickoffStartDate] = useState(getNextMondayStr);
  const [kickoffDurationMonths, setKickoffDurationMonths] = useState(12);
  const [ganttGranularity, setGanttGranularity] = useState('months'); // 'months' | 'weeks'
  const [kickoffItems, setKickoffItems] = useState(() =>
    DEFAULT_TOTALSAFETY_IDS.map((cid, idx) => {
      const cat = KICKOFF_CATALOG.find(c => c.id === cid);
      return {
        uid: `init_${cid}_${idx}`,
        catalogId: cat.id,
        title: cat.title,
        type: cat.type,
        phase: cat.phase,
        durationDays: cat.durationDays,
        status: cat.defaultStatus,
        manualStartDate: '',
        description: cat.description,
      };
    })
  );

  const [customTitle, setCustomTitle] = useState('');
  const [customType, setCustomType] = useState('documento');
  const [customPhase, setCustomPhase] = useState(2);
  const [customDuration, setCustomDuration] = useState(15);

  const [pdfFile, setPdfFile] = useState(null);
  const [analyzingPdf, setAnalyzingPdf] = useState(false);
  const [analysisFeedback, setAnalysisFeedback] = useState('');
  const [savingKickoff, setSavingKickoff] = useState(false);
  const [saveSuccessInfo, setSaveSuccessInfo] = useState(null);

  const loadMasterData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const [grps, comps, delivs, profs] = await Promise.all([
        getGroups(),
        getCompanies(),
        getAllDeliverablesSummary(),
        getProfiles(),
      ]);
      const resolvedComps = resolveCompaniesWithHeritage(comps || [], grps || []);
      setGroups(grps || []);
      setCompanies(resolvedComps);
      setDeliverables(delivs || []);
      setProfiles(profs || []);
      if (grps && grps.length > 0 && !selectedGroupId) {
        setSelectedGroupId(grps[0].id);
      }
      if (resolvedComps.length > 0 && !selectedExistingCompanyId) {
        setSelectedExistingCompanyId(resolvedComps[0].id);
      }
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [selectedGroupId, selectedExistingCompanyId]);

  useEffect(() => {
    loadMasterData(true);
  }, []);

  // Sync Supervisor / Tecnico when existing company or new company's group changes
  useEffect(() => {
    if (companyMode === 'existing') {
      const comp = companies.find(c => c.id === selectedExistingCompanyId);
      if (comp) {
        setKickoffSupervisor(comp.effSupervisor !== 'Não definido' ? comp.effSupervisor : '');
        setKickoffTecnico(comp.effTecnico !== 'Não definido' ? comp.effTecnico : '');
      }
    } else if (!isCreatingGroup && selectedGroupId) {
      const grp = groups.find(g => g.id === selectedGroupId);
      if (grp) {
        if (grp.supervisor) setKickoffSupervisor(grp.supervisor);
        if (grp.tecnicoResponsavel) setKickoffTecnico(grp.tecnicoResponsavel);
      }
    }
  }, [companyMode, selectedExistingCompanyId, selectedGroupId, isCreatingGroup, companies, groups]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
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
        const mGrp = filterGroup === 'all' || c.groupId === filterGroup;
        const mResp = filterResponsible === 'all' ||
          normalizeText(c.effSupervisor) === normResp ||
          normalizeText(c.effTecnico) === normResp;
        return mGrp && mResp;
      })
      .sort((a, b) => collator.compare(a.name, b.name));
  }, [companies, filterGroup, filterResponsible]);

  const availableYears = useMemo(() => {
    const years = new Set([currentYear - 1, currentYear, currentYear + 1]);
    deliverables.forEach(d => {
      const em = parseSafeDate(d.dataEmissao || d.dataEnvio || d.dueDate);
      const val = getEffectiveValidityDate(d);
      if (em) years.add(em.getFullYear());
      if (val) years.add(val.getFullYear());
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [deliverables, currentYear]);

  // Enriched & Filtered Overview Deliverables
  const overviewScopeBase = useMemo(() => {
    const normResp = normalizeText(filterResponsible);
    const q = normalizeText(searchTerm);

    return deliverables
      .map(d => {
        const situation = classifyOverviewItem(d, today);
        const emissionDate = parseSafeDate(d.dataEmissao || d.dataEnvio || d.dueDate);
        const validityDate = getEffectiveValidityDate(d);
        const pcaPprAet = isPcaPprAet(d);

        return {
          ...d,
          situation,
          emissionDate,
          validityDate,
          pcaPprAet,
          isPendingItem: isPendingDeliverable(d),
          isExpiredItem: isItemExpired(d, today),
          isExpiringSoon: isItemExpiring30(d, today) || isItemExpiring60(d, today),
        };
      })
      .filter(d => {
        const mGrp = filterGroup === 'all' || d.groupId === filterGroup;
        const mComp = filterCompany === 'all' || d.companyId === filterCompany;
        const mResp = filterResponsible === 'all' ||
          normalizeText(d.supervisor) === normResp ||
          normalizeText(d.tecnicoResponsavel) === normResp;
        const mSearch = !q ||
          normalizeText(d.title).includes(q) ||
          normalizeText(d.companyName).includes(q) ||
          normalizeText(d.groupName).includes(q) ||
          normalizeText(d.supervisor).includes(q) ||
          normalizeText(d.tecnicoResponsavel).includes(q);
        return mGrp && mComp && mResp && mSearch;
      });
  }, [deliverables, filterGroup, filterCompany, filterResponsible, searchTerm, today]);

  const overviewStats = useMemo(() => {
    const total = overviewScopeBase.length;
    const delivered = overviewScopeBase.filter(d => isDelivered(d) && !d.isExpiredItem).length;
    const expiringSoon = overviewScopeBase.filter(d => d.isExpiringSoon && !d.isExpiredItem).length;
    const expired = overviewScopeBase.filter(d => d.isExpiredItem).length;
    const pending = overviewScopeBase.filter(d => d.isPendingItem && !d.isExpiredItem).length;
    const notApplicable = overviewScopeBase.filter(d => d.situation.key === 'nao_se_aplica' || d.pcaPprAet).length;
    return { total, delivered, expiringSoon, expired, pending, notApplicable };
  }, [overviewScopeBase]);

  const overviewFiltered = useMemo(() => {
    return overviewScopeBase
      .filter(d => {
        const mType = filterType === 'all' || d.type === filterType;
        let mStatus = true;
        if (filterStatus === 'vencido') mStatus = d.isExpiredItem;
        else if (filterStatus === 'a_vencer') mStatus = d.isExpiringSoon && !d.isExpiredItem;
        else if (filterStatus === 'entregue') mStatus = isDelivered(d) && !d.isExpiredItem;
        else if (filterStatus === 'pendente') mStatus = d.isPendingItem && !d.isExpiredItem;
        else if (filterStatus !== 'all') mStatus = d.situation.key === filterStatus;

        let mYear = true;
        if (filterYear !== 'all') {
          const y = parseInt(filterYear, 10);
          const emY = d.emissionDate?.getFullYear();
          const valY = d.validityDate?.getFullYear();
          if (emY && valY) {
            mYear = y >= Math.min(emY, valY) && y <= Math.max(emY, valY);
          } else if (emY) {
            mYear = emY === y;
          } else if (valY) {
            mYear = valY === y;
          }
        }
        return mType && mStatus && mYear;
      })
      .sort((a, b) => {
        // Priority: Vencido -> A Vencer -> Pendente -> Entregue -> Não Se Aplica
        const rank = (item) => {
          if (item.isExpiredItem) return 0;
          if (item.isExpiringSoon) return 1;
          if (item.isPendingItem) return 2;
          if (isDelivered(item)) return 3;
          return 4;
        };
        const rDiff = rank(a) - rank(b);
        if (rDiff !== 0) return rDiff;
        const cDiff = collator.compare(a.companyName, b.companyName);
        if (cDiff !== 0) return cDiff;
        return collator.compare(a.title, b.title);
      });
  }, [overviewScopeBase, filterType, filterStatus, filterYear]);

  const hasOverviewFilters = Boolean(
    filterGroup !== 'all' || filterCompany !== 'all' || filterResponsible !== 'all' ||
    filterType !== 'all' || filterStatus !== 'all' || searchTerm.trim() !== ''
  );

  const handleClearOverviewFilters = () => {
    setFilterGroup('all');
    setFilterCompany('all');
    setFilterResponsible('all');
    setFilterType('all');
    setFilterStatus('all');
    setFilterYear(String(currentYear));
    setSearchTerm('');
  };

  // Helper to compute annual bar position in Gantt Overview
  const targetYearNum = filterYear === 'all' ? currentYear : parseInt(filterYear, 10);
  const yearStartMs = new Date(targetYearNum, 0, 1).getTime();
  const yearEndMs = new Date(targetYearNum, 11, 31, 23, 59, 59).getTime();
  const yearSpanMs = Math.max(1, yearEndMs - yearStartMs);
  const todayMarkerPct = (today.getFullYear() === targetYearNum)
    ? Math.max(0, Math.min(100, ((today.getTime() - yearStartMs) / yearSpanMs) * 100))
    : null;

  const computeAnnualBar = (d) => {
    const startRef = d.emissionDate || d.validityDate;
    const endRef = d.validityDate || d.emissionDate;
    if (!startRef && !endRef) return null;

    let sMs = startRef.getTime();
    let eMs = endRef.getTime();
    if (eMs < sMs) eMs = sMs;
    if (eMs === sMs) eMs = sMs + 18 * 24 * 60 * 60 * 1000; // minimum visual span

    if (eMs < yearStartMs || sMs > yearEndMs) return null;

    const clampedStart = Math.max(yearStartMs, sMs);
    const clampedEnd = Math.min(yearEndMs, eMs);
    const left = ((clampedStart - yearStartMs) / yearSpanMs) * 100;
    const width = Math.max(3.5, ((clampedEnd - clampedStart) / yearSpanMs) * 100);
    return { left, width: Math.min(100 - left, width) };
  };

  const handleLoadCompanyIntoKickoff = (companyId) => {
    const comp = companies.find(c => c.id === companyId);
    if (!comp) return;
    setCompanyMode('existing');
    setSelectedExistingCompanyId(comp.id);
    setKickoffSupervisor(comp.effSupervisor !== 'Não definido' ? comp.effSupervisor : '');
    setKickoffTecnico(comp.effTecnico !== 'Não definido' ? comp.effTecnico : '');

    const compDelivs = deliverables.filter(d => d.companyId === comp.id);
    if (compDelivs.length > 0) {
      setKickoffItems(
        compDelivs.map((d, idx) => {
          const catMatch = KICKOFF_CATALOG.find(c => normalizeText(c.title) === normalizeText(d.title));
          const pcaPprAet = isPcaPprAet(d);
          return {
            uid: `comp_${d.id}_${idx}`,
            catalogId: catMatch?.id || null,
            title: d.title,
            type: d.type || catMatch?.type || 'documento',
            phase: catMatch?.phase || (d.type === 'programa' ? 1 : d.type === 'treinamento' || d.type === 'visita_tecnica' ? 3 : 2),
            durationDays: catMatch?.durationDays || 15,
            status: pcaPprAet && d.status === 'pendente' ? 'nao_se_aplica' : (d.status || 'pendente'),
            manualStartDate: d.dataEmissao || d.dataEnvio || d.dueDate || '',
            description: d.description || catMatch?.description || '',
          };
        })
      );
    }
    setActiveTab('kickoff');
    setSaveSuccessInfo(null);
  };

  // === EXPORTAR PDF CRONOGRAMA GERAL (ABA 1) ===
  const handleExportOverviewPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, 8, pageWidth - margin * 2, 20, 1.5, 1.5, 'FD');
    drawPdfLogo(doc, margin + 2, 10, 38, 16);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 138);
    doc.text(`CRONOGRAMA GERAL SST — ENTREGÁVEIS E PRAZOS (${filterYear === 'all' ? 'TODOS OS ANOS' : filterYear})`, margin + 44, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const activeCompanyLabel = filterCompany !== 'all' ? (companies.find(c => c.id === filterCompany)?.name || '') : 'Todas as Empresas';
    const activeGroupLabel = filterGroup !== 'all' ? (groups.find(g => g.id === filterGroup)?.name || '') : 'Todos os Grupos';
    const activeRespLabel = filterResponsible !== 'all' ? filterResponsible : 'Todos os Responsáveis';
    doc.text(`Grupo: ${activeGroupLabel}  •  Empresa: ${activeCompanyLabel}  •  Responsável: ${activeRespLabel}`, margin + 44, 20);
    doc.text(`Total: ${overviewFiltered.length}  •  Entregues: ${overviewStats.delivered}  •  Vencidos: ${overviewStats.expired}  •  Pendentes: ${overviewStats.pending}  •  Não Se Aplica: ${overviewStats.notApplicable}`, margin + 44, 24.5);

    const rows = overviewFiltered.map(d => [
      d.companyName || 'N/A',
      d.groupName || 'Sem Grupo',
      d.title,
      d.supervisor || 'Não definido',
      d.tecnicoResponsavel || 'Não definido',
      d.emissionDate ? formatDateBR(d.emissionDate) : '—',
      d.pcaPprAet ? 'Não Se Aplica' : (d.validityDate ? formatDateBR(d.validityDate) : 'Sem validade'),
      d.situation.label,
    ]);

    autoTable(doc, {
      startY: 32,
      margin: { left: margin, right: margin, bottom: 12 },
      head: [['Empresa', 'Grupo', 'Entregável', 'Supervisor', 'Resp. Técnico', 'Emissão', 'Validade', 'Status']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [27, 122, 61], textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2, valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 46 },
        1: { cellWidth: 34 },
        2: { cellWidth: 40, fontStyle: 'bold' },
        3: { cellWidth: 32 },
        4: { cellWidth: 32 },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 23, halign: 'center' },
        7: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
      },
      didDrawPage: () => {
        const pH = doc.internal.pageSize.getHeight();
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(`TotalSafety / EcoClinic • Emitido em ${new Date().toLocaleDateString('pt-BR')} • Página ${doc.internal.getNumberOfPages()}`, pageWidth / 2, pH - 5, { align: 'center' });
      }
    });

    doc.save(`cronograma-geral-sst-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // === ABA 2: LÓGICA DO KICKOFF ===
  const positionedKickoffItems = useMemo(
    () => buildStaggeredItems(kickoffItems, kickoffStartDate),
    [kickoffItems, kickoffStartDate]
  );

  const kickoffTimeline = useMemo(() => {
    const startObj = new Date((kickoffStartDate || getNextMondayStr()) + 'T00:00:00');
    const months = Math.max(1, Math.min(60, parseInt(kickoffDurationMonths, 10) || 12));
    const tStart = new Date(startObj.getFullYear(), startObj.getMonth(), 1);
    const tEnd = new Date(startObj.getFullYear(), startObj.getMonth() + months, 0);
    const totalMs = Math.max(1, tEnd.getTime() - tStart.getTime());

    const cols = [];
    if (ganttGranularity === 'weeks') {
      const totalWeeks = Math.max(4, Math.min(52, Math.ceil((tEnd.getTime() - tStart.getTime()) / (7 * 24 * 60 * 60 * 1000))));
      for (let i = 0; i < totalWeeks; i++) {
        cols.push({ key: `w${i}`, label: `S${i + 1}` });
      }
    } else {
      const cur = new Date(tStart);
      while (cur <= tEnd) {
        cols.push({
          key: `${cur.getFullYear()}-${cur.getMonth()}`,
          label: cur.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '').toUpperCase(),
        });
        cur.setMonth(cur.getMonth() + 1);
      }
    }

    return { tStart, tEnd, totalMs, cols };
  }, [kickoffStartDate, kickoffDurationMonths, ganttGranularity]);

  const toggleCatalogItem = (cat) => {
    const exists = kickoffItems.some(it => it.catalogId === cat.id || normalizeText(it.title) === normalizeText(cat.title));
    if (exists) {
      setKickoffItems(prev => prev.filter(it => it.catalogId !== cat.id && normalizeText(it.title) !== normalizeText(cat.title)));
    } else {
      setKickoffItems(prev => [
        ...prev,
        {
          uid: `${cat.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          catalogId: cat.id,
          title: cat.title,
          type: cat.type,
          phase: cat.phase,
          durationDays: cat.durationDays,
          status: cat.defaultStatus,
          manualStartDate: '',
          description: cat.description,
        }
      ]);
    }
  };

  const handleSelectDefaultScope = () => {
    setKickoffItems(
      DEFAULT_TOTALSAFETY_IDS.map((cid, idx) => {
        const cat = KICKOFF_CATALOG.find(c => c.id === cid);
        return {
          uid: `def_${cid}_${Date.now()}_${idx}`,
          catalogId: cat.id,
          title: cat.title,
          type: cat.type,
          phase: cat.phase,
          durationDays: cat.durationDays,
          status: cat.defaultStatus,
          manualStartDate: '',
          description: cat.description,
        };
      })
    );
  };

  const handleAddCustomKickoffItem = (e) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    const t = customTitle.trim();
    const pcaPprAet = isPcaPprAet({ title: t, type: customType });
    setKickoffItems(prev => [
      ...prev,
      {
        uid: `custom_${Date.now()}`,
        catalogId: null,
        title: t,
        type: customType,
        phase: Number(customPhase) || 2,
        durationDays: Math.max(1, parseInt(customDuration, 10) || 15),
        status: pcaPprAet ? 'nao_se_aplica' : 'pendente',
        manualStartDate: '',
        description: '',
      }
    ]);
    setCustomTitle('');
  };

  const handleUpdateKickoffItem = (uid, field, value) => {
    setKickoffItems(prev => prev.map(item => {
      if (item.uid !== uid) return item;
      const updated = { ...item, [field]: value };
      if (field === 'title' && isPcaPprAet({ title: value, type: updated.type })) {
        updated.status = 'nao_se_aplica';
      }
      if (field === 'status' && isPcaPprAet({ title: updated.title, type: updated.type }) && value === 'pendente') {
        updated.status = 'nao_se_aplica';
      }
      return updated;
    }));
  };

  const handleRemoveKickoffItem = (uid) => {
    setKickoffItems(prev => prev.filter(item => item.uid !== uid));
  };

  const handleAnalyzeContractPdf = async (file) => {
    if (!file) return;
    setPdfFile(file);
    setAnalyzingPdf(true);
    setAnalysisFeedback('Extraindo texto do contrato PDF...');
    try {
      const text = await extractTextFromPDF(file);
      if (!text || text.trim().length < 40) {
        setAnalysisFeedback('Pouco texto extraído do PDF. Aplicando escopo padrão TotalSafety.');
        setAnalyzingPdf(false);
        return;
      }

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      let analyzed = null;

      if (apiKey) {
        setAnalysisFeedback('Analisando cláusulas e entregáveis com IA Gemini...');
        try {
          const prompt = `Você é especialista em SST (Saúde e Segurança do Trabalho). Extraia do contrato abaixo os entregáveis do escopo.
Retorne APENAS JSON válido (sem markdown) no formato:
{
  "clientName": "Nome do Cliente",
  "durationMonths": 12,
  "deliverables": [
    { "title": "PGR", "type": "programa", "phase": 1, "durationDays": 25, "description": "..." }
  ]
}
Tipos válidos: "programa", "laudo", "documento", "treinamento", "visita_tecnica".
Fases válidas: 1 (Implantação), 2 (Execução), 3 (Monitoramento).
TEXTO:
${text.substring(0, 15000)}`;

          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.2 }
            })
          });
          if (res.ok) {
            const json = await res.json();
            let raw = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
            raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.deliverables) && parsed.deliverables.length > 0) {
              analyzed = {
                clientName: parsed.clientName || '',
                durationMonths: Math.max(1, Math.min(60, parseInt(parsed.durationMonths, 10) || 12)),
                items: parsed.deliverables.map((d, idx) => {
                  const title = String(d.title || `Entregável ${idx + 1}`).trim();
                  const type = TYPE_OPTIONS.some(t => t.value === d.type) ? d.type : 'documento';
                  const pcaPprAet = isPcaPprAet({ title, type });
                  return {
                    uid: `ai_${idx}_${Date.now()}`,
                    catalogId: KICKOFF_CATALOG.find(c => normalizeText(c.title) === normalizeText(title))?.id || null,
                    title,
                    type,
                    phase: Math.min(3, Math.max(1, parseInt(d.phase, 10) || 2)),
                    durationDays: Math.max(1, parseInt(d.durationDays, 10) || 15),
                    status: pcaPprAet ? 'nao_se_aplica' : 'pendente',
                    manualStartDate: '',
                    description: d.description || '',
                  };
                })
              };
            }
          }
        } catch (aiErr) {
          console.warn('Fallback para análise local do contrato:', aiErr);
        }
      }

      if (!analyzed) {
        setAnalysisFeedback('Identificando entregáveis SST no texto do contrato...');
        analyzed = analyzeContractLocally(text, kickoffStartDate);
      }

      if (analyzed.clientName && companyMode === 'new' && !newCompanyName.trim()) {
        setNewCompanyName(analyzed.clientName);
      }
      if (analyzed.durationMonths) {
        setKickoffDurationMonths(analyzed.durationMonths);
      }
      if (analyzed.items && analyzed.items.length > 0) {
        setKickoffItems(analyzed.items);
      }
      setAnalysisFeedback(`Contrato analisado! ${analyzed.items.length} entregável(is) identificado(s) (PCA, PPR e AET definidos como Não Se Aplica).`);
    } catch (err) {
      console.error('Erro ao ler PDF do contrato:', err);
      setAnalysisFeedback('Não foi possível extrair texto do PDF. Você pode configurar os entregáveis manualmente abaixo.');
    } finally {
      setAnalyzingPdf(false);
    }
  };

  // === EXPORTAR APRESENTAÇÃO PDF DO KICKOFF (CAPA + GANTT VETORIAL + TABELA) ===
  const handleExportKickoffPdf = () => {
    if (positionedKickoffItems.length === 0) return;

    const selectedComp = companyMode === 'existing' ? companies.find(c => c.id === selectedExistingCompanyId) : null;
    const selectedGrp = companyMode === 'existing'
      ? groups.find(g => g.id === selectedComp?.groupId)
      : (isCreatingGroup ? { name: newGroupName.trim() || 'Novo Grupo' } : groups.find(g => g.id === selectedGroupId));
    const clientLabel = companyMode === 'existing'
      ? (selectedComp?.name || 'Empresa Cliente')
      : (newCompanyName.trim() || 'Nova Empresa Cliente');
    const groupLabel = selectedGrp?.name || 'Sem Grupo';
    const supLabel = kickoffSupervisor || selectedComp?.effSupervisor || 'Não definido';
    const tecLabel = kickoffTecnico || selectedComp?.effTecnico || 'Não definido';

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth(); // 297
    const pageH = doc.internal.pageSize.getHeight(); // 210

    // --- SLIDE 1: CAPA ---
    doc.setFillColor(27, 122, 61);
    doc.rect(0, 0, pageW, pageH, 'F');
    doc.setFillColor(20, 92, 46);
    doc.rect(0, pageH - 22, pageW, 22, 'F');

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageW / 2 - 30, 24, 60, 22, 3, 3, 'F');
    drawPdfLogo(doc, pageW / 2 - 26, 26, 52, 18);

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(pageW / 2 - 40, 56, pageW / 2 + 40, 56);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.text('Cronograma de Entregáveis SST', pageW / 2, 74, { align: 'center' });

    doc.setFontSize(16);
    doc.text(clientLabel, pageW / 2, 92, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Grupo Econômico: ${groupLabel}`, pageW / 2, 104, { align: 'center' });

    // Info Card
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(48, 120, pageW - 96, 46, 3, 3, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Supervisor: ${supLabel}`, 60, 134);
    doc.text(`Responsável Técnico: ${tecLabel}`, pageW / 2 + 5, 134);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Início do Projeto: ${formatDateBR(kickoffStartDate)}`, 60, 146);
    doc.text(`Vigência Estimada: ${kickoffDurationMonths} meses`, pageW / 2 + 5, 146);
    doc.text(`Total de Entregáveis no Escopo: ${positionedKickoffItems.length}`, 60, 157);
    doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')}`, pageW / 2 + 5, 157);

    doc.setTextColor(220, 245, 228);
    doc.setFontSize(9);
    doc.text('Gestão Integrada em Saúde e Segurança do Trabalho — Reunião de Kickoff', pageW / 2, pageH - 9, { align: 'center' });

    // --- SLIDE 2: GANTT VETORIAL ---
    doc.addPage('a4', 'l');
    const margin = 10;
    doc.setFillColor(27, 122, 61);
    doc.rect(0, 0, pageW, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('CRONOGRAMA GANTT DE IMPLANTAÇÃO E ENTREGAS', margin, 11.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`${clientLabel}  •  Sup: ${supLabel}  •  Téc: ${tecLabel}`, pageW - margin, 11.5, { align: 'right' });

    const labelColW = 74;
    const timelineW = pageW - margin * 2 - labelColW;
    const cols = kickoffTimeline.cols;
    const colW = timelineW / Math.max(1, cols.length);
    let y = 24;

    // Header row
    doc.setFillColor(30, 58, 138);
    doc.rect(margin, y, labelColW + timelineW, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('ENTREGÁVEL / FASE', margin + 3, y + 4.8);
    cols.forEach((c, idx) => {
      doc.text(c.label, margin + labelColW + idx * colW + colW / 2, y + 4.8, { align: 'center' });
    });
    y += 7;

    const rowH = Math.min(7.5, Math.max(5.2, (pageH - 46) / Math.max(1, positionedKickoffItems.length + 3)));
    let currentPhase = 0;

    positionedKickoffItems.forEach((item, idx) => {
      if (y + rowH > pageH - 14) {
        doc.addPage('a4', 'l');
        y = 18;
      }

      if (item.phase !== currentPhase) {
        currentPhase = item.phase;
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, labelColW + timelineW, 5.5, 'F');
        doc.setTextColor(30, 58, 138);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.text(PHASE_LABELS[currentPhase] || `Fase ${currentPhase}`, margin + 3, y + 3.9);
        y += 5.5;
      }

      doc.setFillColor(idx % 2 === 0 ? 255 : 249, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 251);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.15);
      doc.rect(margin, y, labelColW + timelineW, rowH, 'FD');

      // Vertical grid
      cols.forEach((_, cIdx) => {
        const gx = margin + labelColW + cIdx * colW;
        doc.line(gx, y, gx, y + rowH);
      });

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      const shortTitle = item.title.length > 34 ? item.title.slice(0, 32) + '…' : item.title;
      doc.text(shortTitle, margin + 2.5, y + rowH / 2 + 1.2);

      // Bar
      const { tStart, totalMs } = kickoffTimeline;
      const startOff = Math.max(0, item.startObj.getTime() - tStart.getTime());
      const endOff = Math.max(startOff + 1, item.endObj.getTime() - tStart.getTime());
      const bx = margin + labelColW + Math.min(1, startOff / totalMs) * timelineW;
      const bw = Math.max(4, Math.min(timelineW - (bx - (margin + labelColW)), ((endOff - startOff) / totalMs) * timelineW));

      const isNA = item.effectiveStatus === 'nao_se_aplica';
      if (isNA) doc.setFillColor(148, 163, 184);
      else if (item.phase === 1) doc.setFillColor(27, 122, 61);
      else if (item.phase === 2) doc.setFillColor(37, 99, 235);
      else doc.setFillColor(217, 119, 6);

      doc.roundedRect(bx, y + 1.2, bw, rowH - 2.4, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(5.5);
      const barTxt = isNA ? 'N/A' : `${item.durationDays}d`;
      if (bw >= 7) {
        doc.text(barTxt, bx + bw / 2, y + rowH / 2 + 1.1, { align: 'center' });
      }

      y += rowH;
    });

    // --- SLIDE 3: TABELA DETALHADA ---
    doc.addPage('a4', 'l');
    doc.setFillColor(27, 122, 61);
    doc.rect(0, 0, pageW, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('DETALHAMENTO DOS ENTREGÁVEIS E RESPONSÁVEIS', margin, 11.5);

    const detailRows = positionedKickoffItems.map((it, i) => [
      String(i + 1),
      it.title,
      TYPE_OPTIONS.find(t => t.value === it.type)?.label || it.type,
      PHASE_LABELS[it.phase] || `Fase ${it.phase}`,
      formatDateBR(it.computedStartDate),
      formatDateBR(it.computedEndDate),
      `${it.durationDays} dias`,
      STATUS_STYLE[it.effectiveStatus]?.label || it.effectiveStatus,
    ]);

    autoTable(doc, {
      startY: 24,
      margin: { left: margin, right: margin, bottom: 12 },
      head: [['#', 'Entregável', 'Tipo', 'Fase', 'Início', 'Prazo Final', 'Duração', 'Status']],
      body: detailRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
      styles: { fontSize: 7.2, cellPadding: 2.2 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 68, fontStyle: 'bold' },
        2: { cellWidth: 28, halign: 'center' },
        3: { cellWidth: 58 },
        4: { cellWidth: 24, halign: 'center' },
        5: { cellWidth: 24, halign: 'center' },
        6: { cellWidth: 20, halign: 'center' },
        7: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
      }
    });

    const safeSlug = normalizeText(clientLabel).replace(/[^a-z0-9]+/g, '-').slice(0, 35) || 'cliente';
    doc.save(`cronograma-kickoff-${safeSlug}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // === SALVAR / SINCRONIZAR CRONOGRAMA NO SISTEMA ===
  const handleSaveKickoffToSystem = async (e) => {
    e.preventDefault();
    if (positionedKickoffItems.length === 0) return;

    if (companyMode === 'existing' && !selectedExistingCompanyId) return;
    if (companyMode === 'new') {
      if (!newCompanyName.trim()) return;
      if (!isCreatingGroup && !selectedGroupId) return;
      if (isCreatingGroup && !newGroupName.trim()) return;
    }

    setSavingKickoff(true);
    setSaveSuccessInfo(null);
    try {
      let targetCompanyId = selectedExistingCompanyId;
      let targetCompanyName = '';

      if (companyMode === 'new') {
        let finalGroupId = selectedGroupId;
        if (isCreatingGroup) {
          const createdGroup = await addGroup({
            name: newGroupName.trim(),
            supervisor: kickoffSupervisor.trim() || null,
            tecnicoResponsavel: kickoffTecnico.trim() || null,
          });
          if (!createdGroup?.id) throw new Error('Falha ao criar grupo econômico.');
          finalGroupId = createdGroup.id;
        }

        const cnpjVal = newCompanyCnpj.trim() || `00.000.000/${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 90 + 10)}`;
        const createdCompany = await addCompany({
          name: newCompanyName.trim(),
          cnpj: cnpjVal,
          contact: '',
          phone: '',
          groupId: finalGroupId,
          supervisor: kickoffSupervisor.trim() || undefined,
          tecnicoResponsavel: kickoffTecnico.trim() || undefined,
        });
        if (!createdCompany?.id) throw new Error('Falha ao criar empresa.');
        targetCompanyId = createdCompany.id;
        targetCompanyName = createdCompany.name;
      } else {
        targetCompanyName = companies.find(c => c.id === targetCompanyId)?.name || 'Empresa';
      }

      let savedCount = 0;
      for (const item of positionedKickoffItems) {
        if (item.title.toUpperCase().includes('2240')) continue; // eSocial S-2240 é controlado no painel da empresa
        const pcaPprAet = isPcaPprAet({ title: item.title, type: item.type });
        const finalStatus = pcaPprAet ? 'nao_se_aplica' : (item.effectiveStatus || 'pendente');

        await addDeliverable({
          companyId: targetCompanyId,
          title: item.title,
          type: item.type,
          status: finalStatus,
          dueDate: item.computedEndDate,
          dataEmissao: item.computedEndDate,
          dataEnvio: item.computedEndDate,
          validityDate: pcaPprAet ? null : undefined,
          description: item.description || null,
        });
        savedCount++;
      }

      await loadMasterData(false);
      setSaveSuccessInfo({
        companyId: targetCompanyId,
        companyName: targetCompanyName,
        count: savedCount,
      });
    } catch (err) {
      console.error('Erro ao salvar cronograma:', err);
      alert('Não foi possível salvar o cronograma no sistema. Verifique os dados e tente novamente.');
    } finally {
      setSavingKickoff(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando módulo de cronograma...</div>;
  }

  return (
    <div style={{ maxWidth: '1320px', margin: '0 auto' }}>
      <header className="header-responsive" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="text-h1">Cronograma SST & Planejamento</h1>
          <p className="text-subtitle">
            Visão cronológica integrada dos entregáveis das empresas e gerador de cronograma Kickoff.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {activeTab === 'overview' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExportOverviewPdf}
              disabled={overviewFiltered.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Download size={16} /> Exportar Cronograma PDF
            </button>
          )}
          {activeTab === 'kickoff' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExportKickoffPdf}
              disabled={positionedKickoffItems.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Download size={16} /> Exportar Apresentação PDF
            </button>
          )}
        </div>
      </header>

      {/* Main Tabs Switcher */}
      <div className="tabs-container" style={{ marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1.25rem', borderRadius: 'var(--radius-md)',
            fontWeight: activeTab === 'overview' ? '600' : '500',
            fontSize: '0.875rem', transition: 'var(--transition)',
            backgroundColor: activeTab === 'overview' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'overview' ? 'white' : 'var(--text-secondary)',
          }}
        >
          <CalendarRange size={16} /> Cronograma Geral SST ({overviewFiltered.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('kickoff')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1.25rem', borderRadius: 'var(--radius-md)',
            fontWeight: activeTab === 'kickoff' ? '600' : '500',
            fontSize: '0.875rem', transition: 'var(--transition)',
            backgroundColor: activeTab === 'kickoff' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'kickoff' ? 'white' : 'var(--text-secondary)',
          }}
        >
          <Sparkles size={16} /> Planejador & Gerador Kickoff
        </button>
      </div>

      {/* ===================================================================== */}
      {/* ABA 1: CRONOGRAMA GERAL SST (EMPRESAS CADASTRADAS)                    */}
      {/* ===================================================================== */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '0.85rem' }}>
            {[
              { label: 'Total Filtrado', value: overviewStats.total, color: 'var(--text-primary)', bg: 'var(--background)', icon: <Layers size={18} /> },
              { label: 'Entregues / Vigentes', value: overviewStats.delivered, color: '#15803d', bg: '#dcfce7', icon: <CheckCircle2 size={18} /> },
              { label: 'A Vencer (≤60d)', value: overviewStats.expiringSoon, color: '#c2410c', bg: '#ffedd5', icon: <Clock size={18} /> },
              { label: 'Vencidos', value: overviewStats.expired, color: '#dc2626', bg: '#fee2e2', icon: <AlertTriangle size={18} /> },
              { label: 'Pendentes', value: overviewStats.pending, color: '#b45309', bg: '#fef3c7', icon: <Clock size={18} /> },
              { label: 'Não Se Aplica (PCA/PPR/AET)', value: overviewStats.notApplicable, color: '#64748b', bg: '#f1f5f9', icon: <FileText size={18} /> },
            ].map((kpi, idx) => (
              <div key={idx} className="card" style={{ padding: '0.95rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', backgroundColor: kpi.bg, color: kpi.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {kpi.icon}
                </div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: kpi.color, lineHeight: 1.1 }}>{kpi.value}</div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', fontWeight: '500', marginTop: '2px' }}>{kpi.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Barra de Filtros */}
          <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '220px', backgroundColor: 'var(--background)', padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <Search size={16} color="var(--text-secondary)" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar entregável, empresa, grupo ou responsável..."
                  style={{ flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: '0.85rem', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setOverviewMode('gantt')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.85rem',
                    fontSize: '0.8rem', fontWeight: '600', border: 'none', cursor: 'pointer',
                    backgroundColor: overviewMode === 'gantt' ? 'var(--primary)' : 'transparent',
                    color: overviewMode === 'gantt' ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  <BarChart3 size={15} /> Gantt Anual
                </button>
                <button
                  type="button"
                  onClick={() => setOverviewMode('table')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.85rem',
                    fontSize: '0.8rem', fontWeight: '600', border: 'none', borderLeft: '1px solid var(--border)', cursor: 'pointer',
                    backgroundColor: overviewMode === 'table' ? 'var(--primary)' : 'transparent',
                    color: overviewMode === 'table' ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  <TableIcon size={15} /> Tabela Cronológica
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <Filter size={15} color="var(--text-secondary)" />
              <select
                value={filterGroup}
                onChange={(e) => {
                  const next = e.target.value;
                  setFilterGroup(next);
                  if (next !== 'all' && filterCompany !== 'all') {
                    const comp = companies.find(c => c.id === filterCompany);
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
                <option value="all">Todas as empresas ({filteredCompaniesOptions.length})</option>
                {filteredCompaniesOptions.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={filterResponsible}
                onChange={(e) => {
                  const next = e.target.value;
                  setFilterResponsible(next);
                  if (next !== 'all' && filterCompany !== 'all') {
                    const comp = companies.find(c => c.id === filterCompany);
                    const nr = normalizeText(next);
                    if (comp && normalizeText(comp.effSupervisor) !== nr && normalizeText(comp.effTecnico) !== nr) {
                      setFilterCompany('all');
                    }
                  }
                }}
                className="filter-select"
              >
                <option value="all">Todos os responsáveis</option>
                {responsiblesOptions.map(r => (
                  <option key={r.name} value={r.name}>{r.label}</option>
                ))}
              </select>

              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="filter-select">
                <option value="all">Todos os tipos</option>
                {TYPE_OPTIONS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
                <option value="all">Todos os status</option>
                <option value="vencido">Vencidos</option>
                <option value="a_vencer">A Vencer (≤60d)</option>
                <option value="pendente">Pendentes</option>
                <option value="em_elaboracao">Em Elaboração</option>
                <option value="agendado">Agendados</option>
                <option value="entregue">Entregues / Vigentes</option>
                <option value="nao_se_aplica">Não Se Aplica</option>
                <option value="cancelado">Cancelados</option>
              </select>

              <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="filter-select">
                <option value="all">Todos os anos</option>
                {availableYears.map(yr => (
                  <option key={yr} value={String(yr)}>Ano {yr}</option>
                ))}
              </select>

              {hasOverviewFilters && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClearOverviewFilters}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
                >
                  <RotateCcw size={13} /> Limpar filtros
                </button>
              )}
            </div>
          </div>

          {/* Conteúdo: Gantt Anual ou Tabela */}
          {overviewFiltered.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <Calendar size={44} style={{ opacity: 0.35, marginBottom: '0.75rem' }} />
              <p>Nenhum entregável encontrado para os filtros selecionados.</p>
            </div>
          ) : overviewMode === 'gantt' ? (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Legenda */}
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', backgroundColor: 'var(--background)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Linha do Tempo Anual — {targetYearNum} ({overviewFiltered.length} entregável{overviewFiltered.length !== 1 ? 'is' : ''})
                </span>
                <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {[
                    { label: 'Entregue / Vigente', color: '#10b981' },
                    { label: 'A Vencer (≤60d)', color: '#f59e0b' },
                    { label: 'Vencido', color: '#dc2626' },
                    { label: 'Em Elaboração / Agendado', color: '#2563eb' },
                    { label: 'Não Se Aplica', color: '#94a3b8' },
                  ].map(lg => (
                    <span key={lg.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: lg.color }} />
                      {lg.label}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: '1020px' }}>
                  {/* Cabeçalho Meses */}
                  <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', borderBottom: '2px solid var(--border)', backgroundColor: 'var(--surface)' }}>
                    <div style={{ padding: '0.65rem 1rem', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', borderRight: '1px solid var(--border)' }}>
                      Entregável • Empresa • Responsáveis
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)' }}>
                      {['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'].map(m => (
                        <div key={m} style={{ padding: '0.65rem 0.25rem', textAlign: 'center', fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-secondary)', borderRight: '1px solid var(--border)' }}>
                          {m}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Linhas do Gantt */}
                  <div style={{ maxHeight: '620px', overflowY: 'auto' }}>
                    {overviewFiltered.slice(0, 120).map((d, idx) => {
                      const bar = computeAnnualBar(d);
                      return (
                        <div
                          key={d.id}
                          style={{
                            display: 'grid', gridTemplateColumns: '380px 1fr',
                            borderBottom: '1px solid var(--border)',
                            backgroundColor: idx % 2 === 0 ? 'var(--surface)' : 'var(--background)'
                          }}
                        >
                          {/* Coluna de Informações */}
                          <div style={{ padding: '0.65rem 0.9rem', borderRight: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: '700', fontSize: '0.82rem', color: 'var(--text-primary)' }}>{d.title}</span>
                                <span style={{
                                  fontSize: '0.65rem', fontWeight: '700', padding: '1px 6px', borderRadius: '999px',
                                  backgroundColor: d.situation.bg, color: d.situation.color, border: `1px solid ${d.situation.border}`
                                }}>
                                  {d.situation.label}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {d.companyName}{d.groupName && d.groupName !== 'Sem Grupo' ? ` • ${d.groupName}` : ''}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '3px', display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                                <span><ShieldCheck size={10} style={{ display: 'inline', verticalAlign: '-1px' }} /> Sup: <strong>{d.supervisor || 'Não definido'}</strong></span>
                                <span><UserCheck size={10} style={{ display: 'inline', verticalAlign: '-1px' }} /> Téc: <strong>{d.tecnicoResponsavel || 'Não definido'}</strong></span>
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Emissão: <strong>{formatDateBR(d.emissionDate)}</strong>
                                {!d.pcaPprAet && isProgram(d) && (
                                  <> • Validade: <strong style={{ color: d.isExpiredItem ? '#dc2626' : 'var(--text-primary)' }}>{d.validityDate ? formatDateBR(d.validityDate) : 'Sem validade'}</strong></>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => setEditingDeliverable(d)}
                                title="Editar entregável"
                                style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleLoadCompanyIntoKickoff(d.companyId)}
                                title="Carregar empresa no Planejador Kickoff"
                                style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--primary)', cursor: 'pointer' }}
                              >
                                <Sparkles size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Linha do Tempo */}
                          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', alignItems: 'center', minHeight: '58px' }}>
                            {Array.from({ length: 12 }).map((_, mIdx) => (
                              <div key={mIdx} style={{ height: '100%', borderRight: '1px dashed var(--border)' }} />
                            ))}

                            {todayMarkerPct !== null && (
                              <div
                                title={`Hoje: ${today.toLocaleDateString('pt-BR')}`}
                                style={{
                                  position: 'absolute', left: `${todayMarkerPct}%`, top: 0, bottom: 0,
                                  width: '2px', backgroundColor: 'rgba(220, 38, 38, 0.55)', zIndex: 2, pointerEvents: 'none'
                                }}
                              />
                            )}

                            {bar && (
                              <div
                                onClick={() => setEditingDeliverable(d)}
                                title={`${d.title} — ${d.companyName}\nEmissão: ${formatDateBR(d.emissionDate)} | Validade: ${d.pcaPprAet ? 'Não Se Aplica' : formatDateBR(d.validityDate)}\nStatus: ${d.situation.label}`}
                                style={{
                                  position: 'absolute',
                                  left: `${bar.left}%`,
                                  width: `${bar.width}%`,
                                  height: '22px',
                                  borderRadius: '6px',
                                  backgroundColor: d.situation.bar,
                                  color: '#ffffff',
                                  fontSize: '0.68rem',
                                  fontWeight: '700',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '0 6px',
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                                  textOverflow: 'ellipsis',
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
                                  zIndex: 3
                                }}
                              >
                                {d.situation.key === 'nao_se_aplica'
                                  ? 'Não Se Aplica'
                                  : (d.validityDate ? `${formatDateBR(d.emissionDate)} → ${formatDateBR(d.validityDate)}` : formatDateBR(d.emissionDate))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {overviewFiltered.length > 120 && (
                      <div style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', backgroundColor: 'var(--background)' }}>
                        Exibindo os primeiros 120 registros no Gantt. Utilize os filtros ou alterne para a Tabela Cronológica / PDF para visualizar todos os {overviewFiltered.length} itens.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--background)', borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Entregável</th>
                      <th style={{ padding: '0.75rem 0.75rem' }}>Empresa / Grupo</th>
                      <th style={{ padding: '0.75rem 0.75rem' }}>Supervisor</th>
                      <th style={{ padding: '0.75rem 0.75rem' }}>Resp. Técnico</th>
                      <th style={{ padding: '0.75rem 0.75rem' }}>Emissão</th>
                      <th style={{ padding: '0.75rem 0.75rem' }}>Validade</th>
                      <th style={{ padding: '0.75rem 0.75rem' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewFiltered.map((d, idx) => (
                      <tr key={d.id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--background)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {d.title}
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '400' }}>
                            {TYPE_OPTIONS.find(t => t.value === d.type)?.label || d.type}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem' }}>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{d.companyName}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{d.groupName}</div>
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', color: 'var(--text-primary)' }}>{d.supervisor || 'Não definido'}</td>
                        <td style={{ padding: '0.75rem 0.75rem', color: 'var(--text-primary)' }}>{d.tecnicoResponsavel || 'Não definido'}</td>
                        <td style={{ padding: '0.75rem 0.75rem', whiteSpace: 'nowrap' }}>{formatDateBR(d.emissionDate)}</td>
                        <td style={{ padding: '0.75rem 0.75rem', whiteSpace: 'nowrap', color: d.isExpiredItem ? '#dc2626' : 'var(--text-primary)', fontWeight: d.isExpiredItem ? '700' : '500' }}>
                          {d.pcaPprAet ? 'Não Se Aplica' : (d.validityDate ? formatDateBR(d.validityDate) : 'Sem validade')}
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', padding: '0.18rem 0.6rem', borderRadius: '999px',
                            fontSize: '0.72rem', fontWeight: '600', backgroundColor: d.situation.bg, color: d.situation.color,
                            border: `1px solid ${d.situation.border}`, whiteSpace: 'nowrap'
                          }}>
                            {d.situation.label}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => setEditingDeliverable(d)}
                            className="btn btn-secondary"
                            style={{ padding: '0.28rem 0.55rem', fontSize: '0.72rem', marginRight: '0.35rem' }}
                            title="Editar entregável"
                          >
                            <Edit3 size={12} /> Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLoadCompanyIntoKickoff(d.companyId)}
                            className="btn btn-secondary"
                            style={{ padding: '0.28rem 0.55rem', fontSize: '0.72rem', color: 'var(--primary)' }}
                            title="Carregar no Planejador Kickoff"
                          >
                            <Sparkles size={12} /> Kickoff
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 2: PLANEJADOR & GERADOR DE CRONOGRAMA KICKOFF                     */}
      {/* ===================================================================== */}
      {activeTab === 'kickoff' && (
        <form onSubmit={handleSaveKickoffToSystem} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {saveSuccessInfo && (
            <div style={{
              padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)',
              backgroundColor: '#dcfce7', border: '1px solid #86efac', color: '#166534',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', fontWeight: '600' }}>
                <CheckCircle2 size={20} />
                <span>
                  Cronograma salvo! {saveSuccessInfo.count} entregável(is) sincronizado(s) para <strong>{saveSuccessInfo.companyName}</strong>.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('overview')}>
                  Ver no Cronograma Geral
                </button>
                <button type="button" className="btn btn-primary" onClick={() => navigate(`/company/${saveSuccessInfo.companyId}`)}>
                  Abrir Empresa <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Bloco 1: Empresa, Grupo, Responsáveis e Contrato PDF */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '1.25rem' }}>
            {/* Card Empresa & Parâmetros */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 className="text-h2" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={18} color="var(--primary)" /> Empresa & Parâmetros do Projeto
                </h2>
                <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setCompanyMode('existing')}
                    style={{
                      padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: '600', border: 'none', cursor: 'pointer',
                      backgroundColor: companyMode === 'existing' ? 'var(--primary)' : 'transparent',
                      color: companyMode === 'existing' ? '#fff' : 'var(--text-secondary)'
                    }}
                  >
                    Empresa Existente
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompanyMode('new')}
                    style={{
                      padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: '600', border: 'none', borderLeft: '1px solid var(--border)', cursor: 'pointer',
                      backgroundColor: companyMode === 'new' ? 'var(--primary)' : 'transparent',
                      color: companyMode === 'new' ? '#fff' : 'var(--text-secondary)'
                    }}
                  >
                    Nova Empresa
                  </button>
                </div>
              </div>

              {companyMode === 'existing' ? (
                <div>
                  <label className="modal-label" htmlFor="kickoff-existing-company">Selecionar Empresa Cadastrada</label>
                  <select
                    id="kickoff-existing-company"
                    className="modal-input"
                    value={selectedExistingCompanyId}
                    onChange={(e) => setSelectedExistingCompanyId(e.target.value)}
                    required
                  >
                    <option value="">Selecione uma empresa...</option>
                    {[...companies].sort((a, b) => collator.compare(a.name, b.name)).map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.groupName})
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const comp = companies.find(c => c.id === selectedExistingCompanyId);
                    if (!comp) return null;
                    return (
                      <div style={{ marginTop: '0.65rem', padding: '0.7rem 0.85rem', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.78rem', display: 'flex', flexWrap: 'wrap', gap: '0.85rem' }}>
                        <span><strong>CNPJ:</strong> {comp.cnpj}</span>
                        <span><strong>Grupo:</strong> {comp.groupName}</span>
                        <span><ShieldCheck size={12} style={{ display: 'inline' }} /> <strong>Supervisor:</strong> {comp.effSupervisor}</span>
                        <span><UserCheck size={12} style={{ display: 'inline' }} /> <strong>Resp. Técnico:</strong> {comp.effTecnico}</span>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div className="grid-responsive-2">
                    <div>
                      <label className="modal-label" htmlFor="kickoff-new-name">Razão Social / Nome da Empresa *</label>
                      <input
                        id="kickoff-new-name"
                        type="text"
                        className="modal-input"
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        placeholder="Ex: Indústria Exemplo LTDA"
                        required
                      />
                    </div>
                    <div>
                      <label className="modal-label" htmlFor="kickoff-new-cnpj">CNPJ</label>
                      <input
                        id="kickoff-new-cnpj"
                        type="text"
                        className="modal-input"
                        value={newCompanyCnpj}
                        onChange={(e) => setNewCompanyCnpj(formatCNPJ(e.target.value))}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="modal-label">Grupo Econômico *</label>
                    {isCreatingGroup ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="text"
                          className="modal-input"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          placeholder="Nome do novo grupo econômico"
                          required
                        />
                        <button type="button" className="btn btn-secondary" onClick={() => setIsCreatingGroup(false)}>
                          Usar Existente
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select
                          className="modal-input"
                          value={selectedGroupId}
                          onChange={(e) => setSelectedGroupId(e.target.value)}
                          required
                        >
                          <option value="">Selecione um grupo...</option>
                          {sortedGroups.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                        <button type="button" className="btn btn-secondary" onClick={() => setIsCreatingGroup(true)} title="Criar Novo Grupo">
                          <Plus size={16} /> Novo
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid-responsive-2">
                    <div>
                      <label className="modal-label" htmlFor="kickoff-sup">Supervisor</label>
                      <select
                        id="kickoff-sup"
                        className="modal-input"
                        value={kickoffSupervisor}
                        onChange={(e) => setKickoffSupervisor(e.target.value)}
                      >
                        <option value="">Selecione o supervisor...</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                        {kickoffSupervisor && !profiles.some(p => p.name === kickoffSupervisor) && (
                          <option value={kickoffSupervisor}>{kickoffSupervisor}</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="modal-label" htmlFor="kickoff-tec">Responsável Técnico</label>
                      <select
                        id="kickoff-tec"
                        className="modal-input"
                        value={kickoffTecnico}
                        onChange={(e) => setKickoffTecnico(e.target.value)}
                      >
                        <option value="">Selecione o responsável técnico...</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                        {kickoffTecnico && !profiles.some(p => p.name === kickoffTecnico) && (
                          <option value={kickoffTecnico}>{kickoffTecnico}</option>
                        )}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid-responsive-2">
                <div>
                  <label className="modal-label" htmlFor="kickoff-start">Data de Início</label>
                  <input
                    id="kickoff-start"
                    type="date"
                    className="modal-input"
                    value={kickoffStartDate}
                    onChange={(e) => setKickoffStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="modal-label" htmlFor="kickoff-duration">Duração do Contrato (meses)</label>
                  <input
                    id="kickoff-duration"
                    type="number"
                    min="1"
                    max="60"
                    className="modal-input"
                    value={kickoffDurationMonths}
                    onChange={(e) => setKickoffDurationMonths(parseInt(e.target.value, 10) || 12)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Card Importar Contrato PDF */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', justifyContent: 'space-between' }}>
              <div>
                <h2 className="text-h2" style={{ margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Upload size={18} color="var(--primary)" /> Importar Contrato PDF (Análise Automática)
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Anexe o contrato em PDF para extrair automaticamente os entregáveis do escopo contratual (com IA Gemini ou reconhecimento SST local).
                </p>
              </div>

              <label
                style={{
                  border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)',
                  padding: '1.35rem 1rem', textAlign: 'center', cursor: analyzingPdf ? 'wait' : 'pointer',
                  backgroundColor: 'var(--background)', transition: 'var(--transition)', display: 'block'
                }}
              >
                {analyzingPdf ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', color: 'var(--primary)', fontWeight: '600' }}>
                    <Loader2 size={20} className="spin" /> {analysisFeedback || 'Analisando contrato...'}
                  </div>
                ) : (
                  <>
                    <FileText size={28} color="var(--primary)" style={{ margin: '0 auto 0.5rem auto' }} />
                    <div style={{ fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      {pdfFile ? `Arquivo carregado: ${pdfFile.name}` : 'Clique para selecionar o contrato PDF'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      PCA, PPR e AET identificados serão marcados automaticamente como "Não Se Aplica"
                    </div>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  disabled={analyzingPdf}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleAnalyzeContractPdf(f);
                  }}
                />
              </label>

              {analysisFeedback && !analyzingPdf && (
                <div style={{ fontSize: '0.78rem', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af' }}>
                  {analysisFeedback}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <Briefcase size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> {kickoffItems.length} item(ns) no cronograma
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }} onClick={handleSelectDefaultScope}>
                    Padrão TotalSafety
                  </button>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }} onClick={() => setKickoffItems([])}>
                    Limpar Escopo
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bloco 2: Catálogo Rápido de Escopo Padronizado TotalSafety */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Escopo Padronizado TotalSafety (clique para incluir ou remover)
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                PCA, PPR e AET possuem status padrão <strong>Não Se Aplica</strong> e não geram pendências
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '0.55rem' }}>
              {KICKOFF_CATALOG.map(cat => {
                const selected = kickoffItems.some(it => it.catalogId === cat.id || normalizeText(it.title) === normalizeText(cat.title));
                const isNA = cat.defaultStatus === 'nao_se_aplica';
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCatalogItem(cat)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.55rem', textAlign: 'left',
                      padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      border: selected ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                      backgroundColor: selected ? 'var(--primary-light)' : 'var(--surface)',
                      color: 'var(--text-primary)', transition: 'var(--transition)'
                    }}
                  >
                    {selected ? <CheckSquare size={16} color="var(--primary)" /> : <Square size={16} color="var(--text-secondary)" />}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cat.label}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: isNA ? '#64748b' : 'var(--text-secondary)' }}>
                        Fase {cat.phase} • {cat.durationDays}d{isNA ? ' • Não Se Aplica' : ''}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bloco 3: Gantt Interativo + Editor Inline de Entregáveis */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '0.9rem 1.15rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', backgroundColor: 'var(--background)' }}>
              <div>
                <h2 className="text-h2" style={{ margin: 0 }}>Gráfico de Gantt & Edição do Cronograma Kickoff</h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Ajuste fase, início, duração em dias úteis e status diretamente na tabela
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: 'var(--surface)' }}>
                  <button
                    type="button"
                    onClick={() => setGanttGranularity('months')}
                    style={{
                      padding: '0.38rem 0.8rem', fontSize: '0.76rem', fontWeight: '600', border: 'none', cursor: 'pointer',
                      backgroundColor: ganttGranularity === 'months' ? 'var(--primary)' : 'transparent',
                      color: ganttGranularity === 'months' ? '#fff' : 'var(--text-secondary)'
                    }}
                  >
                    Meses
                  </button>
                  <button
                    type="button"
                    onClick={() => setGanttGranularity('weeks')}
                    style={{
                      padding: '0.38rem 0.8rem', fontSize: '0.76rem', fontWeight: '600', border: 'none', borderLeft: '1px solid var(--border)', cursor: 'pointer',
                      backgroundColor: ganttGranularity === 'weeks' ? 'var(--primary)' : 'transparent',
                      color: ganttGranularity === 'weeks' ? '#fff' : 'var(--text-secondary)'
                    }}
                  >
                    Semanas
                  </button>
                </div>
              </div>
            </div>

            {positionedKickoffItems.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Selecione itens do escopo acima ou adicione um entregável customizado abaixo para montar o cronograma.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: '1080px' }}>
                  {/* Gantt Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '480px 1fr', borderBottom: '2px solid var(--border)', backgroundColor: 'var(--surface)' }}>
                    <div style={{ padding: '0.6rem 0.85rem', fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', borderRight: '1px solid var(--border)' }}>
                      Entregável • Fase • Início • Dias • Status
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${kickoffTimeline.cols.length}, minmax(26px, 1fr))` }}>
                      {kickoffTimeline.cols.map(col => (
                        <div key={col.key} style={{ padding: '0.6rem 0.15rem', textAlign: 'center', fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-secondary)', borderRight: '1px solid var(--border)' }}>
                          {col.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gantt Rows grouped by Phase */}
                  {[1, 2, 3].map(phaseNum => {
                    const phaseItems = positionedKickoffItems.filter(it => (it.phase || 1) === phaseNum);
                    if (phaseItems.length === 0) return null;
                    return (
                      <div key={phaseNum}>
                        <div style={{ padding: '0.45rem 0.85rem', backgroundColor: '#eff6ff', borderBottom: '1px solid var(--border)', fontSize: '0.74rem', fontWeight: '700', color: '#1e3a8a' }}>
                          {PHASE_LABELS[phaseNum]} ({phaseItems.length})
                        </div>
                        {phaseItems.map(item => {
                          const { tStart, totalMs, cols } = kickoffTimeline;
                          const startOff = Math.max(0, item.startObj.getTime() - tStart.getTime());
                          const endOff = Math.max(startOff + 1, item.endObj.getTime() - tStart.getTime());
                          const leftPct = Math.min(96, (startOff / totalMs) * 100);
                          const widthPct = Math.max(3, Math.min(100 - leftPct, ((endOff - startOff) / totalMs) * 100));
                          const isNA = item.effectiveStatus === 'nao_se_aplica';
                          const barColor = isNA ? '#94a3b8' : (phaseNum === 1 ? '#15803d' : phaseNum === 2 ? '#2563eb' : '#d97706');

                          return (
                            <div key={item.uid} style={{ display: 'grid', gridTemplateColumns: '480px 1fr', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                              {/* Editor inline */}
                              <div style={{ padding: '0.45rem 0.65rem', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                <input
                                  type="text"
                                  value={item.title}
                                  onChange={(e) => handleUpdateKickoffItem(item.uid, 'title', e.target.value)}
                                  className="modal-input"
                                  style={{ flex: '1 1 130px', padding: '0.25rem 0.45rem', fontSize: '0.76rem', fontWeight: '600', minHeight: '28px' }}
                                />
                                <select
                                  value={item.phase}
                                  onChange={(e) => handleUpdateKickoffItem(item.uid, 'phase', parseInt(e.target.value, 10))}
                                  className="modal-input"
                                  style={{ width: '58px', padding: '0.22rem', fontSize: '0.72rem', minHeight: '28px' }}
                                  title="Fase"
                                >
                                  <option value={1}>F1</option>
                                  <option value={2}>F2</option>
                                  <option value={3}>F3</option>
                                </select>
                                <input
                                  type="date"
                                  value={item.manualStartDate || item.computedStartDate}
                                  onChange={(e) => handleUpdateKickoffItem(item.uid, 'manualStartDate', e.target.value)}
                                  className="modal-input"
                                  style={{ width: '115px', padding: '0.22rem', fontSize: '0.7rem', minHeight: '28px' }}
                                  title="Data de início"
                                />
                                <input
                                  type="number"
                                  min="1"
                                  max="365"
                                  value={item.durationDays}
                                  onChange={(e) => handleUpdateKickoffItem(item.uid, 'durationDays', Math.max(1, parseInt(e.target.value, 10) || 1))}
                                  className="modal-input"
                                  style={{ width: '50px', padding: '0.22rem', fontSize: '0.72rem', minHeight: '28px', textAlign: 'center' }}
                                  title="Duração em dias úteis"
                                />
                                <select
                                  value={item.effectiveStatus}
                                  onChange={(e) => handleUpdateKickoffItem(item.uid, 'status', e.target.value)}
                                  className="modal-input"
                                  style={{ width: '105px', padding: '0.22rem', fontSize: '0.7rem', minHeight: '28px' }}
                                >
                                  <option value="pendente" disabled={isPcaPprAet({ title: item.title, type: item.type })}>Pendente</option>
                                  <option value="em_elaboracao">Em Elaboração</option>
                                  <option value="agendado">Agendado</option>
                                  <option value="entregue">Entregue</option>
                                  <option value="nao_se_aplica">Não Se Aplica</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveKickoffItem(item.uid)}
                                  title="Remover item"
                                  style={{ padding: '4px', border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              {/* Bar Track */}
                              <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${cols.length}, minmax(26px, 1fr))`, alignItems: 'center', minHeight: '40px' }}>
                                {cols.map(col => (
                                  <div key={col.key} style={{ height: '100%', borderRight: '1px dashed var(--border)' }} />
                                ))}
                                <div
                                  title={`${item.title}: ${formatDateBR(item.computedStartDate)} até ${formatDateBR(item.computedEndDate)} (${item.durationDays} dias úteis)`}
                                  style={{
                                    position: 'absolute',
                                    left: `${leftPct}%`,
                                    width: `${widthPct}%`,
                                    height: '20px',
                                    borderRadius: '5px',
                                    backgroundColor: barColor,
                                    color: '#fff',
                                    fontSize: '0.67rem',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 6px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
                                  }}
                                >
                                  {isNA ? 'Não Se Aplica' : `${item.durationDays}d (${formatDateBR(item.computedEndDate)})`}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Adicionar Entregável Customizado */}
            <div style={{ padding: '0.9rem 1.15rem', borderTop: '1px solid var(--border)', backgroundColor: 'var(--background)', display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label className="modal-label" style={{ fontSize: '0.72rem' }}>Adicionar Entregável Customizado</label>
                <input
                  type="text"
                  className="modal-input"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomKickoffItem(e);
                    }
                  }}
                  placeholder="Ex: Treinamento NR-35 Altura"
                  style={{ minHeight: '34px', padding: '0.35rem 0.65rem' }}
                />
              </div>
              <div style={{ width: '140px' }}>
                <label className="modal-label" style={{ fontSize: '0.72rem' }}>Tipo</label>
                <select className="modal-input" value={customType} onChange={(e) => setCustomType(e.target.value)} style={{ minHeight: '34px', padding: '0.35rem' }}>
                  {TYPE_OPTIONS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ width: '160px' }}>
                <label className="modal-label" style={{ fontSize: '0.72rem' }}>Fase</label>
                <select className="modal-input" value={customPhase} onChange={(e) => setCustomPhase(parseInt(e.target.value, 10))} style={{ minHeight: '34px', padding: '0.35rem' }}>
                  <option value={1}>Fase 1 — Implantação</option>
                  <option value={2}>Fase 2 — Execução</option>
                  <option value={3}>Fase 3 — Monitoramento</option>
                </select>
              </div>
              <div style={{ width: '95px' }}>
                <label className="modal-label" style={{ fontSize: '0.72rem' }}>Duração (d)</label>
                <input type="number" min="1" className="modal-input" value={customDuration} onChange={(e) => setCustomDuration(e.target.value)} style={{ minHeight: '34px', padding: '0.35rem' }} />
              </div>
              <button type="button" className="btn btn-secondary" onClick={handleAddCustomKickoffItem} disabled={!customTitle.trim()} style={{ height: '34px', padding: '0 0.9rem' }}>
                <Plus size={15} /> Adicionar
              </button>
            </div>
          </div>

          {/* Barra de Ações Finais do Kickoff */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportKickoffPdf}
              disabled={positionedKickoffItems.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Download size={16} /> Baixar Apresentação PDF
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingKickoff || positionedKickoffItems.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              {savingKickoff ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              {savingKickoff
                ? 'Sincronizando no Sistema...'
                : companyMode === 'existing'
                  ? 'Sincronizar Entregáveis na Empresa'
                  : 'Cadastrar Empresa & Salvar Cronograma'}
            </button>
          </div>
        </form>
      )}

      {/* Modal de Edição rápida pela Aba 1 */}
      {editingDeliverable && (
        <EditDeliverableModal
          deliverable={editingDeliverable}
          companyId={editingDeliverable.companyId}
          onClose={() => setEditingDeliverable(null)}
          onSave={async (id, updates) => {
            await updateDeliverable(id, updates);
            setEditingDeliverable(null);
            await loadMasterData(false);
          }}
        />
      )}
    </div>
  );
};

export default ScheduleGeneratorPage;
