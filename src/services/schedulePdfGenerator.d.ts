import { jsPDF } from 'jspdf';
import type { Campaign, PartnerAppointment } from '../types';

export interface ScheduleEvent {
  id?: string;
  title: string;
  date: string;
  time?: string;
  companyId?: string;
  companyName?: string;
  status: 'agendado' | 'concluido' | 'adiado' | 'nao_feito' | string;
  responsibleId?: string;
  description?: string;
}

export interface ScheduleOptions {
  currentDate: Date;
  events?: ScheduleEvent[];
  companies?: Array<{ id: string; name: string; region?: string; groupId?: string }>;
  groups?: Array<{ id: string; name: string }>;
  profiles?: Array<{ id: string; name: string }>;
  filters?: {
    scope?: string;
    region?: string;
    status?: string;
    companyName?: string;
  };
  customTitle?: string;
}

export interface IpaScheduleOptions {
  currentDate: Date;
  campaigns?: Campaign[];
  partners?: PartnerAppointment[];
  formatType?: 'calendar' | 'table' | 'combined';
  title?: string;
}

export declare const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  rgb: [number, number, number];
  rgbBg: [number, number, number];
  rgbBorder: [number, number, number];
}>;

export declare function getPeriod(timeStr?: string): 'manha' | 'tarde';
export declare function cleanDescription(desc?: string): string;
export declare function getSecondaryResponsible(desc?: string): string | null;

export declare function drawCalendarGridPage(doc: jsPDF, options: ScheduleOptions): void;
export declare function drawTableSchedulePages(doc: jsPDF, options: ScheduleOptions, startOnNewPage?: boolean): void;

export declare function generateCalendarGridPdf(options: ScheduleOptions): jsPDF;
export declare function generateTableSchedulePdf(options: ScheduleOptions): jsPDF;
export declare function generateCombinedSchedulePdf(options: ScheduleOptions): jsPDF;

export declare function generateIpaSchedulePdf(options: IpaScheduleOptions): jsPDF;
