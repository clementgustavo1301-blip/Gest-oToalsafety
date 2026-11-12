import React, { useEffect, useMemo, useState } from 'react';
import { X, FileSpreadsheet, Building2, UserCheck, Users, Download, Check, ListTree, BarChart3, Layers } from 'lucide-react';
import { getProfiles } from '../services/storageService';
import {
  buildReportRows,
  generateDeliverablesReport,
  groupRows,
  REPORT_DOC_ITEMS,
  REPORT_DOC_KEYS,
  REPORT_STATUS_ITEMS,
  REPORT_STATUS_KEYS,
  NO_RESPONSIBLE,
} from '../utils/deliverablesReport';

const GROUP_OPTIONS = [
  { id: 'empresa', label: 'Por Empresa', desc: 'Agrupado por empresa', icon: Building2 },
  { id: 'responsavel', label: 'Por Responsável', desc: 'Agrupado por técnico', icon: UserCheck },
  { id: 'empresa_responsavel', label: 'Empresa e Responsável', desc: 'Por empresa × responsável', icon: Users },
];

const FORMAT_OPTIONS = [
  { id: 'analitico', label: 'Analítico', desc: 'Lista detalhada de cada documento com datas e validade', icon: ListTree },
  { id: 'sintetico', label: 'Sintético', desc: 'Quadro consolidado (PGR, PCMSO, LTCAT, LI, LP) e totais', icon: BarChart3 },
  { id: 'ambos', label: 'Analítico + Sintético', desc: 'Planilha completa com as duas abas (Sintético e Analítico)', icon: Layers },
];

const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

const DeliverablesReportModal = ({ deliverables, companies, contracts, onClose }) => {
  const [groupBy, setGroupBy] = useState('empresa_responsavel');
  const [reportFormat, setReportFormat] = useState('analitico');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedResponsible, setSelectedResponsible] = useState('all');
  const [docKeys, setDocKeys] = useState(REPORT_DOC_KEYS);
  const [statusKeys, setStatusKeys] = useState(REPORT_STATUS_KEYS);
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

  // Linhas base filtradas por documentos (PGR, PCMSO, LTCAT, LI, LP), antes do filtro de status
  const rowsByDocs = useMemo(() => buildReportRows({
    deliverables,
    companies,
    contracts,
    profiles,
    docKeys,
    statusKeys: REPORT_STATUS_KEYS,
    includeInactive,
  }), [deliverables, companies, contracts, profiles, docKeys, includeInactive]);

  // Linhas filtradas também pelos status selecionados (Vencido, Próximos a Vencer, Pendente, Entregue)
  const baseRows = useMemo(() => {
    const allowedStatuses = new Set(statusKeys);
    return rowsByDocs.filter(r => r.situation.filterKey === 'inativo' || allowedStatuses.has(r.situation.filterKey));
  }, [rowsByDocs, statusKeys]);

  const companyOptions = useMemo(() => {
    const map = new Map();
    rowsByDocs.forEach(r => {
      if (selectedResponsible === 'all' || r.responsible === selectedResponsible) {
        if (!map.has(r.companyId)) map.set(r.companyId, r.companyName);
      }
    });
    return [...map.entries()].sort((a, b) => collator.compare(a[1], b[1]));
  }, [rowsByDocs, selectedResponsible]);

  const responsibleOptions = useMemo(() => {
    const set = new Set();
    rowsByDocs.forEach(r => {
      if (selectedCompany === 'all' || r.companyId === selectedCompany) {
        set.add(r.responsible);
      }
    });
    return [...set].sort((a, b) => {
      if (a === NO_RESPONSIBLE) return 1;
      if (b === NO_RESPONSIBLE) return -1;
      return collator.compare(a, b);
    });
  }, [rowsByDocs, selectedCompany]);

  // Contagem por status considerando empresa e responsável selecionados
  const statusCounts = useMemo(() => {
    const counts = { vencido: 0, a_vencer: 0, pendente: 0, entregue: 0 };
    rowsByDocs.forEach(r => {
      const matchCompany = selectedCompany === 'all' || r.companyId === selectedCompany;
      const matchResp = selectedResponsible === 'all' || r.responsible === selectedResponsible;
      if (matchCompany && matchResp && counts[r.situation.filterKey] !== undefined) {
        counts[r.situation.filterKey]++;
      }
    });
    return counts;
  }, [rowsByDocs, selectedCompany, selectedResponsible]);

  const filteredRows = useMemo(() => {
    return baseRows.filter(r => {
      const matchCompany = selectedCompany === 'all' || r.companyId === selectedCompany;
      const matchResp = selectedResponsible === 'all' || r.responsible === selectedResponsible;
      return matchCompany && matchResp;
    });
  }, [baseRows, selectedCompany, selectedResponsible]);

  const groupCount = useMemo(() => groupRows(filteredRows, groupBy).length, [filteredRows, groupBy]);

  const toggleDocKey = (key) => {
    setDocKeys(prev => {
      if (prev.includes(key)) return prev.length === 1 ? prev : prev.filter(x => x !== key);
      return REPORT_DOC_KEYS.filter(x => x === key || prev.includes(x));
    });
  };

  const toggleStatusKey = (key) => {
    setStatusKeys(prev => {
      if (prev.includes(key)) return prev.length === 1 ? prev : prev.filter(x => x !== key);
      return REPORT_STATUS_KEYS.filter(x => x === key || prev.includes(x));
    });
  };

  const allStatusesSelected = statusKeys.length === REPORT_STATUS_KEYS.length;

  const selectedCompanyName = selectedCompany !== 'all'
    ? (companies.find(c => c.id === selectedCompany)?.name || '')
    : '';
  const selectedResponsibleName = selectedResponsible !== 'all' ? selectedResponsible : '';
  const selectedStatusLabel = !allStatusesSelected
    ? REPORT_STATUS_ITEMS.filter(s => statusKeys.includes(s.key)).map(s => s.label).join(', ')
    : '';

  const selectionLabel = [selectedCompanyName, selectedResponsibleName, selectedStatusLabel].filter(Boolean).join(' • ');
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
        docKeys,
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
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
                PGR, PCMSO, LTCAT, Laudo de Insalubridade e Laudo de Periculosidade (.xlsx)
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

          {/* 4. Status: Vencido, Próximos a Vencer, Pendente, Entregue */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
              <span className="modal-label" style={{ marginBottom: 0 }}>Status dos entregáveis</span>
              {!allStatusesSelected && (
                <button
                  type="button"
                  onClick={() => setStatusKeys(REPORT_STATUS_KEYS)}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    fontSize: '0.75rem', fontWeight: '600', color: 'var(--primary)', textDecoration: 'underline'
                  }}
                >
                  Selecionar todos os status
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {REPORT_STATUS_ITEMS.map(st => {
                const active = statusKeys.includes(st.key);
                const count = statusCounts[st.key] || 0;
                return (
                  <label
                    key={st.key}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                      fontSize: '0.8125rem', cursor: 'pointer',
                      padding: '0.4rem 0.7rem', borderRadius: 'var(--radius-md)',
                      border: active ? `1.5px solid ${st.color}` : '1px solid var(--border)',
                      backgroundColor: active ? st.bg : 'var(--surface)',
                      color: active ? st.color : 'var(--text-secondary)',
                      fontWeight: active ? '600' : '500',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleStatusKey(st.key)}
                      style={{ width: '15px', height: '15px', accentColor: st.color }}
                    />
                    <span>{st.label}</span>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: '700',
                      padding: '0.05rem 0.4rem', borderRadius: '999px',
                      backgroundColor: active ? 'rgba(255,255,255,0.75)' : 'var(--background)',
                      color: active ? st.color : 'var(--text-secondary)',
                    }}>
                      {count}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 5. Documentos contemplados: PGR, PCMSO, LTCAT, LI, LP */}
          <div>
            <span className="modal-label">Programas e Laudos contemplados</span>
            <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', marginTop: '0.375rem' }}>
              {REPORT_DOC_ITEMS.map(item => (
                <label
                  key={item.key}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                    fontSize: '0.8125rem', cursor: 'pointer',
                    padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-md)',
                    border: docKeys.includes(item.key) ? '1px solid var(--primary)' : '1px solid var(--border)',
                    backgroundColor: docKeys.includes(item.key) ? 'var(--primary-light)' : 'var(--surface)',
                    fontWeight: docKeys.includes(item.key) ? '600' : '500',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={docKeys.includes(item.key)}
                    onChange={() => toggleDocKey(item.key)}
                    style={{ width: '15px', height: '15px', accentColor: 'var(--primary)' }}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          {/* 6. Opções adicionais */}
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
              : 'Nenhum item encontrado para os filtros selecionados.'}
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
