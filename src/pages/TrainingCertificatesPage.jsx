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
  getTurmaSignatures, saveRoleSignature, clearTurmaSignature, subscribeToTurmaSignatures,
  createOrGetSigningToken, generateNewSigningToken, getTurmaTokens 
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
    selectedPresetKey: '',
    course_name: '',
    duration: '8 horas',
    validade: '24 meses',
    start_date: new Date().toISOString().split('T')[0],
    location: 'Mossoró - RN',
    company: 'TotalSafety',
    instructors: [],
    instructor_name: '',
    instructor_role: '',
    instructor_registration: '',
    tech_lead: {
      name: 'Eider Gomes do Nascimento',
      role: 'Responsável Técnico / Engenheiro de Segurança',
      registration: 'CREA 210874512-0 / MTE 0009995/RN'
    },
    tech_lead_name: 'Eider Gomes do Nascimento',
    tech_lead_role: 'Responsável Técnico / Engenheiro de Segurança',
    tech_lead_registration: 'CREA 210874512-0 / MTE 0009995/RN',
    cert_model: 'modelo1',
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
  const [qrModalSelectedSignerKey, setQrModalSelectedSignerKey] = useState('instructor');
  const [tokensRefreshKey, setTokensRefreshKey] = useState(0);

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

    if (roleKey.startsWith('instructor_')) {
      const idx = parseInt(roleKey.replace('instructor_', ''), 10);
      const inst = (formData.instructors && formData.instructors[idx]) || activeTurma?.instructors?.[idx];
      name = inst?.name || `Instrutor #${idx + 1}`;
      title = inst?.role || 'Instrutor(a)';
    } else if (roleKey === 'instructor') {
      const inst = (formData.instructors && formData.instructors[0]) || activeTurma?.instructors?.[0];
      name = inst?.name || formData.instrutorNome || activeTurma?.instructor_name || 'Adeylton da Silva Araújo';
      title = inst?.role || 'Instrutor(a)';
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

  const handleOpenQrModal = (turma = null, initialSignerKey = 'instructor') => {
    const t = turma || turmas.find(item => String(item.id) === String(selectedTurmaIdInGenerator)) || {
      id: selectedTurmaIdInGenerator || 'draft_turma',
      name: formData.curso || 'Turma Ativa',
      course_name: formData.curso || 'Curso de Treinamento',
      company: formData.empresa || 'TotalSafety',
      instructors: formData.instructors || [
        {
          id: 'inst-1',
          name: formData.instrutorNome || 'Eider Gomes do Nascimento',
          role: formData.instrutorCargo || 'Instrutor e Responsável Técnico',
          registration: formData.instrutorRegistro || 'MTE0009995/RN'
        }
      ]
    };
    setQrModalTurma(t);
    setQrModalSelectedSignerKey(initialSignerKey);
    setShowQrModal(true);
  };

  // ----------------------------------------------------
  // ----------------------------------------------------
  // Ações de Turmas & Manipulação de Múltiplos Instrutores / Responsável Técnico
  // ----------------------------------------------------
  const handleCoursePresetChangeInTurma = (presetName) => {
    if (presetName === 'custom') {
      setTurmaFormData(prev => ({
        ...prev,
        selectedPresetKey: 'custom'
      }));
      return;
    }
    const preset = COURSE_PRESETS.find(p => p.name === presetName);
    if (preset) {
      setTurmaFormData(prev => ({
        ...prev,
        selectedPresetKey: preset.name,
        course_name: preset.title || preset.name,
        duration: preset.duration || prev.duration,
        validade: preset.validade || prev.validade || '24 meses',
        content: preset.content || prev.content,
        cert_model: preset.modelType || prev.cert_model || 'modelo1'
      }));
    }
  };

  const handleUpdateTechLeadInTurma = (updates) => {
    setTurmaFormData(prev => {
      const current = prev.tech_lead || {};
      const updated = { ...current, ...updates };
      return {
        ...prev,
        tech_lead: updated,
        tech_lead_name: updated.name || '',
        tech_lead_role: updated.role || '',
        tech_lead_registration: updated.registration || ''
      };
    });
  };

  const handleAddInstructorToTurma = () => {
    setTurmaFormData(prev => ({
      ...prev,
      instructors: [
        ...(prev.instructors || []),
        {
          id: `inst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: '',
          role: 'Instrutor(a)',
          registration: ''
        }
      ]
    }));
  };

  const handleRemoveInstructorFromTurma = (index) => {
    setTurmaFormData(prev => {
      const list = [...(prev.instructors || [])];
      list.splice(index, 1);
      const primary = list[0] || {};
      return {
        ...prev,
        instructors: list,
        instructor_name: primary.name || '',
        instructor_role: primary.role || '',
        instructor_registration: primary.registration || ''
      };
    });
  };

  const handleUpdateInstructorInTurma = (index, updates) => {
    setTurmaFormData(prev => {
      const list = [...(prev.instructors || [])];
      list[index] = { ...list[index], ...updates };
      const primary = list[0] || {};
      return {
        ...prev,
        instructors: list,
        instructor_name: primary.name || '',
        instructor_role: primary.role || '',
        instructor_registration: primary.registration || ''
      };
    });
  };

  const handleOpenNewTurma = () => {
    setEditingTurma(null);
    const defaultModel = COURSE_PRESETS[0] || {};
    const defaultLead = profiles.find(p => p.role?.toLowerCase().includes('responsável') || p.role?.toLowerCase().includes('admin')) || profiles[0] || {};

    setTurmaFormData({
      name: '',
      selectedPresetKey: defaultModel.name || '',
      course_name: defaultModel.title || defaultModel.name || 'NR-35 – TRABALHO EM ALTURA – NÍVEL BÁSICO',
      duration: defaultModel.duration || '8 horas',
      validade: defaultModel.validade || '24 meses',
      start_date: new Date().toISOString().split('T')[0],
      location: 'Mossoró - RN',
      company: 'TotalSafety',
      instructors: [], // Opcional: usuário pode adicionar ou deixar para depois
      instructor_name: '',
      instructor_role: '',
      instructor_registration: '',
      tech_lead: {
        name: defaultLead.name || 'Eider Gomes do Nascimento',
        role: defaultLead.role || 'Responsável Técnico / Engenheiro de Segurança',
        registration: defaultLead.registration || 'CREA 210874512-0 / MTE 0009995/RN'
      },
      tech_lead_name: defaultLead.name || 'Eider Gomes do Nascimento',
      tech_lead_role: defaultLead.role || 'Responsável Técnico / Engenheiro de Segurança',
      tech_lead_registration: defaultLead.registration || 'CREA 210874512-0 / MTE 0009995/RN',
      cert_model: defaultModel.modelType || 'modelo1',
      content: defaultModel.content || '1. Introdução e Contextualização Geral\n2. Normas, Procedimentos e Diretrizes Aplicáveis\n3. Metodologias e Execução Prática\n4. Avaliação e Verificação de Aprendizagem',
      status: 'Aberta'
    });
    setShowTurmaModal(true);
  };

  const handleEditTurma = (turma) => {
    setEditingTurma(turma);
    const loadedInstructors = (Array.isArray(turma.instructors) && turma.instructors.length > 0)
      ? turma.instructors
      : (turma.instructor_name ? [
          {
            id: 'inst-1',
            name: turma.instructor_name,
            role: turma.instructor_role || 'Instrutor',
            registration: turma.instructor_registration || ''
          }
        ] : []);

    const loadedTechLead = turma.tech_lead || {
      name: turma.tech_lead_name || 'Eider Gomes do Nascimento',
      role: turma.tech_lead_role || 'Responsável Técnico / Engenheiro de Segurança',
      registration: turma.tech_lead_registration || 'CREA 210874512-0 / MTE 0009995/RN'
    };

    setTurmaFormData({
      name: turma.name || '',
      selectedPresetKey: COURSE_PRESETS.find(p => (p.title === turma.course_name || p.name === turma.course_name))?.name || 'custom',
      course_name: turma.course_name || '',
      duration: turma.duration || '8 horas',
      validade: turma.validade || '24 meses',
      start_date: turma.start_date || new Date().toISOString().split('T')[0],
      location: turma.location || 'Mossoró - RN',
      company: turma.company || '',
      instructors: loadedInstructors,
      instructor_name: loadedInstructors[0]?.name || turma.instructor_name || '',
      instructor_role: loadedInstructors[0]?.role || turma.instructor_role || '',
      instructor_registration: loadedInstructors[0]?.registration || turma.instructor_registration || '',
      tech_lead: loadedTechLead,
      tech_lead_name: loadedTechLead.name,
      tech_lead_role: loadedTechLead.role,
      tech_lead_registration: loadedTechLead.registration,
      cert_model: turma.cert_model || 'modelo1',
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
      const validInstructors = (turmaFormData.instructors || [])
        .map(i => ({
          ...i,
          name: (i.name || '').trim(),
          role: (i.role || '').trim(),
          registration: (i.registration || '').trim()
        }))
        .filter(i => i.name.length > 0);

      const primary = validInstructors[0] || {};

      await saveTrainingClass({
        id: editingTurma ? editingTurma.id : null,
        ...turmaFormData,
        instructors: validInstructors,
        instructor_name: primary.name || '',
        instructor_role: primary.role || '',
        instructor_registration: primary.registration || '',
        tech_lead: turmaFormData.tech_lead || {
          name: turmaFormData.tech_lead_name || 'Eider Gomes do Nascimento',
          role: turmaFormData.tech_lead_role || 'Responsável Técnico / Engenheiro de Segurança',
          registration: turmaFormData.tech_lead_registration || 'CREA 210874512-0 / MTE 0009995/RN'
        }
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

    setSelectedTurmaIdInGenerator(turma.id);

    const turmaInstructors = (Array.isArray(turma.instructors) && turma.instructors.length > 0)
      ? turma.instructors
      : (turma.instructor_name ? [
          {
            id: 'inst-1',
            name: turma.instructor_name,
            role: turma.instructor_role || 'Instrutor Oficial',
            registration: turma.instructor_registration || ''
          }
        ] : []);

    const instructorNames = turmaInstructors.map(i => i.name).filter(Boolean).join(' / ');
    const instructorRoles = turmaInstructors.map(i => i.role).filter(Boolean).join(' / ');
    const instructorRegs = turmaInstructors.map(i => i.registration).filter(Boolean).join(' / ');

    const techLead = turma.tech_lead || {
      name: turma.tech_lead_name || 'Eider Gomes do Nascimento',
      role: turma.tech_lead_role || 'Responsável Técnico / Engenheiro de Segurança',
      registration: turma.tech_lead_registration || 'CREA 210874512-0 / MTE 0009995/RN'
    };

    // Atualiza o formulário do certificado com todos os dados da turma
    setFormData(prev => ({
      ...prev,
      curso: turma.course_name || turma.name,
      duracao: turma.duration || prev.duracao,
      validade: turma.validade || prev.validade || '24 meses',
      data: turma.start_date || prev.data,
      local: turma.location || prev.local,
      empresa: turma.company || prev.empresa,
      instructors: turmaInstructors,
      instrutorNome: instructorNames || prev.instrutorNome,
      instrutorCargo: instructorRoles || prev.instrutorCargo,
      instrutorRegistro: instructorRegs || prev.instrutorRegistro,
      tech_lead: techLead,
      techLeadNome: techLead.name,
      techLeadCargo: techLead.role,
      techLeadRegistro: techLead.registration,
      conteudo: turma.content || prev.conteudo
    }));

    if (turma.cert_model) {
      setCertModel(turma.cert_model);
    }

    // Carrega a lista de colaboradores se houver inscritos
    if (studentsInTurma.length > 0) {
      setColaboradores(studentsInTurma.map(s => ({
        nome: s.nome,
        cpf: s.cpf
      })));
      setFeedback({ 
        type: 'success', 
        text: `Turma "${turma.name}" carregada no gerador com ${studentsInTurma.length} participante(s)!` 
      });
    } else {
      setFeedback({ 
        type: 'info', 
        text: `Dados da turma "${turma.name}" carregados no formulário do certificado!` 
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

  // Papéis de assinatura dinâmicos com suporte a múltiplos instrutores
  const instructorRoles = (formData.instructors && formData.instructors.length > 0)
    ? formData.instructors.map((inst, idx) => ({
        key: idx === 0 ? 'instructor' : `instructor_${idx}`,
        label: formData.instructors.length > 1 ? `Instrutor(a) #${idx + 1}` : 'Instrutor(a)',
        name: inst.name || 'Instrutor não definido',
        roleTitle: inst.role || 'Instrutor',
        registration: inst.registration || ''
      }))
    : [
        { key: 'instructor', label: 'Instrutor(a)', name: formData.instrutorNome || 'Instrutor não definido' }
      ];

  const signatureRoles = [
    ...instructorRoles,
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
                    : `url(${previewTab === 'frente' ? '/certificate-templates/m2_frente_bg.png?v=ecosafety_v2' : '/certificate-templates/m2_verso_bg.png?v=ecosafety_v2'})`,
                  backgroundSize: '100% 100%',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.06)',
                  border: certModel === 'modelo1' ? '1.5px solid rgba(100, 38, 138, 0.35)' : '1.5px solid rgba(51, 64, 230, 0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: certModel === 'modelo1' ? '3.5% 9.5% 3.5% 9.5%' : '3% 7% 3.5% 7%',
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
                          gridTemplateColumns: `1fr 1fr repeat(${Math.max(1, formData.instructors?.length || 1)}, 1fr)`,
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

                          {/* Colunas dos Instrutores (Suporte a múltiplos instrutores) */}
                          {(formData.instructors && formData.instructors.length > 0 ? formData.instructors : [{ name: formData.instrutorNome, registration: formData.instrutorRegistro }]).map((inst, idx) => {
                            const sigKey = idx === 0 ? 'instructor' : `instructor_${idx}`;
                            const sigImg = currentTurmaSignatures?.[sigKey]?.dataUrl || (idx === 0 ? currentTurmaSignatures?.instructor?.dataUrl : null) || getInstructorSignatureUrl(inst.name);
                            return (
                              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <img src={sigImg} alt="Assinatura" style={{ height: '24px', objectFit: 'contain', marginBottom: '2px' }} />
                                <div style={{ borderTop: '1px solid #64268a', width: '92%', paddingTop: '2px' }}>
                                  <div style={{ fontSize: '0.54rem', fontWeight: '700', color: '#64268a', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
                                    {formData.instructors?.length > 1 ? `INSTRUTOR #${idx + 1}:` : 'INSTRUTOR:'}
                                  </div>
                                  <div style={{ fontSize: '0.51rem', color: '#64268a', fontWeight: '700' }}>{inst.name || 'Instrutor'}</div>
                                  <div style={{ fontSize: '0.48rem', color: '#64268a' }}>{inst.registration ? `Registro: ${inst.registration}` : (formData.instrutorRegistro ? `Registro: ${formData.instrutorRegistro}` : 'MTE 0122480/SP')}</div>
                                </div>
                              </div>
                            );
                          })}
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
                        {/* Topo do Certificado - Ajustado com respiro para a logo EcoSafety superior esquerda */}
                        <div style={{ textAlign: 'center', paddingTop: '8.5%' }}>
                          <div style={{ 
                            fontFamily: "'Montserrat', sans-serif",
                            fontSize: '1.02rem', 
                            fontWeight: '800', 
                            color: '#555555', 
                            letterSpacing: '1.6px', 
                            textTransform: 'uppercase' 
                          }}>
                            CERTIFICADO DE CAPACITAÇÃO
                          </div>
                          <div style={{ fontSize: '0.72rem', fontWeight: '400', color: '#000000', marginTop: '0.3rem' }}>
                            A ECOSAFETY certifica que:
                          </div>

                          {/* Destaque do Nome em Azul Real Oficial #3340e6 com Lato Black 900 */}
                          <div style={{ 
                            fontFamily: "'Lato', sans-serif",
                            fontSize: '1.2rem', 
                            fontWeight: '900', 
                            color: '#3340e6', 
                            textTransform: 'uppercase',
                            letterSpacing: '0.6px',
                            margin: '0.4rem 0'
                          }}>
                            {firstStudent?.nome ? firstStudent.nome.toUpperCase() : 'NOME DO PARTICIPANTE'}
                          </div>

                          <div style={{ fontSize: '0.66rem', color: '#000000', lineHeight: '1.45', maxWidth: '94%', margin: '0 auto' }}>
                            Portador do CPF: <strong style={{ color: '#000000' }}>{firstStudent?.cpf ? firstStudent.cpf : '000.000.000-00'}</strong>, completou com aprovação no período de{' '}
                            <strong style={{ color: '#000000' }}>{formData.data ? new Date(formData.data + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data'}</strong> na ECOSAFETY TREINAMENTOS, o treinamento de:
                          </div>

                          <div style={{ 
                            fontSize: '0.92rem', 
                            fontWeight: '800', 
                            color: '#3340e6', 
                            margin: '0.35rem 0' 
                          }}>
                            {formData.curso}
                          </div>

                          {formData.descricao && (
                            <div style={{ 
                              fontSize: '0.61rem', 
                              color: '#000000', 
                              textAlign: 'justify', 
                              lineHeight: '1.38', 
                              maxWidth: '92%', 
                              margin: '0.2rem auto' 
                            }}>
                              {formData.descricao}
                            </div>
                          )}

                          <div style={{ fontSize: '0.64rem', color: '#000000', marginTop: '0.45rem' }}>
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

                          {/* Colunas dos Instrutores (Suporte a múltiplos instrutores) */}
                          {(formData.instructors && formData.instructors.length > 0 ? formData.instructors : [{ name: formData.instrutorNome, registration: formData.instrutorRegistro }]).map((inst, idx) => {
                            const sigKey = idx === 0 ? 'instructor' : `instructor_${idx}`;
                            const sigImg = currentTurmaSignatures?.[sigKey]?.dataUrl || (idx === 0 ? currentTurmaSignatures?.instructor?.dataUrl : null) || getInstructorSignatureUrl(inst.name);
                            return (
                              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <img src={sigImg} alt="Assinatura" style={{ height: '20px', objectFit: 'contain', marginBottom: '1px' }} />
                                <div style={{ borderTop: '1px solid #000000', width: '92%', paddingTop: '2px' }}>
                                  <div style={{ fontSize: '0.48rem', fontWeight: '800', color: '#000000' }}>
                                    {formData.instructors?.length > 1 ? `INSTRUTOR #${idx + 1}` : 'INSTRUTOR'}
                                  </div>
                                  <div style={{ fontSize: '0.45rem', color: '#000000', fontWeight: '700' }}>{inst.name || 'Eider Gomes do Nascimento'}</div>
                                  <div style={{ fontSize: '0.43rem', color: '#595959' }}>{inst.registration || formData.instrutorRegistro || 'MTE0009995/RN'}</div>
                                </div>
                              </div>
                            );
                          })}
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
      {activeTab === 'turmas' && (() => {
        const hasActiveFilters = Boolean(searchQuery.trim()) || selectedTurmaFilter !== 'all';
        const turmaStatusClass = (status) =>
          status === 'Concluída' ? 'tc-status--done' : status === 'Em Andamento' ? 'tc-status--progress' : '';
        const showTurmaEnrollments = (turmaId) => {
          setSearchQuery('');
          setSelectedTurmaFilter(String(turmaId));
          document.getElementById('tc-enrollments')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        const clearEnrollmentFilters = () => {
          setSearchQuery('');
          setSelectedTurmaFilter('all');
        };

        return (
        <div className="tc-turmas">
          {/* Faixa compacta: Link Público Geral de Inscrição */}
          <section className="tc-portal" aria-labelledby="tc-portal-title">
            <div>
              <div className="tc-portal-tags">
                <span className="tc-portal-tag">Portal público de participação</span>
                <span className="tc-portal-verified">
                  <ShieldCheck size={14} />
                  Validação oficial Receita (CPF)
                </span>
              </div>
              <h3 id="tc-portal-title">
                Envie o link para os alunos preencherem a lista de presença com CPF e data de nascimento.
              </h3>
              <div className="tc-url-field">
                <code title={`${window.location.origin}/inscricao`}>{window.location.origin}/inscricao</code>
                <button
                  id="btn-copy-public-link"
                  type="button"
                  className={copiedKey === 'banner-general' ? 'is-copied' : ''}
                  onClick={() => copyPublicLink(null, 'banner-general')}
                >
                  {copiedKey === 'banner-general' ? <Check size={14} /> : <Copy size={14} />}
                  {copiedKey === 'banner-general' ? 'Copiado!' : 'Copiar link'}
                </button>
              </div>
            </div>

            <div className="tc-portal-actions">
              <a
                id="btn-test-public-form"
                href="/inscricao"
                target="_blank"
                rel="noopener noreferrer"
                className="tc-btn tc-btn--lg"
              >
                <Eye size={15} />
                Testar formulário
              </a>
              <button
                id="btn-api-cpf-token"
                type="button"
                className="tc-icon-btn"
                onClick={() => setShowTokenModal(true)}
                title="Configurar token da API CPF (Receita)"
                aria-label="Configurar token da API CPF (Receita)"
              >
                <Key size={16} />
              </button>
            </div>
          </section>

          {/* Seção de Turmas Cadastradas */}
          <section aria-labelledby="tc-turmas-title">
            <div className="tc-section-head">
              <div>
                <h2 id="tc-turmas-title">
                  Turmas de treinamento
                  <span className="tc-count">{turmas.length}</span>
                </h2>
                <p>Cada turma possui link próprio, instrutor do sistema e emissão direta de certificados.</p>
              </div>
              <button
                id="btn-new-turma"
                type="button"
                className="tc-btn tc-btn--primary tc-btn--lg"
                onClick={handleOpenNewTurma}
              >
                <Plus size={16} />
                Nova turma
              </button>
            </div>

            {loadingData ? (
              <div className="tc-empty">
                <Loader size={24} className="animate-spin" style={{ margin: '0 auto 0.6rem', color: 'var(--tc-accent)' }} />
                <p style={{ margin: 0 }}>Carregando turmas...</p>
              </div>
            ) : turmas.length === 0 ? (
              <div className="tc-empty">
                <div className="tc-empty-icon">
                  <Award size={24} />
                </div>
                <h3>Nenhuma turma criada ainda</h3>
                <p>Crie sua primeira turma selecionando um instrutor do sistema para gerar links de presença e certificados em lote.</p>
                <button
                  id="btn-create-first-turma"
                  type="button"
                  className="tc-btn tc-btn--primary tc-btn--lg"
                  onClick={handleOpenNewTurma}
                >
                  <Plus size={16} />
                  Criar primeira turma
                </button>
              </div>
            ) : (
              <div className="tc-turma-grid">
                {turmas.map(turma => {
                  const studentCount = enrollments.filter(e => e.turma_id === turma.id).length;
                  return (
                    <article key={turma.id} className="tc-turma-card">
                      <div className="tc-turma-top">
                        <span className={`tc-status ${turmaStatusClass(turma.status)}`}>
                          {turma.status || 'Aberta'}
                        </span>
                        <div className="tc-turma-tools">
                          <button
                            type="button"
                            className="tc-icon-btn tc-icon-btn--sm"
                            onClick={() => handleEditTurma(turma)}
                            title="Editar turma"
                            aria-label={`Editar turma ${turma.name}`}
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            type="button"
                            className="tc-icon-btn tc-icon-btn--sm tc-icon-btn--danger"
                            onClick={() => handleDeleteTurma(turma.id, turma.name)}
                            title="Excluir turma"
                            aria-label={`Excluir turma ${turma.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="tc-turma-title">
                        <h3>{turma.name}</h3>
                        {turma.course_name && turma.course_name !== turma.name && (
                          <p>{turma.course_name}</p>
                        )}
                      </div>

                      <ul className="tc-meta">
                        {turma.instructors && turma.instructors.length > 0 ? (
                          <li>
                            <User size={14} />
                            <span>
                              <strong>{turma.instructors.length > 1 ? `Instrutores (${turma.instructors.length}):` : 'Instrutor:'}</strong>{' '}
                              {turma.instructors.map(i => i.name).join(' • ')}
                            </span>
                          </li>
                        ) : turma.instructor_name ? (
                          <li>
                            <User size={14} />
                            <span><strong>Instrutor:</strong> {turma.instructor_name}</span>
                          </li>
                        ) : null}
                        {turma.company && (
                          <li>
                            <Building size={14} />
                            <span><strong>Empresa:</strong> {turma.company}</span>
                          </li>
                        )}
                        {turma.start_date && (
                          <li>
                            <Calendar size={14} />
                            <span><strong>Data:</strong> {new Date(turma.start_date + 'T12:00:00').toLocaleDateString('pt-BR')} • {turma.duration || '8h'}</span>
                          </li>
                        )}
                      </ul>

                      <div className="tc-turma-foot">
                        <div className="tc-turma-foot-row">
                          <button
                            type="button"
                            className="tc-enrolled-link"
                            onClick={() => showTurmaEnrollments(turma.id)}
                            title="Ver inscritos desta turma na lista de presença"
                          >
                            <Users size={15} />
                            <strong>{studentCount}</strong> inscrito{studentCount !== 1 ? 's' : ''}
                          </button>
                        </div>
                        <div className="tc-turma-actions">
                          <button
                            type="button"
                            className="tc-btn"
                            onClick={() => copyPublicLink(turma.id, `turma-${turma.id}`)}
                            title="Copiar link de inscrição específico desta turma"
                          >
                            {copiedKey === `turma-${turma.id}` ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                            {copiedKey === `turma-${turma.id}` ? 'Link copiado' : 'Link da turma'}
                          </button>
                          <button
                            type="button"
                            className="tc-btn"
                            onClick={() => handleOpenQrModal(turma)}
                            title="Gerar e gerenciar links exclusivos de assinatura desta turma"
                          >
                            <Smartphone size={14} />
                            Links de assinatura
                          </button>
                          <button
                            type="button"
                            className="tc-btn tc-btn--primary"
                            onClick={() => handleLoadTurmaIntoGenerator(turma)}
                            title="Carregar alunos desta turma no gerador de certificados"
                          >
                            <Award size={14} />
                            Emitir certificados (.pptx)
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Seção da Tabela de Inscritos */}
          <section id="tc-enrollments" aria-labelledby="tc-enrollments-title" style={{ scrollMarginTop: '1rem' }}>
            <div className="tc-section-head">
              <div>
                <h2 id="tc-enrollments-title">
                  Participantes &amp; lista de presença
                  <span className="tc-count">
                    {hasActiveFilters ? `${filteredEnrollments.length} de ${enrollments.length}` : enrollments.length}
                  </span>
                </h2>
                <p>Dados em tempo real obtidos com CPF e data de nascimento via Receita Federal.</p>
              </div>
            </div>

            <div className="tc-card tc-table-card">
              {/* Barra de filtros integrada à tabela */}
              <div className="tc-toolbar">
                <div className="tc-search">
                  <Search size={15} />
                  <input
                    id="tc-enrollment-search"
                    type="text"
                    placeholder="Buscar por nome ou CPF..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="tc-input"
                    aria-label="Buscar participante por nome ou CPF"
                  />
                </div>

                <select
                  id="tc-enrollment-filter"
                  value={selectedTurmaFilter}
                  onChange={(e) => setSelectedTurmaFilter(e.target.value)}
                  className="tc-input"
                  aria-label="Filtrar por turma"
                >
                  <option value="all">Todas as turmas ({enrollments.length})</option>
                  <option value="unassigned">Sem turma vinculada ({enrollments.filter(e => !e.turma_id).length})</option>
                  {turmas.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({enrollments.filter(e => e.turma_id === t.id).length})
                    </option>
                  ))}
                </select>

                <div className="tc-toolbar-end">
                  {hasActiveFilters && (
                    <button type="button" className="tc-link" onClick={clearEnrollmentFilters}>
                      <X size={12} />
                      Limpar filtros
                    </button>
                  )}
                  <button
                    id="btn-refresh-enrollments"
                    type="button"
                    className="tc-icon-btn"
                    onClick={loadData}
                    title="Atualizar lista em tempo real"
                    aria-label="Atualizar lista"
                  >
                    <RefreshCw size={15} />
                  </button>
                </div>
              </div>

              {filteredEnrollments.length === 0 ? (
                enrollments.length === 0 ? (
                  <div className="tc-empty tc-empty--flat">
                    <div className="tc-empty-icon">
                      <Users size={22} />
                    </div>
                    <h3>Nenhuma inscrição recebida ainda</h3>
                    <p>Compartilhe o link público com os alunos — as inscrições aparecem aqui automaticamente.</p>
                    <div className="tc-empty-actions">
                      <button
                        type="button"
                        className="tc-btn tc-btn--soft"
                        onClick={() => copyPublicLink(null, 'empty-enrollments')}
                      >
                        {copiedKey === 'empty-enrollments' ? <Check size={14} /> : <Copy size={14} />}
                        {copiedKey === 'empty-enrollments' ? 'Link copiado' : 'Copiar link público'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="tc-empty tc-empty--flat">
                    <div className="tc-empty-icon">
                      <Filter size={22} />
                    </div>
                    <h3>Nenhum participante encontrado</h3>
                    <p>Nenhum aluno corresponde aos filtros atuais.</p>
                    <div className="tc-empty-actions">
                      <button type="button" className="tc-btn" onClick={clearEnrollmentFilters}>
                        <X size={14} />
                        Limpar filtros
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="tc-table-wrap">
                  <table className="tc-table">
                    <thead>
                      <tr>
                        <th>Participante</th>
                        <th>CPF</th>
                        <th>Nascimento</th>
                        <th>Turma vinculada</th>
                        <th>Inscrição</th>
                        <th className="tc-col-end">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEnrollments.map(student => (
                        <tr key={student.id}>
                          <td>
                            <div className="tc-person">
                              <div className="tc-avatar">
                                {student.nome?.charAt(0)?.toUpperCase() || 'P'}
                              </div>
                              <div>
                                <div className="tc-person-name">{student.nome}</div>
                                {student.empresa && (
                                  <div className="tc-person-sub">
                                    {student.empresa} {student.telefone ? `• ${student.telefone}` : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="tc-cell-mono">{student.cpf}</td>
                          <td className="tc-cell-muted">
                            {student.data_nascimento ? new Date(student.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td>
                            <select
                              value={student.turma_id || ''}
                              onChange={(e) => handleStudentTurmaChange(student.id, e.target.value)}
                              className="tc-input"
                              aria-label={`Turma vinculada de ${student.nome}`}
                            >
                              <option value="">(Sem turma vinculada)</option>
                              {turmas.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="tc-cell-muted" style={{ fontSize: '0.78rem' }}>
                            {student.created_at ? new Date(student.created_at).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="tc-col-end">
                            <button
                              type="button"
                              className="tc-icon-btn tc-icon-btn--sm tc-icon-btn--danger"
                              onClick={() => handleDeleteStudent(student.id, student.nome)}
                              title="Excluir inscrição"
                              aria-label={`Excluir inscrição de ${student.nome}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL: CRIAR OU EDITAR TURMA                                              */}
      {/* ========================================================================= */}
      {showTurmaModal && (
        <div className="modal-backdrop" onClick={() => setShowTurmaModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '660px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '1.25rem', padding: '1.75rem' }}>
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
                  style={{ width: '100%', marginTop: '0.35rem', fontWeight: '700', fontSize: '0.92rem' }}
                />
              </div>

              {/* Seletor Oficial de Curso / Catálogo TotalSafety */}
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.75rem', padding: '0.85rem' }}>
                <label className="modal-label" style={{ fontWeight: '800', fontSize: '0.8125rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.45rem' }}>
                  <BookOpen size={16} />
                  Puxar Configurações do Catálogo de Cursos Oficiais
                </label>
                <select
                  className="input"
                  value={turmaFormData.selectedPresetKey || 'custom'}
                  onChange={(e) => handleCoursePresetChangeInTurma(e.target.value)}
                  style={{ width: '100%', fontSize: '0.82rem', fontWeight: '600', backgroundColor: '#ffffff' }}
                >
                  <option value="custom">-- Selecionar Curso do Catálogo Oficial --</option>
                  {COURSE_PRESETS.map(preset => (
                    <option key={preset.name} value={preset.name}>
                      {preset.name} ({preset.duration}) — {preset.modelType === 'modelo1' ? 'EcoCurvas' : 'Ondas & Colmeia'}
                    </option>
                  ))}
                  <option value="custom">Outro Curso / Digitar Nome Personalizado</option>
                </select>
                <p style={{ fontSize: '0.72rem', color: '#166534', margin: '0.4rem 0 0 0' }}>
                  💡 Ao escolher um curso, a carga horária, validade, modelo e o conteúdo programático oficial são preenchidos automaticamente.
                </p>
              </div>

              <div>
                <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Nome Oficial do Curso no Certificado *</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="Ex: NR-35 – TRABALHO EM ALTURA – NÍVEL BÁSICO"
                  value={turmaFormData.course_name}
                  onChange={e => setTurmaFormData(prev => ({ ...prev, course_name: e.target.value }))}
                  style={{ width: '100%', marginTop: '0.35rem', fontWeight: '600' }}
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
                  <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Validade do Treinamento</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: 24 meses, 12 meses"
                    value={turmaFormData.validade || '24 meses'}
                    onChange={e => setTurmaFormData(prev => ({ ...prev, validade: e.target.value }))}
                    style={{ width: '100%', marginTop: '0.35rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
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
              </div>

              <div>
                <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Empresa Solicitante</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                  {companies && companies.length > 0 && (
                    <select
                      className="input"
                      value={companies.some(c => c.name === turmaFormData.company) ? turmaFormData.company : (turmaFormData.company ? 'custom' : '')}
                      onChange={(e) => {
                        if (e.target.value && e.target.value !== 'custom') {
                          setTurmaFormData(prev => ({ ...prev, company: e.target.value }));
                        }
                      }}
                      style={{ maxWidth: '210px', fontSize: '0.78rem' }}
                    >
                      <option value="">Selecione cadastrada...</option>
                      {companies.map(c => (
                        <option key={c.id || c.name} value={c.name}>{c.name}</option>
                      ))}
                      <option value="custom">Outra / Digitar manual</option>
                    </select>
                  )}
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: TotalSafety / Nome do Cliente"
                    value={turmaFormData.company}
                    onChange={e => setTurmaFormData(prev => ({ ...prev, company: e.target.value }))}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              {/* ========================================================================= */}
              {/* SEÇÃO DE INSTRUTORES DA TURMA (TOTALMENTE OPCIONAL)                       */}
              {/* ========================================================================= */}
              <div style={{
                marginTop: '0.4rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '0.85rem',
                padding: '0.85rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div>
                    <label className="modal-label" style={{ fontWeight: '800', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0, color: '#0284c7' }}>
                      <User size={15} />
                      Instrutores do Treinamento ({turmaFormData.instructors?.length || 0})
                    </label>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      Opcional: pode ser definido agora, no gerador ou via link de assinatura
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddInstructorToTurma}
                    style={{
                      background: 'rgba(2, 132, 199, 0.08)',
                      border: '1px solid rgba(2, 132, 199, 0.3)',
                      color: '#0284c7',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <Plus size={13} />
                    Adicionar Instrutor
                  </button>
                </div>

                {(!turmaFormData.instructors || turmaFormData.instructors.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '0.85rem', color: '#94a3b8', fontSize: '0.78rem', fontStyle: 'italic' }}>
                    Nenhum instrutor adicionado previamente. Você pode clicar no botão acima para adicionar um ou mais instrutores agora, ou definir depois.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.4rem' }}>
                    {turmaFormData.instructors.map((inst, index) => (
                      <div
                        key={inst.id || index}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.75rem',
                          padding: '0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.45rem',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: '800', color: index === 0 ? '#0284c7' : '#7c3aed', textTransform: 'uppercase' }}>
                            {index === 0 ? 'Instrutor Principal' : `Instrutor Adicional #${index + 1}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveInstructorFromTurma(index)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem'
                            }}
                          >
                            <Trash2 size={13} /> Remover
                          </button>
                        </div>

                        {/* Seletor rápido por lista oficial/usuários */}
                        <select
                          className="input"
                          value={profiles.some(p => p.name.trim() === inst.name?.trim()) ? inst.name : (inst.name ? 'custom' : '')}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val && val !== 'custom') {
                              const sel = profiles.find(p => p.name === val);
                              handleUpdateInstructorInTurma(index, {
                                name: sel ? sel.name : val,
                                role: sel?.role === 'Admin' ? 'Instrutor e Responsável Técnico' : (sel?.role ? `Instrutor / ${sel.role}` : (inst.role || 'Instrutor')),
                                registration: sel?.registration || inst.registration || ''
                              });
                            }
                          }}
                          style={{ width: '100%', fontSize: '0.78rem', padding: '0.45rem 0.65rem' }}
                        >
                          <option value="">Selecione dos usuários/instrutores cadastrados...</option>
                          {profiles.map(p => (
                            <option key={p.id || p.name} value={p.name}>
                              {p.name} {p.role ? `— ${p.role}` : ''}
                            </option>
                          ))}
                          <option value="custom">Outro / Digitar manualmente</option>
                        </select>

                        <input
                          type="text"
                          className="input"
                          placeholder="Nome completo do Instrutor (Opcional)"
                          value={inst.name || ''}
                          onChange={e => handleUpdateInstructorInTurma(index, { name: e.target.value })}
                          style={{ width: '100%', fontSize: '0.8rem', padding: '0.45rem 0.65rem' }}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <div>
                            <label style={{ fontSize: '0.68rem', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '2px' }}>Cargo / Qualificação</label>
                            <input
                              type="text"
                              className="input"
                              placeholder="Ex: Téc. Segurança do Trabalho"
                              value={inst.role || ''}
                              onChange={e => handleUpdateInstructorInTurma(index, { role: e.target.value })}
                              style={{ width: '100%', fontSize: '0.78rem', padding: '0.4rem 0.6rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.68rem', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '2px' }}>Registro MTE / SRTE / CREA</label>
                            <input
                              type="text"
                              className="input"
                              placeholder="Ex: MTE0009995/RN"
                              value={inst.registration || ''}
                              onChange={e => handleUpdateInstructorInTurma(index, { registration: e.target.value })}
                              style={{ width: '100%', fontSize: '0.78rem', padding: '0.4rem 0.6rem' }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ========================================================================= */}
              {/* SEÇÃO DO RESPONSÁVEL TÉCNICO (CONFIGURÁVEL)                               */}
              {/* ========================================================================= */}
              <div style={{
                backgroundColor: '#faf5ff',
                border: '1px solid #e9d5ff',
                borderRadius: '0.85rem',
                padding: '0.85rem'
              }}>
                <label className="modal-label" style={{ fontWeight: '800', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0 0 0.4rem 0', color: '#7c3aed' }}>
                  <ShieldCheck size={16} />
                  Responsável Técnico do Treinamento
                </label>
                <span style={{ fontSize: '0.7rem', color: '#6b21a8', display: 'block', marginBottom: '0.6rem' }}>
                  Profissional habilitado responsável pela emissão técnica dos certificados desta turma.
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  <select
                    className="input"
                    value={profiles.some(p => p.name.trim() === turmaFormData.tech_lead?.name?.trim()) ? turmaFormData.tech_lead?.name : (turmaFormData.tech_lead?.name ? 'custom' : '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && val !== 'custom') {
                        const sel = profiles.find(p => p.name === val);
                        handleUpdateTechLeadInTurma({
                          name: sel ? sel.name : val,
                          role: sel?.role || 'Responsável Técnico / Engenheiro de Segurança',
                          registration: sel?.registration || 'CREA 210874512-0 / MTE 0009995/RN'
                        });
                      }
                    }}
                    style={{ width: '100%', fontSize: '0.78rem', padding: '0.45rem 0.65rem', backgroundColor: '#ffffff' }}
                  >
                    <option value="">Selecione dos profissionais cadastrados...</option>
                    {profiles.map(p => (
                      <option key={p.id || p.name} value={p.name}>
                        {p.name} {p.role ? `— ${p.role}` : ''}
                      </option>
                    ))}
                    <option value="custom">Outro Responsável / Digitar Manualmente</option>
                  </select>

                  <input
                    type="text"
                    className="input"
                    placeholder="Nome completo do Responsável Técnico"
                    value={turmaFormData.tech_lead?.name || ''}
                    onChange={e => handleUpdateTechLeadInTurma({ name: e.target.value })}
                    style={{ width: '100%', fontSize: '0.8rem', padding: '0.45rem 0.65rem', backgroundColor: '#ffffff' }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.68rem', fontWeight: '600', color: '#6b21a8', display: 'block', marginBottom: '2px' }}>Cargo / Qualificação</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Ex: Engenheiro de Segurança do Trabalho"
                        value={turmaFormData.tech_lead?.role || ''}
                        onChange={e => handleUpdateTechLeadInTurma({ role: e.target.value })}
                        style={{ width: '100%', fontSize: '0.78rem', padding: '0.4rem 0.6rem', backgroundColor: '#ffffff' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.68rem', fontWeight: '600', color: '#6b21a8', display: 'block', marginBottom: '2px' }}>Registro CREA / CFT / MTE</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Ex: CREA 210874512-0"
                        value={turmaFormData.tech_lead?.registration || ''}
                        onChange={e => handleUpdateTechLeadInTurma({ registration: e.target.value })}
                        style={{ width: '100%', fontSize: '0.78rem', padding: '0.4rem 0.6rem', backgroundColor: '#ffffff' }}
                      />
                    </div>
                  </div>
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
                <button id="btn-submit-turma" type="submit" className="btn btn-primary" style={{ backgroundColor: '#0284c7', fontWeight: '700' }}>
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
      {/* ========================================================================= */}
      {/* MODAL: LINKS EXCLUSIVOS DE ASSINATURA DA TURMA (EXPIRAÇÃO AUTOMÁTICA)      */}
      {/* ========================================================================= */}
      {showQrModal && qrModalTurma && (() => {
        const modalInstructors = (Array.isArray(qrModalTurma.instructors) && qrModalTurma.instructors.length > 0)
          ? qrModalTurma.instructors
          : [
              {
                id: 'inst-1',
                name: qrModalTurma.instructor_name || 'Eider Gomes do Nascimento',
                role: qrModalTurma.instructor_role || 'Instrutor e Responsável Técnico',
                registration: qrModalTurma.instructor_registration || 'MTE0009995/RN'
              }
            ];

        const signersList = [
          ...modalInstructors.map((inst, idx) => ({
            key: idx === 0 ? 'instructor' : `instructor_${idx}`,
            label: modalInstructors.length > 1 ? `Instrutor #${idx + 1}` : 'Instrutor(a)',
            name: inst.name || 'Instrutor',
            role: inst.role || 'Instrutor(a)',
            instructorId: inst.id
          })),
          {
            key: 'tech_lead',
            label: 'Responsável Técnico',
            name: certModel === 'modelo1' ? 'Eider Gomes do Nascimento' : 'Raimundo Fernandes de Oliveira Junior',
            role: 'Responsável Técnico',
            instructorId: null
          }
        ];

        const activeSigner = signersList.find(s => s.key === qrModalSelectedSignerKey) || signersList[0];
        const activeToken = createOrGetSigningToken(qrModalTurma.id, activeSigner.key, {
          signerName: activeSigner.name,
          roleTitle: activeSigner.role,
          instructorId: activeSigner.instructorId,
          turmaName: qrModalTurma.name,
          courseName: qrModalTurma.course_name
        });

        const activeSignerUrl = `${window.location.origin}/assinar-turma/${qrModalTurma.id}?token=${activeToken?.token || ''}`;

        return (
          <div className="modal-backdrop" onClick={() => setShowQrModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px', borderRadius: '1.25rem', padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '0.65rem',
                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Smartphone size={20} style={{ color: '#7c3aed' }} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                      Links de Assinatura da Turma
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Turma: <strong>{qrModalTurma.name}</strong> • {qrModalTurma.course_name || 'Curso'}
                    </span>
                  </div>
                </div>
                <button className="modal-close" onClick={() => setShowQrModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div style={{
                backgroundColor: '#eff6ff',
                borderRadius: '0.75rem',
                padding: '0.75rem 1rem',
                border: '1px solid #dbeafe',
                fontSize: '0.78rem',
                color: '#1e40af',
                lineHeight: '1.45',
                marginBottom: '1.25rem',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'flex-start'
              }}>
                <Sparkles size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#2563eb' }} />
                <span>
                  <strong>Links de uso único com expiração automática:</strong> Envie o link exclusivo abaixo para o instrutor assinar com o dedo no celular. Assim que a assinatura é confirmada, o link é finalizado e não aceita novas modificações.
                </span>
              </div>

              {/* Lista de Signatários da Turma */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {signersList.map((signer) => {
                  const token = createOrGetSigningToken(qrModalTurma.id, signer.key, {
                    signerName: signer.name,
                    roleTitle: signer.role,
                    instructorId: signer.instructorId,
                    turmaName: qrModalTurma.name,
                    courseName: qrModalTurma.course_name
                  });
                  const isSigned = token?.status === 'signed';
                  const isSelected = signer.key === activeSigner.key;
                  const signerUrl = `${window.location.origin}/assinar-turma/${qrModalTurma.id}?token=${token?.token || ''}`;

                  return (
                    <div
                      key={signer.key}
                      style={{
                        border: isSelected ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                        borderRadius: '0.85rem',
                        padding: '0.85rem 1rem',
                        backgroundColor: isSelected ? 'rgba(124, 58, 237, 0.03)' : '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#7c3aed', textTransform: 'uppercase' }}>
                              {signer.label}
                            </span>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '1rem',
                              backgroundColor: isSigned ? '#ecfdf5' : '#fffbeb',
                              color: isSigned ? '#059669' : '#d97706',
                              border: isSigned ? '1px solid #a7f3d0' : '1px solid #fde68a'
                            }}>
                              {isSigned ? '✅ Assinado (Link Finalizado)' : '⏳ Aguardando Assinatura'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                            {signer.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {signer.role}
                          </div>
                        </div>

                        {/* Botões de Ação para este Signatário */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                              navigator.clipboard.writeText(signerUrl);
                              setCopiedKey(`sig-link-${signer.key}`);
                              setTimeout(() => setCopiedKey(null), 2500);
                            }}
                            style={{ fontSize: '0.74rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            title="Copiar link exclusivo de assinatura"
                          >
                            {copiedKey === `sig-link-${signer.key}` ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                            {copiedKey === `sig-link-${signer.key}` ? 'Copiado!' : 'Copiar Link'}
                          </button>

                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(
                              `Olá, ${signer.name}! Segue seu link exclusivo e seguro para assinar digitalmente os certificados da turma "${qrModalTurma.name}":\n\n${signerUrl}`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn"
                            style={{
                              fontSize: '0.74rem',
                              padding: '0.35rem 0.65rem',
                              backgroundColor: '#25D366',
                              color: '#ffffff',
                              fontWeight: '700',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              borderRadius: '0.5rem'
                            }}
                            title="Enviar via WhatsApp"
                          >
                            <Share2 size={13} />
                            WhatsApp
                          </a>

                          <button
                            type="button"
                            className="btn"
                            onClick={() => setQrModalSelectedSignerKey(signer.key)}
                            style={{
                              fontSize: '0.74rem',
                              padding: '0.35rem 0.65rem',
                              backgroundColor: isSelected ? '#7c3aed' : 'rgba(124, 58, 237, 0.08)',
                              color: isSelected ? '#ffffff' : '#7c3aed',
                              border: '1px solid rgba(124, 58, 237, 0.3)',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                            title="Visualizar QR Code deste signatário"
                          >
                            <QrCode size={13} />
                            Ver QR Code
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Deseja gerar um novo link de uso único para ${signer.name}? O link pendente anterior será cancelado.`)) {
                                generateNewSigningToken(qrModalTurma.id, signer.key, {
                                  signerName: signer.name,
                                  roleTitle: signer.role,
                                  instructorId: signer.instructorId,
                                  turmaName: qrModalTurma.name,
                                  courseName: qrModalTurma.course_name
                                });
                                setTokensRefreshKey(k => k + 1);
                                setFeedback({ type: 'success', text: `Novo link gerado com sucesso para ${signer.name}!` });
                                setTimeout(() => setFeedback(null), 3500);
                              }
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#64748b',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              padding: '0.35rem 0.45rem'
                            }}
                            title="Gerar novo link descartável caso queira invalidar o anterior"
                          >
                            <RefreshCw size={12} /> Novo
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Seção do QR Code Ativo */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '1rem',
                padding: '1.25rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.3rem' }}>
                  QR Code para: <span style={{ color: '#7c3aed' }}>{activeSigner.name}</span> ({activeSigner.role})
                </div>
                <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '0 0 0.85rem 0' }}>
                  Aponte a câmera do celular para assinar com o dedo diretamente no celular.
                </p>

                <div style={{
                  display: 'inline-block',
                  padding: '0.65rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '0.85rem',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  marginBottom: '0.85rem'
                }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(activeSignerUrl)}`}
                    alt={`QR Code para ${activeSigner.name}`}
                    style={{ width: '180px', height: '180px', display: 'block', borderRadius: '0.4rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', maxWidth: '440px', margin: '0 auto' }}>
                  <input
                    type="text"
                    readOnly
                    className="input"
                    value={activeSignerUrl}
                    style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem', fontFamily: 'monospace' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(activeSignerUrl);
                      setCopiedKey('active-qr-link');
                      setTimeout(() => setCopiedKey(null), 2500);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                  >
                    {copiedKey === 'active-qr-link' ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                    {copiedKey === 'active-qr-link' ? 'Copiado!' : 'Copiar'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => window.open(activeSignerUrl, '_blank')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backgroundColor: '#7c3aed',
                      fontWeight: '700',
                      fontSize: '0.75rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <ExternalLink size={14} /> Abrir
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default TrainingCertificatesPage;
