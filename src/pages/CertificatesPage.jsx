import React, { useState } from 'react';
import { Award, Printer, FileText, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

const CertificatesPage = () => {
  const [formData, setFormData] = useState({
    nr: 'NR - 06',
    descricao: 'Sobre uso e guarda de EPI conforme exigências da Norma Regulamentadora - NR 06',
    data: '',
    local: '',
    empresa: '',
    duracao: '1 hora',
    instrutorNome: 'Adeylton da Silva Araújo',
    instrutorCargo: 'Técnico em Segurança do Trabalho',
    instrutorRegistro: 'SRTE N° 0009823/RN',
    conteudo: 'a) descrição do equipamento e seus componentes;\nb) risco ocupacional contra o qual o EPI oferece proteção;\nc) restrições e limitações de proteção;\nd) forma adequada de uso e ajuste;\ne) manutenção e substituição; e\nf) cuidados de limpeza, higienização, guarda e conservação.',
  });

  const [colaboradores, setColaboradores] = useState([
    { nome: '', cpf: '' }
  ]);

  const [currentPage, setCurrentPage] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleColabChange = (index, field, value) => {
    setColaboradores(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addColaborador = () => {
    setColaboradores(prev => [...prev, { nome: '', cpf: '' }]);
  };

  const removeColaborador = (index) => {
    if (colaboradores.length <= 1) return;
    setColaboradores(prev => prev.filter((_, i) => i !== index));
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'DD/MM/AAAA';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  // Each collaborator generates 4 pages: cert front, cert back, list front, list back
  const validColabs = colaboradores.filter(c => c.nome.trim());
  const totalPages = validColabs.length * 4;

  const pages = [];
  validColabs.forEach((colab) => {
    // Page 1: Certificado Frente (sem assinatura técnico)
    pages.push({ type: 'cert_front', colab });
    // Page 2: Certificado Verso (com assinatura técnico)
    pages.push({ type: 'cert_back', colab });
    // Page 3: Lista de Presença Frente
    pages.push({ type: 'list_front', colab });
    // Page 4: Lista de Presença Verso
    pages.push({ type: 'list_back', colab });
  });

  const nrOptions = [
    { value: 'NR - 01', label: 'NR-01 - Disposições Gerais e Gerenciamento de Riscos Ocupacionais' },
    { value: 'NR - 05', label: 'NR-05 - CIPA' },
    { value: 'NR - 06', label: 'NR-06 - EPI' },
    { value: 'NR - 10', label: 'NR-10 - Segurança em Instalações Elétricas' },
    { value: 'NR - 11', label: 'NR-11 - Transporte e Movimentação de Materiais' },
    { value: 'NR - 12', label: 'NR-12 - Segurança em Máquinas e Equipamentos' },
    { value: 'NR - 18', label: 'NR-18 - Indústria da Construção' },
    { value: 'NR - 20', label: 'NR-20 - Inflamáveis e Combustíveis' },
    { value: 'NR - 33', label: 'NR-33 - Espaços Confinados' },
    { value: 'NR - 35', label: 'NR-35 - Trabalho em Altura' },
  ];

  const conteudoSugestoes = {
    'NR - 01': 'a) direitos e deveres do empregado e empregador;\nb) riscos ocupacionais e medidas de prevenção;\nc) classificação dos fatores de risco;\nd) noções sobre acidentes e doenças do trabalho;\ne) procedimentos em situações de emergência.',
    'NR - 05': 'a) estudo do ambiente e condições de trabalho;\nb) metodologia de investigação de acidentes;\nc) noções sobre as legislações trabalhistas e previdenciárias;\nd) princípios gerais de higiene do trabalho;\ne) organização da CIPA e atribuições.',
    'NR - 06': 'a) descrição do equipamento e seus componentes;\nb) risco ocupacional contra o qual o EPI oferece proteção;\nc) restrições e limitações de proteção;\nd) forma adequada de uso e ajuste;\ne) manutenção e substituição; e\nf) cuidados de limpeza, higienização, guarda e conservação.',
    'NR - 10': 'a) introdução à segurança com eletricidade;\nb) riscos em instalações e serviços com eletricidade;\nc) técnicas de análise de risco;\nd) medidas de controle do risco elétrico;\ne) equipamentos de proteção coletiva e individual;\nf) rotinas de trabalho e procedimentos;\ng) documentação de instalações elétricas;\nh) riscos adicionais;\ni) proteção e combate a incêndios;\nj) acidentes de origem elétrica;\nk) primeiros socorros.',
    'NR - 11': 'a) tipos de equipamentos de transporte;\nb) procedimentos de segurança na movimentação de materiais;\nc) operação segura de equipamentos;\nd) sinalização;\ne) manutenção preventiva.',
    'NR - 12': 'a) descrição e identificação dos riscos associados;\nb) proteções – Loss Prevention e seus princípios;\nc) método de trabalho seguro;\nd) permissão de trabalho;\ne) sistema de bloqueio de fontes de energia.',
    'NR - 18': 'a) informações sobre as condições do ambiente de trabalho;\nb) riscos inerentes à função;\nc) uso adequado dos EPI;\nd) informações sobre os EPC existentes no canteiro;\ne) procedimentos adequados em caso de emergência.',
    'NR - 20': 'a) inflamáveis: características e propriedades;\nb) controle coletivo e individual;\nc) fontes de ignição e seu controle;\nd) proteção contra incêndio;\ne) procedimentos em situações de emergência.',
    'NR - 33': 'a) definição de espaço confinado;\nb) reconhecimento, avaliação e controle de riscos;\nc) funcionamento de equipamentos de medição;\nd) procedimentos e utilização da PET;\ne) noções de resgate e primeiros socorros.',
    'NR - 35': 'a) normas e regulamentos aplicáveis;\nb) análise de risco e condições impeditivas;\nc) riscos potenciais inerentes e medidas de prevenção;\nd) sistemas, equipamentos e procedimentos de proteção coletiva;\ne) EPI – seleção, inspeção, conservação e limitação de uso;\nf) acidentes típicos em trabalhos em altura;\ng) condutas em situações de emergência;\nh) noções de técnicas de resgate e primeiros socorros.',
  };

  const handleNrChange = (e) => {
    const nr = e.target.value;
    setFormData(prev => ({
      ...prev,
      nr,
      descricao: getDescricao(nr),
      conteudo: conteudoSugestoes[nr] || prev.conteudo
    }));
  };

  const getDescricao = (nr) => {
    const descs = {
      'NR - 01': 'Sobre Disposições Gerais e Gerenciamento de Riscos Ocupacionais conforme exigências da Norma Regulamentadora - NR 01',
      'NR - 05': 'Sobre Comissão Interna de Prevenção de Acidentes conforme exigências da Norma Regulamentadora - NR 05',
      'NR - 06': 'Sobre uso e guarda de EPI conforme exigências da Norma Regulamentadora - NR 06',
      'NR - 10': 'Sobre Segurança em Instalações e Serviços em Eletricidade conforme exigências da Norma Regulamentadora - NR 10',
      'NR - 11': 'Sobre Transporte, Movimentação, Armazenagem e Manuseio de Materiais conforme exigências da Norma Regulamentadora - NR 11',
      'NR - 12': 'Sobre Segurança no Trabalho em Máquinas e Equipamentos conforme exigências da Norma Regulamentadora - NR 12',
      'NR - 18': 'Sobre Condições e Meio Ambiente de Trabalho na Indústria da Construção conforme exigências da Norma Regulamentadora - NR 18',
      'NR - 20': 'Sobre Segurança e Saúde no Trabalho com Inflamáveis e Combustíveis conforme exigências da Norma Regulamentadora - NR 20',
      'NR - 33': 'Sobre Segurança e Saúde nos Trabalhos em Espaços Confinados conforme exigências da Norma Regulamentadora - NR 33',
      'NR - 35': 'Sobre Trabalho em Altura conforme exigências da Norma Regulamentadora - NR 35',
    };
    return descs[nr] || `Treinamento de ${nr}`;
  };

  // Render certificate page (front)
  const renderCertFront = (colab) => (
    <div className="cert-page" key={`cf-${colab.nome}`}>
      <div className="cert-inner">
        {/* Title - Nome do Colaborador no topo */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <h1 style={{ 
            fontSize: '2.8rem', fontWeight: '900', color: '#1a1a1a', 
            textTransform: 'uppercase', margin: '0', fontFamily: "'Montserrat', 'Calibri', sans-serif",
            letterSpacing: '1px'
          }}>
            {colab.nome || 'NOME DO COLABORADOR'}
          </h1>
        </div>
        
        {/* Descrição do treinamento */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <p style={{ fontSize: '1.5rem', color: '#333', margin: '0', fontFamily: "'Calibri', sans-serif" }}>
            {formData.descricao || 'Sobre uso e guarda de EPI conforme exigências da Norma Regulamentadora - NR 06'}
          </p>
        </div>
        
        {/* Data, Local, Empresa */}
        <div style={{ textAlign: 'center', marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '1.3rem', margin: '0', fontFamily: "'Calibri', sans-serif" }}>
            <strong>{formatDate(formData.data)}</strong>
          </p>
          <p style={{ fontSize: '1.3rem', margin: '0', fontFamily: "'Calibri', sans-serif" }}>
            <strong>{formData.local || 'LOCAL'}</strong>
          </p>
          <p style={{ fontSize: '1.3rem', margin: '0', fontFamily: "'Calibri', sans-serif" }}>
            <strong>{formData.empresa || 'EMPRESA'}</strong>
          </p>
        </div>
        
        {/* Assinatura do Participante */}
        <div style={{ marginTop: 'auto', paddingBottom: '3rem', textAlign: 'center' }}>
          <div style={{ borderTop: '2px solid #333', display: 'inline-block', minWidth: '350px', paddingTop: '0.75rem' }}>
            <p style={{ margin: '0', fontSize: '1.1rem', fontWeight: '700', fontFamily: "'Calibri', sans-serif" }}>
              {colab.nome || 'NOME DO COLABORADOR'}
            </p>
            <p style={{ margin: '0', fontSize: '1rem', fontFamily: "'Calibri', sans-serif", color: '#555' }}>
              CPF: {colab.cpf || 'CPF DO COLABORADOR'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Render certificate page (back - com assinatura técnico)
  const renderCertBack = (colab) => (
    <div className="cert-page" key={`cb-${colab.nome}`}>
      <div className="cert-inner">
        {/* Title - Nome do Colaborador no topo */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <h1 style={{ 
            fontSize: '2.8rem', fontWeight: '900', color: '#1a1a1a', 
            textTransform: 'uppercase', margin: '0', fontFamily: "'Montserrat', 'Calibri', sans-serif",
            letterSpacing: '1px'
          }}>
            {colab.nome || 'NOME DO COLABORADOR'}
          </h1>
        </div>
        
        {/* Descrição do treinamento */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <p style={{ fontSize: '1.5rem', color: '#333', margin: '0', fontFamily: "'Calibri', sans-serif" }}>
            {formData.descricao || 'Sobre uso e guarda de EPI conforme exigências da Norma Regulamentadora - NR 06'}
          </p>
        </div>
        
        {/* Data, Local, Empresa */}
        <div style={{ textAlign: 'center', marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '1.3rem', margin: '0', fontFamily: "'Calibri', sans-serif" }}>
            <strong>{formatDate(formData.data)}</strong>
          </p>
          <p style={{ fontSize: '1.3rem', margin: '0', fontFamily: "'Calibri', sans-serif" }}>
            <strong>{formData.local || 'LOCAL'}</strong>
          </p>
          <p style={{ fontSize: '1.3rem', margin: '0', fontFamily: "'Calibri', sans-serif" }}>
            <strong>{formData.empresa || 'EMPRESA'}</strong>
          </p>
        </div>
        
        {/* Assinatura Participante + Assinatura Técnico */}
        <div style={{ marginTop: 'auto', paddingBottom: '2rem', display: 'flex', justifyContent: 'space-around', width: '100%', gap: '3rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '2px solid #333', minWidth: '280px', paddingTop: '0.75rem' }}>
              <p style={{ margin: '0', fontSize: '1rem', fontWeight: '700', fontFamily: "'Calibri', sans-serif" }}>
                {colab.nome || 'NOME DO COLABORADOR'}
              </p>
              <p style={{ margin: '0', fontSize: '0.9rem', fontFamily: "'Calibri', sans-serif", color: '#555' }}>
                CPF: {colab.cpf || 'CPF DO COLABORADOR'}
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '2px solid #333', minWidth: '280px', paddingTop: '0.75rem' }}>
              <p style={{ margin: '0', fontSize: '1rem', fontWeight: '700', fontFamily: "'Calibri', sans-serif" }}>
                {formData.instrutorNome}
              </p>
              <p style={{ margin: '0', fontSize: '0.9rem', fontFamily: "'Calibri', sans-serif", color: '#555' }}>
                {formData.instrutorCargo}
              </p>
              <p style={{ margin: '0', fontSize: '0.9rem', fontFamily: "'Calibri', sans-serif", color: '#555' }}>
                {formData.instrutorRegistro}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render lista de presença (front and back are the same structure)
  const renderListPage = (colab, keyPrefix) => (
    <div className="cert-page cert-page-list" key={`${keyPrefix}-${colab.nome}`}>
      <div className="cert-inner-list">
        {/* Header - Instrutor */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <p style={{ margin: '0', fontSize: '1.2rem', fontWeight: '700', fontFamily: "'Calibri', sans-serif" }}>
            {formData.instrutorNome}
          </p>
          <p style={{ margin: '0', fontSize: '1rem', fontFamily: "'Calibri', sans-serif", color: '#555' }}>
            {formData.instrutorCargo}
          </p>
          <p style={{ margin: '0', fontSize: '1rem', fontFamily: "'Calibri', sans-serif", color: '#555' }}>
            {formData.instrutorRegistro}
          </p>
        </div>

        {/* Título */}
        <div style={{ 
          textAlign: 'center', marginBottom: '2rem', 
          backgroundColor: '#1a365d', color: 'white', padding: '0.75rem 1.5rem', 
          borderRadius: '4px', fontSize: '1.3rem', fontWeight: '700',
          fontFamily: "'Montserrat', 'Calibri', sans-serif"
        }}>
          Treinamento de {formData.nr}
        </div>

        {/* Dados do Treinamento */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontFamily: "'Calibri', sans-serif" }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#888', fontWeight: '600', textTransform: 'uppercase' }}>Empresa</span>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1.1rem', fontWeight: '600' }}>{formData.empresa || 'EMPRESA'}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#888', fontWeight: '600', textTransform: 'uppercase' }}>Local</span>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1.1rem', fontWeight: '600' }}>{formData.local || 'LOCAL'}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#888', fontWeight: '600', textTransform: 'uppercase' }}>Data</span>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1.1rem', fontWeight: '600' }}>{formatDate(formData.data)}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#888', fontWeight: '600', textTransform: 'uppercase' }}>Carga Horária</span>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1.1rem', fontWeight: '600' }}>{formData.duracao}</p>
          </div>
        </div>

        {/* Colaborador */}
        <div style={{ 
          backgroundColor: '#f0f4f8', padding: '1rem 1.5rem', borderRadius: '6px', 
          border: '1px solid #d0d5dd', marginBottom: '1.5rem', fontFamily: "'Calibri', sans-serif"
        }}>
          <span style={{ fontSize: '0.85rem', color: '#888', fontWeight: '600', textTransform: 'uppercase' }}>Colaborador</span>
          <p style={{ margin: '0.25rem 0 0', fontSize: '1.3rem', fontWeight: '700' }}>{colab.nome || 'NOME DO COLABORADOR'}</p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '1rem', color: '#555' }}>CPF: {colab.cpf || '000.000.000-00'}</p>
        </div>

        {/* Conteúdo Programático */}
        <div style={{ fontFamily: "'Calibri', sans-serif" }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1a365d', textTransform: 'uppercase', marginBottom: '0.75rem', borderBottom: '2px solid #1a365d', paddingBottom: '0.5rem' }}>
            Conteúdo Programático
          </h3>
          <div style={{ fontSize: '1rem', lineHeight: '1.8', whiteSpace: 'pre-wrap', color: '#333' }}>
            {formData.conteudo}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header - oculto na impressão */}
      <div className="hide-on-print" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FileText size={28} color="var(--primary)" />
          Gerador de Certificados SST
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Preencha os dados e adicione os colaboradores. Para cada colaborador serão geradas 4 páginas (certificado frente/verso + lista de presença frente/verso).
        </p>
      </div>

      {/* Form Controls - oculto na impressão */}
      <div className="card hide-on-print" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Award size={22} className="text-primary" />
          Dados do Treinamento
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div>
            <label className="modal-label">NR do Treinamento</label>
            <select name="nr" value={formData.nr} onChange={handleNrChange} className="modal-input">
              {nrOptions.map(nr => <option key={nr.value} value={nr.value}>{nr.label}</option>)}
            </select>
          </div>
          <div>
            <label className="modal-label">Data do Treinamento</label>
            <input type="date" name="data" value={formData.data} onChange={handleChange} className="modal-input" />
          </div>
          <div>
            <label className="modal-label">Local</label>
            <input type="text" name="local" value={formData.local} onChange={handleChange} className="modal-input" placeholder="Ex: Canteiro De Obras" />
          </div>
          <div>
            <label className="modal-label">Empresa</label>
            <input type="text" name="empresa" value={formData.empresa} onChange={handleChange} className="modal-input" placeholder="Ex: MVP Engenharia LTDA" />
          </div>
          <div>
            <label className="modal-label">Carga Horária</label>
            <input type="text" name="duracao" value={formData.duracao} onChange={handleChange} className="modal-input" placeholder="Ex: 1 hora" />
          </div>
          <div>
            <label className="modal-label">Nome do Instrutor</label>
            <input type="text" name="instrutorNome" value={formData.instrutorNome} onChange={handleChange} className="modal-input" />
          </div>
          <div>
            <label className="modal-label">Cargo do Instrutor</label>
            <input type="text" name="instrutorCargo" value={formData.instrutorCargo} onChange={handleChange} className="modal-input" />
          </div>
          <div>
            <label className="modal-label">Registro do Instrutor</label>
            <input type="text" name="instrutorRegistro" value={formData.instrutorRegistro} onChange={handleChange} className="modal-input" />
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label className="modal-label">Descrição do Treinamento (texto do certificado)</label>
          <input type="text" name="descricao" value={formData.descricao} onChange={handleChange} className="modal-input" />
        </div>

        <div>
          <label className="modal-label">Conteúdo Programático</label>
          <textarea name="conteudo" value={formData.conteudo} onChange={handleChange} className="modal-input" rows="5" style={{ resize: 'vertical' }}></textarea>
        </div>
      </div>

      {/* Lista de Colaboradores - oculto na impressão */}
      <div className="card hide-on-print" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
            Colaboradores ({colaboradores.length})
          </h2>
          <button onClick={addColaborador} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <Plus size={16} /> Adicionar
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {colaboradores.map((colab, i) => (
            <div key={i} style={{ 
              display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end',
              padding: '1rem', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)'
            }}>
              <div>
                <label className="modal-label" style={{ fontSize: '0.75rem' }}>Nome do Colaborador #{i + 1}</label>
                <input 
                  type="text" value={colab.nome} 
                  onChange={(e) => handleColabChange(i, 'nome', e.target.value)} 
                  className="modal-input" placeholder="Nome completo"
                />
              </div>
              <div>
                <label className="modal-label" style={{ fontSize: '0.75rem' }}>CPF</label>
                <input 
                  type="text" value={colab.cpf} 
                  onChange={(e) => handleColabChange(i, 'cpf', e.target.value)} 
                  className="modal-input" placeholder="000.000.000-00"
                />
              </div>
              <button 
                onClick={() => removeColaborador(i)} 
                disabled={colaboradores.length <= 1}
                style={{ 
                  background: 'none', border: 'none', cursor: colaboradores.length > 1 ? 'pointer' : 'not-allowed', 
                  color: colaboradores.length > 1 ? 'var(--error)' : 'var(--border)',
                  padding: '0.5rem', marginBottom: '0.25rem'
                }}
                title="Remover colaborador"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Botões de ação - oculto na impressão */}
      <div className="hide-on-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage <= 0 || pages.length === 0}
            className="btn btn-secondary"
            style={{ padding: '0.5rem' }}
          >
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', minWidth: '120px', textAlign: 'center' }}>
            {pages.length > 0 ? `Página ${currentPage + 1} de ${pages.length}` : 'Nenhuma página'}
          </span>
          <button 
            onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 1))}
            disabled={currentPage >= pages.length - 1 || pages.length === 0}
            className="btn btn-secondary"
            style={{ padding: '0.5rem' }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} disabled={validColabs.length === 0}>
          <Printer size={18} />
          Imprimir Todos ({pages.length} páginas)
        </button>
      </div>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;900&display=swap');
        
        .cert-page {
          width: 297mm;
          height: 210mm;
          background-color: white;
          position: relative;
          padding: 0;
          box-sizing: border-box;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.12);
          margin: 0 auto;
          page-break-after: always;
        }
        .cert-inner {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 3rem 4rem;
          box-sizing: border-box;
        }
        .cert-inner-list {
          width: 100%;
          height: 100%;
          padding: 2.5rem 3.5rem;
          box-sizing: border-box;
        }
        
        /* Preview: show only current page */
        .cert-preview-wrapper .cert-page {
          display: none;
        }
        .cert-preview-wrapper .cert-page.active {
          display: block;
        }
        
        /* Print: show all pages */
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          .cert-print-area, .cert-print-area * {
            visibility: visible;
          }
          .cert-print-area {
            position: absolute;
            left: 0;
            top: 0;
          }
          .cert-page {
            display: block !important;
            box-shadow: none !important;
            width: 297mm;
            height: 210mm;
            page-break-after: always;
          }
          .hide-on-print {
            display: none !important;
          }
        }
      `}} />

      {/* Preview Area */}
      {pages.length > 0 && (
        <div className="cert-preview-wrapper" style={{ display: 'flex', justifyContent: 'center', backgroundColor: 'var(--background)', padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          {pages.map((page, i) => {
            const isActive = i === currentPage;
            return (
              <div key={i} className={`cert-page ${isActive ? 'active' : ''}`}>
                {page.type === 'cert_front' && renderCertFront(page.colab).props.children}
                {page.type === 'cert_back' && renderCertBack(page.colab).props.children}
                {page.type === 'list_front' && renderListPage(page.colab, 'lf').props.children}
                {page.type === 'list_back' && renderListPage(page.colab, 'lb').props.children}
              </div>
            );
          })}
        </div>
      )}

      {/* Print Area (hidden, all pages) */}
      <div className="cert-print-area" style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        {pages.map((page, i) => (
          <React.Fragment key={`print-${i}`}>
            {page.type === 'cert_front' && renderCertFront(page.colab)}
            {page.type === 'cert_back' && renderCertBack(page.colab)}
            {page.type === 'list_front' && renderListPage(page.colab, 'lf')}
            {page.type === 'list_back' && renderListPage(page.colab, 'lb')}
          </React.Fragment>
        ))}
      </div>

    </div>
  );
};

export default CertificatesPage;
