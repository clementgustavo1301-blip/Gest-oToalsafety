// Tipos do sistema IPA — Gestão de Saúde Ocupacional

export type EventType = 'campanha' | 'acao' | 'palestra';

export interface Campaign {
  id: string;
  company: string;
  location: string;
  date: string;
  eventType: EventType;
  kitReady: boolean;
  expectedCount: number;
  attendedCount: number;
  returnedAsos: number;
  scanned: boolean;
  insertedSOC: boolean;
  lat?: number;
  lng?: number;
  notes?: string;
}

export interface PartnerAppointment {
  id: string;
  client: string;
  partnerClinic: string;
  state: string;
  date: string;
  value: number;
  invoiceStatus: 'pendente' | 'faturado' | 'enviado';
  invoiceRef: string;
  paid: boolean;
  examsReceived: boolean;
  lat?: number;
  lng?: number;
  notes?: string;
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  campanha: 'Campanha (Unidade Móvel)',
  acao: 'Ação em Empresa',
  palestra: 'Palestra Educativa',
};

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  campanha: '#0066ff',
  acao: '#8b5cf6',
  palestra: '#ffab00',
};

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}
