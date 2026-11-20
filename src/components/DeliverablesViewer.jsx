import React, { useState, useEffect, useMemo, useDeferredValue, useRef, useCallback } from 'react';
import {
  FileText, Download, Filter, Search,
  CheckCircle, Clock, AlertTriangle, FileSpreadsheet, File,
  LayoutGrid, List as ListIcon, Edit3, Trash2,
  ShieldCheck, UserCheck, Building2, RotateCcw
} from 'lucide-react';
import {
  getDeliverablesByCompany, getContractsByCompany, addDeliverable, updateDeliverable,
  uploadDocument, getDocumentUrl, getAllDeliverablesSummary, getContracts, getCompanies,
  getGroups, resolveCompaniesWithHeritage, deleteDeliverable, deleteDeliverables,
  getCachedSnapshot, subscribeToStorageCache
} from '../services/storageService';
import {
  isItemExpired, isDelivered, getEffectiveValidityDate, isProgram,
  isPcaPprAet, isPendingDeliverable
} from '../utils/deliverableTiming';
import { sanitizeErrorMessage } from '../utils/errorPolicy';
import AddDeliverableModal from './AddDeliverableModal';
import EditDeliverableModal from './EditDeliverableModal';
import DeliverablesReportModal from './DeliverablesReportModal';

const PAGE_SIZE = 60;

const TYPE_CONFIG = {
  programa: { label: 'Programa', icon: <FileSpreadsheet size={16} />, color: 'var(--primary)', bg: 'var(--primary-light)' },
  laudo: { label: 'Laudo', icon: <FileText size={16} />, color: '#d97706', bg: '#fef3c7' },
  contrato: { label: 'Contrato', icon: <File size={16} />, color: 'var(--secondary)', bg: 'var(--secondary-light)' },
  documento: { label: 'Documento', icon: <FileText size={16} />, color: '#6366f1', bg: '#e0e7ff' },
  treinamento: { label: 'Treinamento', icon: <FileText size={16} />, color: 'var(--info)', bg: '#e0f2fe' },
  visita_tecnica: { label: 'Visita Técnica', icon: <FileText size={16} />, color: '#059669', bg: '#d1fae5' },
};

const STATUS_CONFIG = {
  vencido: { label: 'Vencido', icon: <AlertTriangle size={14} />, color: '#dc2626', bg: '#fee2e2' },
  entregue: { label: 'Entregue', icon: <CheckCircle size={14} />, color: 'var(--secondary-hover)', bg: 'var(--secondary-light)' },
  feito: { label: 'Feito', icon: <CheckCircle size={14} />, color: 'var(--secondary-hover)', bg: 'var(--secondary-light)' },
  pendente: { label: 'Pendente', icon: <Clock size={14} />, color: '#b45309', bg: '#fef3c7' },
  agendado: { label: 'Agendado', icon: <Clock size={14} />, color: 'var(--primary)', bg: 'var(--primary-light)' },
  em_elaboracao: { label: 'Em Elaboração', icon: <AlertTriangle size={14} />, color: 'var(--primary)', bg: 'var(--primary-light)' },
  adiado: { label: 'Adiado', icon: <AlertTriangle size={14} />, color: '#b45309', bg: '#fef3c7' },
  cancelado: { label: 'Cancelado', icon: <AlertTriangle size={14} />, color: 'var(--danger)', bg: '#fee2e2' },
  nao_se_aplica: { label: 'Não Se Aplica', icon: <AlertTriangle size={14} />, color: '#4b5563', bg: '#f3f4f6' },
};

const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

function normalizeText(value) {
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const DeliverablesViewer = ({ companyId, onUpdate }) => {
  const initialSnap = useMemo(() => getCachedSnapshot(companyId), [companyId]);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterContract, setFilterContract] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterResponsible, setFilterResponsible] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [showModal, setShowModal] = useState(false);
  const [modalInitialMode, setModalInitialMode] = useState('single');
  const [viewMode, setViewMode] = useState('grid');
  
  const [deliverables, setDeliverables] = useState(() =>
    companyId ? (initialSnap.companyDeliverables || []) : (initialSnap.allDeliverablesSummary || [])
  );
  const [contracts, setContracts] = useState(() =>
    companyId ? (initialSnap.companyContracts || []) : (initialSnap.contracts || [])
  );
  const [companies, setCompanies] = useState(() => initialSnap.resolvedCompanies || []);
  const [groups, setGroups] = useState(() => initialSnap.groups || []);
  const [loading, setLoading] = useState(() =>
    companyId ? !initialSnap.hasCompanyDetailsCache : !initialSnap.hasDeliverablesCache
  );
  const [uploadingId, setUploadingId] = useState(null);
  const [editingDeliverable, setEditingDeliverable] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef(null);

  const loadData = useCallback(async (showLoading = true) => {
    const snap = getCachedSnapshot(companyId);
    const hasCache = companyId ? snap.hasCompanyDetailsCache : snap.hasDeliverablesCache;
    if (showLoading && !hasCache) setLoading(true);
    if (companyId) {
      const [delivs, ctrs] = await Promise.all([
        getDeliverablesByCompany(companyId),
        getContractsByCompany(companyId)
      ]);
      setDeliverables(delivs);
      setContracts(ctrs);
    } else {
      const [delivs, ctrs, comps, grps] = await Promise.all([
        getAllDeliverablesSummary(),
        getContracts(),
        getCompanies(),
        getGroups()
      ]);
      const resolvedCompanies = resolveCompaniesWithHeritage(comps, grps);
      setDeliverables(delivs);
      setContracts(ctrs);
      setCompanies(resolvedCompanies);
      setGroups(grps);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    const snap = getCachedSnapshot(companyId);
    if (companyId) {
      if (snap.companyDeliverables) setDeliverables(snap.companyDeliverables);
      if (snap.companyContracts) setContracts(snap.companyContracts);
    } else {
      if (snap.allDeliverablesSummary) setDeliverables(snap.allDeliverablesSummary);
      if (snap.contracts) setContracts(snap.contracts);
      if (snap.resolvedCompanies) setCompanies(snap.resolvedCompanies);
      if (snap.groups) setGroups(snap.groups);
    }
    loadData(true);

    const unsub = subscribeToStorageCache(() => {
      const nextSnap = getCachedSnapshot(companyId);
      if (companyId) {
        if (nextSnap.companyDeliverables) setDeliverables(nextSnap.companyDeliverables);
        if (nextSnap.companyContracts) setContracts(nextSnap.companyContracts);
      } else {
        if (nextSnap.allDeliverablesSummary) setDeliverables(nextSnap.allDeliverablesSummary);
        if (nextSnap.contracts) setContracts(nextSnap.contracts);
        if (nextSnap.resolvedCompanies) setCompanies(nextSnap.resolvedCompanies);
        if (nextSnap.groups) setGroups(nextSnap.groups);
      }
    });
    return () => unsub();
  }, [companyId, loadData]);

  const responsiblesOptions = useMemo(() => {
    const map = new Map();
    const register = (rawName, role) => {
      const name = String(rawName || '').trim();
      if (!name || name === 'Não definido') return;
      const key = normalizeText(name);
      if (!map.has(key)) {
        map.set(key, { name, isSup: false, isTec: false });
      }
      const entry = map.get(key);
      if (role === 'sup') entry.isSup = true;
      if (role === 'tec') entry.isTec = true;
    };

    companies.forEach(c => {
      register(c.effSupervisor, 'sup');
      register(c.effTecnico, 'tec');
    });

    return Array.from(map.values())
      .map(entry => {
        const roleTag = entry.isSup && entry.isTec
          ? 'Supervisor / Resp. Técnico'
          : entry.isSup
            ? 'Supervisor'
            : 'Resp. Técnico';
        return {
          name: entry.name,
          label: `${entry.name} (${roleTag})`,
        };
      })
      .sort((a, b) => collator.compare(a.name, b.name));
  }, [companies]);

  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => collator.compare(a.name, b.name));
  }, [groups]);

  const filteredCompaniesOptions = useMemo(() => {
    const normResp = normalizeText(filterResponsible);
    return [...companies]
      .filter(c => {
        const matchGrp = filterGroup === 'all' || c.groupId === filterGroup;
        const matchResp = filterResponsible === 'all' ||
          normalizeText(c.effSupervisor) === normResp ||
          normalizeText(c.effTecnico) === normResp;
        return matchGrp && matchResp;
      })
      .sort((a, b) => collator.compare(a.name, b.name));
  }, [companies, filterGroup, filterResponsible]);

  const handleGroupFilterChange = (nextGroupId) => {
    setFilterGroup(nextGroupId);
    if (nextGroupId !== 'all' && filterCompany !== 'all') {
      const selectedComp = companies.find(c => c.id === filterCompany);
      if (selectedComp && selectedComp.groupId !== nextGroupId) {
        setFilterCompany('all');
      }
    }
  };

  const handleResponsibleFilterChange = (nextResp) => {
    setFilterResponsible(nextResp);
    if (nextResp !== 'all' && filterCompany !== 'all') {
      const selectedComp = companies.find(c => c.id === filterCompany);
      const normResp = normalizeText(nextResp);
      if (
        selectedComp &&
        normalizeText(selectedComp.effSupervisor) !== normResp &&
        normalizeText(selectedComp.effTecnico) !== normResp
      ) {
        setFilterCompany('all');
      }
    }
  };

  const hasActiveFilters = Boolean(
    filterGroup !== 'all' ||
    filterCompany !== 'all' ||
    filterResponsible !== 'all' ||
    filterStatus !== 'all' ||
    filterType !== 'all' ||
    filterContract !== 'all' ||
    searchTerm.trim() !== ''
  );

  const handleClearFilters = () => {
    setFilterGroup('all');
    setFilterCompany('all');
    setFilterResponsible('all');
    setFilterStatus('all');
    setFilterType('all');
    setFilterContract('all');
    setSearchTerm('');
  };

  const handleAddDeliverable = async (dataOrArray) => {
    const items = Array.isArray(dataOrArray) ? dataOrArray : [dataOrArray];
    if (items.length === 0) return;

    let fileName = null;
    if (items[0]?.file) {
      fileName = await uploadDocument(items[0].file, `deliverables/${companyId}`);
    }

    await Promise.all(
      items.map(data => addDeliverable({ ...data, fileName, companyId }))
    );

    setShowModal(false);
    await loadData(false);
    if (onUpdate) onUpdate();
  };

  const handleChangeStatus = async (deliverableId, newStatus) => {
    let reason = null;
    if (newStatus === 'adiado' || newStatus === 'cancelado') {
      reason = window.prompt(`Digite o motivo para marcar como ${newStatus}:`);
      if (reason === null) return; // User cancelled prompt
    }
    await updateDeliverable(deliverableId, { status: newStatus, reason });
    await loadData(false);
    if (onUpdate) onUpdate();
  };

  const handleFileUpload = async (deliverableId, file, destCompanyId) => {
    if (!file) return;
    setUploadingId(deliverableId);
    
    const filePath = await uploadDocument(file, `deliverables/${destCompanyId || companyId}`);
    if (filePath) {
      await updateDeliverable(deliverableId, { fileName: filePath, status: 'entregue', deliveredDate: new Date().toISOString() });
      await loadData(false);
      if (onUpdate) onUpdate();
    } else {
      alert(sanitizeErrorMessage(null, 'Não foi possível enviar o arquivo no momento.'));
    }
    setUploadingId(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este entregável?')) {
      await deleteDeliverable(id);
      setSelectedIds(prev => prev.filter(x => x !== id));
      await loadData(false);
      if (onUpdate) onUpdate();
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const indexedDeliverables = useMemo(() => {
    const fmtDate = (val) => {
      if (!val) return '';
      const dt = val instanceof Date ? val : new Date(val);
      return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    };

    return deliverables.map(d => {
      const itemIsPcaPprAet = isPcaPprAet(d);
      const itemIsProgram = !itemIsPcaPprAet && d.type === 'programa' && isProgram(d);
      const itemIsDelivered = isDelivered(d);
      const itemIsPending = isPendingDeliverable(d);
      const itemIsExpired = isItemExpired(d, today);
      const effectiveStatus = itemIsPcaPprAet && !itemIsDelivered && d.status !== 'cancelado'
        ? 'nao_se_aplica'
        : ((!itemIsProgram && d.status === 'vencido') ? 'pendente' : d.status);
      const effVal = itemIsProgram ? getEffectiveValidityDate(d) : null;
      const normSup = normalizeText(d.supervisor);
      const normTec = normalizeText(d.tecnicoResponsavel);
      const searchBlob = `${normalizeText(d.title)}|${normalizeText(d.companyName)}|${normalizeText(d.groupName)}|${normSup}|${normTec}`;

      return {
        ...d,
        _isPcaPprAet: itemIsPcaPprAet,
        _isProgram: itemIsProgram,
        _isDelivered: itemIsDelivered,
        _isPending: itemIsPending,
        _isExpired: itemIsExpired,
        _effectiveStatus: effectiveStatus,
        _normSup: normSup,
        _normTec: normTec,
        _searchBlob: searchBlob,
        _fmtEmissao: fmtDate(d.dataEmissao || d.dataEnvio),
        _fmtValidade: effVal ? fmtDate(effVal) : '',
        _fmtRevisao: fmtDate(d.ultimaRevisao),
        _fmtDelivered: fmtDate(d.deliveredDate),
      };
    });
  }, [deliverables, today]);

  const normRespFilter = useMemo(() => normalizeText(filterResponsible), [filterResponsible]);
  const normQuery = useMemo(() => normalizeText(deferredSearchTerm), [deferredSearchTerm]);

  const statsBase = useMemo(() => {
    return indexedDeliverables.filter(d => {
      if (!companyId && filterGroup !== 'all' && d.groupId !== filterGroup) return false;
      if (!companyId && filterCompany !== 'all' && d.companyId !== filterCompany) return false;
      if (!companyId && filterResponsible !== 'all' && d._normSup !== normRespFilter && d._normTec !== normRespFilter) return false;
      if (normQuery && !d._searchBlob.includes(normQuery)) return false;
      return true;
    });
  }, [indexedDeliverables, companyId, filterGroup, filterCompany, filterResponsible, normRespFilter, normQuery]);

  const filtered = useMemo(() => {
    return statsBase.filter(d => {
      if (filterType !== 'all' && d.type !== filterType) return false;
      if (filterContract !== 'all' && d.contractId !== filterContract) return false;
      if (filterStatus === 'all') return true;
      if (filterStatus === 'vencido') return d._isExpired;
      if (filterStatus === 'entregue') return d._isDelivered && !d._isExpired;
      if (filterStatus === 'pendente') return d.status === 'pendente' && !d._isPcaPprAet;
      return d.status === filterStatus;
    });
  }, [statsBase, filterType, filterStatus, filterContract]);

  const stats = useMemo(() => {
    let entregue = 0;
    let pendente = 0;
    let em_elaboracao = 0;
    let vencidos = 0;
    for (let i = 0; i < statsBase.length; i++) {
      const d = statsBase[i];
      if (d._isExpired) vencidos++;
      else if (d._isDelivered) entregue++;
      if (d._isPending && !d._isExpired) pendente++;
      if (d.status === 'em_elaboracao' && !d._isPcaPprAet) em_elaboracao++;
    }
    return {
      total: statsBase.length,
      entregue,
      pendente,
      em_elaboracao,
      vencidos,
    };
  }, [statsBase]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [companyId, filterGroup, filterCompany, filterResponsible, filterType, filterStatus, filterContract, normQuery]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visibleCount >= filtered.length) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, filtered.length]);

  const visibleDeliverables = useMemo(() => {
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount]);

  const allFilteredSelected = useMemo(() => {
    if (filtered.length === 0 || selectedIdsSet.size < filtered.length) return false;
    for (let i = 0; i < filtered.length; i++) {
      if (!selectedIdsSet.has(filtered[i].id)) return false;
    }
    return true;
  }, [filtered, selectedIdsSet]);

  const handleToggleSelectAll = () => {
    const visibleIds = filtered.map(d => d.id);
    if (allFilteredSelected) {
      const removeSet = new Set(visibleIds);
      setSelectedIds(prev => prev.filter(id => !removeSet.has(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (!window.confirm(`Tem certeza que deseja excluir ${count} entregável(is) selecionado(s)? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setDeletingBulk(true);
    try {
      await deleteDeliverables(selectedIds);
      setSelectedIds([]);
      await loadData(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(sanitizeErrorMessage(err, 'Não foi possível excluir os entregáveis selecionados.'));
    } finally {
      setDeletingBulk(false);
    }
  };

  const handleEditSave = async (id, updates) => {
    await updateDeliverable(id, updates);
    setEditingDeliverable(null);
    await loadData(false);
    if (onUpdate) onUpdate();
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando entregáveis...</div>;
  }

  return (
    <div>
      {/* Stats Bar */}
      <div className="grid-responsive-stats" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Total', value: stats.total, color: 'var(--text-primary)', bg: 'var(--surface)' },
          { label: 'Entregues', value: stats.entregue, color: 'var(--secondary)', bg: 'var(--secondary-light)' },
          { label: 'Pendentes', value: stats.pendente, color: '#b45309', bg: '#fef3c7' },
          { label: 'Em Elaboração', value: stats.em_elaboracao, color: 'var(--primary)', bg: 'var(--primary-light)' },
          { label: 'Vencidos', value: stats.vencidos, color: '#dc2626', bg: '#fee2e2' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              backgroundColor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '1.125rem', fontWeight: '700', color: s.color }}>{s.value}</span>
            </div>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem', display: 'flex', gap: '0.85rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
          <Search size={18} color="var(--text-secondary)" />
          <input
            id="search-deliverables"
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
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginRight: '0.25rem' }}>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                padding: '0.375rem 0.5rem',
                backgroundColor: viewMode === 'grid' ? 'var(--primary-light)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--primary)' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              title="Visualização em Cards"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                padding: '0.375rem 0.5rem',
                backgroundColor: viewMode === 'list' ? 'var(--primary-light)' : 'transparent',
                color: viewMode === 'list' ? 'var(--primary)' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer', borderLeft: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              title="Visualização em Lista"
            >
              <ListIcon size={16} />
            </button>
          </div>
          <Filter size={16} color="var(--text-secondary)" />
          {!companyId && (
            <>
              <select
                id="filter-group"
                value={filterGroup}
                onChange={(e) => handleGroupFilterChange(e.target.value)}
                className="filter-select"
                aria-label="Filtrar por Grupo"
              >
                <option value="all">Todos os grupos</option>
                {sortedGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <select
                id="filter-company"
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="filter-select"
                aria-label="Filtrar por Empresa"
              >
                <option value="all">Todas as empresas ({filteredCompaniesOptions.length})</option>
                {filteredCompaniesOptions.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                id="filter-responsible"
                value={filterResponsible}
                onChange={(e) => handleResponsibleFilterChange(e.target.value)}
                className="filter-select"
                aria-label="Filtrar por Responsável"
              >
                <option value="all">Todos os responsáveis</option>
                {responsiblesOptions.map(r => (
                  <option key={r.name} value={r.name}>{r.label}</option>
                ))}
              </select>
            </>
          )}
          <select
            id="filter-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todos os status</option>
            <option value="pendente">Pendentes</option>
            <option value="em_elaboracao">Em Elaboração</option>
            <option value="vencido">Vencidos</option>
            <option value="agendado">Agendados</option>
            <option value="entregue">Entregues</option>
            <option value="adiado">Adiados</option>
            <option value="cancelado">Cancelados</option>
            <option value="nao_se_aplica">Não Se Aplica</option>
          </select>
          <select
            id="filter-type"
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
          <select
            id="filter-contract"
            value={filterContract}
            onChange={(e) => setFilterContract(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todos os contratos</option>
            {contracts.map(c => (
              <option key={c.id} value={c.id}>{c.contractNumber}</option>
            ))}
          </select>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClearFilters}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
              title="Limpar todos os filtros"
            >
              <RotateCcw size={14} /> Limpar filtros
            </button>
          )}
          {companyId && (
            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setModalInitialMode('batch');
                  setShowModal(true);
                }}
              >
                Cadastrar em Lote
              </button>
              <button 
                type="button"
                className="btn btn-primary" 
                onClick={() => {
                  setModalInitialMode('single');
                  setShowModal(true);
                }}
              >
                Registrar Entregável
              </button>
            </div>
          )}
          {!companyId && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowReportModal(true)}
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
              title="Gerar relatório de programas e laudos por empresa ou por responsável em planilha"
            >
              <FileSpreadsheet size={16} /> Relatório (Planilha)
            </button>
          )}
        </div>
      </div>

      {/* Selection & Bulk Actions Bar */}
      {filtered.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '0.625rem 1rem',
          marginBottom: '1rem',
          backgroundColor: selectedIds.length > 0 ? '#fef2f2' : 'var(--surface)',
          border: selectedIds.length > 0 ? '1px solid #fecaca' : '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.8125rem',
              color: 'var(--text-primary)',
              userSelect: 'none'
            }}>
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={handleToggleSelectAll}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
              />
              Selecionar Todos ({filtered.length})
            </label>

            {selectedIds.length > 0 && (
              <span style={{
                fontSize: '0.75rem',
                color: 'var(--danger)',
                fontWeight: '600',
                backgroundColor: '#fee2e2',
                padding: '0.15rem 0.5rem',
                borderRadius: '1rem'
              }}>
                {selectedIds.length} selecionado{selectedIds.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            {selectedIds.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Desmarcar seleção
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleBulkDelete}
                  disabled={deletingBulk}
                  style={{
                    backgroundColor: 'var(--danger)',
                    color: '#fff',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    cursor: deletingBulk ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Trash2 size={14} />
                  {deletingBulk ? 'Excluindo...' : `Excluir Selecionados (${selectedIds.length})`}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Deliverables Grid/List */}
      <div style={
        viewMode === 'grid' 
          ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1rem' }
          : { display: 'flex', flexDirection: 'column', gap: '0.75rem' }
      }>
        {visibleDeliverables.map(d => {
          const itemIsPcaPprAet = d._isPcaPprAet;
          const itemIsProgram = d._isProgram;
          const typeConf = TYPE_CONFIG[d.type] || TYPE_CONFIG.contrato;
          const isExpired = d._isExpired;
          const effectiveStatus = d._effectiveStatus;
          const statusConf = isExpired ? STATUS_CONFIG.vencido : (STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.pendente);
          const isSelected = selectedIdsSet.has(d.id);

          return (
            <div key={d.id} className="card" style={{ 
              padding: '1.25rem', display: 'flex', 
              flexDirection: viewMode === 'grid' ? 'column' : 'row', 
              gap: viewMode === 'grid' ? '0.75rem' : '1.5rem',
              alignItems: viewMode === 'grid' ? 'stretch' : 'center',
              border: isSelected ? '1.5px solid var(--primary)' : isExpired ? '1px solid #fca5a5' : '1px solid var(--border)',
              borderLeft: isExpired ? '4px solid #dc2626' : undefined,
              backgroundColor: isSelected ? 'rgba(14, 165, 233, 0.04)' : isExpired ? '#fffbfa' : 'var(--surface)',
              transition: 'all 0.2s ease',
              contentVisibility: 'auto',
              containIntrinsicSize: viewMode === 'grid' ? '260px' : '90px'
            }}>
              {/* Header (Type & Status for Grid, Just Type for List) */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                width: viewMode === 'grid' ? 'auto' : '160px',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelect(d.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)', flexShrink: 0 }}
                    title="Selecionar este entregável"
                  />
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.25rem 0.625rem', borderRadius: '1rem',
                    backgroundColor: typeConf.bg, color: typeConf.color,
                    fontSize: '0.75rem', fontWeight: '600'
                  }}>
                    {typeConf.icon} {typeConf.label}
                  </div>
                </div>
                {viewMode === 'grid' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                    padding: '0.125rem 0.5rem', borderRadius: '1rem',
                    backgroundColor: statusConf.bg, color: statusConf.color,
                    border: isExpired ? '1px solid #fca5a5' : 'none',
                    fontSize: '0.6875rem', fontWeight: isExpired ? '700' : '500'
                  }}>
                    {statusConf.icon} {statusConf.label}
                  </div>
                )}
              </div>

              {/* Title & Company */}
              <div style={{ flex: viewMode === 'list' ? 1 : 'none' }}>
                <h4 style={{ fontWeight: '600', color: isExpired ? '#991b1b' : 'var(--text-primary)', fontSize: '0.9375rem', lineHeight: 1.4 }}>
                  {d.title}
                </h4>
                {((!companyId && d.companyName) || (d.groupName && d.groupName !== 'Sem Grupo')) && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                    <Building2 size={12} style={{ flexShrink: 0 }} />
                    <span>
                      {!companyId && d.companyName ? d.companyName : ''}
                      {!companyId && d.companyName && d.groupName && d.groupName !== 'Sem Grupo' ? ' • ' : ''}
                      {d.groupName && d.groupName !== 'Sem Grupo' ? d.groupName : ''}
                    </span>
                  </p>
                )}
                {/* Meta details if in list mode to save space */}
                {viewMode === 'list' && (
                  <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                    {d._fmtEmissao && <span>Data de Emissão: <strong style={{ color: 'var(--text-primary)' }}>{d._fmtEmissao}</strong></span>}
                    {itemIsProgram && (
                      d._fmtValidade ? (
                        <span style={{ color: isExpired ? '#dc2626' : 'inherit', fontWeight: isExpired ? '700' : 'normal' }}>
                          Validade: {d._fmtValidade} {isExpired && '⚠️ Vencido'}
                        </span>
                      ) : (
                        <span>Validade: <strong style={{ color: 'var(--text-secondary)' }}>Sem validade</strong></span>
                      )
                    )}
                    {d._fmtRevisao && (
                      <span>Revisão: <strong style={{ color: 'var(--text-primary)' }}>{d._fmtRevisao}</strong></span>
                    )}
                    {d._fmtDelivered && <span>Entregue em: {d._fmtDelivered}</span>}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <ShieldCheck size={13} color="var(--primary)" /> Supervisor: <strong style={{ color: 'var(--text-primary)' }}>{d.supervisor || 'Não definido'}</strong>
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <UserCheck size={13} color="var(--secondary)" /> Resp. Técnico: <strong style={{ color: 'var(--text-primary)' }}>{d.tecnicoResponsavel || 'Não definido'}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Status for List mode */}
              {viewMode === 'list' && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.125rem 0.5rem', borderRadius: '1rem',
                  backgroundColor: statusConf.bg, color: statusConf.color,
                  border: isExpired ? '1px solid #fca5a5' : 'none',
                  fontSize: '0.75rem', fontWeight: isExpired ? '700' : '500', flexShrink: 0,
                  width: '120px', justifyContent: 'center'
                }}>
                  {statusConf.icon} {statusConf.label}
                </div>
              )}

              {/* Meta (Grid only) */}
              {viewMode === 'grid' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Data de Emissão:</span>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{d._fmtEmissao || 'Sem data'}</span>
                  </div>
                  {itemIsProgram && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: isExpired ? 'var(--danger)' : 'inherit', fontWeight: isExpired ? '600' : 'normal' }}>Validade:</span>
                      <span style={{ fontWeight: '600', color: isExpired ? 'var(--danger)' : 'var(--primary)' }}>
                        {d._fmtValidade ? `${d._fmtValidade} ${isExpired ? '⚠️' : ''}` : 'Sem validade'}
                      </span>
                    </div>
                  )}
                  {d._fmtRevisao && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Última Revisão:</span>
                      <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{d._fmtRevisao}</span>
                    </div>
                  )}
                  {d._fmtDelivered && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Entregue em:</span>
                      <span style={{ fontWeight: '500', color: 'var(--secondary)' }}>{d._fmtDelivered}</span>
                    </div>
                  )}
                  <div style={{
                    marginTop: '0.25rem',
                    paddingTop: '0.375rem',
                    borderTop: '1px dashed var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <ShieldCheck size={13} color="var(--primary)" /> Supervisor:
                      </span>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)', textAlign: 'right' }}>
                        {d.supervisor || 'Não definido'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <UserCheck size={13} color="var(--secondary)" /> Resp. Técnico:
                      </span>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)', textAlign: 'right' }}>
                        {d.tecnicoResponsavel || 'Não definido'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Reason */}
              {d.reason && viewMode === 'grid' && (
                <div style={{ 
                  marginTop: '0.25rem', padding: '0.5rem', backgroundColor: '#fef2f2', 
                  border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem', color: 'var(--danger)'
                }}>
                  <strong>Motivo:</strong> {d.reason}
                </div>
              )}

              {/* Actions & File Group (List Mode Layout vs Grid) */}
              <div style={{ 
                display: 'flex', gap: '0.5rem', 
                flexDirection: viewMode === 'grid' ? 'column' : 'row',
                marginTop: viewMode === 'grid' ? 'auto' : '0',
                alignItems: viewMode === 'grid' ? 'stretch' : 'center',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: viewMode === 'grid' ? 'wrap' : 'nowrap', alignItems: 'center' }}>
                  {['pendente', 'agendado', 'em_elaboracao'].includes(d.status) && (
                    <>
                      <button
                        type="button"
                        className="btn"
                        onClick={(e) => { e.preventDefault(); handleChangeStatus(d.id, 'entregue'); }}
                        style={{
                          padding: viewMode === 'grid' ? '0.5rem' : '0.5rem 1rem', fontSize: '0.75rem',
                          backgroundColor: 'var(--secondary-light)', color: 'var(--secondary-hover)',
                          border: '1px solid var(--secondary)', borderRadius: 'var(--radius-md)',
                          fontWeight: '600', whiteSpace: 'nowrap'
                        }}
                      >
                        Marcar Entregue
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={(e) => { e.preventDefault(); handleChangeStatus(d.id, 'adiado'); }}
                        style={{
                          padding: viewMode === 'grid' ? '0.5rem' : '0.5rem 1rem', fontSize: '0.75rem',
                          backgroundColor: '#fef3c7', color: '#b45309',
                          border: '1px solid #f59e0b', borderRadius: 'var(--radius-md)',
                          fontWeight: '600', whiteSpace: 'nowrap'
                        }}
                      >
                        Adiar
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={(e) => { e.preventDefault(); handleChangeStatus(d.id, 'cancelado'); }}
                        style={{
                          padding: viewMode === 'grid' ? '0.5rem' : '0.5rem 1rem', fontSize: '0.75rem',
                          backgroundColor: '#fee2e2', color: 'var(--danger)',
                          border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)',
                          fontWeight: '600', whiteSpace: 'nowrap'
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={(e) => { e.preventDefault(); handleChangeStatus(d.id, 'nao_se_aplica'); }}
                        style={{
                          padding: viewMode === 'grid' ? '0.5rem' : '0.5rem 1rem', fontSize: '0.75rem',
                          backgroundColor: '#f3f4f6', color: '#4b5563',
                          border: '1px solid #9ca3af', borderRadius: 'var(--radius-md)',
                          fontWeight: '600', whiteSpace: 'nowrap'
                        }}
                      >
                        Não se aplica
                      </button>
                    </>
                  )}
                  {['entregue', 'feito', 'adiado', 'cancelado', 'nao_se_aplica'].includes(d.status) && !itemIsPcaPprAet && (
                    <button
                      type="button"
                      className="btn"
                      onClick={(e) => { e.preventDefault(); handleChangeStatus(d.id, 'pendente'); }}
                      style={{
                        padding: viewMode === 'grid' ? '0.5rem' : '0.5rem 1rem', fontSize: '0.75rem',
                        backgroundColor: '#fef3c7', color: '#b45309',
                        border: '1px solid #f59e0b', borderRadius: 'var(--radius-md)',
                        fontWeight: '600', whiteSpace: 'nowrap'
                      }}
                      title="Voltar o status para Pendente"
                    >
                      <Clock size={12} style={{ marginRight: '4px' }} />
                      Tornar Pendente
                    </button>
                  )}
                  <button
                    onClick={() => setEditingDeliverable(d)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
                      display: 'flex', transition: 'color 0.2s', padding: '0.375rem', marginLeft: ['pendente', 'agendado', 'em_elaboracao'].includes(d.status) ? 'auto' : '0'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    title="Editar"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(d.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
                      display: 'flex', transition: 'color 0.2s', padding: '0.375rem'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* File / Download */}
                <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column', width: viewMode === 'list' ? '200px' : 'auto' }}>
                  {d.fileName ? (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); window.open(getDocumentUrl(d.fileName), '_blank'); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center',
                        padding: '0.625rem', borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--background)', border: '1px solid var(--border)',
                        fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: '500',
                        transition: 'var(--transition)', cursor: 'pointer', width: '100%', whiteSpace: 'nowrap'
                      }}
                    >
                      <Download size={14} /> Baixar
                    </button>
                  ) : (
                    <label
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center',
                        padding: '0.625rem', borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--background)', border: '1px dashed var(--border)',
                        fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: '500',
                        cursor: uploadingId === d.id ? 'not-allowed' : 'pointer', width: '100%', whiteSpace: 'nowrap'
                      }}
                    >
                      <FileText size={14} /> {uploadingId === d.id ? '...' : 'Anexar PDF'}
                      <input 
                        type="file" 
                        accept=".pdf,.doc,.docx" 
                        style={{ display: 'none' }} 
                        disabled={uploadingId === d.id}
                        onChange={(e) => handleFileUpload(d.id, e.target.files[0], d.company_id || companyId)}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {visibleCount < filtered.length && (
        <div
          ref={sentinelRef}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1.25rem 1rem',
            marginTop: '1rem',
            flexWrap: 'wrap'
          }}
        >
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Exibindo <strong>{visibleDeliverables.length}</strong> de <strong>{filtered.length}</strong> entregáveis
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filtered.length))}
            style={{ fontSize: '0.8125rem', padding: '0.4rem 0.9rem' }}
          >
            Mostrar mais (+{Math.min(PAGE_SIZE, filtered.length - visibleCount)})
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setVisibleCount(filtered.length)}
            style={{ fontSize: '0.8125rem', padding: '0.4rem 0.9rem' }}
          >
            Mostrar todos ({filtered.length})
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
          <p>Nenhum entregável encontrado com os filtros selecionados.</p>
        </div>
      )}

      {showModal && (
        <AddDeliverableModal 
          companyId={companyId} 
          initialMode={modalInitialMode}
          onClose={() => setShowModal(false)}
          onSave={handleAddDeliverable}
        />
      )}

      {editingDeliverable && (
        <EditDeliverableModal
          deliverable={editingDeliverable}
          companyId={companyId}
          onClose={() => setEditingDeliverable(null)}
          onSave={handleEditSave}
        />
      )}

      {showReportModal && (
        <DeliverablesReportModal
          deliverables={deliverables}
          companies={companies}
          contracts={contracts}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
};

export default DeliverablesViewer;
