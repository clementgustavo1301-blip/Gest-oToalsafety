import React, { useState } from 'react';
import type { Campaign, PartnerAppointment, EventType } from '../types';
import { EVENT_TYPE_LABELS } from '../types';
import { X, Calendar, MapPin, Building, DollarSign } from 'lucide-react';

/* ============================================= */
/* Modal Base                                    */
/* ============================================= */
export const Modal: React.FC<{
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, subtitle, onClose, children }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="modal-subtitle">{subtitle}</p>}
        </div>
        <button className="btn-icon" onClick={onClose} aria-label="Fechar">
          <X size={20} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

/* ============================================= */
/* Formulário - Nova Campanha / Ação / Palestra  */
/* ============================================= */
interface CampaignFormProps {
  onSave: (c: Omit<Campaign, 'id'>) => void;
  onClose: () => void;
  initial?: Campaign;
  defaultDate?: string;
  defaultType?: EventType;
}

export const CampaignForm: React.FC<CampaignFormProps> = ({
  onSave,
  onClose,
  initial,
  defaultDate,
  defaultType
}) => {
  const [company, setCompany] = useState(initial?.company ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? '');
  const [eventType, setEventType] = useState<EventType>(initial?.eventType ?? defaultType ?? 'campanha');
  const [expectedCount, setExpectedCount] = useState(initial?.expectedCount ?? 50);
  const [attendedCount, setAttendedCount] = useState(initial?.attendedCount ?? 0);
  const [returnedAsos, setReturnedAsos] = useState(initial?.returnedAsos ?? 0);
  const [kitReady, setKitReady] = useState(initial?.kitReady ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      company,
      location,
      date,
      eventType,
      kitReady,
      expectedCount: Number(expectedCount) || 0,
      attendedCount: Number(attendedCount) || 0,
      returnedAsos: Number(returnedAsos) || 0,
      scanned: initial?.scanned ?? false,
      insertedSOC: initial?.insertedSOC ?? false,
      lat: initial?.lat,
      lng: initial?.lng,
      notes,
    });
    onClose();
  };

  const title = initial
    ? 'Editar Evento de Saúde'
    : eventType === 'campanha' ? 'Nova Campanha — Unidade Móvel'
    : eventType === 'acao' ? 'Nova Ação em Empresa'
    : 'Nova Palestra / SIPAT';

  return (
    <Modal
      title={title}
      subtitle="Cadastre os dados operacionais do atendimento in-company"
      onClose={onClose}
    >
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Tipo de Evento</label>
          <select value={eventType} onChange={e => setEventType(e.target.value as EventType)}>
            {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Empresa Cliente</label>
          <div className="input-with-icon">
            <Building size={16} className="input-icon" />
            <input
              type="text"
              value={company}
              onChange={e => setCompany(e.target.value)}
              required
              placeholder="Ex: Indústria Alpha Metalúrgica S.A."
            />
          </div>
        </div>

        <div className="form-group">
          <label>Localização / Endereço Completo</label>
          <div className="input-with-icon">
            <MapPin size={16} className="input-icon" />
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              required
              placeholder="Ex: Filial Sul - São Paulo / SP"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Data Prevista</label>
            <div className="input-with-icon">
              <Calendar size={16} className="input-icon" />
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Vidas Previstas</label>
            <input
              type="number"
              min="1"
              value={expectedCount}
              onChange={e => setExpectedCount(Number(e.target.value))}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Atendidos (Executado)</label>
            <input
              type="number"
              min="0"
              value={attendedCount}
              onChange={e => setAttendedCount(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>ASOs Físicos Retornados</label>
            <input
              type="number"
              min="0"
              value={returnedAsos}
              onChange={e => setReturnedAsos(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="checkbox-toggle-label" style={{ marginTop: '4px' }}>
            <input
              type="checkbox"
              className="custom-checkbox"
              checked={kitReady}
              onChange={e => setKitReady(e.target.checked)}
            />
            <span>Kit de Campanha (insumos, tubos e guias) já separado e conferido</span>
          </label>
        </div>

        <div className="form-group">
          <label>Observações Operacionais / Equipe</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Ex: Unidade Móvel 01, Dr. Marcelo e Enfª Patrícia."
            className="form-textarea"
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            {initial ? 'Salvar Alterações' : 'Cadastrar Campanha'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/* ============================================= */
/* Formulário - Novo Agendamento Parceiro        */
/* ============================================= */
interface PartnerFormProps {
  onSave: (p: Omit<PartnerAppointment, 'id'>) => void;
  onClose: () => void;
  initial?: PartnerAppointment;
  defaultDate?: string;
}

export const PartnerForm: React.FC<PartnerFormProps> = ({
  onSave,
  onClose,
  initial,
  defaultDate
}) => {
  const [client, setClient] = useState(initial?.client ?? '');
  const [partnerClinic, setPartnerClinic] = useState(initial?.partnerClinic ?? '');
  const [state, setState] = useState(initial?.state ?? 'SP');
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? '');
  const [value, setValue] = useState(initial?.value ?? 150);
  const [invoiceStatus, setInvoiceStatus] = useState<PartnerAppointment['invoiceStatus']>(
    initial?.invoiceStatus ?? 'pendente'
  );
  const [invoiceRef, setInvoiceRef] = useState(initial?.invoiceRef ?? '');
  const [paid, setPaid] = useState(initial?.paid ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      client,
      partnerClinic,
      state: state.toUpperCase(),
      date,
      value: Number(value) || 0,
      invoiceStatus,
      invoiceRef,
      paid,
      examsReceived: initial?.examsReceived ?? false,
      notes,
    });
    onClose();
  };

  return (
    <Modal
      title={initial ? 'Editar Agendamento Parceiro' : 'Novo Agendamento em Clínica Parceira'}
      subtitle="Controle de encaminhamentos para rede credenciada em todo o Brasil"
      onClose={onClose}
    >
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Cliente (Empresa Contratante)</label>
          <input
            type="text"
            value={client}
            onChange={e => setClient(e.target.value)}
            required
            placeholder="Ex: Logística Nacional S.A."
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Clínica Credenciada</label>
            <input
              type="text"
              value={partnerClinic}
              onChange={e => setPartnerClinic(e.target.value)}
              required
              placeholder="Ex: ClinMed Ocupacional"
            />
          </div>

          <div className="form-group" style={{ maxWidth: '100px' }}>
            <label>UF</label>
            <input
              type="text"
              value={state}
              onChange={e => setState(e.target.value.toUpperCase())}
              required
              maxLength={2}
              placeholder="SP"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Data do Atendimento</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Valor dos Exames (R$)</label>
            <div className="input-with-icon">
              <DollarSign size={16} className="input-icon" />
              <input
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={e => setValue(Number(e.target.value))}
                required
              />
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Status do Faturamento</label>
            <select
              value={invoiceStatus}
              onChange={e => setInvoiceStatus(e.target.value as PartnerAppointment['invoiceStatus'])}
            >
              <option value="pendente">Pendente de Emissão</option>
              <option value="faturado">Faturado pela Clínica</option>
              <option value="enviado">NF Enviada ao Cliente</option>
            </select>
          </div>

          <div className="form-group">
            <label>Ref. da Nota / Fatura</label>
            <input
              type="text"
              value={invoiceRef}
              onChange={e => setInvoiceRef(e.target.value)}
              placeholder="Ex: NF-2026-0089"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="checkbox-toggle-label">
            <input
              type="checkbox"
              className="custom-checkbox"
              checked={paid}
              onChange={e => setPaid(e.target.checked)}
            />
            <span>Pagamento já liquidado financeiramente</span>
          </label>
        </div>

        <div className="form-group">
          <label>Observações</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Ex: Exames complementares de audiometria e acuidade visual."
            className="form-textarea"
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            {initial ? 'Salvar Alterações' : 'Cadastrar Agendamento'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/* ============================================= */
/* Modal de Confirmação de Exclusão              */
/* ============================================= */
interface ConfirmDeleteProps {
  itemName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDelete: React.FC<ConfirmDeleteProps> = ({
  itemName,
  onConfirm,
  onClose
}) => (
  <Modal title="Confirmar Exclusão" onClose={onClose}>
    <div className="form">
      <p style={{ marginBottom: '24px', color: 'var(--t80)', lineHeight: '1.6' }}>
        Tem certeza que deseja excluir <strong>{itemName}</strong> permanentemente? Esta operação removerá todos os registros associados.
      </p>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="btn btn-danger"
          onClick={() => { onConfirm(); onClose(); }}
        >
          Confirmar e Excluir
        </button>
      </div>
    </div>
  </Modal>
);
