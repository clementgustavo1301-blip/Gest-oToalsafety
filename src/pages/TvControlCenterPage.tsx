import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Building2, CheckCircle2,
  AlertTriangle, Maximize2, Minimize2, ArrowLeft,
  ShieldCheck, Radio, BarChart3,
  Navigation, Calendar
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import RoutingMachine from '../components/RoutingMachine';
import L from 'leaflet';
import type { Campaign, PartnerAppointment } from '../types';
import { fmtCurrency, fmtDate } from '../utils/format';
import { resolveCoordinates, geocodeAddress } from '../utils/geocodeHelper';

interface TvControlCenterPageProps {
  campaigns: Campaign[];
  partners: PartnerAppointment[];
}

const BASE_COORDS: [number, number] = [-5.2056619002795514, -37.32918467893605];

/* ─── Map helpers ─── */
function MapBoundsController({ bounds, center }: { bounds?: L.LatLngBounds; center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: true });
    } else {
      map.setView(center, 12);
    }
  }, [map, bounds, center]);
  return null;
}

const makePin = (color: string, sz = 20) =>
  L.divIcon({
    className: 'tv2-pin',
    html: `<div style="
      background:${color};width:${sz}px;height:${sz}px;
      border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);
    "></div>`,
    iconSize: [sz, sz],
    iconAnchor: [sz / 2, Math.round(sz * 1.2)],
    popupAnchor: [0, -Math.round(sz * 1.2)],
  });

const nextPin = L.divIcon({
  className: 'tv2-pin-next',
  html: `<div style="
    width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    background:linear-gradient(135deg,#2563eb,#3b82f6);border:3px solid #fff;
    box-shadow:0 2px 10px rgba(37,99,235,0.4);
  "></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 38],
  popupAnchor: [0, -38],
});

const basePin = L.divIcon({
  className: 'tv2-pin-base',
  html: `<div style="
    width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    background:#0f172a;border:2px solid #2563eb;box-shadow:0 2px 8px rgba(37,99,235,0.3);
    display:flex;align-items:center;justify-content:center;
  "><span style='transform:rotate(45deg);font-size:12px;color:#2563eb;'>★</span></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 34],
  popupAnchor: [0, -34],
});

const campPin = makePin('#2563eb', 16);
const partPin = makePin('#10b981', 14);

/* ═════════════════ MAIN COMPONENT ═════════════════ */
export const TvControlCenterPage: React.FC<TvControlCenterPageProps> = ({
  campaigns, partners,
}) => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [asyncCoords, setAsyncCoords] = useState<[number, number] | null>(null);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const onlyCampaigns = campaigns.filter(c => c.eventType === 'campanha');

  // Compare dates using local YYYY-MM-DD strings to avoid UTC-3 timezone parsing issues
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  /* ─── Derived data ─── */
  const upcomingCampaigns = useMemo(() => {
    return onlyCampaigns
      .filter(c => c.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [onlyCampaigns, todayStr]);

  const activeCampaign = useMemo(() => {
    if (selectedCampaignId) {
      const found = campaigns.find(c => c.id === selectedCampaignId);
      if (found) return found;
    }
    // Default to the upcoming campaign, or the first available campaign
    return upcomingCampaigns[0] ?? onlyCampaigns[0] ?? campaigns[0] ?? null;
  }, [selectedCampaignId, campaigns, upcomingCampaigns, onlyCampaigns]);

  const upcomingList = useMemo(() => {
    return campaigns
      .filter(c => c.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
  }, [campaigns, todayStr]);

  // Synchronous resolution of destination coordinates
  const syncCoords = useMemo(() => {
    if (!activeCampaign) return null;
    return resolveCoordinates(activeCampaign.location, activeCampaign.lat, activeCampaign.lng, BASE_COORDS);
  }, [activeCampaign]);

  // Fallback asynchronous geocoding if not present in DB or KNOWN_CITIES
  useEffect(() => {
    if (syncCoords) {
      setAsyncCoords(null);
      return;
    }
    if (activeCampaign?.location) {
      let isMounted = true;
      geocodeAddress(activeCampaign.location).then(coords => {
        if (isMounted && coords) setAsyncCoords(coords);
      });
      return () => { isMounted = false; };
    }
  }, [activeCampaign, syncCoords]);

  const targetCoords = syncCoords ?? asyncCoords;

  const totalExpected = onlyCampaigns.reduce((s, c) => s + c.expectedCount, 0);
  const totalAttended = onlyCampaigns.reduce((s, c) => s + c.attendedCount, 0);
  const totalPalestras = campaigns.filter(c => c.eventType === 'palestra').length;
  const totalAcoes = campaigns.filter(c => c.eventType === 'acao').length;
  const totalAsos = onlyCampaigns.reduce((s, c) => s + (c.returnedAsos || 0), 0);
  const kitsPending = onlyCampaigns.filter(c => !c.kitReady).length;
  const awaitingSOC = onlyCampaigns.filter(c => !c.insertedSOC && c.attendedCount > 0).length;

  const totalPartValue = partners.reduce((s, p) => s + p.value, 0);
  const pctAttended = totalExpected > 0 ? Math.round((totalAttended / totalExpected) * 100) : 0;
  const pctAsos = totalAttended > 0 ? Math.round((totalAsos / totalAttended) * 100) : 0;

  /* Charts */
  const barData = onlyCampaigns.slice(0, 5).map(c => ({
    name: c.company.length > 10 ? c.company.substring(0, 10) + '…' : c.company,
    Previstos: c.expectedCount,
    Atendidos: c.attendedCount,
  }));

  /* Time */
  const time = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  /* Map */
  const mapCenter: [number, number] = targetCoords ?? BASE_COORDS;

  const mapBounds = useMemo(() => {
    if (targetCoords) {
      const isBase = Math.abs(targetCoords[0] - BASE_COORDS[0]) < 0.0001 && Math.abs(targetCoords[1] - BASE_COORDS[1]) < 0.0001;
      if (!isBase) {
        return L.latLngBounds(BASE_COORDS, targetCoords).pad(0.18);
      }
    }
    return undefined;
  }, [targetCoords]);

  /* Ticker */
  const alerts = [
    kitsPending > 0 ? `⚠ ${kitsPending} kits pendentes de separação` : null,
    awaitingSOC > 0 ? `📄 ${awaitingSOC} eventos aguardando inserção no SOC` : null,
    activeCampaign ? `🚐 Rota Ativa: ${activeCampaign.company} — ${fmtDate(activeCampaign.date)}` : null,
    `🏥 Rede credenciada: ${partners.length} atendimentos (${fmtCurrency(totalPartValue)})`,
  ].filter(Boolean);

  return (
    <div className="tv2">
      {/* ── HEADER ── */}
      <header className="tv2-header">
        <div className="tv2-header-left">
          <button className="tv2-back" onClick={() => navigate('/ipa')}>
            <ArrowLeft size={14} />
          </button>
          <div className="tv2-logo">
            <Radio size={16} />
          </div>
          <div className="tv2-brand">
            <span className="tv2-live-tag">
              <span className="tv2-live-dot" />
              CENTRAL DE CONTROLE — PAINEL TV
            </span>
            <h1 className="tv2-title">IPA · Monitoramento em Tempo Real</h1>
          </div>
        </div>

        <div className="tv2-header-center">
          <span className="tv2-time">{time}</span>
          <span className="tv2-date">{date}</span>
        </div>

        <div className="tv2-header-right">
          <div className="tv2-chip-ok">
            <ShieldCheck size={13} />
            <span>SOC ONLINE</span>
          </div>
          <button className="tv2-fs-btn" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </header>

      {/* ── KPI STRIP ── */}
      <div className="tv2-kpi-strip">
        <div className="tv2-kpi-card">
          <div className="tv2-kpi-icon bg-blue-dim"><Activity size={18} /></div>
          <div className="tv2-kpi-body">
            <span className="tv2-kpi-val">{onlyCampaigns.length}</span>
            <span className="tv2-kpi-lbl">Campanhas</span>
          </div>
          <div className="tv2-kpi-bar"><div className="tv2-kpi-fill" style={{ width: `${pctAttended}%`, background: '#2563eb' }} /></div>
        </div>

        <div className="tv2-kpi-card">
          <div className="tv2-kpi-icon bg-emerald-dim"><CheckCircle2 size={18} /></div>
          <div className="tv2-kpi-body">
            <span className="tv2-kpi-val">{totalAttended}<span className="tv2-kpi-sub">/{totalExpected}</span></span>
            <span className="tv2-kpi-lbl">Vidas Atendidas</span>
          </div>
          <div className="tv2-kpi-bar"><div className="tv2-kpi-fill" style={{ width: `${pctAttended}%`, background: '#10b981' }} /></div>
        </div>

        <div className="tv2-kpi-card">
          <div className="tv2-kpi-icon bg-emerald-dim"><ShieldCheck size={18} /></div>
          <div className="tv2-kpi-body">
            <span className="tv2-kpi-val">{totalAsos}</span>
            <span className="tv2-kpi-lbl">ASOs Retornados</span>
          </div>
          <div className="tv2-kpi-bar"><div className="tv2-kpi-fill" style={{ width: `${pctAsos}%`, background: '#10b981' }} /></div>
        </div>

        <div className="tv2-kpi-card">
          <div className="tv2-kpi-icon bg-blue-dim"><Activity size={18} /></div>
          <div className="tv2-kpi-body">
            <span className="tv2-kpi-val">{totalPalestras}</span>
            <span className="tv2-kpi-lbl">Palestras Educ.</span>
          </div>
          <div className="tv2-kpi-bar"><div className="tv2-kpi-fill" style={{ width: '100%', background: '#8b5cf6' }} /></div>
        </div>

        <div className="tv2-kpi-card">
          <div className="tv2-kpi-icon bg-blue-dim"><Building2 size={18} /></div>
          <div className="tv2-kpi-body">
            <span className="tv2-kpi-val">{totalAcoes}</span>
            <span className="tv2-kpi-lbl">Ações In-Company</span>
          </div>
          <div className="tv2-kpi-bar"><div className="tv2-kpi-fill" style={{ width: '100%', background: '#3b82f6' }} /></div>
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div className="tv2-body">
        {/* LEFT: Map */}
        <div className="tv2-map-section card">
          <div className="tv2-map-head">
            <div className="tv2-map-head-left">
              <Navigation size={16} className="text-blue" />
              <div>
                <h3>
                  {activeCampaign
                    ? `Trajeto: CACIM ➔ ${activeCampaign.company}`
                    : 'Próxima Campanha — Unidade Móvel'}
                </h3>
                {activeCampaign && (
                  <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0 }}>
                    {activeCampaign.location} · {fmtDate(activeCampaign.date)}
                  </p>
                )}
              </div>
            </div>
            <span className="tv2-badge-live">
              <span className="tv2-live-dot" />
              AO VIVO
            </span>
          </div>

          <div className="tv2-map-area">
            <MapContainer
              center={mapCenter}
              zoom={10}
              scrollWheelZoom={true}
              zoomControl={false}
              attributionControl={false}
              style={{ height: '100%', width: '100%' }}
            >
              <MapBoundsController bounds={mapBounds} center={mapCenter} />
              <TileLayer 
                attribution='&copy; Google Maps'
                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" 
              />

              <Marker position={BASE_COORDS} icon={basePin}>
                <Popup>
                  <strong>★ Ponto de Partida</strong>
                  <p>CACIM — Alto de São Manoel</p>
                  <p style={{fontSize: '0.75rem', color: '#64748b'}}>Rua Francisco Mota, 645 - Mossoró/RN</p>
                </Popup>
              </Marker>

              {activeCampaign && targetCoords && (
                <>
                  <RoutingMachine
                    start={BASE_COORDS}
                    end={targetCoords}
                    color="#2563eb"
                  />
                  <Marker position={targetCoords} icon={nextPin}>
                    <Popup>
                      <strong>★ {activeCampaign.company}</strong>
                      <p style={{ fontWeight: 700 }}>{activeCampaign.eventType === 'campanha' ? 'Unidade Móvel' : 'Atendimento'}</p>
                      <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{activeCampaign.location}</p>
                      <p style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '4px' }}>Data: {fmtDate(activeCampaign.date)}</p>
                    </Popup>
                  </Marker>
                </>
              )}

              {/* Other campaigns */}
              {campaigns.filter(c => c.id !== activeCampaign?.id).map(c => {
                const cCoords = resolveCoordinates(c.location, c.lat, c.lng, BASE_COORDS);
                if (!cCoords) return null;
                return (
                  <Marker 
                    key={c.id} 
                    position={cCoords} 
                    icon={campPin}
                    eventHandlers={{ click: () => setSelectedCampaignId(c.id) }}
                  >
                    <Popup>
                      <strong>{c.company}</strong>
                      <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{c.location}</p>
                      <p style={{ fontSize: '0.75rem', color: '#2563eb' }}>{fmtDate(c.date)}</p>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Partners */}
              {partners.map(p => {
                const pCoords = resolveCoordinates(p.partnerClinic, p.lat, p.lng, BASE_COORDS);
                if (!pCoords) return null;
                return (
                  <Marker key={p.id} position={pCoords} icon={partPin}>
                    <Popup>
                      <strong>{p.client}</strong>
                      <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.partnerClinic} ({p.state})</p>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

          </div>
        </div>

        {/* RIGHT: Charts */}
        <div className="tv2-right">
          <div className="tv2-chart-card card">
            <div className="tv2-chart-head">
              <BarChart3 size={15} className="text-blue" />
              <span>Previsto vs Executado</span>
            </div>
            <div className="tv2-chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" fontSize={10} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '0.75rem' }}
                  />
                  <Bar dataKey="Previstos" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Previstos" />
                  <Bar dataKey="Atendidos" fill="#2563eb" radius={[4, 4, 0, 0]} name="Atendidos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="tv2-chart-card card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="tv2-chart-head">
              <Calendar size={15} className="text-emerald" />
              <span>Próximas Agendas</span>
            </div>
            <div className="tv2-chart-area" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 8px', overflowY: 'auto' }}>
              {upcomingList.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', marginTop: '2rem' }}>
                  Nenhum evento futuro agendado
                </div>
              ) : (
                upcomingList.map((c, i) => {
                  const isSelected = activeCampaign?.id === c.id;
                  return (
                    <div 
                      key={c.id || i}
                      onClick={() => setSelectedCampaignId(c.id)}
                      title="Clique para ver o trajeto desta campanha no mapa"
                      style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                        padding: '8px 12px',
                        background: isSelected ? '#eff6ff' : '#f8fafc',
                        borderRadius: '6px',
                        borderLeft: `4px solid ${isSelected ? '#2563eb' : c.eventType === 'campanha' ? '#3b82f6' : c.eventType === 'palestra' ? '#8b5cf6' : '#10b981'}`,
                        borderTop: isSelected ? '1px solid #bfdbfe' : 'none',
                        borderRight: isSelected ? '1px solid #bfdbfe' : 'none',
                        borderBottom: isSelected ? '1px solid #bfdbfe' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.company}</span>
                          {isSelected && <span style={{ fontSize: '0.65rem', background: '#2563eb', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>NO MAPA</span>}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.eventType === 'campanha' ? 'Unidade Móvel' : c.eventType === 'palestra' ? 'Palestra/SIPAT' : 'Ação In-Company'} — {c.location}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 500, color: isSelected ? '#2563eb' : '#475569', flexShrink: 0, marginLeft: '8px' }}>{fmtDate(c.date)}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Summary strip */}
          <div className="tv2-summary card">
            <div className="tv2-sum-item">
              <span className="tv2-sum-val" style={{ color: '#2563eb' }}>{pctAttended}%</span>
              <span className="tv2-sum-lbl">Adesão Geral</span>
            </div>
            <div className="tv2-sum-divider" />
            <div className="tv2-sum-item">
              <span className="tv2-sum-val" style={{ color: '#10b981' }}>{pctAsos}%</span>
              <span className="tv2-sum-lbl">ASOs Retornados</span>
            </div>
            <div className="tv2-sum-divider" />
            <div className="tv2-sum-item">
              <span className="tv2-sum-val" style={{ color: '#2563eb' }}>{fmtCurrency(totalPartValue)}</span>
              <span className="tv2-sum-lbl">Rede Credenciada</span>
            </div>
            <div className="tv2-sum-divider" />
            <div className="tv2-sum-item">
              <span className="tv2-sum-val" style={{ color: '#8b5cf6' }}>{Array.from(new Set(partners.map(p => p.state))).length} UFs</span>
              <span className="tv2-sum-lbl">Estados Ativos</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── TICKER ── */}
      <footer className="tv2-ticker">
        <div className="tv2-ticker-tag">
          <AlertTriangle size={13} />
          RADAR
        </div>
        <div className="tv2-ticker-track">
          <div className="tv2-ticker-scroll">{alerts.join('   ·   ')}</div>
        </div>
        <div className="tv2-ticker-time">{time}</div>
      </footer>
    </div>
  );
};
