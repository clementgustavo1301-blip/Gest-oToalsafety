import React, { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import { getContractsByCompany } from '../services/storageService';

const AddDeliverableModal = ({ companyId, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('programa');
  const [contractId, setContractId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [validityDate, setValidityDate] = useState('');
  const [file, setFile] = useState(null);

  const [contracts, setContracts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoadingData(true);
      const ctrs = await getContractsByCompany(companyId);
      setContracts(ctrs);
      if (ctrs.length > 0) {
        setContractId(ctrs[0].id);
      }
      setLoadingData(false);
    }
    load();
  }, [companyId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;
    
    setSaving(true);
    await onSave({
      title: title.trim(),
      description: description.trim() || null,
      type,
      contractId: contractId || (contracts.length > 0 ? contracts[0].id : null),
      dueDate: dueDate || null,
      validityDate: validityDate || null,
      status: file ? 'entregue' : 'pendente', // Se anexar o arquivo na hora, já marca como entregue
      deliveredDate: file ? new Date().toISOString() : null,
      fileName: null,
      file: file
    });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary), var(--info))',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FileText size={18} color="white" />
            </div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Registrar Entregável</h2>
          </div>
          <button onClick={onClose} style={{ padding: '0.375rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {loadingData ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>Carregando dados...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Title */}
              <div>
                <label className="modal-label" htmlFor="dlv-title">Título do Documento</label>
                <input
                  id="dlv-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: PGR - Programa de Gerenciamento..."
                  className="modal-input"
                  autoFocus
                  required
                  disabled={saving}
                />
              </div>

              {/* Description */}
              <div>
                <label className="modal-label" htmlFor="dlv-desc">Descrição / Detalhes (Opcional)</label>
                <textarea
                  id="dlv-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes ou anotações sobre este entregável..."
                  className="modal-input"
                  rows="3"
                  disabled={saving}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Type & Contract */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="modal-label" htmlFor="dlv-type">Tipo</label>
                  <select
                    id="dlv-type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="modal-input"
                    disabled={saving}
                  >
                    <option value="programa">Programa</option>
                    <option value="laudo">Laudo</option>
                    <option value="contrato">Contrato</option>
                    <option value="documento">Documento</option>
                    <option value="treinamento">Treinamento</option>
                    <option value="visita_tecnica">Visita Técnica</option>
                  </select>
                </div>
                <div>
                  <label className="modal-label" htmlFor="dlv-contract">Contrato Vinculado</label>
                  <select
                    id="dlv-contract"
                    value={contractId}
                    onChange={(e) => setContractId(e.target.value)}
                    className="modal-input"
                    required
                    disabled={saving}
                  >
                    {contracts.length === 0 && <option value="">Sem contratos...</option>}
                    {contracts.map(c => (
                      <option key={c.id} value={c.id}>{c.contractNumber}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="modal-label" htmlFor="dlv-due">Data Limite (Prazo)</label>
                  <input
                    id="dlv-due"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="modal-input"
                    required
                    disabled={saving}
                  />
                </div>
                {type !== 'treinamento' && (
                  <div>
                    <label className="modal-label" htmlFor="dlv-validity">Validade do Documento</label>
                    <input
                      id="dlv-validity"
                      type="date"
                      value={validityDate}
                      onChange={(e) => setValidityDate(e.target.value)}
                      className="modal-input"
                      disabled={saving}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="modal-label">Anexar PDF Inicial (Opcional)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="modal-input"
                  style={{ padding: '0.5rem', cursor: 'pointer' }}
                  disabled={saving}
                />
              </div>

              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                {file 
                  ? <span>O item será cadastrado como <strong style={{color: 'var(--secondary-hover)'}}>Entregue</strong>.</span>
                  : <span>O item será cadastrado como <strong>Pendente</strong>.</span>
                }
              </p>

            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={!title.trim() || !dueDate || saving}>
                {saving ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddDeliverableModal;
