import React, { useEffect, useMemo, useState } from 'react';
import { X, FileSpreadsheet, Building2, UserCheck, Users, Download, Check, ListTree, BarChart3, Layers } from 'lucide-react';
import { getProfiles } from '../services/storageService';
import { buildReportRows, generateDeliverablesReport, groupRows, REPORT_TYPES, NO_RESPONSIBLE } from '../utils/deliverablesReport';

const GROUP_OPTIONS = [
  { id: 'empresa', label: 'Por Empresa', desc: 'Agrupado por empresa', icon: Building2 },
  { id: 'responsavel', label: 'Por Responsável', desc: 'Agrupado por técnico', icon: UserCheck },
  { id: 'empresa_responsavel', label: 'Empresa e Responsável', desc: 'Por empresa × responsável', icon: Users },
];

const FORMAT_OPTIONS = [
  { id: 'analitico', label: 'Analítico', desc: 'Lista detalhada de cada programa e laudo com datas e validade', icon: ListTree },
  { id: 'sintetico', label: 'Sintético', desc: 'Quadro consolidado com totais, pendentes, vencidos e % entregue', icon: BarChart3 },
  { id: 'ambos', label: 'Analítico + Sintético', desc: 'Planilha completa com as duas abas (Sintético e Analítico)', icon: Layers },
];

const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

const DeliverablesReportModal = ({ deliverables, companies, contracts, onClose }) => {
  const [groupBy, setGroupBy] = useState('empresa_responsavel');
  const [reportFormat, setReportFormat] = useState('analitico');
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
    baseRows.forEach(r => {
      if (selectedResponsible === 'all' || r.responsible === selectedResponsible) {
        if (!map.has(r.companyId)) map.set(r.companyId, r.companyName);
      }
    });
    return [...map.entries()].sort((a, b) => collator.compare(a[1], b[1]));
  }, [baseRows, selectedResponsible]);

  const responsibleOptions = useMemo(() => {
    const set = new Set();
    baseRows.forEach(r => {
      if (selectedCompany === 'all' || r.companyId === selectedCompany) {
        set.add(r.responsible);
      }
    });
    return [...set].sort((a, b) => {
      if (a === NO_RESPONSIBLE) return 1;
      if (b === NO_RESPONSIBLE) return -1;
      return collator.compare(a, b);
    });
  }, [baseRows, selectedCompany]);

  const filteredRows = useMemo(() => {
    return baseRows.filter(r => {
      const matchCompany = selectedCompany === 'all' || r.companyId === selectedCompany;
      const matchResp = selectedResponsible === 'all' || r.responsible === selectedResponsible;
      return matchCompany && matchResp;
    });
  }, [baseRows, selectedCompany, selectedResponsible]);

  const groupCount = useMemo(() => groupRows(filteredRows, groupBy).length, [filteredRows, groupBy]);

  const toggleType = (t) => {
    setTypes(prev => {
      if (prev.includes(t)) return prev.length === 1 ? prev : prev.filter(x => x !== t);
      return REPORT_TYPES.filter(x => x === t || prev.includes(x));
    });
  };

  const selectedCompanyName = selectedCompany !== 'all'
    ? (companies.find(c => c.id === selectedCompany)?.name || '')
    : '';
  const selectedResponsibleName = selectedResponsible !== 'all' ? selectedResponsible : '';

  const selectionLabel = [selectedCompanyName, selectedResponsibleName].filter(Boolean).join(' • ');
  const canSplitSheets = reportFormat !== 'sintetico' && groupCount > 1;

  const handleGenerate = async () => {
    if (filteredRows.length === 0) return;
    setGenerating(true);
    try {
      await generateDeliverablesReport({
        groupBy,
        reportFormat,
        rows: filteredRows,
        sheetPerGroup: sheetPerGroup && canSplitSheets,
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

  const groupNoun = groupBy === 'responsavel'
    ? 'responsável'
    : groupBy === 'empresa_responsavel'
      ? 'empresa × responsável'
      : 'empresa';

  const sheetsDescription = reportFormat === 'sintetico'
    ? 'aba "Sintético"'
    : reportFormat === 'analitico'
      ? `aba "Analítico"${sheetPerGroup && canSplitSheets ? ` + ${groupCount} aba(s) individuais` : ''}`
      : `abas "Sintético" e "Analítico"${sheetPerGroup && canSplitSheets ? ` + ${groupCount} aba(s) individuais` : ''}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
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
                Exporte em planilha Excel (.xlsx) nos formatos Analítico ou Sintético
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ padding: '0.375rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }} title="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* 1. Agrupamento */}
          <div>
            <span className="modal-label">Agrupamento do relatório</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: '0.5rem', marginTop: '0.375rem' }}>
              {GROUP_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const active = groupBy === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setGroupBy(opt.id)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.5rem', textAlign: 'left',
                      padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
                      backgroundColor: active ? 'var(--primary-light)' : 'var(--surface)',
                    }}
                  >
                    <Icon size={17} color={active ? 'var(--primary)' : 'var(--text-secondary)'} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', flex: 1 }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: active ? 'var(--primary)' : 'var(--text-primary)' }}>{opt.label}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{opt.desc}</span>
                    </span>
                    {active && <Check size={15} color="var(--primary)" style={{ flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Modelo: Analítico / Sintético / Ambos */}
          <div>
            <span className="modal-label">Modelo de relatório</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: '0.5rem', marginTop: '0.375rem' }}>
              {FORMAT_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const active = reportFormat === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setReportFormat(opt.id)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.5rem', textAlign: 'left',
                      padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      border: active ? '2px solid #15803d' : '1px solid var(--border)',
                      backgroundColor: active ? '#dcfce7' : 'var(--surface)',
                    }}
                  >
                    <Icon size={17} color={active ? '#15803d' : 'var(--text-secondary)'} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', flex: 1 }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: active ? '#15803d' : 'var(--text-primary)' }}>{opt.label}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>{opt.desc}</span>
                    </span>
                    {active && <Check size={15} color="#15803d" style={{ flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Filtros de Empresa e Responsável */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
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
            </div>
          </div>

          {/* 4. Tipos */}
          <div>
            <span className="modal-label">Incluir tipos</span>
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

          {/* 5. Opções adicionais */}
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
            {reportFormat !== 'sintetico' && (
              <label style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem',
                cursor: canSplitSheets ? 'pointer' : 'not-allowed', color: 'var(--text-secondary)', opacity: canSplitSheets ? 1 : 0.5
              }}>
                <input
                  type="checkbox"
                  checked={sheetPerGroup && canSplitSheets}
                  disabled={!canSplitSheets}
                  onChange={(e) => setSheetPerGroup(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                />
                Criar uma aba separada para cada {groupNoun}
              </label>
            )}
          </div>

          {/* Prévia */}
          <div style={{
            padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
            backgroundColor: filteredRows.length ? 'var(--secondary-light)' : '#fef3c7',
            color: filteredRows.length ? 'var(--secondary-hover)' : '#b45309',
            fontSize: '0.8125rem', fontWeight: '500'
          }}>
            {filteredRows.length
              ? <>A planilha terá <strong>{filteredRows.length}</strong> entregável(is) em <strong>{groupCount}</strong> grupo(s) ({groupNoun}), com {sheetsDescription}.</>
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
