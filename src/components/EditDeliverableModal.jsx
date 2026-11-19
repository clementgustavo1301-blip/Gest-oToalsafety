import React, { useState, useEffect } from 'react';
import { X, Edit3, ShieldCheck, UserCheck } from 'lucide-react';
import { getContractsByCompany, getCompanyById, getGroups, resolveCompaniesWithHeritage } from '../services/storageService';
import { STANDARD_DELIVERABLES } from '../data/deliverables';
import { getDefaultValidityMonths, parseSafeDate, isLaudo, isProgram, isPcaPprAet } from '../utils/deliverableTiming';

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
  const isInitialPcaPprAet = isPcaPprAet(deliverable);
  const isInitialProgram = !isInitialPcaPprAet && (deliverable?.type === 'programa') && isProgram(deliverable);
  const [dataEnvio, setDataEnvio] = useState(deliverable?.dataEmissao || deliverable?.dataEnvio || deliverable?.dueDate || '');
  const [validityDate, setValidityDate] = useState(isInitialProgram ? (deliverable?.validityDate || '') : '');
  const [manualValidity, setManualValidity] = useState(false);
  const [ultimaRevisao, setUltimaRevisao] = useState(deliverable?.ultimaRevisao || '');
  const [deliveredDate] = useState(deliverable?.deliveredDate || '');
  const [status, setStatus] = useState(
    isInitialPcaPprAet && (!deliverable?.status || deliverable.status === 'pendente')
      ? 'nao_se_aplica'
      : (deliverable?.status || 'pendente')
  );

  const [contracts, setContracts] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const isNotApplicableItem = isPcaPprAet({ title, type }) || status === 'nao_se_aplica';
  const showValidityField = !isNotApplicableItem && type === 'programa' && isProgram({ title, type });

  useEffect(() => {
    async function load() {
      setLoadingData(true);
      const compId = companyId || deliverable?.companyId || deliverable?.company_id;
      const [ctrs, comp, groups] = await Promise.all([
        compId ? getContractsByCompany(compId) : Promise.resolve([]),
        compId ? getCompanyById(compId) : Promise.resolve(null),
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
  }, [companyId, deliverable]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!isNotApplicableItem && !dataEnvio) return;

    setSaving(true);
    const effectiveDate = dataEnvio || new Date().toISOString().split('T')[0];
    const isCurProgram = !isNotApplicableItem && type === 'programa' && isProgram({ title, type });
    const finalStatus = isPcaPprAet({ title, type }) && status === 'pendente' ? 'nao_se_aplica' : status;

    await onSave(deliverable.id, {
      title: title.trim(),
      description: description.trim() || null,
      type,
      contractId: contractId || null,
      dueDate: effectiveDate,
      dataEnvio: effectiveDate,
      dataEmissao: effectiveDate,
      data_emissao: effectiveDate,
      data_envio: effectiveDate,
      validityDate: isCurProgram ? (validityDate || null) : null,
      ultimaRevisao: ultimaRevisao || null,
      deliveredDate: deliveredDate || null,
      responsibleId: companyInfo?.responsibleId || deliverable?.responsibleId || null,
      status: finalStatus
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
                        if (found.defaultStatus === 'nao_se_aplica' || isPcaPprAet({ title: found.label, type: found.defaultType })) {
                          setStatus('nao_se_aplica');
                          setValidityDate('');
                        } else if (found.defaultType === 'laudo' || isLaudo({ title: found.label, type: found.defaultType })) {
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
                    }
                  }}
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
                      if (val === 'laudo' || isLaudo({ title, type: val }) || isPcaPprAet({ title, type: val })) {
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setStatus(val);
                    if (val === 'nao_se_aplica') {
                      setValidityDate('');
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
                      const newEmissao = e.target.value;
                      setDataEnvio(newEmissao);
                      if (newEmissao && !isNotApplicableItem && type === 'programa' && isProgram({ title, type }) && !manualValidity) {
                        const months = getDefaultValidityMonths({ title, type });
                        if (months) {
                          const base = parseSafeDate(newEmissao);
                          if (base) {
                            const calc = new Date(base.getTime());
                            calc.setMonth(calc.getMonth() + months);
                            setValidityDate(calc.toISOString().split('T')[0]);
                          }
                        }
                      }
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
                        value={validityDate}
                        onChange={(e) => {
                          setValidityDate(e.target.value);
                          setManualValidity(true);
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

            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={!title.trim() || (!isNotApplicableItem && !dataEnvio) || saving}>
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
