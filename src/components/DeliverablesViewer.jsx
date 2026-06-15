import React, { useState, useEffect } from 'react';
import {
  FileText, Download, Filter, Search,
  CheckCircle, Clock, AlertTriangle, FileSpreadsheet, File
} from 'lucide-react';
import {
  getDeliverablesByCompany, getContractsByCompany, addDeliverable, updateDeliverable,
  uploadDocument, getDocumentUrl
} from '../services/storageService';
import AddDeliverableModal from './AddDeliverableModal';

const TYPE_CONFIG = {
  programa: { label: 'Programa', icon: <FileSpreadsheet size={16} />, color: 'var(--primary)', bg: 'var(--primary-light)' },
  laudo: { label: 'Laudo', icon: <FileText size={16} />, color: '#d97706', bg: '#fef3c7' },
  contrato: { label: 'Contrato', icon: <File size={16} />, color: 'var(--secondary)', bg: 'var(--secondary-light)' },
  treinamento: { label: 'Treinamento', icon: <FileText size={16} />, color: 'var(--info)', bg: '#e0f2fe' },
  visita_tecnica: { label: 'Visita Técnica', icon: <FileText size={16} />, color: '#059669', bg: '#d1fae5' },
};

const STATUS_CONFIG = {
  entregue: { label: 'Entregue', icon: <CheckCircle size={14} />, color: 'var(--secondary-hover)', bg: 'var(--secondary-light)' },
  feito: { label: 'Feito', icon: <CheckCircle size={14} />, color: 'var(--secondary-hover)', bg: 'var(--secondary-light)' },
  pendente: { label: 'Pendente', icon: <Clock size={14} />, color: '#b45309', bg: '#fef3c7' },
  em_elaboracao: { label: 'Em Elaboração', icon: <AlertTriangle size={14} />, color: 'var(--primary)', bg: 'var(--primary-light)' },
  adiado: { label: 'Adiado', icon: <AlertTriangle size={14} />, color: '#b45309', bg: '#fef3c7' },
  cancelado: { label: 'Cancelado', icon: <AlertTriangle size={14} />, color: 'var(--danger)', bg: '#fee2e2' },
};

const DeliverablesViewer = ({ companyId }) => {
  const [filterType, setFilterType] = useState('all');
  const [filterContract, setFilterContract] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  const [deliverables, setDeliverables] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    const [delivs, ctrs] = await Promise.all([
      getDeliverablesByCompany(companyId),
      getContractsByCompany(companyId)
    ]);
    setDeliverables(delivs);
    setContracts(ctrs);
    setLoading(false);
  };

  useEffect(() => {
    if (companyId) loadData();
  }, [companyId]);

  const handleAddDeliverable = async (data) => {
    let fileName = null;
    if (data.file) {
      fileName = await uploadDocument(data.file, `deliverables/${companyId}`);
    }
    await addDeliverable({ ...data, fileName, companyId });
    setShowModal(false);
    await loadData();
  };

  const handleChangeStatus = async (deliverableId, newStatus) => {
    let reason = null;
    if (newStatus === 'adiado' || newStatus === 'cancelado') {
      reason = window.prompt(`Digite o motivo para marcar como ${newStatus}:`);
      if (reason === null) return; // User cancelled prompt
    }
    await updateDeliverable(deliverableId, { status: newStatus, reason });
    await loadData();
  };

  const handleFileUpload = async (deliverableId, file) => {
    if (!file) return;
    setUploadingId(deliverableId);
    
    const filePath = await uploadDocument(file, `deliverables/${companyId}`);
    if (filePath) {
      await updateDeliverable(deliverableId, { fileName: filePath, status: 'feito', deliveredDate: new Date().toISOString() });
      await loadData();
    } else {
      alert('Erro ao fazer upload do arquivo.');
    }
    setUploadingId(null);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando entregáveis...</div>;
  }

  const filtered = deliverables.filter(d => {
    const matchType = filterType === 'all' || d.type === filterType;
    const matchContract = filterContract === 'all' || d.contractId === filterContract;
    const matchSearch = !searchTerm || d.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchType && matchContract && matchSearch;
  });

  const stats = {
    total: deliverables.length,
    entregue: deliverables.filter(d => d.status === 'entregue' || d.status === 'feito').length,
    pendente: deliverables.filter(d => d.status === 'pendente').length,
    em_elaboracao: deliverables.filter(d => d.status === 'em_elaboracao').length,
  };

  return (
    <div>
      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total', value: stats.total, color: 'var(--text-primary)', bg: 'var(--surface)' },
          { label: 'Entregues', value: stats.entregue, color: 'var(--secondary)', bg: 'var(--secondary-light)' },
          { label: 'Pendentes', value: stats.pendente, color: '#b45309', bg: '#fef3c7' },
          { label: 'Em Elaboração', value: stats.em_elaboracao, color: 'var(--primary)', bg: 'var(--primary-light)' },
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} color="var(--text-secondary)" />
          <select
            id="filter-type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', fontSize: '0.8125rem',
              backgroundColor: 'var(--surface)', color: 'var(--text-primary)',
              fontFamily: 'inherit', cursor: 'pointer'
            }}
          >
            <option value="all">Todos os tipos</option>
            <option value="programa">Programas</option>
            <option value="laudo">Laudos</option>
            <option value="contrato">Contratos</option>
            <option value="treinamento">Treinamentos</option>
            <option value="visita_tecnica">Visitas Técnicas</option>
          </select>
          <select
            id="filter-contract"
            value={filterContract}
            onChange={(e) => setFilterContract(e.target.value)}
            style={{
              padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', fontSize: '0.8125rem',
              backgroundColor: 'var(--surface)', color: 'var(--text-primary)',
              fontFamily: 'inherit', cursor: 'pointer'
            }}
          >
            <option value="all">Todos os contratos</option>
            {contracts.map(c => (
              <option key={c.id} value={c.id}>{c.contractNumber}</option>
            ))}
          </select>
          {companyId && (
            <button 
              className="btn btn-primary" 
              onClick={() => setShowModal(true)}
              style={{ marginLeft: 'auto' }}
            >
              Registrar Entregável
            </button>
          )}
        </div>
      </div>

      {/* Deliverables Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
        {filtered.map(d => {
          const typeConf = TYPE_CONFIG[d.type] || TYPE_CONFIG.contrato;
          const statusConf = STATUS_CONFIG[d.status] || STATUS_CONFIG.pendente;

          return (
            <div key={d.id} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.25rem 0.625rem', borderRadius: '1rem',
                  backgroundColor: typeConf.bg, color: typeConf.color,
                  fontSize: '0.75rem', fontWeight: '600'
                }}>
                  {typeConf.icon} {typeConf.label}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.125rem 0.5rem', borderRadius: '1rem',
                  backgroundColor: statusConf.bg, color: statusConf.color,
                  fontSize: '0.6875rem', fontWeight: '500'
                }}>
                  {statusConf.icon} {statusConf.label}
                </div>
              </div>

              {/* Title */}
              <h4 style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9375rem', lineHeight: 1.4 }}>
                {d.title}
              </h4>

              {/* Meta */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Data Limite:</span>
                  <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{d.dueDate ? new Date(d.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : ''}</span>
                </div>
                {d.validityDate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Validade:</span>
                    <span style={{ fontWeight: '500', color: 'var(--primary)' }}>{new Date(d.validityDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
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
              {/* Reason */}
              {d.reason && (
                <div style={{ 
                  marginTop: '0.25rem', padding: '0.5rem', backgroundColor: '#fef2f2', 
                  border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem', color: 'var(--danger)'
                }}>
                  <strong>Motivo:</strong> {d.reason}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', flexWrap: 'wrap' }}>
                {d.status !== 'feito' && d.status !== 'entregue' && d.type !== 'treinamento' && (
                  <button
                    className="btn"
                    onClick={() => handleChangeStatus(d.id, 'feito')}
                    style={{
                      flex: 1, padding: '0.5rem', fontSize: '0.75rem',
                      backgroundColor: 'var(--secondary-light)', color: 'var(--secondary-hover)',
                      border: '1px solid var(--secondary)', borderRadius: 'var(--radius-md)',
                      fontWeight: '600'
                    }}
                  >
                    Marcar Feito
                  </button>
                )}
                {d.status !== 'adiado' && d.type !== 'treinamento' && (
                  <button
                    className="btn"
                    onClick={() => handleChangeStatus(d.id, 'adiado')}
                    style={{
                      flex: 1, padding: '0.5rem', fontSize: '0.75rem',
                      backgroundColor: '#fef3c7', color: '#b45309',
                      border: '1px solid #f59e0b', borderRadius: 'var(--radius-md)',
                      fontWeight: '600'
                    }}
                  >
                    Adiar
                  </button>
                )}
                {d.status !== 'cancelado' && d.type !== 'treinamento' && (
                  <button
                    className="btn"
                    onClick={() => handleChangeStatus(d.id, 'cancelado')}
                    style={{
                      flex: 1, padding: '0.5rem', fontSize: '0.75rem',
                      backgroundColor: '#fee2e2', color: 'var(--danger)',
                      border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)',
                      fontWeight: '600'
                    }}
                  >
                    Cancelar
                  </button>
                )}
              </div>

              {/* File / Download */}
              <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                {d.fileName ? (
                  <button
                    onClick={() => window.open(getDocumentUrl(d.fileName), '_blank')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center',
                      padding: '0.625rem', borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--background)', border: '1px solid var(--border)',
                      fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: '500',
                      transition: 'var(--transition)', cursor: 'pointer', width: '100%'
                    }}
                  >
                    <Download size={14} /> Baixar / Visualizar Anexo
                  </button>
                ) : (
                  <label
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center',
                      padding: '0.625rem', borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--background)', border: '1px dashed var(--border)',
                      fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: '500',
                      cursor: uploadingId === d.id ? 'not-allowed' : 'pointer', width: '100%'
                    }}
                  >
                    <FileText size={14} /> {uploadingId === d.id ? 'Enviando...' : 'Anexar Documento (PDF)'}
                    <input 
                      type="file" 
                      accept=".pdf,.doc,.docx" 
                      style={{ display: 'none' }} 
                      disabled={uploadingId === d.id}
                      onChange={(e) => handleFileUpload(d.id, e.target.files[0])}
                    />
                  </label>
                )}
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
    </div>
  );
};

export default DeliverablesViewer;
