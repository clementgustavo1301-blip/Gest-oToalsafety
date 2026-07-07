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
  const [deliveredDate, setDeliveredDate] = useState('');
  const [file, setFile] = useState(null);

  const [recurrence, setRecurrence] = useState('none');
  const [customDays, setCustomDays] = useState(7);
  const [repeatCount, setRepeatCount] = useState(4);

  const [contracts, setContracts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoadingData(true);
      const ctrs = await getContractsByCompany(companyId);
      setContracts(ctrs);
      setLoadingData(false);
    }
    load();
  }, [companyId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;
    
    setSaving(true);
    
    const baseItem = {
      title: title.trim(),
      description: description.trim() || null,
      type,
      contractId: contractId || null,
      validityDate: validityDate || null,
      status: file ? 'entregue' : 'pendente',
      deliveredDate: deliveredDate || (file ? new Date().toISOString() : null),
      fileName: null,
      file: file
    };

    const itemsToSave = [];
    
    if ((type === 'treinamento' || type === 'visita_tecnica') && recurrence !== 'none') {
       let currentDueDate = new Date(dueDate);
       for (let i = 0; i <= repeatCount; i++) {
           let dateStr = currentDueDate.toISOString().split('T')[0];
           
           itemsToSave.push({
               ...baseItem,
               dueDate: dateStr,
           });

           if (recurrence === 'weekly' || recurrence === 'weekly_same_day') {
               currentDueDate.setDate(currentDueDate.getDate() + 7);
           } else if (recurrence === 'monthly') {
               const originalDate = new Date(dateStr);
               const weekday = originalDate.getDay();
               const nth = Math.ceil(originalDate.getDate() / 7);
               
               currentDueDate.setMonth(currentDueDate.getMonth() + 1);
               currentDueDate.setDate(1);
               while (currentDueDate.getDay() !== weekday) {
                   currentDueDate.setDate(currentDueDate.getDate() + 1);
               }
               currentDueDate.setDate(currentDueDate.getDate() + (nth - 1) * 7);
               
               // If it spilled over to the next month, pull back by 1 week
               if (currentDueDate.getMonth() !== (originalDate.getMonth() + 1) % 12) {
                   currentDueDate.setDate(currentDueDate.getDate() - 7);
               }
           } else if (recurrence === 'custom_same_day') {
               const weeksToAdd = Math.round(customDays / 7) || 1;
               currentDueDate.setDate(currentDueDate.getDate() + (weeksToAdd * 7));
           } else if (recurrence === 'custom') {
               currentDueDate.setDate(currentDueDate.getDate() + customDays);
           }
       }
    } else {
       itemsToSave.push({ ...baseItem, dueDate });
    }

    await onSave(itemsToSave);
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
              <div className="grid-responsive-2">
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
                    <option value="">Sem vínculo (Opcional)</option>
                    {contracts.map(c => (
                      <option key={c.id} value={c.id}>{c.contractNumber}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid-responsive-2">
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <div>
                  <label className="modal-label" htmlFor="dlv-delivered">Data de Entrega (Opcional)</label>
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

              {(type === 'treinamento' || type === 'visita_tecnica') && (
                <div style={{ padding: '1rem', backgroundColor: 'var(--surface-light)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <label className="modal-label">Repetição (Opcional)</label>
                  <select
                    className="modal-input"
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value)}
                    disabled={saving}
                  >
                  <option value="none">Não repetir (padrão)</option>
                  <option value="weekly">Semanalmente (a cada 7 dias)</option>
                  <option value="weekly_same_day">Semanalmente (no mesmo dia da semana)</option>
                  <option value="monthly">Mensalmente (no mesmo dia da semana)</option>
                  <option value="custom">Personalizado (a cada X dias)</option>
                  <option value="custom_same_day">Personalizado (a cada X dias no mesmo dia da semana)</option>
                  </select>

                  {recurrence !== 'none' && (
                    <div className={recurrence === 'custom' || recurrence === 'custom_same_day' ? 'grid-responsive-2' : ''} style={{ display: 'grid', gridTemplateColumns: (recurrence === 'custom' || recurrence === 'custom_same_day') ? undefined : '1fr', gap: '1rem', marginTop: '1rem' }}>
                      {(recurrence === 'custom' || recurrence === 'custom_same_day') && (
                        <div>
                          <label className="modal-label">A cada quantos dias?</label>
                          <input
                            type="number"
                            min="1"
                            className="modal-input"
                            value={customDays}
                            onChange={(e) => setCustomDays(parseInt(e.target.value) || 1)}
                            disabled={saving}
                          />
                        </div>
                      )}
                      <div>
                        <label className="modal-label">Nº de ocorrências futuras (além da 1ª)</label>
                        <input
                          type="number"
                          min="1"
                          max="52"
                          className="modal-input"
                          value={repeatCount}
                          onChange={(e) => setRepeatCount(parseInt(e.target.value) || 1)}
                          disabled={saving}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

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
