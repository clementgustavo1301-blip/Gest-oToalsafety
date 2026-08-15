import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, Download, Filter, Search, Building2, Calendar,
  CheckCircle, Clock, XCircle, FileText,
  Users, ChevronDown, ChevronUp, FileDown, MapPin, User
} from 'lucide-react';
import { getTrainings, getCompanies, getProfiles } from '../services/storageService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', color: '#d97706', bg: '#fef3c7', icon: <Clock size={14} /> },
  agendado: { label: 'Agendado', color: 'var(--primary)', bg: 'var(--primary-light)', icon: <Clock size={14} /> },
  realizado: { label: 'Realizado', color: '#16a34a', bg: '#dcfce7', icon: <CheckCircle size={14} /> },
  cancelado: { label: 'Cancelado', color: '#dc2626', bg: '#fee2e2', icon: <XCircle size={14} /> },
};

const ReportsPage = () => {
  const [trainings, setTrainings] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterCompany, setFilterCompany] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [tData, cData, pData] = await Promise.all([
        getTrainings(),
        getCompanies(),
        getProfiles()
      ]);
      setTrainings(tData || []);
      setCompanies(cData || []);
      setProfiles(pData || []);
      setLoading(false);
    }
    load();
  }, []);

  const enriched = useMemo(() => {
    return trainings.map(t => {
      const comp = companies.find(c => c.id === t.companyId);
      const companyName = comp ? comp.name : 'Empresa não encontrada';
      
      let normStatus = 'pendente';
      const rawStatus = (t.status || '').toLowerCase();
      if (['feito', 'entregue', 'realizado', 'concluido'].includes(rawStatus)) normStatus = 'realizado';
      else if (['cancelado', 'adiado'].includes(rawStatus)) normStatus = 'cancelado';
      else if (rawStatus === 'agendado') normStatus = 'agendado';

      const hasTravel = !t.description?.includes('[NO_TRAVEL]');
      
      const monthKey = t.date ? t.date.substring(0, 7) : null;
      
      const responsibleName = profiles.find(p => p.id === t.responsibleId)?.name || 'Nenhum';
      
      return { ...t, companyName, normStatus, hasTravel, monthKey, responsibleName };
    });
  }, [trainings, companies, profiles]);

  const availableMonths = useMemo(() => {
    const months = new Set();
    enriched.forEach(t => { if(t.monthKey) months.add(t.monthKey) });
    return Array.from(months).sort().reverse();
  }, [enriched]);

  const formatMonth = (yyyy_mm) => {
    if (!yyyy_mm) return '';
    const [y, m] = yyyy_mm.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
    const formatted = formatter.format(date);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const filtered = useMemo(() => {
    return enriched.filter(t => {
      if (filterCompany !== 'all' && t.companyId !== filterCompany) return false;
      if (filterStatus !== 'all' && t.normStatus !== filterStatus) return false;
      if (filterMonth !== 'all' && t.monthKey !== filterMonth) return false;
      
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        if (
          !t.title?.toLowerCase().includes(lower) &&
          !t.companyName?.toLowerCase().includes(lower) &&
          !t.instructor?.toLowerCase().includes(lower)
        ) return false;
      }
      return true;
    }).sort((a, b) => {
      let valA, valB;
      if (sortField === 'date') {
        valA = a.date || '9999-12-31';
        valB = b.date || '9999-12-31';
      } else if (sortField === 'company') {
        valA = a.companyName || '';
        valB = b.companyName || '';
      } else if (sortField === 'title') {
        valA = a.title || '';
        valB = b.title || '';
      }
      if (sortDir === 'asc') return valA < valB ? -1 : valA > valB ? 1 : 0;
      return valA > valB ? -1 : valA < valB ? 1 : 0;
    });
  }, [enriched, filterCompany, filterStatus, filterMonth, searchTerm, sortField, sortDir]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const realizados = filtered.filter(t => t.normStatus === 'realizado').length;
    const agendados = filtered.filter(t => t.normStatus === 'agendado').length;
    const pendentes = filtered.filter(t => t.normStatus === 'pendente').length;
    const uniqueResponsaveis = new Set(filtered.map(t => t.responsibleName).filter(n => n !== 'Nenhum'));
    const responsaveisCount = uniqueResponsaveis.size;
    return { total, realizados, agendados, pendentes, responsaveisCount };
  }, [filtered]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown size={12} style={{ opacity: 0.3 }} />;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const exportCSV = () => {
    const headers = ['Empresa', 'Treinamento', 'Data', 'Horario', 'Instrutor', 'Responsável', 'Deslocamento', 'Status'];
    const rows = filtered.map(d => [
      d.companyName,
      d.title,
      d.date ? new Date(d.date + 'T00:00:00').toLocaleDateString('pt-BR') : '',
      d.time || '',
      d.instructor || '',
      d.responsibleName || 'Nenhum',
      d.hasTravel ? 'SIM' : 'NAO',
      STATUS_CONFIG[d.normStatus]?.label || d.normStatus
    ]);

    const csvContent = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-treinamentos-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    // ---- COVER PAGE ----
    doc.setFillColor(27, 122, 61);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 30, 55, pageWidth / 2 + 30, 55);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Treinamentos e Agenda', pageWidth / 2, 72, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Gestão Integrada em Saúde e Segurança do Trabalho', pageWidth / 2, 84, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(220, 220, 220);
    doc.text(dateStr, pageWidth / 2, 96, { align: 'center' });

    // Summary box
    const boxY = 115;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth / 2 - 70, boxY, 140, 40, 3, 3, 'F');

    doc.setTextColor(33, 37, 41);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const summaryItems = [
      [`Total: ${stats.total}`, `Realizados: ${stats.realizados}`, `Agendados: ${stats.agendados}`],
      [`Pendentes: ${stats.pendentes}`, `Participantes: ${stats.participantes}`, ``]
    ];
    summaryItems[0].forEach((txt, i) => {
      doc.text(txt, pageWidth / 2 - 50 + i * 45, boxY + 15);
    });
    doc.setFont('helvetica', 'normal');
    summaryItems[1].forEach((txt, i) => {
      if (txt) doc.text(txt, pageWidth / 2 - 50 + i * 45, boxY + 28);
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(180, 220, 190);
    doc.text('TotalSafety - Sistema de Gestão', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // ---- TABLE PAGE(S) ----
    doc.addPage();

    doc.setFillColor(27, 122, 61);
    doc.rect(0, 0, pageWidth, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Detalhado de Treinamentos', 14, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    let periodText = 'Todos os Períodos';
    if (filterMonth !== 'all') periodText = formatMonth(filterMonth);
    doc.text(`${periodText} • ${dateStr}`, pageWidth - 14, 12, { align: 'right' });

    const tableData = filtered.map(d => [
      d.companyName,
      d.title,
      d.date ? new Date(d.date + 'T00:00:00').toLocaleDateString('pt-BR') : '—',
      d.time || '—',
      d.instructor || '—',
      d.responsibleName || 'Nenhum',
      d.hasTravel ? 'Sim' : 'Não',
      STATUS_CONFIG[d.normStatus]?.label || d.normStatus || ''
    ]);

    autoTable(doc, {
      startY: 24,
      head: [['Empresa', 'Treinamento', 'Data', 'Hora', 'Instrutor', 'Qtd Part.', 'Logística', 'Status']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        lineColor: [222, 226, 230],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [52, 58, 64],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 60 },
        2: { cellWidth: 22 },
        3: { cellWidth: 16 },
        4: { cellWidth: 35 },
        5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 20, halign: 'center' },
        7: { cellWidth: 25 },
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 7) {
          const status = data.cell.raw;
          if (status === 'Realizado') {
            data.cell.styles.textColor = [22, 163, 74];
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Pendente') {
            data.cell.styles.textColor = [217, 119, 6];
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Cancelado') {
            data.cell.styles.textColor = [220, 38, 38];
          } else if (status === 'Agendado') {
            data.cell.styles.textColor = [37, 99, 235];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
        doc.text('TotalSafety - Relatório de Treinamentos', 14, pageHeight - 6);

        if (data.pageNumber > 1) {
          doc.setFillColor(27, 122, 61);
          doc.rect(0, 0, pageWidth, 18, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Relatório Detalhado de Treinamentos (cont.)', 14, 12);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text(dateStr, pageWidth - 14, 12, { align: 'right' });
        }
      }
    });

    doc.save(`relatorio-treinamentos-${now.toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Carregando relatórios de treinamentos...</div>;
  }

  const StatCard = ({ icon, label, value, color, bg, onClick, active }) => (
    <div
      onClick={onClick}
      style={{
        padding: '1.25rem', borderRadius: 'var(--radius-lg)',
        backgroundColor: active ? bg : 'var(--surface)',
        border: active ? `2px solid ${color}` : '1px solid var(--border)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'var(--transition)',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
        minWidth: '140px', flex: 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: color }}>
        {icon}
        <span style={{ fontSize: '0.8125rem', fontWeight: '500', color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      <span style={{ fontSize: '1.75rem', fontWeight: '700', color: color }}>{value}</span>
    </div>
  );

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
      <header className="header-responsive">
        <div>
          <h1 className="text-h1">Relatórios de Treinamentos</h1>
          <p className="text-subtitle">Visão geral e análise dos agendamentos e treinamentos ministrados.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={exportPDF}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 1.25rem', borderRadius: 'var(--radius-md)',
              backgroundColor: '#dc2626', color: 'white', border: 'none',
              fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer',
              transition: 'var(--transition)'
            }}
          >
            <FileDown size={16} /> Exportar PDF
          </button>
          <button
            onClick={exportCSV}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 1.25rem', borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary)', color: 'white', border: 'none',
              fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer',
              transition: 'var(--transition)'
            }}
          >
            <Download size={16} /> Exportar CSV
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <StatCard icon={<BarChart3 size={18} />} label="Total" value={stats.total} color="var(--text-primary)" bg="var(--background)" onClick={() => setFilterStatus('all')} active={filterStatus === 'all'} />
        <StatCard icon={<CheckCircle size={18} />} label="Realizados" value={stats.realizados} color="#16a34a" bg="#dcfce7" onClick={() => setFilterStatus('realizado')} active={filterStatus === 'realizado'} />
        <StatCard icon={<Calendar size={18} />} label="Agendados" value={stats.agendados} color="var(--primary)" bg="var(--primary-light)" onClick={() => setFilterStatus('agendado')} active={filterStatus === 'agendado'} />
        <StatCard icon={<Clock size={18} />} label="Pendentes" value={stats.pendentes} color="#d97706" bg="#fef3c7" onClick={() => setFilterStatus('pendente')} active={filterStatus === 'pendente'} />
        <div className="card" style={{ padding: '1.25rem', flex: 1, minWidth: '140px', display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d' }}>
            <Users size={18} />
            <span style={{ fontSize: '0.8125rem', fontWeight: '500' }}>Técnicos (Equipe)</span>
          </div>
          <span style={{ fontSize: '1.75rem', fontWeight: '700', color: '#15803d' }}>{stats.responsaveisCount}</span>
        </div>
      </div>
      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
          <Search size={18} color="var(--text-secondary)" />
          <input
            type="text" placeholder="Buscar treinamento, instrutor ou empresa..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.875rem', backgroundColor: 'transparent', color: 'var(--text-primary)', fontFamily: 'inherit' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={16} color="var(--text-secondary)" />
          
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="filter-select">
            <option value="all">Todos os meses</option>
            {availableMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
          </select>

          <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className="filter-select">
            <option value="all">Todas as empresas</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="filter-select">
            <option value="all">Todos os status</option>
            <option value="realizado">Realizados</option>
            <option value="agendado">Agendados</option>
            <option value="pendente">Pendentes</option>
            <option value="cancelado">Cancelados</option>
          </select>
        </div>
      </div>

      {/* Report: Overview Table */}
      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              {[
                { field: 'company', label: 'Empresa' },
                { field: 'title', label: 'Treinamento' },
                { field: 'date', label: 'Data / Horário' },
                { field: 'instructor', label: 'Instrutor' },
                { field: 'responsibleName', label: 'Responsável' },
                { field: 'logistics', label: 'Logística' },
                { field: 'status', label: 'Status' },
              ].map(col => (
                <th
                  key={col.label}
                  onClick={() => ['company', 'title', 'date'].includes(col.field) && handleSort(col.field)}
                  style={{
                    textAlign: col.field === 'responsibleName' || col.field === 'logistics' ? 'center' : 'left', 
                    padding: '0.75rem 1rem', fontWeight: '600',
                    color: 'var(--text-secondary)', fontSize: '0.8125rem',
                    cursor: ['company', 'title', 'date'].includes(col.field) ? 'pointer' : 'default', userSelect: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', justifyContent: col.field === 'responsibleName' || col.field === 'logistics' ? 'center' : 'flex-start' }}>
                    {col.label}
                    {['company', 'title', 'date'].includes(col.field) && <SortIcon field={col.field} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Nenhum treinamento encontrado com os filtros aplicados.</td></tr>
            )}
            {filtered.map(d => {
              const statusConf = STATUS_CONFIG[d.normStatus] || STATUS_CONFIG.pendente;
              return (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--border)', transition: 'var(--transition)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--background)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '0.75rem 1rem', fontWeight: '500', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.companyName}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.title}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {d.date ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                        <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{new Date(d.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                        {d.time && <span style={{ fontSize: '0.75rem' }}><Clock size={10} style={{ display: 'inline', marginRight: '2px' }} /> {d.time}</span>}
                      </div>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                    {d.instructor ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><User size={12} /> {d.instructor}</span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: '500' }}>
                    {d.responsibleName}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    {d.hasTravel ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '0.125rem 0.5rem', borderRadius: '1rem' }}>
                        <MapPin size={10} /> Sim
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Não</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      padding: '0.2rem 0.625rem', borderRadius: '1rem',
                      backgroundColor: statusConf.bg, color: statusConf.color,
                      fontSize: '0.75rem', fontWeight: '600'
                    }}>
                      {statusConf.icon} {statusConf.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Exibindo {filtered.length} de {enriched.length} agendamentos de treinamento</span>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
