import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Clock, Map, Navigation, Loader2, Calendar, FileText, 
  Building2, TrendingUp, Fuel, Search, ChevronRight, CheckCircle2, AlertCircle, ChevronDown, Info
} from 'lucide-react';

const OSRM_API = 'https://router.project-osrm.org/route/v1/driving';

export default function LogisticsReport({ companies, hqCoords }) {
  const [loading, setLoading] = useState(true);
  const [reportSubTab, setReportSubTab] = useState('geral'); // 'geral' | 'por_empresa'
  const [periodDays, setPeriodDays] = useState(0); // 0 = Todo o histórico
  const [statusFilter, setStatusFilter] = useState('concluidos'); // 'todos' | 'concluidos'
  
  // Data States
  const [deliverables, setDeliverables] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [totals, setTotals] = useState({ events: 0, distanceKm: 0, durationMinutes: 0, estFuelLiters: 0 });
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  // Animação de entrada
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchReport();
  }, [companies, periodDays, statusFilter]);

  const fetchReport = async () => {
    if (!companies || companies.length === 0) return;
    try {
      setLoading(true);

      // Buscar trainings do período (treinamentos do calendário)
      let trainQuery = supabase
        .from('trainings')
        .select('*')
        .order('date', { ascending: false });

      if (periodDays > 0) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - periodDays);
        const dateString = targetDate.toISOString().split('T')[0];
        trainQuery = trainQuery.gte('date', dateString);
      }

      const { data: tData, error: tErr } = await trainQuery;

      if (tErr) throw tErr;

      const unified = [];
      (tData || []).forEach(t => {
        const isCompleted = t.status === 'concluido' || t.status === 'entregue';
        if (statusFilter === 'concluidos' && !isCompleted) return;
        
        // Verifica se a viagem foi aproveitada (compartilhada)
        const isSharedTrip = t.description && t.description.includes('[SHARED_TRIP]');
        const isNoTravel = t.description && t.description.includes('[NO_TRAVEL]');

        unified.push({
          id: t.id,
          company_id: t.company_id,
          type: 'treinamento',
          due_date: t.date,
          title: t.title || 'Treinamento',
          status: t.status,
          isSharedTrip,
          isNoTravel
        });
      });

      setDeliverables(unified);

      // Agrupar eventos por company_id
      const eventsByCompany = {};
      unified.forEach(d => {
        if (!eventsByCompany[d.company_id]) {
          eventsByCompany[d.company_id] = { count: 0, trips: 0, events: [] };
        }
        eventsByCompany[d.company_id].count += 1;
        if (!d.isSharedTrip && !d.isNoTravel) {
          eventsByCompany[d.company_id].trips += 1;
        }
        eventsByCompany[d.company_id].events.push(d);
      });

      const reportRows = [];
      let totalDistance = 0;
      let totalDuration = 0;
      let totalEvents = 0;

      // Para cada empresa com eventos
      for (const companyId of Object.keys(eventsByCompany)) {
        const company = companies.find(c => c.id === companyId);
        const eventData = eventsByCompany[companyId];

        if (company) {
          let distOneWay = 0;
          let durOneWay = 0;

          if (company.latitude && company.longitude) {
            try {
              const res = await fetch(`${OSRM_API}/${hqCoords.lng},${hqCoords.lat};${company.longitude},${company.latitude}?overview=false`);
              const routeData = await res.json();
              if (routeData.routes && routeData.routes.length > 0) {
                distOneWay = routeData.routes[0].distance; // metros
                durOneWay = routeData.routes[0].duration; // segundos
              }
            } catch (err) {
              console.error('Erro OSRM empresa:', company.name, err);
            }
          }

          const distTrip = distOneWay * 2; // ida e volta
          const durTrip = durOneWay * 2;   // ida e volta

          const distTotalMeters = distTrip * eventData.trips;
          const durTotalSeconds = durTrip * eventData.trips;

          totalDistance += distTotalMeters;
          totalDuration += durTotalSeconds;
          totalEvents += eventData.count;

          reportRows.push({
            company,
            count: eventData.count,
            trips: eventData.trips,
            events: eventData.events,
            hasCoords: Boolean(company.latitude && company.longitude),
            distTotalMeters,
            durTotalSeconds,
            durTrip,
            distTrip,
          });
        }
      }

      // Sort by number of events
      reportRows.sort((a, b) => b.count - a.count);
      setReportData(reportRows);

      if (reportRows.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(reportRows[0].company.id);
      }

      const totalKm = totalDistance / 1000;
      setTotals({
        events: totalEvents,
        distanceKm: totalKm,
        durationMinutes: totalDuration / 60,
        estFuelLiters: totalKm / 10 // estimativa 10 km por litro
      });

    } catch (err) {
      console.error('Erro buscando relatório:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes || minutes <= 0) return '0m';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const selectedCompanyRow = reportData.find(r => r.company.id === selectedCompanyId) || 
    (companies.find(c => c.id === selectedCompanyId) ? {
      company: companies.find(c => c.id === selectedCompanyId),
      count: 0,
      trips: 0,
      events: [],
      hasCoords: Boolean(companies.find(c => c.id === selectedCompanyId)?.latitude),
      distTotalMeters: 0,
      durTotalSeconds: 0,
      durTrip: 0,
      distTrip: 0
    } : null);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '1rem', opacity: mounted ? 1 : 0, transition: 'opacity 0.5s' }}>
        <div style={{ position: 'relative', width: '60px', height: '60px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, border: '4px solid var(--primary-light)', borderRadius: '50%' }}></div>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, border: '4px solid var(--primary)', borderRadius: '50%', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
        </div>
        <p style={{ color: 'var(--primary)', fontWeight: '600', letterSpacing: '0.5px' }}>
          Analisando rotas logísticas{periodDays > 0 ? ` dos últimos ${periodDays} dias` : ' de todo o histórico'}...
        </p>
      </div>
    );
  }

  const maxEvents = reportData.length > 0 ? Math.max(...reportData.map(r => r.count)) : 1;

  // Premium Card Style Generator
  const premiumCardStyle = {
    background: 'linear-gradient(145deg, var(--surface) 0%, rgba(255,255,255,0.05) 100%)',
    backdropFilter: 'blur(10px)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
    padding: '1.5rem',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  };

  // Premium Hover effect handler for cards
  const handleCardHover = (e, isHovering) => {
    if (isHovering) {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.08)';
    } else {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.04)';
    }
  };

  return (
    <div style={{ padding: '0.5rem', opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease-in-out', animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Sub Header & Controles de Período e Sub-Abas */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
        background: 'linear-gradient(90deg, var(--surface) 0%, var(--background) 100%)',
        padding: '0.75rem 1rem',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)'
      }}>
        {/* Segmented Control iOS Style */}
        <div style={{ 
          display: 'flex', 
          backgroundColor: 'rgba(0,0,0,0.05)', 
          padding: '0.35rem', 
          borderRadius: '12px',
          position: 'relative'
        }}>
          <button
            onClick={() => setReportSubTab('geral')}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: reportSubTab === 'geral' ? 'white' : 'transparent',
              color: reportSubTab === 'geral' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: reportSubTab === 'geral' ? '700' : '600',
              boxShadow: reportSubTab === 'geral' ? '0 2px 10px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              zIndex: 1
            }}
          >
            <TrendingUp size={16} /> Visão Geral
          </button>
          <button
            onClick={() => setReportSubTab('por_empresa')}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: reportSubTab === 'por_empresa' ? 'white' : 'transparent',
              color: reportSubTab === 'por_empresa' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: reportSubTab === 'por_empresa' ? '700' : '600',
              boxShadow: reportSubTab === 'por_empresa' ? '0 2px 10px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              zIndex: 1
            }}
          >
            <Building2 size={16} /> Por Empresa
          </button>
        </div>

        {/* Filtro de Período Premium */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Analisando:</span>
          <div style={{ position: 'relative' }}>
            <select
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value))}
              style={{
                appearance: 'none',
                padding: '0.5rem 2.5rem 0.5rem 1rem',
                borderRadius: '10px',
                border: '1px solid var(--primary)',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px rgba(var(--primary-rgb), 0.2)'}
              onBlur={(e) => e.target.style.boxShadow = 'none'}
            >
              <option value={0}>Todo o Histórico</option>
              <option value={7}>Últimos 7 dias</option>
              <option value={15}>Últimos 15 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={60}>Últimos 60 dias</option>
              <option value={90}>Últimos 90 dias</option>
            </select>
            <Clock size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', pointerEvents: 'none' }} />
          </div>

          {/* Filtro de Status */}
          <div style={{ position: 'relative' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                appearance: 'none',
                padding: '0.5rem 2.5rem 0.5rem 1rem',
                borderRadius: '10px',
                border: '1px solid var(--secondary)',
                backgroundColor: 'var(--secondary-light)',
                color: 'var(--secondary-hover)',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.2)'}
              onBlur={(e) => e.target.style.boxShadow = 'none'}
            >
              <option value="concluidos">Apenas Concluídos</option>
              <option value="todos">Todos (Inc. Pendentes)</option>
            </select>
            <CheckCircle2 size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-hover)', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      {/* ABA VISÃO GERAL */}
      {reportSubTab === 'geral' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeInUp 0.5s ease-out' }}>
          
          {/* Cards de Métricas Principais (Glassmorphism + Gradients) */}
          <div className="grid-responsive-4" style={{ gap: '1.5rem' }}>
            <div 
              style={{ ...premiumCardStyle, borderTop: '4px solid var(--primary)' }}
              onMouseEnter={(e) => handleCardHover(e, true)}
              onMouseLeave={(e) => handleCardHover(e, false)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Eventos no Calendário</h3>
                <div style={{ padding: '8px', background: 'linear-gradient(135deg, var(--primary), #4f46e5)', borderRadius: '12px', color: 'white', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)' }}>
                  <Calendar size={20} />
                </div>
              </div>
              <p style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{totals.events}</p>
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingUp size={14} /> + Atendimentos
              </div>
            </div>

            <div 
              style={{ ...premiumCardStyle, borderTop: '4px solid #f59e0b' }}
              onMouseEnter={(e) => handleCardHover(e, true)}
              onMouseLeave={(e) => handleCardHover(e, false)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Tempo na Estrada</h3>
                <div style={{ padding: '8px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '12px', color: 'white', boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)' }}>
                  <Clock size={20} />
                </div>
              </div>
              <p style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{formatDuration(totals.durationMinutes)}</p>
              <div style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                Ida e Volta Somados
              </div>
            </div>

            <div 
              style={{ ...premiumCardStyle, borderTop: '4px solid #10b981' }}
              onMouseEnter={(e) => handleCardHover(e, true)}
              onMouseLeave={(e) => handleCardHover(e, false)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Distância Total</h3>
                <div style={{ padding: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '12px', color: 'white', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)' }}>
                  <Navigation size={20} />
                </div>
              </div>
              <p style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{totals.distanceKm.toFixed(0)}<span style={{fontSize: '1.2rem', color: 'var(--text-secondary)', marginLeft: '4px'}}>km</span></p>
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                Total Percorrido
              </div>
            </div>

            <div 
              style={{ ...premiumCardStyle, borderTop: '4px solid #0ea5e9' }}
              onMouseEnter={(e) => handleCardHover(e, true)}
              onMouseLeave={(e) => handleCardHover(e, false)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Combustível (Est.)</h3>
                <div style={{ padding: '8px', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', borderRadius: '12px', color: 'white', boxShadow: '0 4px 10px rgba(14, 165, 233, 0.3)' }}>
                  <Fuel size={20} />
                </div>
              </div>
              <p style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{totals.estFuelLiters.toFixed(0)}<span style={{fontSize: '1.2rem', color: 'var(--text-secondary)', marginLeft: '4px'}}>L</span></p>
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#0ea5e9', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Info size={14} /> Média de 10 km/L
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
            
            {/* Top Empresas em Deslocamentos (Gráfico Rico) */}
            <div style={premiumCardStyle}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <div style={{ padding: '6px', backgroundColor: 'var(--primary-light)', borderRadius: '8px', color: 'var(--primary)' }}><TrendingUp size={16} /></div>
                Top 5 Destinos
              </h2>

              {reportData.length === 0 ? (
                <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-secondary)', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
                  <p>Nenhum dado disponível.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {reportData.slice(0, 5).map((row, index) => {
                    const percent = Math.round((row.count / maxEvents) * 100);
                    // Criar um gradiente baseado na posição
                    const gradientColors = [
                      'linear-gradient(90deg, #4f46e5, #818cf8)', // 1
                      'linear-gradient(90deg, #0ea5e9, #38bdf8)', // 2
                      'linear-gradient(90deg, #10b981, #34d399)', // 3
                      'linear-gradient(90deg, #f59e0b, #fbbf24)', // 4
                      'linear-gradient(90deg, #8b5cf6, #a78bfa)'  // 5
                    ];
                    
                    return (
                      <div key={row.company.id} style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'white', backgroundColor: 'var(--text-secondary)', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>{index + 1}</span>
                            {row.company.name.length > 25 ? row.company.name.substring(0, 25) + '...' : row.company.name}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '500' }}>
                              <Clock size={12} style={{display:'inline', verticalAlign:'middle', marginRight:'2px'}}/> {formatDuration(row.durTotalSeconds / 60)}
                            </span>
                            <span style={{ fontWeight: '800', color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>
                              {row.trips} v.
                            </span>
                          </div>
                        </div>
                        <div style={{ height: '8px', width: '100%', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${percent}%`,
                            background: gradientColors[index] || gradientColors[0],
                            borderRadius: '8px',
                            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Destaque Status e Mapa */}
            <div style={{...premiumCardStyle, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)', color: 'white'}}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white' }}>
                  <Map size={20} />
                  Análise Espacial
                </h2>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  A eficiência logística depende de rotas precisas. Veja como está o mapeamento dos seus clientes na nossa base.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(5px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Building2 size={20} color="rgba(255,255,255,0.9)" />
                      <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>Clientes Atendidos</span>
                    </div>
                    <strong style={{ fontSize: '1.5rem', fontWeight: '800' }}>{reportData.length}</strong>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <CheckCircle2 size={20} color="#34d399" />
                      <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>Mapeados no GPS</span>
                    </div>
                    <strong style={{ fontSize: '1.5rem', fontWeight: '800', color: '#34d399' }}>
                      {reportData.filter(r => r.hasCoords).length}
                    </strong>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '2rem', backgroundColor: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <Navigation size={18} style={{ marginTop: '2px', color: '#38bdf8' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: '500', lineHeight: 1.4, color: 'rgba(255,255,255,0.9)' }}>
                  Ponto de partida central configurado para a <strong>Sede EcoSafety (Mossoró - RN)</strong>. Todos os cálculos incluem ida e volta.
                </span>
              </div>
            </div>

          </div>

          {/* Tabela Geral Premium */}
          <div style={premiumCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <div style={{ padding: '6px', backgroundColor: 'var(--primary-light)', borderRadius: '8px', color: 'var(--primary)' }}><FileText size={18} /></div>
                Detalhamento Completo
              </h2>
            </div>

            {reportData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: 'var(--background)', borderRadius: '16px' }}>
                <Navigation size={48} style={{ opacity: 0.1, margin: '0 auto 1rem auto' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: '500' }}>Nenhum agendamento encontrado.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: 'var(--surface)' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--background)', borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Empresa</th>
                      <th style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>GPS</th>
                      <th style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Eventos</th>
                      <th style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>T. Médio (Ida+Volta)</th>
                      <th style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tempo Acumulado</th>
                      <th style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Distância</th>
                      <th style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Análise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row, idx) => (
                      <tr key={row.company.id} style={{ 
                        borderBottom: '1px solid var(--border)', 
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)'}
                      >
                        <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          {row.company.name}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem' }}>
                          {row.hasCoords ? (
                            <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', backgroundColor: '#d1fae5', padding: '4px 8px', borderRadius: '20px', width: 'fit-content' }}>
                              <CheckCircle2 size={12} /> OK
                            </span>
                          ) : (
                            <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', backgroundColor: '#fef3c7', padding: '4px 8px', borderRadius: '20px', width: 'fit-content' }}>
                              <AlertCircle size={12} /> N/A
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {row.count} {row.count !== row.trips && <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>({row.trips} trips)</span>}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                          {row.hasCoords ? formatDuration(row.durTrip / 60) : '-'}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: '#d97706', fontSize: '0.9rem' }}>
                          {row.hasCoords ? formatDuration(row.durTotalSeconds / 60) : '-'}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                          {row.hasCoords ? `${(row.distTotalMeters / 1000).toFixed(1)} km` : '-'}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <button
                            onClick={() => {
                              setSelectedCompanyId(row.company.id);
                              setReportSubTab('por_empresa');
                            }}
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', borderRadius: '8px' }}
                          >
                            Detalhes <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ABA POR EMPRESA */}
      {reportSubTab === 'por_empresa' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeInUp 0.5s ease-out' }}>
          
          {/* Seletor de Empresa Premium */}
          <div style={{...premiumCardStyle, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ padding: '6px', backgroundColor: 'var(--primary-light)', borderRadius: '8px', color: 'var(--primary)' }}><Search size={18} /></div>
              Buscar Cliente Específico
            </label>
            <div style={{ position: 'relative', maxWidth: '600px' }}>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  paddingRight: '2.5rem',
                  borderRadius: '12px',
                  border: '2px solid var(--primary-light)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  fontWeight: '600',
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--primary-light)'}
              >
                <option value="">-- Selecione uma Empresa na lista --</option>
                {companies.map(c => {
                  const rData = reportData.find(r => r.company.id === c.id);
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} {rData ? `(🔥 ${rData.count} eventos)` : ''}
                    </option>
                  )
                })}
              </select>
              <ChevronDown size={20} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
            </div>
          </div>

          {selectedCompanyRow ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Cards de Resumo da Empresa Selecionada */}
              <div className="grid-responsive-3" style={{ gap: '1.5rem' }}>
                <div style={premiumCardStyle} onMouseEnter={(e) => handleCardHover(e, true)} onMouseLeave={(e) => handleCardHover(e, false)}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Eventos no Período</h3>
                    <div className="stat-icon" style={{ padding: '8px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '12px' }}>
                      <Calendar size={20} />
                    </div>
                  </div>
                  <p style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{selectedCompanyRow.count}</p>
                  <span style={{ display: 'block', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600', backgroundColor: 'var(--primary-light)', padding: '4px 8px', borderRadius: '8px', width: 'fit-content' }}>
                    {periodDays > 0 ? `${periodDays} dias` : 'Histórico Total'}
                  </span>
                </div>

                <div style={premiumCardStyle} onMouseEnter={(e) => handleCardHover(e, true)} onMouseLeave={(e) => handleCardHover(e, false)}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Tempo Acumulado</h3>
                    <div style={{ padding: '8px', backgroundColor: '#fef3c7', borderRadius: '12px', color: '#d97706' }}>
                      <Clock size={20} />
                    </div>
                  </div>
                  <p style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>
                    {selectedCompanyRow.hasCoords ? formatDuration(selectedCompanyRow.durTotalSeconds / 60) : '-'}
                  </p>
                  <span style={{ display: 'block', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                    {selectedCompanyRow.hasCoords ? `Média de ${formatDuration(selectedCompanyRow.durTrip / 60)} por viagem` : 'Sem coordenadas mapeadas'}
                  </span>
                </div>

                <div style={premiumCardStyle} onMouseEnter={(e) => handleCardHover(e, true)} onMouseLeave={(e) => handleCardHover(e, false)}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Distância Total</h3>
                    <div style={{ padding: '8px', backgroundColor: '#d1fae5', borderRadius: '12px', color: '#059669' }}>
                      <Map size={20} />
                    </div>
                  </div>
                  <p style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>
                    {selectedCompanyRow.hasCoords ? `${(selectedCompanyRow.distTotalMeters / 1000).toFixed(0)}` : '-'}
                    <span style={{fontSize: '1.2rem', color: 'var(--text-secondary)', marginLeft: '4px'}}>{selectedCompanyRow.hasCoords ? 'km' : ''}</span>
                  </p>
                  <span style={{ display: 'block', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                    {selectedCompanyRow.hasCoords ? `Média de ${(selectedCompanyRow.distTrip / 1000).toFixed(1)} km por viagem` : 'Requer localização via GPS'}
                  </span>
                </div>
              </div>

              {/* Tabela de Histórico da Empresa */}
              <div style={premiumCardStyle}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ padding: '6px', backgroundColor: 'var(--primary-light)', borderRadius: '8px', color: 'var(--primary)' }}><FileText size={18} /></div>
                  Histórico de Entregas & Treinamentos
                </h2>

                {selectedCompanyRow.events.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: 'var(--background)', borderRadius: '16px' }}>
                    <Calendar size={48} style={{ opacity: 0.1, margin: '0 auto 1rem auto' }} />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: '500' }}>Nenhum evento registrado para este cliente no período.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: 'var(--surface)' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--background)', borderBottom: '2px solid var(--border)' }}>
                          <th style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data</th>
                          <th style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Descrição do Agendamento</th>
                          <th style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tipo</th>
                          <th style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                          <th style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Deslocamento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCompanyRow.events.map((ev, idx) => (
                          <tr key={ev.id} style={{ 
                            borderBottom: '1px solid var(--border)',
                            backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)'}
                          >
                            <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                              {formatDate(ev.due_date)}
                            </td>
                            <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                              {ev.title}
                            </td>
                            <td style={{ padding: '1rem 1.25rem' }}>
                              <span style={{ 
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                backgroundColor: ev.type === 'visita_tecnica' ? '#d1fae5' : 'var(--primary-light)', 
                                color: ev.type === 'visita_tecnica' ? '#059669' : 'var(--primary)',
                                padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700'
                              }}>
                                {ev.type === 'visita_tecnica' ? 'Visita' : 'Treino'}
                              </span>
                            </td>
                            <td style={{ padding: '1rem 1.25rem' }}>
                              <span style={{
                                display: 'inline-block',
                                border: `1px solid ${ev.status === 'entregue' || ev.status === 'concluido' ? '#34d399' : '#fbbf24'}`,
                                color: ev.status === 'entregue' || ev.status === 'concluido' ? '#059669' : '#d97706',
                                padding: '2px 8px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700',
                                backgroundColor: ev.status === 'entregue' || ev.status === 'concluido' ? '#ecfdf5' : '#fffbeb'
                              }}>
                                {ev.status === 'entregue' ? 'Concluído' : (ev.status || 'Pendente')}
                              </span>
                            </td>
                            <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: '#d97706', fontSize: '0.9rem', textAlign: 'right' }}>
                              {ev.isSharedTrip ? (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Viagem Aproveitada</span>
                              ) : (
                                selectedCompanyRow.hasCoords ? formatDuration(selectedCompanyRow.durTrip / 60) : '-'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '5rem 2rem', backgroundColor: 'var(--surface)', borderRadius: '16px', border: '2px dashed var(--border)' }}>
              <Building2 size={64} style={{ color: 'var(--border)', margin: '0 auto 1.5rem auto' }} />
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: '700' }}>Nenhuma Empresa Selecionada</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Selecione um cliente no menu acima para mergulhar nos dados operacionais específicos.</p>
            </div>
          )}

        </div>
      )}

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
