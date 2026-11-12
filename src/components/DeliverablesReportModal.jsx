import React, { useEffect, useMemo, useState } from 'react';
import { X, FileSpreadsheet, Building2, UserCheck, Download, Check } from 'lucide-react';
import { getProfiles } from '../services/storageService';
import { buildReportRows, generateDeliverablesReport, REPORT_TYPES } from '../utils/deliverablesReport';

const GROUP_OPTIONS = [
  { id: 'empresa', label: 'Por Empresa', desc: 'Programas e laudos agrupados por empresa', icon: Building2 },
  { id: 'responsavel', label: 'Por Responsável', desc: 'Programas e laudos agrupados por técnico responsável', icon: UserCheck },
];

const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

const DeliverablesReportModal = ({ deliverables, companies, contracts, onClose }) => {
  const [groupBy, setGroupBy] = useState('empresa');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedResponsible, setSelectedResponsible] = useState('all');
  const [types, setTypes] = useState(REPORT_TYPES);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [sheetPerGroup, setSheetPerGroup] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let active = true;
    getProfiles().then(p => {
      if (active) { setProfiles(p || []); setLoadingProfiles(false); }
    });
    return () => { active = false; };
  }, []);

  // Linhas base (apenas programas/laudos selecionados), antes do filtro por empresa/responsável
  const baseRows = useMemo(() => buildReportRows({
    deliverables, companies, contracts, profiles, types, includeInactive,
  }), [deliverables, companies, contracts, profiles, types, includeInactive]);

  const companyOptions = useMemo(() => {
    const map = new Map();
    baseRows.forEach(r => { if (!map.has(r.companyId)) map.set(r.companyId, r.companyName); });
    return [...map.entries()].sort((a, b) => collator.compare(a[1], b[1]));
  }, [baseRows]);

  const responsibleOptions = useMemo(() => {
    return [...new Set(baseRows.map(r => r.responsible))].sort(collator.compare);
  }, [baseRows]);

  const filteredRows = useMemo(() => {
    if (groupBy === 'empresa' && selectedCompany !== 'all') {
      return baseRows.filter(r => r.companyId === selectedCompany);
    }
    if (groupBy === 'responsavel' && selectedResponsible !== 'all') {
      return baseRows.filter(r => r.responsible === selectedResponsible);
    }
    return baseRows;
  }, [baseRows, groupBy, selectedCompany, selectedResponsible]);

  const groupCount = useMemo(() => new Set(
    filteredRows.map(r => (groupBy === 'responsavel' ? r.responsible : r.companyId))
  ).size, [filteredRows, groupBy]);

  const toggleType = (t) => {
    setTypes(prev => {
      if (prev.includes(t)) return prev.length === 1 ? prev : prev.filter(x => x !== t);
      return REPORT_TYPES.filter(x => x === t || prev.includes(x));
    });
  };

  const selectionLabel = groupBy === 'empresa'
    ? (selectedCompany !== 'all' ? (companyOptions.find(([id]) => id === selectedCompany)?.[1] || '') : '')
    : (selectedResponsible !== 'all' ? selectedResponsible : '');

  const handleGenerate = async () => {
    if (filteredRows.length === 0) return;
    setGenerating(true);
    try {
      await generateDeliverablesReport({
        groupBy,
        rows: filteredRows,
        sheetPerGroup: sheetPerGroup && !selectionLabel,
        selectionLabel,
        types,
      });
    } catch (err) {
      console.error('Erro ao gerar relatório de entregáveis:', err);
      alert('Não foi possível gerar a planilha do relatório.');
    } finally {
      setGenerating(false);
    }
  };

  const groupNoun = groupBy === 'responsavel' ? 'responsável' : 'empresa';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #15803d, #22c55e)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FileSpreadsheet size={18} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Relatório de Programas e Laudos</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                Gera uma planilha Excel (.xlsx) com resumo e detalhamento
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ padding: '0.375rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }} title="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Agrupamento */}
          <div>
            <span className="modal-label">Tipo de relatório</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.625rem', marginTop: '0.375rem' }}>
              {GROUP_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const active = groupBy === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setGroupBy(opt.id)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.625rem', textAlign: 'left',
                      padding: '0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
                      backgroundColor: active ? 'var(--primary-light)' : 'var(--surface)',
                    }}
                  >
                    <Icon size={18} color={active ? 'var(--primary)' : 'var(--text-secondary)'} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', flex: 1 }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: active ? 'var(--primary)' : 'var(--text-primary)' }}>{opt.label}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{opt.desc}</span>
                    </span>
                    {active && <Check size={16} color="var(--primary)" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seleção de empresa / responsável */}
          {groupBy === 'empresa' ? (
            <div>
              <label className="modal-label" htmlFor="report-company">Empresa</label>
              <select
                id="report-company"
                className="modal-input"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
              >
                <option value="all">Todas as empresas ({companyOptions.length})</option>
                {companyOptions.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="modal-label" htmlFor="report-responsible">Responsável</label>
              <select
                id="report-responsible"
                className="modal-input"
                value={selectedResponsible}
                onChange={(e) => setSelectedResponsible(e.target.value)}
                disabled={loadingProfiles}
              >
                <option value="all">{loadingProfiles ? 'Carregando responsáveis...' : `Todos os responsáveis (${responsibleOptions.length})`}</option>
                {responsibleOptions.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.375rem' }}>
                Usa o responsável definido no entregável; se não houver, o técnico responsável da empresa.
              </p>
            </div>
          )}

          {/* Tipos */}
          <div>
            <span className="modal-label">Incluir</span>
            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '0.375rem' }}>
              {[{ id: 'programa', label: 'Programas' }, { id: 'laudo', label: 'Laudos' }].map(t => (
                <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={types.includes(t.id)}
                    onChange={() => toggleType(t.id)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </div>

          {/* Opções */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
              />
              Incluir itens cancelados e "não se aplica"
            </label>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem',
              cursor: selectionLabel ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)', opacity: selectionLabel ? 0.5 : 1
            }}>
              <input
                type="checkbox"
                checked={sheetPerGroup && !selectionLabel}
                disabled={!!selectionLabel}
                onChange={(e) => setSheetPerGroup(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
              />
              Criar uma aba separada para cada {groupNoun}
            </label>
          </div>

          {/* Prévia */}
          <div style={{
            padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
            backgroundColor: filteredRows.length ? 'var(--secondary-light)' : '#fef3c7',
            color: filteredRows.length ? 'var(--secondary-hover)' : '#b45309',
            fontSize: '0.8125rem', fontWeight: '500'
          }}>
            {filteredRows.length
              ? <>A planilha terá <strong>{filteredRows.length}</strong> entregável(is) em <strong>{groupCount}</strong> {groupBy === 'responsavel' ? 'responsável(is)' : 'empresa(s)'}, com as abas "Resumo" e "Detalhado"{sheetPerGroup && !selectionLabel ? ` + ${groupCount} aba(s) individuais` : ''}.</>
              : 'Nenhum programa ou laudo encontrado para os filtros selecionados.'}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={generating || loadingProfiles || filteredRows.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Download size={16} />
            {generating ? 'Gerando...' : 'Gerar Planilha (.xlsx)'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliverablesReportModal;
