import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, FileText, Plus, Trash2, Download, Loader, 
  Upload, CheckCircle2, AlertCircle, Users, Sparkles, 
  HelpCircle, ClipboardCopy, RefreshCw, Layers, Link as LinkIcon,
  Copy, Check, ExternalLink, Calendar, Search, Filter,
  Edit, Key, ShieldCheck, ChevronRight, UserCheck, X
} from 'lucide-react';
import { generateTrainingPPTX } from '../utils/trainingPptxGenerator';
import { formatCpf } from '../services/cpfService';
import { 
  getTrainingClasses, saveTrainingClass, deleteTrainingClass,
  getTrainingEnrollments, updateStudent, deleteStudent, subscribeToEnrollments 
} from '../services/trainingClassesService';

const DEFAULT_API_TOKEN = '5ae973d7a997af13f0aaf2bf60e65803';

const TrainingCertificatesPage = () => {
  // Controle de Abas: 'turmas' | 'generator'
  const [activeTab, setActiveTab] = useState('turmas');

  // Estados das Turmas e Inscrições
  const [turmas, setTurmas] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modais de Gestão
  const [showTurmaModal, setShowTurmaModal] = useState(false);
  const [editingTurma, setEditingTurma] = useState(null);
  const [turmaFormData, setTurmaFormData] = useState({
    name: '',
    course_name: '',
    duration: '8 horas',
    start_date: new Date().toISOString().split('T')[0],
    location: 'Mossoró - RN',
    company: 'TotalSafety',
    instructor_name: 'Adeylton da Silva Araújo',
    instructor_role: 'Instrutor e Responsável Técnico',
    instructor_registration: 'SRTE N° 0009823/RN',
    content: '1. Introdução e Contextualização Geral\n2. Normas, Procedimentos e Diretrizes Aplicáveis\n3. Metodologias e Execução Prática\n4. Avaliação e Verificação de Aprendizagem',
    status: 'Aberta'
  });

  // Modal de Configuração do Token de Testes da API
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [apiToken, setApiToken] = useState(() => {
    return localStorage.getItem('cpfcnpj_api_token') || DEFAULT_API_TOKEN;
  });

  // Feedback de Cópia
  const [copiedKey, setCopiedKey] = useState(null);

  // ----------------------------------------------------
  // Estados do Gerador de Certificados (PPTX)
  // ----------------------------------------------------
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

  const [colaboradores, setColaboradores] = useState([
    { nome: '', cpf: '' }
  ]);

  const [customTemplateFile, setCustomTemplateFile] = useState(null);
  const [customTemplateBuffer, setCustomTemplateBuffer] = useState(null);
  const fileInputRef = useRef(null);

  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);

  // ----------------------------------------------------
  // Carregamento de Dados (Turmas e Inscrições)
  // ----------------------------------------------------
  const loadData = async () => {
    setLoadingData(true);
    try {
      const [classList, studentList] = await Promise.all([
        getTrainingClasses(),
        getTrainingEnrollments()
      ]);
      setTurmas(classList || []);
      setEnrollments(studentList || []);
    } catch (e) {
      console.error('Erro ao carregar turmas e inscrições:', e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();

    // Assina atualizações em tempo real das inscrições
    const unsubscribe = subscribeToEnrollments((newStudent) => {
      setEnrollments(prev => {
        if (prev.some(s => s.id === newStudent.id)) return prev;
        return [newStudent, ...prev];
      });
      setFeedback({ 
        type: 'info', 
        text: `Nova inscrição recebida: ${newStudent.nome} (${newStudent.cpf})` 
      });
      setTimeout(() => setFeedback(null), 5000);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // ----------------------------------------------------
  // Ações de Turmas
  // ----------------------------------------------------
  const handleOpenNewTurma = () => {
    setEditingTurma(null);
    setTurmaFormData({
      name: '',
      course_name: '',
      duration: '8 horas',
      start_date: new Date().toISOString().split('T')[0],
      location: 'Mossoró - RN',
      company: 'TotalSafety',
      instructor_name: 'Adeylton da Silva Araújo',
      instructor_role: 'Instrutor e Responsável Técnico',
      instructor_registration: 'SRTE N° 0009823/RN',
      content: '1. Introdução e Contextualização Geral\n2. Normas, Procedimentos e Diretrizes Aplicáveis\n3. Metodologias e Execução Prática\n4. Avaliação e Verificação de Aprendizagem',
      status: 'Aberta'
    });
    setShowTurmaModal(true);
  };

  const handleEditTurma = (turma) => {
    setEditingTurma(turma);
    setTurmaFormData({
      name: turma.name || '',
      course_name: turma.course_name || '',
      duration: turma.duration || '8 horas',
      start_date: turma.start_date || new Date().toISOString().split('T')[0],
      location: turma.location || 'Mossoró - RN',
      company: turma.company || '',
      instructor_name: turma.instructor_name || 'Adeylton da Silva Araújo',
      instructor_role: turma.instructor_role || 'Instrutor e Responsável Técnico',
      instructor_registration: turma.instructor_registration || 'SRTE N° 0009823/RN',
      content: turma.content || '',
      status: turma.status || 'Aberta'
    });
    setShowTurmaModal(true);
  };

  const handleSaveTurma = async (e) => {
    e.preventDefault();
    if (!turmaFormData.name.trim()) {
      alert('Por favor, informe a identificação da Turma.');
      return;
    }

    try {
      await saveTrainingClass({
        id: editingTurma ? editingTurma.id : null,
        ...turmaFormData
      });
      setShowTurmaModal(false);
      loadData();
      setFeedback({ 
        type: 'success', 
        text: editingTurma ? 'Turma atualizada com sucesso!' : 'Turma criada com sucesso!' 
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar turma.');
    }
  };

  const handleDeleteTurma = async (id, name) => {
    if (!window.confirm(`Deseja realmente excluir a turma "${name}"? Os inscritos ficarão como sem turma.`)) {
      return;
    }
    await deleteTrainingClass(id);
    loadData();
  };

  // Copia o link público da turma ou link geral
  const copyPublicLink = (turmaId = null, key = 'general') => {
    const origin = window.location.origin;
    const url = turmaId ? `${origin}/inscricao?turma=${turmaId}` : `${origin}/inscricao`;
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Carrega alunos de uma turma direto no gerador de certificados
  const handleLoadTurmaIntoGenerator = (turma) => {
    const studentsInTurma = enrollments.filter(e => e.turma_id === turma.id);

    if (studentsInTurma.length === 0) {
      if (!window.confirm(`A turma "${turma.name}" não possui participantes inscritos ainda. Deseja carregar as configurações do curso no gerador mesmo assim?`)) {
        return;
      }
    }

    // Atualiza o formulário do certificado com os dados da turma
    setFormData(prev => ({
      ...prev,
      curso: turma.course_name || turma.name,
      duracao: turma.duration || prev.duracao,
      data: turma.start_date || prev.data,
      local: turma.location || prev.local,
      empresa: turma.company || prev.empresa,
      instrutorNome: turma.instructor_name || prev.instrutorNome,
      instrutorCargo: turma.instructor_role || prev.instrutorCargo,
      instrutorRegistro: turma.instructor_registration || prev.instrutorRegistro,
      conteudo: turma.content || prev.conteudo
    }));

    // Carrega a lista de colaboradores se houver inscritos
    if (studentsInTurma.length > 0) {
      setColaboradores(studentsInTurma.map(s => ({
        nome: s.nome,
        cpf: s.cpf
      })));
      setFeedback({ 
        type: 'success', 
        text: `${studentsInTurma.length} participante(s) da turma "${turma.name}" carregados com sucesso!` 
      });
    } else {
      setFeedback({ 
        type: 'info', 
        text: `Dados da turma "${turma.name}" carregados no formulário!` 
      });
    }

    setActiveTab('generator');
    setTimeout(() => setFeedback(null), 4500);
  };

  // Alteração de turma de um aluno
  const handleStudentTurmaChange = async (studentId, newTurmaId) => {
    await updateStudent(studentId, { turma_id: newTurmaId || null });
    loadData();
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    if (!window.confirm(`Deseja remover ${studentName} da lista de presença?`)) return;
    await deleteStudent(studentId);
    loadData();
  };

  // Salva o Token da API CPF.CNPJ
  const handleSaveApiToken = (e) => {
    e.preventDefault();
    const clean = apiToken.trim();
    if (!clean) return;
    localStorage.setItem('cpfcnpj_api_token', clean);
    setShowTokenModal(false);
    setFeedback({ type: 'success', text: 'Token da API CPF.CNPJ atualizado!' });
    setTimeout(() => setFeedback(null), 3000);
  };

  // ----------------------------------------------------
  // Métodos do Gerador de Certificados
  // ----------------------------------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

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

  const handleTemplateUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pptx')) {
      alert('Por favor, selecione um arquivo PowerPoint (.pptx).');
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

  const handleProcessBatch = () => {
    if (!batchText.trim()) return;

    const lines = batchText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = [];

    for (const line of lines) {
      const cpfMatch = line.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{11}/);
      let cpf = '';
      let nome = line;

      if (cpfMatch) {
        cpf = cpfMatch[0];
        nome = line.replace(cpf, '').replace(/[-–—,;|]/g, ' ').trim();
      } else {
        const parts = line.split(/[-–—,;|]/);
        if (parts.length > 1) {
          nome = parts[0].trim();
          cpf = parts[1].trim();
        }
      }

      if (nome) {
        parsed.push({ nome, cpf: formatCpf(cpf) });
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
      a.download = `Certificados_${safeCourse}_${validColaboradores.length}alunos.pptx`;
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
      console.error('Erro ao gerar certificados:', err);
      alert('Erro ao gerar apresentação PPTX: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Filtro de Inscrições
  const filteredEnrollments = enrollments.filter(e => {
    const matchTurma = selectedTurmaFilter === 'all' 
      ? true 
      : selectedTurmaFilter === 'unassigned' 
        ? !e.turma_id 
        : String(e.turma_id) === String(selectedTurmaFilter);

    const matchSearch = !searchQuery.trim() || 
      e.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.cpf.includes(searchQuery);

    return matchTurma && matchSearch;
  });

  return (
    <div className="training-certificates-page" style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Cabeçalho Principal */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ 
            backgroundColor: '#0284c7', 
            color: '#fff', 
            padding: '0.7rem', 
            borderRadius: 'var(--radius-md)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.3)'
          }}>
            <Award size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                Gestão de Treinamentos & Certificados
              </h1>
              <span style={{ 
                backgroundColor: 'rgba(2, 132, 199, 0.12)', 
                color: '#0284c7', 
                fontSize: '0.7rem', 
                fontWeight: '700', 
                padding: '0.2rem 0.55rem', 
                borderRadius: '1rem', 
                textTransform: 'uppercase' 
              }}>
                Exclusivo Vínculo Treinamento
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Link público de inscrição com consulta CPF A, listas de presença, gestão de turmas e emissão de certificados oficiais.
            </p>
          </div>
        </div>

        {/* Botões Rápidos do Cabeçalho */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowTokenModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
            title="Configurar Token da API CPF.CNPJ"
          >
            <Key size={14} style={{ color: '#0284c7' }} />
            API CPF A (Receita)
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => copyPublicLink(null, 'general-header')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
          >
            {copiedKey === 'general-header' ? <Check size={14} style={{ color: '#10b981' }} /> : <LinkIcon size={14} />}
            {copiedKey === 'general-header' ? 'Link Copiado!' : 'Copiar Link Público'}
          </button>

          <a
            href="/inscricao"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', textDecoration: 'none' }}
            title="Abrir página pública de inscrição"
          >
            <ExternalLink size={14} />
            Ver Portal de Inscrição
          </a>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedback && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          marginBottom: '1.25rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: feedback.type === 'success' ? '#f0fdf4' : feedback.type === 'info' ? '#f0f9ff' : '#eff6ff',
          border: feedback.type === 'success' ? '1px solid #bbf7d0' : feedback.type === 'info' ? '1px solid #bae6fd' : '1px solid #bfdbfe',
          color: feedback.type === 'success' ? '#166534' : feedback.type === 'info' ? '#0369a1' : '#1e40af',
          fontSize: '0.875rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Barra de Abas */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        borderBottom: '2px solid var(--border)',
        marginBottom: '1.5rem',
        paddingBottom: '0.25rem'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('turmas')}
          style={{
            padding: '0.65rem 1.25rem',
            border: 'none',
            borderBottom: activeTab === 'turmas' ? '3px solid #0284c7' : '3px solid transparent',
            backgroundColor: activeTab === 'turmas' ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
            color: activeTab === 'turmas' ? '#0284c7' : 'var(--text-secondary)',
            fontWeight: activeTab === 'turmas' ? '700' : '500',
            fontSize: '0.9375rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            transition: 'all 0.15s'
          }}
        >
          <Users size={18} />
          Turmas & Inscrições
          <span style={{
            backgroundColor: activeTab === 'turmas' ? '#0284c7' : 'var(--border)',
            color: activeTab === 'turmas' ? '#fff' : 'var(--text-secondary)',
            fontSize: '0.72rem',
            padding: '1px 6px',
            borderRadius: '10px',
            fontWeight: '700'
          }}>
            {enrollments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('generator')}
          style={{
            padding: '0.65rem 1.25rem',
            border: 'none',
            borderBottom: activeTab === 'generator' ? '3px solid #0284c7' : '3px solid transparent',
            backgroundColor: activeTab === 'generator' ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
            color: activeTab === 'generator' ? '#0284c7' : 'var(--text-secondary)',
            fontWeight: activeTab === 'generator' ? '700' : '500',
            fontSize: '0.9375rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            transition: 'all 0.15s'
          }}
        >
          <Award size={18} />
          Gerador de Certificados PPTX
          {colaboradores.filter(c => c.nome.trim()).length > 0 && (
            <span style={{
              backgroundColor: '#10b981',
              color: '#fff',
              fontSize: '0.72rem',
              padding: '1px 6px',
              borderRadius: '10px',
              fontWeight: '700'
            }}>
              {colaboradores.filter(c => c.nome.trim()).length} prontos
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: TURMAS E INSCRIÇÕES                                                */}
      {/* ========================================================================= */}
      {activeTab === 'turmas' && (
        <div>
          {/* Card Destacado: Link Público de Inscrição */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.07) 0%, rgba(15, 23, 42, 0.03) 100%)',
            border: '1px solid rgba(2, 132, 199, 0.25)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ 
                  backgroundColor: '#0284c7', 
                  color: '#fff', 
                  fontSize: '0.7rem', 
                  fontWeight: '700', 
                  padding: '2px 8px', 
                  borderRadius: '12px',
                  textTransform: 'uppercase'
                }}>
                  Link Público Geral
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>
                  <ShieldCheck size={14} />
                  Integração CPF A Ativa
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Envie este link para os alunos se cadastrarem com CPF e Data de Nascimento:
              </h3>
              <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <code style={{ 
                  backgroundColor: 'var(--surface)', 
                  border: '1px solid var(--border)', 
                  padding: '0.35rem 0.75rem', 
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  color: '#0284c7',
                  fontWeight: '600'
                }}>
                  {window.location.origin}/inscricao
                </code>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => copyPublicLink(null, 'banner-general')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                {copiedKey === 'banner-general' ? <Check size={16} /> : <Copy size={16} />}
                {copiedKey === 'banner-general' ? 'Copiado para a Área de Transferência!' : 'Copiar Link Público'}
              </button>
            </div>
          </div>

          {/* Seção de Turmas */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                  Turmas Cadastradas ({turmas.length})
                </h2>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Organize seus treinamentos em turmas com datas, empresas e links exclusivos.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenNewTurma}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                <Plus size={16} />
                Nova Turma
              </button>
            </div>

            {loadingData ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Loader size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                Carregando turmas...
              </div>
            ) : turmas.length === 0 ? (
              <div style={{
                padding: '2.5rem',
                textAlign: 'center',
                backgroundColor: 'var(--surface)',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius-lg)'
              }}>
                <Award size={36} style={{ color: 'var(--text-secondary)', margin: '0 auto 0.75rem', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                  Nenhuma turma criada ainda
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem', marginBottom: '1rem' }}>
                  Crie sua primeira turma para gerar links de inscrição específicos e emitir certificados em lote.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleOpenNewTurma}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                >
                  <Plus size={15} />
                  Criar Primeira Turma
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
                {turmas.map(turma => {
                  const studentCount = enrollments.filter(e => e.turma_id === turma.id).length;
                  return (
                    <div
                      key={turma.id}
                      style={{
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.85rem',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'transform 0.15s, box-shadow 0.15s'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <span style={{
                            backgroundColor: turma.status === 'Concluída' ? '#f1f5f9' : '#e0f2fe',
                            color: turma.status === 'Concluída' ? '#64748b' : '#0369a1',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            textTransform: 'uppercase'
                          }}>
                            {turma.status || 'Aberta'}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                              type="button"
                              onClick={() => handleEditTurma(turma)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '3px' }}
                              title="Editar Turma"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTurma(turma.id, turma.name)}
                              style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '3px' }}
                              title="Excluir Turma"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0.5rem 0 0.25rem' }}>
                          {turma.name}
                        </h3>
                        {turma.course_name && turma.course_name !== turma.name && (
                          <div style={{ fontSize: '0.8125rem', color: '#0284c7', fontWeight: '600', marginBottom: '0.35rem' }}>
                            {turma.course_name}
                          </div>
                        )}

                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {turma.company && (
                            <div><strong>Empresa:</strong> {turma.company}</div>
                          )}
                          {turma.start_date && (
                            <div><strong>Data:</strong> {new Date(turma.start_date).toLocaleDateString('pt-BR')} • {turma.duration || '8h'}</div>
                          )}
                          {turma.instructor_name && (
                            <div><strong>Instrutor:</strong> {turma.instructor_name}</div>
                          )}
                        </div>
                      </div>

                      <div style={{
                        paddingTop: '0.75rem',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem'
                      }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Users size={14} style={{ color: '#0284c7' }} />
                          <strong>{studentCount}</strong> inscritos
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => copyPublicLink(turma.id, `turma-${turma.id}`)}
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            title="Copiar link de inscrição específico desta turma"
                          >
                            {copiedKey === `turma-${turma.id}` ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                            {copiedKey === `turma-${turma.id}` ? 'Link Copiado' : 'Link da Turma'}
                          </button>

                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleLoadTurmaIntoGenerator(turma)}
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            title="Carregar alunos desta turma no gerador de certificados"
                          >
                            <Award size={13} />
                            Emitir Certificados
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Seção da Lista de Inscritos */}
          <div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              flexWrap: 'wrap', 
              gap: '1rem', 
              marginBottom: '1rem' 
            }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                  Participantes & Lista de Presença ({filteredEnrollments.length})
                </h2>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Dados oficiais recebidos em tempo real via link público com CPF e Data de Nascimento.
                </p>
              </div>

              {/* Controles de Filtro e Busca */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    placeholder="Buscar por nome ou CPF..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input"
                    style={{ paddingLeft: '2rem', width: '220px', fontSize: '0.8125rem' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Filter size={14} style={{ color: 'var(--text-secondary)' }} />
                  <select
                    value={selectedTurmaFilter}
                    onChange={(e) => setSelectedTurmaFilter(e.target.value)}
                    className="input"
                    style={{ fontSize: '0.8125rem' }}
                  >
                    <option value="all">Todas as Turmas ({enrollments.length})</option>
                    <option value="unassigned">Sem Turma Vinculada ({enrollments.filter(e => !e.turma_id).length})</option>
                    {turmas.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({enrollments.filter(e => e.turma_id === t.id).length})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={loadData}
                  title="Atualizar lista"
                  style={{ display: 'flex', alignItems: 'center', padding: '0.55rem' }}
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Tabela de Participantes */}
            <div style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)'
            }}>
              {filteredEnrollments.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Users size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>
                    {searchQuery ? 'Nenhum aluno encontrado para os filtros atuais.' : 'Nenhuma inscrição recebida ainda.'}
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Participante (Receita)</th>
                        <th style={{ padding: '0.75rem 1rem' }}>CPF</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Nascimento</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Turma Vinculada</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Data Inscrição</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEnrollments.map(student => {
                        const assignedTurma = turmas.find(t => t.id === student.turma_id);
                        return (
                          <tr key={student.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.15s' }}>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                {student.nome}
                              </div>
                              {student.empresa && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                  {student.empresa} {student.telefone ? `• ${student.telefone}` : ''}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: '500', color: '#0284c7' }}>
                              {student.cpf}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                              {student.data_nascimento ? new Date(student.data_nascimento).toLocaleDateString('pt-BR') : '-'}
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <select
                                value={student.turma_id || ''}
                                onChange={(e) => handleStudentTurmaChange(student.id, e.target.value)}
                                className="input"
                                style={{ fontSize: '0.78rem', padding: '0.25rem 0.5rem', width: 'auto', maxWidth: '200px' }}
                              >
                                <option value="">(Sem turma)</option>
                                {turmas.map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {student.created_at ? new Date(student.created_at).toLocaleDateString('pt-BR') : '-'}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => handleDeleteStudent(student.id, student.nome)}
                                style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                                title="Excluir Inscrição"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: GERADOR DE CERTIFICADOS PPTX                                       */}
      {/* ========================================================================= */}
      {activeTab === 'generator' && (
        <div>
          {/* Card: Seletor Rápido de Turma para Importação */}
          {turmas.length > 0 && (
            <div style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} style={{ color: '#0284c7' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Carregar Dados & Alunos de uma Turma:
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <select
                  className="input"
                  style={{ fontSize: '0.85rem', width: 'auto' }}
                  onChange={(e) => {
                    const found = turmas.find(t => String(t.id) === String(e.target.value));
                    if (found) handleLoadTurmaIntoGenerator(found);
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Selecione uma turma para carregar...</option>
                  {turmas.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({enrollments.filter(e => e.turma_id === t.id).length} inscritos)
                    </option>
                  ))}
                </select>
              </div>
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
                    : 'Você pode selecionar ou arrastar o seu novo arquivo PowerPoint (.pptx) de modelo TotalSafety.'}
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

          {/* Grid Principal: Dados do Curso + Lista de Alunos */}
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
                  value={formData.descricao}
                  onChange={handleChange}
                  rows={2}
                  style={{ width: '100%', marginTop: '0.25rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  Dados do Instrutor Responsável
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                  <input
                    type="text"
                    name="instrutorNome"
                    className="input"
                    value={formData.instrutorNome}
                    onChange={handleChange}
                    placeholder="Nome do Instrutor"
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <input
                      type="text"
                      name="instrutorCargo"
                      className="input"
                      value={formData.instrutorCargo}
                      onChange={handleChange}
                      placeholder="Cargo / Qualificação"
                    />
                    <input
                      type="text"
                      name="instrutorRegistro"
                      className="input"
                      value={formData.instrutorRegistro}
                      onChange={handleChange}
                      placeholder="Registro Profissional / SRTE"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="modal-label" style={{ fontWeight: '600', fontSize: '0.8125rem' }}>
                  Conteúdo Programático (Verso do Certificado)
                </label>
                <textarea
                  name="conteudo"
                  className="input"
                  value={formData.conteudo}
                  onChange={handleChange}
                  rows={4}
                  style={{ width: '100%', marginTop: '0.25rem', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8125rem' }}
                />
              </div>
            </div>

            {/* Card: Lista de Participantes para o PPTX */}
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
                <div>
                  <h2 style={{ fontSize: '0.9375rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={16} style={{ color: '#0284c7' }} />
                    Alunos na Geração Atual ({colaboradores.length})
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Cada participante gerará seus respectivos slides no PowerPoint.
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowBatchModal(true)}
                    style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <ClipboardCopy size={14} />
                    Colar Lista
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={addColaborador}
                    style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Plus size={14} />
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Lista com scroll */}
              <div style={{ 
                maxHeight: '480px', 
                overflowY: 'auto', 
                paddingRight: '0.25rem',
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.625rem' 
              }}>
                {colaboradores.map((colab, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: 'var(--surface-hover)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)'
                  }}>
                    <span style={{ 
                      color: 'var(--text-secondary)', 
                      fontSize: '0.75rem', 
                      fontWeight: '700', 
                      minWidth: '22px' 
                    }}>
                      #{idx + 1}
                    </span>

                    <input
                      type="text"
                      className="input"
                      placeholder="Nome completo do participante"
                      value={colab.nome}
                      onChange={(e) => handleColabChange(idx, 'nome', e.target.value)}
                      style={{ flex: 2, fontSize: '0.85rem', padding: '0.4rem 0.65rem' }}
                    />

                    <input
                      type="text"
                      className="input"
                      placeholder="000.000.000-00"
                      value={colab.cpf}
                      onChange={(e) => handleColabChange(idx, 'cpf', formatCpf(e.target.value))}
                      style={{ flex: 1.2, fontSize: '0.85rem', padding: '0.4rem 0.65rem', fontFamily: 'monospace' }}
                      maxLength={14}
                    />

                    <button
                      type="button"
                      onClick={() => removeColaborador(idx)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'var(--danger)', 
                        cursor: 'pointer', 
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Remover participante"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Botão Principal de Download */}
              <div style={{ marginTop: 'auto', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleGenerate}
                  disabled={generating}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.9375rem',
                    fontWeight: '700',
                    backgroundColor: '#0284c7',
                    boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.4)'
                  }}
                >
                  {generating ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Gerando Arquivo PPTX com {colaboradores.filter(c => c.nome.trim()).length} Certificados...
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      Baixar Certificados em PowerPoint (.pptx)
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CRIAR OU EDITAR TURMA                                              */}
      {/* ========================================================================= */}
      {showTurmaModal && (
        <div className="modal-backdrop" onClick={() => setShowTurmaModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={18} style={{ color: '#0284c7' }} />
                {editingTurma ? 'Editar Turma' : 'Criar Nova Turma de Treinamento'}
              </h2>
              <button className="modal-close" onClick={() => setShowTurmaModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTurma} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label className="modal-label" style={{ fontWeight: '600' }}>Identificação da Turma *</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="Ex: Turma 01 - NR-35 Trabalho em Altura / Turma Março 2026"
                  value={turmaFormData.name}
                  onChange={e => setTurmaFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="modal-label" style={{ fontWeight: '600' }}>Nome Oficial do Curso *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: NR-35 - Segurança no Trabalho em Altura"
                  value={turmaFormData.course_name}
                  onChange={e => setTurmaFormData(prev => ({ ...prev, course_name: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="modal-label" style={{ fontWeight: '600' }}>Carga Horária</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: 8 horas, 16 horas"
                    value={turmaFormData.duration}
                    onChange={e => setTurmaFormData(prev => ({ ...prev, duration: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="modal-label" style={{ fontWeight: '600' }}>Data de Conclusão / Realização</label>
                  <input
                    type="date"
                    className="input"
                    value={turmaFormData.start_date}
                    onChange={e => setTurmaFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="modal-label" style={{ fontWeight: '600' }}>Local / Cidade</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: Mossoró - RN"
                    value={turmaFormData.location}
                    onChange={e => setTurmaFormData(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="modal-label" style={{ fontWeight: '600' }}>Empresa Solicitante</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: TotalSafety / Nome do Cliente"
                    value={turmaFormData.company}
                    onChange={e => setTurmaFormData(prev => ({ ...prev, company: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="modal-label" style={{ fontWeight: '600' }}>Instrutor Responsável</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Nome do Instrutor"
                  value={turmaFormData.instructor_name}
                  onChange={e => setTurmaFormData(prev => ({ ...prev, instructor_name: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="modal-label" style={{ fontWeight: '600' }}>Cargo do Instrutor</label>
                  <input
                    type="text"
                    className="input"
                    value={turmaFormData.instructor_role}
                    onChange={e => setTurmaFormData(prev => ({ ...prev, instructor_role: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="modal-label" style={{ fontWeight: '600' }}>Registro SRTE</label>
                  <input
                    type="text"
                    className="input"
                    value={turmaFormData.instructor_registration}
                    onChange={e => setTurmaFormData(prev => ({ ...prev, instructor_registration: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="modal-label" style={{ fontWeight: '600' }}>Status da Turma</label>
                <select
                  className="input"
                  value={turmaFormData.status}
                  onChange={e => setTurmaFormData(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="Aberta">Aberta (Aceitando inscrições)</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Concluída">Concluída</option>
                </select>
              </div>

              <div className="modal-actions" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTurmaModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#0284c7' }}>
                  {editingTurma ? 'Salvar Alterações' : 'Criar Turma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TOKEN DA API CPF.CNPJ                                              */}
      {/* ========================================================================= */}
      {showTokenModal && (
        <div className="modal-backdrop" onClick={() => setShowTokenModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={18} style={{ color: '#0284c7' }} />
                Configuração da API CPF A
              </h2>
              <button className="modal-close" onClick={() => setShowTokenModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveApiToken} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                A página pública de inscrição utiliza a <strong>API CPF.CNPJ (Pacote 1: CPF A)</strong> para consultar a Receita Federal e validar em tempo real o nome completo do participante ao digitar o CPF.
              </div>

              <div>
                <label className="modal-label" style={{ fontWeight: '600' }}>Base URL da API</label>
                <input
                  type="text"
                  disabled
                  className="input"
                  value="https://api.cpfcnpj.com.br"
                  style={{ opacity: 0.8 }}
                />
              </div>

              <div>
                <label className="modal-label" style={{ fontWeight: '600' }}>Token de Acesso (Teste ou Produção)</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="Cole aqui seu token de integração"
                  value={apiToken}
                  onChange={e => setApiToken(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                  Token de testes configurado: <code>5ae973d7a997af13f0aaf2bf60e65803</code>
                </span>
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTokenModal(false)}>
                  Fechar
                </button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#0284c7' }}>
                  Salvar Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COLAR EM LOTE (TEXTO)                                              */}
      {/* ========================================================================= */}
      {showBatchModal && (
        <div className="modal-backdrop" onClick={() => setShowBatchModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardCopy size={18} style={{ color: '#0284c7' }} />
                Importar Participantes em Lote
              </h2>
              <button className="modal-close" onClick={() => setShowBatchModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Cole abaixo a lista de participantes, um por linha. Você pode colar Nome e CPF separados por hífen, vírgula ou espaço.
              </p>

              <textarea
                className="input"
                rows={8}
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder={"Exemplo:\nJoão Silva - 123.456.789-00\nMaria Santos, 98765432100\nCarlos Eduardo"}
                style={{ fontFamily: 'monospace', fontSize: '0.8125rem', resize: 'vertical' }}
              />

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowBatchModal(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary" onClick={handleProcessBatch} style={{ backgroundColor: '#0284c7' }}>
                  Processar Lista
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TrainingCertificatesPage;
