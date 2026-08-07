import React, { useState, useRef } from 'react';
import { Award, Printer, Download } from 'lucide-react';
import TopBar from '../components/TopBar';

const CertificatesPage = () => {
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    data: '',
    local: '',
    empresa: '',
    nr: '',
    duracao: '1 hora',
    instrutorNome: 'Adeylton da Silva Araújo',
    instrutorRegistro: 'Técnico em Seg. do Trabalho - SRTE N° 0009823/RN',
    conteudo: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePrint = () => {
    window.print();
  };

  const nrs = [
    'NR-01 - Disposições Gerais',
    'NR-05 - CIPA',
    'NR-06 - EPI',
    'NR-10 - Segurança em Instalações e Serviços em Eletricidade',
    'NR-11 - Transporte, Movimentação, Armazenagem e Manuseio de Materiais',
    'NR-12 - Segurança no Trabalho em Máquinas e Equipamentos',
    'NR-18 - Condições e Meio Ambiente de Trabalho na Indústria da Construção',
    'NR-20 - Segurança e Saúde no Trabalho com Inflamáveis e Combustíveis',
    'NR-33 - Segurança e Saúde nos Trabalhos em Espaços Confinados',
    'NR-35 - Trabalho em Altura',
    'Outro'
  ];

  return (
    <div className="page-container">
      <div className="hide-on-print">
        <TopBar title="Gerador de Certificados SST" />
      </div>

      <div className="content-area" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Form Controls - Hidden on Print */}
        <div className="card hide-on-print" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Award size={24} className="text-primary" />
            Dados do Certificado
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label className="modal-label">Nome do Colaborador</label>
              <input type="text" name="nome" value={formData.nome} onChange={handleChange} className="modal-input" placeholder="Ex: João da Silva" />
            </div>
            <div>
              <label className="modal-label">CPF</label>
              <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} className="modal-input" placeholder="000.000.000-00" />
            </div>
            <div>
              <label className="modal-label">Empresa</label>
              <input type="text" name="empresa" value={formData.empresa} onChange={handleChange} className="modal-input" placeholder="Razão Social da Empresa" />
            </div>
            <div>
              <label className="modal-label">Data do Treinamento</label>
              <input type="date" name="data" value={formData.data} onChange={handleChange} className="modal-input" />
            </div>
            <div>
              <label className="modal-label">Local do Treinamento</label>
              <input type="text" name="local" value={formData.local} onChange={handleChange} className="modal-input" placeholder="Ex: Canteiro de Obras" />
            </div>
            <div>
              <label className="modal-label">Treinamento (NR e Descrição)</label>
              <input type="text" name="nr" value={formData.nr} onChange={handleChange} className="modal-input" placeholder="Ex: NR 06 - Uso e guarda de EPI" />
            </div>
            <div>
              <label className="modal-label">Carga Horária</label>
              <input type="text" name="duracao" value={formData.duracao} onChange={handleChange} className="modal-input" placeholder="Ex: 1 hora" />
            </div>
            <div>
              <label className="modal-label">Nome do Instrutor</label>
              <input type="text" name="instrutorNome" value={formData.instrutorNome} onChange={handleChange} className="modal-input" placeholder="Nome do Instrutor" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="modal-label">Cargo / Registro do Instrutor</label>
              <input type="text" name="instrutorRegistro" value={formData.instrutorRegistro} onChange={handleChange} className="modal-input" placeholder="Ex: Técnico em Segurança do Trabalho - SRTE N°..." />
            </div>
          </div>

          <div>
            <label className="modal-label">Conteúdo Programático</label>
            <textarea 
              name="conteudo" 
              value={formData.conteudo} 
              onChange={handleChange} 
              className="modal-input" 
              rows="4"
              placeholder="Descreva o conteúdo programático aqui..."
            ></textarea>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Printer size={18} />
              Imprimir / Salvar PDF
            </button>
          </div>
        </div>

        {/* Certificate Preview - This is what gets printed */}
        <div className="certificate-preview-container">
          <style dangerouslySetInnerHTML={{__html: `
            .certificate-preview-container {
              display: flex;
              justify-content: center;
              background-color: var(--background);
              padding: 2rem;
              border-radius: var(--radius-lg);
            }
            .certificate-body {
              width: 297mm;
              height: 210mm;
              background-color: white;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
              position: relative;
              padding: 2rem;
              box-sizing: border-box;
              font-family: 'Times New Roman', serif;
              color: #333;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .certificate-border {
              position: absolute;
              top: 15mm;
              bottom: 15mm;
              left: 15mm;
              right: 15mm;
              border: 5px solid #1a365d;
              outline: 2px solid #1a365d;
              outline-offset: -10px;
            }
            @media print {
              @page {
                size: A4 landscape;
                margin: 0;
              }
              body * {
                visibility: hidden;
              }
              .certificate-body, .certificate-body * {
                visibility: visible;
              }
              .certificate-body {
                position: absolute;
                left: 0;
                top: 0;
                width: 297mm;
                height: 210mm;
                box-shadow: none;
                margin: 0;
                padding: 0;
              }
            }
          `}} />
          
          <div className="certificate-body">
            <div className="certificate-border"></div>
            
            <div style={{ zIndex: 1, textAlign: 'center', maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Logo placeholder - replace with actual logo if needed */}
              <div style={{ marginBottom: '1rem' }}>
                <img src="/logo-totalsafety.png" alt="TotalSafety Logo" style={{ height: '80px', objectFit: 'contain' }} />
              </div>

              <h1 style={{ fontSize: '3.5rem', color: '#1a365d', margin: '0', textTransform: 'uppercase', letterSpacing: '4px' }}>
                CERTIFICADO
              </h1>
              
              <p style={{ fontSize: '1.5rem', margin: '1rem 0', fontStyle: 'italic' }}>
                Certificamos para os devidos fins que
              </p>
              
              <h2 style={{ fontSize: '2.5rem', margin: '0', borderBottom: '2px solid #ccc', paddingBottom: '0.5rem', textTransform: 'uppercase' }}>
                {formData.nome || 'NOME DO COLABORADOR'}
              </h2>
              
              <p style={{ fontSize: '1.25rem', margin: '0.5rem 0' }}>
                Portador(a) do CPF: <strong>{formData.cpf || '000.000.000-00'}</strong>
              </p>
              
              <div style={{ fontSize: '1.25rem', lineHeight: '1.8', marginTop: '1rem' }}>
                Participou com êxito do treinamento de <strong>{formData.nr || 'NR Específica'}</strong>,<br/>
                com carga horária de <strong>{formData.duracao || 'X horas'}</strong>, realizado na empresa <strong>{formData.empresa || 'Nome da Empresa'}</strong>,<br/>
                na data de <strong>{formData.data ? new Date(formData.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'DD/MM/AAAA'}</strong>, 
                no local: <strong>{formData.local || 'Localidade'}</strong>.
              </div>

              <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-around', width: '100%', gap: '4rem' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #333', marginBottom: '0.5rem', height: '2rem' }}></div>
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>{formData.instrutorNome || 'Instrutor Responsável'}</p>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>{formData.instrutorRegistro || 'TotalSafety'}</p>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #333', marginBottom: '0.5rem', height: '2rem' }}></div>
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>Diretoria</p>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>TotalSafety</p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Verso do Certificado - Conteúdo Programático */}
        <div className="certificate-preview-container" style={{ marginTop: '2rem' }}>
          <div className="certificate-body">
            <div className="certificate-border"></div>
            
            <div style={{ zIndex: 1, textAlign: 'left', maxWidth: '85%', width: '100%', height: '100%', padding: '3rem 0', display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: '2rem', color: '#1a365d', marginBottom: '2rem', textAlign: 'center', textTransform: 'uppercase' }}>
                Conteúdo Programático
              </h2>
              
              <div style={{ 
                fontSize: '1.2rem', 
                lineHeight: '1.8', 
                whiteSpace: 'pre-wrap', 
                flex: 1,
                textAlign: 'justify'
              }}>
                {formData.conteudo || 'O conteúdo programático será impresso aqui.'}
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default CertificatesPage;
