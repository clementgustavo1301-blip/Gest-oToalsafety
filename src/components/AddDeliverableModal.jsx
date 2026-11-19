import React, { useState, useEffect } from 'react';
import { X, FileText, ShieldCheck, UserCheck, Layers, CheckSquare, Square, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { getContractsByCompany, getCompanyById, getGroups, resolveCompaniesWithHeritage, getDeliverablesByCompany } from '../services/storageService';
import { STANDARD_DELIVERABLES } from '../data/deliverables';
import { getDefaultValidityMonths, parseSafeDate, isProgram, isPcaPprAet } from '../utils/deliverableTiming';

const getTodayStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const normalizeDeliverableTitle = (str) =>
  String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const computeAutoValidityDate = (emissionDateStr, item) => {
  if (!emissionDateStr || isPcaPprAet(item) || item.type !== 'programa' || !isProgram(item)) {
    return '';
  }
  const months = getDefaultValidityMonths(item);
  if (!months) return '';
  const d = parseSafeDate(emissionDateStr);
  if (!d) return '';
  const exp = new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
  const y = exp.getFullYear();
  const m = String(exp.getMonth() + 1).padStart(2, '0');
  const day = String(exp.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const AddDeliverableModal = ({ companyId, onClose, onSave, initialType = 'programa', initialMode = 'single' }) => {
  const [mode, setMode] = useState(initialMode);
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

  // Batch mode state
  const [batchDefaultDate, setBatchDefaultDate] = useState(getTodayStr);
  const [batchDefaultStatus, setBatchDefaultStatus] = useState('pendente');
  const [batchContractId, setBatchContractId] = useState('');
  const [batchItems, setBatchItems] = useState([]);
  const [existingTitles, setExistingTitles] = useState(() => new Set());
  const [extraTitle, setExtraTitle] = useState('');
  const [extraType, setExtraType] = useState(initialType || 'programa');

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoadingData(true);
      const [ctrs, comp, groups, existingDelivs] = await Promise.all([
        companyId ? getContractsByCompany(companyId) : Promise.resolve([]),
        companyId ? getCompanyById(companyId) : Promise.resolve(null),
        getGroups(),
        companyId ? getDeliverablesByCompany(companyId) : Promise.resolve([])
      ]);
      if (!active) return;

      setContracts(ctrs || []);
      if (comp) {
        const resolved = resolveCompaniesWithHeritage([comp], groups || [])[0];
        setCompanyInfo(resolved || comp);
      } else {
        setCompanyInfo(null);
      }

      const existingSet = new Set(
        (existingDelivs || [])
          .filter((d) => d.type !== 'treinamento' && d.type !== 'visita')
          .map((d) => normalizeDeliverableTitle(d.title))
          .filter(Boolean)
      );
      setExistingTitles(existingSet);

      const initialDate = getTodayStr();
      const initialItems = STANDARD_DELIVERABLES.map((std, idx) => {
        const itemMeta = { title: std.value, type: std.defaultType };
        const isNa = isPcaPprAet(itemMeta);
        const alreadyExists = existingSet.has(normalizeDeliverableTitle(std.value));
        return {
          key: `std-${idx}-${std.value}`,
          title: std.label,
          type: std.defaultType,
          status: isNa ? 'nao_se_aplica' : (std.defaultStatus || 'pendente'),
          dataEmissao: initialDate,
          validityDate: computeAutoValidityDate(initialDate, itemMeta),
          dateManual: false,
          statusManual: false,
          validityManual: false,
          description: '',
          alreadyExists,
          selected: false,
          isCustom: false,
        };
      });
      setBatchItems(initialItems);
      setLoadingData(false);
    }
    load();
    return () => { active = false; };
  }, [companyId]);

  const selectedBatchItems = batchItems.filter((item) => item.selected);
  const missingBatchCount = batchItems.filter((item) => !item.alreadyExists).length;

  const handleBatchDefaultDateChange = (newDate) => {
    setBatchDefaultDate(newDate);
    setBatchItems((prev) =>
      prev.map((item) => {
        if (item.dateManual) return item;
        return {
          ...item,
          dataEmissao: newDate,
          validityDate: item.validityManual
            ? item.validityDate
            : computeAutoValidityDate(newDate, { title: item.title, type: item.type }),
        };
      })
    );
  };

  const handleBatchDefaultStatusChange = (newStatus) => {
    setBatchDefaultStatus(newStatus);
    setBatchItems((prev) =>
      prev.map((item) => {
        const isNa = isPcaPprAet({ title: item.title, type: item.type });
        if (isNa || item.statusManual) return item;
        return { ...item, status: newStatus };
      })
    );
  };

  const toggleBatchItem = (key) => {
    setBatchItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, selected: !item.selected } : item))
    );
  };

  const updateBatchItem = (key, patch) => {
    setBatchItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const isNa = isPcaPprAet({ title: item.title, type: item.type });
        const next = { ...item, ...patch, selected: true };

        if (Object.prototype.hasOwnProperty.call(patch, 'status')) {
          next.status = isNa && patch.status === 'pendente' ? 'nao_se_aplica' : patch.status;
          next.statusManual = true;
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'dataEmissao')) {
          next.dateManual = true;
          if (!next.validityManual) {
            next.validityDate = computeAutoValidityDate(patch.dataEmissao, {
              title: item.title,
              type: item.type,
            });
          }
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'validityDate')) {
          next.validityManual = true;
        }
        return next;
      })
    );
  };

  const selectAllBatch = () => {
    setBatchItems((prev) => prev.map((item) => ({ ...item, selected: true })));
  };

  const deselectAllBatch = () => {
    setBatchItems((prev) => prev.map((item) => ({ ...item, selected: false })));
  };

  const selectMissingBatch = () => {
    setBatchItems((prev) =>
      prev.map((item) => ({ ...item, selected: !item.alreadyExists }))
    );
  };

  const addCustomBatchItem = () => {
    const trimmed = extraTitle.trim();
    if (!trimmed) return;
    const norm = normalizeDeliverableTitle(trimmed);
    const existingIdx = batchItems.findIndex((i) => normalizeDeliverableTitle(i.title) === norm);
    if (existingIdx >= 0) {
      setBatchItems((prev) =>
        prev.map((item, idx) => (idx === existingIdx ? { ...item, selected: true } : item))
      );
      setExtraTitle('');
      return;
    }

    const itemMeta = { title: trimmed, type: extraType };
    const isNa = isPcaPprAet(itemMeta);
    const effectiveDate = batchDefaultDate || getTodayStr();
    setBatchItems((prev) => [
      ...prev,
      {
        key: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: trimmed,
        type: extraType,
        status: isNa ? 'nao_se_aplica' : batchDefaultStatus,
        dataEmissao: effectiveDate,
        validityDate: computeAutoValidityDate(effectiveDate, itemMeta),
        dateManual: false,
        statusManual: false,
        validityManual: false,
        description: '',
        alreadyExists: existingTitles.has(norm),
        selected: true,
        isCustom: true,
      },
    ]);
    setExtraTitle('');
  };

  const removeCustomBatchItem = (key) => {
    setBatchItems((prev) => prev.filter((item) => item.key !== key));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mode === 'batch') {
      if (selectedBatchItems.length === 0) return;
      setSaving(true);
      try {
        const today = getTodayStr();
        const itemsToSave = selectedBatchItems.map((item) => {
          const isNa = isPcaPprAet({ title: item.title, type: item.type });
          const effectiveDate = item.dataEmissao || batchDefaultDate || today;
          const effectiveStatus = isNa
            ? (item.status === 'cancelado' ? 'cancelado' : 'nao_se_aplica')
            : item.status;
          const isProg =
            !isNa &&
            item.type === 'programa' &&
            isProgram({ title: item.title, type: item.type });

          return {
            title: item.title.trim(),
            description: item.description?.trim() || null,
            type: item.type,
            contractId: batchContractId || null,
            dueDate: effectiveDate,
            dataEnvio: effectiveDate,
            dataEmissao: effectiveDate,
            data_emissao: effectiveDate,
            data_envio: effectiveDate,
            validityDate: isProg ? (item.validityDate || null) : null,
            ultimaRevisao: null,
            status: effectiveStatus,
            deliveredDate: effectiveStatus === 'entregue' ? effectiveDate : null,
            responsibleId: companyInfo?.responsibleId || null,
            fileName: null,
            file: null,
          };
        });

        await onSave(itemsToSave);
      } finally {
        setSaving(false);
      }
      return;
    }

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
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: mode === 'batch' ? '860px' : '520px', width: '95vw', transition: 'max-width 0.2s ease' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary), var(--info))',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {mode === 'batch' ? <Layers size={18} color="white" /> : <FileText size={18} color="white" />}
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>
                {mode === 'batch' ? 'Cadastrar Entregáveis em Lote' : 'Novo Entregável'}
              </h2>
              {companyInfo?.name && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.125rem 0 0' }}>
                  {companyInfo.name}
                </p>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ padding: '0.375rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Seletor de Modo: Individual vs Lote */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.625rem 1.5rem',
          borderBottom: '1px solid var(--border-color, rgba(148, 163, 184, 0.2))',
          background: 'rgba(148, 163, 184, 0.06)'
        }}>
          <button
            type="button"
            onClick={() => setMode('single')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              border: mode === 'single' ? '1px solid var(--primary)' : '1px solid transparent',
              background: mode === 'single' ? 'rgba(59, 130, 246, 0.14)' : 'transparent',
              color: mode === 'single' ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            <FileText size={14} /> Individual
          </button>
          <button
            type="button"
            onClick={() => setMode('batch')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              border: mode === 'batch' ? '1px solid var(--primary)' : '1px solid transparent',
              background: mode === 'batch' ? 'rgba(59, 130, 246, 0.14)' : 'transparent',
              color: mode === 'batch' ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            <Layers size={14} /> Cadastrar em Lote
          </button>
        </div>

        {loadingData ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>Carregando dados...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            {mode === 'batch' ? (
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
                {/* Configurações Gerais do Lote */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                  gap: '0.75rem',
                  padding: '0.875rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color, rgba(148, 163, 184, 0.25))',
                  background: 'rgba(148, 163, 184, 0.05)'
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Data de Emissão Padrão
                    </label>
                    <input
                      type="date"
                      value={batchDefaultDate}
                      onChange={(e) => handleBatchDefaultDateChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.6rem',
                        borderRadius: 'var(--radius-sm, 6px)',
                        border: '1px solid var(--border-color, rgba(148, 163, 184, 0.35))',
                        background: 'var(--bg-primary, transparent)',
                        color: 'inherit',
                        fontSize: '0.8125rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Status Padrão (aplicáveis)
                    </label>
                    <select
                      value={batchDefaultStatus}
                      onChange={(e) => handleBatchDefaultStatusChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.6rem',
                        borderRadius: 'var(--radius-sm, 6px)',
                        border: '1px solid var(--border-color, rgba(148, 163, 184, 0.35))',
                        background: 'var(--bg-primary, transparent)',
                        color: 'inherit',
                        fontSize: '0.8125rem'
                      }}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="em_elaboracao">Em Elaboração</option>
                      <option value="revisao">Em Revisão</option>
                      <option value="entregue">Entregue</option>
                      <option value="em_dia">Em Dia</option>
                      <option value="nao_se_aplica">Não Se Aplica</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Contrato Associado (Opcional)
                    </label>
                    <select
                      value={batchContractId}
                      onChange={(e) => setBatchContractId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.6rem',
                        borderRadius: 'var(--radius-sm, 6px)',
                        border: '1px solid var(--border-color, rgba(148, 163, 184, 0.35))',
                        background: 'var(--bg-primary, transparent)',
                        color: 'inherit',
                        fontSize: '0.8125rem'
                      }}
                    >
                      <option value="">Sem vínculo específico</option>
                      {contracts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.contractNumber || c.number || `Contrato #${c.id.slice(0, 6)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Barra de Seleção Rápida */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {selectedBatchItems.length} de {batchItems.length} selecionados
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={selectMissingBatch}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}
                    >
                      Selecionar Faltantes ({missingBatchCount})
                    </button>
                    <button
                      type="button"
                      onClick={selectAllBatch}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}
                    >
                      Selecionar Todos
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllBatch}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}
                    >
                      Desmarcar Todos
                    </button>
                  </div>
                </div>

                {/* Lista Interativa de Entregáveis */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {batchItems.map((item) => {
                    const isNa = isPcaPprAet({ title: item.title, type: item.type });
                    const isProg = !isNa && item.type === 'programa' && isProgram({ title: item.title, type: item.type });
                    const validityMonths = isProg ? getDefaultValidityMonths({ title: item.title, type: item.type }) : null;
                    const typeLabel =
                      item.type === 'programa' ? 'Programa' : item.type === 'laudo' ? 'Laudo' : 'Documento';

                    return (
                      <div
                        key={item.key}
                        style={{
                          padding: '0.75rem 0.875rem',
                          borderRadius: 'var(--radius-md)',
                          border: item.selected
                            ? '1px solid var(--primary)'
                            : '1px solid var(--border-color, rgba(148, 163, 184, 0.25))',
                          background: item.selected ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.625rem',
                          transition: 'border-color 0.15s ease, background 0.15s ease'
                        }}
                      >
                        <div
                          onClick={() => toggleBatchItem(item.key)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                            <span style={{ display: 'inline-flex', color: item.selected ? 'var(--primary)' : 'var(--text-secondary)' }}>
                              {item.selected ? <CheckSquare size={18} /> : <Square size={18} />}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.title}</span>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              padding: '0.125rem 0.45rem',
                              borderRadius: '999px',
                              background: 'rgba(148, 163, 184, 0.16)',
                              color: 'var(--text-secondary)'
                            }}>
                              {typeLabel}
                            </span>
                            {item.alreadyExists && (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                padding: '0.125rem 0.5rem',
                                borderRadius: '999px',
                                background: 'rgba(16, 185, 129, 0.14)',
                                color: '#10b981'
                              }}>
                                <CheckCircle2 size={11} /> Já cadastrado
                              </span>
                            )}
                            {isNa && (
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                padding: '0.125rem 0.5rem',
                                borderRadius: '999px',
                                background: 'rgba(148, 163, 184, 0.18)',
                                color: 'var(--text-secondary)'
                              }}>
                                Não gera pendência
                              </span>
                            )}
                          </div>
                          {item.isCustom && (
                            <button
                              type="button"
                              title="Remover item"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeCustomBatchItem(item.key);
                              }}
                              style={{
                                padding: '0.25rem',
                                borderRadius: 'var(--radius-sm, 6px)',
                                color: 'var(--danger, #ef4444)',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>

                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: '0.625rem',
                            paddingLeft: '1.65rem'
                          }}
                        >
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                              Status
                            </label>
                            <select
                              value={isNa && item.status === 'pendente' ? 'nao_se_aplica' : item.status}
                              onChange={(e) => updateBatchItem(item.key, { status: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '0.35rem 0.5rem',
                                borderRadius: 'var(--radius-sm, 6px)',
                                border: '1px solid var(--border-color, rgba(148, 163, 184, 0.35))',
                                background: 'var(--bg-primary, transparent)',
                                color: 'inherit',
                                fontSize: '0.78rem'
                              }}
                            >
                              <option value="pendente" disabled={isNa}>
                                Pendente{isNa ? ' (Indisponível)' : ''}
                              </option>
                              <option value="em_elaboracao">Em Elaboração</option>
                              <option value="revisao">Em Revisão</option>
                              <option value="entregue">Entregue</option>
                              <option value="em_dia">Em Dia</option>
                              <option value="nao_se_aplica">Não Se Aplica</option>
                              <option value="cancelado">Cancelado</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                              Data de Emissão
                            </label>
                            <input
                              type="date"
                              value={item.dataEmissao}
                              onChange={(e) => updateBatchItem(item.key, { dataEmissao: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '0.35rem 0.5rem',
                                borderRadius: 'var(--radius-sm, 6px)',
                                border: '1px solid var(--border-color, rgba(148, 163, 184, 0.35))',
                                background: 'var(--bg-primary, transparent)',
                                color: 'inherit',
                                fontSize: '0.78rem'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                              {isProg && validityMonths ? `Validade (${validityMonths} meses)` : 'Validade'}
                            </label>
                            {isProg ? (
                              <input
                                type="date"
                                value={item.validityDate}
                                onChange={(e) => updateBatchItem(item.key, { validityDate: e.target.value })}
                                style={{
                                  width: '100%',
                                  padding: '0.35rem 0.5rem',
                                  borderRadius: 'var(--radius-sm, 6px)',
                                  border: '1px solid var(--border-color, rgba(148, 163, 184, 0.35))',
                                  background: 'var(--bg-primary, transparent)',
                                  color: 'inherit',
                                  fontSize: '0.78rem'
                                }}
                              />
                            ) : (
                              <div style={{
                                padding: '0.35rem 0.5rem',
                                fontSize: '0.78rem',
                                color: 'var(--text-secondary)',
                                opacity: 0.75
                              }}>
                                Sem validade
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Adicionar Entregável Personalizado ao Lote */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  alignItems: 'center',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-color, rgba(148, 163, 184, 0.35))'
                }}>
                  <input
                    type="text"
                    placeholder="Adicionar outro entregável ao lote..."
                    value={extraTitle}
                    onChange={(e) => setExtraTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomBatchItem();
                      }
                    }}
                    style={{
                      flex: '1 1 200px',
                      padding: '0.45rem 0.65rem',
                      borderRadius: 'var(--radius-sm, 6px)',
                      border: '1px solid var(--border-color, rgba(148, 163, 184, 0.35))',
                      background: 'var(--bg-primary, transparent)',
                      color: 'inherit',
                      fontSize: '0.8125rem'
                    }}
                  />
                  <select
                    value={extraType}
                    onChange={(e) => setExtraType(e.target.value)}
                    style={{
                      padding: '0.45rem 0.65rem',
                      borderRadius: 'var(--radius-sm, 6px)',
                      border: '1px solid var(--border-color, rgba(148, 163, 184, 0.35))',
                      background: 'var(--bg-primary, transparent)',
                      color: 'inherit',
                      fontSize: '0.8125rem'
                    }}
                  >
                    <option value="programa">Programa</option>
                    <option value="laudo">Laudo</option>
                    <option value="documento">Documento</option>
                  </select>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={addCustomBatchItem}
                    disabled={!extraTitle.trim()}
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Plus size={14} /> Incluir na Lista
                  </button>
                </div>

                {/* Card de Responsáveis da Empresa */}
                {companyInfo && (
                  <div style={{
                    padding: '0.75rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(148, 163, 184, 0.08)',
                    border: '1px solid var(--border-color, rgba(148, 163, 184, 0.2))',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    fontSize: '0.78rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ShieldCheck size={15} color="var(--primary)" />
                      <span style={{ color: 'var(--text-secondary)' }}>Supervisor:</span>
                      <strong>{companyInfo.supervisor || 'Não definido'}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <UserCheck size={15} color="var(--info, #0ea5e9)" />
                      <span style={{ color: 'var(--text-secondary)' }}>Resp. Técnico:</span>
                      <strong>{companyInfo.tecnicoResponsavel || 'Não definido'}</strong>
                    </div>
                  </div>
                )}
              </div>
            ) : (
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

            )}
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  mode === 'batch'
                    ? (selectedBatchItems.length === 0 || saving)
                    : (!title.trim() || (!isNotApplicableItem && !dataEnvio) || saving)
                }
              >
                {saving
                  ? 'Salvando...'
                  : mode === 'batch'
                    ? `Cadastrar Tudo (${selectedBatchItems.length})`
                    : 'Adicionar Entregável'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddDeliverableModal;
