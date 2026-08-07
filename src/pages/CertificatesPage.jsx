import React, { useState } from 'react';
import { Award, Printer, FileText, Plus, Trash2, Download, Loader } from 'lucide-react';
import { generateCertificatePPTX } from '../utils/pptxGenerator';

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

  const [generating, setGenerating] = useState(false);

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

  const nrOptions = [
    { value: 'NR - 01', label: 'NR-01 - Disposições Gerais' },
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
    'NR - 05': '1. Riscos do ambiente e condições de trabalho / acidentes e doenças ocupacionais / medidas de prevenção / metodologia de análise de acidentes e doenças / higiene do trabalho\n2. Noções de legislações trabalhista e previdenciária de SST / inclusão de pessoas com deficiência e reabilitados\n3. Organização e funcionamento da CIPA\n4. Prevenção e combate ao assédio sexual e a outras formas de violência no trabalho',
    'NR - 06': '1. O que é EPI\n2. Responsabilidades do empregador, trabalhador e fornecedor\n3. Riscos ambientais / Tipos de EPIs\n4. Ficha de controle / Uso correto\n5. Higienização e manutenção',
    'NR - 10': 'a) introdução à segurança com eletricidade;\nb) riscos em instalações e serviços com eletricidade;\nc) técnicas de análise de risco;\nd) medidas de controle do risco elétrico;\ne) equipamentos de proteção coletiva e individual;\nf) rotinas de trabalho e procedimentos.',
    'NR - 11': 'a) tipos de equipamentos de transporte;\nb) procedimentos de segurança na movimentação de materiais;\nc) operação segura de equipamentos;\nd) sinalização;\ne) manutenção preventiva.',
    'NR - 12': '1. Riscos e proteções\n2. Funcionamento das proteções\n3. Como e em que circunstâncias uma proteção pode ser removida, e por quem\n4. O que fazer se uma proteção foi danificada ou perdeu sua função\n5. Princípios de segurança\n6. Segurança para riscos mecânicos, elétricos e outros relevantes\n7. Método de trabalho seguro\n8. Permissão de trabalho\n9. Sistema de bloqueio',
    'NR - 18': '1. Condições e meio ambiente de trabalho / riscos inerentes às atividades desenvolvidas\n2. Equipamentos e proteção coletiva existentes\n3. Uso adequado dos EPI / PGR da obra',
    'NR - 20': 'a) inflamáveis: características e propriedades;\nb) controle coletivo e individual;\nc) fontes de ignição e seu controle;\nd) proteção contra incêndio;\ne) procedimentos em situações de emergência.',
    'NR - 33': 'a) definição de espaço confinado;\nb) reconhecimento, avaliação e controle de riscos;\nc) funcionamento de equipamentos de medição;\nd) procedimentos e utilização da PET;\ne) noções de resgate e primeiros socorros.',
    'NR - 35': 'a) normas e regulamentos aplicáveis;\nb) análise de risco e condições impeditivas;\nc) riscos potenciais inerentes e medidas de prevenção;\nd) sistemas, equipamentos e procedimentos de proteção coletiva;\ne) EPI – seleção, inspeção, conservação e limitação de uso;\nf) acidentes típicos em trabalhos em altura.',
  };

  const descricoes = {
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

  const duracoes = {
    'NR - 01': 'A critério da empresa',
    'NR - 05': '8 horas (GR 1) / 12 horas (GR 2) / 16 horas (GR 3) / 20 horas (GR 4)',
    'NR - 06': 'A critério da empresa',
    'NR - 10': '40 horas',
    'NR - 11': 'A critério da empresa',
    'NR - 12': 'A critério da empresa (8h para injetoras)',
    'NR - 18': '4 horas',
    'NR - 20': '4 a 32 horas (depende da classe da instalação)',
    'NR - 33': '16 horas',
    'NR - 35': '8 horas',
  };

  const handleNrChange = (e) => {
    const nr = e.target.value;
    setFormData(prev => ({
      ...prev,
      nr,
      descricao: descricoes[nr] || prev.descricao,
      conteudo: conteudoSugestoes[nr] || prev.conteudo,
      duracao: duracoes[nr] || prev.duracao
    }));
  };

  const handleGenerate = async () => {
    const validColabs = colaboradores.filter(c => c.nome.trim());
    if (validColabs.length === 0) {
      alert('Adicione pelo menos um colaborador com nome preenchido.');
      return;
    }
    if (!formData.data) {
      alert('Preencha a data do treinamento.');
      return;
    }

    setGenerating(true);
    try {
      const blob = await generateCertificatePPTX({
        ...formData,
        colaboradores: validColabs
      });
      
      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificados_${formData.nr.replace(/\s/g, '')}_${formData.empresa || 'Empresa'}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao gerar certificados:', err);
      alert('Erro ao gerar o arquivo: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const validCount = colaboradores.filter(c => c.nome.trim()).length;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FileText size={28} color="var(--primary)" />
          Gerador de Certificados SST
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Gera o arquivo PPTX timbrado com logo e layout padrão TotalSafety. Para cada colaborador são geradas 4 páginas (certificado frente/verso + lista de presença frente/verso).
        </p>
      </div>

      {/* Dados do Treinamento */}
      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
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
            <label className="modal-label">Data do Treinamento <span style={{color:'var(--error)'}}>*</span></label>
            <input type="date" name="data" value={formData.data} onChange={handleChange} className="modal-input" />
          </div>
          <div>
            <label className="modal-label">Local <span style={{color:'var(--error)'}}>*</span></label>
            <input type="text" name="local" value={formData.local} onChange={handleChange} className="modal-input" placeholder="Ex: Canteiro De Obras" />
          </div>
          <div>
            <label className="modal-label">Empresa <span style={{color:'var(--error)'}}>*</span></label>
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

        <div style={{ marginBottom: '1.25rem' }}>
          <label className="modal-label">Descrição do Treinamento (texto do certificado)</label>
          <input type="text" name="descricao" value={formData.descricao} onChange={handleChange} className="modal-input" />
        </div>

        <div>
          <label className="modal-label">Conteúdo Programático</label>
          <textarea name="conteudo" value={formData.conteudo} onChange={handleChange} className="modal-input" rows="5" style={{ resize: 'vertical' }}></textarea>
        </div>
      </div>

      {/* Lista de Colaboradores */}
      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
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

      {/* Botão de Gerar */}
      <div className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {validCount > 0 ? (
            <span>✅ <strong>{validCount}</strong> colaborador(es) → <strong>{validCount * 4}</strong> páginas serão geradas no PPTX timbrado</span>
          ) : (
            <span>⚠️ Preencha ao menos um colaborador para gerar</span>
          )}
        </div>
        <button 
          onClick={handleGenerate} 
          className="btn btn-primary" 
          disabled={generating || validCount === 0 || !formData.data}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', padding: '0.75rem 2rem' }}
        >
          {generating ? (
            <><Loader size={18} className="spin" /> Gerando...</>
          ) : (
            <><Download size={18} /> Baixar PPTX</>
          )}
        </button>
      </div>

    </div>
  );
};

export default CertificatesPage;
