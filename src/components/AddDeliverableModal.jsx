import React, { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import { getContractsByCompany, getProfiles } from '../services/storageService';
import { STANDARD_DELIVERABLES } from '../data/deliverables';

const AddDeliverableModal = ({ companyId, onClose, onSave, initialType = 'programa' }) => {
  const [selectedDeliverable, setSelectedDeliverable] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState(initialType);
  const [contractId, setContractId] = useState('');
  const [dataEnvio, setDataEnvio] = useState('');
  const [validityDate, setValidityDate] = useState('');
  const [ultimaRevisao, setUltimaRevisao] = useState('');
  const [deliveredDate, setDeliveredDate] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [file, setFile] = useState(null);

  const [recurrence, setRecurrence] = useState('none');
  const [customDays, setCustomDays] = useState(7);
  const [repeatCount, setRepeatCount] = useState(4);

  const [contracts, setContracts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoadingData(true);
      const [ctrs, profs] = await Promise.all([
        getContractsByCompany(companyId),
        getProfiles()
      ]);
      setContracts(ctrs);
      setProfiles(profs);
      setLoadingData(false);
    }
    load();
  }, [companyId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !dataEnvio) return;
    
    setSaving(true);
    
    const baseItem = {
      title: title.trim(),
      description: description.trim() || null,
      type,
      contractId: contractId || null,
      dueDate: dataEnvio,
      dataEnvio,
      dataEmissao: dataEnvio,
      data_emissao: dataEnvio,
      data_envio: dataEnvio,
      validityDate: validityDate || null,
      ultimaRevisao: ultimaRevisao || null,
      status: file ? 'entregue' : 'pendente',
      deliveredDate: deliveredDate || dataEnvio || (file ? new Date().toISOString() : null),
      responsibleId: responsibleId || null,
      fileName: null,
      file: file
    };

    const itemsToSave = [];
    
    if ((type === 'treinamento' || type === 'visita_tecnica') && recurrence !== 'none') {
       let currentDueDate = new Date(dataEnvio);
       for (let i = 0; i <= repeatCount; i++) {
           let dateStr = currentDueDate.toISOString().split('T')[0];
           
           itemsToSave.push({
               ...baseItem,
               dueDate: dateStr,
               dataEnvio: dateStr,
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
       itemsToSave.push({ ...baseItem, dueDate: dataEnvio, dataEnvio });
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
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Novo Entregável</h2>
          </div>
          <button onClick={onClose} style={{ padding: '0.375rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {loadingData ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>Carregando dados...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '75vh', overflowY: 'auto' }}>
              
              {/* Deliverable Select */}
              <div>
                <label className="modal-label" htmlFor="dlv-select">Entregável Padronizado</label>
                <select
                  id="dlv-select"
                  value={selectedDeliverable}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedDeliverable(val);
                    if (val === 'outro') {
                      setTitle('');
                      setDescription('');
                    } else if (val) {
                      const found = STANDARD_DELIVERABLES.find(d => d.value === val);
                      if (found) {
                        setTitle(found.label);
                        setType(found.defaultType);
                        if (found.description) setDescription(found.description);
                      }
                    }
                  }}
                  className="modal-input"
                  disabled={saving}
                >
                  <option value="">Selecione um entregável...</option>
                  {STANDARD_DELIVERABLES.map(d => (
                    <option key={d.value} value={d.value}>{d.label} ({d.defaultType})</option>
                  ))}
                  <option value="outro">Outro (personalizado)</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="modal-label" htmlFor="dlv-title">Título do Entregável *</label>
                <input
                  id="dlv-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: PGR - Programa de Gerenciamento de Riscos"
                  className="modal-input"
                  required
                  disabled={saving}
                />
              </div>

              {/* Description */}
              <div>
                <label className="modal-label" htmlFor="dlv-desc">Descrição / Observações</label>
                <textarea
                  id="dlv-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes adicionais do laudo, programa ou visita..."
                  className="modal-input"
                  rows="2"
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
                    <option value="">Sem vínculo</option>
                    {contracts.map(c => (
                      <option key={c.id} value={c.id}>{c.contractNumber}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Datas: Data de Emissão (OBRIGATÓRIO), Validade (NÃO OBRIGATÓRIO), Última Revisão (NÃO OBRIGATÓRIO) */}
              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--surface-hover, #f8fafc)',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--border, #e2e8f0)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div>
                  <label className="modal-label" htmlFor="dlv-envio" style={{ fontWeight: '600' }}>
                    Data de Emissão <span style={{ color: '#ef4444', fontWeight: 'bold' }}>* (Obrigatório)</span>
                  </label>
                  <input
                    id="dlv-envio"
                    type="date"
                    value={dataEnvio}
                    onChange={(e) => setDataEnvio(e.target.value)}
                    className="modal-input"
                    required
                    disabled={saving}
                  />
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
                    Data de emissão prevista ou realizada do documento ao cliente.
                  </span>
                </div>

                <div className="grid-responsive-2">
                  <div>
                    <label className="modal-label" htmlFor="dlv-validity">
                      Data de Validade (Opcional)
                    </label>
                    <input
                      id="dlv-validity"
                      type="date"
                      value={validityDate}
                      onChange={(e) => setValidityDate(e.target.value)}
                      className="modal-input"
                      disabled={saving}
                    />
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
                      Não obrigatório
                    </span>
                  </div>

                  <div>
                    <label className="modal-label" htmlFor="dlv-revisao">
                      Última Revisão (Opcional)
                    </label>
                    <input
                      id="dlv-revisao"
                      type="date"
                      value={ultimaRevisao}
                      onChange={(e) => setUltimaRevisao(e.target.value)}
                      className="modal-input"
                      disabled={saving}
                    />
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
                      Não obrigatório
                    </span>
                  </div>
                </div>
              </div>

              {/* Responsável */}
              <div>
                <label className="modal-label" htmlFor="dlv-responsible">Responsável (Técnico)</label>
                <select
                  id="dlv-responsible"
                  value={responsibleId}
                  onChange={(e) => setResponsibleId(e.target.value)}
                  className="modal-input"
                  disabled={saving}
                >
                  <option value="">Nenhum</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                  ))}
                </select>
              </div>

              {/* Repetição para Treinamento / Visita Técnica */}
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
                        <label className="modal-label">Quantas repetições?</label>
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

              {/* Arquivo PDF */}
              <div>
                <label className="modal-label" htmlFor="dlv-file">Documento (PDF)</label>
                <input
                  id="dlv-file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files[0] || null)}
                  className="modal-input"
                  disabled={saving}
                  style={{ padding: '0.5rem' }}
                />
              </div>

            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={!title.trim() || !dataEnvio || saving}>
                {saving ? 'Salvando...' : 'Adicionar Entregável'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddDeliverableModal;
