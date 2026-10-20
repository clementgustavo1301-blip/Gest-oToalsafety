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
import './TrainingCertificatesPage.css';
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

  // Dados derivados para o layout do gerador
  const selectedPreset = COURSE_PRESETS.find(p =>
    p.name?.trim().toLowerCase() === formData.curso?.trim().toLowerCase() ||
    p.title?.trim().toLowerCase() === formData.curso?.trim().toLowerCase()
  );
  const isAphCourse = formData.curso?.toLowerCase().includes('aph');
  const signatureRoles = [
    { key: 'instructor', label: 'Instrutor(a)', name: formData.instrutorNome || 'Instrutor não definido' },
    {
      key: 'tech_lead',
      label: 'Responsável Técnico',
      name: certModel === 'modelo1' ? 'Eider Gomes do Nascimento' : 'Raimundo Fernandes de Oliveira Junior'
    },
    ...(certModel === 'modelo2'
      ? [{
          key: 'coordinator',
          label: 'Coordenação Técnica',
          name: isAphCourse ? 'Leiliana Nunes de Lima Fernandes' : 'Cezar Augusto Galvão De P. Camêlo'
        }]
      : [])
  ];
  const signedCount = signatureRoles.filter(r => currentTurmaSignatures?.[r.key]?.dataUrl).length;
  const countStudentsInTurma = (turmaId) => enrollments.filter(e => String(e.turma_id) === String(turmaId)).length;
  const turmaStatusGroups = [
    { label: 'Turmas abertas', match: t => t.status === 'Aberta' || !t.status },
    { label: 'Em andamento', match: t => t.status === 'Em Andamento' },
    { label: 'Concluídas', match: t => t.status === 'Concluída' }
  ];

  return (
    <div className="training-certificates-page tc-page">

      {/* ========================================================================= */}
      {/* CABEÇALHO COMPACTO + ABAS                                                 */}
      {/* ========================================================================= */}
      <header className="tc-header">
        <div className="tc-header-title">
          <div className="tc-header-icon">
            <Award size={22} />
          </div>
          <div>
            <h1>Certificados de Treinamento</h1>
            <p>Preencha os dados, confira a prévia e baixe os certificados em PowerPoint.</p>
          </div>
        </div>

        <nav className="tc-tabs" aria-label="Seções do módulo de treinamento">
          <button
            id="tab-generator"
            type="button"
            className={`tc-tab ${activeTab === 'generator' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('generator')}
          >
            <Award size={15} />
            Gerar Certificados
          </button>
          <button
            id="tab-turmas"
            type="button"
            className={`tc-tab ${activeTab === 'turmas' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('turmas')}
          >
            <Users size={15} />
            Turmas &amp; Inscrições
            <span className="tc-tab-count">{enrollments.length}</span>
          </button>
        </nav>
      </header>

      {/* Alerta de Feedback Global */}
      {feedback && (
        <div className={`tc-toast tc-toast--${feedback.type}`} role="status">
          <CheckCircle2 size={16} />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 1: GERADOR DE CERTIFICADOS PPTX                                       */}
      {/* ========================================================================= */}
      {activeTab === 'generator' && (
        <div className="tc-gen">

          {/* ------------------------------------------------------------- */}
          {/* COLUNA ESQUERDA: ETAPAS DO FORMULÁRIO                         */}
          {/* ------------------------------------------------------------- */}
          <div className="tc-form">

            {/* ETAPA 1: Treinamento */}
            <section className="tc-card" aria-labelledby="tc-step1-title">
              <div className="tc-step-head">
                <span className="tc-step-num">1</span>
                <div>
                  <h2 id="tc-step1-title">Treinamento</h2>
                  <p>Escolha a turma ou o curso — os demais campos são preenchidos automaticamente.</p>
                </div>
              </div>

              {/* Turma (opcional) */}
              <div className="tc-field">
                <label htmlFor="tc-turma">
                  Turma <span className="tc-optional">(opcional — importa os alunos inscritos)</span>
                </label>
                <div className="tc-inline">
                  <select
                    id="tc-turma"
                    className="tc-input"
                    value={selectedTurmaIdInGenerator || ''}
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
                    <option value="">Sem turma — preencher manualmente</option>
                    {turmaStatusGroups.map(group => {
                      const list = turmas.filter(group.match);
                      if (list.length === 0) return null;
                      return (
                        <optgroup key={group.label} label={group.label}>
                          {list.map(t => {
                            const count = countStudentsInTurma(t.id);
                            return (
                              <option key={t.id} value={t.id}>
                                {t.name} — {t.course_name || 'Geral'} ({count} aluno{count !== 1 ? 's' : ''})
                              </option>
                            );
                          })}
                        </optgroup>
                      );
                    })}
                  </select>
                  {selectedTurmaIdInGenerator && (
                    <>
                      <button
                        id="btn-sync-turma"
                        type="button"
                        className="tc-icon-btn"
                        onClick={handleReloadTurmaStudents}
                        title="Sincronizar inscrições da turma"
                      >
                        <RefreshCw size={15} />
                      </button>
                      <button
                        id="btn-unlink-turma"
                        type="button"
                        className="tc-icon-btn tc-icon-btn--danger"
                        onClick={handleClearTurmaLink}
                        title="Desvincular turma"
                      >
                        <X size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Curso */}
              <div className="tc-field">
                <div className="tc-label-row">
                  <label htmlFor="tc-curso">Curso *</label>
                  <button
                    type="button"
                    className="tc-link"
                    onClick={() => setIsCustomCourse(!isCustomCourse)}
                  >
                    {isCustomCourse ? 'Escolher da lista oficial' : 'Digitar outro curso'}
                  </button>
                </div>
                {!isCustomCourse ? (
                  <select
                    id="tc-curso"
                    className="tc-input tc-input--strong"
                    value={selectedPreset ? selectedPreset.id : 'custom'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'custom') {
                        setIsCustomCourse(true);
                      } else {
                        const found = COURSE_PRESETS.find(p => p.id === val);
                        if (found) applyPreset(found);
                      }
                    }}
                  >
                    {Array.from(new Set(COURSE_PRESETS.map(p => p.category))).map(cat => (
                      <optgroup key={cat} label={cat}>
                        {COURSE_PRESETS.filter(p => p.category === cat).map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="custom">
                      {selectedPreset ? 'Outro curso (digitar)...' : (formData.curso || 'Outro curso (digitar)...')}
                    </option>
                  </select>
                ) : (
                  <input
                    id="tc-curso"
                    type="text"
                    name="curso"
                    className="tc-input tc-input--strong"
                    value={formData.curso}
                    onChange={handleChange}
                    placeholder="Ex: NR-35 – Trabalho em Altura"
                    autoFocus
                  />
                )}
              </div>

              {/* Carga horária, data e cidade */}
              <div className="tc-grid-3">
                <div className="tc-field">
                  <label htmlFor="tc-duracao">Carga horária *</label>
                  <input
                    id="tc-duracao"
                    type="text"
                    name="duracao"
                    className="tc-input"
                    value={formData.duracao}
                    onChange={handleChange}
                    placeholder="Ex: 8 horas"
                  />
                </div>
                <div className="tc-field">
                  <label htmlFor="tc-data">Data de conclusão *</label>
                  <input
                    id="tc-data"
                    type="date"
                    name="data"
                    className="tc-input"
                    value={formData.data}
                    onChange={handleChange}
                  />
                </div>
                <div className="tc-field">
                  <label htmlFor="tc-local">Cidade</label>
                  <input
                    id="tc-local"
                    type="text"
                    name="local"
                    className="tc-input"
                    value={formData.local}
                    onChange={handleChange}
                    placeholder="Ex: Mossoró - RN"
                  />
                </div>
              </div>

              {/* Instrutor */}
              <div className="tc-field">
                <div className="tc-label-row">
                  <label htmlFor="tc-instrutor">Instrutor *</label>
                  <button
                    type="button"
                    className="tc-link"
                    onClick={() => setIsEditingInstructor(!isEditingInstructor)}
                  >
                    {isEditingInstructor ? 'Concluir edição' : 'Editar dados'}
                  </button>
                </div>
                <select
                  id="tc-instrutor"
                  className="tc-input"
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
                >
                  {profiles.map(p => (
                    <option key={p.id || p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                  <option value="custom">
                    {profiles.some(p => p.name.trim().toLowerCase() === formData.instrutorNome?.trim().toLowerCase())
                      ? 'Outro instrutor (digitar)...'
                      : (formData.instrutorNome || 'Outro instrutor (digitar)...')}
                  </option>
                </select>
                {!isEditingInstructor && (formData.instrutorCargo || formData.instrutorRegistro) && (
                  <span className="tc-hint">
                    {[formData.instrutorCargo, formData.instrutorRegistro].filter(Boolean).join(' · ')}
                  </span>
                )}
                {isEditingInstructor && (
                  <div className="tc-grid-3 tc-mt">
                    <div className="tc-field">
                      <label htmlFor="tc-instrutor-nome">Nome</label>
                      <input
                        id="tc-instrutor-nome"
                        type="text"
                        name="instrutorNome"
                        className="tc-input"
                        value={formData.instrutorNome}
                        onChange={handleChange}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div className="tc-field">
                      <label htmlFor="tc-instrutor-cargo">Cargo</label>
                      <input
                        id="tc-instrutor-cargo"
                        type="text"
                        name="instrutorCargo"
                        className="tc-input"
                        value={formData.instrutorCargo}
                        onChange={handleChange}
                        placeholder="Ex: Técnico em Segurança"
                      />
                    </div>
                    <div className="tc-field">
                      <label htmlFor="tc-instrutor-registro">Registro</label>
                      <input
                        id="tc-instrutor-registro"
                        type="text"
                        name="instrutorRegistro"
                        className="tc-input"
                        value={formData.instrutorRegistro}
                        onChange={handleChange}
                        placeholder="Ex: MTE0009995/RN"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ETAPA 2: Participantes */}
            <section className="tc-card" aria-labelledby="tc-step2-title">
              <div className="tc-step-head">
                <span className="tc-step-num">2</span>
                <div>
                  <h2 id="tc-step2-title">Participantes</h2>
                  <p>{validCount} pronto{validCount !== 1 ? 's' : ''} para emissão</p>
                </div>
                <div className="tc-step-actions">
                  <button
                    id="btn-paste-students"
                    type="button"
                    className="tc-btn"
                    onClick={() => setShowBatchModal(true)}
                    title="Colar vários participantes de uma vez"
                  >
                    <ClipboardCopy size={14} />
                    Colar lista
                  </button>
                  <button
                    id="btn-add-student"
                    type="button"
                    className="tc-btn tc-btn--soft"
                    onClick={addColaborador}
                  >
                    <Plus size={14} />
                    Adicionar
                  </button>
                </div>
              </div>

              <div className="tc-students">
                <div className="tc-students-head">
                  <span>#</span>
                  <span>Nome completo</span>
                  <span>CPF</span>
                  <span />
                </div>
                <div className="tc-students-body">
                  {colaboradores.map((colab, idx) => {
                    const isCpfValid = colab.cpf && colab.cpf.replace(/\D/g, '').length === 11;
                    return (
                      <div key={idx} className="tc-student-row">
                        <span className="tc-student-idx">{idx + 1}</span>
                        <input
                          id={`student-name-${idx}`}
                          type="text"
                          className="tc-input"
                          placeholder="Nome do participante"
                          value={colab.nome}
                          onChange={(e) => handleColabChange(idx, 'nome', e.target.value)}
                        />
                        <div className="tc-cpf-wrap">
                          <input
                            id={`student-cpf-${idx}`}
                            type="text"
                            className="tc-input"
                            placeholder="000.000.000-00"
                            value={colab.cpf}
                            onChange={(e) => handleColabChange(idx, 'cpf', formatCpf(e.target.value))}
                            maxLength={14}
                          />
                          {isCpfValid && <Check size={13} className="tc-cpf-ok" />}
                        </div>
                        <button
                          type="button"
                          className="tc-icon-btn tc-icon-btn--sm tc-icon-btn--danger"
                          onClick={() => removeColaborador(idx)}
                          title="Remover participante"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {colaboradores.length > 1 && (
                <button type="button" className="tc-link tc-link--danger" onClick={clearAllColaboradores}>
                  <Trash2 size={12} />
                  Limpar lista
                </button>
              )}
            </section>

            {/* ETAPA 3: Assinaturas da Turma (Em Lote) */}
            <section className="tc-card" aria-labelledby="tc-step3-title">
              <div className="tc-step-head">
                <span className="tc-step-num">3</span>
                <div>
                  <h2 id="tc-step3-title">Assinaturas da turma</h2>
                  <p>Assine uma vez e vale para todos os certificados · {signedCount}/{signatureRoles.length} assinadas</p>
                </div>
                <div className="tc-step-actions">
                  <button
                    id="btn-sign-mobile"
                    type="button"
                    className="tc-btn"
                    onClick={() => handleOpenQrModal()}
                    title="Abrir QR Code para assinar pelo celular"
                  >
                    <Smartphone size={14} />
                    Assinar no celular
                  </button>
                </div>
              </div>

              <ul className="tc-sign-list">
                {signatureRoles.map(role => {
                  const sig = currentTurmaSignatures?.[role.key];
                  const isSigned = Boolean(sig?.dataUrl);
                  return (
                    <li key={role.key} className={`tc-sign-row ${isSigned ? 'is-signed' : ''}`}>
                      <div className="tc-sign-info">
                        <span className="tc-sign-role">{role.label}</span>
                        <span className="tc-sign-name" title={role.name}>{role.name}</span>
                      </div>
                      <div className="tc-sign-thumb">
                        {isSigned
                          ? <img src={sig.dataUrl} alt={`Assinatura de ${role.name}`} />
                          : <span>Não assinado</span>}
                      </div>
                      <div className="tc-sign-actions">
                        <button
                          id={`btn-sign-${role.key}`}
                          type="button"
                          className={`tc-btn ${isSigned ? '' : 'tc-btn--primary'}`}
                          onClick={() => handleOpenSignatureModal(role.key)}
                        >
                          <PenTool size={13} />
                          {isSigned ? 'Refazer' : 'Assinar'}
                        </button>
                        {isSigned && (
                          <button
                            type="button"
                            className="tc-icon-btn tc-icon-btn--sm tc-icon-btn--danger"
                            onClick={() => handleClearSignature(role.key)}
                            title="Remover assinatura"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}

                {/* Aluno: sempre pendente */}
                <li className="tc-sign-row is-pending">
                  <div className="tc-sign-info">
                    <span className="tc-sign-role">Aluno</span>
                    <span className="tc-sign-name">Cada participante</span>
                  </div>
                  <div className="tc-sign-thumb">
                    <span>Assina na entrega</span>
                  </div>
                  <div className="tc-sign-actions">
                    <span className="tc-badge">
                      <Clock size={12} />
                      Pendente
                    </span>
                  </div>
                </li>
              </ul>
            </section>

            {/* OPÇÕES AVANÇADAS (recolhidas por padrão) */}
            <details className="tc-card tc-advanced">
              <summary>
                <div>
                  <div className="tc-adv-title">Opções avançadas</div>
                  <small>Texto do certificado, conteúdo do verso, validade, empresa e modelo .pptx próprio</small>
                </div>
                <ChevronDown size={18} className="tc-adv-chevron" />
              </summary>

              <div className="tc-advanced-body">
                <div className="tc-field">
                  <label htmlFor="tc-descricao">Texto da certificação (frente)</label>
                  <textarea
                    id="tc-descricao"
                    name="descricao"
                    className="tc-input"
                    value={formData.descricao}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>

                <div className="tc-field">
                  <label htmlFor="tc-conteudo">Conteúdo programático (verso)</label>
                  <textarea
                    id="tc-conteudo"
                    name="conteudo"
                    className="tc-input tc-mono"
                    value={formData.conteudo}
                    onChange={handleChange}
                    rows={6}
                    placeholder="Um item por linha..."
                  />
                </div>

                <div className="tc-grid-2">
                  <div className="tc-field">
                    <label htmlFor="tc-validade">Validade</label>
                    <input
                      id="tc-validade"
                      type="text"
                      name="validade"
                      className="tc-input"
                      value={formData.validade}
                      onChange={handleChange}
                      placeholder="Ex: 24 meses"
                    />
                  </div>
                  <div className="tc-field">
                    <label htmlFor="tc-empresa">Empresa solicitante</label>
                    <input
                      id="tc-empresa"
                      type="text"
                      name="empresa"
                      className="tc-input"
                      list="tc-empresas-list"
                      value={formData.empresa}
                      onChange={handleChange}
                      placeholder="TotalSafety"
                    />
                    <datalist id="tc-empresas-list">
                      <option value="TotalSafety" />
                      {companies.map(c => (
                        <option key={c.id} value={c.name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="tc-field">
                  <span className="tc-label">Modelo .pptx próprio</span>
                  <div className="tc-file-row">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".pptx"
                      onChange={handleTemplateUpload}
                      style={{ display: 'none' }}
                    />
                    <button
                      id="btn-upload-template"
                      type="button"
                      className="tc-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={14} />
                      {customTemplateFile ? 'Trocar arquivo' : 'Carregar .pptx'}
                    </button>
                    {customTemplateFile && (
                      <button type="button" className="tc-link tc-link--danger" style={{ marginTop: 0 }} onClick={removeCustomTemplate}>
                        Restaurar padrão
                      </button>
                    )}
                    <span className="tc-hint">
                      {customTemplateFile
                        ? `${customTemplateFile.name} (${(customTemplateFile.size / 1024).toFixed(1)} KB)`
                        : 'Usando o modelo oficial do curso selecionado.'}
                    </span>
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* COLUNA DIREITA: PRÉ-VISUALIZAÇÃO + EMISSÃO (fixa ao rolar)   */}
          {/* ------------------------------------------------------------- */}
          <aside className="tc-side">
            <div className="tc-card tc-preview-card">
              <div className="tc-preview-head">
                <div className="tc-preview-title">
                  <Eye size={16} />
                  Pré-visualização
                </div>
                <div className="tc-preview-controls">
                  <div className="tc-seg" role="group" aria-label="Modelo do certificado">
                    <button
                      id="btn-model-1"
                      type="button"
                      className={certModel === 'modelo1' ? 'is-active' : ''}
                      onClick={() => setCertModel('modelo1')}
                    >
                      Modelo 1
                    </button>
                    <button
                      id="btn-model-2"
                      type="button"
                      className={certModel === 'modelo2' ? 'is-active' : ''}
                      onClick={() => setCertModel('modelo2')}
                    >
                      Modelo 2
                    </button>
                  </div>
                  <div className="tc-seg" role="group" aria-label="Lado do certificado">
                    <button
                      id="btn-preview-front"
                      type="button"
                      className={previewTab === 'frente' ? 'is-active' : ''}
                      onClick={() => setPreviewTab('frente')}
                    >
                      Frente
                    </button>
                    <button
                      id="btn-preview-back"
                      type="button"
                      className={previewTab === 'verso' ? 'is-active' : ''}
                      onClick={() => setPreviewTab('verso')}
                    >
                      Verso
                    </button>
                  </div>
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

              {/* EMISSÃO */}
              <div className="tc-generate">
                <div className="tc-generate-summary">
                  <div className="tc-stat">
                    <strong>{validCount}</strong>
                    <span>certificado{validCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="tc-stat">
                    <strong>{validCount * 2}</strong>
                    <span>slides (frente + verso)</span>
                  </div>
                  <div className="tc-stat">
                    <strong>{signedCount}/{signatureRoles.length}</strong>
                    <span>assinaturas da turma</span>
                  </div>
                </div>

                <button
                  id="btn-generate-pptx"
                  type="button"
                  className={`tc-generate-btn ${generating ? 'is-loading' : ''}`}
                  onClick={handleGenerate}
                  disabled={generating || validCount === 0}
                >
                  {generating ? (
                    <>
                      <Loader size={19} className="animate-spin" />
                      Gerando {validCount} certificado{validCount !== 1 ? 's' : ''}...
                    </>
                  ) : (
                    <>
                      <Download size={19} />
                      Baixar certificados (.pptx)
                    </>
                  )}
                </button>
                {validCount === 0 && (
                  <p className="tc-hint tc-center">Adicione ao menos um participante para gerar.</p>
                )}
              </div>
            </div>
          </aside>
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

              <button
                id="btn-api-cpf-token"
                type="button"
                className="tc-icon-btn"
                onClick={() => setShowTokenModal(true)}
                title="Configurar token da API CPF (Receita)"
                style={{ width: '40px', height: '40px' }}
              >
                <Key size={16} />
              </button>
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
