import React, { useState, useEffect } from 'react';
import { X, Edit3 } from 'lucide-react';
import { getContractsByCompany } from '../services/storageService';

const EditDeliverableModal = ({ deliverable, companyId, onClose, onSave }) => {
  const [title, setTitle] = useState(deliverable?.title || '');
  const [description, setDescription] = useState(deliverable?.description || '');
  const [type, setType] = useState(deliverable?.type || 'programa');
  const [contractId, setContractId] = useState(deliverable?.contractId || '');
  const [dueDate, setDueDate] = useState(deliverable?.dueDate || '');
  const [validityDate, setValidityDate] = useState(deliverable?.validityDate || '');
  const [deliveredDate, setDeliveredDate] = useState(deliverable?.deliveredDate || '');
  const [status, setStatus] = useState(deliverable?.status || 'pendente');

  const [contracts, setContracts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoadingData(true);
      // fallback if companyId isn't provided directly
      const compId = companyId || deliverable?.companyId || deliverable?.company_id;
      if (compId) {
        const ctrs = await getContractsByCompany(compId);
        setContracts(ctrs);
      }
      setLoadingData(false);
    }
    load();
  }, [companyId, deliverable]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    setSaving(true);
    await onSave(deliverable.id, {
      title: title.trim(),
      description: description.trim() || null,
      type,
      contractId: contractId || null,
      dueDate: dueDate || null,
      validityDate: validityDate || null,
      deliveredDate: deliveredDate || null,
      status
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
              <Edit3 size={18} color="white" />
            </div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Editar Entregável</h2>
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
                  className="modal-input"
                  autoFocus
                  required
                  disabled={saving}
                />
              </div>

              {/* Description */}
              <div>
                <label className="modal-label" htmlFor="dlv-desc">Descrição / Detalhes</label>
                <textarea
                  id="dlv-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                    disabled={saving}
                  >
                    <option value="">Sem vínculo</option>
                    {contracts.map(c => (
                      <option key={c.id} value={c.id}>{c.contractNumber}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="modal-label" htmlFor="dlv-due">Data Limite (Prazo)</label>
                  <input
                    id="dlv-due"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="modal-input"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="modal-label" htmlFor="dlv-status">Status</label>
                  <select
                    id="dlv-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="modal-input"
                    disabled={saving}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_elaboracao">Em Elaboração</option>
                    <option value="agendado">Agendado</option>
                    <option value="entregue">Entregue</option>
                    <option value="feito">Feito</option>
                    <option value="adiado">Adiado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>
              
              {type !== 'treinamento' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                  <div>
                    <label className="modal-label" htmlFor="dlv-delivered">Data de Entrega</label>
                    <input
                      id="dlv-delivered"
                      type="date"
                      value={deliveredDate}
                      onChange={(e) => setDeliveredDate(e.target.value)}
                      className="modal-input"
                      disabled={saving}
                    />
                  </div>
                </div>
              )}

            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={!title.trim() || saving}>
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditDeliverableModal;
