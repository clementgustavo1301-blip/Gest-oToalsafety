import { useState, useEffect } from 'react';
import type { Campaign, PartnerAppointment } from './types';

const CAMPAIGNS_KEY = 'ipa_campaigns_v2';
const PARTNERS_KEY = 'ipa_partners_v2';

const defaultCampaigns: Campaign[] = [
  {
    id: '1',
    company: 'Indústria Alpha Metalúrgica',
    location: 'Filial Sul - São Paulo / SP',
    date: '2026-10-23',
    eventType: 'campanha',
    kitReady: true,
    expectedCount: 150,
    attendedCount: 142,
    returnedAsos: 138,
    scanned: true,
    insertedSOC: false,
    lat: -23.5605,
    lng: -46.6433,
    notes: 'Campanha de exames periódicos completa. Unidade Móvel 01.'
  },
  {
    id: '2',
    company: 'Comércio & Logística Ômega',
    location: 'Matriz - Campinas / SP',
    date: '2026-10-18',
    eventType: 'campanha',
    kitReady: true,
    expectedCount: 95,
    attendedCount: 89,
    returnedAsos: 89,
    scanned: true,
    insertedSOC: true,
    lat: -22.9056,
    lng: -47.0608,
    notes: 'Exames concluídos e inseridos no SOC com sucesso.'
  },
  {
    id: '3',
    company: 'Construtora Beta & Obras',
    location: 'Canteiro Central - São Paulo / SP',
    date: '2026-10-25',
    eventType: 'acao',
    kitReady: false,
    expectedCount: 45,
    attendedCount: 0,
    returnedAsos: 0,
    scanned: false,
    insertedSOC: false,
    lat: -23.5405,
    lng: -46.6233,
    notes: 'Ação in-company com médico do trabalho e enfermagem.'
  },
  {
    id: '4',
    company: 'Transportadora Gama Brasil',
    location: 'CD Logístico - Jundiaí / SP',
    date: '2026-10-30',
    eventType: 'palestra',
    kitReady: false,
    expectedCount: 200,
    attendedCount: 0,
    returnedAsos: 0,
    scanned: false,
    insertedSOC: false,
    lat: -23.1857,
    lng: -46.8978,
    notes: 'SIPAT: Palestra de Ergonomia e Prevenção de Lesões.'
  },
  {
    id: '5',
    company: 'Distribuidora Delta Alimentos',
    location: 'Armazém Porto - Santos / SP',
    date: '2026-10-28',
    eventType: 'campanha',
    kitReady: true,
    expectedCount: 80,
    attendedCount: 75,
    returnedAsos: 60,
    scanned: false,
    insertedSOC: false,
    lat: -23.9608,
    lng: -46.3336,
    notes: 'Exames admissionais e periódicos portuários.'
  },
  {
    id: '6',
    company: 'Tecnologia Avançada Soluções',
    location: 'Polo Tecnológico - Sorocaba / SP',
    date: '2026-11-04',
    eventType: 'acao',
    kitReady: true,
    expectedCount: 60,
    attendedCount: 0,
    returnedAsos: 0,
    scanned: false,
    insertedSOC: false,
    lat: -23.5015,
    lng: -47.4526,
    notes: 'Exames periódicos com audiometria e acuidade visual.'
  }
];

const defaultPartners: PartnerAppointment[] = [
  {
    id: '1',
    client: 'Logística Nacional S.A',
    partnerClinic: 'ClinMed Ocupacional',
    state: 'MG',
    date: '2026-10-20',
    value: 150,
    invoiceStatus: 'faturado',
    invoiceRef: 'NF-2026-0041',
    paid: true,
    examsReceived: true,
    lat: -19.9167,
    lng: -43.9345,
    notes: 'Belo Horizonte - ASOs recebidos e arquivados.'
  },
  {
    id: '2',
    client: 'Logística Nacional S.A',
    partnerClinic: 'Saúde Total Ocupacional',
    state: 'BA',
    date: '2026-10-23',
    value: 220,
    invoiceStatus: 'pendente',
    invoiceRef: '',
    paid: false,
    examsReceived: true,
    lat: -12.9714,
    lng: -38.5014,
    notes: 'Salvador - Aguardando emissão da nota pela clínica.'
  },
  {
    id: '3',
    client: 'Varejo Express Brasil',
    partnerClinic: 'Med Nordeste Central',
    state: 'PE',
    date: '2026-10-28',
    value: 180,
    invoiceStatus: 'enviado',
    invoiceRef: 'NF-2026-0055',
    paid: false,
    examsReceived: false,
    lat: -8.0476,
    lng: -34.8770,
    notes: 'Recife - Atendimento agendado para o turno matutino.'
  },
  {
    id: '4',
    client: 'Varejo Express Brasil',
    partnerClinic: 'Centro Médico do Trabalhador',
    state: 'RJ',
    date: '2026-10-25',
    value: 260,
    invoiceStatus: 'faturado',
    invoiceRef: 'NF-2026-0062',
    paid: true,
    examsReceived: false,
    lat: -22.9068,
    lng: -43.1729,
    notes: 'Rio de Janeiro - Cobrança pendente de envio do lote ASO.'
  }
];

function loadFromStorage<T>(key: string, defaults: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as unknown as T;
    }
  } catch { /* ignore */ }
  return defaults;
}

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(() =>
    loadFromStorage(CAMPAIGNS_KEY, defaultCampaigns)
  );

  useEffect(() => {
    localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
  }, [campaigns]);

  const addCampaign = (c: Omit<Campaign, 'id'>) => {
    const newCamp: Campaign = { ...c, id: Date.now().toString() };
    setCampaigns(prev => [newCamp, ...prev]);
  };

  const updateCampaign = (id: string, updates: Partial<Campaign>) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCampaign = (id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  return { campaigns, addCampaign, updateCampaign, deleteCampaign };
}

export function usePartners() {
  const [partners, setPartners] = useState<PartnerAppointment[]>(() =>
    loadFromStorage(PARTNERS_KEY, defaultPartners)
  );

  useEffect(() => {
    localStorage.setItem(PARTNERS_KEY, JSON.stringify(partners));
  }, [partners]);

  const addPartner = (p: Omit<PartnerAppointment, 'id'>) => {
    const newPart: PartnerAppointment = { ...p, id: Date.now().toString() };
    setPartners(prev => [newPart, ...prev]);
  };

  const updatePartner = (id: string, updates: Partial<PartnerAppointment>) => {
    setPartners(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePartner = (id: string) => {
    setPartners(prev => prev.filter(p => p.id !== id));
  };

  return { partners, addPartner, updatePartner, deletePartner };
}
