import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, FileText, Plus, Trash2, Download, Loader, 
  Upload, CheckCircle2, AlertCircle, Users, Sparkles, 
  HelpCircle, ClipboardCopy, RefreshCw, Layers, Link as LinkIcon,
  Copy, Check, ExternalLink, Calendar, Search, Filter,
  Edit, Key, ShieldCheck, ChevronRight, ChevronDown, UserCheck, X, User,
  Eye, CheckCircle, Clock, BookOpen, Briefcase, MapPin, Building,
  Smartphone, QrCode, PenTool, Share2
} from 'lucide-react';
import { generateTrainingPPTX } from '../utils/trainingPptxGenerator';
import { formatCpf } from '../services/cpfService';
import { getProfiles, getCompanies, getGroups } from '../services/storageService';
import { 
  getTrainingClasses, saveTrainingClass, deleteTrainingClass,
  getTrainingEnrollments, updateStudent, deleteStudent, subscribeToEnrollments 
} from '../services/trainingClassesService';
import SignaturePadModal from '../components/SignaturePadModal';
import { 
  getTurmaSignatures, saveRoleSignature, clearTurmaSignature, subscribeToTurmaSignatures 
} from '../services/turmaSignatureService';

import { OFFICIAL_TRAINING_MODELS, OFFICIAL_INSTRUCTORS, getInstructorSignatureUrl } from '../data/officialTrainingModels';

const DEFAULT_API_TOKEN = '5ae973d7a997af13f0aaf2bf60e65803';

// Catálogo Oficial de Modelos de Treinamentos e Certificados TotalSafety / EcoSafety
const COURSE_PRESETS = OFFICIAL_TRAINING_MODELS;

// Lista de instrutores e responsáveis técnicos oficiais extraídos diretamente dos certificados
const FALLBACK_PROFILES = OFFICIAL_INSTRUCTORS;

const TrainingCertificatesPage = () => {
  // Controle de Abas: 'generator' | 'turmas'
  const [activeTab, setActiveTab] = useState('generator');

  // Usuários do Sistema para seleção de instrutores
  const [profiles, setProfiles] = useState(FALLBACK_PROFILES);

  // Estados das Turmas e Inscrições
  const [turmas, setTurmas] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedTurmaIdInGenerator, setSelectedTurmaIdInGenerator] = useState('');
  const [isCustomCourse, setIsCustomCourse] = useState(false);
  const [isCustomCompany, setIsCustomCompany] = useState(false);
  const [isEditingInstructor, setIsEditingInstructor] = useState(false);
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
    instructor_name: 'Eider Gomes do Nascimento',
    instructor_role: 'Instrutor e Responsável Técnico',
    instructor_registration: 'MTE0009995/RN',
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

  // Assinaturas Manuais da Turma (Em Lote)
  const [currentTurmaSignatures, setCurrentTurmaSignatures] = useState({});
  const [showSignModal, setShowSignModal] = useState(false);
  const [signModalRole, setSignModalRole] = useState('instructor');
  const [signModalSignerName, setSignModalSignerName] = useState('');
  const [signModalRoleTitle, setSignModalRoleTitle] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrModalTurma, setQrModalTurma] = useState(null);

  // ----------------------------------------------------
  // Estados do Gerador de Certificados (PPTX)
  // ----------------------------------------------------
  const defaultOfficialModel = OFFICIAL_TRAINING_MODELS[0];
  const [formData, setFormData] = useState({
    curso: defaultOfficialModel ? (defaultOfficialModel.title || defaultOfficialModel.name) : 'NR-35 – TRABALHO EM ALTURA – NÍVEL BÁSICO',
    descricao: defaultOfficialModel ? defaultOfficialModel.description : 'Projeto de treinamento com carga horária de 8 horas, desenvolvido em conformidade com a Norma Regulamentadora nº 35 (NR-35) e requisitos técnicos aplicáveis.',
    data: new Date().toISOString().split('T')[0],
    duracao: defaultOfficialModel ? defaultOfficialModel.duration : '8 horas',
    validade: defaultOfficialModel ? defaultOfficialModel.validade : '24 meses',
    local: 'Mossoró - RN',
    empresa: 'TotalSafety',
    instrutorNome: defaultOfficialModel?.defaultInstructor?.name || 'Eider Gomes do Nascimento',
    instrutorCargo: defaultOfficialModel?.defaultInstructor?.role || 'Instrutor e Responsável Técnico',
    instrutorRegistro: defaultOfficialModel?.defaultInstructor?.registration || 'MTE0009995/RN',
    conteudo: defaultOfficialModel ? defaultOfficialModel.content : '1. Conceitos, definições e requisitos da NR-35...'
  });

  const [colaboradores, setColaboradores] = useState([
    { nome: '', cpf: '', matricula: '' }
  ]);

  const [customTemplateFile, setCustomTemplateFile] = useState(null);
  const [customTemplateBuffer, setCustomTemplateBuffer] = useState(null);
  const fileInputRef = useRef(null);

  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [previewTab, setPreviewTab] = useState('frente'); // 'frente' | 'verso'
  const [certModel, setCertModel] = useState(defaultOfficialModel?.modelType || 'modelo1'); // 'modelo1' | 'modelo2'

  // ----------------------------------------------------
  // Carregamento de Dados (Turmas, Inscrições e Usuários)
  // ----------------------------------------------------
  const loadData = async () => {
    setLoadingData(true);
    try {
      const [classList, studentList, profileList, companyList, groupList] = await Promise.all([
        getTrainingClasses(),
        getTrainingEnrollments(),
        getProfiles(),
        getCompanies(),
        getGroups()
      ]);
      setTurmas(classList || []);
      setEnrollments(studentList || []);
      if (profileList && profileList.length > 0) {
        const combined = [...OFFICIAL_INSTRUCTORS];
        profileList.forEach(p => {
          if (!combined.some(c => c.name.toLowerCase() === p.name.toLowerCase())) {
            combined.push(p);
          }
        });
        setProfiles(combined);
      }
      if (companyList && companyList.length > 0) {
        setCompanies(companyList);
      }
      if (groupList && groupList.length > 0) {
        setGroups(groupList);
      }
    } catch (e) {
      console.error('Erro ao carregar turmas, inscrições e instrutores:', e);
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
        text: `Nova inscrição recebida em tempo real: ${newStudent.nome} (${newStudent.cpf})` 
      });
      setTimeout(() => setFeedback(null), 5000);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Sincronização em tempo real das assinaturas manuais da turma
  useEffect(() => {
    const targetId = selectedTurmaIdInGenerator || 'draft_turma';
    const sigs = getTurmaSignatures(targetId);
    setCurrentTurmaSignatures(sigs || {});

    const unsubscribeSignatures = subscribeToTurmaSignatures((event) => {
      const currentId = selectedTurmaIdInGenerator || 'draft_turma';
      if (String(event.turmaId) === String(currentId)) {
        setCurrentTurmaSignatures(event.signatures || {});
        setFeedback({
          type: 'success',
          text: '✍️ Assinatura manual da turma atualizada em tempo real!'
        });
        setTimeout(() => setFeedback(null), 4000);
      }
    });

    return () => {
      if (unsubscribeSignatures) unsubscribeSignatures();
    };
  }, [selectedTurmaIdInGenerator]);

  // Handlers para Assinaturas Manuais da Turma
  const handleOpenSignatureModal = (roleKey) => {
    const activeTurma = turmas.find(t => String(t.id) === String(selectedTurmaIdInGenerator));
    let name = '';
    let title = '';

    if (roleKey === 'instructor') {
      name = formData.instrutorNome || activeTurma?.instructor_name || 'Adeylton da Silva Araújo';
      title = 'Instrutor(a)';
    } else if (roleKey === 'tech_lead') {
      name = certModel === 'modelo1' ? 'Eider Gomes do Nascimento' : 'Raimundo Fernandes de Oliveira Junior';
      title = 'Responsável Técnico';
    } else if (roleKey === 'coordinator') {
      name = formData.curso?.toLowerCase().includes('aph') ? 'Leiliana Nunes de Lima Fernandes' : 'Cezar Augusto Galvão De P. Camêlo';
      title = 'Coordenador(a) Técnico(a)';
    }

    setSignModalRole(roleKey);
    setSignModalSignerName(name);
    setSignModalRoleTitle(title);
    setShowSignModal(true);
  };

  const handleSaveDrawnSignature = (dataUrl) => {
    const targetId = selectedTurmaIdInGenerator || 'draft_turma';
    const updated = saveRoleSignature(targetId, signModalRole, dataUrl, {
      signerName: signModalSignerName,
      roleTitle: signModalRoleTitle
    });
    if (updated) {
      setCurrentTurmaSignatures(updated);
      setFeedback({
        type: 'success',
        text: `Assinatura de ${signModalSignerName} vinculada com sucesso a toda a turma!`
      });
      setTimeout(() => setFeedback(null), 4500);
    }
  };

  const handleClearSignature = (roleKey) => {
    const targetId = selectedTurmaIdInGenerator || 'draft_turma';
    clearTurmaSignature(targetId, roleKey);
    setCurrentTurmaSignatures(getTurmaSignatures(targetId));
    setFeedback({
      type: 'info',
      text: 'Assinatura manual removida. A turma voltará ao padrão oficial.'
    });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleOpenQrModal = (turma = null) => {
    const t = turma || turmas.find(item => String(item.id) === String(selectedTurmaIdInGenerator)) || {
      id: selectedTurmaIdInGenerator || 'draft_turma',
      name: formData.curso || 'Turma Ativa'
    };
    setQrModalTurma(t);
    setShowQrModal(true);
  };

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
      instructor_name: profiles[0]?.name || 'Eider Gomes do Nascimento',
      instructor_role: profiles[0]?.role || 'Instrutor e Responsável Técnico',
      instructor_registration: profiles[0]?.registration || 'MTE0009995/RN',
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
      instructor_name: turma.instructor_name || profiles[0]?.name || 'Eider Gomes do Nascimento',
      instructor_role: turma.instructor_role || 'Instrutor e Responsável Técnico',
      instructor_registration: turma.instructor_registration || 'MTE0009995/RN',
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
    const studentsInTurma = enrollments.filter(e => String(e.turma_id) === String(turma.id));

    if (studentsInTurma.length === 0) {
      if (!window.confirm(`A turma "${turma.name}" não possui participantes inscritos ainda. Deseja carregar as configurações do curso no gerador mesmo assim?`)) {
        return;
      }
    }

    setSelectedTurmaIdInGenerator(turma.id);

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
        text: `Turma "${turma.name}" vinculada com ${studentsInTurma.length} participante(s) carregados!` 
      });
    } else {
      setFeedback({ 
        type: 'info', 
        text: `Configurações da turma "${turma.name}" carregadas no formulário do certificado!` 
      });
    }

    setActiveTab('generator');
    setTimeout(() => setFeedback(null), 4500);
  };

  const handleReloadTurmaStudents = async () => {
    if (!selectedTurmaIdInGenerator) return;
    try {
      const allStudents = await getTrainingEnrollments();
      setEnrollments(allStudents || []);
      const studentsInTurma = (allStudents || []).filter(e => String(e.turma_id) === String(selectedTurmaIdInGenerator));
      if (studentsInTurma.length > 0) {
        setColaboradores(studentsInTurma.map(s => ({ nome: s.nome, cpf: s.cpf })));
        setFeedback({ 
          type: 'success', 
          text: `Inscrições sincronizadas! (${studentsInTurma.length} participantes carregados)` 
        });
      } else {
        setFeedback({ 
          type: 'info', 
          text: 'Nenhuma inscrição recente encontrada para esta turma.' 
        });
      }
      setTimeout(() => setFeedback(null), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearTurmaLink = () => {
    setSelectedTurmaIdInGenerator('');
    setFeedback({
      type: 'info',
      text: 'Vínculo com a turma desfeito. Você pode personalizar os campos livremente.'
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Aplica um modelo oficial inteligente de curso
  const applyPreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      curso: preset.title || preset.name,
      duracao: preset.duration,
      conteudo: preset.content,
      descricao: preset.description || `Projeto de treinamento com carga horária de ${preset.duration}, desenvolvido em conformidade com as diretrizes e requisitos técnicos da ${preset.name}.`,
      validade: preset.validade || '24 meses',
      instrutorNome: preset.defaultInstructor?.name || prev.instrutorNome,
      instrutorCargo: preset.defaultInstructor?.role || prev.instrutorCargo,
      instrutorRegistro: preset.defaultInstructor?.registration || prev.instrutorRegistro
    }));
    if (preset.modelType) {
      setCertModel(preset.modelType);
    }
    setFeedback({
      type: 'success',
      text: `Modelo oficial "${preset.name}" (${preset.modelType === 'modelo1' ? 'Modelo 1 - EcoCurvas' : 'Modelo 2 - Ondas & Colmeia'}) carregado com sucesso!`
    });
    setTimeout(() => setFeedback(null), 3500);
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

  const clearAllColaboradores = () => {
    if (window.confirm('Deseja limpar todos os participantes da lista?')) {
      setColaboradores([{ nome: '', cpf: '' }]);
    }
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
        certModel: certModel,
        curso: formData.curso,
        descricao: formData.descricao,
        data: formData.data,
        duracao: formData.duracao,
        validade: formData.validade,
        local: formData.local,
        empresa: formData.empresa,
        instrutorNome: formData.instrutorNome,
        instrutorCargo: formData.instrutorCargo,
        instrutorRegistro: formData.instrutorRegistro,
        conteudo: formData.conteudo,
        colaboradores: validColaboradores,
        turmaSignatures: currentTurmaSignatures
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

  const validCount = colaboradores.filter(c => c.nome.trim()).length;
  const firstStudent = colaboradores.find(c => c.nome.trim());

  return (
    <div className="training-certificates-page" style={{ padding: '1.75rem', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* ========================================================================= */}
      {/* HERO SECTION / HEADER ELEGANTE                                            */}
      {/* ========================================================================= */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(99, 102, 241, 0.04) 50%, rgba(15, 23, 42, 0.02) 100%)',
        border: '1px solid rgba(2, 132, 199, 0.18)',
        borderRadius: '1.25rem',
        padding: '1.5rem 1.75rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow de fundo */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '220px',
          height: '220px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(2, 132, 199, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Lado Esquerdo: Título e Identidade */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '1rem',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.45)',
              flexShrink: 0
            }}>
              <Award size={30} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  Emissão de Certificados & Treinamentos
                </h1>
                <span style={{ 
                  background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(56, 189, 248, 0.1) 100%)',
                  border: '1px solid rgba(2, 132, 199, 0.25)',
                  color: '#0284c7', 
                  fontSize: '0.72rem', 
                  fontWeight: '700', 
                  padding: '0.2rem 0.65rem', 
                  borderRadius: '2rem', 
                  textTransform: 'uppercase',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <ShieldCheck size={13} />
                  Módulo Treinamento
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Ambiente integrado para geração de apresentações PowerPoint (.pptx) com 2 slides por participante, gestão de turmas e inscrição com CPF A da Receita.
              </p>
            </div>
          </div>

          {/* Lado Direito: Ações Rápidas de Configuração & Inscrição */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn"
              onClick={() => setShowTokenModal(true)}
              style={{ 
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                fontWeight: '600',
                padding: '0.55rem 0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
              title="Configurar Token da API CPF.CNPJ"
            >
              <Key size={14} style={{ color: '#0284c7' }} />
              API CPF A (Receita)
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => copyPublicLink(null, 'general-header')}
              style={{ 
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                fontWeight: '600',
                padding: '0.55rem 0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              {copiedKey === 'general-header' ? <Check size={14} style={{ color: '#10b981' }} /> : <LinkIcon size={14} style={{ color: '#0284c7' }} />}
              {copiedKey === 'general-header' ? 'Link Copiado!' : 'Copiar Link Público'}
            </button>

            <a
              href="/inscricao"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ 
                backgroundColor: '#0284c7',
                color: '#fff',
                fontSize: '0.8125rem',
                fontWeight: '600',
                padding: '0.55rem 0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
                textDecoration: 'none'
              }}
              title="Abrir página pública de inscrição"
            >
              <ExternalLink size={14} />
              Portal de Inscrição
            </a>
          </div>
        </div>

        {/* Métricas / Estatísticas Rápidas em Pills */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.85rem',
          marginTop: '1.25rem',
          paddingTop: '1.15rem',
          borderTop: '1px solid rgba(2, 132, 199, 0.12)'
        }}>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(2, 132, 199, 0.15)',
            borderRadius: '0.75rem',
            padding: '0.65rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(2, 132, 199, 0.12)',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Award size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>
                Turmas Ativas
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                {turmas.length} {turmas.length === 1 ? 'turma' : 'turmas'}
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(16, 185, 129, 0.18)',
            borderRadius: '0.75rem',
            padding: '0.65rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>
                Inscrições Recebidas
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                {enrollments.length} {enrollments.length === 1 ? 'participante' : 'participantes'}
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(99, 102, 241, 0.18)',
            borderRadius: '0.75rem',
            padding: '0.65rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              color: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Layers size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>
                Certificados no Gerador
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                {validCount} {validCount === 1 ? 'aluno pronto' : 'alunos prontos'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de Feedback Global */}
      {feedback && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          padding: '0.85rem 1.15rem',
          marginBottom: '1.25rem',
          borderRadius: '0.75rem',
          backgroundColor: feedback.type === 'success' ? '#f0fdf4' : feedback.type === 'info' ? '#f0f9ff' : '#eff6ff',
          border: feedback.type === 'success' ? '1px solid #bbf7d0' : feedback.type === 'info' ? '1px solid #bae6fd' : '1px solid #bfdbfe',
          color: feedback.type === 'success' ? '#166534' : feedback.type === 'info' ? '#0369a1' : '#1e40af',
          fontSize: '0.875rem',
          fontWeight: '500',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <CheckCircle2 size={18} />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEGMENTED TAB CONTROL                                                     */}
      {/* ========================================================================= */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.35rem',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '0.85rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        gap: '0.35rem'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('generator')}
          style={{
            padding: '0.65rem 1.35rem',
            border: 'none',
            borderRadius: '0.65rem',
            backgroundColor: activeTab === 'generator' ? '#0284c7' : 'transparent',
            color: activeTab === 'generator' ? '#fff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'generator' ? '700' : '600',
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            boxShadow: activeTab === 'generator' ? '0 4px 12px rgba(2, 132, 199, 0.35)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Award size={17} />
          Gerador de Certificados PPTX
          {validCount > 0 && (
            <span style={{
              backgroundColor: activeTab === 'generator' ? 'rgba(255,255,255,0.25)' : '#10b981',
              color: '#fff',
              fontSize: '0.72rem',
              padding: '2px 8px',
              borderRadius: '1rem',
              fontWeight: '700'
            }}>
              {validCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('turmas')}
          style={{
            padding: '0.65rem 1.35rem',
            border: 'none',
            borderRadius: '0.65rem',
            backgroundColor: activeTab === 'turmas' ? '#0284c7' : 'transparent',
            color: activeTab === 'turmas' ? '#fff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'turmas' ? '700' : '600',
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            boxShadow: activeTab === 'turmas' ? '0 4px 12px rgba(2, 132, 199, 0.35)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Users size={17} />
          Turmas & Inscrições Oficiais
          <span style={{
            backgroundColor: activeTab === 'turmas' ? 'rgba(255,255,255,0.25)' : 'var(--border)',
            color: activeTab === 'turmas' ? '#fff' : 'var(--text-secondary)',
            fontSize: '0.72rem',
            padding: '2px 8px',
            borderRadius: '1rem',
            fontWeight: '700'
          }}>
            {enrollments.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: GERADOR DE CERTIFICADOS PPTX                                       */}
      {/* ========================================================================= */}
      {activeTab === 'generator' && (
        <div>
          
          {/* BARRA SUPERIOR UNIFICADA: Importar Turma & Template PPTX */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {/* Card: Carregador Rápido de Turma */}
            <div style={{
              backgroundColor: 'var(--surface)',
              border: selectedTurmaIdInGenerator ? '1.5px solid #0284c7' : '1px solid var(--border)',
              borderRadius: '1rem',
              padding: '1.15rem 1.35rem',
              boxShadow: selectedTurmaIdInGenerator ? '0 4px 14px rgba(2, 132, 199, 0.08)' : '0 2px 6px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '0.85rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={18} style={{ color: '#0284c7' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Vincular / Importar Alunos de uma Turma
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  {turmas.length} turmas cadastradas
                </span>
              </div>

              <div>
                <select
                  className="input"
                  value={selectedTurmaIdInGenerator || ''}
                  style={{
                    fontSize: '0.875rem',
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.65rem',
                    border: '1.5px solid #0284c7',
                    fontWeight: '600',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      handleClearTurmaLink();
                      return;
                    }
                    const found = turmas.find(t => String(t.id) === String(val));
                    if (found) handleLoadTurmaIntoGenerator(found);
                  }}
                >
                  <option value="">Selecione uma turma para carregar alunos e curso...</option>
                  
                  {turmas.some(t => t.status === 'Aberta' || !t.status) && (
                    <optgroup label="🟢 Turmas Abertas (Inscrições Ativas)">
                      {turmas
                        .filter(t => t.status === 'Aberta' || !t.status)
                        .map(t => {
                          const count = enrollments.filter(e => String(e.turma_id) === String(t.id)).length;
                          return (
                            <option key={t.id} value={t.id}>
                              {t.name} — {t.course_name || 'Geral'} ({count} aluno{count !== 1 ? 's' : ''})
                            </option>
                          );
                        })}
                    </optgroup>
                  )}

                  {turmas.some(t => t.status === 'Em Andamento') && (
                    <optgroup label="🔵 Turmas em Andamento">
                      {turmas
                        .filter(t => t.status === 'Em Andamento')
                        .map(t => {
                          const count = enrollments.filter(e => String(e.turma_id) === String(t.id)).length;
                          return (
                            <option key={t.id} value={t.id}>
                              {t.name} — {t.course_name || 'Geral'} ({count} aluno{count !== 1 ? 's' : ''})
                            </option>
                          );
                        })}
                    </optgroup>
                  )}

                  {turmas.some(t => t.status === 'Concluída') && (
                    <optgroup label="⚪ Turmas Concluídas">
                      {turmas
                        .filter(t => t.status === 'Concluída')
                        .map(t => {
                          const count = enrollments.filter(e => String(e.turma_id) === String(t.id)).length;
                          return (
                            <option key={t.id} value={t.id}>
                              {t.name} — {t.course_name || 'Geral'} ({count} aluno{count !== 1 ? 's' : ''})
                            </option>
                          );
                        })}
                    </optgroup>
                  )}
                </select>
              </div>

              {selectedTurmaIdInGenerator && (() => {
                const currentTurma = turmas.find(t => String(t.id) === String(selectedTurmaIdInGenerator));
                const studentCount = enrollments.filter(e => String(e.turma_id) === String(selectedTurmaIdInGenerator)).length;
                if (!currentTurma) return null;
                return (
                  <div style={{
                    backgroundColor: 'rgba(2, 132, 199, 0.06)',
                    border: '1px solid rgba(2, 132, 199, 0.25)',
                    borderRadius: '0.65rem',
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle size={16} style={{ color: '#0284c7' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0369a1' }}>
                        Turma ativa: {currentTurma.name}
                      </span>
                      <span style={{
                        backgroundColor: '#0284c7',
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        padding: '1px 7px',
                        borderRadius: '1rem'
                      }}>
                        {studentCount} aluno{studentCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={handleReloadTurmaStudents}
                        className="btn"
                        title="Recarregar inscrições mais recentes da turma"
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          padding: '0.3rem 0.65rem',
                          backgroundColor: '#fff',
                          border: '1px solid rgba(2, 132, 199, 0.35)',
                          color: '#0284c7',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <RefreshCw size={12} />
                        Sincronizar
                      </button>

                      <button
                        type="button"
                        onClick={handleClearTurmaLink}
                        className="btn"
                        title="Desvincular e personalizar livremente"
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          padding: '0.3rem 0.65rem',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <X size={12} />
                        Desvincular
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Card: Assinaturas Manuais da Turma (Em Lote) */}
            <div style={{
              backgroundColor: 'var(--surface)',
              border: '1.5px solid #8b5cf6',
              borderRadius: '1rem',
              padding: '1.25rem 1.4rem',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.9rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '0.55rem',
                    backgroundColor: 'rgba(139, 92, 246, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <PenTool size={17} style={{ color: '#8b5cf6' }} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                      Assinaturas Manuais da Turma (Em Lote)
                    </span>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Assine no celular desenhando com o dedo ou na tela • Replica em toda a turma
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenQrModal()}
                    className="btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      padding: '0.45rem 0.85rem',
                      backgroundColor: 'rgba(139, 92, 246, 0.08)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      color: '#7c3aed',
                      borderRadius: '0.6rem',
                      cursor: 'pointer'
                    }}
                    title="Escanear QR Code para assinar no celular"
                  >
                    <Smartphone size={14} />
                    📱 Assinar no Celular (QR Code)
                  </button>
                </div>
              </div>

              {/* Grid dos Papéis de Assinatura */}
              <div style={{ display: 'grid', gridTemplateColumns: certModel === 'modelo2' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '0.75rem' }}>
                {/* 1. Instrutor */}
                <div style={{
                  padding: '0.85rem',
                  borderRadius: '0.75rem',
                  backgroundColor: currentTurmaSignatures?.instructor?.dataUrl ? 'rgba(16, 185, 129, 0.05)' : 'var(--surface-hover)',
                  border: currentTurmaSignatures?.instructor?.dataUrl ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64268a', textTransform: 'uppercase' }}>
                        👨‍🏫 Instrutor(a)
                      </span>
                      {currentTurmaSignatures?.instructor?.dataUrl ? (
                        <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#059669', backgroundColor: '#ecfdf5', padding: '1px 6px', borderRadius: '1rem' }}>
                          Assinado Manualmente ✅
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#d97706', backgroundColor: '#fffbeb', padding: '1px 6px', borderRadius: '1rem' }}>
                          Padrão do Sistema ⚠️
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      {formData.instrutorNome || 'Adeylton da Silva Araújo'}
                    </div>

                    {currentTurmaSignatures?.instructor?.dataUrl && (
                      <div style={{
                        height: '42px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#ffffff',
                        borderRadius: '0.45rem',
                        border: '1px solid #e2e8f0',
                        marginBottom: '0.45rem',
                        padding: '2px'
                      }}>
                        <img src={currentTurmaSignatures.instructor.dataUrl} alt="Assinatura Manual" style={{ maxHeight: '38px', maxWidth: '90%', objectFit: 'contain' }} />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenSignatureModal('instructor')}
                      style={{
                        flex: 1,
                        padding: '0.4rem 0.65rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #7c3aed',
                        backgroundColor: '#7c3aed',
                        color: '#fff',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <PenTool size={12} />
                      {currentTurmaSignatures?.instructor?.dataUrl ? 'Refazer Desenho' : 'Desenhar na Tela'}
                    </button>
                    {currentTurmaSignatures?.instructor?.dataUrl && (
                      <button
                        type="button"
                        onClick={() => handleClearSignature('instructor')}
                        style={{
                          padding: '0.4rem 0.55rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #ef4444',
                          backgroundColor: 'transparent',
                          color: '#ef4444',
                          fontSize: '0.72rem',
                          cursor: 'pointer'
                        }}
                        title="Limpar e voltar ao padrão"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Responsável Técnico */}
                <div style={{
                  padding: '0.85rem',
                  borderRadius: '0.75rem',
                  backgroundColor: currentTurmaSignatures?.tech_lead?.dataUrl ? 'rgba(16, 185, 129, 0.05)' : 'var(--surface-hover)',
                  border: currentTurmaSignatures?.tech_lead?.dataUrl ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64268a', textTransform: 'uppercase' }}>
                        🛡️ Resp. Técnico
                      </span>
                      {currentTurmaSignatures?.tech_lead?.dataUrl ? (
                        <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#059669', backgroundColor: '#ecfdf5', padding: '1px 6px', borderRadius: '1rem' }}>
                          Assinado Manualmente ✅
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#d97706', backgroundColor: '#fffbeb', padding: '1px 6px', borderRadius: '1rem' }}>
                          Padrão do Sistema ⚠️
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      {certModel === 'modelo1' ? 'Eider Gomes do Nascimento' : 'Raimundo Fernandes Jr.'}
                    </div>

                    {currentTurmaSignatures?.tech_lead?.dataUrl && (
                      <div style={{
                        height: '42px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#ffffff',
                        borderRadius: '0.45rem',
                        border: '1px solid #e2e8f0',
                        marginBottom: '0.45rem',
                        padding: '2px'
                      }}>
                        <img src={currentTurmaSignatures.tech_lead.dataUrl} alt="Assinatura Manual" style={{ maxHeight: '38px', maxWidth: '90%', objectFit: 'contain' }} />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenSignatureModal('tech_lead')}
                      style={{
                        flex: 1,
                        padding: '0.4rem 0.65rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #7c3aed',
                        backgroundColor: '#7c3aed',
                        color: '#fff',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <PenTool size={12} />
                      {currentTurmaSignatures?.tech_lead?.dataUrl ? 'Refazer Desenho' : 'Desenhar na Tela'}
                    </button>
                    {currentTurmaSignatures?.tech_lead?.dataUrl && (
                      <button
                        type="button"
                        onClick={() => handleClearSignature('tech_lead')}
                        style={{
                          padding: '0.4rem 0.55rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #ef4444',
                          backgroundColor: 'transparent',
                          color: '#ef4444',
                          fontSize: '0.72rem',
                          cursor: 'pointer'
                        }}
                        title="Limpar e voltar ao padrão"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Coordenação / 2º Resp (apenas Modelo 2) */}
                {certModel === 'modelo2' && (
                  <div style={{
                    padding: '0.85rem',
                    borderRadius: '0.75rem',
                    backgroundColor: currentTurmaSignatures?.coordinator?.dataUrl ? 'rgba(16, 185, 129, 0.05)' : 'var(--surface-hover)',
                    border: currentTurmaSignatures?.coordinator?.dataUrl ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64268a', textTransform: 'uppercase' }}>
                          ⚡ Coordenação / 2º Resp.
                        </span>
                        {currentTurmaSignatures?.coordinator?.dataUrl ? (
                          <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#059669', backgroundColor: '#ecfdf5', padding: '1px 6px', borderRadius: '1rem' }}>
                            Assinado ✅
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#d97706', backgroundColor: '#fffbeb', padding: '1px 6px', borderRadius: '1rem' }}>
                            Padrão ⚠️
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                        {formData.curso?.toLowerCase().includes('aph') ? 'Leiliana Nunes Fernandes' : 'Cezar Augusto Galvão'}
                      </div>

                      {currentTurmaSignatures?.coordinator?.dataUrl && (
                        <div style={{
                          height: '42px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#ffffff',
                          borderRadius: '0.45rem',
                          border: '1px solid #e2e8f0',
                          marginBottom: '0.45rem',
                          padding: '2px'
                        }}>
                          <img src={currentTurmaSignatures.coordinator.dataUrl} alt="Assinatura Manual" style={{ maxHeight: '38px', maxWidth: '90%', objectFit: 'contain' }} />
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenSignatureModal('coordinator')}
                        style={{
                          flex: 1,
                          padding: '0.4rem 0.65rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #7c3aed',
                          backgroundColor: '#7c3aed',
                          color: '#fff',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <PenTool size={12} />
                        {currentTurmaSignatures?.coordinator?.dataUrl ? 'Refazer Desenho' : 'Desenhar na Tela'}
                      </button>
                      {currentTurmaSignatures?.coordinator?.dataUrl && (
                        <button
                          type="button"
                          onClick={() => handleClearSignature('coordinator')}
                          style={{
                            padding: '0.4rem 0.55rem',
                            borderRadius: '0.5rem',
                            border: '1px solid #ef4444',
                            backgroundColor: 'transparent',
                            color: '#ef4444',
                            fontSize: '0.72rem',
                            cursor: 'pointer'
                          }}
                          title="Limpar e voltar ao padrão"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Lembrete sobre a Assinatura do Aluno */}
              <div style={{
                padding: '0.6rem 0.85rem',
                backgroundColor: 'rgba(2, 132, 199, 0.05)',
                borderRadius: '0.65rem',
                border: '1px solid rgba(2, 132, 199, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.4rem',
                fontSize: '0.73rem',
                color: '#0369a1'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span>🔒</span>
                  <span>
                    <strong>Assinatura do Aluno:</strong> Permanece sempre <strong>PENDENTE</strong> para assinatura presencial de cada participante ao receber seu certificado.
                  </span>
                </div>
                <span style={{ fontWeight: '700', color: '#0284c7' }}>
                  Padrão Oficial TotalSafety
                </span>
              </div>
            </div>

            {/* Card: Arquivo de Modelo PPTX */}
            <div style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '1rem',
              padding: '1.15rem 1.35rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <Layers size={18} style={{ color: '#0284c7' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Modelo de Certificado (.pptx)
                  </span>
                  {customTemplateFile ? (
                    <span style={{ 
                      backgroundColor: '#dcfce7', 
                      color: '#15803d', 
                      fontSize: '0.7rem', 
                      fontWeight: '700', 
                      padding: '0.15rem 0.55rem', 
                      borderRadius: '1rem' 
                    }}>
                      Personalizado
                    </span>
                  ) : (
                    <span style={{ 
                      backgroundColor: '#f1f5f9', 
                      color: '#475569', 
                      fontSize: '0.7rem', 
                      fontWeight: '700', 
                      padding: '0.15rem 0.55rem', 
                      borderRadius: '1rem' 
                    }}>
                      Padrão TotalSafety
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {customTemplateFile 
                    ? `Arquivo: "${customTemplateFile.name}" (${(customTemplateFile.size / 1024).toFixed(1)} KB)`
                    : 'Usando slide mestre oficial com frente e verso.'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".pptx" 
                  onChange={handleTemplateUpload} 
                  style={{ display: 'none' }} 
                />

                <button
                  type="button"
                  className="btn"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ 
                    backgroundColor: 'var(--surface-hover)', 
                    border: '1px solid var(--border)',
                    fontSize: '0.8rem', 
                    fontWeight: '600',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.35rem',
                    padding: '0.5rem 0.8rem'
                  }}
                >
                  <Upload size={14} />
                  {customTemplateFile ? 'Trocar PPTX' : 'Carregar PPTX'}
                </button>

                {customTemplateFile && (
                  <button
                    type="button"
                    className="btn"
                    onClick={removeCustomTemplate}
                    title="Restaurar modelo padrão TotalSafety"
                    style={{ 
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border)',
                      fontSize: '0.8rem', 
                      color: 'var(--danger)',
                      padding: '0.5rem 0.75rem'
                    }}
                  >
                    Restaurar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* GRID PRINCIPAL: DADOS DO TREINAMENTO (ESQ) + ALUNOS & PREVIEW (DIR)      */}
          {/* ========================================================================= */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(380px, 1.25fr) minmax(420px, 1.4fr)',
            gap: '1.5rem',
            alignItems: 'start'
          }}>
            
            {/* ------------------------------------------------------------- */}
            {/* COLUNA ESQUERDA: FORMULÁRIO DO TREINAMENTO & INSTRUTOR       */}
            {/* ------------------------------------------------------------- */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Card 1: Identificação do Curso & Chips Rápidos */}
              <div style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '1rem',
                padding: '1.4rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.15rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BookOpen size={18} style={{ color: '#0284c7' }} />
                    Informações do Treinamento
                  </h2>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Frente do Certificado
                  </span>
                </div>

                {/* Treinamento / Curso Oficial */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                    <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <BookOpen size={15} style={{ color: '#0284c7' }} />
                      Treinamento Oficial / Norma Regulamentadora (NR) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomCourse(!isCustomCourse)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0284c7',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      {isCustomCourse ? '↺ Escolher da Lista Oficial' : '✏️ Digitar Título Livre'}
                    </button>
                  </div>

                  {!isCustomCourse ? (
                    <div style={{ position: 'relative' }}>
                      <select
                        className="input"
                        value={
                          COURSE_PRESETS.some(p => 
                            p.name?.trim().toLowerCase() === formData.curso?.trim().toLowerCase() ||
                            p.title?.trim().toLowerCase() === formData.curso?.trim().toLowerCase()
                          ) 
                            ? COURSE_PRESETS.find(p => 
                                p.name?.trim().toLowerCase() === formData.curso?.trim().toLowerCase() ||
                                p.title?.trim().toLowerCase() === formData.curso?.trim().toLowerCase()
                              ).id 
                            : 'custom'
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setIsCustomCourse(true);
                          } else {
                            const found = COURSE_PRESETS.find(p => p.id === val);
                            if (found) applyPreset(found);
                          }
                        }}
                        style={{
                          width: '100%',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          padding: '0.65rem 2.2rem 0.65rem 0.85rem',
                          borderRadius: '0.65rem',
                          border: '1.5px solid #0284c7',
                          backgroundColor: 'var(--surface)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          appearance: 'none'
                        }}
                      >
                        <option value="" disabled>Selecione um modelo oficial de treinamento...</option>
                        
                        {Array.from(new Set(COURSE_PRESETS.map(p => p.category))).map(cat => (
                          <optgroup key={cat} label={`📂 ${cat}`}>
                            {COURSE_PRESETS.filter(p => p.category === cat).map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}

                        <option value="custom">✏️ Outro Treinamento (digitar título livre)...</option>
                      </select>
                      <div style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#0284c7' }}>
                        <ChevronDown size={18} />
                      </div>
                    </div>
                  ) : (
                    <input
                      type="text"
                      name="curso"
                      className="input"
                      value={formData.curso}
                      onChange={handleChange}
                      placeholder="Ex: NR-35 Trabalho em Altura / Brigada de Incêndio"
                      autoFocus
                      style={{ width: '100%', fontSize: '0.9rem', fontWeight: '600', border: '1.5px solid #0284c7' }}
                    />
                  )}
                </div>

                {/* Chips de Seleção Rápida */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginRight: '0.15rem' }}>
                      Atalhos Rápidos:
                    </span>
                    {[
                      { label: 'NR-35 Básico (8h)', id: 'nr35-basico' },
                      { label: 'NR-35 Avançado (24h)', id: 'nr35-avancado' },
                      { label: 'NR-10 Elétrica (40h)', id: 'nr10-basico' },
                      { label: 'NR-10 SEP (40h)', id: 'nr10-sep' },
                      { label: 'NR-33 Vigia (16h)', id: 'nr33-trabalhador' },
                      { label: 'NR-33 Supervisor (40h)', id: 'nr33-supervisor' },
                      { label: 'NR-18 Construção (4h)', id: 'nr18-basico' },
                      { label: 'NR-06 EPI (16h)', id: 'nr06-epi' },
                      { label: 'Brigada Incêndio (24h)', id: 'brigada-incendio' },
                      { label: 'APH (100h)', id: 'aph-100h' },
                      { label: 'NR-11 Empilhadeira (16h)', id: 'nr11-empilhadeira' },
                      { label: 'Inspetor EPI (16h)', id: 'inspetor-epi' },
                      { label: '1º Socorros (8h)', id: 'primeiros-socorros' }
                    ].map((item, idx) => {
                      const preset = COURSE_PRESETS.find(p => p.id === item.id);
                      const isSelected = preset && (
                        formData.curso === preset.title || 
                        formData.curso === preset.name
                      );
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (preset) {
                              setIsCustomCourse(false);
                              applyPreset(preset);
                            }
                          }}
                          style={{
                            backgroundColor: isSelected ? '#0284c7' : 'var(--surface-hover)',
                            border: isSelected ? '1px solid #0284c7' : '1px solid var(--border)',
                            color: isSelected ? '#fff' : 'var(--text-primary)',
                            borderRadius: '1.25rem',
                            padding: '0.2rem 0.65rem',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Carga Horária e Data */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                      <Clock size={14} style={{ color: '#0284c7' }} />
                      Carga Horária *
                    </label>
                    <input
                      type="text"
                      name="duracao"
                      className="input"
                      value={formData.duracao}
                      onChange={handleChange}
                      placeholder="Ex: 8 horas"
                      style={{ width: '100%', fontSize: '0.875rem', fontWeight: '600' }}
                    />
                    {/* Atalhos de Carga Horária */}
                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                      {['4 horas', '8 horas', '16 horas', '20 horas', '40 horas'].map((h) => {
                        const isSel = formData.duracao === h;
                        return (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, duracao: h }))}
                            style={{
                              padding: '0.18rem 0.5rem',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              borderRadius: '0.4rem',
                              border: isSel ? '1px solid #0284c7' : '1px solid var(--border)',
                              backgroundColor: isSel ? 'rgba(2, 132, 199, 0.12)' : 'var(--surface-hover)',
                              color: isSel ? '#0284c7' : 'var(--text-secondary)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {h.replace(' horas', 'h')}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                      <Calendar size={14} style={{ color: '#0284c7' }} />
                      Data de Conclusão *
                    </label>
                    <input
                      type="date"
                      name="data"
                      className="input"
                      value={formData.data}
                      onChange={handleChange}
                      style={{ width: '100%', fontSize: '0.875rem', fontWeight: '600' }}
                    />
                  </div>
                </div>

                {/* Local e Empresa Solicitante */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                      <MapPin size={14} style={{ color: '#0284c7' }} />
                      Local / Cidade
                    </label>
                    <input
                      type="text"
                      name="local"
                      className="input"
                      value={formData.local}
                      onChange={handleChange}
                      placeholder="Ex: Mossoró - RN"
                      style={{ width: '100%', fontSize: '0.875rem' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                        <Building size={14} style={{ color: '#0284c7' }} />
                        Empresa Solicitante
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCustomCompany(!isCustomCompany)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0284c7',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          padding: '1px 3px'
                        }}
                      >
                        {isCustomCompany ? '↺ Lista' : '✏️ Digitar outra'}
                      </button>
                    </div>

                    {!isCustomCompany ? (
                      <div style={{ position: 'relative' }}>
                        <select
                          className="input"
                          value={
                            companies.some(c => c.name.toLowerCase() === formData.empresa?.trim().toLowerCase())
                              ? companies.find(c => c.name.toLowerCase() === formData.empresa?.trim().toLowerCase()).id
                              : (formData.empresa === 'TotalSafety' ? 'totalsafety' : 'custom')
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'totalsafety') {
                              setFormData(prev => ({ ...prev, empresa: 'TotalSafety' }));
                            } else if (val === 'custom') {
                              setIsCustomCompany(true);
                            } else {
                              const found = companies.find(c => String(c.id) === String(val));
                              if (found) {
                                setFormData(prev => ({ ...prev, empresa: found.name }));
                              }
                            }
                          }}
                          style={{
                            width: '100%',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            padding: '0.6rem 2rem 0.6rem 0.75rem',
                            borderRadius: '0.55rem',
                            appearance: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="totalsafety">TotalSafety (Padrão)</option>
                          {companies.length > 0 && (
                            <optgroup label="Empresas Cadastradas">
                              {[...companies]
                                .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                                .map(c => {
                                  const grp = groups.find(g => g.id === c.groupId);
                                  return (
                                    <option key={c.id} value={c.id}>
                                      {c.name} {grp ? `— ${grp.name.replace(/^\d+\s*-\s*/, '')}` : ''}
                                    </option>
                                  );
                                })}
                            </optgroup>
                          )}
                          <option value="custom">✏️ Outra Empresa (digitar livremente)...</option>
                        </select>
                        <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                          <ChevronDown size={15} />
                        </div>
                      </div>
                    ) : (
                      <input
                        type="text"
                        name="empresa"
                        className="input"
                        value={formData.empresa}
                        onChange={handleChange}
                        placeholder="Nome da empresa contratante..."
                        autoFocus
                        style={{ width: '100%', fontSize: '0.85rem' }}
                      />
                    )}
                  </div>
                </div>

                {/* Descrição / Texto de Conclusão */}
                <div>
                  <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>
                    Texto de Certificação / Aproveitamento
                  </label>
                  <textarea
                    name="descricao"
                    className="input"
                    value={formData.descricao}
                    onChange={handleChange}
                    rows={2}
                    style={{ width: '100%', marginTop: '0.35rem', resize: 'vertical', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Card 2: Instrutor Responsável (Usuário do Sistema) */}
              <div style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '1rem',
                padding: '1.4rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.15rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <UserCheck size={18} style={{ color: '#0284c7' }} />
                    Instrutor Responsável Técnico
                  </h2>
                  <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <ShieldCheck size={13} />
                    Credencial Oficial
                  </span>
                </div>

                {/* Seletor Integrado com Usuários */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                    <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem', margin: 0 }}>
                      Selecionar Instrutor Credenciado:
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsEditingInstructor(!isEditingInstructor)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0284c7',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        padding: '1px 3px'
                      }}
                    >
                      {isEditingInstructor ? '✓ Concluir edição' : '✏️ Ajustar dados'}
                    </button>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <select
                      className="input"
                      value={profiles.some(p => p.name.trim().toLowerCase() === formData.instrutorNome?.trim().toLowerCase()) ? formData.instrutorNome : 'custom'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setIsEditingInstructor(true);
                        } else if (val) {
                          const sel = profiles.find(p => p.name === val);
                          setFormData(prev => ({
                            ...prev,
                            instrutorNome: sel ? sel.name : val,
                            instrutorCargo: sel?.role || prev.instrutorCargo,
                            instrutorRegistro: sel?.registration || prev.instrutorRegistro
                          }));
                        }
                      }}
                      style={{
                        width: '100%',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        padding: '0.65rem 2.2rem 0.65rem 0.85rem',
                        borderRadius: '0.65rem',
                        border: '1.5px solid #0284c7',
                        backgroundColor: 'var(--surface)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        appearance: 'none'
                      }}
                    >
                      <option value="" disabled>Selecione um instrutor credenciado...</option>
                      <optgroup label="👥 Usuários Cadastrados no Sistema TotalSafety">
                        {profiles.map(p => (
                          <option key={p.id} value={p.name}>
                            {p.name} {p.role ? `— ${p.role}` : ''}
                          </option>
                        ))}
                      </optgroup>
                      <option value="custom">✏️ Outro Instrutor / Digitar Manualmente</option>
                    </select>
                    <div style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#0284c7' }}>
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>

                {/* Badge / Card Visual do Instrutor Selecionado */}
                {formData.instrutorNome && (
                  <div style={{
                    backgroundColor: 'rgba(2, 132, 199, 0.05)',
                    border: '1px solid rgba(2, 132, 199, 0.2)',
                    borderRadius: '0.75rem',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      backgroundColor: '#0284c7',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800',
                      fontSize: '0.9rem',
                      flexShrink: 0
                    }}>
                      {formData.instrutorNome.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                          {formData.instrutorNome}
                        </span>
                        {profiles.some(p => p.name.trim().toLowerCase() === formData.instrutorNome.trim().toLowerCase()) ? (
                          <span style={{
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            padding: '1px 6px',
                            borderRadius: '0.75rem'
                          }}>
                            ✓ Usuário do Sistema
                          </span>
                        ) : (
                          <span style={{
                            backgroundColor: '#fef3c7',
                            color: '#b45309',
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            padding: '1px 6px',
                            borderRadius: '0.75rem'
                          }}>
                            Instrutor Externo
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        {formData.instrutorCargo || 'Instrutor e Responsável Técnico'} • {formData.instrutorRegistro || 'SRTE N° 0009823/RN'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Campos do Instrutor para ajuste fino */}
                {isEditingInstructor && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', animation: 'fadeIn 0.2s ease' }}>
                    <div>
                      <label className="modal-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        Nome Completo do Instrutor
                      </label>
                      <input
                        type="text"
                        name="instrutorNome"
                        className="input"
                        value={formData.instrutorNome}
                        onChange={handleChange}
                        placeholder="Nome do Instrutor"
                        style={{ width: '100%', marginTop: '0.25rem' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label className="modal-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                          Cargo / Qualificação
                        </label>
                        <input
                          type="text"
                          name="instrutorCargo"
                          className="input"
                          value={formData.instrutorCargo}
                          onChange={handleChange}
                          placeholder="Ex: Técnico em Segurança do Trabalho"
                          style={{ width: '100%', marginTop: '0.25rem' }}
                        />
                      </div>
                      <div>
                        <label className="modal-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                          Registro Profissional (MTE / SRTE)
                        </label>
                        <input
                          type="text"
                          name="instrutorRegistro"
                          className="input"
                          value={formData.instrutorRegistro}
                          onChange={handleChange}
                          placeholder="Ex: SRTE N° 0009823/RN"
                          style={{ width: '100%', marginTop: '0.25rem' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 3: Conteúdo Programático (Verso do Certificado) */}
              <div style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '1rem',
                padding: '1.4rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={18} style={{ color: '#0284c7' }} />
                    Conteúdo Programático (Verso)
                  </h2>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Slide 2 de cada aluno
                  </span>
                </div>

                <textarea
                  name="conteudo"
                  className="input"
                  value={formData.conteudo}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Itens do conteúdo programático que serão impressos no verso do certificado..."
                  style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8125rem', lineHeight: '1.5' }}
                />
              </div>

            </div>

            {/* ------------------------------------------------------------- */}
            {/* COLUNA DIREITA: PREVIEW DO CERTIFICADO + ALUNOS + EMISSÃO    */}
            {/* ------------------------------------------------------------- */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* CARD PREVIEW INTERATIVO DO CERTIFICADO */}
              <div style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '1rem',
                padding: '1.25rem',
                boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
                background: 'linear-gradient(180deg, var(--surface) 0%, rgba(2, 132, 199, 0.02) 100%)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Eye size={17} style={{ color: '#0284c7' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Pré-visualização do Certificado
                    </span>
                  </div>

                  {/* Toggle Frente / Verso */}
                  <div style={{
                    display: 'flex',
                    backgroundColor: 'var(--surface-hover)',
                    borderRadius: '0.5rem',
                    padding: '2px',
                    border: '1px solid var(--border)'
                  }}>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('frente')}
                      style={{
                        padding: '0.25rem 0.65rem',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        borderRadius: '0.35rem',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: previewTab === 'frente' ? '#0284c7' : 'transparent',
                        color: previewTab === 'frente' ? '#fff' : 'var(--text-secondary)'
                      }}
                    >
                      Frente (Slide 1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('verso')}
                      style={{
                        padding: '0.25rem 0.65rem',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        borderRadius: '0.35rem',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: previewTab === 'verso' ? '#0284c7' : 'transparent',
                        color: previewTab === 'verso' ? '#fff' : 'var(--text-secondary)'
                      }}
                    >
                      Verso (Slide 2)
                    </button>
                  </div>
                </div>

                {/* SELETOR INTERATIVO DOS 2 MODELOS OFICIAIS */}
                <div style={{
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  backgroundColor: 'var(--surface-hover)',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Layers size={15} style={{ color: '#8b5cf6' }} />
                      <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Modelo Visual Oficial:
                      </span>
                    </div>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: '700', 
                      color: certModel === 'modelo1' ? '#6d28d9' : '#ea580c',
                      backgroundColor: certModel === 'modelo1' ? 'rgba(109, 40, 217, 0.1)' : 'rgba(234, 88, 12, 0.1)',
                      padding: '0.15rem 0.6rem',
                      borderRadius: '1rem'
                    }}>
                      {certModel === 'modelo1' ? '🟣 Modelo 1 Ativo (EcoCurvas Laterais)' : '⚡ Modelo 2 Ativo (Ondas & Colmeia Tech)'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
                    {/* Botão Modelo 1 */}
                    <button
                      type="button"
                      onClick={() => setCertModel('modelo1')}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '0.6rem',
                        border: certModel === 'modelo1' ? '2px solid #7c3aed' : '1px solid var(--border)',
                        backgroundColor: certModel === 'modelo1' ? 'rgba(124, 58, 237, 0.08)' : 'var(--surface)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: certModel === 'modelo1' ? '#6d28d9' : 'var(--text-primary)' }}>
                          🟣 Modelo 1: EcoCurvas
                        </span>
                        {certModel === 'modelo1' && <CheckCircle2 size={13} style={{ color: '#7c3aed' }} />}
                      </div>
                      <span style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', lineHeight: '1.25' }}>
                        Curvas laterais roxas, banner no topo, texto contínuo justificado, 3 assinaturas e verso em 1 coluna.
                      </span>
                    </button>

                    {/* Botão Modelo 2 */}
                    <button
                      type="button"
                      onClick={() => setCertModel('modelo2')}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '0.6rem',
                        border: certModel === 'modelo2' ? '2px solid #ea580c' : '1px solid var(--border)',
                        backgroundColor: certModel === 'modelo2' ? 'rgba(234, 88, 12, 0.08)' : 'var(--surface)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: certModel === 'modelo2' ? '#c2410c' : 'var(--text-primary)' }}>
                          ⚡ Modelo 2: Ondas & Colmeia
                        </span>
                        {certModel === 'modelo2' && <CheckCircle2 size={13} style={{ color: '#ea580c' }} />}
                      </div>
                      <span style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', lineHeight: '1.25' }}>
                        Ondas roxo/laranja, malha hexagonal, nome em Azul Real, 4 assinaturas e verso em 2 colunas.
                      </span>
                    </button>
                  </div>
                </div>

                {/* MOLDURA DO CERTIFICADO MOCKUP REALISTA (EXATAMENTE COMO O PDF SELECIONADO) */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '1.414 / 1',
                  borderRadius: '0.85rem',
                  overflow: 'hidden',
                  backgroundColor: '#ffffff',
                  backgroundImage: certModel === 'modelo1'
                    ? `url(${previewTab === 'frente' ? '/certificate-templates/m1_frente_bg.jpg' : '/certificate-templates/m1_verso_bg.jpg'})`
                    : `url(${previewTab === 'frente' ? '/certificate-templates/m2_frente_bg.png?v=pristine_v4' : '/certificate-templates/m2_verso_bg.png?v=pristine_v4'})`,
                  backgroundSize: '100% 100%',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.06)',
                  border: certModel === 'modelo1' ? '1.5px solid rgba(100, 38, 138, 0.35)' : '1.5px solid rgba(51, 64, 230, 0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: certModel === 'modelo1' ? '3.5% 9.5% 3.5% 9.5%' : '3% 7% 3% 7%',
                  boxSizing: 'border-box',
                  fontFamily: certModel === 'modelo1' ? "'Roboto', 'Lato', sans-serif" : "'Lato', 'Montserrat', sans-serif"
                }}>
                  {/* ========================================================================= */}
                  {/* RENDERIZAÇÃO: MODELO 1 (EcoCurvas Laterais - Roxo Oficial EcoSafety)       */}
                  {/* ========================================================================= */}
                  {certModel === 'modelo1' ? (
                    previewTab === 'frente' ? (
                      /* MODELO 1 - FRENTE */
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', fontFamily: "'Roboto', sans-serif" }}>
                        {/* Topo: Header Banner Oficial com Logomarca EcoSafety e Título */}
                        <div style={{ textAlign: 'center' }}>
                          <img 
                            src="/certificate-templates/m1_header_transparent.png" 
                            alt="EcoSafety Certificado de Capacitação" 
                            style={{ width: '100%', maxHeight: '56px', objectFit: 'contain' }} 
                          />
                        </div>

                        {/* Corpo: Texto Narrativo Justificado Contínuo (Roboto, Preto Absoluto #000000) */}
                        <div style={{ 
                          fontFamily: "'Roboto', sans-serif",
                          fontSize: '0.67rem', 
                          lineHeight: '1.52', 
                          textAlign: 'justify', 
                          color: '#000000', 
                          margin: '0.3rem 0' 
                        }}>
                          A ECOSAFETY certifica que: <strong style={{ color: '#000000', fontWeight: '700' }}>{firstStudent?.nome ? firstStudent.nome.toUpperCase() : 'NOME DO PARTICIPANTE'}</strong>. Portador do CPF: <strong style={{ color: '#000000', fontWeight: '700' }}>{firstStudent?.cpf ? firstStudent.cpf : '000.000.000-00'}</strong> e Matrícula: <strong style={{ color: '#000000', fontWeight: '700' }}>{firstStudent?.matricula || '266522'}</strong>, completou com aprovação no período de <strong style={{ color: '#000000', fontWeight: '700' }}>{formData.data ? new Date(formData.data + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data'}</strong> na cidade de <strong style={{ color: '#000000', fontWeight: '700' }}>{formData.local || 'Mossoró/RN'}</strong>, o treinamento de <strong style={{ color: '#000000', fontWeight: '700' }}>{formData.curso}</strong>. {formData.descricao}
                          <div style={{ marginTop: '0.4rem', textAlign: 'left', fontWeight: '400', color: '#000000' }}>
                            {formData.local || 'Mossoró/RN'}, Brasil, {formData.data ? new Date(formData.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Data'}.
                          </div>
                        </div>

                        {/* Rodapé: 3 Assinaturas com Traços e Tipografia em Roxo Oficial EcoSafety #64268a */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '0.45rem',
                          alignItems: 'end',
                          textAlign: 'center',
                          marginTop: '0.35rem',
                          fontFamily: "'Lato', sans-serif"
                        }}>
                          {/* Coluna 1: Responsável Técnico */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <img src={currentTurmaSignatures?.tech_lead?.dataUrl || "/certificate-templates/signatures/sig_eider_gomes.png"} alt="Assinatura" style={{ height: '24px', objectFit: 'contain', marginBottom: '2px' }} />
                            <div style={{ borderTop: '1px solid #64268a', width: '92%', paddingTop: '2px' }}>
                              <div style={{ fontSize: '0.54rem', fontWeight: '700', color: '#64268a', textTransform: 'uppercase', letterSpacing: '0.2px' }}>RESPONSAVEL TÉCNICO</div>
                              <div style={{ fontSize: '0.51rem', fontWeight: '700', color: '#64268a' }}>Eider Gomes do Nascimento</div>
                              <div style={{ fontSize: '0.48rem', color: '#64268a' }}>Registro: MTE0009995/RN</div>
                            </div>
                          </div>

                          {/* Coluna 2: Aluno (PENDENTE) */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '0.5rem', letterSpacing: '0.3px' }}>[ Assinatura Pendente ]</span>
                            </div>
                            <div style={{ borderTop: '1px solid #64268a', width: '92%', paddingTop: '2px' }}>
                              <div style={{ fontSize: '0.54rem', fontWeight: '700', color: '#64268a' }}>ALUNO:</div>
                              <div style={{ fontSize: '0.51rem', color: '#64268a', fontWeight: '700' }}>{firstStudent?.nome ? firstStudent.nome.toUpperCase() : 'PARTICIPANTE'}</div>
                            </div>
                          </div>

                          {/* Coluna 3: Instrutor (Vinculado ao Dono) */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <img src={currentTurmaSignatures?.instructor?.dataUrl || getInstructorSignatureUrl(formData.instrutorNome)} alt="Assinatura" style={{ height: '24px', objectFit: 'contain', marginBottom: '2px' }} />
                            <div style={{ borderTop: '1px solid #64268a', width: '92%', paddingTop: '2px' }}>
                              <div style={{ fontSize: '0.54rem', fontWeight: '700', color: '#64268a', textTransform: 'uppercase', letterSpacing: '0.2px' }}>INSTRUTOR:</div>
                              <div style={{ fontSize: '0.51rem', color: '#64268a', fontWeight: '700' }}>{formData.instrutorNome || 'Pedro Henrique Lima Padilha'}</div>
                              <div style={{ fontSize: '0.48rem', color: '#64268a' }}>{formData.instrutorRegistro ? `Registro: ${formData.instrutorRegistro}` : 'MTE 0122480/SP'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* MODELO 1 - VERSO (Conteúdo em 1 Coluna Limpa - Lato & Cinza Nobre #595959) */
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', fontFamily: "'Lato', sans-serif" }}>
                        <div>
                          <div style={{ borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.35rem', marginBottom: '0.4rem' }}>
                            <div style={{ fontSize: '0.74rem', fontWeight: '700', color: '#595959' }}>
                              Programa: <span style={{ color: '#64268a' }}>{formData.curso}</span>
                            </div>
                            <div style={{ fontSize: '0.66rem', color: '#595959', fontWeight: '400', marginTop: '2px' }}>
                              Carga horária: {formData.duracao}
                            </div>
                          </div>

                          <div style={{ 
                            fontSize: '0.63rem', 
                            color: '#000000', 
                            lineHeight: '1.45', 
                            maxHeight: '190px', 
                            overflowY: 'auto', 
                            paddingRight: '0.4rem',
                            whiteSpace: 'pre-line'
                          }}>
                            {formData.conteudo}
                          </div>
                        </div>

                        <div style={{
                          textAlign: 'center',
                          fontSize: '0.56rem',
                          fontWeight: '700',
                          color: '#595959',
                          letterSpacing: '0.4px',
                          borderTop: '1px solid #e2e8f0',
                          paddingTop: '0.35rem'
                        }}>
                          ECOSAFETY • CNPJ 50.710.500/0001-95 • ESSE TREINAMENTO TEM VALIDADE DE {formData.validade ? formData.validade.toUpperCase() : '24 MESES'}
                        </div>
                      </div>
                    )
                  ) : (
                    /* ========================================================================= */
                    /* RENDERIZAÇÃO: MODELO 2 (Ondas Diagonais & Colmeia Tech - Padrão Fiel PDF) */
                    /* ========================================================================= */
                    previewTab === 'frente' ? (
                      /* MODELO 2 - FRENTE */
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', fontFamily: "'Lato', sans-serif" }}>
                        {/* Topo do Certificado */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ 
                            fontFamily: "'Montserrat', sans-serif",
                            fontSize: '1.05rem', 
                            fontWeight: '800', 
                            color: '#595959', 
                            letterSpacing: '1.5px', 
                            textTransform: 'uppercase' 
                          }}>
                            CERTIFICADO DE CAPACITAÇÃO
                          </div>
                          <div style={{ fontSize: '0.72rem', fontWeight: '400', color: '#000000', marginTop: '1px' }}>
                            A ECOSAFETY certifica que:
                          </div>

                          {/* Destaque do Nome em Azul Real Oficial #3340e6 com Lato Black 900 */}
                          <div style={{ 
                            fontFamily: "'Lato', sans-serif",
                            fontSize: '1.18rem', 
                            fontWeight: '900', 
                            color: '#3340e6', 
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            margin: '0.28rem 0'
                          }}>
                            {firstStudent?.nome ? firstStudent.nome.toUpperCase() : 'NOME DO PARTICIPANTE'}
                          </div>

                          <div style={{ fontSize: '0.65rem', color: '#000000', lineHeight: '1.4' }}>
                            Portador do CPF: <strong style={{ color: '#000000' }}>{firstStudent?.cpf ? firstStudent.cpf : '000.000.000-00'}</strong>, completou com aprovação no período de{' '}
                            <strong style={{ color: '#000000' }}>{formData.data ? new Date(formData.data + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data'}</strong> na ECOSAFETY TREINAMENTOS, o treinamento de:
                          </div>

                          <div style={{ 
                            fontSize: '0.88rem', 
                            fontWeight: '800', 
                            color: '#3340e6', 
                            margin: '0.22rem 0' 
                          }}>
                            {formData.curso}
                          </div>

                          {formData.descricao && (
                            <div style={{ 
                              fontSize: '0.6rem', 
                              color: '#000000', 
                              textAlign: 'justify', 
                              lineHeight: '1.34', 
                              maxWidth: '94%', 
                              margin: '0.15rem auto' 
                            }}>
                              {formData.descricao}
                            </div>
                          )}

                          <div style={{ fontSize: '0.63rem', color: '#000000', marginTop: '0.3rem' }}>
                            {formData.local || 'Mossoró, RN'}, Brasil, {formData.data ? new Date(formData.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Data'}.
                          </div>
                        </div>

                        {/* Rodapé: 4 Assinaturas com Linhas e Textos em Preto Oficial #000000 */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr 1fr',
                          gap: '0.35rem',
                          alignItems: 'end',
                          textAlign: 'center',
                          marginTop: '0.35rem',
                          fontFamily: "'Lato', sans-serif"
                        }}>
                          {/* Raimundo - Responsável Técnico Geral */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <img src={currentTurmaSignatures?.tech_lead?.dataUrl || "/certificate-templates/signatures/sig_raimundo_fernandes.png"} alt="Assinatura" style={{ height: '20px', objectFit: 'contain', marginBottom: '1px' }} />
                            <div style={{ borderTop: '1px solid #000000', width: '92%', paddingTop: '2px' }}>
                              <div style={{ fontSize: '0.48rem', fontWeight: '800', color: '#000000' }}>RESPONSAVEL TÉCNICO</div>
                              <div style={{ fontSize: '0.45rem', color: '#000000', fontWeight: '600' }}>Raimundo Fernandes de Oliveira Junior</div>
                              <div style={{ fontSize: '0.43rem', color: '#595959' }}>Registro CREA – 211204597-0</div>
                            </div>
                          </div>

                          {/* Cezar Augusto ou Leiliana Nunes (se APH) */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            {currentTurmaSignatures?.coordinator?.dataUrl ? (
                              <>
                                <img src={currentTurmaSignatures.coordinator.dataUrl} alt="Assinatura" style={{ height: '20px', objectFit: 'contain', marginBottom: '1px' }} />
                                <div style={{ borderTop: '1px solid #000000', width: '92%', paddingTop: '2px' }}>
                                  <div style={{ fontSize: '0.46rem', fontWeight: '800', color: '#000000' }}>COORDENADORA TÉCNICA / INSTRUTORA</div>
                                  <div style={{ fontSize: '0.43rem', color: '#000000', fontWeight: '600' }}>{currentTurmaSignatures.coordinator.signerName || 'Coordenação Técnica'}</div>
                                  <div style={{ fontSize: '0.41rem', color: '#595959' }}>Registro Oficial</div>
                                </div>
                              </>
                            ) : formData.curso?.toLowerCase().includes('aph') || formData.curso?.toLowerCase().includes('hospitalar') || formData.instrutorNome?.toLowerCase().includes('leiliana') ? (
                              <>
                                <img src="/certificate-templates/signatures/sig_leiliana_nunes.png" alt="Assinatura" style={{ height: '20px', objectFit: 'contain', marginBottom: '1px' }} />
                                <div style={{ borderTop: '1px solid #000000', width: '92%', paddingTop: '2px' }}>
                                  <div style={{ fontSize: '0.46rem', fontWeight: '800', color: '#000000' }}>COORDENADORA TÉCNICA / INSTRUTORA</div>
                                  <div style={{ fontSize: '0.43rem', color: '#000000', fontWeight: '600' }}>Leiliana Nunes de Lima Fernandes</div>
                                  <div style={{ fontSize: '0.41rem', color: '#595959' }}>Registro Coren RN 333018</div>
                                </div>
                              </>
                            ) : (
                              <>
                                <img src="/certificate-templates/signatures/sig_cezar_augusto.png" alt="Assinatura" style={{ height: '20px', objectFit: 'contain', marginBottom: '1px' }} />
                                <div style={{ borderTop: '1px solid #000000', width: '92%', paddingTop: '2px' }}>
                                  <div style={{ fontSize: '0.46rem', fontWeight: '800', color: '#000000' }}>RESPONSAVEL TÉCNICO / INSTRUTOR</div>
                                  <div style={{ fontSize: '0.43rem', color: '#595959' }}>Engenheiro Eletricista</div>
                                  <div style={{ fontSize: '0.43rem', color: '#000000', fontWeight: '600' }}>Cezar Augusto Galvão De P. Camêlo</div>
                                  <div style={{ fontSize: '0.41rem', color: '#595959' }}>CREA-RN 211051104-4</div>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Aluno (PENDENTE - sem imagem de assinatura falsa) */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.42rem', color: '#94a3b8', fontStyle: 'italic' }}>[ Assinatura Pendente ]</span>
                            </div>
                            <div style={{ borderTop: '1px solid #000000', width: '92%', paddingTop: '2px' }}>
                              <div style={{ fontSize: '0.48rem', fontWeight: '800', color: '#000000' }}>ALUNO</div>
                              <div style={{ fontSize: '0.45rem', color: '#3340e6', fontWeight: '700' }}>{firstStudent?.nome || 'Participante'}</div>
                            </div>
                          </div>

                          {/* Instrutor (Vinculado ao Dono) */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <img src={currentTurmaSignatures?.instructor?.dataUrl || getInstructorSignatureUrl(formData.instrutorNome)} alt="Assinatura" style={{ height: '20px', objectFit: 'contain', marginBottom: '1px' }} />
                            <div style={{ borderTop: '1px solid #000000', width: '92%', paddingTop: '2px' }}>
                              <div style={{ fontSize: '0.48rem', fontWeight: '800', color: '#000000' }}>INSTRUTOR</div>
                              <div style={{ fontSize: '0.45rem', color: '#000000', fontWeight: '700' }}>{formData.instrutorNome || 'Eider Gomes do Nascimento'}</div>
                              <div style={{ fontSize: '0.43rem', color: '#595959' }}>{formData.instrutorRegistro || 'MTE0009995/RN'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* MODELO 2 - VERSO (Conteúdo em 2 Colunas Balanceadas - Calibri & Times New Roman) */
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', fontFamily: "'Calibri', 'Lato', sans-serif" }}>
                        <div>
                          <div style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '0.3rem', marginBottom: '0.4rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#595959' }}>
                              Programa: <span style={{ color: '#3340e6' }}>{formData.curso}</span>
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#595959', fontWeight: '400', marginTop: '2px' }}>
                              Carga horária: {formData.duracao}
                            </div>
                          </div>

                          {/* 2 Colunas de Conteúdo com Times New Roman (Fiel ao PDF Original) */}
                          {(() => {
                            const lines = (formData.conteudo || '').split('\n').filter(l => l.trim().length > 0);
                            const mid = Math.ceil(lines.length / 2);
                            const col1 = lines.slice(0, mid).join('\n');
                            const col2 = lines.slice(mid).join('\n');
                            return (
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '1.1rem',
                                fontFamily: "'Times New Roman', Times, serif",
                                fontSize: '0.63rem',
                                color: '#000000',
                                lineHeight: '1.38',
                                maxHeight: '190px',
                                overflowY: 'auto',
                                paddingRight: '0.35rem'
                              }}>
                                <div style={{ whiteSpace: 'pre-line' }}>{col1}</div>
                                <div style={{ whiteSpace: 'pre-line' }}>{col2}</div>
                              </div>
                            );
                          })()}
                        </div>

                        <div style={{
                          textAlign: 'center',
                          fontSize: '0.56rem',
                          fontWeight: '600',
                          color: '#595959',
                          letterSpacing: '0.4px',
                          borderTop: '1px solid #e2e8f0',
                          paddingTop: '0.35rem'
                        }}>
                          ECOSAFETY • CNPJ 50.710.500/0001-95 • ESSE TREINAMENTO TEM VALIDADE DE {formData.validade ? formData.validade.toUpperCase() : '24 MESES'}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* CARD DE ALUNOS PARTICIPANTES */}
              <div style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '1rem',
                padding: '1.4rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  marginBottom: '1rem', 
                  flexWrap: 'wrap', 
                  gap: '0.5rem',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '0.75rem'
                }}>
                  <div>
                    <h2 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Users size={18} style={{ color: '#0284c7' }} />
                      Lista de Participantes ({colaboradores.length})
                    </h2>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {validCount} participante(s) com nome válido para emissão
                    </span>
                  </div>

                  {/* Ações da Lista */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setShowBatchModal(true)}
                      style={{ 
                        backgroundColor: 'var(--surface-hover)', 
                        border: '1px solid var(--border)',
                        fontSize: '0.78rem', 
                        fontWeight: '600',
                        padding: '0.45rem 0.75rem',
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.35rem' 
                      }}
                      title="Colar texto em lote com vários participantes"
                    >
                      <ClipboardCopy size={13} style={{ color: '#0284c7' }} />
                      Colar em Lote
                    </button>

                    <button
                      type="button"
                      className="btn"
                      onClick={addColaborador}
                      style={{ 
                        backgroundColor: 'rgba(2, 132, 199, 0.1)', 
                        border: '1px solid rgba(2, 132, 199, 0.25)',
                        color: '#0284c7',
                        fontSize: '0.78rem', 
                        fontWeight: '700',
                        padding: '0.45rem 0.8rem',
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.35rem' 
                      }}
                    >
                      <Plus size={14} />
                      Adicionar Aluno
                    </button>

                    {colaboradores.length > 1 && (
                      <button
                        type="button"
                        onClick={clearAllColaboradores}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '0.4rem',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Limpar todos os participantes"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista de Alunos com Scroll Suave */}
                <div style={{ 
                  maxHeight: '420px', 
                  overflowY: 'auto', 
                  paddingRight: '0.35rem',
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.55rem' 
                }}>
                  {colaboradores.map((colab, idx) => {
                    const isCpfValid = colab.cpf && colab.cpf.replace(/\D/g, '').length === 11;
                    return (
                      <div 
                        key={idx} 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.55rem',
                          backgroundColor: 'var(--surface-hover)',
                          padding: '0.55rem 0.85rem',
                          borderRadius: '0.75rem',
                          border: '1px solid var(--border)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {/* Avatar com Índice */}
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: colab.nome.trim() ? 'rgba(2, 132, 199, 0.15)' : 'var(--border)',
                          color: colab.nome.trim() ? '#0284c7' : 'var(--text-secondary)',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {idx + 1}
                        </div>

                        {/* Nome do Participante */}
                        <input
                          type="text"
                          className="input"
                          placeholder="Nome completo do participante"
                          value={colab.nome}
                          onChange={(e) => handleColabChange(idx, 'nome', e.target.value)}
                          style={{ flex: 2, fontSize: '0.85rem', padding: '0.45rem 0.75rem' }}
                        />

                        {/* CPF com Indicador de Formato */}
                        <div style={{ position: 'relative', flex: 1.2 }}>
                          <input
                            type="text"
                            className="input"
                            placeholder="000.000.000-00"
                            value={colab.cpf}
                            onChange={(e) => handleColabChange(idx, 'cpf', formatCpf(e.target.value))}
                            style={{ 
                              width: '100%', 
                              fontSize: '0.85rem', 
                              padding: '0.45rem 0.75rem', 
                              fontFamily: 'monospace',
                              paddingRight: isCpfValid ? '1.8rem' : '0.75rem'
                            }}
                            maxLength={14}
                          />
                          {isCpfValid && (
                            <Check 
                              size={14} 
                              style={{ 
                                position: 'absolute', 
                                right: '0.6rem', 
                                top: '50%', 
                                transform: 'translateY(-50%)', 
                                color: '#10b981' 
                              }} 
                            />
                          )}
                        </div>

                        {/* Botão Remover */}
                        <button
                          type="button"
                          onClick={() => removeColaborador(idx)}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: 'var(--text-secondary)', 
                            cursor: 'pointer', 
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'color 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                          title="Remover participante"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* BOTÃO PRINCIPAL DE GERAÇÃO PPTX */}
                <div style={{ marginTop: '1.25rem', paddingTop: '1.15rem', borderTop: '1px solid var(--border)' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)'
                  }}>
                    <span>Formato Oficial: <strong>Microsoft PowerPoint (.pptx)</strong></span>
                    <span>Total de slides: <strong>{validCount * 2} slides</strong> (Frente + Verso)</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating || validCount === 0}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.65rem',
                      fontSize: '1rem',
                      fontWeight: '800',
                      color: '#ffffff',
                      background: validCount === 0 
                        ? 'var(--border)' 
                        : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      border: 'none',
                      borderRadius: '0.85rem',
                      cursor: validCount === 0 || generating ? 'not-allowed' : 'pointer',
                      boxShadow: validCount === 0 ? 'none' : '0 10px 25px -5px rgba(2, 132, 199, 0.45)',
                      transition: 'all 0.2s ease',
                      opacity: generating ? 0.8 : 1
                    }}
                  >
                    {generating ? (
                      <>
                        <Loader size={20} className="animate-spin" />
                        Gerando Apresentação com {validCount} Certificados...
                      </>
                    ) : (
                      <>
                        <Download size={20} />
                        Baixar Certificados em PowerPoint (.pptx)
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: TURMAS & INSCRIÇÕES OFICIAIS                                       */}
      {/* ========================================================================= */}
      {activeTab === 'turmas' && (
        <div>
          {/* Card Hero: Link Público Geral */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(15, 23, 42, 0.03) 100%)',
            border: '1px solid rgba(2, 132, 199, 0.25)',
            borderRadius: '1.15rem',
            padding: '1.35rem 1.6rem',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.35rem' }}>
                <span style={{ 
                  backgroundColor: '#0284c7', 
                  color: '#fff', 
                  fontSize: '0.72rem', 
                  fontWeight: '700', 
                  padding: '2px 10px', 
                  borderRadius: '1rem',
                  textTransform: 'uppercase'
                }}>
                  Portal Público de Participação
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#10b981', fontWeight: '700' }}>
                  <ShieldCheck size={15} />
                  Validação Oficial Receita (CPF A)
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                Envie o link para os alunos preencherem a lista de presença com CPF e Data de Nascimento:
              </h3>
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <code style={{ 
                  backgroundColor: 'var(--surface)', 
                  border: '1px solid var(--border)', 
                  padding: '0.45rem 0.95rem', 
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#0284c7',
                  fontWeight: '700',
                  fontFamily: 'monospace'
                }}>
                  {window.location.origin}/inscricao
                </code>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => copyPublicLink(null, 'banner-general')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.45rem', 
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  padding: '0.65rem 1.15rem',
                  backgroundColor: '#0284c7',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                }}
              >
                {copiedKey === 'banner-general' ? <Check size={16} /> : <Copy size={16} />}
                {copiedKey === 'banner-general' ? 'Copiado para a Área de Transferência!' : 'Copiar Link Público'}
              </button>

              <a
                href="/inscricao"
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  padding: '0.65rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  textDecoration: 'none'
                }}
              >
                <Eye size={15} />
                Testar Formulário
              </a>
            </div>
          </div>

          {/* Seção de Turmas Cadastradas */}
          <div style={{ marginBottom: '2.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                  Turmas de Treinamento ({turmas.length})
                </h2>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Cada turma possui link próprio, instrutor do sistema e exportação direta de certificados.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenNewTurma}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.45rem', 
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  backgroundColor: '#0284c7',
                  padding: '0.6rem 1.15rem',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                }}
              >
                <Plus size={16} />
                Nova Turma
              </button>
            </div>

            {loadingData ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Loader size={26} className="animate-spin" style={{ margin: '0 auto 0.65rem', color: '#0284c7' }} />
                Carregando turmas...
              </div>
            ) : turmas.length === 0 ? (
              <div style={{
                padding: '3rem 2rem',
                textAlign: 'center',
                backgroundColor: 'var(--surface)',
                border: '1px dashed var(--border)',
                borderRadius: '1.25rem'
              }}>
                <Award size={40} style={{ color: 'var(--text-secondary)', margin: '0 auto 0.85rem', opacity: 0.4 }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  Nenhuma turma criada ainda
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', marginBottom: '1.25rem' }}>
                  Crie sua primeira turma selecionando um instrutor do sistema para gerar links de presença e certificados em lote.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleOpenNewTurma}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.875rem', fontWeight: '700', backgroundColor: '#0284c7' }}
                >
                  <Plus size={16} />
                  Criar Primeira Turma
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.15rem' }}>
                {turmas.map(turma => {
                  const studentCount = enrollments.filter(e => e.turma_id === turma.id).length;
                  return (
                    <div
                      key={turma.id}
                      style={{
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '1rem',
                        padding: '1.35rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        transition: 'transform 0.15s, box-shadow 0.15s'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <span style={{
                            backgroundColor: turma.status === 'Concluída' ? '#f1f5f9' : 'rgba(2, 132, 199, 0.1)',
                            color: turma.status === 'Concluída' ? '#64748b' : '#0284c7',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            padding: '3px 10px',
                            borderRadius: '1rem',
                            textTransform: 'uppercase'
                          }}>
                            {turma.status || 'Aberta'}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                              type="button"
                              onClick={() => handleEditTurma(turma)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                              title="Editar Turma"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTurma(turma.id, turma.name)}
                              style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                              title="Excluir Turma"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0.65rem 0 0.35rem' }}>
                          {turma.name}
                        </h3>
                        {turma.course_name && turma.course_name !== turma.name && (
                          <div style={{ fontSize: '0.85rem', color: '#0284c7', fontWeight: '700', marginBottom: '0.45rem' }}>
                            {turma.course_name}
                          </div>
                        )}

                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {turma.instructor_name && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <User size={14} style={{ color: '#0284c7' }} />
                              <span><strong>Instrutor:</strong> {turma.instructor_name}</span>
                            </div>
                          )}
                          {turma.company && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Building size={14} style={{ color: 'var(--text-secondary)' }} />
                              <span><strong>Empresa:</strong> {turma.company}</span>
                            </div>
                          )}
                          {turma.start_date && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
                              <span><strong>Data:</strong> {new Date(turma.start_date + 'T12:00:00').toLocaleDateString('pt-BR')} • {turma.duration || '8h'}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{
                        paddingTop: '0.85rem',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        flexWrap: 'wrap'
                      }}>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Users size={15} style={{ color: '#0284c7' }} />
                          <strong style={{ color: 'var(--text-primary)' }}>{studentCount}</strong> inscritos
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => handleOpenQrModal(turma)}
                            style={{ 
                              fontSize: '0.78rem', 
                              padding: '0.4rem 0.75rem', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.3rem',
                              backgroundColor: 'rgba(124, 58, 237, 0.08)',
                              border: '1px solid rgba(124, 58, 237, 0.3)',
                              color: '#7c3aed',
                              fontWeight: '700'
                            }}
                            title="Abrir QR Code para assinar esta turma pelo celular"
                          >
                            <Smartphone size={14} />
                            Assinar no Celular
                          </button>

                          <button
                            type="button"
                            className="btn"
                            onClick={() => copyPublicLink(turma.id, `turma-${turma.id}`)}
                            style={{ 
                              fontSize: '0.78rem', 
                              padding: '0.4rem 0.75rem', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.3rem',
                              backgroundColor: 'var(--surface-hover)',
                              border: '1px solid var(--border)',
                              fontWeight: '600'
                            }}
                            title="Copiar link de inscrição específico desta turma"
                          >
                            {copiedKey === `turma-${turma.id}` ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                            {copiedKey === `turma-${turma.id}` ? 'Link Copiado' : 'Link da Turma'}
                          </button>

                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleLoadTurmaIntoGenerator(turma)}
                            style={{ 
                              fontSize: '0.78rem', 
                              padding: '0.4rem 0.85rem', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.35rem',
                              backgroundColor: '#0284c7',
                              fontWeight: '700'
                            }}
                            title="Carregar alunos desta turma no gerador de certificados"
                          >
                            <Award size={14} />
                            Emitir PPTX
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Seção da Tabela de Inscritos */}
          <div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              flexWrap: 'wrap', 
              gap: '1rem', 
              marginBottom: '1.15rem' 
            }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                  Participantes & Lista de Presença ({filteredEnrollments.length})
                </h2>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Dados em tempo real obtidos com CPF e Data de Nascimento via Receita Federal.
                </p>
              </div>

              {/* Filtros e Busca */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    placeholder="Buscar por nome ou CPF..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input"
                    style={{ paddingLeft: '2.2rem', width: '240px', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Filter size={15} style={{ color: 'var(--text-secondary)' }} />
                  <select
                    value={selectedTurmaFilter}
                    onChange={(e) => setSelectedTurmaFilter(e.target.value)}
                    className="input"
                    style={{ fontSize: '0.85rem' }}
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
                  className="btn"
                  onClick={loadData}
                  title="Atualizar lista em tempo real"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '0.6rem',
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>

            {/* Tabela de Participantes */}
            <div style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '1rem',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
              {filteredEnrollments.length === 0 ? (
                <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Users size={36} style={{ margin: '0 auto 0.65rem', opacity: 0.3 }} />
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>
                    {searchQuery ? 'Nenhum aluno encontrado para os filtros atuais.' : 'Nenhuma inscrição recebida ainda.'}
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <th style={{ padding: '0.85rem 1.15rem' }}>Participante Oficial</th>
                        <th style={{ padding: '0.85rem 1.15rem' }}>CPF</th>
                        <th style={{ padding: '0.85rem 1.15rem' }}>Nascimento</th>
                        <th style={{ padding: '0.85rem 1.15rem' }}>Turma Vinculada</th>
                        <th style={{ padding: '0.85rem 1.15rem' }}>Inscrição</th>
                        <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEnrollments.map(student => {
                        return (
                          <tr key={student.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.15s' }}>
                            <td style={{ padding: '0.85rem 1.15rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  backgroundColor: 'rgba(2, 132, 199, 0.1)',
                                  color: '#0284c7',
                                  fontSize: '0.75rem',
                                  fontWeight: '800',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  {student.nome?.charAt(0)?.toUpperCase() || 'P'}
                                </div>
                                <div>
                                  <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                                    {student.nome}
                                  </div>
                                  {student.empresa && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                      {student.empresa} {student.telefone ? `• ${student.telefone}` : ''}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '0.85rem 1.15rem', fontFamily: 'monospace', fontWeight: '600', color: '#0284c7' }}>
                              {student.cpf}
                            </td>
                            <td style={{ padding: '0.85rem 1.15rem', color: 'var(--text-secondary)' }}>
                              {student.data_nascimento ? new Date(student.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                            </td>
                            <td style={{ padding: '0.85rem 1.15rem' }}>
                              <select
                                value={student.turma_id || ''}
                                onChange={(e) => handleStudentTurmaChange(student.id, e.target.value)}
                                className="input"
                                style={{ fontSize: '0.8125rem', padding: '0.35rem 0.65rem', width: 'auto', maxWidth: '220px' }}
                              >
                                <option value="">(Sem turma vinculada)</option>
                                {turmas.map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '0.85rem 1.15rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              {student.created_at ? new Date(student.created_at).toLocaleDateString('pt-BR') : '-'}
                            </td>
                            <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => handleDeleteStudent(student.id, student.nome)}
                                style={{ 
                                  background: 'none', 
                                  border: 'none', 
                                  color: 'var(--text-secondary)', 
                                  cursor: 'pointer', 
                                  padding: '5px',
                                  transition: 'color 0.15s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                title="Excluir Inscrição"
                              >
                                <Trash2 size={16} />
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
      {/* MODAL: CRIAR OU EDITAR TURMA                                              */}
      {/* ========================================================================= */}
      {showTurmaModal && (
        <div className="modal-backdrop" onClick={() => setShowTurmaModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', borderRadius: '1.25rem', padding: '1.75rem' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '1.15rem', fontWeight: '800' }}>
                <Award size={20} style={{ color: '#0284c7' }} />
                {editingTurma ? 'Editar Turma de Treinamento' : 'Criar Nova Turma de Treinamento'}
              </h2>
              <button className="modal-close" onClick={() => setShowTurmaModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTurma} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Identificação da Turma *</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="Ex: Turma 01 - NR-35 Trabalho em Altura / Março 2026"
                  value={turmaFormData.name}
                  onChange={e => setTurmaFormData(prev => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', marginTop: '0.35rem', fontWeight: '600' }}
                />
              </div>

              <div>
                <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Nome Oficial do Curso *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: NR-35 - Segurança no Trabalho em Altura"
                  value={turmaFormData.course_name}
                  onChange={e => setTurmaFormData(prev => ({ ...prev, course_name: e.target.value }))}
                  style={{ width: '100%', marginTop: '0.35rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Carga Horária</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: 8 horas, 16 horas"
                    value={turmaFormData.duration}
                    onChange={e => setTurmaFormData(prev => ({ ...prev, duration: e.target.value }))}
                    style={{ width: '100%', marginTop: '0.35rem' }}
                  />
                </div>
                <div>
                  <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Data de Conclusão / Realização</label>
                  <input
                    type="date"
                    className="input"
                    value={turmaFormData.start_date}
                    onChange={e => setTurmaFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    style={{ width: '100%', marginTop: '0.35rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Local / Cidade</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: Mossoró - RN"
                    value={turmaFormData.location}
                    onChange={e => setTurmaFormData(prev => ({ ...prev, location: e.target.value }))}
                    style={{ width: '100%', marginTop: '0.35rem' }}
                  />
                </div>
                <div>
                  <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Empresa Solicitante</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: TotalSafety / Nome do Cliente"
                    value={turmaFormData.company}
                    onChange={e => setTurmaFormData(prev => ({ ...prev, company: e.target.value }))}
                    style={{ width: '100%', marginTop: '0.35rem' }}
                  />
                </div>
              </div>

              {/* Instrutor entre os Usuários */}
              <div>
                <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <User size={14} style={{ color: '#0284c7' }} />
                  Instrutor Responsável Técnico *
                </label>
                
                <select
                  className="input"
                  value={profiles.some(p => p.name.trim() === turmaFormData.instructor_name?.trim()) ? turmaFormData.instructor_name : (turmaFormData.instructor_name ? 'custom' : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      // Custom
                    } else if (val) {
                      const sel = profiles.find(p => p.name === val);
                      setTurmaFormData(prev => ({
                        ...prev,
                        instructor_name: sel ? sel.name : val,
                        instructor_role: sel?.role === 'Admin' ? 'Instrutor e Responsável Técnico' : (sel?.role ? `Instrutor / ${sel.role}` : prev.instructor_role),
                        instructor_registration: sel?.registration || prev.instructor_registration
                      }));
                    }
                  }}
                  style={{ marginTop: '0.35rem', marginBottom: '0.5rem', width: '100%' }}
                >
                  <option value="">Selecione um instrutor dos usuários do sistema...</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.name}>
                      {p.name} {p.role ? `— ${p.role}` : ''}
                    </option>
                  ))}
                  <option value="custom">Outro / Digitar manualmente</option>
                </select>

                <input
                  type="text"
                  required
                  className="input"
                  placeholder="Nome do Instrutor"
                  value={turmaFormData.instructor_name}
                  onChange={e => setTurmaFormData(prev => ({ ...prev, instructor_name: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Cargo do Instrutor</label>
                  <input
                    type="text"
                    className="input"
                    value={turmaFormData.instructor_role}
                    onChange={e => setTurmaFormData(prev => ({ ...prev, instructor_role: e.target.value }))}
                    style={{ width: '100%', marginTop: '0.35rem' }}
                  />
                </div>
                <div>
                  <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Registro SRTE</label>
                  <input
                    type="text"
                    className="input"
                    value={turmaFormData.instructor_registration}
                    onChange={e => setTurmaFormData(prev => ({ ...prev, instructor_registration: e.target.value }))}
                    style={{ width: '100%', marginTop: '0.35rem' }}
                  />
                </div>
              </div>

              <div>
                <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Status da Turma</label>
                <select
                  className="input"
                  value={turmaFormData.status}
                  onChange={e => setTurmaFormData(prev => ({ ...prev, status: e.target.value }))}
                  style={{ width: '100%', marginTop: '0.35rem' }}
                >
                  <option value="Aberta">Aberta (Aceitando inscrições)</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Concluída">Concluída</option>
                </select>
              </div>

              <div className="modal-actions" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTurmaModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#0284c7', fontWeight: '700' }}>
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
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', borderRadius: '1.25rem', padding: '1.75rem' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '1.15rem', fontWeight: '800' }}>
                <Key size={18} style={{ color: '#0284c7' }} />
                Configuração da API CPF A
              </h2>
              <button className="modal-close" onClick={() => setShowTokenModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveApiToken} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                A página pública de inscrição utiliza a <strong>API CPF.CNPJ (Pacote 1: CPF A)</strong> para consultar a Receita Federal e validar em tempo real o nome completo do participante ao digitar o CPF.
              </div>

              <div>
                <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Base URL da API</label>
                <input
                  type="text"
                  disabled
                  className="input"
                  value="https://api.cpfcnpj.com.br"
                  style={{ opacity: 0.8, marginTop: '0.35rem', width: '100%' }}
                />
              </div>

              <div>
                <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Token de Acesso (Teste ou Produção)</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="Cole aqui seu token de integração"
                  value={apiToken}
                  onChange={e => setApiToken(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem', marginTop: '0.35rem', width: '100%' }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.35rem', display: 'block' }}>
                  Token padrão: <code>5ae973d7a997af13f0aaf2bf60e65803</code>
                </span>
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTokenModal(false)}>
                  Fechar
                </button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#0284c7', fontWeight: '700' }}>
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
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', borderRadius: '1.25rem', padding: '1.75rem' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '1.15rem', fontWeight: '800' }}>
                <ClipboardCopy size={20} style={{ color: '#0284c7' }} />
                Importar Participantes em Lote
              </h2>
              <button className="modal-close" onClick={() => setShowBatchModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Cole abaixo a lista de participantes, um por linha. O sistema detecta automaticamente nomes e CPFs separados por traço, vírgula, tabulação ou espaço.
              </p>

              <textarea
                className="input"
                rows={9}
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder={"Exemplo:\nJoão da Silva - 123.456.789-00\nMaria Santos, 98765432100\nCarlos Eduardo Ferreira\nAna Paula de Oliveira - 111.222.333-44"}
                style={{ fontFamily: 'monospace', fontSize: '0.85rem', resize: 'vertical', width: '100%', lineHeight: '1.5' }}
              />

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowBatchModal(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary" onClick={handleProcessBatch} style={{ backgroundColor: '#0284c7', fontWeight: '700' }}>
                  Processar Lista
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASSINATURA MANUAL EM TELA (CANVAS TOUCH / MOUSE)                   */}
      {/* ========================================================================= */}
      <SignaturePadModal
        isOpen={showSignModal}
        onClose={() => setShowSignModal(false)}
        onSave={handleSaveDrawnSignature}
        title={`Assinatura Manual: ${signModalRoleTitle}`}
        subtitle="Desenhe a assinatura na tela com o mouse, caneta ou toque"
        signerName={signModalSignerName}
        roleTitle={signModalRoleTitle}
      />

      {/* ========================================================================= */}
      {/* MODAL: ASSINAR PELO CELULAR (QR CODE & LINK DE COMPARTILHAMENTO)          */}
      {/* ========================================================================= */}
      {showQrModal && qrModalTurma && (
        <div className="modal-backdrop" onClick={() => setShowQrModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '490px', borderRadius: '1.25rem', padding: '1.75rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '0.55rem',
                  backgroundColor: 'rgba(124, 58, 237, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Smartphone size={18} style={{ color: '#7c3aed' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                    Assinar Turma pelo Celular
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Turma: <strong>{qrModalTurma.name}</strong>
                  </span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowQrModal(false)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0', lineHeight: '1.45' }}>
              Aponte a câmera do celular para o QR Code abaixo para abrir o portal de assinatura com o dedo. Ao salvar, a assinatura é aplicada automaticamente em lote para todos os alunos.
            </p>

            {/* Imagem do QR Code Dinâmico */}
            <div style={{
              display: 'inline-block',
              padding: '0.75rem',
              backgroundColor: '#ffffff',
              borderRadius: '1rem',
              border: '2px solid #e2e8f0',
              boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
              marginBottom: '1rem'
            }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  `${window.location.origin}/assinar-turma/${qrModalTurma.id}`
                )}`}
                alt="QR Code para Assinatura no Celular"
                style={{ width: '200px', height: '200px', display: 'block', borderRadius: '0.5rem' }}
              />
            </div>

            {/* Campo com Link Direto */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
              <input
                type="text"
                readOnly
                className="input"
                value={`${window.location.origin}/assinar-turma/${qrModalTurma.id}`}
                style={{ fontSize: '0.78rem', padding: '0.55rem 0.75rem', fontFamily: 'monospace' }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/assinar-turma/${qrModalTurma.id}`);
                  setCopiedKey('qr-modal-link');
                  setTimeout(() => setCopiedKey(null), 2500);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
              >
                {copiedKey === 'qr-modal-link' ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                {copiedKey === 'qr-modal-link' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>

            {/* Ações de Compartilhamento */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Olá! Segue o link para assinar digitalmente pelo celular os certificados da turma "${qrModalTurma.name}": ${window.location.origin}/assinar-turma/${qrModalTurma.id}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  backgroundColor: '#25D366',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  padding: '0.65rem',
                  borderRadius: '0.65rem',
                  textDecoration: 'none'
                }}
              >
                <Share2 size={15} />
                WhatsApp
              </a>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.open(`/assinar-turma/${qrModalTurma.id}`, '_blank')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  backgroundColor: '#7c3aed',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  padding: '0.65rem',
                  borderRadius: '0.65rem'
                }}
              >
                <ExternalLink size={15} />
                Abrir Portal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TrainingCertificatesPage;
