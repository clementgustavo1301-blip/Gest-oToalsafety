import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Truck, Building2, FileText, CheckCircle2,
  AlertTriangle, Maximize2, Minimize2, ArrowLeft,
  ShieldCheck, MapPin, Radio, RefreshCw, BarChart3, PieChart as PieIcon,
  Navigation, Calendar, Clock, Users, ChevronRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import RoutingMachine from '../components/RoutingMachine';
import L from 'leaflet';
import type { Campaign, PartnerAppointment } from '../types';
import { fmtCurrency, fmtDate } from '../utils/format';

interface TvControlCenterPageProps {
  campaigns: Campaign[];
  partners: PartnerAppointment[];
}

// Helper to fit bounds to trajectory
function MapBoundsController({ bounds }: { bounds?: L.LatLngBounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [map, bounds]);
  return null;
}

const createTvMapPin = (color: string, size = 24) => {
  return L.divIcon({
    className: 'custom-tv-pin',
    html: `<div style="
      background-color: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid #ffffff;
      box-shadow: 0 0 12px ${color};
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, Math.round(size * 1.207)],
    popupAnchor: [0, -Math.round(size * 1.207)],
  });
};

const createNextCampaignPin = () => {
  return L.divIcon({
    className: 'custom-tv-pin-next',
    html: `<div style="
      width: 40px;
      height: 40px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      background: linear-gradient(135deg, #0066ff, #00e5ff);
      border: 3px solid #ffffff;
      box-shadow: 0 0 24px rgba(0, 102, 255, 0.6), 0 0 48px rgba(0, 229, 255, 0.3);
      animation: nextPinPulse 2s infinite;
    "></div>
    <style>
      @keyframes nextPinPulse {
        0% { box-shadow: 0 0 24px rgba(0,102,255,0.6), 0 0 48px rgba(0,229,255,0.3); }
        50% { box-shadow: 0 0 36px rgba(0,102,255,0.8), 0 0 72px rgba(0,229,255,0.5); }
        100% { box-shadow: 0 0 24px rgba(0,102,255,0.6), 0 0 48px rgba(0,229,255,0.3); }
      }
    </style>`,
    iconSize: [40, 40],
    iconAnchor: [20, 48],
    popupAnchor: [0, -48],
  });
};

const tvCampPin = createTvMapPin('#0066ff', 18);
const tvPartPin = createTvMapPin('#00e5ff', 16);
const tvNextPin = createNextCampaignPin();
const tvBasePin = L.divIcon({
  className: 'custom-tv-pin-base',
  html: `<div style="
    width: 32px;
    height: 32px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    background: #0f172a;
    border: 2px solid #00e5ff;
    box-shadow: 0 0 16px rgba(0, 229, 255, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <div style="font-size: 14px; transform: rotate(45deg); color: #00e5ff;">★</div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 39],
  popupAnchor: [0, -39],
});

const PIE_COLORS = ['#00d68f', '#ffab00', '#ff3366', '#0066ff'];

export const TvControlCenterPage: React.FC<TvControlCenterPageProps> = ({
  campaigns,
  partners,
}) => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshSeconds, setRefreshSeconds] = useState(30);

  // Digital clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Countdown timer for TV auto-refresh simulation
  useEffect(() => {
    const countdown = setInterval(() => {
      setRefreshSeconds(prev => (prev <= 1 ? 30 : prev - 1));
    }, 1000);
    return () => clearInterval(countdown);
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Find the next upcoming campaign (mobile unit)
  const nextCampaign = useMemo(() => {
    const now = new Date();
    const upcoming = campaigns
      .filter(c => {
        const campDate = new Date(c.date);
        return campDate >= now || (campDate.toDateString() === now.toDateString());
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return upcoming.length > 0 ? upcoming[0] : campaigns[0] ?? null;
  }, [campaigns]);

  // Next 3 upcoming campaigns after the first
  const upcomingCampaigns = useMemo(() => {
    const now = new Date();
    return campaigns
      .filter(c => new Date(c.date) >= now || new Date(c.date).toDateString() === now.toDateString())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 4);
  }, [campaigns]);

  // Aggregated KPIs
  const totalExpected = campaigns.reduce((s, c) => s + c.expectedCount, 0);
  const totalAttended = campaigns.reduce((s, c) => s + c.attendedCount, 0);
  const kitsPending = campaigns.filter(c => !c.kitReady).length;
  const awaitingSOC = campaigns.filter(c => !c.insertedSOC && c.attendedCount > 0).length;
  const totalPartnersValue = partners.reduce((s, p) => s + p.value, 0);
  const totalAsosReturned = campaigns.reduce((s, c) => s + (c.returnedAsos || 0), 0);
  const percentAttended = totalExpected > 0 ? Math.round((totalAttended / totalExpected) * 100) : 0;
  const percentReturnedAsos = totalAttended > 0 ? Math.round((totalAsosReturned / totalAttended) * 100) : 0;

  // Chart data
  const barData = campaigns.slice(0, 6).map(c => ({
    name: c.company.length > 10 ? c.company.substring(0, 10) + '…' : c.company,
    Previstos: c.expectedCount,
    Atendidos: c.attendedCount,
  }));

  const insertedCount = campaigns.filter(c => c.insertedSOC).length;
  const scannedOnlyCount = campaigns.filter(c => c.scanned && !c.insertedSOC).length;
  const pendingCount = campaigns.filter(c => !c.scanned && c.attendedCount > 0).length;

  const pieData = [
    { name: 'No SOC', value: insertedCount || 1 },
    { name: 'Escaneado', value: scannedOnlyCount || 0 },
    { name: 'Pendente', value: pendingCount || 0 },
  ].filter(d => d.value > 0);

  const formattedTime = currentTime.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const formattedDate = currentTime.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  // Map center: next campaign location or default Ecoclinic
  const mapCenter: [number, number] = nextCampaign
    ? [nextCampaign.lat ?? -5.2077, nextCampaign.lng ?? -37.3314]
    : [-5.2077, -37.3314];

  const mapBounds = useMemo(() => {
    if (nextCampaign && nextCampaign.lat && nextCampaign.lng) {
      const isSameAsBase = nextCampaign.lat === -5.2077 && nextCampaign.lng === -37.3314;
      if (!isSameAsBase) {
        return L.latLngBounds(
          [-5.2077, -37.3314],
          [nextCampaign.lat, nextCampaign.lng]
        ).pad(0.1);
      }
    }
    return undefined;
  }, [nextCampaign]);

  // Days until next campaign
  const daysUntilNext = useMemo(() => {
    if (!nextCampaign) return null;
    const campDate = new Date(nextCampaign.date);
    const now = new Date();
    const diff = Math.ceil((campDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'HOJE';
    if (diff === 1) return 'AMANHÃ';
    if (diff < 0) return 'EM CAMPO';
    return `em ${diff} dias`;
  }, [nextCampaign]);

  // Critical alerts list for the TV ticker
  const alerts = [
    kitsPending > 0 ? `⚠️ ALERTA OPERACIONAL: ${kitsPending} campanhas com kits pendentes de separação` : null,
    awaitingSOC > 0 ? `📄 DIGITALIZAÇÃO: ${awaitingSOC} eventos aguardando inclusão de ASOs no SOC/SGS` : null,
    nextCampaign ? `🚐 PRÓXIMA CAMPANHA: ${nextCampaign.company} — ${nextCampaign.location} — ${fmtDate(nextCampaign.date)}` : null,
    `🏥 REDE CREDENCIADA: ${partners.length} atendimentos ativos (${fmtCurrency(totalPartnersValue)})`,
    `📡 STATUS: Unidades móveis conectadas via telemetria • Prontuários sincronizados`,
  ].filter(Boolean);

  return (
    <div className="tv-control-room">
      {/* Slim TV Command Header */}
      <header className="tv-header tv-header-slim">
        <div className="tv-header-brand">
          <button className="tv-back-btn" onClick={() => navigate('/ipa')} title="Voltar ao Sistema IPA">
            <ArrowLeft size={16} />
          </button>
          <div className="tv-logo-badge tv-logo-sm">
            <Radio size={18} className="tv-pulse-icon" />
          </div>
          <div>
            <div className="tv-badge-tag">
              <span className="tv-live-dot" />
              CENTRAL DE CONTROLE — WAR ROOM
            </div>
            <h1 className="tv-brand-title tv-brand-sm">IPA • MONITORAMENTO EM TEMPO REAL</h1>
          </div>
        </div>

        <div className="tv-header-center">
          <div className="tv-clock-box tv-clock-sm">
            <span className="tv-digital-clock tv-clock-compact font-tabular">{formattedTime}</span>
            <span className="tv-date-text tv-date-sm">{formattedDate}</span>
          </div>
        </div>

        <div className="tv-header-actions">
          <div className="tv-status-chip ok tv-chip-sm">
            <ShieldCheck size={14} />
            <span>SOC ONLINE</span>
          </div>
          <div className="tv-refresh-chip tv-chip-sm">
            <RefreshCw size={12} className="spin-slow" />
            <span>{refreshSeconds}s</span>
          </div>
          <button className="tv-fullscreen-btn tv-btn-sm" onClick={toggleFullscreen} title="Tela Cheia">
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>

      {/* Compact KPI Strip — 6 mini cards */}
      <div className="tv-metrics-strip">
        <div className="tv-mini-card tv-mc-blue">
          <div className="tv-mc-icon-wrap"><Activity size={16} /></div>
          <div className="tv-mc-data">
            <span className="tv-mc-value font-tabular">{campaigns.length}</span>
            <span className="tv-mc-label">Campanhas</span>
          </div>
          <div className="tv-mc-bar"><div className="tv-mc-fill bg-blue" style={{ width: `${percentAttended}%` }} /></div>
        </div>

        <div className="tv-mini-card tv-mc-emerald">
          <div className="tv-mc-icon-wrap"><CheckCircle2 size={16} /></div>
          <div className="tv-mc-data">
            <span className="tv-mc-value font-tabular">{totalAttended}</span>
            <span className="tv-mc-label">Atendidos</span>
          </div>
          <div className="tv-mc-bar"><div className="tv-mc-fill bg-emerald" style={{ width: '100%' }} /></div>
        </div>

        <div className={`tv-mini-card ${kitsPending > 0 ? 'tv-mc-amber tv-mc-alert' : 'tv-mc-emerald'}`}>
          <div className="tv-mc-icon-wrap"><Truck size={16} /></div>
          <div className="tv-mc-data">
            <span className="tv-mc-value font-tabular">{kitsPending}</span>
            <span className="tv-mc-label">Kits Pend.</span>
          </div>
          <div className="tv-mc-bar"><div className={`tv-mc-fill ${kitsPending > 0 ? 'bg-amber' : 'bg-emerald'}`} style={{ width: `${Math.round(((campaigns.length - kitsPending) / (campaigns.length || 1)) * 100)}%` }} /></div>
        </div>

        <div className={`tv-mini-card ${awaitingSOC > 0 ? 'tv-mc-rose tv-mc-alert' : 'tv-mc-emerald'}`}>
          <div className="tv-mc-icon-wrap"><FileText size={16} /></div>
          <div className="tv-mc-data">
            <span className="tv-mc-value font-tabular">{awaitingSOC}</span>
            <span className="tv-mc-label">Aguard. SOC</span>
          </div>
          <div className="tv-mc-bar"><div className={`tv-mc-fill ${awaitingSOC > 0 ? 'bg-rose' : 'bg-emerald'}`} style={{ width: `${Math.round((insertedCount / (campaigns.length || 1)) * 100)}%` }} /></div>
        </div>

        <div className="tv-mini-card tv-mc-cyan">
          <div className="tv-mc-icon-wrap"><Building2 size={16} /></div>
          <div className="tv-mc-data">
            <span className="tv-mc-value font-tabular">{partners.length}</span>
            <span className="tv-mc-label">Parceiras</span>
          </div>
          <div className="tv-mc-bar"><div className="tv-mc-fill bg-cyan" style={{ width: '85%' }} /></div>
        </div>

        <div className="tv-mini-card tv-mc-purple">
          <div className="tv-mc-icon-wrap"><ShieldCheck size={16} /></div>
          <div className="tv-mc-data">
            <span className="tv-mc-value font-tabular">{totalAsosReturned}</span>
            <span className="tv-mc-label">ASOs Retorn.</span>
          </div>
          <div className="tv-mc-bar"><div className="tv-mc-fill bg-purple" style={{ width: `${percentReturnedAsos}%` }} /></div>
        </div>
      </div>

      {/* Main Content: Map-Dominant Layout */}
      <div className="tv-main-grid">
        {/* LEFT: Large Map with Next Campaign Focus */}
        <div className="tv-screen-box tv-map-dominant">
          <div className="tv-box-header">
            <div className="tv-box-title-wrap">
              <Navigation size={18} className="text-cyan" />
              <h3>PRÓXIMA CAMPANHA DA UNIDADE MÓVEL</h3>
            </div>
            <span className="tv-box-badge tv-badge-live">
              <span className="tv-live-dot-sm" />
              AO VIVO
            </span>
          </div>

          <div className="tv-map-with-overlay">
            {/* Map fills the entire area */}
            <div className="tv-map-full">
              <MapContainer
                center={mapCenter}
                zoom={nextCampaign ? 13 : 10}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
              >
                <MapBoundsController bounds={mapBounds} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  className="tv-map-tiles"
                />

                {/* Base / Matriz Ponto de Partida */}
                <Marker position={[-5.2077, -37.3314]} icon={tvBasePin}>
                  <Popup className="custom-leaflet-popup">
                    <div style={{ padding: '10px' }}>
                      <strong style={{ fontSize: '1rem', color: '#00e5ff' }}>★ PONTO DE PARTIDA</strong>
                      <p style={{ fontWeight: 700, marginTop: '4px' }}>Ecoclinic (Anexo ao Ed. CACIM)</p>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Tv. Filgueira Filho, 2 - Alto de São Manoel</p>
                      <p style={{ fontSize: '0.85rem', color: '#00e5ff', fontWeight: 600 }}>Sede Operacional (Mossoró - RN)</p>
                    </div>
                  </Popup>
                </Marker>

                {/* Trajectory line from base to Next Campaign */}
                {nextCampaign && (
                  <RoutingMachine 
                    start={[-5.2077, -37.3314]} 
                    end={[nextCampaign.lat ?? -5.2077, nextCampaign.lng ?? -37.3314]} 
                    color="#00e5ff" 
                  />
                )}

                {/* Next Campaign — Big Pin */}
                {nextCampaign && (
                  <Marker
                    position={[nextCampaign.lat ?? -5.2077, nextCampaign.lng ?? -37.3314]}
                    icon={tvNextPin}
                  >
                    <Popup className="custom-leaflet-popup">
                      <div style={{ padding: '10px' }}>
                        <strong style={{ fontSize: '1rem', color: '#0066ff' }}>★ PRÓXIMA CAMPANHA</strong>
                        <p style={{ fontWeight: 700, marginTop: '4px' }}>{nextCampaign.company}</p>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{nextCampaign.location}</p>
                        <p style={{ fontSize: '0.85rem', color: '#00d68f', fontWeight: 600 }}>{nextCampaign.expectedCount} vidas previstas</p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Other campaigns — small pins */}
                {campaigns.filter(c => c.id !== nextCampaign?.id).map(c => (
                  <Marker
                    key={c.id}
                    position={[c.lat ?? -5.2077, c.lng ?? -37.3314]}
                    icon={tvCampPin}
                  >
                    <Popup className="custom-leaflet-popup">
                      <div style={{ padding: '8px' }}>
                        <strong>{c.company}</strong>
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{c.location}</p>
                        <p style={{ fontSize: '0.8rem', color: '#00d68f', fontWeight: 600 }}>{c.expectedCount} vidas</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {partners.map(p => (
                  <Marker
                    key={p.id}
                    position={[p.lat ?? -5.2077, p.lng ?? -37.3314]}
                    icon={tvPartPin}
                  >
                    <Popup className="custom-leaflet-popup">
                      <div style={{ padding: '8px' }}>
                        <strong>{p.client}</strong>
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.partnerClinic} ({p.state})</p>
                        <p style={{ fontSize: '0.8rem', color: '#00e5ff', fontWeight: 600 }}>{fmtCurrency(p.value)}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {/* Overlay: Next Campaign Info Card */}
            {nextCampaign && (
              <div className="tv-next-campaign-overlay">
                <div className="tv-next-badge">
                  <Navigation size={14} />
                  <span>DESTINO DA UNIDADE MÓVEL</span>
                </div>

                <div className="tv-next-company">{nextCampaign.company}</div>

                <div className="tv-next-details">
                  <div className="tv-next-detail-row">
                    <MapPin size={14} className="text-cyan" />
                    <span>{nextCampaign.location}</span>
                  </div>
                  <div className="tv-next-detail-row">
                    <Calendar size={14} className="text-cyan" />
                    <span>{fmtDate(nextCampaign.date)}</span>
                  </div>
                  <div className="tv-next-detail-row">
                    <Users size={14} className="text-cyan" />
                    <span>{nextCampaign.expectedCount} vidas previstas</span>
                  </div>
                  <div className="tv-next-detail-row">
                    <Clock size={14} className="text-cyan" />
                    <span className="tv-next-countdown">{daysUntilNext}</span>
                  </div>
                </div>

                <div className="tv-next-status-row">
                  <span className={`tv-next-kit-badge ${nextCampaign.kitReady ? 'ready' : 'pending'}`}>
                    {nextCampaign.kitReady ? '✓ Kit Pronto' : '⏳ Kit Pendente'}
                  </span>
                  <span className={`tv-next-soc-badge ${nextCampaign.insertedSOC ? 'ready' : 'pending'}`}>
                    {nextCampaign.insertedSOC ? '✓ SOC' : '○ SOC Pend.'}
                  </span>
                </div>
              </div>
            )}

            {/* Overlay: Upcoming Campaign List */}
            {upcomingCampaigns.length > 1 && (
              <div className="tv-upcoming-list-overlay">
                <div className="tv-upcoming-title">
                  <Calendar size={13} />
                  <span>PRÓXIMAS</span>
                </div>
                {upcomingCampaigns.slice(1, 4).map(c => (
                  <div key={c.id} className="tv-upcoming-item">
                    <ChevronRight size={12} className="text-cyan" />
                    <div className="tv-upcoming-info">
                      <span className="tv-upcoming-name">{c.company.length > 18 ? c.company.substring(0, 18) + '…' : c.company}</span>
                      <span className="tv-upcoming-date">{fmtDate(c.date)} • {c.expectedCount}v</span>
                    </div>
                    <span className={`tv-upcoming-dot ${c.kitReady ? 'ok' : 'wait'}`} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Charts Panel (compact) */}
        <div className="tv-right-panel">
          {/* Bar Chart */}
          <div className="tv-screen-box tv-chart-compact">
            <div className="tv-box-header">
              <div className="tv-box-title-wrap">
                <BarChart3 size={16} className="text-blue" />
                <h3>PREVISTO VS EXECUTADO</h3>
              </div>
              <span className="tv-box-badge">PRODUÇÃO</span>
            </div>
            <div style={{ height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" fontSize={10} tick={{ fill: '#94a3b8' }} />
                  <YAxis fontSize={10} tick={{ fill: '#94a3b8' }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#161f36',
                      borderColor: 'rgba(255,255,255,0.1)',
                      color: '#ffffff',
                      borderRadius: '8px',
                      fontSize: '0.75rem'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                  <Bar dataKey="Previstos" fill="#334155" radius={[4, 4, 0, 0]} name="Previstos" />
                  <Bar dataKey="Atendidos" fill="#0066ff" radius={[4, 4, 0, 0]} name="Atendidos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="tv-screen-box tv-chart-compact">
            <div className="tv-box-header">
              <div className="tv-box-title-wrap">
                <PieIcon size={16} className="text-blue" />
                <h3>FLUXO SOC</h3>
              </div>
              <span className="tv-box-badge">DIGITALIZAÇÃO</span>
            </div>
            <div style={{ height: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={6}
                    dataKey="value"
                    label={({ name, value }: any) => `${name}: ${value}`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#161f36',
                      borderColor: 'rgba(255,255,255,0.1)',
                      color: '#ffffff',
                      borderRadius: '8px',
                      fontSize: '0.75rem'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick summary stats */}
          <div className="tv-screen-box tv-summary-strip">
            <div className="tv-summary-row">
              <span className="tv-summary-label">Adesão Geral</span>
              <span className="tv-summary-val font-tabular text-blue">{percentAttended}%</span>
            </div>
            <div className="tv-summary-row">
              <span className="tv-summary-label">ASOs Retornados</span>
              <span className="tv-summary-val font-tabular text-emerald">{percentReturnedAsos}%</span>
            </div>
            <div className="tv-summary-row">
              <span className="tv-summary-label">Rede Credenciada</span>
              <span className="tv-summary-val font-tabular text-cyan">{fmtCurrency(totalPartnersValue)}</span>
            </div>
            <div className="tv-summary-row">
              <span className="tv-summary-label">Estados Ativos</span>
              <span className="tv-summary-val font-tabular text-purple">{Array.from(new Set(partners.map(p => p.state))).length} UFs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom TV Real-Time Ticker / Broadcast Banner */}
      <footer className="tv-broadcast-ticker">
        <div className="tv-ticker-tag">
          <AlertTriangle size={14} />
          <span>RADAR OPERACIONAL</span>
        </div>
        <div className="tv-ticker-content">
          <div className="tv-ticker-marquee">
            {alerts.join('  •  •  ')}
          </div>
        </div>
        <div className="tv-ticker-timestamp font-tabular">
          {formattedTime}
        </div>
      </footer>
    </div>
  );
};
