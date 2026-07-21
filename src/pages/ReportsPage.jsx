import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, Download, Filter, Search, Building2, Calendar,
  CheckCircle, Clock, AlertTriangle, XCircle, FileText,
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp,
  FileSpreadsheet, File, ClipboardList, Package, FileDown
} from 'lucide-react';
import { getAllDeliverablesSummary, getCompanies, getContracts } from '../services/storageService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const STATUS_CONFIG = {
  entregue: { label: 'Entregue', color: '#16a34a', bg: '#dcfce7', icon: <CheckCircle size={14} /> },
  feito: { label: 'Feito', color: '#16a34a', bg: '#dcfce7', icon: <CheckCircle size={14} /> },
  pendente: { label: 'Pendente', color: '#d97706', bg: '#fef3c7', icon: <Clock size={14} /> },
  agendado: { label: 'Agendado', color: 'var(--primary)', bg: 'var(--primary-light)', icon: <Clock size={14} /> },
  em_elaboracao: { label: 'Em Elaboração', color: '#2563eb', bg: '#dbeafe', icon: <TrendingUp size={14} /> },
  adiado: { label: 'Adiado', color: '#9333ea', bg: '#f3e8ff', icon: <Minus size={14} /> },
  cancelado: { label: 'Cancelado', color: '#dc2626', bg: '#fee2e2', icon: <XCircle size={14} /> },
  nao_se_aplica: { label: 'N/A', color: '#6b7280', bg: '#f3f4f6', icon: <Minus size={14} /> },
};

const TYPE_CONFIG = {
  programa: { label: 'Programa', icon: <FileSpreadsheet size={14} /> },
  laudo: { label: 'Laudo', icon: <FileText size={14} /> },
  contrato: { label: 'Contrato', icon: <File size={14} /> },
  documento: { label: 'Documento', icon: <FileText size={14} /> },
  treinamento: { label: 'Treinamento', icon: <ClipboardList size={14} /> },
  visita_tecnica: { label: 'Visita Técnica', icon: <Building2 size={14} /> },
};

const ReportsPage = () => {
  const [deliverables, setDeliverables] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterCompany, setFilterCompany] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('dueDate');
  const [sortDir, setSortDir] = useState('asc');
  const [activeReport, setActiveReport] = useState('overview');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [delivs, comps, conts] = await Promise.all([
        getAllDeliverablesSummary(),
        getCompanies(),
        getContracts()
      ]);
      setDeliverables(delivs);
      setCompanies(comps);
      setContracts(conts);
      setLoading(false);
    }
    load();
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const enriched = useMemo(() => {
    return deliverables.map(d => {
      // Vencidos de verdade (de acordo com a página de Entregáveis/Dashboard) são aqueles onde a validade passou
      const validity = d.validityDate ? new Date(d.validityDate + 'T00:00:00') : null;
      const isOverdue = validity ? validity < today : false;
      const daysUntilDue = validity ? Math.ceil((validity - today) / (1000 * 60 * 60 * 24)) : null;
      const isExpiringSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 15;
      return { ...d, isOverdue, isExpiringSoon, daysUntilDue };
    });
  }, [deliverables]);

  const filtered = useMemo(() => {
    return enriched.filter(d => {
      if (filterCompany !== 'all' && d.companyId !== filterCompany) return false;
      if (filterStatus === 'vencido') return d.isOverdue;
      if (filterStatus === 'proximo_vencer') return d.isExpiringSoon;
      if (filterStatus !== 'all' && d.status !== filterStatus) return false;
      if (filterType !== 'all' && d.type !== filterType) return false;
      if (searchTerm && !d.title.toLowerCase().includes(searchTerm.toLowerCase()) && !d.companyName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    }).sort((a, b) => {
      let valA, valB;
      if (sortField === 'validityDate') {
        valA = a.validityDate || '9999-12-31';
        valB = b.validityDate || '9999-12-31';
      } else if (sortField === 'company') {
        valA = a.companyName || '';
        valB = b.companyName || '';
      } else if (sortField === 'title') {
        valA = a.title || '';
        valB = b.title || '';
      } else if (sortField === 'status') {
        valA = a.status || '';
        valB = b.status || '';
      }
      if (sortDir === 'asc') return valA < valB ? -1 : valA > valB ? 1 : 0;
      return valA > valB ? -1 : valA < valB ? 1 : 0;
    });
  }, [enriched, filterCompany, filterStatus, filterType, searchTerm, sortField, sortDir]);

  // Stats
  const stats = useMemo(() => {
    const total = enriched.length;
    const entregues = enriched.filter(d => d.status === 'entregue' || d.status === 'feito').length;
    const pendentes = enriched.filter(d => d.status === 'pendente').length;
    const emElaboracao = enriched.filter(d => d.status === 'em_elaboracao').length;
    const agendados = enriched.filter(d => d.status === 'agendado').length;
    const vencidos = enriched.filter(d => d.isOverdue).length;
    const proximosVencer = enriched.filter(d => d.isExpiringSoon).length;
    const cancelados = enriched.filter(d => d.status === 'cancelado').length;
    const taxaEntrega = total > 0 ? Math.round((entregues / total) * 100) : 0;
    return { total, entregues, pendentes, emElaboracao, agendados, vencidos, proximosVencer, cancelados, taxaEntrega };
  }, [enriched]);

  // Per-company stats
  const companyStats = useMemo(() => {
    const map = {};
    enriched.forEach(d => {
      if (!map[d.companyId]) {
        map[d.companyId] = { name: d.companyName, total: 0, entregues: 0, pendentes: 0, vencidos: 0, emElaboracao: 0 };
      }
      map[d.companyId].total++;
      if (d.status === 'entregue' || d.status === 'feito') map[d.companyId].entregues++;
      if (d.status === 'pendente') map[d.companyId].pendentes++;
      if (d.isOverdue) map[d.companyId].vencidos++;
      if (d.status === 'em_elaboracao') map[d.companyId].emElaboracao++;
    });
    return Object.entries(map).map(([id, s]) => ({
      id, ...s,
      taxaEntrega: s.total > 0 ? Math.round((s.entregues / s.total) * 100) : 0
    })).sort((a, b) => b.vencidos - a.vencidos || b.total - a.total);
  }, [enriched]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown size={12} style={{ opacity: 0.3 }} />;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const exportCSV = () => {
    const headers = ['Empresa', 'Entregável', 'Tipo', 'Status', 'Validade (Vencimento)', 'Vencido', 'Dias p/ Vencer'];
    const rows = filtered.map(d => [
      d.companyName,
      d.title,
      TYPE_CONFIG[d.type]?.label || d.type,
      STATUS_CONFIG[d.status]?.label || d.status,
      d.validityDate ? new Date(d.validityDate + 'T00:00:00').toLocaleDateString('pt-BR') : '',
      d.isOverdue ? 'SIM' : '',
      d.daysUntilDue !== null ? d.daysUntilDue : ''
    ]);

    const csvContent = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-entregaveis-${new Date().toISOString().split('T')[0]}.csv`;
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

    // Decorative line
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 30, 55, pageWidth / 2 + 30, 55);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Entregáveis', pageWidth / 2, 72, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Gestão Integrada em Saúde e Segurança do Trabalho', pageWidth / 2, 84, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(220, 220, 220);
    doc.text(dateStr, pageWidth / 2, 96, { align: 'center' });

    // Summary box
    const boxY = 115;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth / 2 - 70, boxY, 140, 50, 3, 3, 'F');

    doc.setTextColor(33, 37, 41);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const summaryItems = [
      [`Total: ${stats.total}`, `Entregues: ${stats.entregues}`, `Pendentes: ${stats.pendentes}`],
      [`Vencidos: ${stats.vencidos}`, `Em Elaboração: ${stats.emElaboracao}`, `Taxa: ${stats.taxaEntrega}%`]
    ];
    summaryItems[0].forEach((txt, i) => {
      doc.text(txt, pageWidth / 2 - 60 + i * 47, boxY + 15);
    });
    doc.setFont('helvetica', 'normal');
    summaryItems[1].forEach((txt, i) => {
      doc.text(txt, pageWidth / 2 - 60 + i * 47, boxY + 28);
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(180, 220, 190);
    doc.text('TotalSafety - Sistema de Gestão', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // ---- TABLE PAGE(S) ----
    doc.addPage();

    // Header bar
    doc.setFillColor(27, 122, 61);
    doc.rect(0, 0, pageWidth, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Detalhado de Entregáveis', 14, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(dateStr, pageWidth - 14, 12, { align: 'right' });

    const STATUS_LABELS = {
      entregue: 'Entregue', feito: 'Feito', pendente: 'Pendente',
      agendado: 'Agendado', em_elaboracao: 'Em Elaboração',
      adiado: 'Adiado', cancelado: 'Cancelado', nao_se_aplica: 'N/A'
    };
    const TYPE_LABELS = {
      programa: 'Programa', laudo: 'Laudo', contrato: 'Contrato',
      documento: 'Documento', treinamento: 'Treinamento', visita_tecnica: 'Visita Técnica'
    };

    const tableData = filtered.map(d => [
      d.companyName,
      d.title,
      TYPE_LABELS[d.type] || d.type || '',
      STATUS_LABELS[d.status] || d.status || '',
      d.validityDate ? new Date(d.validityDate + 'T00:00:00').toLocaleDateString('pt-BR') : '—',
      d.isOverdue ? `Vencido (${Math.abs(d.daysUntilDue)}d)` : d.isExpiringSoon ? `${d.daysUntilDue}d restantes` : (d.status === 'entregue' || d.status === 'feito') ? 'OK' : ''
    ]);

    autoTable(doc, {
      startY: 24,
      head: [['Empresa', 'Entregável', 'Tipo', 'Status', 'Validade', 'Situação']],
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
        1: { cellWidth: 70 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 26 },
        5: { cellWidth: 32 },
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const status = data.cell.raw;
          if (status === 'Entregue' || status === 'Feito') {
            data.cell.styles.textColor = [22, 163, 74];
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Pendente') {
            data.cell.styles.textColor = [217, 119, 6];
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Cancelado') {
            data.cell.styles.textColor = [220, 38, 38];
          }
        }
        if (data.section === 'body' && data.column.index === 5) {
          const sit = data.cell.raw;
          if (sit.includes('Vencido')) {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          } else if (sit.includes('restantes')) {
            data.cell.styles.textColor = [234, 88, 12];
          } else if (sit === 'OK') {
            data.cell.styles.textColor = [22, 163, 74];
          }
        }
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        // Footer on each page
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
        doc.text('TotalSafety - Relatório de Entregáveis', 14, pageHeight - 6);

        // Re-draw header on new pages
        if (data.pageNumber > 1) {
          doc.setFillColor(27, 122, 61);
          doc.rect(0, 0, pageWidth, 18, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Relatório Detalhado de Entregáveis (cont.)', 14, 12);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text(dateStr, pageWidth - 14, 12, { align: 'right' });
        }
      }
    });

    // ---- COMPANY SUMMARY PAGE ----
    if (companyStats.length > 0) {
      doc.addPage();

      doc.setFillColor(27, 122, 61);
      doc.rect(0, 0, pageWidth, 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo por Empresa', 14, 12);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(dateStr, pageWidth - 14, 12, { align: 'right' });

      const companyData = companyStats.map(cs => [
        cs.name,
        cs.total,
        cs.entregues,
        cs.pendentes,
        cs.emElaboracao,
        cs.vencidos,
        `${cs.taxaEntrega}%`
      ]);

      autoTable(doc, {
        startY: 24,
        head: [['Empresa', 'Total', 'Entregues', 'Pendentes', 'Em Elab.', 'Vencidos', 'Taxa']],
        body: companyData,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 3,
          lineColor: [222, 226, 230],
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: [52, 58, 64],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5,
        },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'center' },
          6: { halign: 'center', fontStyle: 'bold' },
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 5) {
            const val = parseInt(data.cell.raw);
            if (val > 0) {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            }
          }
          if (data.section === 'body' && data.column.index === 6) {
            const pct = parseInt(data.cell.raw);
            if (pct >= 70) data.cell.styles.textColor = [22, 163, 74];
            else if (pct >= 40) data.cell.styles.textColor = [217, 119, 6];
            else data.cell.styles.textColor = [220, 38, 38];
          }
        },
        margin: { left: 14, right: 14 },
        didDrawPage: () => {
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.text(`Página ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
          doc.text('TotalSafety - Relatório de Entregáveis', 14, pageHeight - 6);
        }
      });
    }

    doc.save(`relatorio-entregaveis-${now.toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Carregando relatórios...</div>;
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
          <h1 className="text-h1">Relatórios</h1>
          <p className="text-subtitle">Visão geral e análise dos entregáveis de todas as empresas.</p>
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
        <StatCard icon={<CheckCircle size={18} />} label="Entregues" value={stats.entregues} color="#16a34a" bg="#dcfce7" onClick={() => setFilterStatus('entregue')} active={filterStatus === 'entregue'} />
        <StatCard icon={<Clock size={18} />} label="Pendentes" value={stats.pendentes} color="#d97706" bg="#fef3c7" onClick={() => setFilterStatus('pendente')} active={filterStatus === 'pendente'} />
        <StatCard icon={<AlertTriangle size={18} />} label="Vencidos" value={stats.vencidos} color="#dc2626" bg="#fee2e2" onClick={() => setFilterStatus('vencido')} active={filterStatus === 'vencido'} />
        <StatCard icon={<TrendingDown size={18} />} label="Próx. Vencer" value={stats.proximosVencer} color="#ea580c" bg="#fff7ed" onClick={() => setFilterStatus('proximo_vencer')} active={filterStatus === 'proximo_vencer'} />
      </div>

      {/* Sub-stats */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          <TrendingUp size={20} color="var(--primary)" />
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Taxa de Entrega</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: stats.taxaEntrega >= 70 ? '#16a34a' : stats.taxaEntrega >= 40 ? '#d97706' : '#dc2626' }}>{stats.taxaEntrega}%</div>
          </div>
          <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--background)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${stats.taxaEntrega}%`, backgroundColor: stats.taxaEntrega >= 70 ? '#16a34a' : stats.taxaEntrega >= 40 ? '#d97706' : '#dc2626', borderRadius: '4px', transition: 'width 0.5s ease' }} />
          </div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Building2 size={20} color="var(--primary)" />
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Empresas</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{companies.length}</div>
          </div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ClipboardList size={20} color="var(--primary)" />
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Contratos</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{contracts.length}</div>
          </div>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="tabs-container" style={{ marginBottom: '1.25rem' }}>
        {[
          { id: 'overview', label: 'Lista Geral', icon: <FileText size={16} /> },
          { id: 'byCompany', label: 'Por Empresa', icon: <Building2 size={16} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 1.25rem', borderRadius: 'var(--radius-md)',
              fontWeight: activeReport === tab.id ? '600' : '500',
              fontSize: '0.875rem', transition: 'var(--transition)',
              backgroundColor: activeReport === tab.id ? 'var(--primary)' : 'transparent',
              color: activeReport === tab.id ? 'white' : 'var(--text-secondary)',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
          <Search size={18} color="var(--text-secondary)" />
          <input
            type="text" placeholder="Buscar entregável ou empresa..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.875rem', backgroundColor: 'transparent', color: 'var(--text-primary)', fontFamily: 'inherit' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={16} color="var(--text-secondary)" />
          <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className="filter-select">
            <option value="all">Todas as empresas</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="filter-select">
            <option value="all">Todos os tipos (Ex: Programas, Laudos)</option>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="filter-select">
            <option value="all">Todos os status</option>
            <option value="pendente">Pendentes</option>
            <option value="vencido">Vencidos</option>
            <option value="proximo_vencer">Próximos a Vencer</option>
            <option value="entregue">Entregues / Feitos</option>
            <option value="em_elaboracao">Em Elaboração</option>
            <option value="agendado">Agendados</option>
            <option value="cancelado">Cancelados</option>
          </select>
        </div>
      </div>

      {/* Report: Overview Table */}
      {activeReport === 'overview' && (
        <div className="card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {[
                  { field: 'company', label: 'Empresa' },
                  { field: 'title', label: 'Entregável' },
                  { field: 'type', label: 'Tipo' },
                  { field: 'status', label: 'Status' },
                  { field: 'validityDate', label: 'Validade' },
                  { field: null, label: 'Situação' },
                ].map(col => (
                  <th
                    key={col.label}
                    onClick={() => col.field && handleSort(col.field)}
                    style={{
                      textAlign: 'left', padding: '0.75rem 1rem', fontWeight: '600',
                      color: 'var(--text-secondary)', fontSize: '0.8125rem',
                      cursor: col.field ? 'pointer' : 'default', userSelect: 'none',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      {col.label}
                      {col.field && <SortIcon field={col.field} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Nenhum entregável encontrado com os filtros aplicados.</td></tr>
              )}
              {filtered.map(d => {
                const statusConf = STATUS_CONFIG[d.status] || STATUS_CONFIG.pendente;
                const typeConf = TYPE_CONFIG[d.type] || TYPE_CONFIG.documento;
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
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {typeConf.icon} {typeConf.label}
                      </span>
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
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {d.validityDate ? (
                        <span style={{ color: d.isOverdue ? '#dc2626' : d.isExpiringSoon ? '#ea580c' : 'inherit', fontWeight: d.isOverdue ? '600' : 'normal' }}>
                          {new Date(d.validityDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {d.isOverdue && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                          padding: '0.2rem 0.625rem', borderRadius: '1rem',
                          backgroundColor: '#fee2e2', color: '#dc2626',
                          fontSize: '0.75rem', fontWeight: '600'
                        }}>
                          <AlertTriangle size={12} /> Vencido {d.daysUntilDue !== null ? `(${Math.abs(d.daysUntilDue)}d)` : ''}
                        </span>
                      )}
                      {d.isExpiringSoon && !d.isOverdue && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                          padding: '0.2rem 0.625rem', borderRadius: '1rem',
                          backgroundColor: '#fff7ed', color: '#ea580c',
                          fontSize: '0.75rem', fontWeight: '600'
                        }}>
                          <Clock size={12} /> {d.daysUntilDue}d restantes
                        </span>
                      )}
                      {!d.isOverdue && !d.isExpiringSoon && (d.status === 'entregue' || d.status === 'feito') && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#16a34a' }}>
                          <CheckCircle size={12} /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Exibindo {filtered.length} de {enriched.length} entregáveis</span>
            <span>{stats.vencidos > 0 && <span style={{ color: '#dc2626', fontWeight: '600' }}>⚠ {stats.vencidos} vencido(s)</span>}</span>
          </div>
        </div>
      )}

      {/* Report: By Company */}
      {activeReport === 'byCompany' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {companyStats.map(cs => {
            const barWidth = cs.total > 0 ? Math.round((cs.entregues / cs.total) * 100) : 0;
            return (
              <div key={cs.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      <Building2 size={16} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom', color: 'var(--primary)' }} />
                      {cs.name}
                    </h3>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{cs.total} entregáveis</span>
                  </div>
                  <div style={{
                    fontSize: '1.5rem', fontWeight: '700',
                    color: barWidth >= 70 ? '#16a34a' : barWidth >= 40 ? '#d97706' : '#dc2626'
                  }}>
                    {cs.taxaEntrega}%
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: '8px', backgroundColor: 'var(--background)', borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem' }}>
                  <div style={{
                    height: '100%', width: `${barWidth}%`, borderRadius: '4px',
                    backgroundColor: barWidth >= 70 ? '#16a34a' : barWidth >= 40 ? '#d97706' : '#dc2626',
                    transition: 'width 0.5s ease'
                  }} />
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <MiniStat label="Entregues" value={cs.entregues} color="#16a34a" bg="#dcfce7" />
                  <MiniStat label="Pendentes" value={cs.pendentes} color="#d97706" bg="#fef3c7" />
                  <MiniStat label="Em Elaboração" value={cs.emElaboracao} color="#2563eb" bg="#dbeafe" />
                  <MiniStat label="Vencidos" value={cs.vencidos} color="#dc2626" bg="#fee2e2" />
                </div>
              </div>
            );
          })}
          {companyStats.length === 0 && (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Nenhuma empresa com entregáveis encontrada.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MiniStat = ({ label, value, color, bg }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-md)',
    backgroundColor: bg, fontSize: '0.8125rem',
  }}>
    <span style={{ fontWeight: '700', color }}>{value}</span>
    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
  </div>
);

export default ReportsPage;
