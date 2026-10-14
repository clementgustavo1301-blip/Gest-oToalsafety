import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar as CalendarIcon,
  FileText,
  Layers,
  ChevronLeft,
  ChevronRight,
  Download,
  Sparkles,
} from 'lucide-react';
import { format, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Campaign, PartnerAppointment } from '../types';
import { generateIpaSchedulePdf } from '../services/schedulePdfGenerator';
import { fmtCurrency } from '../utils/format';

interface IpaScheduleModalProps {
  onClose: () => void;
  initialDate?: Date;
  campaigns: Campaign[];
  partners: PartnerAppointment[];
}

export const IpaScheduleModal: React.FC<IpaScheduleModalProps> = ({
  onClose,
  initialDate = new Date(),
  campaigns = [],
  partners = [],
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(
    initialDate instanceof Date ? initialDate : new Date(initialDate)
  );
  const [loadingType, setLoadingType] = useState<'calendar' | 'table' | 'combined' | null>(null);

  const nextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));
  const prevMonth = () => setCurrentDate((prev) => subMonths(prev, 1));

  // Filter events for this month
  const monthCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (!c.date) return false;
      const d = new Date(c.date + 'T12:00:00');
      return isSameMonth(d, currentDate);
    });
  }, [campaigns, currentDate]);

  const monthPartners = useMemo(() => {
    return partners.filter((p) => {
      if (!p.date) return false;
      const d = new Date(p.date + 'T12:00:00');
      return isSameMonth(d, currentDate);
    });
  }, [partners, currentDate]);

  const totalEvents = monthCampaigns.length + monthPartners.length;
  const totalVidasPrevistas = monthCampaigns.reduce((acc, c) => acc + (c.expectedCount || 0), 0);
  const totalFaturamento = monthPartners.reduce((acc, p) => acc + (p.value || 0), 0);

  const handleDownload = async (type: 'calendar' | 'table' | 'combined') => {
    if (totalEvents === 0) {
      const proceed = window.confirm(
        'Não há agendamentos da operação IPA para este mês. Deseja gerar o documento em branco?'
      );
      if (!proceed) return;
    }

    setLoadingType(type);
    try {
      await new Promise((r) => setTimeout(r, 100));
      generateIpaSchedulePdf({
        currentDate,
        campaigns: monthCampaigns,
        partners: monthPartners,
        formatType: type,
        title: `CRONOGRAMA OPERACIONAL IPA — ${format(currentDate, 'MMMM yyyy', { locale: ptBR }).toUpperCase()}`,
      });
    } catch (err) {
      console.error('Erro ao gerar cronograma IPA:', err);
      alert('Erro ao gerar PDF. Tente novamente.');
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
          maxWidth: '780px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            background: 'linear-gradient(135deg, #0284c7, #0369a1)',
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
                Gerar Cronograma da Operação IPA
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.85)', margin: 0 }}>
                Unidade Móvel, Ações In-Company e Clínicas Parceiras em A4
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

        {/* Body */}
        <div
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            backgroundColor: '#f8fafc',
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
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
          >
            <div>
              <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
                Mês de Referência
              </span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0369a1', margin: 0, textTransform: 'capitalize' }}>
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </h3>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={prevMonth}
                title="Mês Anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Hoje
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={nextMonth}
                title="Próximo Mês"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Month KPI summary */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '0.875rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <span style={{ fontSize: '0.6875rem', color: '#64748b', display: 'block', fontWeight: '600' }}>
                Total de Atividades
              </span>
              <strong style={{ fontSize: '1.25rem', color: '#0f172a' }}>{totalEvents}</strong>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '0.875rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <span style={{ fontSize: '0.6875rem', color: '#64748b', display: 'block', fontWeight: '600' }}>
                Campanhas / Unid. Móvel
              </span>
              <strong style={{ fontSize: '1.25rem', color: '#0284c7' }}>{monthCampaigns.length}</strong>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '0.875rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <span style={{ fontSize: '0.6875rem', color: '#64748b', display: 'block', fontWeight: '600' }}>
                Vidas Previstas
              </span>
              <strong style={{ fontSize: '1.25rem', color: '#2563eb' }}>{totalVidasPrevistas} vidas</strong>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '0.875rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <span style={{ fontSize: '0.6875rem', color: '#64748b', display: 'block', fontWeight: '600' }}>
                Faturamento Parceiras
              </span>
              <strong style={{ fontSize: '1.25rem', color: '#10b981' }}>{fmtCurrency(totalFaturamento)}</strong>
            </div>
          </div>

          {/* Formats Selector */}
          <div>
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                color: '#0f172a',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
              }}
            >
              <Sparkles size={16} color="#0284c7" /> Formatos Disponíveis em A4:
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {/* Option 1: Formato Calendário A4 */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #0284c7',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.1)',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '12px',
                    backgroundColor: '#0284c7',
                    color: 'white',
                    fontSize: '0.625rem',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    textTransform: 'uppercase',
                  }}
                >
                  Grade A4
                </div>

                <div>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: '#e0f2fe',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <CalendarIcon size={20} />
                  </div>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#0369a1', marginBottom: '0.375rem' }}>
                    Formato Calendário (A4)
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4', marginBottom: '1rem' }}>
                    Grade visual mensal de calendário A4 com campanhas, parceiras e vidas previstas em cada dia.
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
                    fontSize: '0.8125rem',
                  }}
                >
                  <Download size={15} />
                  {loadingType === 'calendar' ? 'Gerando...' : 'Baixar Calendário (A4)'}
                </button>
              </div>

              {/* Option 2: Formato Tabela A4 */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1.25rem',
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
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.375rem' }}>
                    Formato Tabela (A4)
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4', marginBottom: '1rem' }}>
                    Tabela detalhada com colunas completas: Data, Empresa/Cliente, Clínica, Vidas e Valores.
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
                    fontSize: '0.8125rem',
                  }}
                >
                  <Download size={15} />
                  {loadingType === 'table' ? 'Gerando...' : 'Baixar Tabela (A4)'}
                </button>
              </div>

              {/* Option 3: Pacote Completo A4 */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1.25rem',
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
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.375rem' }}>
                    Pacote Completo (A4)
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4', marginBottom: '1rem' }}>
                    Grade Visual de Calendário A4 na Página 1 e Tabela Analítica nas páginas subsequentes.
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
                    fontSize: '0.8125rem',
                    borderColor: '#10b981',
                    color: '#047857',
                  }}
                >
                  <Download size={15} />
                  {loadingType === 'combined' ? 'Gerando...' : 'Baixar Pacote Completo'}
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
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Total de <strong>{totalEvents}</strong> agendamentos para exportação
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

export default IpaScheduleModal;
