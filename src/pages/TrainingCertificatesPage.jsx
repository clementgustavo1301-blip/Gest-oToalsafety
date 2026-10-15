import React, { useState, useRef } from 'react';
import { 
  Award, FileText, Plus, Trash2, Download, Loader, 
  Upload, CheckCircle2, AlertCircle, Users, Sparkles, 
  HelpCircle, ClipboardCopy, RefreshCw, Layers
} from 'lucide-react';
import { generateTrainingPPTX } from '../utils/trainingPptxGenerator';

const TrainingCertificatesPage = () => {
  // Dados do Treinamento
  const [formData, setFormData] = useState({
    curso: 'Treinamento e Capacitação Profissional',
    descricao: 'Certificamos que o participante concluiu com aproveitamento o treinamento com foco nas diretrizes e práticas técnicas estabelecidas.',
    data: new Date().toISOString().split('T')[0],
    duracao: '8 horas',
    local: 'Mossoró - RN',
    empresa: 'TotalSafety',
    instrutorNome: 'Adeylton da Silva Araújo',
    instrutorCargo: 'Instrutor e Responsável Técnico',
    instrutorRegistro: 'SRTE N° 0009823/RN',
    conteudo: '1. Introdução e Contextualização Geral\n2. Normas, Procedimentos e Diretrizes Aplicáveis\n3. Metodologias e Execução Prática\n4. Avaliação e Verificação de Aprendizagem'
  });

  // Lista de Alunos / Participantes
  const [colaboradores, setColaboradores] = useState([
    { nome: '', cpf: '' }
  ]);

  // Arquivo de Template customizado
  const [customTemplateFile, setCustomTemplateFile] = useState(null);
  const [customTemplateBuffer, setCustomTemplateBuffer] = useState(null);
  const fileInputRef = useRef(null);

  // Estados de Operação
  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Atualização dos campos do formulário
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Gerenciamento de Alunos
  const handleColabChange = (index, field, value) => {
    setColaboradores(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addColaborador = () => {
    setColaboradores(prev => [...prev, { nome: '', cpf: '' }]);
  };

  const removeColaborador = (index) => {
    if (colaboradores.length <= 1) {
      setColaboradores([{ nome: '', cpf: '' }]);
      return;
    }
    setColaboradores(prev => prev.filter((_, i) => i !== index));
  };

  // Upload do arquivo template pelo usuário
  const handleTemplateUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pptx')) {
      alert('Por favor, selecione um arquivo de modelo PowerPoint (.pptx).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCustomTemplateBuffer(event.target.result);
      setCustomTemplateFile(file);
      setFeedback({ type: 'success', text: `Modelo carregado: ${file.name}` });
      setTimeout(() => setFeedback(null), 4000);
    };
    reader.readAsArrayBuffer(file);
  };

  const removeCustomTemplate = () => {
    setCustomTemplateFile(null);
    setCustomTemplateBuffer(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFeedback({ type: 'info', text: 'Usando modelo padrão do sistema.' });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Importação em lote a partir de texto
  const handleProcessBatch = () => {
    if (!batchText.trim()) return;

    const lines = batchText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = [];

    for (const line of lines) {
      // Regex para identificar CPF comum na linha
      const cpfMatch = line.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{11}/);
      let cpf = '';
      let nome = line;

      if (cpfMatch) {
        cpf = cpfMatch[0];
        nome = line.replace(cpf, '').replace(/[-–—,;|]/g, ' ').trim();
      } else {
        // Separa por hífen ou vírgula se houver
        const parts = line.split(/[-–—,;|]/);
        if (parts.length > 1) {
          nome = parts[0].trim();
          cpf = parts[1].trim();
        }
      }

      if (nome) {
        parsed.push({ nome, cpf });
      }
    }

    if (parsed.length > 0) {
      setColaboradores(parsed);
      setShowBatchModal(false);
      setBatchText('');
      setFeedback({ type: 'success', text: `${parsed.length} participantes importados com sucesso!` });
      setTimeout(() => setFeedback(null), 4000);
    } else {
      alert('Não foi possível identificar nomes na lista informada. Verifique o texto e tente novamente.');
    }
  };

  // Geração e Download dos Certificados
  const handleGenerate = async () => {
    const validColaboradores = colaboradores.filter(c => c.nome.trim());
    if (validColaboradores.length === 0) {
      alert('Informe ao menos um participante com nome para gerar os certificados.');
      return;
    }

    if (!formData.curso.trim()) {
      alert('Informe o Nome do Treinamento/Curso.');
      return;
    }

    setGenerating(true);
    try {
      const blob = await generateTrainingPPTX({
        templateBuffer: customTemplateBuffer,
        curso: formData.curso,
        descricao: formData.descricao,
        data: formData.data,
        duracao: formData.duracao,
        local: formData.local,
        empresa: formData.empresa,
        instrutorNome: formData.instrutorNome,
        instrutorCargo: formData.instrutorCargo,
        instrutorRegistro: formData.instrutorRegistro,
        conteudo: formData.conteudo,
        colaboradores: validColaboradores
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeCourse = formData.curso.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
      a.download = `Certificados_Treinamento_${safeCourse}_${validColaboradores.length}alunos.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setFeedback({ 
        type: 'success', 
        text: `Arquivo PPTX com ${validColaboradores.length} certificado(s) gerado e baixado com sucesso!` 
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      console.error('Erro ao gerar certificados de treinamento:', err);
      alert('Erro ao gerar certificados: ' + (err.message || 'Verifique o modelo e tente novamente.'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '1rem', 
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            backgroundColor: '#0284c7', 
            color: '#fff', 
            padding: '0.625rem', 
            borderRadius: 'var(--radius-md)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Award size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.375rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                Gerador de Certificados de Treinamento
              </h1>
              <span style={{ 
                backgroundColor: 'rgba(2, 132, 199, 0.12)', 
                color: '#0284c7', 
                fontSize: '0.6875rem', 
                fontWeight: '700', 
                padding: '0.2rem 0.5rem', 
                borderRadius: '1rem', 
                textTransform: 'uppercase' 
              }}>
                Setor de Treinamento
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Emissão e personalização de certificados específicos para cursos, capacitações e demandas de treinamento.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowHelpModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
          >
            <HelpCircle size={15} />
            Como Funciona o Modelo
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          marginBottom: '1.25rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: feedback.type === 'success' ? '#f0fdf4' : '#eff6ff',
          border: feedback.type === 'success' ? '1px solid #bbf7d0' : '1px solid #bfdbfe',
          color: feedback.type === 'success' ? '#166534' : '#1e40af',
          fontSize: '0.875rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Template Card: Modelo de Certificado */}
      <div style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} style={{ color: '#0284c7' }} />
              <h2 style={{ fontSize: '0.9375rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                Arquivo de Modelo (.pptx)
              </h2>
              {customTemplateFile ? (
                <span style={{ 
                  backgroundColor: '#dcfce7', 
                  color: '#15803d', 
                  fontSize: '0.6875rem', 
                  fontWeight: '600', 
                  padding: '0.15rem 0.5rem', 
                  borderRadius: '1rem' 
                }}>
                  Personalizado Ativo
                </span>
              ) : (
                <span style={{ 
                  backgroundColor: '#f1f5f9', 
                  color: '#475569', 
                  fontSize: '0.6875rem', 
                  fontWeight: '600', 
                  padding: '0.15rem 0.5rem', 
                  borderRadius: '1rem' 
                }}>
                  Modelo do Sistema
                </span>
              )}
            </div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              {customTemplateFile 
                ? `Usando o arquivo carregado: "${customTemplateFile.name}" (${(customTemplateFile.size / 1024).toFixed(1)} KB)`
                : 'Você pode selecionar ou arrastar o seu novo arquivo PowerPoint (.pptx) ou salvar como "template-treinamento.pptx" no projeto.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              type="file" 
              ref={fileInputRef} 
              accept=".pptx" 
              onChange={handleTemplateUpload} 
              style={{ display: 'none' }} 
            />

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
            >
              <Upload size={14} />
              {customTemplateFile ? 'Trocar Arquivo Modelo' : 'Carregar Modelo (.pptx)'}
            </button>

            {customTemplateFile && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={removeCustomTemplate}
                title="Voltar para o modelo padrão"
                style={{ fontSize: '0.8125rem', color: 'var(--danger)' }}
              >
                Remover
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Card: Dados do Treinamento */}
        <div style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={16} style={{ color: '#0284c7' }} />
            Informações do Curso / Treinamento
          </h2>

          <div>
            <label className="modal-label" style={{ fontWeight: '600', fontSize: '0.8125rem' }}>
              Nome do Treinamento / Curso *
            </label>
            <input
              type="text"
              name="curso"
              className="input"
              value={formData.curso}
              onChange={handleChange}
              placeholder="Ex: NR-35 Trabalho em Altura / Brigada de Incêndio"
              style={{ width: '100%', marginTop: '0.25rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="modal-label" style={{ fontWeight: '600', fontSize: '0.8125rem' }}>
                Carga Horária *
              </label>
              <input
                type="text"
                name="duracao"
                className="input"
                value={formData.duracao}
                onChange={handleChange}
                placeholder="Ex: 8 horas, 16 horas"
                style={{ width: '100%', marginTop: '0.25rem' }}
              />
            </div>
            <div>
              <label className="modal-label" style={{ fontWeight: '600', fontSize: '0.8125rem' }}>
                Data de Conclusão *
              </label>
              <input
                type="date"
                name="data"
                className="input"
                value={formData.data}
                onChange={handleChange}
                style={{ width: '100%', marginTop: '0.25rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="modal-label" style={{ fontWeight: '600', fontSize: '0.8125rem' }}>
                Local / Cidade
              </label>
              <input
                type="text"
                name="local"
                className="input"
                value={formData.local}
                onChange={handleChange}
                placeholder="Ex: Mossoró - RN"
                style={{ width: '100%', marginTop: '0.25rem' }}
              />
            </div>
            <div>
              <label className="modal-label" style={{ fontWeight: '600', fontSize: '0.8125rem' }}>
                Empresa Solicitante
              </label>
              <input
                type="text"
                name="empresa"
                className="input"
                value={formData.empresa}
                onChange={handleChange}
                placeholder="Ex: Nome da Empresa / TotalSafety"
                style={{ width: '100%', marginTop: '0.25rem' }}
              />
            </div>
          </div>

          <div>
            <label className="modal-label" style={{ fontWeight: '600', fontSize: '0.8125rem' }}>
              Texto / Descrição do Certificado
            </label>
            <textarea
              name="descricao"
              className="input"
              rows={3}
              value={formData.descricao}
              onChange={handleChange}
              placeholder="Texto impresso no corpo do certificado..."
              style={{ width: '100%', marginTop: '0.25rem', fontSize: '0.8125rem' }}
            />
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
              Dados do Instrutor
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div>
                <label className="modal-label" style={{ fontSize: '0.75rem' }}>Nome do Instrutor</label>
                <input
                  type="text"
                  name="instrutorNome"
                  className="input"
                  value={formData.instrutorNome}
                  onChange={handleChange}
                  placeholder="Nome do Instrutor"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="modal-label" style={{ fontSize: '0.75rem' }}>Cargo / Qualificação</label>
                <input
                  type="text"
                  name="instrutorCargo"
                  className="input"
                  value={formData.instrutorCargo}
                  onChange={handleChange}
                  placeholder="Ex: Engenheiro de Segurança"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <label className="modal-label" style={{ fontSize: '0.75rem' }}>Registro Profissional / Conselho</label>
              <input
                type="text"
                name="instrutorRegistro"
                className="input"
                value={formData.instrutorRegistro}
                onChange={handleChange}
                placeholder="Ex: CREA / SRTE"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label className="modal-label" style={{ fontWeight: '600', fontSize: '0.8125rem' }}>
              Conteúdo Programático (Verso ou Lista)
            </label>
            <textarea
              name="conteudo"
              className="input"
              rows={3}
              value={formData.conteudo}
              onChange={handleChange}
              placeholder="Tópicos abordados no treinamento..."
              style={{ width: '100%', marginTop: '0.25rem', fontSize: '0.8125rem' }}
            />
          </div>
        </div>

        {/* Card: Participantes / Alunos */}
        <div style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={16} style={{ color: '#0284c7' }} />
              <h2 style={{ fontSize: '0.9375rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                Lista de Participantes ({colaboradores.filter(c => c.nome.trim()).length})
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowBatchModal(true)}
                style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.65rem' }}
              >
                <ClipboardCopy size={13} />
                Colar Lista em Lote
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={addColaborador}
                style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.65rem' }}
              >
                <Plus size={13} />
                Adicionar
              </button>
            </div>
          </div>

          <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Cada participante terá um certificado gerado automaticamente no arquivo PowerPoint.
          </p>

          <div style={{ 
            flex: 1, 
            maxHeight: '440px', 
            overflowY: 'auto', 
            paddingRight: '0.25rem',
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.5rem' 
          }}>
            {colaboradores.map((colab, idx) => (
              <div 
                key={idx}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  padding: '0.5rem',
                  backgroundColor: 'rgba(0,0,0,0.02)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)'
                }}
              >
                <span style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  backgroundColor: '#e2e8f0', 
                  color: '#475569', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '0.6875rem', 
                  fontWeight: '700',
                  flexShrink: 0
                }}>
                  {idx + 1}
                </span>

                <input
                  type="text"
                  className="input"
                  placeholder="Nome do Aluno / Participante"
                  value={colab.nome}
                  onChange={(e) => handleColabChange(idx, 'nome', e.target.value)}
                  style={{ flex: 1.5, fontSize: '0.8125rem' }}
                />

                <input
                  type="text"
                  className="input"
                  placeholder="CPF (000.000.000-00)"
                  value={colab.cpf}
                  onChange={(e) => handleColabChange(idx, 'cpf', e.target.value)}
                  style={{ flex: 1, fontSize: '0.8125rem' }}
                />

                <button
                  type="button"
                  onClick={() => removeColaborador(idx)}
                  title="Remover participante"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={addColaborador}
              style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
            >
              <Plus size={14} />
              Adicionar Outro Participante
            </button>

            {colaboradores.length > 1 && (
              <button
                type="button"
                onClick={() => setColaboradores([{ nome: '', cpf: '' }])}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Limpar Todos
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Botão de Geração */}
      <div style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Pronto para gerar?
          </h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Serão gerados {colaboradores.filter(c => c.nome.trim()).length || 0} certificado(s) formatados no PowerPoint (.pptx).
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={generating}
          style={{
            backgroundColor: '#0284c7',
            padding: '0.75rem 1.75rem',
            fontSize: '0.9375rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
            cursor: generating ? 'not-allowed' : 'pointer'
          }}
        >
          {generating ? (
            <>
              <Loader size={18} className="animate-spin" />
              Gerando Certificados...
            </>
          ) : (
            <>
              <Download size={18} />
              Gerar e Baixar Certificados (.pptx)
            </>
          )}
        </button>
      </div>

      {/* Modal: Importar em Lote */}
      {showBatchModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '540px', width: '90%', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              Importar Participantes em Lote
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Cole abaixo uma lista de alunos com Nome e CPF (um por linha). Exemplo:<br />
              <code>João da Silva - 123.456.789-00</code><br />
              <code>Maria Santos, 98765432100</code>
            </p>

            <textarea
              className="input"
              rows={8}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder="Cole sua lista de participantes aqui..."
              style={{ width: '100%', marginBottom: '1rem', fontSize: '0.8125rem', fontFamily: 'monospace' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setShowBatchModal(false); setBatchText(''); }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleProcessBatch}
                style={{ backgroundColor: '#0284c7' }}
              >
                Importar Lista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Como Funciona o Modelo */}
      {showHelpModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '600px', width: '92%', padding: '1.75rem', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HelpCircle size={20} style={{ color: '#0284c7' }} />
              Como Funciona o Modelo do Certificado
            </h3>

            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p>
                O gerador de certificados do setor de Treinamento substitui automaticamente os campos no arquivo PowerPoint (.pptx).
              </p>
              
              <div style={{ backgroundColor: 'rgba(0,0,0,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Tags suportadas no seu modelo PowerPoint:</strong>
                <ul style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
                  <li><code>{`{{NOME_ALUNO}}`}</code> ou <code>{`[NOME]`}</code>: Nome do participante</li>
                  <li><code>{`{{CPF}}`}</code>: CPF formatado do aluno</li>
                  <li><code>{`{{CURSO}}`}</code>: Nome do treinamento ou capacitação</li>
                  <li><code>{`{{CARGA_HORARIA}}`}</code>: Carga horária informada</li>
                  <li><code>{`{{DATA}}`}</code>: Data de conclusão</li>
                  <li><code>{`{{LOCAL}}`}</code>: Cidade ou local</li>
                  <li><code>{`{{EMPRESA}}`}</code>: Razão social da empresa</li>
                  <li><code>{`{{INSTRUTOR}}`}</code>: Nome do ministrante</li>
                  <li><code>{`{{CONTEUDO}}`}</code>: Conteúdo programático</li>
                </ul>
              </div>

              <p>
                <strong>Dica:</strong> Você pode clicar no botão <strong>"Carregar Modelo (.pptx)"</strong> acima para usar seu arquivo diretamente, ou copiar o arquivo para a pasta <code>public/template-treinamento.pptx</code> do sistema.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowHelpModal(false)}
                style={{ backgroundColor: '#0284c7' }}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingCertificatesPage;
