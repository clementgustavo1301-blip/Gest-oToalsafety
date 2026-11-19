import React, { useState, useEffect } from 'react';
import { X, FileText, ShieldCheck, UserCheck } from 'lucide-react';
import { getContractsByCompany, getCompanyById, getGroups, resolveCompaniesWithHeritage } from '../services/storageService';
import { STANDARD_DELIVERABLES } from '../data/deliverables';
import { getDefaultValidityMonths, parseSafeDate, isProgram, isPcaPprAet } from '../utils/deliverableTiming';

const AddDeliverableModal = ({ companyId, onClose, onSave, initialType = 'programa' }) => {
  const [selectedDeliverable, setSelectedDeliverable] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState(initialType);
  const [status, setStatus] = useState('pendente');
  const [contractId, setContractId] = useState('');
  const [dataEnvio, setDataEnvio] = useState('');
  const [validityDate, setValidityDate] = useState('');
  const [validityManuallyEdited, setValidityManuallyEdited] = useState(false);
  const [ultimaRevisao, setUltimaRevisao] = useState('');
  const [deliveredDate] = useState('');
  const [file, setFile] = useState(null);

  const isNotApplicableItem = isPcaPprAet({ title, type }) || status === 'nao_se_aplica';
  const showValidityField = !isNotApplicableItem && type === 'programa' && isProgram({ title, type });

  const updateSuggestedValidity = (curTitle, curType, curDateEnvio, curStatus = status) => {
    if (isPcaPprAet({ title: curTitle, type: curType }) || curStatus === 'nao_se_aplica') {
      setValidityDate('');
      return;
    }
    if (curType !== 'programa' && !isProgram({ title: curTitle, type: curType })) {
      setValidityDate('');
      return;
    }
    if (validityManuallyEdited || !curDateEnvio) return;
    const months = getDefaultValidityMonths({ title: curTitle, type: curType });
    if (months) {
      const base = parseSafeDate(curDateEnvio);
      if (base) {
        const calc = new Date(base.getTime());
        calc.setMonth(calc.getMonth() + months);
        setValidityDate(calc.toISOString().split('T')[0]);
      }
    } else {
      setValidityDate('');
    }
  };

  const [recurrence, setRecurrence] = useState('none');
  const [customDays, setCustomDays] = useState(7);
  const [repeatCount, setRepeatCount] = useState(4);

  const [contracts, setContracts] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoadingData(true);
      const [ctrs, comp, groups] = await Promise.all([
        companyId ? getContractsByCompany(companyId) : Promise.resolve([]),
        companyId ? getCompanyById(companyId) : Promise.resolve(null),
        getGroups()
      ]);
      setContracts(ctrs || []);
      if (comp) {
        const resolved = resolveCompaniesWithHeritage([comp], groups || [])[0];
        setCompanyInfo(resolved || comp);
      } else {
        setCompanyInfo(null);
      }
      setLoadingData(false);
    }
    load();
  }, [companyId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!isNotApplicableItem && !dataEnvio) return;

    setSaving(true);
    const effectiveDate = dataEnvio || new Date().toISOString().split('T')[0];
    const effectiveStatus = file ? 'entregue' : (isPcaPprAet({ title, type }) ? (status === 'cancelado' ? 'cancelado' : 'nao_se_aplica') : status);

    const baseItem = {
      title: title.trim(),
      description: description.trim() || null,
      type,
      contractId: contractId || null,
      dueDate: effectiveDate,
      dataEnvio: effectiveDate,
      dataEmissao: effectiveDate,
      data_emissao: effectiveDate,
      data_envio: effectiveDate,
      validityDate: (!isNotApplicableItem && type === 'programa' && isProgram({ title, type })) ? (validityDate || null) : null,
      ultimaRevisao: ultimaRevisao || null,
      status: effectiveStatus,
      deliveredDate: deliveredDate || (file ? new Date().toISOString().split('T')[0] : null),
      responsibleId: companyInfo?.responsibleId || null,
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
                      setStatus('pendente');
                    } else if (val) {
                      const found = STANDARD_DELIVERABLES.find(d => d.value === val);
                      if (found) {
                        const nextStatus = found.defaultStatus || (isPcaPprAet({ title: found.label, type: found.defaultType }) ? 'nao_se_aplica' : 'pendente');
                        setTitle(found.label);
                        setType(found.defaultType);
                        setStatus(nextStatus);
                        if (found.description) setDescription(found.description);
                        if (found.defaultType === 'programa' && nextStatus !== 'nao_se_aplica' && !isPcaPprAet({ title: found.label, type: found.defaultType })) {
                          updateSuggestedValidity(found.label, found.defaultType, dataEnvio, nextStatus);
                        } else {
                          setValidityDate('');
                          setValidityManuallyEdited(false);
                        }
                      }
                    }
                  }}
                  className="modal-input"
                  disabled={saving}
                >
                  <option value="">Selecione um entregável...</option>
                  {STANDARD_DELIVERABLES.map(d => (
                    <option key={d.value} value={d.value}>{d.label} ({d.defaultType}){d.defaultStatus === 'nao_se_aplica' ? ' — Não Se Aplica' : ''}</option>
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setTitle(val);
                    if (isPcaPprAet({ title: val, type })) {
                      setStatus('nao_se_aplica');
                      setValidityDate('');
                    } else {
                      updateSuggestedValidity(val, type, dataEnvio, status);
                    }
                  }}
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

              {/* Type & Status */}
              <div className="grid-responsive-2">
                <div>
                  <label className="modal-label" htmlFor="dlv-type">Tipo</label>
                  <select
                    id="dlv-type"
                    value={type}
                    onChange={(e) => {
                      const val = e.target.value;
                      setType(val);
                      if (val === 'programa' && !isPcaPprAet({ title, type: val }) && status !== 'nao_se_aplica') {
                        updateSuggestedValidity(title, val, dataEnvio, status);
                      } else {
                        setValidityDate('');
                        setValidityManuallyEdited(false);
                      }
                    }}
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
                  <label className="modal-label" htmlFor="dlv-status">Status</label>
                  <select
                    id="dlv-status"
                    value={status}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStatus(val);
                      if (val === 'nao_se_aplica') {
                        setValidityDate('');
                      } else {
                        updateSuggestedValidity(title, type, dataEnvio, val);
                      }
                    }}
                    className="modal-input"
                    disabled={saving}
                  >
                    <option value="pendente" disabled={isPcaPprAet({ title, type })}>Pendente</option>
                    <option value="em_elaboracao">Em Elaboração</option>
                    <option value="agendado">Agendado</option>
                    <option value="entregue">Entregue</option>
                    <option value="feito">Feito</option>
                    <option value="adiado">Adiado</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="nao_se_aplica">Não Se Aplica</option>
                  </select>
                </div>
              </div>

              {/* Contract */}
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

              {/* Datas: Data de Emissão, Validade (NÃO OBRIGATÓRIO), Última Revisão (NÃO OBRIGATÓRIO) */}
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
                    Data de Emissão {isNotApplicableItem ? '(Opcional)' : <span style={{ color: '#ef4444', fontWeight: 'bold' }}>* (Obrigatório)</span>}
                  </label>
                  <input
                    id="dlv-envio"
                    type="date"
                    value={dataEnvio}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDataEnvio(val);
                      updateSuggestedValidity(title, type, val, status);
                    }}
                    className="modal-input"
                    required={!isNotApplicableItem}
                    disabled={saving}
                  />
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
                    {isNotApplicableItem
                      ? 'Para PCA, PPR, AET ou itens "Não Se Aplica", a data é opcional e não gera pendência.'
                      : 'Data de emissão prevista ou realizada do documento ao cliente.'}
                  </span>
                </div>

                {!showValidityField ? (
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
                      {isNotApplicableItem
                        ? 'Não obrigatório (não se aplica / sem prazo de validade).'
                        : 'Não obrigatório (apenas programas possuem prazo de validade normativa)'}
                    </span>
                  </div>
                ) : (
                  <div className="grid-responsive-2">
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="modal-label" htmlFor="dlv-validity">
                          Data de Validade (Opcional)
                        </label>
                        {dataEnvio && (
                          <button
                            type="button"
                            onClick={() => {
                              setValidityManuallyEdited(false);
                              updateSuggestedValidity(title, type, dataEnvio, status);
                            }}
                            style={{
                              background: 'none', border: 'none', color: 'var(--primary)',
                              fontSize: '0.6875rem', cursor: 'pointer', padding: 0, textDecoration: 'underline'
                            }}
                          >
                            Recalcular padrão
                          </button>
                        )}
                      </div>
                      <input
                        id="dlv-validity"
                        type="date"
                        value={validityDate}
                        onChange={(e) => {
                          setValidityDate(e.target.value);
                          setValidityManuallyEdited(true);
                        }}
                        className="modal-input"
                        disabled={saving}
                      />
                      <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
                        PGR: 2 anos | PCMSO: 1 ano (ou livre)
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
                )}
              </div>

              {/* Responsáveis vinculados à Empresa */}
              <div style={{
                padding: '0.875rem 1rem',
                backgroundColor: 'var(--surface-hover, #f8fafc)',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--border, #e2e8f0)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <span className="modal-label" style={{ marginBottom: 0 }}>Responsáveis pela Empresa</span>
                <div className="grid-responsive-2" style={{ gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    <ShieldCheck size={15} color="var(--primary)" />
                    <div>
                      <span style={{ display: 'block', fontSize: '0.7rem' }}>Supervisor</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{companyInfo?.effSupervisor || 'Não definido'}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    <UserCheck size={15} color="var(--secondary)" />
                    <div>
                      <span style={{ display: 'block', fontSize: '0.7rem' }}>Responsável Técnico</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{companyInfo?.effTecnico || 'Não definido'}</strong>
                    </div>
                  </div>
                </div>
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
              <button type="submit" className="btn btn-primary" disabled={!title.trim() || (!isNotApplicableItem && !dataEnvio) || saving}>
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
