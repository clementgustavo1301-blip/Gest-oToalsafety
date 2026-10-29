import React, { useState, useEffect } from 'react';
import {
  FileText, Download, Filter, Search,
  CheckCircle, Clock, AlertTriangle, FileSpreadsheet, File,
  LayoutGrid, List as ListIcon, Edit3, Trash2
} from 'lucide-react';
import {
  getDeliverablesByCompany, getContractsByCompany, addDeliverable, updateDeliverable,
  uploadDocument, getDocumentUrl, getAllDeliverablesSummary, getContracts, getCompanies, deleteDeliverable,
  deleteDeliverables
} from '../services/storageService';
import { isItemExpired, isDelivered, getEffectiveValidityDate, isLaudo, isProgram } from '../utils/deliverableTiming';
import AddDeliverableModal from './AddDeliverableModal';
import EditDeliverableModal from './EditDeliverableModal';

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

const DeliverablesViewer = ({ companyId }) => {
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterContract, setFilterContract] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  
  const [deliverables, setDeliverables] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const [editingDeliverable, setEditingDeliverable] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deletingBulk, setDeletingBulk] = useState(false);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    if (companyId) {
      const [delivs, ctrs] = await Promise.all([
        getDeliverablesByCompany(companyId),
        getContractsByCompany(companyId)
      ]);
      setDeliverables(delivs);
      setContracts(ctrs);
    } else {
      const [delivs, ctrs, comps] = await Promise.all([
        getAllDeliverablesSummary(),
        getContracts(),
        getCompanies()
      ]);
      setDeliverables(delivs);
      setContracts(ctrs);
      setCompanies(comps);
    }
    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    loadData(true);
  }, [companyId]);

  const handleAddDeliverable = async (dataOrArray) => {
    const items = Array.isArray(dataOrArray) ? dataOrArray : [dataOrArray];
    
    let fileName = null;
    if (items[0].file) {
      fileName = await uploadDocument(items[0].file, `deliverables/${companyId}`);
    }

    for (const data of items) {
      await addDeliverable({ ...data, fileName, companyId });
    }

    setShowModal(false);
    await loadData(false);
  };

  const handleChangeStatus = async (deliverableId, newStatus) => {
    let reason = null;
    if (newStatus === 'adiado' || newStatus === 'cancelado') {
      reason = window.prompt(`Digite o motivo para marcar como ${newStatus}:`);
      if (reason === null) return; // User cancelled prompt
    }
    await updateDeliverable(deliverableId, { status: newStatus, reason });
    await loadData(false);
  };

  const handleFileUpload = async (deliverableId, file, destCompanyId) => {
    if (!file) return;
    setUploadingId(deliverableId);
    
    const filePath = await uploadDocument(file, `deliverables/${destCompanyId || companyId}`);
    if (filePath) {
      await updateDeliverable(deliverableId, { fileName: filePath, status: 'entregue', deliveredDate: new Date().toISOString() });
      await loadData(false);
    } else {
      alert('Erro ao fazer upload do arquivo.');
    }
    setUploadingId(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este entregável?')) {
      await deleteDeliverable(id);
      setSelectedIds(prev => prev.filter(x => x !== id));
      await loadData(false);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const visibleIds = filtered.map(d => d.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
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
    } catch (err) {
      console.error('Erro ao excluir entregáveis:', err);
      alert('Erro ao excluir os entregáveis selecionados.');
    } finally {
      setDeletingBulk(false);
    }
  };

  const handleEditSave = async (id, updates) => {
    await updateDeliverable(id, updates);
    setEditingDeliverable(null);
    await loadData(false);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando entregáveis...</div>;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filtered = deliverables.filter(d => {
    const matchType = filterType === 'all' || d.type === filterType;
    const isExpired = isItemExpired(d, today);
    
    let matchStatus = false;
    if (filterStatus === 'all') matchStatus = true;
    else if (filterStatus === 'vencido') matchStatus = isExpired;
    else if (filterStatus === 'entregue') matchStatus = isDelivered(d) && !isExpired;
    else matchStatus = d.status === filterStatus;

    const matchContract = filterContract === 'all' || d.contractId === filterContract;
    const matchCompany = filterCompany === 'all' || d.companyId === filterCompany;
    const matchSearch = !searchTerm || 
      d.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (d.companyName && d.companyName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchType && matchStatus && matchContract && matchSearch && matchCompany;
  });

  const stats = {
    total: deliverables.length,
    entregue: deliverables.filter(d => isDelivered(d) && !isItemExpired(d, today)).length,
    pendente: deliverables.filter(d => !isDelivered(d) && !isItemExpired(d, today) && d.status !== 'cancelado').length,
    em_elaboracao: deliverables.filter(d => d.status === 'em_elaboracao').length,
    vencidos: deliverables.filter(d => isItemExpired(d, today)).length,
  };

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
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
          <Search size={18} color="var(--text-secondary)" />
          <input
            id="search-deliverables"
            type="text"
            placeholder="Buscar entregável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: '0.875rem',
              backgroundColor: 'transparent', color: 'var(--text-primary)', fontFamily: 'inherit'
            }}
          />
        </div>
        <div className="filters-actions">
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginRight: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                padding: '0.375rem 0.5rem',
                backgroundColor: viewMode === 'grid' ? 'var(--primary-light)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--primary)' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
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
            >
              <ListIcon size={16} />
            </button>
          </div>
          <Filter size={16} color="var(--text-secondary)" />
          {!companyId && (
            <select
              id="filter-company"
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="filter-select"
            >
              <option value="all">Todas as empresas</option>
              {[...companies]
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                .map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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
          {companyId && (
            <button 
              type="button"
              className="btn btn-primary" 
              onClick={() => setShowModal(true)}
              style={{ marginLeft: 'auto' }}
            >
              Registrar Entregável
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
                checked={filtered.length > 0 && filtered.every(d => selectedIds.includes(d.id))}
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
        {filtered.map(d => {
          const itemIsProgram = d.type === 'programa' && isProgram(d);
          const typeConf = TYPE_CONFIG[d.type] || TYPE_CONFIG.contrato;
          const isExpired = isItemExpired(d, today);
          const effectiveStatus = (!itemIsProgram && d.status === 'vencido') ? 'pendente' : d.status;
          const statusConf = isExpired ? STATUS_CONFIG.vencido : (STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.pendente);

          return (
            <div key={d.id} className="card" style={{ 
              padding: '1.25rem', display: 'flex', 
              flexDirection: viewMode === 'grid' ? 'column' : 'row', 
              gap: viewMode === 'grid' ? '0.75rem' : '1.5rem',
              alignItems: viewMode === 'grid' ? 'stretch' : 'center',
              border: selectedIds.includes(d.id) ? '1.5px solid var(--primary)' : isExpired ? '1px solid #fca5a5' : '1px solid var(--border)',
              borderLeft: isExpired ? '4px solid #dc2626' : undefined,
              backgroundColor: selectedIds.includes(d.id) ? 'rgba(14, 165, 233, 0.04)' : isExpired ? '#fffbfa' : 'var(--surface)',
              transition: 'all 0.2s ease'
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
                    checked={selectedIds.includes(d.id)}
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
                {!companyId && d.companyName && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <FileText size={12} /> {d.companyName}
                  </p>
                )}
                {/* Meta details if in list mode to save space */}
                {viewMode === 'list' && (
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                    {(d.dataEmissao || d.dataEnvio) && <span>Data de Emissão: <strong style={{ color: 'var(--text-primary)' }}>{new Date(d.dataEmissao || d.dataEnvio).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</strong></span>}
                    {itemIsProgram && (() => {
                      const effVal = getEffectiveValidityDate(d);
                      if (effVal) {
                        return (
                          <span style={{ color: isExpired ? '#dc2626' : 'inherit', fontWeight: isExpired ? '700' : 'normal' }}>
                            Validade: {new Date(effVal).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} {isExpired && '⚠️ Vencido'}
                          </span>
                        );
                      }
                      return <span>Validade: <strong style={{ color: 'var(--text-secondary)' }}>Sem validade</strong></span>;
                    })()}
                    {d.ultimaRevisao && (
                      <span>Revisão: <strong style={{ color: 'var(--text-primary)' }}>{new Date(d.ultimaRevisao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</strong></span>
                    )}
                    {d.deliveredDate && <span>Entregue em: {new Date(d.deliveredDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>}
                    <span>Contrato: {contracts.find(c => c.id === d.contractId)?.contractNumber || 'N/A'}</span>
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
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{(d.dataEmissao || d.dataEnvio) ? new Date(d.dataEmissao || d.dataEnvio).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Sem data'}</span>
                  </div>
                  {itemIsProgram && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: isExpired ? 'var(--danger)' : 'inherit', fontWeight: isExpired ? '600' : 'normal' }}>Validade:</span>
                      <span style={{ fontWeight: '600', color: isExpired ? 'var(--danger)' : 'var(--primary)' }}>
                        {(() => {
                          const effVal = getEffectiveValidityDate(d);
                          if (effVal) {
                            return `${new Date(effVal).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} ${isExpired ? '⚠️' : ''}`;
                          }
                          return 'Sem validade';
                        })()}
                      </span>
                    </div>
                  )}
                  {d.ultimaRevisao && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Última Revisão:</span>
                      <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{new Date(d.ultimaRevisao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                    </div>
                  )}
                  {d.deliveredDate && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Entregue em:</span>
                      <span style={{ fontWeight: '500', color: 'var(--secondary)' }}>{new Date(d.deliveredDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Contrato:</span>
                    <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                      {contracts.find(c => c.id === d.contractId)?.contractNumber || 'N/A'}
                    </span>
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
                  {['entregue', 'feito', 'adiado', 'cancelado', 'nao_se_aplica'].includes(d.status) && (
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

      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
          <p>Nenhum entregável encontrado com os filtros selecionados.</p>
        </div>
      )}

      {showModal && (
        <AddDeliverableModal 
          companyId={companyId} 
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
    </div>
  );
};

export default DeliverablesViewer;
