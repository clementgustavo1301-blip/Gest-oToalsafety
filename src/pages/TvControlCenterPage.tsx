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
import { resolveCoordinates } from '../utils/geocodeHelper';

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

const makeNumberedPin = (num: number, color = '#2563eb', sz = 32) =>
  L.divIcon({
    className: 'tv2-pin-numbered',
    html: `<div style="
      width:${sz}px;height:${sz}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      background:linear-gradient(135deg, ${color}, #1d4ed8);border:3px solid #fff;
      box-shadow:0 3px 10px rgba(37,99,235,0.45);display:flex;align-items:center;justify-content:center;
    ">
      <span style="transform:rotate(45deg);color:#fff;font-weight:800;font-size:12px;font-family:sans-serif;">${num}</span>
    </div>`,
    iconSize: [sz, sz],
    iconAnchor: [sz / 2, Math.round(sz * 1.2)],
    popupAnchor: [0, -Math.round(sz * 1.2)],
  });

const basePin = L.divIcon({
  className: 'tv2-pin-base',
  html: `<div style="
    width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    background:#0f172a;border:2px solid #2563eb;box-shadow:0 2px 8px rgba(37,99,235,0.3);
    display:flex;align-items:center;justify-content:center;
  "><span style='transform:rotate(45deg);font-size:13px;color:#2563eb;'>★</span></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 36],
  popupAnchor: [0, -36],
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

  // Stop points selected for the route (supports multiple consecutive stops)
  const [selectedStopIds, setSelectedStopIds] = useState<string[]>([]);

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

  /* ─── Derived data ordered strictly by proximity to today's date ─── */
  // Future campaigns ordered ascending (closest to today is FIRST [0])
  const orderedCampaigns = useMemo(() => {
    const future = onlyCampaigns
      .filter(c => c.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    const past = onlyCampaigns
      .filter(c => c.date < todayStr)
      .sort((a, b) => b.date.localeCompare(a.date));

    return [...future, ...past];
  }, [onlyCampaigns, todayStr]);

  // Overall upcoming agenda list for the right panel (closest date first)
  const upcomingList = useMemo(() => {
    const future = campaigns
      .filter(c => c.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    const past = campaigns
      .filter(c => c.date < todayStr)
      .sort((a, b) => b.date.localeCompare(a.date));

    return [...future, ...past].slice(0, 8);
  }, [campaigns, todayStr]);

  // Closest campaign to current date is always the primary / default stop
  const closestCampaign = orderedCampaigns[0] ?? onlyCampaigns[0] ?? campaigns[0] ?? null;

  // Active stop IDs: default to closest campaign if none manually chosen
  const activeStopIds = useMemo(() => {
    if (selectedStopIds.length > 0) return selectedStopIds;
    return closestCampaign ? [closestCampaign.id] : [];
  }, [selectedStopIds, closestCampaign]);

  // Active stops ordered in chronological sequence
  const activeStops = useMemo(() => {
    return activeStopIds
      .map(id => campaigns.find(c => c.id === id))
      .filter((c): c is Campaign => Boolean(c))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [activeStopIds, campaigns]);

  // Toggle adding/removing a stop point
  const toggleStop = (campaignId: string) => {
    setSelectedStopIds(prev => {
      const current = prev.length > 0 ? prev : (closestCampaign ? [closestCampaign.id] : []);
      if (current.includes(campaignId)) {
        const next = current.filter(id => id !== campaignId);
        return next.length > 0 ? next : (closestCampaign ? [closestCampaign.id] : []);
      } else {
        const updated = [...current, campaignId];
        // Keep in chronological order
        return orderedCampaigns
          .filter(c => updated.includes(c.id))
          .map(c => c.id);
      }
    });
  };

  // Direct route to a single destination
  const selectOnlyStop = (campaignId: string) => {
    setSelectedStopIds([campaignId]);
  };

  // Full circuit: include all upcoming campaigns as stops in order
  const selectAllUpcoming = () => {
    const allFutureIds = orderedCampaigns.slice(0, 6).map(c => c.id);
    if (allFutureIds.length > 0) setSelectedStopIds(allFutureIds);
  };

  // Reset to closest stop only
  const resetToClosest = () => {
    setSelectedStopIds(closestCampaign ? [closestCampaign.id] : []);
  };

  // Resolve coordinates for each stop point
  const stopPoints = useMemo(() => {
    return activeStops.map((c, index) => {
      const coords = resolveCoordinates(c.location, c.lat, c.lng, BASE_COORDS);
      return {
        campaign: c,
        stopNumber: index + 1,
        coords,
      };
    });
  }, [activeStops]);

  // Array of waypoints for RoutingMachine: [BASE_COORDS, stop1, stop2, ...]
  const routeWaypoints: [number, number][] = useMemo(() => {
    const pts: [number, number][] = [BASE_COORDS];
    for (const sp of stopPoints) {
      if (sp.coords) {
        const isBase = Math.abs(sp.coords[0] - BASE_COORDS[0]) < 0.0001 && Math.abs(sp.coords[1] - BASE_COORDS[1]) < 0.0001;
        if (!isBase) {
          pts.push(sp.coords);
        }
      }
    }
    return pts;
  }, [stopPoints]);

  const mapBounds = useMemo(() => {
    if (routeWaypoints.length >= 2) {
      const b = L.latLngBounds(routeWaypoints[0], routeWaypoints[1]);
      for (let i = 2; i < routeWaypoints.length; i++) {
        b.extend(routeWaypoints[i]);
      }
      return b.pad(0.18);
    }
    return undefined;
  }, [routeWaypoints]);

  const mapCenter: [number, number] = routeWaypoints.length > 1
    ? routeWaypoints[1]
    : BASE_COORDS;

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

  /* Ticker */
  const alerts = [
    kitsPending > 0 ? `⚠ ${kitsPending} kits pendentes de separação` : null,
    awaitingSOC > 0 ? `📄 ${awaitingSOC} eventos aguardando inserção no SOC` : null,
    activeStops.length > 1
      ? `🚐 Roteiro Ativo: ${activeStops.length} Paradas (${activeStops.map(s => s.company).join(' ➔ ')})`
      : activeStops.length === 1
      ? `🚐 Rota Ativa: ${activeStops[0].company} — ${fmtDate(activeStops[0].date)}`
      : null,
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
                  {activeStops.length > 1
                    ? `Circuito Unidade Móvel (${activeStops.length} Paradas): CACIM ➔ ${activeStops.map(s => s.location?.split('-')[1]?.trim() || s.company).join(' ➔ ')}`
                    : activeStops.length === 1
                    ? `Trajeto: CACIM ➔ ${activeStops[0].company} (${activeStops[0].location?.split('-')[1]?.trim() || activeStops[0].location})`
                    : 'Próxima Campanha — Unidade Móvel'}
                </h3>
                {activeStops.length > 0 && (
                  <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0 }}>
                    {activeStops.length > 1
                      ? `Roteiro ordenado por data · ${fmtDate(activeStops[0].date)} até ${fmtDate(activeStops[activeStops.length - 1].date)}`
                      : `${activeStops[0].location} · ${fmtDate(activeStops[0].date)}`}
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

              {routeWaypoints.length >= 2 && (
                <RoutingMachine
                  waypoints={routeWaypoints}
                  color="#2563eb"
                />
              )}

              {/* Numbered stop markers for the itinerary */}
              {stopPoints.map(sp => {
                if (!sp.coords) return null;
                return (
                  <Marker 
                    key={sp.campaign.id} 
                    position={sp.coords} 
                    icon={makeNumberedPin(sp.stopNumber)}
                  >
                    <Popup>
                      <strong>★ {sp.stopNumber}ª Parada — {sp.campaign.company}</strong>
                      <p style={{ fontWeight: 700 }}>{sp.campaign.eventType === 'campanha' ? 'Unidade Móvel' : 'Atendimento'}</p>
                      <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{sp.campaign.location}</p>
                      <p style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '4px' }}>Data: {fmtDate(sp.campaign.date)}</p>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Other campaigns not in the current route */}
              {campaigns.filter(c => !activeStopIds.includes(c.id)).map(c => {
                const cCoords = resolveCoordinates(c.location, c.lat, c.lng, BASE_COORDS);
                if (!cCoords) return null;
                return (
                  <Marker 
                    key={c.id} 
                    position={cCoords} 
                    icon={campPin}
                    eventHandlers={{ click: () => toggleStop(c.id) }}
                  >
                    <Popup>
                      <strong>{c.company}</strong>
                      <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{c.location}</p>
                      <p style={{ fontSize: '0.75rem', color: '#2563eb' }}>{fmtDate(c.date)}</p>
                      <button
                        onClick={() => toggleStop(c.id)}
                        style={{
                          marginTop: '6px',
                          background: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '3px 8px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        + Adicionar como Parada
                      </button>
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
            <div className="tv2-chart-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={15} className="text-emerald" />
                <span>Próximas Agendas & Paradas</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={selectAllUpcoming}
                  title="Traçar rota sequencial passando por todas as próximas paradas"
                  style={{
                    fontSize: '0.65rem',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid #bfdbfe',
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Circuito Completo
                </button>
                <button
                  type="button"
                  onClick={resetToClosest}
                  title="Voltar apenas para a 1ª parada mais próxima"
                  style={{
                    fontSize: '0.65rem',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#475569',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Apenas 1ª
                </button>
              </div>
            </div>

            <div className="tv2-chart-area" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 8px', overflowY: 'auto' }}>
              {upcomingList.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', marginTop: '2rem' }}>
                  Nenhum evento futuro agendado
                </div>
              ) : (
                upcomingList.map((c, i) => {
                  const stopIndex = activeStops.findIndex(s => s.id === c.id);
                  const isStop = stopIndex !== -1;
                  const stopNumber = isStop ? stopIndex + 1 : null;

                  return (
                    <div 
                      key={c.id || i}
                      onClick={() => selectOnlyStop(c.id)}
                      title="Clique para traçar rota direta ou use o botão '+ Parada' para adicionar ao circuito"
                      style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                        padding: '8px 12px',
                        background: isStop ? '#eff6ff' : '#f8fafc',
                        borderRadius: '6px',
                        borderLeft: `4px solid ${isStop ? '#2563eb' : c.eventType === 'campanha' ? '#3b82f6' : c.eventType === 'palestra' ? '#8b5cf6' : '#10b981'}`,
                        borderTop: isStop ? '1px solid #bfdbfe' : 'none',
                        borderRight: isStop ? '1px solid #bfdbfe' : 'none',
                        borderBottom: isStop ? '1px solid #bfdbfe' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.company}</span>
                          {isStop ? (
                            <span style={{ fontSize: '0.62rem', background: '#2563eb', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                              {stopNumber}ª PARADA
                            </span>
                          ) : (
                            i === 0 && <span style={{ fontSize: '0.62rem', background: '#10b981', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>MAIS PRÓXIMA</span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.eventType === 'campanha' ? 'Unidade Móvel' : c.eventType === 'palestra' ? 'Palestra/SIPAT' : 'Ação In-Company'} — {c.location}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isStop ? '#2563eb' : '#475569' }}>{fmtDate(c.date)}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStop(c.id);
                          }}
                          title={isStop ? 'Remover este ponto de parada' : 'Adicionar como ponto de parada na rota'}
                          style={{
                            fontSize: '0.68rem',
                            padding: '3px 7px',
                            borderRadius: '4px',
                            border: isStop ? '1px solid #2563eb' : '1px solid #cbd5e1',
                            background: isStop ? '#2563eb' : '#fff',
                            color: isStop ? '#fff' : '#475569',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {isStop ? '✓ Parada' : '+ Parada'}
                        </button>
                      </div>
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
