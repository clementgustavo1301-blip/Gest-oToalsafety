import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar as CalendarIcon,
  FileText,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle,
  Clock,
  Building2,
  User,
  MapPin,
  Download,
  Printer,
  Sparkles,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  isSameMonth,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  generateCalendarGridPdf,
  generateTableSchedulePdf,
  generateCombinedSchedulePdf,
  STATUS_CONFIG,
  getSecondaryResponsible,
} from '../services/schedulePdfGenerator.js';

const ScheduleModal = ({
  onClose,
  initialDate = new Date(),
  trainings = [],
  companies = [],
  groups = [],
  profiles = [],
  initialScope = 'geral',
  initialCompanyId = '',
  initialResponsibleId = '',
  initialRegion = 'all',
  initialStatus = 'all',
  userProfile = null,
  customTitle = '',
}) => {
  const [currentDate, setCurrentDate] = useState(
    initialDate instanceof Date ? initialDate : new Date(initialDate)
  );
  const [scope, setScope] = useState(initialScope);
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [responsibleId, setResponsibleId] = useState(initialResponsibleId);
  const [region, setRegion] = useState(initialRegion);
  const [status, setStatus] = useState(initialStatus);

  const [loadingType, setLoadingType] = useState(null); // 'calendar' | 'table' | 'combined'

  const nextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));
  const prevMonth = () => setCurrentDate((prev) => subMonths(prev, 1));

  const getCompanyRegion = (cId) => companies.find((c) => c.id === cId)?.region || 'Natal';

  // Filter trainings according to modal settings
  const filteredTrainings = useMemo(() => {
    return trainings.filter((t) => {
      if (!t.date) return false;
      const tDate = new Date(t.date + 'T12:00:00');
      const matchMonth = isSameMonth(tDate, currentDate);
      if (!matchMonth) return false;

      const isExt = t.isExternal || t.demandType === 'externa' || (t.description && t.description.includes('[EXTERNAL_COMPANY:'));
      const matchStatus = status === 'all' || t.status === status;
      const matchRegion = region === 'all' || (isExt ? true : getCompanyRegion(t.companyId) === region);

      let matchScope = true;
      if (scope === 'minha_agenda' && userProfile?.id) {
        const secResp = getSecondaryResponsible(t.description);
        matchScope = t.responsibleId === userProfile.id || secResp === userProfile.id;
      } else if (scope === 'empresa' && companyId) {
        matchScope = t.companyId === companyId;
      } else if (scope === 'responsavel' && responsibleId) {
        const secResp = getSecondaryResponsible(t.description);
        matchScope = t.responsibleId === responsibleId || secResp === responsibleId;
      } else if (scope === 'externas') {
        matchScope = isExt;
      }

      return matchStatus && matchRegion && matchScope;
    });
  }, [trainings, currentDate, scope, companyId, responsibleId, region, status, userProfile]);

  // Breakdown KPIs
  const totalCount = filteredTrainings.length;
  const agendadosCount = filteredTrainings.filter((t) => t.status === 'agendado').length;
  const concluidosCount = filteredTrainings.filter((t) => t.status === 'concluido').length;
  const adiadosCount = filteredTrainings.filter((t) => t.status === 'adiado').length;
  const naoFeitosCount = filteredTrainings.filter((t) => t.status === 'nao_feito').length;

  const getScopeLabel = () => {
    if (scope === 'minha_agenda') return `Minha Agenda (${userProfile?.name || 'Usuário'})`;
    if (scope === 'externas') return 'Demandas Fora do TotalSafety (Externas)';
    if (scope === 'empresa') {
      const comp = companies.find((c) => c.id === companyId);
      return comp ? `Empresa: ${comp.name}` : 'Empresa Selecionada';
    }
    if (scope === 'responsavel') {
      const prof = profiles.find((p) => p.id === responsibleId);
      return prof ? `Responsável: ${prof.name}` : 'Responsável Selecionado';
    }
    return 'Agenda Geral (Todas as Empresas)';
  };

  const buildPdfOptions = () => ({
    currentDate,
    events: filteredTrainings,
    companies,
    groups,
    profiles,
    filters: {
      scope: getScopeLabel(),
      region: region === 'all' ? 'Todas' : region,
      status: status === 'all' ? 'Todos' : STATUS_CONFIG[status]?.label || status,
    },
    customTitle: customTitle || undefined,
  });

  const handleDownload = async (type) => {
    if (totalCount === 0) {
      const proceed = window.confirm(
        'Não há agendamentos para este mês com os filtros selecionados. Deseja gerar o cronograma em branco mesmo assim?'
      );
      if (!proceed) return;
    }

    setLoadingType(type);
    try {
      // Small timeout to allow spinner to render
      await new Promise((r) => setTimeout(r, 100));
      const options = buildPdfOptions();

      if (type === 'calendar') {
        generateCalendarGridPdf(options);
      } else if (type === 'table') {
        generateTableSchedulePdf(options);
      } else if (type === 'combined') {
        generateCombinedSchedulePdf(options);
      }
    } catch (err) {
      console.error('Erro ao gerar PDF do cronograma:', err);
      alert('Ocorreu um erro ao gerar o documento PDF. Tente novamente.');
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000, animation: 'fadeIn 0.2s ease' }} onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '820px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--radius-lg, 12px)',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
            color: 'white',
            padding: '1.25rem 1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(4px)',
              }}
            >
              <CalendarIcon size={22} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1875rem', fontWeight: '700', margin: 0, color: 'white' }}>
                Gerar Cronograma da Agenda
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.85)', margin: 0 }}>
                Disponível para todos os acessos • Formato de Calendário A4 e Relatório Analítico
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '1.15rem 1rem',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            backgroundColor: 'var(--background, #f8fafc)',
          }}
        >
          {/* Month Selector Bar */}
          <div
            className="card"
            style={{
              padding: '0.875rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--surface, #ffffff)',
              border: '1px solid var(--border, #e2e8f0)',
              borderRadius: 'var(--radius-md, 8px)',
            }}
          >
            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary, #64748b)', fontWeight: '600', textTransform: 'uppercase' }}>
                Mês de Referência
              </span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary, #1e3a8a)', margin: 0, textTransform: 'capitalize' }}>
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </h3>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={prevMonth}
                style={{ padding: '0.375rem 0.625rem', display: 'flex', alignItems: 'center' }}
                title="Mês Anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCurrentDate(new Date())}
                style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
              >
                Mês Atual
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={nextMonth}
                style={{ padding: '0.375rem 0.625rem', display: 'flex', alignItems: 'center' }}
                title="Próximo Mês"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Filter Customization Dock */}
          <div
            className="card"
            style={{
              padding: '1rem',
              backgroundColor: 'var(--surface, #ffffff)',
              border: '1px solid var(--border, #e2e8f0)',
              borderRadius: 'var(--radius-md, 8px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary, #475569)' }}>
              <Filter size={14} /> Filtros do Cronograma (O que será incluído no PDF):
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
              {/* Scope */}
              <div>
                <label className="modal-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem', display: 'block' }}>
                  Escopo da Agenda
                </label>
                <select
                  value={scope}
                  onChange={(e) => {
                    setScope(e.target.value);
                    if (e.target.value === 'empresa' && companies.length > 0 && !companyId) {
                      setCompanyId(companies[0].id);
                    }
                    if (e.target.value === 'responsavel' && profiles.length > 0 && !responsibleId) {
                      setResponsibleId(profiles[0].id);
                    }
                  }}
                  className="modal-input"
                  style={{ fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
                >
                  <option value="geral">Agenda Geral (Todas)</option>
                  <option value="minha_agenda">Minha Agenda</option>
                  <option value="externas">⚡ Demandas Fora do TotalSafety</option>
                  <option value="empresa">Por Empresa Específica</option>
                  <option value="responsavel">Por Responsável</option>
                </select>
              </div>

              {/* Company Selector (if scope === 'empresa') */}
              {scope === 'empresa' && (
                <div>
                  <label className="modal-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem', display: 'block' }}>
                    Empresa
                  </label>
                  <select
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="modal-input"
                    style={{ fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
                  >
                    {[...companies]
                      .sort((a, b) => {
                        if (groups.length > 0) {
                          const grpA = groups.find(g => g.id === a.groupId)?.name || '';
                          const grpB = groups.find(g => g.id === b.groupId)?.name || '';
                          if (grpA && grpB && grpA !== grpB) {
                            return grpA.localeCompare(grpB, undefined, { numeric: true });
                          }
                        }
                        return a.name.localeCompare(b.name, undefined, { numeric: true });
                      })
                      .map((c) => {
                        const grp = groups.find(g => g.id === c.groupId);
                        const grpNum = grp ? grp.name.match(/^\d+/)?.[0] : null;
                        const hasNumPrefix = /^\d+/.test(c.name);
                        const label = grpNum && !hasNumPrefix
                          ? `${grpNum} - ${c.name}`
                          : c.name;
                        return (
                          <option key={c.id} value={c.id}>
                            {label}
                          </option>
                        );
                      })}
                  </select>
                </div>
              )}

              {/* Responsible Selector (if scope === 'responsavel') */}
              {scope === 'responsavel' && (
                <div>
                  <label className="modal-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem', display: 'block' }}>
                    Responsável
                  </label>
                  <select
                    value={responsibleId}
                    onChange={(e) => setResponsibleId(e.target.value)}
                    className="modal-input"
                    style={{ fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Region */}
              <div>
                <label className="modal-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem', display: 'block' }}>
                  Região
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="modal-input"
                  style={{ fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
                >
                  <option value="all">Todas as Regiões</option>
                  <option value="Natal">Natal</option>
                  <option value="Mossoró">Mossoró</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="modal-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem', display: 'block' }}>
                  Status dos Treinamentos
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="modal-input"
                  style={{ fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
                >
                  <option value="all">Todos os Status</option>
                  <option value="agendado">Somente Agendados</option>
                  <option value="concluido">Somente Concluídos</option>
                  <option value="adiado">Somente Adiados</option>
                  <option value="nao_feito">Somente Não Feitos</option>
                </select>
              </div>
            </div>

            {/* Quick KPI count row */}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap',
                marginTop: '0.25rem',
                paddingTop: '0.5rem',
                borderTop: '1px dashed var(--border, #e2e8f0)',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)' }}>
                Resultados filtrados:
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '1rem',
                  backgroundColor: 'var(--primary-light, #eff6ff)',
                  color: 'var(--primary, #1e3a8a)',
                }}
              >
                {totalCount} atividades
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '1rem',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                }}
              >
                {agendadosCount} agendados
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '1rem',
                  backgroundColor: '#ecfdf5',
                  color: '#16a34a',
                }}
              >
                {concluidosCount} concluídos
              </span>
              {adiadosCount > 0 && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '1rem',
                    backgroundColor: '#fffbeb',
                    color: '#d97706',
                  }}
                >
                  {adiadosCount} adiados
                </span>
              )}
              {naoFeitosCount > 0 && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '1rem',
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                  }}
                >
                  {naoFeitosCount} não feitos
                </span>
              )}
            </div>
          </div>

          {/* Formats Selector Section */}
          <div>
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                color: 'var(--text-primary, #0f172a)',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
              }}
            >
              <Sparkles size={16} color="#2563eb" /> Escolha o Formato de Exportação em A4:
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
              {/* Option 1: Formato Calendário (Grade Mensal) */}
              <div
                className="card"
                style={{
                  padding: '1.25rem',
                  backgroundColor: 'var(--surface, #ffffff)',
                  border: '2px solid #2563eb',
                  borderRadius: 'var(--radius-md, 10px)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.1)',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '12px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    fontSize: '0.625rem',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Visual em A4
                </div>

                <div>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <CalendarIcon size={20} />
                  </div>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#1e3a8a', marginBottom: '0.375rem' }}>
                    Formato de Calendário (Grade Mensal A4)
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)', lineHeight: '1.4', marginBottom: '1rem' }}>
                    Layout visual clássico em grade mensal A4 horizontal. Cada dia exibe horário, turno, empresa e treinamento com cores por status. Ideal para impressão e murais.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleDownload('calendar')}
                  disabled={loadingType !== null}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem',
                    fontWeight: '600',
                    fontSize: '0.8125rem',
                  }}
                >
                  <Download size={15} />
                  {loadingType === 'calendar' ? 'Gerando PDF...' : 'Baixar Calendário (A4)'}
                </button>
              </div>

              {/* Option 2: Formato Tabela / Relatório Analítico */}
              <div
                className="card"
                style={{
                  padding: '1.25rem',
                  backgroundColor: 'var(--surface, #ffffff)',
                  border: '1px solid var(--border, #e2e8f0)',
                  borderRadius: 'var(--radius-md, 10px)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <FileText size={20} />
                  </div>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)', marginBottom: '0.375rem' }}>
                    Formato Tabela Analítica (A4)
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)', lineHeight: '1.4', marginBottom: '1rem' }}>
                    Tabela estruturada e completa com colunas detalhadas: Data, Horário/Turno, Empresa, Treinamento, Responsável e Status com totalizadores finais.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleDownload('table')}
                  disabled={loadingType !== null}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem',
                    fontWeight: '600',
                    fontSize: '0.8125rem',
                  }}
                >
                  <Download size={15} />
                  {loadingType === 'table' ? 'Gerando PDF...' : 'Baixar Tabela (A4)'}
                </button>
              </div>

              {/* Option 3: Pacote Completo (Calendário + Tabela) */}
              <div
                className="card"
                style={{
                  padding: '1.25rem',
                  backgroundColor: 'var(--surface, #ffffff)',
                  border: '1px solid var(--border, #e2e8f0)',
                  borderRadius: 'var(--radius-md, 10px)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: '#ecfdf5',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <Layers size={20} />
                  </div>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)', marginBottom: '0.375rem' }}>
                    Pacote Completo (Calendário + Tabela)
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)', lineHeight: '1.4', marginBottom: '1rem' }}>
                    O arquivo mais completo: Página 1 com a Grade Visual de Calendário em A4 e páginas seguintes com a Tabela Analítica detalhada.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleDownload('combined')}
                  disabled={loadingType !== null}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem',
                    fontWeight: '600',
                    fontSize: '0.8125rem',
                    borderColor: '#10b981',
                    color: '#047857',
                  }}
                >
                  <Download size={15} />
                  {loadingType === 'combined' ? 'Gerando Pacote...' : 'Baixar Pacote Completo'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border, #e2e8f0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--surface, #ffffff)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)' }}>
            Total de <strong>{totalCount}</strong> atividades para exportação
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loadingType !== null}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;
