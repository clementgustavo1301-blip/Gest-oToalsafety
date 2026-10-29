import React, { useState, useEffect } from 'react';
import { X, Edit3 } from 'lucide-react';
import { getContractsByCompany, getProfiles } from '../services/storageService';
import { STANDARD_DELIVERABLES } from '../data/deliverables';
import { getDefaultValidityMonths, parseSafeDate, isLaudo } from '../utils/deliverableTiming';

const EditDeliverableModal = ({ deliverable, companyId, onClose, onSave }) => {
  const initialMatch = STANDARD_DELIVERABLES.find(
    (d) => d.value.toLowerCase() === (deliverable?.title || '').trim().toLowerCase()
  );
  const [selectedDeliverable, setSelectedDeliverable] = useState(
    initialMatch ? initialMatch.value : (deliverable?.title ? 'outro' : '')
  );
  const [title, setTitle] = useState(deliverable?.title || '');
  const [description, setDescription] = useState(deliverable?.description || '');
  const [type, setType] = useState(deliverable?.type || 'programa');
  const [contractId, setContractId] = useState(deliverable?.contractId || '');
  const isInitialLaudo = deliverable?.type === 'laudo' || isLaudo(deliverable);
  const [dataEnvio, setDataEnvio] = useState(deliverable?.dataEmissao || deliverable?.dataEnvio || deliverable?.dueDate || '');
  const [validityDate, setValidityDate] = useState(isInitialLaudo ? '' : (deliverable?.validityDate || ''));
  const [ultimaRevisao, setUltimaRevisao] = useState(deliverable?.ultimaRevisao || '');
  const [deliveredDate, setDeliveredDate] = useState(deliverable?.deliveredDate || '');
  const [status, setStatus] = useState(deliverable?.status || 'pendente');
  const [responsibleId, setResponsibleId] = useState(deliverable?.responsibleId || '');

  const [contracts, setContracts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoadingData(true);
      const compId = companyId || deliverable?.companyId || deliverable?.company_id;
      const [profs] = await Promise.all([
        getProfiles(),
        (async () => {
          if (compId) {
            const ctrs = await getContractsByCompany(compId);
            setContracts(ctrs);
          }
        })()
      ]);
      setProfiles(profs);
      setLoadingData(false);
    }
    load();
  }, [companyId, deliverable]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !dataEnvio) return;
    
    setSaving(true);
    const isCurLaudo = type === 'laudo' || isLaudo({ title, type });
    await onSave(deliverable.id, {
      title: title.trim(),
      description: description.trim() || null,
      type,
      contractId: contractId || null,
      dueDate: dataEnvio,
      dataEnvio,
      dataEmissao: dataEnvio,
      data_emissao: dataEnvio,
      data_envio: dataEnvio,
      validityDate: isCurLaudo ? null : (validityDate || null),
      ultimaRevisao: ultimaRevisao || null,
      deliveredDate: deliveredDate || null,
      responsibleId: responsibleId || null,
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
                      // Mantém o título se já houver algo
                    } else if (val) {
                      const found = STANDARD_DELIVERABLES.find(d => d.value === val);
                      if (found) {
                        setTitle(found.label);
                        setType(found.defaultType);
                        if (found.description && !description) setDescription(found.description);
                        if (found.defaultType === 'laudo' || isLaudo({ title: found.label, type: found.defaultType })) {
                          setValidityDate('');
                        }
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
                    onChange={(e) => {
                      const val = e.target.value;
                      setType(val);
                      if (val === 'laudo' || isLaudo({ title, type: val })) {
                        setValidityDate('');
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

              {/* Status */}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="modal-label" htmlFor="dlv-validity">
                        Data de Validade {(type === 'laudo' || isLaudo({ title, type })) ? '(Não aplicável a laudos)' : '(Opcional)'}
                      </label>
                      {type !== 'laudo' && !isLaudo({ title, type }) && dataEnvio && (
                        <button
                          type="button"
                          onClick={() => {
                            const months = getDefaultValidityMonths({ title, type });
                            if (months) {
                              const base = parseSafeDate(dataEnvio);
                              if (base) {
                                const calc = new Date(base.getTime());
                                calc.setMonth(calc.getMonth() + months);
                                setValidityDate(calc.toISOString().split('T')[0]);
                              }
                            }
                          }}
                          style={{
                            background: 'none', border: 'none', color: 'var(--primary)',
                            fontSize: '0.6875rem', cursor: 'pointer', padding: 0, textDecoration: 'underline'
                          }}
                        >
                          Calcular padrão
                        </button>
                      )}
                    </div>
                    <input
                      id="dlv-validity"
                      type="date"
                      value={(type === 'laudo' || isLaudo({ title, type })) ? '' : validityDate}
                      onChange={(e) => {
                        if (type !== 'laudo' && !isLaudo({ title, type })) {
                          setValidityDate(e.target.value);
                        }
                      }}
                      className="modal-input"
                      disabled={saving || type === 'laudo' || isLaudo({ title, type })}
                      placeholder={(type === 'laudo' || isLaudo({ title, type })) ? 'Laudos não têm validade' : ''}
                      style={(type === 'laudo' || isLaudo({ title, type })) ? { opacity: 0.6, cursor: 'not-allowed', backgroundColor: 'var(--background)' } : {}}
                    />
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
                      {(type === 'laudo' || isLaudo({ title, type }))
                        ? 'ℹ️ Laudos técnicos não possuem prazo de validade (vigência indeterminada pelas NRs).'
                        : 'PGR: 2 anos | PCMSO: 1 ano (ou livre)'}
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

            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={!title.trim() || !dataEnvio || saving}>
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
