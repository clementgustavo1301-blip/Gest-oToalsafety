import React, { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { jsPDF } from 'jspdf';
import { 
  Award, FileText, Plus, Trash2, Download, Loader, 
  CheckCircle2, AlertCircle, Users, Sparkles,
  HelpCircle, ClipboardCopy, RefreshCw, Layers, Link as LinkIcon,
  Copy, Check, ExternalLink, Calendar, Search, Filter,
  Edit, ShieldCheck, ChevronRight, ChevronDown, UserCheck, X, User,
  CheckCircle, Clock, Briefcase, MapPin, Building,
  Smartphone, QrCode, PenTool, Share2, FileSpreadsheet, Upload,
  GraduationCap
} from 'lucide-react';
import { balanceSyllabusColumns, getCertificateFrontGeometry } from '../utils/trainingPptxGenerator';
import { renderCertificateDomPage } from '../utils/domCertificatePdf';
import { formatCpf } from '../services/cpfService';
import { getProfiles, getCompanies, getGroups } from '../services/storageService';
import { getCustomTrainings, saveCustomTraining } from '../services/customTrainingsService';
import { 
  getTrainingClasses, saveTrainingClass, deleteTrainingClass,
  getTrainingEnrollments, updateStudent, deleteStudent, subscribeToEnrollments,
  importTrainingEnrollments
} from '../services/trainingClassesService';
import { parseTrainingParticipantRows } from '../utils/trainingSpreadsheetImport';
import SignaturePadModal from '../components/SignaturePadModal';
import './TrainingCertificatesPage.css';
import { 
  getTurmaSignatures, saveRoleSignature, clearTurmaSignature, subscribeToTurmaSignatures,
  createOrGetSigningToken, generateNewSigningToken, getTurmaTokens,
  initializeDefaultSignaturesForTurma
} from '../services/turmaSignatureService';

import { OFFICIAL_TRAINING_MODELS, OFFICIAL_INSTRUCTORS, getInstructorSignatureUrl } from '../data/officialTrainingModels';

// Catálogo Oficial de Modelos de Treinamentos e Certificados TotalSafety / EcoSafety
const COURSE_PRESETS = OFFICIAL_TRAINING_MODELS;

// Lista de instrutores e responsáveis técnicos oficiais extraídos diretamente dos certificados
const FALLBACK_PROFILES = OFFICIAL_INSTRUCTORS;

const DEFAULT_TECH_LEAD = {
  name: '',
  role: 'Responsável Técnico / Engenheiro de Segurança',
  registration: ''
};
const DEFAULT_COORDINATOR = {
  name: '',
  role: 'Coordenação Técnica',
  registration: ''
};
const DEFAULT_APH_COORDINATOR = {
  name: '',
  role: 'Coordenação Técnica / Instrutora de Saúde e APH',
  registration: ''
};

const getDefaultCoordinator = () => null;

const getTurmaCoordinator = (turma = {}) =>
  (turma.coordinator && (turma.coordinator.name || turma.coordinator.role || turma.coordinator.registration))
    ? turma.coordinator
    : null;

/**
 * Determina dinamicamente as proporções, tamanhos de fonte, entrelinhas e espaçamentos
 * para a Frente do Modelo 2 (Ondas Diagonais e Colmeia), garantindo que textos longos
 * (como NR-35 Sistemas de Ancoragem com 440+ caracteres) nunca cortem, nunca empurrem
 * as assinaturas para cima da onda diagonal inferior e mantenham a hierarquia visual impecável.
 */
export const getModelo2FrenteStyles = ({ curso = '', descricao = '', studentName = '' }) => {
  const descLen = (descricao || '').length;
  const courseLen = (curso || '').length;
  const nameLen = (studentName || '').length;

  const isExtraLong = descLen > 360 || (descLen > 240 && courseLen > 40);
  const isLong = descLen > 200 || courseLen > 32;
  const isMedium = descLen > 80;

  if (isExtraLong) {
    return {
      topPadding: '1.2%',
      titleSize: '0.86rem',
      titleLetterSpacing: '1.2px',
      subTitleSize: '0.58rem',
      subTitleMargin: '0.12rem',
      studentNameSize: nameLen > 30 ? '0.92rem' : '1.02rem',
      studentNameMargin: '0.18rem 0',
      cpfTextSize: '0.56rem',
      cpfLineHeight: '1.22',
      courseSize: '0.74rem',
      courseMargin: '0.16rem 0',
      descSize: '0.46rem',
      descLineHeight: '1.18',
      descMargin: '0.12rem auto',
      dateSize: '0.54rem',
      dateMarginTop: '0.16rem',
      sigImageHeight: '17px',
      sigLabelSize: '0.42rem',
      sigNameSize: '0.40rem',
      sigRegSize: '0.37rem',
      sigPaddingBottom: '0.25rem',
      sigPaddingX: '1.2rem',
      sigGap: '0.25rem'
    };
  }

  if (isLong) {
    return {
      topPadding: '3.0%',
      titleSize: '0.92rem',
      titleLetterSpacing: '1.4px',
      subTitleSize: '0.64rem',
      subTitleMargin: '0.2rem',
      studentNameSize: nameLen > 30 ? '0.98rem' : '1.10rem',
      studentNameMargin: '0.25rem 0',
      cpfTextSize: '0.60rem',
      cpfLineHeight: '1.30',
      courseSize: '0.82rem',
      courseMargin: '0.24rem 0',
      descSize: '0.52rem',
      descLineHeight: '1.24',
      descMargin: '0.16rem auto',
      dateSize: '0.58rem',
      dateMarginTop: '0.25rem',
      sigImageHeight: '18px',
      sigLabelSize: '0.45rem',
      sigNameSize: '0.42rem',
      sigRegSize: '0.39rem',
      sigPaddingBottom: '0.35rem',
      sigPaddingX: '1.0rem',
      sigGap: '0.30rem'
    };
  }

  if (isMedium) {
    return {
      topPadding: '5.0%',
      titleSize: '0.98rem',
      titleLetterSpacing: '1.5px',
      subTitleSize: '0.68rem',
      subTitleMargin: '0.25rem',
      studentNameSize: nameLen > 30 ? '1.05rem' : '1.16rem',
      studentNameMargin: '0.32rem 0',
      cpfTextSize: '0.63rem',
      cpfLineHeight: '1.38',
      courseSize: '0.88rem',
      courseMargin: '0.30rem 0',
      descSize: '0.58rem',
      descLineHeight: '1.32',
      descMargin: '0.20rem auto',
      dateSize: '0.62rem',
      dateMarginTop: '0.35rem',
      sigImageHeight: '19px',
      sigLabelSize: '0.47rem',
      sigNameSize: '0.44rem',
      sigRegSize: '0.41rem',
      sigPaddingBottom: '0.4rem',
      sigPaddingX: '0.8rem',
      sigGap: '0.35rem'
    };
  }

  return {
    topPadding: '6.5%',
    titleSize: '1.02rem',
    titleLetterSpacing: '1.6px',
    subTitleSize: '0.72rem',
    subTitleMargin: '0.3rem',
    studentNameSize: '1.20rem',
    studentNameMargin: '0.4rem 0',
    cpfTextSize: '0.66rem',
    cpfLineHeight: '1.45',
    courseSize: '0.92rem',
    courseMargin: '0.35rem 0',
    descSize: '0.61rem',
    descLineHeight: '1.38',
    descMargin: '0.2rem auto',
    dateSize: '0.64rem',
    dateMarginTop: '0.45rem',
    sigImageHeight: '20px',
    sigLabelSize: '0.48rem',
    sigNameSize: '0.45rem',
    sigRegSize: '0.43rem',
    sigPaddingBottom: '0.4rem',
    sigPaddingX: '0.5rem',
    sigGap: '0.35rem'
  };
};

/**
 * Determina dinamicamente o dimensionamento do verso do Modelo 2 para exibir
 * 100% dos módulos do conteúdo programático sem gerar barra de rolagem e sem cortes.
 */
export const getModelo2VersoStyles = (conteudo = '') => {
  const { maxLinesInCol } = balanceSyllabusColumns(conteudo, 38);

  if (maxLinesInCol > 38) {
    return {
      fontSize: '0.35rem', lineHeight: '1.10', gap: '0.68rem',
      headerTitleSize: '0.58rem', headerDurationSize: '0.50rem',
      headerPadding: '0.12rem', headerMargin: '0.16rem',
      footerSize: '0.42rem', footerPadding: '0.16rem'
    };
  }
  if (maxLinesInCol > 30) {
    return {
      fontSize: '0.40rem', lineHeight: '1.14', gap: '0.74rem',
      headerTitleSize: '0.62rem', headerDurationSize: '0.53rem',
      headerPadding: '0.15rem', headerMargin: '0.2rem',
      footerSize: '0.45rem', footerPadding: '0.18rem'
    };
  }
  if (maxLinesInCol > 23) {
    return {
      fontSize: '0.46rem', lineHeight: '1.18', gap: '0.82rem',
      headerTitleSize: '0.66rem', headerDurationSize: '0.56rem',
      headerPadding: '0.18rem', headerMargin: '0.24rem',
      footerSize: '0.48rem', footerPadding: '0.21rem'
    };
  }
  if (maxLinesInCol > 16) {
    return {
      fontSize: '0.52rem', lineHeight: '1.23', gap: '0.9rem',
      headerTitleSize: '0.70rem', headerDurationSize: '0.59rem',
      headerPadding: '0.21rem', headerMargin: '0.28rem',
      footerSize: '0.50rem', footerPadding: '0.24rem'
    };
  }
  return {
    fontSize: '0.62rem',
    lineHeight: '1.36',
    gap: '1.1rem',
    headerTitleSize: '0.75rem',
    headerDurationSize: '0.65rem',
    headerPadding: '0.3rem',
    headerMargin: '0.4rem',
    footerSize: '0.56rem',
    footerPadding: '0.35rem'
  };
};

/**
 * Adaptação para a Frente do Modelo 1 (EcoCurvas Laterais - Roxo Oficial EcoSafety #64268a)
 */
export const getModelo1FrenteStyles = ({ curso = '', descricao = '', studentName = '' }) => {
  const visualWeight = (descricao || '').length + ((curso || '').length * 1.5) + ((studentName || '').length * 0.8);
  const nameLen = (studentName || '').length;

  if (visualWeight > 380) {
    return {
      headerMaxHeight: '44px',
      subTitleSize: '0.60rem',
      subTitleMargin: '0.10rem',
      studentNameSize: nameLen > 30 ? '0.92rem' : '1.04rem',
      studentNameMargin: '0.16rem 0',
      cpfTextSize: '0.55rem',
      cpfLineHeight: '1.24',
      courseSize: '0.76rem',
      courseMargin: '0.16rem 0',
      descSize: '0.47rem',
      descLineHeight: '1.20',
      descMargin: '0.10rem auto',
      dateSize: '0.53rem',
      dateMarginTop: '0.18rem',
      sigHeight: '18px',
      sigTitleSize: '0.46rem',
      sigNameSize: '0.44rem',
      sigRegSize: '0.41rem',
      sigGap: '0.3rem'
    };
  }
  if (visualWeight > 230) {
    return {
      headerMaxHeight: '48px',
      subTitleSize: '0.65rem',
      subTitleMargin: '0.16rem',
      studentNameSize: nameLen > 30 ? '1.02rem' : '1.14rem',
      studentNameMargin: '0.22rem 0',
      cpfTextSize: '0.59rem',
      cpfLineHeight: '1.30',
      courseSize: '0.84rem',
      courseMargin: '0.22rem 0',
      descSize: '0.53rem',
      descLineHeight: '1.26',
      descMargin: '0.15rem auto',
      dateSize: '0.57rem',
      dateMarginTop: '0.25rem',
      sigHeight: '20px',
      sigTitleSize: '0.50rem',
      sigNameSize: '0.47rem',
      sigRegSize: '0.44rem',
      sigGap: '0.35rem'
    };
  }
  return {
    headerMaxHeight: '54px',
    subTitleSize: '0.70rem',
    subTitleMargin: '0.24rem',
    studentNameSize: nameLen > 30 ? '1.10rem' : '1.22rem',
    studentNameMargin: '0.30rem 0',
    cpfTextSize: '0.64rem',
    cpfLineHeight: '1.40',
    courseSize: '0.90rem',
    courseMargin: '0.28rem 0',
    descSize: '0.58rem',
    descLineHeight: '1.34',
    descMargin: '0.20rem auto',
    dateSize: '0.62rem',
    dateMarginTop: '0.32rem',
    sigHeight: '24px',
    sigTitleSize: '0.54rem',
    sigNameSize: '0.51rem',
    sigRegSize: '0.48rem',
    sigGap: '0.45rem'
  };
};

/**
 * Adaptação para o Verso do Modelo 1
 */
export const getModelo1VersoStyles = (conteudo = '') => {
  const { totalWeight, maxLinesInCol } = balanceSyllabusColumns(conteudo, 42);

  if (maxLinesInCol > 36) {
    return {
      useTwoCols: true, fontSize: '0.36rem', lineHeight: '1.10', gap: '0.7rem',
      headerSize: '0.60rem', headerDurationSize: '0.50rem', headerPadding: '0.12rem', headerMargin: '0.15rem', footerSize: '0.43rem'
    };
  }
  if (totalWeight > 24) {
    return {
      useTwoCols: true,
      fontSize: maxLinesInCol > 27 ? '0.42rem' : '0.49rem',
      lineHeight: maxLinesInCol > 27 ? '1.14' : '1.20',
      gap: '0.8rem',
      headerSize: '0.66rem', headerDurationSize: '0.55rem', headerPadding: '0.18rem', headerMargin: '0.22rem', footerSize: '0.47rem'
    };
  }
  if (totalWeight > 12) {
    return {
      useTwoCols: false, fontSize: '0.54rem', lineHeight: '1.26', gap: '0',
      headerSize: '0.70rem', headerDurationSize: '0.58rem', headerPadding: '0.22rem', headerMargin: '0.28rem', footerSize: '0.50rem'
    };
  }
  return {
    useTwoCols: false,
    fontSize: '0.63rem',
    lineHeight: '1.45',
    gap: '0',
    headerSize: '0.74rem',
    headerDurationSize: '0.62rem',
    headerPadding: '0.25rem',
    headerMargin: '0.35rem',
    footerSize: '0.56rem'
  };
};

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
  const [customTrainings, setCustomTrainings] = useState([]);
  const [selectedTurmaIdInGenerator, setSelectedTurmaIdInGenerator] = useState('');
  const [isCustomCourse, setIsCustomCourse] = useState(false);
  const [isCustomCompany, setIsCustomCompany] = useState(false);
  const [isEditingInstructor, setIsEditingInstructor] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal para Criar Novo Curso
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [createCourseTarget, setCreateCourseTarget] = useState('generator'); // 'generator' | 'turma'
  const [savingCourse, setSavingCourse] = useState(false);
  const [newCourseData, setNewCourseData] = useState({
    name: '',
    duracao: '8 horas',
    validade: '24 meses',
    cert_model: 'modelo1',
    descricao: '',
    conteudo: '1. Introdução e Contextualização Geral\n2. Normas, Procedimentos e Diretrizes Técnicas\n3. Metodologias e Execução Prática\n4. Avaliação e Verificação de Aprendizagem',
    instrutorNome: '',
    instrutorCargo: '',
    instrutorRegistro: ''
  });
  const [courseFormErrors, setCourseFormErrors] = useState({});

  // Catálogo unificado de cursos (Modelos Oficiais + Cursos Cadastrados pelo Usuário)
  const allCoursePresets = React.useMemo(() => {
    const customList = (customTrainings || []).map(t => ({
      id: t.id ? `custom-${t.id}` : `custom-${t.name}`,
      name: t.name,
      title: t.name,
      category: 'Cursos Cadastrados (Personalizados)',
      duration: t.duracao || '8 horas',
      validade: t.validade || '24 meses',
      content: t.conteudo || '',
      description: t.descricao || `Treinamento em conformidade com as diretrizes e requisitos de ${t.name}.`,
      modelType: t.cert_model || 'modelo1',
      defaultInstructor: {
        name: t.instrutor_nome || '',
        role: t.instrutor_cargo || '',
        registration: t.instrutor_registro || ''
      },
      isCustom: true
    }));
    return [...OFFICIAL_TRAINING_MODELS, ...customList];
  }, [customTrainings]);

  // Modais de Gestão
  const [showTurmaModal, setShowTurmaModal] = useState(false);
  const [editingTurma, setEditingTurma] = useState(null);
  const [turmaSaving, setTurmaSaving] = useState(false);
  const [turmaFormErrors, setTurmaFormErrors] = useState({});
  const turmaInitialFormRef = useRef('');
  const spreadsheetInputRef = useRef(null);
  const [showSpreadsheetImportModal, setShowSpreadsheetImportModal] = useState(false);
  const [spreadsheetImportTurma, setSpreadsheetImportTurma] = useState(null);
  const [spreadsheetFileName, setSpreadsheetFileName] = useState('');
  const [spreadsheetPreview, setSpreadsheetPreview] = useState(null);
  const [spreadsheetImportError, setSpreadsheetImportError] = useState('');
  const [spreadsheetReading, setSpreadsheetReading] = useState(false);
  const [spreadsheetImporting, setSpreadsheetImporting] = useState(false);
  const [turmaFormData, setTurmaFormData] = useState({
    name: '',
    selectedPresetKey: '',
    course_name: '',
    duration: '8 horas',
    validade: '24 meses',
    start_date: new Date().toISOString().split('T')[0],
    location: 'Mossoró - RN',
    company: 'EcoClinic',
    instructors: [],
    instructor_name: '',
    instructor_role: '',
    instructor_registration: '',
    tech_lead: null,
    tech_lead_name: '',
    tech_lead_role: '',
    tech_lead_registration: '',
    coordinator: null,
    cert_model: 'modelo1',
    content: '1. Introdução e Contextualização Geral\n2. Normas, Procedimentos e Diretrizes Aplicáveis\n3. Metodologias e Execução Prática\n4. Avaliação e Verificação de Aprendizagem',
    status: 'Aberta'
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
  // Estados do Gerador de Certificados em PDF
  // ----------------------------------------------------
  const defaultOfficialModel = OFFICIAL_TRAINING_MODELS[0];
  const [formData, setFormData] = useState({
    curso: defaultOfficialModel ? (defaultOfficialModel.title || defaultOfficialModel.name) : 'NR-35 – TRABALHO EM ALTURA – NÍVEL BÁSICO',
    descricao: defaultOfficialModel ? defaultOfficialModel.description : 'Projeto de treinamento com carga horária de 8 horas, desenvolvido em conformidade com a Norma Regulamentadora nº 35 (NR-35) e requisitos técnicos aplicáveis.',
    data: new Date().toISOString().split('T')[0],
    duracao: defaultOfficialModel ? defaultOfficialModel.duration : '8 horas',
    validade: defaultOfficialModel ? defaultOfficialModel.validade : '24 meses',
    local: 'Mossoró - RN',
    empresa: 'EcoClinic',
    instructors: [],
    instrutorNome: '',
    instrutorCargo: '',
    instrutorRegistro: '',
    tech_lead: null,
    coordinator: null,
    conteudo: defaultOfficialModel ? defaultOfficialModel.content : '1. Conceitos, definições e requisitos da NR-35...'
  });

  const [colaboradores, setColaboradores] = useState([
    { nome: '', cpf: '', matricula: '', selected: true }
  ]);

  const certificatePreviewRef = useRef(null);

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
      const [classList, studentList, profileList, companyList, groupList, customTrainingsResult] = await Promise.all([
        getTrainingClasses(),
        getTrainingEnrollments(),
        getProfiles(),
        getCompanies(),
        getGroups(),
        getCustomTrainings()
      ]);
      setTurmas(classList || []);
      setEnrollments(studentList || []);
      if (customTrainingsResult?.trainings) {
        setCustomTrainings(customTrainingsResult.trainings);
      }
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
      name = inst?.name || formData.instrutorNome || activeTurma?.instructor_name || 'Instrutor';
      title = inst?.role || 'Instrutor(a)';
    } else if (roleKey === 'tech_lead') {
      const techLead = formData.tech_lead || activeTurma?.tech_lead;
      name = techLead?.name || '';
      title = techLead?.role || 'Responsável Técnico';
    } else if (roleKey === 'coordinator') {
      const coordinator = formData.coordinator || getTurmaCoordinator(activeTurma);
      name = coordinator?.name || '';
      title = coordinator?.role || 'Coordenador(a) Técnico(a)';
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
    const activeInstructorsList = (formData.instructors && formData.instructors.length > 0)
      ? formData.instructors
      : (formData.instrutorNome ? [
          {
            id: 'inst-1',
            name: formData.instrutorNome,
            role: formData.instrutorCargo || 'Instrutor',
            registration: formData.instrutorRegistro || ''
          }
        ] : []);

    const t = turma || turmas.find(item => String(item.id) === String(selectedTurmaIdInGenerator)) || {
      id: selectedTurmaIdInGenerator || 'draft_turma',
      name: formData.curso || 'Turma Ativa',
      course_name: formData.curso || 'Curso de Treinamento',
      company: formData.empresa || 'EcoClinic',
      instructors: activeInstructorsList,
      tech_lead: formData.tech_lead?.name ? formData.tech_lead : null,
      coordinator: formData.coordinator?.name ? formData.coordinator : null
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
    if (presetName === '__create_new__') {
      handleOpenCreateCourseModal('turma');
      return;
    }
    if (presetName === 'custom') {
      setTurmaFormData(prev => ({
        ...prev,
        selectedPresetKey: 'custom'
      }));
      return;
    }
    const preset = allCoursePresets.find(p => p.name === presetName);
    if (preset) {
      setTurmaFormData(prev => ({
        ...prev,
        selectedPresetKey: preset.name,
        course_name: preset.title || preset.name,
        duration: preset.duration || preset.duracao || prev.duration,
        validade: preset.validade || prev.validade || '24 meses',
        content: preset.content || preset.conteudo || prev.content,
        cert_model: preset.modelType || preset.cert_model || prev.cert_model || 'modelo1'
      }));
    }
  };

  const handleAddTechLeadToTurma = () => {
    setTurmaFormData(prev => ({
      ...prev,
      tech_lead: {
        name: '',
        role: 'Responsável Técnico / Engenheiro de Segurança',
        registration: ''
      },
      tech_lead_name: '',
      tech_lead_role: 'Responsável Técnico / Engenheiro de Segurança',
      tech_lead_registration: ''
    }));
  };

  const handleRemoveTechLeadFromTurma = () => {
    setTurmaFormData(prev => ({
      ...prev,
      tech_lead: null,
      tech_lead_name: '',
      tech_lead_role: '',
      tech_lead_registration: ''
    }));
  };

  const handleUpdateTechLeadInTurma = (updates) => {
    setTurmaFormData(prev => {
      const current = prev.tech_lead || { role: 'Responsável Técnico / Engenheiro de Segurança' };
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

  const handleAddCoordinatorToTurma = () => {
    setTurmaFormData(prev => ({
      ...prev,
      coordinator: {
        name: '',
        role: 'Coordenação Técnica',
        registration: ''
      }
    }));
  };

  const handleRemoveCoordinatorFromTurma = () => {
    setTurmaFormData(prev => ({
      ...prev,
      coordinator: null
    }));
  };

  const handleUpdateCoordinatorInTurma = (updates) => {
    setTurmaFormData(prev => ({
      ...prev,
      coordinator: { ...(prev.coordinator || { role: 'Coordenação Técnica' }), ...updates }
    }));
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

  // ----------------------------------------------------
  // Ações do Gerador de Certificados (Instrutores e Responsáveis)
  // ----------------------------------------------------
  const handleAddInstructorToForm = () => {
    setFormData(prev => {
      const currentList = Array.isArray(prev.instructors) && prev.instructors.length > 0
        ? [...prev.instructors]
        : (prev.instrutorNome ? [{ id: 'inst-1', name: prev.instrutorNome, role: prev.instrutorCargo || 'Instrutor', registration: prev.instrutorRegistro || '' }] : []);
      const updatedList = [
        ...currentList,
        {
          id: `inst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: '',
          role: 'Instrutor(a)',
          registration: ''
        }
      ];
      return {
        ...prev,
        instructors: updatedList,
        instrutorNome: updatedList[0]?.name || '',
        instrutorCargo: updatedList[0]?.role || '',
        instrutorRegistro: updatedList[0]?.registration || ''
      };
    });
  };

  const handleRemoveInstructorFromForm = (index) => {
    setFormData(prev => {
      const currentList = Array.isArray(prev.instructors) && prev.instructors.length > 0
        ? [...prev.instructors]
        : (prev.instrutorNome ? [{ id: 'inst-1', name: prev.instrutorNome, role: prev.instrutorCargo || 'Instrutor', registration: prev.instrutorRegistro || '' }] : []);
      currentList.splice(index, 1);
      return {
        ...prev,
        instructors: currentList,
        instrutorNome: currentList[0]?.name || '',
        instrutorCargo: currentList[0]?.role || '',
        instrutorRegistro: currentList[0]?.registration || ''
      };
    });
  };

  const handleUpdateInstructorInForm = (index, updates) => {
    setFormData(prev => {
      const currentList = Array.isArray(prev.instructors) && prev.instructors.length > 0
        ? [...prev.instructors]
        : [{ id: 'inst-1', name: prev.instrutorNome || '', role: prev.instrutorCargo || 'Instrutor', registration: prev.instrutorRegistro || '' }];
      currentList[index] = { ...currentList[index], ...updates };
      return {
        ...prev,
        instructors: currentList,
        instrutorNome: currentList[0]?.name || '',
        instrutorCargo: currentList[0]?.role || '',
        instrutorRegistro: currentList[0]?.registration || ''
      };
    });
  };

  const handleAddTechLeadToForm = () => {
    setFormData(prev => ({
      ...prev,
      tech_lead: {
        name: '',
        role: 'Responsável Técnico / Engenheiro de Segurança',
        registration: ''
      }
    }));
  };

  const handleRemoveTechLeadFromForm = () => {
    setFormData(prev => ({
      ...prev,
      tech_lead: null
    }));
  };

  const handleUpdateTechLeadInForm = (updates) => {
    setFormData(prev => ({
      ...prev,
      tech_lead: { ...(prev.tech_lead || { role: 'Responsável Técnico / Engenheiro de Segurança' }), ...updates }
    }));
  };

  const handleAddCoordinatorToForm = () => {
    setFormData(prev => ({
      ...prev,
      coordinator: {
        name: '',
        role: 'Coordenação Técnica',
        registration: ''
      }
    }));
  };

  const handleRemoveCoordinatorFromForm = () => {
    setFormData(prev => ({
      ...prev,
      coordinator: null
    }));
  };

  const handleUpdateCoordinatorInForm = (updates) => {
    setFormData(prev => ({
      ...prev,
      coordinator: { ...(prev.coordinator || { role: 'Coordenação Técnica' }), ...updates }
    }));
  };

  const handleOpenNewTurma = () => {
    setEditingTurma(null);
    setTurmaFormErrors({});
    const defaultModel = COURSE_PRESETS[0] || {};

    const nextFormData = {
      name: '',
      selectedPresetKey: defaultModel.name || '',
      course_name: defaultModel.title || defaultModel.name || 'NR-35 – TRABALHO EM ALTURA – NÍVEL BÁSICO',
      duration: defaultModel.duration || '8 horas',
      validade: defaultModel.validade || '24 meses',
      start_date: new Date().toISOString().split('T')[0],
      location: 'Mossoró - RN',
      company: 'EcoClinic',
      instructors: [],
      instructor_name: '',
      instructor_role: '',
      instructor_registration: '',
      tech_lead: null,
      tech_lead_name: '',
      tech_lead_role: '',
      tech_lead_registration: '',
      coordinator: null,
      cert_model: defaultModel.modelType || 'modelo1',
      content: defaultModel.content || '1. Introdução e Contextualização Geral\n2. Normas, Procedimentos e Diretrizes Aplicáveis\n3. Metodologias e Execução Prática\n4. Avaliação e Verificação de Aprendizagem',
      status: 'Aberta'
    };
    turmaInitialFormRef.current = JSON.stringify(nextFormData);
    setTurmaFormData(nextFormData);
    setShowTurmaModal(true);
  };

  const handleEditTurma = (turma) => {
    setEditingTurma(turma);
    setTurmaFormErrors({});
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

    const loadedTechLead = (turma.tech_lead && (turma.tech_lead.name || turma.tech_lead.role || turma.tech_lead.registration))
      ? {
          name: turma.tech_lead.name || turma.tech_lead_name || '',
          role: turma.tech_lead.role || turma.tech_lead_role || 'Responsável Técnico / Engenheiro de Segurança',
          registration: turma.tech_lead.registration || turma.tech_lead_registration || ''
        }
      : (turma.tech_lead_name ? {
          name: turma.tech_lead_name,
          role: turma.tech_lead_role || 'Responsável Técnico / Engenheiro de Segurança',
          registration: turma.tech_lead_registration || ''
        } : null);

    const loadedCoordinator = (turma.coordinator && (turma.coordinator.name || turma.coordinator.role || turma.coordinator.registration))
      ? {
          name: turma.coordinator.name || '',
          role: turma.coordinator.role || 'Coordenação Técnica',
          registration: turma.coordinator.registration || ''
        }
      : null;

    const nextFormData = {
      name: turma.name || '',
      selectedPresetKey: allCoursePresets.find(p => (p.title === turma.course_name || p.name === turma.course_name))?.name || 'custom',
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
      tech_lead_name: loadedTechLead?.name || '',
      tech_lead_role: loadedTechLead?.role || '',
      tech_lead_registration: loadedTechLead?.registration || '',
      coordinator: loadedCoordinator,
      cert_model: turma.cert_model || 'modelo1',
      content: turma.content || '',
      status: turma.status || 'Aberta'
    };
    turmaInitialFormRef.current = JSON.stringify(nextFormData);
    setTurmaFormData(nextFormData);
    setShowTurmaModal(true);
  };

  const requestCloseTurmaModal = () => {
    if (turmaSaving) return;
    const hasChanges = turmaInitialFormRef.current && turmaInitialFormRef.current !== JSON.stringify(turmaFormData);
    if (hasChanges && !window.confirm('Descartar as alterações desta turma?')) return;
    setShowTurmaModal(false);
    setTurmaFormErrors({});
  };

  const handleSaveTurma = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!turmaFormData.name.trim()) nextErrors.name = 'Informe o nome da turma.';
    if (!turmaFormData.course_name.trim()) nextErrors.course_name = 'Informe o nome oficial do curso.';
    if (Object.keys(nextErrors).length > 0) {
      setTurmaFormErrors(nextErrors);
      const firstInvalidId = nextErrors.name ? 'tc-turma-name' : 'tc-turma-course-name';
      requestAnimationFrame(() => document.getElementById(firstInvalidId)?.focus());
      return;
    }

    setTurmaSaving(true);
    setTurmaFormErrors({});
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

      const techLeadToSave = (turmaFormData.tech_lead && (turmaFormData.tech_lead.name?.trim() || turmaFormData.tech_lead.role?.trim() || turmaFormData.tech_lead.registration?.trim()))
        ? {
            name: (turmaFormData.tech_lead.name || '').trim(),
            role: (turmaFormData.tech_lead.role || '').trim(),
            registration: (turmaFormData.tech_lead.registration || '').trim()
          }
        : (turmaFormData.tech_lead_name?.trim() ? {
            name: turmaFormData.tech_lead_name.trim(),
            role: (turmaFormData.tech_lead_role || '').trim(),
            registration: (turmaFormData.tech_lead_registration || '').trim()
          } : null);

      const coordinatorToSave = (turmaFormData.coordinator && (turmaFormData.coordinator.name?.trim() || turmaFormData.coordinator.role?.trim() || turmaFormData.coordinator.registration?.trim()))
        ? {
            name: (turmaFormData.coordinator.name || '').trim(),
            role: (turmaFormData.coordinator.role || '').trim(),
            registration: (turmaFormData.coordinator.registration || '').trim()
          }
        : null;

      const savedTurma = await saveTrainingClass({
        id: editingTurma ? editingTurma.id : null,
        ...turmaFormData,
        instructors: validInstructors,
        instructor_name: primary.name || '',
        instructor_role: primary.role || '',
        instructor_registration: primary.registration || '',
        tech_lead: techLeadToSave,
        tech_lead_name: techLeadToSave?.name || '',
        tech_lead_role: techLeadToSave?.role || '',
        tech_lead_registration: techLeadToSave?.registration || '',
        coordinator: coordinatorToSave
      });
      initializeDefaultSignaturesForTurma(savedTurma);
      setShowTurmaModal(false);
      await loadData();
      setFeedback({ 
        type: 'success', 
        text: editingTurma
          ? 'Turma atualizada com sucesso!'
          : `Turma criada com sucesso! O link público de ${savedTurma.name} já está disponível.`
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      console.error(err);
      setTurmaFormErrors({ submit: 'Não foi possível salvar a turma. Revise os dados e tente novamente.' });
    } finally {
      setTurmaSaving(false);
    }
  };

  useEffect(() => {
    if (!showTurmaModal) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || turmaSaving) return;
      const hasChanges = turmaInitialFormRef.current && turmaInitialFormRef.current !== JSON.stringify(turmaFormData);
      if (hasChanges && !window.confirm('Descartar as alterações desta turma?')) return;
      setShowTurmaModal(false);
      setTurmaFormErrors({});
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showTurmaModal, turmaFormData, turmaSaving]);

  const handleDeleteTurma = async (id, name) => {
    if (!window.confirm(`Deseja realmente excluir a turma "${name}"? Os inscritos ficarão como sem turma.`)) {
      return;
    }
    await deleteTrainingClass(id);
    loadData();
  };

  const spreadsheetTemplateUrl = `${import.meta.env.BASE_URL}modelo-importacao-turma.xlsx`;

  const resetSpreadsheetImport = () => {
    setSpreadsheetFileName('');
    setSpreadsheetPreview(null);
    setSpreadsheetImportError('');
    setSpreadsheetReading(false);
    if (spreadsheetInputRef.current) spreadsheetInputRef.current.value = '';
  };

  const handleOpenSpreadsheetImport = (turma) => {
    setSpreadsheetImportTurma(turma);
    resetSpreadsheetImport();
    setShowSpreadsheetImportModal(true);
  };

  const handleCloseSpreadsheetImport = () => {
    if (spreadsheetImporting) return;
    setShowSpreadsheetImportModal(false);
    setSpreadsheetImportTurma(null);
    resetSpreadsheetImport();
  };

  const handleSpreadsheetFileChange = async (event) => {
    const file = event.target.files?.[0];
    resetSpreadsheetImport();
    if (!file) return;

    setSpreadsheetFileName(file.name);
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setSpreadsheetImportError('Selecione uma planilha no formato .xlsx.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSpreadsheetImportError('A planilha deve ter no máximo 5 MB.');
      return;
    }

    setSpreadsheetReading(true);
    try {
      const { readSheet } = await import('read-excel-file/browser');
      const rows = await readSheet(file);
      const parsed = parseTrainingParticipantRows(rows);
      setSpreadsheetPreview(parsed);
      if (parsed.participants.length === 0) {
        setSpreadsheetImportError('Nenhuma linha válida foi encontrada para importar.');
      }
    } catch (error) {
      console.error('[TrainingSpreadsheetImport] Falha ao ler planilha:', error);
      setSpreadsheetPreview(null);
      setSpreadsheetImportError(error?.message || 'Não foi possível ler a planilha selecionada.');
    } finally {
      setSpreadsheetReading(false);
    }
  };

  const handleImportSpreadsheet = async () => {
    if (!spreadsheetImportTurma?.id || !spreadsheetPreview?.participants?.length) return;

    setSpreadsheetImporting(true);
    setSpreadsheetImportError('');
    try {
      const result = await importTrainingEnrollments(
        spreadsheetImportTurma.id,
        spreadsheetPreview.participants
      );
      await loadData();

      if (result.imported === 0 && result.duplicates === 0 && result.failed.length > 0) {
        setSpreadsheetImportError('Não foi possível importar os participantes. Tente novamente.');
        return;
      }

      const ignoredCount = spreadsheetPreview.issues.length + result.duplicates + result.failed.length;
      setShowSpreadsheetImportModal(false);
      setSpreadsheetImportTurma(null);
      resetSpreadsheetImport();
      setFeedback({
        type: result.imported > 0 ? 'success' : 'info',
        text: result.imported > 0
          ? `${result.imported} participante(s) importado(s) para a turma${ignoredCount ? `; ${ignoredCount} linha(s) não adicionada(s)` : ''}.`
          : 'Os participantes válidos da planilha já estavam vinculados a esta turma.'
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (error) {
      console.error('[TrainingSpreadsheetImport] Falha na importação:', error);
      setSpreadsheetImportError(error?.message || 'Não foi possível importar a planilha.');
    } finally {
      setSpreadsheetImporting(false);
    }
  };

  useEffect(() => {
    if (!showSpreadsheetImportModal) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || spreadsheetImporting) return;
      setShowSpreadsheetImportModal(false);
      setSpreadsheetImportTurma(null);
      setSpreadsheetFileName('');
      setSpreadsheetPreview(null);
      setSpreadsheetImportError('');
      setSpreadsheetReading(false);
      if (spreadsheetInputRef.current) spreadsheetInputRef.current.value = '';
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSpreadsheetImportModal, spreadsheetImporting]);

  const getPublicEnrollmentUrl = (turmaId) =>
    `${window.location.origin}/inscricao/${encodeURIComponent(String(turmaId))}`;

  const generalEnrollmentUrl = `${window.location.origin}/inscricao`;

  const copyGeneralLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(generalEnrollmentUrl);
      } else {
        const temporaryInput = document.createElement('textarea');
        temporaryInput.value = generalEnrollmentUrl;
        temporaryInput.setAttribute('readonly', '');
        temporaryInput.style.position = 'fixed';
        temporaryInput.style.opacity = '0';
        document.body.appendChild(temporaryInput);
        temporaryInput.select();
        const copied = document.execCommand('copy');
        temporaryInput.remove();
        if (!copied) throw new Error('Clipboard indisponível');
      }
      setCopiedKey('general_enrollment');
      setTimeout(() => setCopiedKey(null), 2500);
    } catch (err) {
      console.warn('Erro ao copiar link geral:', err);
    }
  };

  // Cada link público pertence obrigatoriamente a uma turma.
  const copyPublicLink = async (turmaId, key) => {
    if (!turmaId) return;
    const origin = window.location.origin;
    const url = `${origin}/inscricao/${encodeURIComponent(String(turmaId))}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const temporaryInput = document.createElement('textarea');
        temporaryInput.value = url;
        temporaryInput.setAttribute('readonly', '');
        temporaryInput.style.position = 'fixed';
        temporaryInput.style.opacity = '0';
        document.body.appendChild(temporaryInput);
        temporaryInput.select();
        const copied = document.execCommand('copy');
        temporaryInput.remove();
        if (!copied) throw new Error('Clipboard indisponível');
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', text: 'Não foi possível copiar o link. Tente novamente.' });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Carrega alunos de uma turma direto no gerador de certificados
  const handleLoadTurmaIntoGenerator = (turma) => {
    initializeDefaultSignaturesForTurma(turma);
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

    const techLead = (turma.tech_lead && (turma.tech_lead.name || turma.tech_lead.role || turma.tech_lead.registration))
      ? {
          name: turma.tech_lead.name || turma.tech_lead_name || '',
          role: turma.tech_lead.role || turma.tech_lead_role || 'Responsável Técnico / Engenheiro de Segurança',
          registration: turma.tech_lead.registration || turma.tech_lead_registration || ''
        }
      : (turma.tech_lead_name ? {
          name: turma.tech_lead_name,
          role: turma.tech_lead_role || 'Responsável Técnico / Engenheiro de Segurança',
          registration: turma.tech_lead_registration || ''
        } : null);

    const coordinator = (turma.coordinator && (turma.coordinator.name || turma.coordinator.role || turma.coordinator.registration))
      ? {
          name: turma.coordinator.name || '',
          role: turma.coordinator.role || 'Coordenação Técnica',
          registration: turma.coordinator.registration || ''
        }
      : null;

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
      instrutorNome: instructorNames || '',
      instrutorCargo: instructorRoles || '',
      instrutorRegistro: instructorRegs || '',
      tech_lead: techLead,
      coordinator,
      techLeadNome: techLead?.name || '',
      techLeadCargo: techLead?.role || '',
      techLeadRegistro: techLead?.registration || '',
      conteudo: turma.content || prev.conteudo
    }));

    if (turma.cert_model) {
      setCertModel(turma.cert_model);
    }

    // Carrega a lista de colaboradores se houver inscritos (todos selecionados por padrão)
    if (studentsInTurma.length > 0) {
      setColaboradores(studentsInTurma.map(s => ({
        nome: s.nome,
        cpf: s.cpf,
        matricula: s.matricula || '',
        selected: true
      })));
      setFeedback({ 
        type: 'success', 
        text: `Turma "${turma.name}" carregada no gerador com ${studentsInTurma.length} participante(s) selecionado(s)!` 
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
        setColaboradores(studentsInTurma.map(s => ({
          nome: s.nome,
          cpf: s.cpf,
          matricula: s.matricula || '',
          selected: true
        })));
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
      duracao: preset.duration || preset.duracao || prev.duracao,
      conteudo: preset.content || preset.conteudo || prev.conteudo,
      descricao: preset.description || preset.descricao || `Projeto de treinamento com carga horária de ${preset.duration || preset.duracao || '8 horas'}, desenvolvido em conformidade com as diretrizes e requisitos técnicos de ${preset.name}.`,
      validade: preset.validade || prev.validade || '24 meses'
    }));
    if (preset.modelType || preset.cert_model) {
      setCertModel(preset.modelType || preset.cert_model);
    }
    setFeedback({
      type: 'success',
      text: `Curso "${preset.name}" carregado com sucesso!`
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
    setColaboradores(prev => [...prev, { nome: '', cpf: '', matricula: '', selected: true }]);
  };

  const removeColaborador = (index) => {
    if (colaboradores.length <= 1) {
      setColaboradores([{ nome: '', cpf: '', matricula: '', selected: true }]);
      return;
    }
    setColaboradores(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllColaboradores = () => {
    if (window.confirm('Deseja limpar todos os participantes da lista?')) {
      setColaboradores([{ nome: '', cpf: '', matricula: '', selected: true }]);
    }
  };

  const handleToggleSelectColaborador = (index) => {
    setColaboradores(prev => {
      const copy = [...prev];
      const isCurrentlySelected = copy[index].selected !== false;
      copy[index] = { ...copy[index], selected: !isCurrentlySelected };
      return copy;
    });
  };

  const handleToggleSelectAllColaboradores = (forceSelect = null) => {
    setColaboradores(prev => {
      const allCurrentlySelected = prev.every(c => c.selected !== false);
      const targetState = forceSelect !== null ? forceSelect : !allCurrentlySelected;
      return prev.map(c => ({ ...c, selected: targetState }));
    });
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
        parsed.push({ nome, cpf: formatCpf(cpf), matricula: '', selected: true });
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
      setFeedback({ type: 'error', text: 'Informe o nome de ao menos um participante.' });
      requestAnimationFrame(() => document.getElementById('student-name-0')?.focus());
      return;
    }

    const targetColaboradores = validColaboradores.filter(c => c.selected !== false);
    if (targetColaboradores.length === 0) {
      setFeedback({ type: 'error', text: 'Nenhum participante selecionado. Selecione ao menos um participante na lista para gerar.' });
      return;
    }

    if (!formData.curso.trim()) {
      setFeedback({ type: 'error', text: 'Informe o curso do treinamento.' });
      requestAnimationFrame(() => document.getElementById('tc-curso')?.focus());
      return;
    }

    const originalColaboradores = colaboradores.map(item => ({ ...item }));
    const originalPreviewTab = previewTab;
    setGenerating(true);
    try {
      if (document.fonts?.ready) await document.fonts.ready;

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
        putOnlyUsedFonts: true,
        precision: 12
      });
      pdf.setProperties({
        title: `Certificados - ${formData.curso}`,
        subject: 'Certificados de treinamento',
        creator: 'EcoSafety'
      });
      let pageIndex = 0;
      for (const participant of targetColaboradores) {
        for (const side of ['frente', 'verso']) {
          flushSync(() => {
            setColaboradores([{ ...participant }]);
            setPreviewTab(side);
          });

          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const previewNode = certificatePreviewRef.current;
          if (!previewNode) throw new Error('Pré-visualização do certificado indisponível.');

          const images = [...previewNode.querySelectorAll('img')];
          await Promise.all(images.map(image => {
            if (image.complete) return image.decode?.().catch(() => undefined);
            return new Promise(resolve => {
              image.addEventListener('load', resolve, { once: true });
              image.addEventListener('error', resolve, { once: true });
            });
          }));

          if (pageIndex > 0) pdf.addPage('a4', 'landscape');
          await renderCertificateDomPage(pdf, previewNode);
          pageIndex += 1;
        }
      }

      const safeCourse = formData.curso.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
      pdf.save(`Certificados_${safeCourse}_${targetColaboradores.length}alunos.pdf`);

      setFeedback({ 
        type: 'success', 
        text: `PDF vetorial com ${targetColaboradores.length} certificado(s) gerado em alta qualidade.`
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      console.error('Erro ao gerar certificados:', err);
      setFeedback({ type: 'error', text: `Não foi possível gerar o PDF: ${err.message}` });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      flushSync(() => {
        setColaboradores(originalColaboradores);
        setPreviewTab(originalPreviewTab);
        setGenerating(false);
      });
    }
  };

  // Funções para Criação e Cadastro de Novos Cursos
  const handleOpenCreateCourseModal = (target = 'generator') => {
    setCreateCourseTarget(target);
    setCourseFormErrors({});
    const initialName = target === 'generator'
      ? (isCustomCourse ? formData.curso : '')
      : (turmaFormData.course_name || '');
    setNewCourseData({
      name: initialName || '',
      duracao: '8 horas',
      validade: '24 meses',
      cert_model: 'modelo1',
      descricao: initialName
        ? `Projeto de treinamento com carga horária de 8 horas, desenvolvido em conformidade com as normas e requisitos técnicos aplicáveis.`
        : '',
      conteudo: '1. Introdução e Contextualização Geral\n2. Normas, Procedimentos e Diretrizes Técnicas\n3. Metodologias e Execução Prática\n4. Avaliação e Verificação de Aprendizagem',
      instrutorNome: '',
      instrutorCargo: '',
      instrutorRegistro: ''
    });
    setShowCreateCourseModal(true);
  };

  const handleNewCourseNameChange = (name) => {
    setNewCourseData(prev => {
      const shouldUpdateDesc = !prev.descricao || prev.descricao.startsWith('Projeto de treinamento com carga horária');
      return {
        ...prev,
        name,
        descricao: shouldUpdateDesc
          ? `Projeto de treinamento com carga horária de ${prev.duracao || '8 horas'}, desenvolvido em conformidade com as diretrizes e requisitos de ${name || 'capacitação profissional'}.`
          : prev.descricao
      };
    });
    if (courseFormErrors.name) {
      setCourseFormErrors(prev => ({ ...prev, name: '' }));
    }
  };

  const handleSaveNewCourse = async (e) => {
    e?.preventDefault();
    if (!newCourseData.name || !newCourseData.name.trim()) {
      setCourseFormErrors({ name: 'Informe o nome oficial do curso.' });
      requestAnimationFrame(() => document.getElementById('new-course-name')?.focus());
      return;
    }

    setSavingCourse(true);
    try {
      const courseToSave = {
        name: newCourseData.name.trim(),
        duracao: newCourseData.duracao?.trim() || '8 horas',
        validade: newCourseData.validade?.trim() || '24 meses',
        descricao: newCourseData.descricao?.trim() || `Projeto de treinamento com carga horária de ${newCourseData.duracao || '8 horas'}, desenvolvido em conformidade com os requisitos de ${newCourseData.name.trim()}.`,
        conteudo: newCourseData.conteudo?.trim() || '1. Introdução Geral\n2. Metodologia Prática',
        instrutorNome: newCourseData.instrutorNome || '',
        instrutorCargo: newCourseData.instrutorCargo || '',
        instrutorRegistro: newCourseData.instrutorRegistro || '',
        cert_model: newCourseData.cert_model || 'modelo1'
      };

      await saveCustomTraining(courseToSave);

      const { trainings } = await getCustomTrainings();
      if (trainings) {
        setCustomTrainings(trainings);
      }

      if (createCourseTarget === 'generator') {
        setIsCustomCourse(false);
        setFormData(prev => ({
          ...prev,
          curso: courseToSave.name,
          duracao: courseToSave.duracao,
          validade: courseToSave.validade,
          descricao: courseToSave.descricao,
          conteudo: courseToSave.conteudo,
          instrutorNome: courseToSave.instrutorNome || prev.instrutorNome,
          instrutorCargo: courseToSave.instrutorCargo || prev.instrutorCargo,
          instrutorRegistro: courseToSave.instrutorRegistro || prev.instrutorRegistro
        }));
        setCertModel(courseToSave.cert_model);
      } else if (createCourseTarget === 'turma') {
        setTurmaFormData(prev => ({
          ...prev,
          selectedPresetKey: courseToSave.name,
          course_name: courseToSave.name,
          duration: courseToSave.duracao,
          validade: courseToSave.validade,
          content: courseToSave.conteudo,
          cert_model: courseToSave.cert_model,
          instructor_name: courseToSave.instrutorNome || prev.instructor_name,
          instructor_role: courseToSave.instrutorCargo || prev.instructor_role,
          instructor_registration: courseToSave.instrutorRegistro || prev.instructor_registration
        }));
      }

      setShowCreateCourseModal(false);
      setFeedback({
        type: 'success',
        text: `Curso "${courseToSave.name}" cadastrado e selecionado com sucesso!`
      });
      setTimeout(() => setFeedback(null), 4500);
    } catch (err) {
      console.error('Erro ao cadastrar curso:', err);
      setFeedback({
        type: 'error',
        text: `Erro ao cadastrar curso: ${err.message}`
      });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setSavingCourse(false);
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
      e.cpf.includes(searchQuery) ||
      (e.matricula && String(e.matricula).toLowerCase().includes(searchQuery.toLowerCase()));

    return matchTurma && matchSearch;
  });

  const validColaboradores = colaboradores.filter(c => c.nome.trim());
  const selectedColaboradores = validColaboradores.filter(c => c.selected !== false);
  const validCount = validColaboradores.length;
  const selectedCount = selectedColaboradores.length;
  const isAllSelected = validCount > 0 && selectedCount === validCount;
  const isIndeterminate = selectedCount > 0 && selectedCount < validCount;
  const firstStudent = selectedColaboradores[0] || validColaboradores[0];
  const activeTurma = turmas.find(t => String(t.id) === String(selectedTurmaIdInGenerator));

  // Estilos adaptativos dinâmicos para evitar cortes, rolagem ou sobreposição nos certificados
  const m2FrenteStyles = getModelo2FrenteStyles({
    curso: formData.curso,
    descricao: formData.descricao,
    studentName: firstStudent?.nome
  });
  const m2VersoStyles = getModelo2VersoStyles(formData.conteudo);
  const m1FrenteStyles = getModelo1FrenteStyles({
    curso: formData.curso,
    descricao: formData.descricao,
    studentName: firstStudent?.nome
  });
  const m1VersoStyles = getModelo1VersoStyles(formData.conteudo);
  const certificateFrontGeometry = getCertificateFrontGeometry({
    certModel,
    description: formData.descricao,
    course: formData.curso,
    studentName: firstStudent?.nome || ''
  });

  const cleanDescricao = (formData.descricao || '')
    .replace(/\s*(?:Mossor[oó]\s*,?\s*)+$/i, '')
    .trim();

  // Dados derivados para o layout do gerador
  const selectedPreset = allCoursePresets.find(p =>
    p.name?.trim().toLowerCase() === formData.curso?.trim().toLowerCase() ||
    p.title?.trim().toLowerCase() === formData.curso?.trim().toLowerCase()
  );
  const activeTechLead = (formData.tech_lead && (formData.tech_lead.name?.trim() || formData.tech_lead.role?.trim() || formData.tech_lead.registration?.trim()))
    ? formData.tech_lead
    : null;
  const activeCoordinator = (formData.coordinator && (formData.coordinator.name?.trim() || formData.coordinator.role?.trim() || formData.coordinator.registration?.trim()))
    ? formData.coordinator
    : null;

  // Papéis de assinatura dinâmicos com suporte a múltiplos instrutores
  const formInstructors = (Array.isArray(formData.instructors) && formData.instructors.length > 0)
    ? formData.instructors
    : (formData.instrutorNome && formData.instrutorNome.trim() ? [{ id: 'inst-1', name: formData.instrutorNome, role: formData.instrutorCargo || 'Instrutor', registration: formData.instrutorRegistro || '' }] : []);

  const activeInstructors = formInstructors.filter(i => i && i.name && i.name.trim());

  const instructorRoles = activeInstructors.map((inst, idx) => ({
    key: idx === 0 ? 'instructor' : `instructor_${idx}`,
    label: activeInstructors.length > 1 ? `Instrutor(a) #${idx + 1}` : 'Instrutor(a)',
    name: inst.name,
    roleTitle: inst.role || 'Instrutor',
    registration: inst.registration || ''
  }));

  const signatureRoles = [
    ...instructorRoles,
    ...(activeTechLead && activeTechLead.name?.trim() ? [{
      key: 'tech_lead',
      label: 'Responsável Técnico',
      name: activeTechLead.name,
      roleTitle: activeTechLead.role || 'Responsável Técnico',
      registration: activeTechLead.registration || ''
    }] : []),
    ...(activeCoordinator && activeCoordinator.name?.trim() ? [{
      key: 'coordinator',
      label: 'Coordenação Técnica',
      name: activeCoordinator.name,
      roleTitle: activeCoordinator.role || 'Coordenação Técnica',
      registration: activeCoordinator.registration || ''
    }] : [])
  ];

  // Colunas de assinatura no rodapé do certificado (Frente Modelo 1)
  const m1SignerColumns = [];
  if (activeTechLead && activeTechLead.name?.trim()) {
    m1SignerColumns.push({
      key: 'tech_lead',
      roleLabel: (activeTechLead.role || 'RESPONSÁVEL TÉCNICO').toUpperCase(),
      name: activeTechLead.name,
      registration: activeTechLead.registration ? `Registro: ${activeTechLead.registration}` : '',
      sigImg: currentTurmaSignatures?.tech_lead?.dataUrl || getInstructorSignatureUrl(activeTechLead.name)
    });
  }
  if (activeCoordinator && activeCoordinator.name?.trim()) {
    m1SignerColumns.push({
      key: 'coordinator',
      roleLabel: (activeCoordinator.role || 'COORDENAÇÃO TÉCNICA').toUpperCase(),
      name: activeCoordinator.name,
      registration: activeCoordinator.registration ? `Registro: ${activeCoordinator.registration}` : '',
      sigImg: currentTurmaSignatures?.coordinator?.dataUrl || getInstructorSignatureUrl(activeCoordinator.name)
    });
  }
  m1SignerColumns.push({
    key: 'aluno',
    isStudent: true,
    roleLabel: 'ALUNO:',
    name: firstStudent?.nome ? firstStudent.nome.toUpperCase() : 'PARTICIPANTE',
    registration: ''
  });
  activeInstructors.forEach((inst, idx) => {
    const sigKey = idx === 0 ? 'instructor' : `instructor_${idx}`;
    const sigImg = currentTurmaSignatures?.[sigKey]?.dataUrl || (idx === 0 ? currentTurmaSignatures?.instructor?.dataUrl : null) || getInstructorSignatureUrl(inst.name);
    m1SignerColumns.push({
      key: sigKey,
      roleLabel: activeInstructors.length > 1 ? `INSTRUTOR #${idx + 1}:` : 'INSTRUTOR:',
      name: inst.name,
      registration: inst.registration ? `Registro: ${inst.registration}` : '',
      sigImg
    });
  });

  // Colunas de assinatura no rodapé do certificado (Frente Modelo 2)
  const m2SignerColumns = [];
  if (activeTechLead && activeTechLead.name?.trim()) {
    m2SignerColumns.push({
      key: 'tech_lead',
      roleLabel: (activeTechLead.role || 'RESPONSÁVEL TÉCNICO').toUpperCase(),
      name: activeTechLead.name,
      registration: activeTechLead.registration || '',
      sigImg: currentTurmaSignatures?.tech_lead?.dataUrl || getInstructorSignatureUrl(activeTechLead.name)
    });
  }
  if (activeCoordinator && activeCoordinator.name?.trim()) {
    m2SignerColumns.push({
      key: 'coordinator',
      roleLabel: (activeCoordinator.role || 'COORDENAÇÃO TÉCNICA').toUpperCase(),
      name: activeCoordinator.name,
      registration: activeCoordinator.registration || '',
      sigImg: currentTurmaSignatures?.coordinator?.dataUrl || getInstructorSignatureUrl(activeCoordinator.name)
    });
  }
  m2SignerColumns.push({
    key: 'aluno',
    isStudent: true,
    roleLabel: 'ALUNO',
    name: firstStudent?.nome || 'Participante',
    registration: ''
  });
  activeInstructors.forEach((inst, idx) => {
    const sigKey = idx === 0 ? 'instructor' : `instructor_${idx}`;
    const sigImg = currentTurmaSignatures?.[sigKey]?.dataUrl || (idx === 0 ? currentTurmaSignatures?.instructor?.dataUrl : null) || getInstructorSignatureUrl(inst.name);
    m2SignerColumns.push({
      key: sigKey,
      roleLabel: activeInstructors.length > 1 ? `INSTRUTOR #${idx + 1}` : 'INSTRUTOR',
      name: inst.name,
      registration: inst.registration || '',
      sigImg
    });
  });
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
        <h1>Certificados</h1>

        <nav className="tc-tabs" aria-label="Seções do módulo de treinamento">
          <button
            id="tab-generator"
            type="button"
            className={`tc-tab tc-tab--primary ${activeTab === 'generator' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('generator')}
          >
            <Award size={15} />
            Gerar certificados
          </button>
          <button
            id="tab-turmas"
            type="button"
            className={`tc-tab tc-tab--secondary ${activeTab === 'turmas' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('turmas')}
          >
            <Users size={15} />
            Turmas e inscrições
          </button>
        </nav>
      </header>

      {/* Alerta de Feedback Global */}
      {feedback && (
        <div className={`tc-toast tc-toast--${feedback.type}`} role="status">
          {feedback.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 1: GERADOR DE CERTIFICADOS PDF                                        */}
      {/* ========================================================================= */}
      {activeTab === 'generator' && (
        <div className="tc-gen">

          {/* ------------------------------------------------------------- */}
          {/* COLUNA ESQUERDA: ETAPAS DO FORMULÁRIO                         */}
          {/* ------------------------------------------------------------- */}
          <div className="tc-form">

            {/* ETAPA 1: Treinamento */}
            <section className="tc-card" aria-labelledby="tc-step1-title">
              <div className="tc-step-head tc-step-head--compact">
                <h2 id="tc-step1-title">Treinamento</h2>
              </div>

              {/* Turma (opcional) */}
              <div className="tc-field">
                <label htmlFor="tc-turma">
                  Turma <span className="tc-optional">(opcional)</span>
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
                  <div className="tc-label-actions">
                    <button
                      type="button"
                      className="tc-link tc-link--primary"
                      onClick={() => handleOpenCreateCourseModal('generator')}
                      title="Cadastrar um novo curso no catálogo"
                    >
                      <Plus size={13} />
                      Criar novo curso
                    </button>
                    <button
                      type="button"
                      className="tc-link"
                      onClick={() => setIsCustomCourse(!isCustomCourse)}
                    >
                      {isCustomCourse ? 'Escolher da lista' : 'Digitar avulso'}
                    </button>
                  </div>
                </div>
                {!isCustomCourse ? (
                  <select
                    id="tc-curso"
                    className="tc-input tc-input--strong"
                    value={selectedPreset ? selectedPreset.id : 'custom'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__create_new__') {
                        handleOpenCreateCourseModal('generator');
                        return;
                      }
                      if (val === 'custom') {
                        setIsCustomCourse(true);
                      } else {
                        const found = allCoursePresets.find(p => p.id === val);
                        if (found) applyPreset(found);
                      }
                    }}
                  >
                    <option value="__create_new__">➕ + Criar novo curso...</option>
                    {customTrainings.length > 0 && (
                      <optgroup label="⭐ Cursos Cadastrados (Personalizados)">
                        {allCoursePresets.filter(p => p.isCustom).map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} · {p.duration}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {Array.from(new Set(OFFICIAL_TRAINING_MODELS.map(p => p.category))).map(cat => (
                      <optgroup key={cat} label={cat}>
                        {OFFICIAL_TRAINING_MODELS.filter(p => p.category === cat).map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="custom">
                      {selectedPreset ? 'Outro curso (digitar avulso)...' : (formData.curso || 'Outro curso (digitar avulso)...')}
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

              {/* Signatários do Certificado (Instrutores, Responsável Técnico e Coordenação Técnica) */}
              <div className="tc-field tc-mt" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <div className="tc-label-row" style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontWeight: '600', fontSize: '0.95rem' }}>Signatários do Certificado</label>
                  <span className="tc-hint" style={{ margin: 0 }}>Adicione ou exclua instrutores e responsáveis</span>
                </div>

                {/* 1. SEÇÃO DE INSTRUTORES */}
                <div style={{ marginBottom: '1.25rem', padding: '0.85rem', background: 'var(--bg-subtle, #f8fafc)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                  <div className="tc-subsection-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
                      Instrutores {formInstructors.length > 0 ? `(${formInstructors.length})` : ''}
                    </strong>
                    <button type="button" className="tc-btn tc-btn--sm tc-btn--soft" onClick={handleAddInstructorToForm} style={{ padding: '3px 8px', fontSize: '0.78rem' }}>
                      <Plus size={13} /> Adicionar Instrutor
                    </button>
                  </div>

                  {formInstructors.length === 0 ? (
                    <p className="tc-compact-empty" style={{ margin: 0, padding: '0.5rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Nenhum instrutor adicionado. Clique em &quot;Adicionar Instrutor&quot; para incluir.
                    </p>
                  ) : (
                    <div className="tc-instructor-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {formInstructors.map((inst, index) => (
                        <div className="tc-instructor-row" key={inst.id || index} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.65rem' }}>
                          <div className="tc-instructor-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: '600', fontSize: '0.8rem' }}>
                              {formInstructors.length > 1 ? `Instrutor #${index + 1}` : 'Instrutor'}
                            </span>
                            <button
                              type="button"
                              className="tc-link tc-link--danger"
                              onClick={() => handleRemoveInstructorFromForm(index)}
                              aria-label={`Excluir instrutor ${index + 1}`}
                              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                            >
                              <Trash2 size={12} /> Excluir
                            </button>
                          </div>
                          <select
                            className="tc-input"
                            style={{ marginBottom: '0.4rem', fontSize: '0.82rem' }}
                            value={profiles.some(p => p.name.trim() === inst.name?.trim()) ? inst.name : (inst.name ? 'custom' : '')}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val && val !== 'custom') {
                                const sel = profiles.find(p => p.name === val);
                                handleUpdateInstructorInForm(index, {
                                  name: sel?.name || val,
                                  role: sel?.role === 'Admin' ? 'Instrutor e Responsável Técnico' : (sel?.role ? `Instrutor / ${sel.role}` : (inst.role || 'Instrutor')),
                                  registration: sel?.registration || inst.registration || ''
                                });
                              }
                            }}
                          >
                            <option value="">Selecionar da lista de profissionais</option>
                            {profiles.map(p => <option key={p.id || p.name} value={p.name}>{p.name}{p.role ? ` — ${p.role}` : ''}</option>)}
                            <option value="custom">Outro profissional (digitar)</option>
                          </select>
                          <div className="tc-grid-3">
                            <input
                              type="text"
                              className="tc-input"
                              placeholder="Nome completo do instrutor"
                              value={inst.name || ''}
                              onChange={e => handleUpdateInstructorInForm(index, { name: e.target.value })}
                            />
                            <input
                              type="text"
                              className="tc-input"
                              placeholder="Cargo / Qualificação"
                              value={inst.role || ''}
                              onChange={e => handleUpdateInstructorInForm(index, { role: e.target.value })}
                            />
                            <input
                              type="text"
                              className="tc-input"
                              placeholder="Registro (CREA, MTE, etc.)"
                              value={inst.registration || ''}
                              onChange={e => handleUpdateInstructorInForm(index, { registration: e.target.value })}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. SEÇÃO DE RESPONSÁVEL TÉCNICO */}
                <div style={{ marginBottom: '1.25rem', padding: '0.85rem', background: 'var(--bg-subtle, #f8fafc)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                  <div className="tc-subsection-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
                      Responsável Técnico
                    </strong>
                    {formData.tech_lead ? (
                      <button
                        type="button"
                        className="tc-link tc-link--danger"
                        onClick={handleRemoveTechLeadFromForm}
                        style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                      >
                        <Trash2 size={12} /> Excluir
                      </button>
                    ) : (
                      <button type="button" className="tc-btn tc-btn--sm tc-btn--soft" onClick={handleAddTechLeadToForm} style={{ padding: '3px 8px', fontSize: '0.78rem' }}>
                        <Plus size={13} /> Adicionar Responsável Técnico
                      </button>
                    )}
                  </div>

                  {!formData.tech_lead ? (
                    <p className="tc-compact-empty" style={{ margin: 0, padding: '0.5rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Nenhum responsável técnico adicionado.
                    </p>
                  ) : (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.65rem' }}>
                      <select
                        className="tc-input"
                        style={{ marginBottom: '0.4rem', fontSize: '0.82rem' }}
                        value={profiles.some(p => p.name.trim() === formData.tech_lead?.name?.trim()) ? formData.tech_lead?.name : (formData.tech_lead?.name ? 'custom' : '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val && val !== 'custom') {
                            const sel = profiles.find(p => p.name === val);
                            handleUpdateTechLeadInForm({
                              name: sel?.name || val,
                              role: sel?.role || 'Responsável Técnico / Engenheiro de Segurança',
                              registration: sel?.registration || 'CREA 210874512-0 / MTE 0009995/RN'
                            });
                          }
                        }}
                      >
                        <option value="">Selecionar da lista de profissionais</option>
                        {profiles.map(p => <option key={p.id || p.name} value={p.name}>{p.name}{p.role ? ` — ${p.role}` : ''}</option>)}
                        <option value="custom">Outro profissional (digitar)</option>
                      </select>
                      <div className="tc-grid-3">
                        <input
                          type="text"
                          className="tc-input"
                          placeholder="Nome completo do responsável"
                          value={formData.tech_lead?.name || ''}
                          onChange={e => handleUpdateTechLeadInForm({ name: e.target.value })}
                        />
                        <input
                          type="text"
                          className="tc-input"
                          placeholder="Cargo / Qualificação"
                          value={formData.tech_lead?.role || ''}
                          onChange={e => handleUpdateTechLeadInForm({ role: e.target.value })}
                        />
                        <input
                          type="text"
                          className="tc-input"
                          placeholder="Registro CREA / MTE"
                          value={formData.tech_lead?.registration || ''}
                          onChange={e => handleUpdateTechLeadInForm({ registration: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. SEÇÃO DE COORDENAÇÃO TÉCNICA */}
                <div style={{ marginBottom: '0.5rem', padding: '0.85rem', background: 'var(--bg-subtle, #f8fafc)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                  <div className="tc-subsection-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
                      Coordenação Técnica
                    </strong>
                    {formData.coordinator ? (
                      <button
                        type="button"
                        className="tc-link tc-link--danger"
                        onClick={handleRemoveCoordinatorFromForm}
                        style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                      >
                        <Trash2 size={12} /> Excluir
                      </button>
                    ) : (
                      <button type="button" className="tc-btn tc-btn--sm tc-btn--soft" onClick={handleAddCoordinatorToForm} style={{ padding: '3px 8px', fontSize: '0.78rem' }}>
                        <Plus size={13} /> Adicionar Coordenação Técnica
                      </button>
                    )}
                  </div>

                  {!formData.coordinator ? (
                    <p className="tc-compact-empty" style={{ margin: 0, padding: '0.5rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Nenhuma coordenação técnica adicionada.
                    </p>
                  ) : (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.65rem' }}>
                      <select
                        className="tc-input"
                        style={{ marginBottom: '0.4rem', fontSize: '0.82rem' }}
                        value={profiles.some(p => p.name.trim() === formData.coordinator?.name?.trim()) ? formData.coordinator?.name : (formData.coordinator?.name ? 'custom' : '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val && val !== 'custom') {
                            const sel = profiles.find(p => p.name === val);
                            handleUpdateCoordinatorInForm({
                              name: sel?.name || val,
                              role: sel?.role || 'Coordenação Técnica',
                              registration: sel?.registration || ''
                            });
                          }
                        }}
                      >
                        <option value="">Selecionar da lista de profissionais</option>
                        {profiles.map(p => <option key={p.id || p.name} value={p.name}>{p.name}{p.role ? ` — ${p.role}` : ''}</option>)}
                        <option value="custom">Outro profissional (digitar)</option>
                      </select>
                      <div className="tc-grid-3">
                        <input
                          type="text"
                          className="tc-input"
                          placeholder="Nome da coordenação técnica"
                          value={formData.coordinator?.name || ''}
                          onChange={e => handleUpdateCoordinatorInForm({ name: e.target.value })}
                        />
                        <input
                          type="text"
                          className="tc-input"
                          placeholder="Cargo / Qualificação"
                          value={formData.coordinator?.role || ''}
                          onChange={e => handleUpdateCoordinatorInForm({ role: e.target.value })}
                        />
                        <input
                          type="text"
                          className="tc-input"
                          placeholder="Registro CREA, Coren, CFT"
                          value={formData.coordinator?.registration || ''}
                          onChange={e => handleUpdateCoordinatorInForm({ registration: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ETAPA 2: Participantes */}
            <section className="tc-card" aria-labelledby="tc-step2-title">
              <div className="tc-step-head tc-step-head--compact">
                <h2 id="tc-step2-title">Participantes</h2>
                <span
                  className="tc-count"
                  aria-label={`${selectedCount} de ${validCount} participantes selecionados`}
                  title={`${selectedCount} de ${validCount} participantes selecionados para gerar certificado`}
                >
                  {selectedCount === validCount ? `${validCount} selecionados` : `${selectedCount}/${validCount}`}
                </span>
                <div className="tc-step-actions">
                  {validCount > 1 && (
                    <>
                      <button
                        type="button"
                        className="tc-link"
                        onClick={() => handleToggleSelectAllColaboradores(true)}
                        style={{ fontSize: '0.8rem' }}
                      >
                        Marcar todos
                      </button>
                      <button
                        type="button"
                        className="tc-link tc-link--muted"
                        onClick={() => handleToggleSelectAllColaboradores(false)}
                        style={{ fontSize: '0.8rem' }}
                      >
                        Desmarcar todos
                      </button>
                    </>
                  )}
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

              {selectedTurmaIdInGenerator && (
                <div className="tc-linked-turma-bar">
                  <div className="tc-linked-turma-info">
                    <Users size={15} className="tc-linked-turma-icon" />
                    <span>
                      Lista da turma: <strong>{activeTurma?.name || 'Turma Vinculada'}</strong>
                    </span>
                    <span className="tc-badge tc-badge--subtle">
                      {selectedCount} de {validCount} selecionado(s) para certificado
                    </span>
                  </div>
                  <div className="tc-linked-turma-actions">
                    <button
                      type="button"
                      className="tc-link"
                      onClick={() => handleToggleSelectAllColaboradores(true)}
                    >
                      Selecionar todos
                    </button>
                    <span className="tc-divider">·</span>
                    <button
                      type="button"
                      className="tc-link tc-link--muted"
                      onClick={() => handleToggleSelectAllColaboradores(false)}
                    >
                      Desmarcar todos
                    </button>
                  </div>
                </div>
              )}

              <div className="tc-students">
                <div className="tc-students-head">
                  <div className="tc-col-select" title={isAllSelected ? "Desmarcar todos os participantes" : "Selecionar todos os participantes"}>
                    <input
                      type="checkbox"
                      id="select-all-students-cb"
                      className="tc-checkbox"
                      checked={isAllSelected}
                      ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                      onChange={(e) => handleToggleSelectAllColaboradores(e.target.checked)}
                      aria-label="Selecionar todos os participantes para emissão de certificado"
                      style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
                    />
                  </div>
                  <span>#</span>
                  <span>Nome completo</span>
                  <span>CPF</span>
                  <span />
                </div>
                <div className="tc-students-body">
                  {colaboradores.map((colab, idx) => {
                    const isSelected = colab.selected !== false;
                    const isCpfValid = colab.cpf && colab.cpf.replace(/\D/g, '').length === 11;
                    return (
                      <div key={idx} className={`tc-student-row ${!isSelected ? 'tc-student-row--unselected' : ''}`}>
                        <div className="tc-col-select">
                          <input
                            type="checkbox"
                            id={`student-select-${idx}`}
                            className="tc-checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectColaborador(idx)}
                            title={isSelected ? "Participante selecionado para gerar certificado (clique para desmarcar)" : "Clique para incluir este participante na emissão"}
                            aria-label={`Selecionar ${colab.nome || `Participante #${idx + 1}`} para emissão`}
                            style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
                          />
                        </div>
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
              <div className="tc-step-head tc-step-head--compact">
                <h2 id="tc-step3-title">Assinaturas</h2>
                <span className="tc-count" aria-label={`${signedCount} de ${signatureRoles.length} assinaturas concluídas`}>{signedCount}/{signatureRoles.length}</span>
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
                  const manualSig = currentTurmaSignatures?.[role.key] || (role.key === 'instructor_0' ? currentTurmaSignatures?.instructor : null);
                  const defaultUrl = getInstructorSignatureUrl(role.name);
                  const isManual = Boolean(manualSig?.dataUrl && !manualSig?.isDefaultOfficial);
                  const sigUrl = isManual ? manualSig.dataUrl : (manualSig?.dataUrl || defaultUrl);
                  const isSigned = Boolean(sigUrl);
                  return (
                    <li key={role.key} className={`tc-sign-row ${isSigned ? 'is-signed' : ''}`}>
                      <div className="tc-sign-info">
                        <span className="tc-sign-role">{role.label}</span>
                        <span className="tc-sign-name" title={role.name}>{role.name}</span>
                        <div style={{ marginTop: '3px' }}>
                          {isManual ? (
                            <span className="tc-badge tc-badge--success" style={{ fontSize: '0.68rem', padding: '1px 6px' }} title="Assinatura manual coletada pelo celular ou tela">
                              ✍️ Assinatura manual (celular/tela)
                            </span>
                          ) : defaultUrl ? (
                            <span className="tc-badge" style={{ fontSize: '0.68rem', padding: '1px 6px', color: '#0369a1', background: '#e0f2fe', borderColor: '#bae6fd' }} title="Assinatura oficial padrão carregada automaticamente">
                              ✓ Assinatura padrão oficial
                            </span>
                          ) : (
                            <span className="tc-badge tc-badge--muted" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                              Pendente
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="tc-sign-thumb" style={{ backgroundColor: '#ffffff', minHeight: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {sigUrl ? (
                          <img src={sigUrl} alt={`Assinatura de ${role.name}`} style={{ maxHeight: '36px', maxWidth: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span>Não assinado</span>
                        )}
                      </div>
                      <div className="tc-sign-actions">
                        <button
                          id={`btn-sign-${role.key}`}
                          type="button"
                          className="tc-btn"
                          onClick={() => handleOpenSignatureModal(role.key)}
                          title="Assinar com caneta na tela ou substituir assinatura"
                        >
                          <PenTool size={13} />
                          {isManual ? 'Refazer manual' : 'Assinar manual'}
                        </button>
                        {isManual && (
                          <button
                            type="button"
                            className="tc-icon-btn tc-icon-btn--sm tc-icon-btn--danger"
                            onClick={() => handleClearSignature(role.key)}
                            title="Restaurar assinatura padrão oficial"
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
                  <small>Texto do certificado, conteúdo do verso, validade e empresa</small>
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
                      placeholder="EcoClinic"
                    />
                    <datalist id="tc-empresas-list">
                      <option value="EcoClinic" />
                      {companies.map(c => (
                        <option key={c.id} value={c.name} />
                      ))}
                    </datalist>
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

                {/* Prévia na mesma proporção e com a mesma área útil do PDF */}
                <div
                  ref={certificatePreviewRef}
                  className={`tc-certificate-preview tc-certificate-preview--${certModel}`}
                  style={{
                  backgroundImage: certModel === 'modelo1'
                    ? `url(${previewTab === 'frente' ? '/certificate-templates/m1_frente_bg.jpg' : '/certificate-templates/m1_verso_bg.jpg'})`
                    : `url(${previewTab === 'frente' ? '/certificate-templates/m2_frente_bg.png?v=ecosafety_v2' : '/certificate-templates/m2_verso_bg.png?v=ecosafety_v2'})`,
                  fontFamily: certModel === 'modelo1' ? "'Roboto', 'Lato', sans-serif" : "'Lato', 'Montserrat', sans-serif"
                  }}
                >
                  {/* ========================================================================= */}
                  {/* RENDERIZAÇÃO: MODELO 1 (EcoCurvas Laterais - Roxo Oficial EcoSafety)       */}
                  {/* ========================================================================= */}
                  {certModel === 'modelo1' ? (
                    previewTab === 'frente' ? (
                      /* MODELO 1 - FRENTE */
                      <div className="tc-certificate-front" style={{ fontFamily: "'Roboto', sans-serif" }}>
                        {/* Topo: Header Banner Oficial com Logomarca EcoSafety e Título */}
                        <div style={{ textAlign: 'center' }}>
                          <img 
                            src="/certificate-templates/m1_header_transparent.png" 
                            alt="EcoSafety Certificado de Capacitação" 
                            style={{ 
                              height: m1FrenteStyles.headerMaxHeight, 
                              maxWidth: '100%', 
                              width: 'auto', 
                              objectFit: 'contain', 
                              display: 'inline-block' 
                            }} 
                          />
                        </div>

                        {/* Corpo: Conteúdo Centralizado com Hierarquia Visual e Identidade Oficial EcoSafety */}
                        <div className="tc-certificate-main" style={{
                          textAlign: 'center',
                          maxHeight: certificateFrontGeometry.previewContentMaxHeight,
                          fontFamily: "'Roboto', sans-serif"
                        }}>
                          {/* 1. Subtítulo */}
                          <div style={{
                            fontSize: m1FrenteStyles.subTitleSize,
                            fontWeight: '500',
                            color: '#374151',
                            letterSpacing: '0.3px',
                            marginTop: m1FrenteStyles.subTitleMargin
                          }}>
                            A ECOSAFETY certifica que:
                          </div>

                          {/* 2. Nome do Participante em Destaque (Roxo Oficial EcoSafety #64268a) */}
                          <div style={{
                            fontSize: m1FrenteStyles.studentNameSize,
                            fontWeight: '800',
                            color: '#64268a',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            margin: m1FrenteStyles.studentNameMargin
                          }}>
                            {firstStudent?.nome ? firstStudent.nome.toUpperCase() : 'NOME DO PARTICIPANTE'}
                          </div>

                          {/* 3. Conclusão, CPF, Período e Cidade */}
                          <div style={{
                            fontSize: m1FrenteStyles.cpfTextSize,
                            color: '#111827',
                            lineHeight: m1FrenteStyles.cpfLineHeight,
                            maxWidth: '96%',
                            margin: '0 auto'
                          }}>
                            portador(a) do CPF <strong style={{ color: '#000000' }}>{firstStudent?.cpf ? firstStudent.cpf : '000.000.000-00'}</strong>, completou com aprovação no período de{' '}
                            <strong style={{ color: '#000000' }}>{formData.data ? new Date(formData.data + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data'}</strong> na cidade de <strong style={{ color: '#000000' }}>{formData.local || 'Mossoró - RN'}</strong>, o treinamento de:
                          </div>

                          {/* 4. Nome do Curso / Treinamento em Destaque */}
                          <div style={{
                            fontSize: m1FrenteStyles.courseSize,
                            fontWeight: '800',
                            color: '#64268a',
                            margin: m1FrenteStyles.courseMargin,
                            letterSpacing: '0.3px',
                            textTransform: 'uppercase'
                          }}>
                            {formData.curso}
                          </div>

                          {/* 5. Embasamento Normativo e Descrição */}
                          {cleanDescricao && (
                            <div style={{
                              fontSize: m1FrenteStyles.descSize,
                              color: '#374151',
                              textAlign: 'justify',
                              lineHeight: m1FrenteStyles.descLineHeight,
                              maxWidth: '94%',
                              margin: m1FrenteStyles.descMargin
                            }}>
                              {cleanDescricao}
                            </div>
                          )}

                          {/* 6. Localidade e Data */}
                          <div style={{
                            fontSize: m1FrenteStyles.dateSize,
                            color: '#111827',
                            marginTop: m1FrenteStyles.dateMarginTop,
                            fontWeight: '500'
                          }}>
                            {formData.local || 'Mossoró - RN'}, Brasil, {formData.data ? new Date(formData.data + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data'}.
                          </div>
                        </div>

                        {/* Rodapé: Assinaturas Dinâmicas com Traços e Tipografia em Roxo Oficial EcoSafety #64268a */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${Math.max(1, m1SignerColumns.length)}, 1fr)`,
                          gap: m1FrenteStyles.sigGap,
                          alignItems: 'end',
                          textAlign: 'center',
                          marginTop: '0.25rem',
                          fontFamily: "'Lato', sans-serif"
                        }}>
                          {m1SignerColumns.map((col) => (
                            <div key={col.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              {col.isStudent ? (
                                <div style={{ height: m1FrenteStyles.sigHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <span style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: m1FrenteStyles.sigRegSize, letterSpacing: '0.3px' }}>[ Assinatura Pendente ]</span>
                                </div>
                              ) : col.sigImg ? (
                                <img src={col.sigImg} alt="Assinatura" style={{ height: m1FrenteStyles.sigHeight, objectFit: 'contain', marginBottom: '2px' }} />
                              ) : (
                                <div style={{ height: m1FrenteStyles.sigHeight, marginBottom: '2px' }} />
                              )}
                              <div style={{ borderTop: '1px solid #64268a', width: '92%', paddingTop: '2px' }}>
                                <div style={{ fontSize: m1FrenteStyles.sigTitleSize, fontWeight: '700', color: '#64268a', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
                                  {col.roleLabel}
                                </div>
                                <div style={{ fontSize: m1FrenteStyles.sigNameSize, fontWeight: '700', color: '#64268a' }}>
                                  {col.name}
                                </div>
                                {col.registration ? (
                                  <div style={{ fontSize: m1FrenteStyles.sigRegSize, color: '#64268a' }}>
                                    {col.registration}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* MODELO 1 - VERSO (Conteúdo Dinâmico sem barra de rolagem e sem cortes) */
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', fontFamily: "'Lato', sans-serif" }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <div style={{ 
                            borderBottom: '1px solid rgba(0,0,0,0.1)', 
                            paddingBottom: m1VersoStyles.headerPadding || '0.2rem', 
                            marginBottom: m1VersoStyles.headerMargin || '0.25rem' 
                          }}>
                            <div style={{ fontSize: m1VersoStyles.headerSize, fontWeight: '700', color: '#595959' }}>
                              Programa: <span style={{ color: '#64268a' }}>{formData.curso}</span>
                            </div>
                            <div style={{ fontSize: m1VersoStyles.headerDurationSize || '0.54rem', color: '#595959', fontWeight: '400', marginTop: '1px' }}>
                              Carga horária: {formData.duracao}
                            </div>
                          </div>

                          {(() => {
                            const balanced = balanceSyllabusColumns(formData.conteudo, 42);
                            if (m1VersoStyles.useTwoCols) {
                              return (
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  gap: m1VersoStyles.gap,
                                  fontSize: m1VersoStyles.fontSize,
                                  color: '#000000',
                                  lineHeight: m1VersoStyles.lineHeight,
                                  flex: 1,
                                  overflow: 'hidden'
                                }}>
                                  <div style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{balanced.col1}</div>
                                  <div style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{balanced.col2}</div>
                                </div>
                              );
                            }
                            return (
                              <div style={{ 
                                fontSize: m1VersoStyles.fontSize, 
                                color: '#000000', 
                                lineHeight: m1VersoStyles.lineHeight, 
                                flex: 1,
                                overflow: 'hidden',
                                whiteSpace: 'pre-line',
                                wordBreak: 'break-word'
                              }}>
                                {balanced.normalizedText}
                              </div>
                            );
                          })()}
                        </div>

                        <div style={{
                          textAlign: 'center',
                          fontSize: m1VersoStyles.footerSize,
                          fontWeight: '700',
                          color: '#595959',
                          letterSpacing: '0.4px',
                          borderTop: '1px solid #e2e8f0',
                          paddingTop: '0.25rem'
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
                      <div className="tc-certificate-front" style={{ fontFamily: "'Lato', sans-serif" }}>
                        {/* Topo: Header com Título Oficial e Subtítulo */}
                        <div style={{ textAlign: 'center', paddingTop: m2FrenteStyles.topPadding }}>
                          <div style={{ 
                            fontFamily: "'Montserrat', sans-serif",
                            fontSize: m2FrenteStyles.titleSize, 
                            fontWeight: '800', 
                            color: '#555555', 
                            letterSpacing: m2FrenteStyles.titleLetterSpacing, 
                            textTransform: 'uppercase' 
                          }}>
                            CERTIFICADO DE CAPACITAÇÃO
                          </div>
                          <div style={{ fontSize: m2FrenteStyles.subTitleSize, fontWeight: '400', color: '#000000', marginTop: m2FrenteStyles.subTitleMargin }}>
                            A ECOSAFETY certifica que:
                          </div>
                        </div>

                        {/* Conteúdo centralizado dentro da área útil, com densidade adaptativa */}
                        <div className="tc-certificate-main" style={{ textAlign: 'center', maxHeight: certificateFrontGeometry.previewContentMaxHeight }}>
                          {/* Destaque do Nome em Azul Real Oficial #3340e6 com Lato Black 900 */}
                          <div style={{ 
                            fontFamily: "'Lato', sans-serif",
                            fontSize: m2FrenteStyles.studentNameSize, 
                            fontWeight: '900', 
                            color: '#3340e6', 
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            margin: m2FrenteStyles.studentNameMargin
                          }}>
                            {firstStudent?.nome ? firstStudent.nome.toUpperCase() : 'NOME DO PARTICIPANTE'}
                          </div>

                          <div style={{ fontSize: m2FrenteStyles.cpfTextSize, color: '#000000', lineHeight: m2FrenteStyles.cpfLineHeight, maxWidth: '96%', margin: '0 auto' }}>
                            Portador do CPF: <strong style={{ color: '#000000' }}>{firstStudent?.cpf ? firstStudent.cpf : '000.000.000-00'}</strong>, completou com aprovação no período de{' '}
                            <strong style={{ color: '#000000' }}>{formData.data ? new Date(formData.data + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data'}</strong> na ECOSAFETY TREINAMENTOS, o treinamento de:
                          </div>

                          <div style={{ 
                            fontSize: m2FrenteStyles.courseSize, 
                            fontWeight: '800', 
                            color: '#3340e6', 
                            margin: m2FrenteStyles.courseMargin 
                          }}>
                            {formData.curso}
                          </div>

                          {cleanDescricao && (
                            <div style={{ 
                              fontSize: m2FrenteStyles.descSize, 
                              color: '#000000', 
                              textAlign: 'justify', 
                              lineHeight: m2FrenteStyles.descLineHeight, 
                              maxWidth: '94%', 
                              margin: m2FrenteStyles.descMargin 
                            }}>
                              {cleanDescricao}
                            </div>
                          )}

                          <div style={{ fontSize: m2FrenteStyles.dateSize, color: '#000000', marginTop: m2FrenteStyles.dateMarginTop }}>
                            {formData.local || 'Mossoró, RN'}, Brasil, {formData.data ? new Date(formData.data + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data'}.
                          </div>
                        </div>

                        {/* Rodapé: Assinaturas Dinâmicas com Linhas e Textos em Preto Oficial #000000 (Afastado da onda roxa) */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${Math.max(1, m2SignerColumns.length)}, 1fr)`,
                          gap: m2FrenteStyles.sigGap,
                          alignItems: 'end',
                          textAlign: 'center',
                          marginTop: '0.2rem',
                          paddingBottom: m2FrenteStyles.sigPaddingBottom,
                          paddingLeft: m2FrenteStyles.sigPaddingX,
                          paddingRight: m2FrenteStyles.sigPaddingX,
                          fontFamily: "'Lato', sans-serif"
                        }}>
                          {m2SignerColumns.map((col) => (
                            <div key={col.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              {col.isStudent ? (
                                <div style={{ height: m2FrenteStyles.sigImageHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <span style={{ fontSize: m2FrenteStyles.sigRegSize, color: '#94a3b8', fontStyle: 'italic' }}>[ Assinatura Pendente ]</span>
                                </div>
                              ) : col.sigImg ? (
                                <img src={col.sigImg} alt="Assinatura" style={{ height: m2FrenteStyles.sigImageHeight, objectFit: 'contain', marginBottom: '1px' }} />
                              ) : (
                                <div style={{ height: m2FrenteStyles.sigImageHeight, marginBottom: '1px' }} />
                              )}
                              <div style={{ borderTop: '1px solid #000000', width: '92%', paddingTop: '2px' }}>
                                <div style={{ fontSize: m2FrenteStyles.sigLabelSize, fontWeight: '800', color: '#000000' }}>
                                  {col.roleLabel}
                                </div>
                                <div style={{ fontSize: m2FrenteStyles.sigNameSize, color: col.isStudent ? '#3340e6' : '#000000', fontWeight: col.isStudent ? '700' : '600' }}>
                                  {col.name}
                                </div>
                                {col.registration ? (
                                  <div style={{ fontSize: m2FrenteStyles.sigRegSize, color: '#595959' }}>
                                    {col.registration}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* MODELO 2 - VERSO (Conteúdo em 2 Colunas Balanceadas - Calibri & Times New Roman sem corte e sem scroll) */
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', fontFamily: "'Calibri', 'Lato', sans-serif" }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <div style={{ 
                            borderBottom: '1px solid rgba(0,0,0,0.08)', 
                            paddingBottom: m2VersoStyles.headerPadding, 
                            marginBottom: m2VersoStyles.headerMargin 
                          }}>
                            <div style={{ fontSize: m2VersoStyles.headerTitleSize, fontWeight: '700', color: '#595959' }}>
                              Programa: <span style={{ color: '#3340e6' }}>{formData.curso}</span>
                            </div>
                            <div style={{ fontSize: m2VersoStyles.headerDurationSize, color: '#595959', fontWeight: '400', marginTop: '1px' }}>
                              Carga horária: {formData.duracao}
                            </div>
                          </div>

                          {/* 2 Colunas de Conteúdo com Times New Roman Balanceadas */}
                          {(() => {
                            const balanced = balanceSyllabusColumns(formData.conteudo, 38);
                            return (
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: m2VersoStyles.gap,
                                fontFamily: "'Times New Roman', Times, serif",
                                fontSize: m2VersoStyles.fontSize,
                                color: '#000000',
                                lineHeight: m2VersoStyles.lineHeight,
                                flex: 1,
                                overflow: 'hidden'
                              }}>
                                <div style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{balanced.col1}</div>
                                <div style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{balanced.col2}</div>
                              </div>
                            );
                          })()}
                        </div>

                        <div style={{
                          textAlign: 'center',
                          fontSize: m2VersoStyles.footerSize,
                          fontWeight: '600',
                          color: '#595959',
                          letterSpacing: '0.4px',
                          borderTop: '1px solid #e2e8f0',
                          paddingTop: m2VersoStyles.footerPadding
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
                    <strong>{selectedCount}</strong>
                    <span>{selectedCount === 1 ? 'certificado selecionado' : 'certificados selecionados'}</span>
                    {validCount > selectedCount && (
                      <span className="tc-stat-sub" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        ({validCount - selectedCount} desmarcado{validCount - selectedCount !== 1 ? 's' : ''})
                      </span>
                    )}
                  </div>
                  <div className="tc-stat">
                    <strong>{selectedCount * 2}</strong>
                    <span>páginas no PDF (frente + verso)</span>
                  </div>
                  <div className="tc-stat">
                    <strong>{signedCount}/{signatureRoles.length}</strong>
                    <span>assinaturas da turma</span>
                  </div>
                </div>

                <button
                  id="btn-generate-pdf"
                  type="button"
                  className={`tc-btn tc-btn--primary tc-generate-btn ${generating ? 'is-loading' : ''}`}
                  onClick={handleGenerate}
                  disabled={generating || selectedCount === 0}
                >
                  {generating ? (
                    <>
                      <Loader size={19} className="animate-spin" />
                      Gerando {selectedCount} PDF(s)...
                    </>
                  ) : (
                    <>
                      <Download size={19} />
                      Baixar {selectedCount} certificado{selectedCount !== 1 ? 's' : ''} em PDF
                    </>
                  )}
                </button>
                {selectedCount === 0 && validCount > 0 ? (
                  <p className="tc-hint tc-center" style={{ color: 'var(--warning, #d97706)' }}>
                    Selecione ao menos um participante na lista para gerar.
                  </p>
                ) : validCount === 0 ? (
                  <p className="tc-hint tc-center">Adicione ao menos um participante para gerar.</p>
                ) : null}
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
          {/* Link Geral de Inscrição e Lista de Presença */}
          <section className="tc-portal" aria-labelledby="tc-portal-title">
            <div className="tc-portal-heading">
              <h2 id="tc-portal-title">Inscrições e Lista de Presença</h2>
              <span className="tc-portal-verified" title="Validação segura dos dados por CPF e data de nascimento">
                <ShieldCheck size={13} />
                CPF validado
              </span>
            </div>
            <p className="tc-portal-description">
              Compartilhe o <strong>Link Geral</strong> para que o colaborador selecione a turma desejada (são exibidas apenas as turmas abertas), ou utilize o link direto de cada turma nos cartões abaixo.
            </p>
            <div className="tc-portal-row" style={{ marginTop: '0.75rem' }}>
              <div className="tc-url-field" style={{ maxWidth: '620px' }}>
                <code title={generalEnrollmentUrl}>{generalEnrollmentUrl}</code>
                <button
                  id="btn-copy-general-link"
                  type="button"
                  className={copiedKey === 'general_enrollment' ? 'is-copied' : ''}
                  onClick={copyGeneralLink}
                  aria-live="polite"
                  title="Copiar link geral de inscrição"
                >
                  {copiedKey === 'general_enrollment' ? <Check size={14} /> : <Copy size={14} />}
                  {copiedKey === 'general_enrollment' ? 'Copiado' : 'Copiar link geral'}
                </button>
              </div>
              <a
                id="btn-open-general-form"
                href={generalEnrollmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="tc-btn"
                title="Abrir formulário geral de inscrição"
              >
                <ExternalLink size={14} />
                Abrir formulário
              </a>
            </div>
          </section>

          {/* Seção de Turmas Cadastradas */}
          <section aria-labelledby="tc-turmas-title">
            <div className="tc-section-head">
              <div>
                <h2 id="tc-turmas-title">
                  Turmas
                  <span className="tc-count">{turmas.length}</span>
                </h2>
              </div>
              {turmas.length > 0 && (
                <button
                  id="btn-new-turma"
                  type="button"
                  className="tc-btn tc-btn--primary"
                  onClick={handleOpenNewTurma}
                >
                  <Plus size={15} />
                  Nova turma
                </button>
              )}
            </div>

            {loadingData ? (
              <div className="tc-empty">
                <Loader size={24} className="animate-spin" style={{ margin: '0 auto 0.6rem', color: 'var(--tc-accent)' }} />
                <p style={{ margin: 0 }}>Carregando turmas...</p>
              </div>
            ) : turmas.length === 0 ? (
              <div className="tc-empty tc-empty--turmas">
                <h3>Nenhuma turma cadastrada</h3>
                <button
                  id="btn-create-first-turma"
                  type="button"
                  className="tc-btn tc-btn--primary"
                  onClick={handleOpenNewTurma}
                >
                  <Plus size={16} />
                  Criar turma
                </button>
              </div>
            ) : (
              <div className="tc-turma-grid">
                {turmas.map(turma => {
                  const studentCount = enrollments.filter(e => String(e.turma_id) === String(turma.id)).length;
                  const publicEnrollmentUrl = getPublicEnrollmentUrl(turma.id);
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

                      <div className="tc-turma-public-link">
                        <div className="tc-url-field">
                          <code title={publicEnrollmentUrl}>{publicEnrollmentUrl}</code>
                          <button
                            type="button"
                            className={copiedKey === `turma-${turma.id}` ? 'is-copied' : ''}
                            onClick={() => copyPublicLink(turma.id, `turma-${turma.id}`)}
                            aria-live="polite"
                          >
                            {copiedKey === `turma-${turma.id}` ? <Check size={14} /> : <Copy size={14} />}
                            {copiedKey === `turma-${turma.id}` ? 'Copiado' : 'Copiar link'}
                          </button>
                        </div>
                        <a
                          href={publicEnrollmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tc-btn"
                          title="Abrir formulário público desta turma"
                        >
                          <ExternalLink size={14} />
                          Abrir formulário
                        </a>
                      </div>

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
                            onClick={() => handleOpenSpreadsheetImport(turma)}
                            title="Importar participantes por planilha"
                          >
                            <FileSpreadsheet size={14} />
                            Importar planilha
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
                            Emitir certificados (PDF)
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
                  Participantes
                  <span className="tc-count">
                    {hasActiveFilters ? `${filteredEnrollments.length} de ${enrollments.length}` : enrollments.length}
                  </span>
                </h2>
              </div>
            </div>

            <div className="tc-card tc-table-card">
              {/* Barra de filtros integrada à tabela */}
              {enrollments.length > 0 && (
                <div className="tc-toolbar">
                  <div className="tc-search">
                    <Search size={15} />
                    <input
                      id="tc-enrollment-search"
                      type="text"
                      placeholder="Buscar por nome, CPF ou matrícula..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="tc-input"
                      aria-label="Buscar participante por nome, CPF ou matrícula"
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
              )}

              {filteredEnrollments.length === 0 ? (
                enrollments.length === 0 ? (
                  <div className="tc-empty tc-empty--flat">
                    <h3>Nenhum participante inscrito</h3>
                    <p>As inscrições aparecerão aqui automaticamente.</p>
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
                        <th>Matrícula</th>
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
                          <td className="tc-cell-mono">{student.matricula || '-'}</td>
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
      {/* MODAL: IMPORTAR PARTICIPANTES POR PLANILHA                                */}
      {/* ========================================================================= */}
      {showSpreadsheetImportModal && spreadsheetImportTurma && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) handleCloseSpreadsheetImport();
          }}
        >
          <div className="tc-import-modal" role="dialog" aria-modal="true" aria-labelledby="tc-import-modal-title">
            <header className="tc-import-modal-header">
              <div>
                <h2 id="tc-import-modal-title">Importar participantes</h2>
                <p>Turma: <strong>{spreadsheetImportTurma.name}</strong></p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={handleCloseSpreadsheetImport}
                disabled={spreadsheetImporting}
                aria-label="Fechar importação"
              >
                <X size={18} />
              </button>
            </header>

            <div className="tc-import-modal-body">
              <div className="tc-import-guide">
                <div>
                  <strong>1. Preencha o modelo</strong>
                  <span>Mantenha as colunas Nome e CPF (a coluna Matrícula é opcional). O CPF pode estar com ou sem pontuação.</span>
                </div>
                <a
                  href={spreadsheetTemplateUrl}
                  download="modelo-importacao-turma.xlsx"
                  className="tc-btn tc-btn--soft"
                >
                  <Download size={14} />
                  Baixar modelo
                </a>
              </div>

              <div className="tc-import-guide">
                <div>
                  <strong>2. Envie a planilha preenchida</strong>
                  <span>Formato aceito: .xlsx, com até 5 MB.</span>
                </div>
              </div>

              <label className={`tc-file-drop ${spreadsheetFileName ? 'has-file' : ''}`}>
                <input
                  ref={spreadsheetInputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleSpreadsheetFileChange}
                  disabled={spreadsheetReading || spreadsheetImporting}
                />
                {spreadsheetReading ? <Loader size={24} className="animate-spin" /> : <Upload size={24} />}
                <span>{spreadsheetFileName || 'Clique para selecionar a planilha'}</span>
                <small>{spreadsheetReading ? 'Lendo e validando dados...' : 'Os dados serão conferidos antes da importação.'}</small>
              </label>

              {spreadsheetImportError && (
                <div className="tc-form-alert" role="alert">
                  <AlertCircle size={16} />
                  <span>{spreadsheetImportError}</span>
                </div>
              )}

              {spreadsheetPreview && (
                <div className="tc-import-preview">
                  <div className="tc-import-summary" aria-label="Resumo da planilha">
                    <div>
                      <strong>{spreadsheetPreview.participants.length}</strong>
                      <span>prontos para importar</span>
                    </div>
                    <div className={spreadsheetPreview.issues.length ? 'has-issues' : ''}>
                      <strong>{spreadsheetPreview.issues.length}</strong>
                      <span>linhas com problema</span>
                    </div>
                  </div>

                  {spreadsheetPreview.participants.length > 0 && (
                    <div className="tc-import-table-wrap">
                      <table className="tc-import-table">
                        <thead>
                          <tr>
                            <th>Nome</th>
                            <th>CPF</th>
                            <th>Matrícula</th>
                          </tr>
                        </thead>
                        <tbody>
                          {spreadsheetPreview.participants.slice(0, 5).map(participant => (
                            <tr key={participant.cpf}>
                              <td>{participant.nome}</td>
                              <td>{participant.cpf}</td>
                              <td>{participant.matricula || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {spreadsheetPreview.participants.length > 5 && (
                        <p>Mais {spreadsheetPreview.participants.length - 5} participante(s) na planilha.</p>
                      )}
                    </div>
                  )}

                  {spreadsheetPreview.issues.length > 0 && (
                    <details className="tc-import-issues">
                      <summary>Ver linhas que não serão importadas</summary>
                      <ul>
                        {spreadsheetPreview.issues.slice(0, 8).map(issue => (
                          <li key={`${issue.rowNumber}-${issue.message}`}>
                            Linha {issue.rowNumber}: {issue.message}
                          </li>
                        ))}
                      </ul>
                      {spreadsheetPreview.issues.length > 8 && (
                        <p>Mais {spreadsheetPreview.issues.length - 8} problema(s) não exibido(s).</p>
                      )}
                    </details>
                  )}
                </div>
              )}
            </div>

            <footer className="tc-import-modal-footer">
              <button type="button" className="tc-btn" onClick={handleCloseSpreadsheetImport} disabled={spreadsheetImporting}>
                Cancelar
              </button>
              <button
                type="button"
                className="tc-btn tc-btn--primary"
                onClick={handleImportSpreadsheet}
                disabled={spreadsheetReading || spreadsheetImporting || !spreadsheetPreview?.participants?.length}
              >
                {spreadsheetImporting ? <Loader size={15} className="animate-spin" /> : <Upload size={15} />}
                {spreadsheetImporting ? 'Importando...' : 'Importar participantes'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CRIAR OU EDITAR TURMA                                              */}
      {/* ========================================================================= */}
      {showTurmaModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) requestCloseTurmaModal();
          }}
        >
          <div className="tc-turma-modal" role="dialog" aria-modal="true" aria-labelledby="tc-turma-modal-title">
            <form className="tc-turma-modal-form" onSubmit={handleSaveTurma} noValidate>
              <header className="tc-turma-modal-header">
                <div>
                  <h2 id="tc-turma-modal-title">{editingTurma ? 'Editar turma' : 'Nova turma'}</h2>
                  <p>Preencha os dados usados na inscrição e nos certificados.</p>
                </div>
                <button type="button" className="modal-close" onClick={requestCloseTurmaModal} aria-label="Fechar modal">
                  <X size={18} />
                </button>
              </header>

              <div className="tc-turma-modal-body">
                {turmaFormErrors.submit && (
                  <div className="tc-form-alert" role="alert">
                    <AlertCircle size={15} />
                    {turmaFormErrors.submit}
                  </div>
                )}

                <section className="tc-modal-section" aria-labelledby="tc-identificacao-title">
                  <h3 id="tc-identificacao-title">Identificação</h3>
                  <div className="tc-modal-field">
                    <label htmlFor="tc-turma-name">Nome da turma <span aria-hidden="true">*</span></label>
                    <input
                      id="tc-turma-name"
                      type="text"
                      required
                      autoFocus
                      className={`tc-input ${turmaFormErrors.name ? 'is-invalid' : ''}`}
                      placeholder="Ex: Turma 01 · NR-35 · Março 2026"
                      value={turmaFormData.name}
                      aria-invalid={Boolean(turmaFormErrors.name)}
                      aria-describedby={turmaFormErrors.name ? 'tc-turma-name-error' : undefined}
                      onChange={(event) => {
                        setTurmaFormData(prev => ({ ...prev, name: event.target.value }));
                        if (turmaFormErrors.name) setTurmaFormErrors(prev => ({ ...prev, name: '' }));
                      }}
                    />
                    {turmaFormErrors.name && <span id="tc-turma-name-error" className="tc-field-error">{turmaFormErrors.name}</span>}
                  </div>

                  <div className="tc-modal-field">
                    <div className="tc-label-row">
                      <label htmlFor="tc-turma-preset">Curso do catálogo</label>
                      <button
                        type="button"
                        className="tc-link tc-link--primary"
                        onClick={() => handleOpenCreateCourseModal('turma')}
                        style={{ fontSize: '0.8rem' }}
                      >
                        <Plus size={13} /> Criar novo curso
                      </button>
                    </div>
                    <select
                      id="tc-turma-preset"
                      className="tc-input"
                      value={turmaFormData.selectedPresetKey || 'custom'}
                      onChange={(event) => {
                        const val = event.target.value;
                        if (val === '__create_new__') {
                          handleOpenCreateCourseModal('turma');
                          return;
                        }
                        handleCoursePresetChangeInTurma(val);
                        if (turmaFormErrors.course_name) setTurmaFormErrors(prev => ({ ...prev, course_name: '' }));
                      }}
                    >
                      <option value="__create_new__">➕ + Criar novo curso...</option>
                      <option value="custom">Curso personalizado / Digitação livre</option>
                      {customTrainings.length > 0 && (
                        <optgroup label="⭐ Cursos Cadastrados (Personalizados)">
                          {allCoursePresets.filter(p => p.isCustom).map(preset => (
                            <option key={preset.name} value={preset.name}>
                              {preset.name} · {preset.duration}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Modelos Oficiais">
                        {OFFICIAL_TRAINING_MODELS.map(preset => (
                          <option key={preset.name} value={preset.name}>
                            {preset.name} · {preset.duration}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <span
                      className={`tc-autofill-note ${turmaFormData.selectedPresetKey && turmaFormData.selectedPresetKey !== 'custom' ? '' : 'is-hidden'}`}
                      role={turmaFormData.selectedPresetKey && turmaFormData.selectedPresetKey !== 'custom' ? 'status' : undefined}
                      aria-hidden={!(turmaFormData.selectedPresetKey && turmaFormData.selectedPresetKey !== 'custom')}
                    >
                      <Check size={13} /> Dados do curso preenchidos automaticamente
                    </span>
                  </div>
                </section>

                <section className="tc-modal-section" aria-labelledby="tc-training-data-title">
                  <h3 id="tc-training-data-title">Dados do treinamento</h3>
                  <div className="tc-modal-grid">
                    <div className="tc-modal-field tc-modal-span-2">
                      <label htmlFor="tc-turma-course-name">Nome oficial do curso <span aria-hidden="true">*</span></label>
                      <input
                        id="tc-turma-course-name"
                        type="text"
                        required
                        className={`tc-input ${turmaFormErrors.course_name ? 'is-invalid' : ''}`}
                        placeholder="Ex: NR-35 – Trabalho em Altura – Nível Básico"
                        value={turmaFormData.course_name}
                        aria-invalid={Boolean(turmaFormErrors.course_name)}
                        aria-describedby={turmaFormErrors.course_name ? 'tc-turma-course-error' : undefined}
                        onChange={(event) => {
                          setTurmaFormData(prev => ({ ...prev, course_name: event.target.value }));
                          if (turmaFormErrors.course_name) setTurmaFormErrors(prev => ({ ...prev, course_name: '' }));
                        }}
                      />
                      {turmaFormErrors.course_name && <span id="tc-turma-course-error" className="tc-field-error">{turmaFormErrors.course_name}</span>}
                    </div>
                    <div className="tc-modal-field">
                      <label htmlFor="tc-turma-duration">Carga horária</label>
                      <input id="tc-turma-duration" type="text" className="tc-input" placeholder="Ex: 8 horas" value={turmaFormData.duration} onChange={event => setTurmaFormData(prev => ({ ...prev, duration: event.target.value }))} />
                    </div>
                    <div className="tc-modal-field">
                      <label htmlFor="tc-turma-validade">Validade</label>
                      <input id="tc-turma-validade" type="text" className="tc-input" placeholder="Ex: 24 meses" value={turmaFormData.validade || ''} onChange={event => setTurmaFormData(prev => ({ ...prev, validade: event.target.value }))} />
                    </div>
                    <div className="tc-modal-field">
                      <label htmlFor="tc-turma-date">Data de realização</label>
                      <input id="tc-turma-date" type="date" className="tc-input" value={turmaFormData.start_date} onChange={event => setTurmaFormData(prev => ({ ...prev, start_date: event.target.value }))} />
                    </div>
                    <div className="tc-modal-field">
                      <label htmlFor="tc-turma-location">Local</label>
                      <input id="tc-turma-location" type="text" className="tc-input" placeholder="Ex: Mossoró - RN" value={turmaFormData.location} onChange={event => setTurmaFormData(prev => ({ ...prev, location: event.target.value }))} />
                    </div>
                  </div>
                </section>

                <section className="tc-modal-section" aria-labelledby="tc-complementary-title">
                  <h3 id="tc-complementary-title">Dados complementares</h3>
                  <div className="tc-modal-grid">
                    <div className="tc-modal-field tc-modal-span-2">
                      <label htmlFor="tc-turma-company">Empresa solicitante</label>
                      <div className="tc-company-field">
                        {companies.length > 0 && (
                          <select
                            className="tc-input"
                            aria-label="Selecionar empresa cadastrada"
                            value={companies.some(company => company.name === turmaFormData.company) ? turmaFormData.company : (turmaFormData.company ? 'custom' : '')}
                            onChange={(event) => {
                              if (event.target.value && event.target.value !== 'custom') {
                                setTurmaFormData(prev => ({ ...prev, company: event.target.value }));
                              }
                            }}
                          >
                            <option value="">Empresa cadastrada</option>
                            {companies.map(company => <option key={company.id || company.name} value={company.name}>{company.name}</option>)}
                            <option value="custom">Outra empresa</option>
                          </select>
                        )}
                        <input id="tc-turma-company" type="text" className="tc-input" placeholder="Nome da empresa" value={turmaFormData.company} onChange={event => setTurmaFormData(prev => ({ ...prev, company: event.target.value }))} />
                      </div>
                    </div>
                    <div className="tc-modal-field">
                      <label htmlFor="tc-turma-status">Status</label>
                      <select id="tc-turma-status" className="tc-input" value={turmaFormData.status} onChange={event => setTurmaFormData(prev => ({ ...prev, status: event.target.value }))}>
                        <option value="Aberta">Aberta</option>
                        <option value="Em Andamento">Em andamento</option>
                        <option value="Concluída">Concluída</option>
                      </select>
                    </div>
                  </div>
                </section>

                <details className="tc-modal-details">
                  <summary>
                    <span>Instrutores e responsáveis técnicos</span>
                    <small>{turmaFormData.instructors?.length || 0} instrutor{turmaFormData.instructors?.length === 1 ? '' : 'es'}</small>
                    <ChevronDown size={16} />
                  </summary>
                  <div className="tc-details-body">
                    <div className="tc-subsection-head">
                      <h4>Instrutores</h4>
                      <button type="button" className="tc-link" onClick={handleAddInstructorToTurma}>
                        <Plus size={13} /> Adicionar
                      </button>
                    </div>
                    {(!turmaFormData.instructors || turmaFormData.instructors.length === 0) ? (
                      <p className="tc-compact-empty">Nenhum instrutor definido.</p>
                    ) : (
                      <div className="tc-instructor-list">
                        {turmaFormData.instructors.map((inst, index) => (
                          <div className="tc-instructor-row" key={inst.id || index}>
                            <div className="tc-instructor-head">
                              <strong>{index === 0 ? 'Instrutor principal' : `Instrutor ${index + 1}`}</strong>
                              <button type="button" className="tc-link tc-link--danger" onClick={() => handleRemoveInstructorFromTurma(index)} aria-label={`Remover instrutor ${index + 1}`}>
                                <Trash2 size={13} /> Remover
                              </button>
                            </div>
                            <select
                              className="tc-input tc-modal-span-2"
                              value={profiles.some(profile => profile.name.trim() === inst.name?.trim()) ? inst.name : (inst.name ? 'custom' : '')}
                              onChange={(event) => {
                                const value = event.target.value;
                                if (value && value !== 'custom') {
                                  const selected = profiles.find(profile => profile.name === value);
                                  handleUpdateInstructorInTurma(index, {
                                    name: selected?.name || value,
                                    role: selected?.role === 'Admin' ? 'Instrutor e Responsável Técnico' : (selected?.role ? `Instrutor / ${selected.role}` : (inst.role || 'Instrutor')),
                                    registration: selected?.registration || inst.registration || ''
                                  });
                                }
                              }}
                            >
                              <option value="">Selecionar profissional</option>
                              {profiles.map(profile => <option key={profile.id || profile.name} value={profile.name}>{profile.name}{profile.role ? ` — ${profile.role}` : ''}</option>)}
                              <option value="custom">Outro profissional</option>
                            </select>
                            <input type="text" className="tc-input tc-modal-span-2" aria-label="Nome do instrutor" placeholder="Nome completo" value={inst.name || ''} onChange={event => handleUpdateInstructorInTurma(index, { name: event.target.value })} />
                            <input type="text" className="tc-input" aria-label="Cargo do instrutor" placeholder="Cargo ou qualificação" value={inst.role || ''} onChange={event => handleUpdateInstructorInTurma(index, { role: event.target.value })} />
                            <input type="text" className="tc-input" aria-label="Registro do instrutor" placeholder="Registro MTE, SRTE ou CREA" value={inst.registration || ''} onChange={event => handleUpdateInstructorInTurma(index, { registration: event.target.value })} />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="tc-subsection-head tc-subsection-head--divided">
                      <h4>Responsável técnico</h4>
                      {turmaFormData.tech_lead ? (
                        <button type="button" className="tc-link tc-link--danger" onClick={handleRemoveTechLeadFromTurma}>
                          <Trash2 size={13} /> Excluir
                        </button>
                      ) : (
                        <button type="button" className="tc-link" onClick={handleAddTechLeadToTurma}>
                          <Plus size={13} /> Adicionar
                        </button>
                      )}
                    </div>
                    {!turmaFormData.tech_lead ? (
                      <p className="tc-compact-empty">Nenhum responsável técnico definido.</p>
                    ) : (
                      <div className="tc-modal-grid">
                        <select
                          className="tc-input tc-modal-span-2"
                          aria-label="Selecionar responsável técnico"
                          value={profiles.some(profile => profile.name.trim() === turmaFormData.tech_lead?.name?.trim()) ? turmaFormData.tech_lead?.name : (turmaFormData.tech_lead?.name ? 'custom' : '')}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (value && value !== 'custom') {
                              const selected = profiles.find(profile => profile.name === value);
                              handleUpdateTechLeadInTurma({ name: selected?.name || value, role: selected?.role || 'Responsável Técnico / Engenheiro de Segurança', registration: selected?.registration || '' });
                            }
                          }}
                        >
                          <option value="">Selecionar profissional</option>
                          {profiles.map(profile => <option key={profile.id || profile.name} value={profile.name}>{profile.name}{profile.role ? ` — ${profile.role}` : ''}</option>)}
                          <option value="custom">Outro profissional</option>
                        </select>
                        <input type="text" className="tc-input tc-modal-span-2" aria-label="Nome do responsável técnico" placeholder="Nome completo" value={turmaFormData.tech_lead?.name || ''} onChange={event => handleUpdateTechLeadInTurma({ name: event.target.value })} />
                        <input type="text" className="tc-input" aria-label="Cargo do responsável técnico" placeholder="Cargo ou qualificação" value={turmaFormData.tech_lead?.role || ''} onChange={event => handleUpdateTechLeadInTurma({ role: event.target.value })} />
                        <input type="text" className="tc-input" aria-label="Registro do responsável técnico" placeholder="Registro CREA, CFT ou MTE" value={turmaFormData.tech_lead?.registration || ''} onChange={event => handleUpdateTechLeadInTurma({ registration: event.target.value })} />
                      </div>
                    )}

                    <div className="tc-subsection-head tc-subsection-head--divided">
                      <h4>Coordenação técnica</h4>
                      {turmaFormData.coordinator ? (
                        <button type="button" className="tc-link tc-link--danger" onClick={handleRemoveCoordinatorFromTurma}>
                          <Trash2 size={13} /> Excluir
                        </button>
                      ) : (
                        <button type="button" className="tc-link" onClick={handleAddCoordinatorToTurma}>
                          <Plus size={13} /> Adicionar
                        </button>
                      )}
                    </div>
                    {!turmaFormData.coordinator ? (
                      <p className="tc-compact-empty">Nenhuma coordenação técnica definida.</p>
                    ) : (
                      <div className="tc-modal-grid">
                        <select
                          className="tc-input tc-modal-span-2"
                          aria-label="Selecionar coordenação técnica"
                          value={profiles.some(profile => profile.name.trim() === turmaFormData.coordinator?.name?.trim()) ? turmaFormData.coordinator?.name : (turmaFormData.coordinator?.name ? 'custom' : '')}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (value && value !== 'custom') {
                              const selected = profiles.find(profile => profile.name === value);
                              handleUpdateCoordinatorInTurma({
                                name: selected?.name || value,
                                role: selected?.role || 'Coordenação Técnica',
                                registration: selected?.registration || ''
                              });
                            }
                          }}
                        >
                          <option value="">Selecionar profissional</option>
                          {profiles.map(profile => <option key={profile.id || profile.name} value={profile.name}>{profile.name}{profile.role ? ` — ${profile.role}` : ''}</option>)}
                          <option value="custom">Outro profissional</option>
                        </select>
                        <input type="text" className="tc-input tc-modal-span-2" aria-label="Nome da coordenação técnica" placeholder="Nome completo" value={turmaFormData.coordinator?.name || ''} onChange={event => handleUpdateCoordinatorInTurma({ name: event.target.value })} />
                        <input type="text" className="tc-input" aria-label="Cargo da coordenação técnica" placeholder="Cargo ou qualificação" value={turmaFormData.coordinator?.role || ''} onChange={event => handleUpdateCoordinatorInTurma({ role: event.target.value })} />
                        <input type="text" className="tc-input" aria-label="Registro da coordenação técnica" placeholder="Registro CREA, Coren, CFT ou MTE" value={turmaFormData.coordinator?.registration || ''} onChange={event => handleUpdateCoordinatorInTurma({ registration: event.target.value })} />
                      </div>
                    )}
                  </div>
                </details>

                <details className="tc-modal-details">
                  <summary>
                    <span>Configurações do certificado</span>
                    <small>Modelo e conteúdo programático</small>
                    <ChevronDown size={16} />
                  </summary>
                  <div className="tc-details-body tc-modal-grid">
                    <div className="tc-modal-field">
                      <label htmlFor="tc-turma-model">Modelo</label>
                      <select id="tc-turma-model" className="tc-input" value={turmaFormData.cert_model} onChange={event => setTurmaFormData(prev => ({ ...prev, cert_model: event.target.value }))}>
                        <option value="modelo1">EcoCurvas</option>
                        <option value="modelo2">Ondas e Colmeia</option>
                      </select>
                    </div>
                    <div className="tc-modal-field tc-modal-span-2">
                      <label htmlFor="tc-turma-content">Conteúdo programático</label>
                      <textarea id="tc-turma-content" className="tc-input tc-textarea" rows="6" value={turmaFormData.content || ''} onChange={event => setTurmaFormData(prev => ({ ...prev, content: event.target.value }))} />
                    </div>
                  </div>
                </details>
              </div>

              <footer className="tc-turma-modal-footer">
                <button type="button" className="tc-btn" onClick={requestCloseTurmaModal} disabled={turmaSaving}>Cancelar</button>
                <button id="btn-submit-turma" type="submit" className="tc-btn tc-btn--primary" disabled={turmaSaving}>
                  {turmaSaving && <Loader size={15} className="animate-spin" />}
                  {turmaSaving ? 'Salvando...' : (editingTurma ? 'Salvar alterações' : 'Criar turma')}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* MODAL: CADASTRAR NOVO CURSO DE TREINAMENTO                                */}
      {/* ========================================================================= */}
      {showCreateCourseModal && (
        <div
          className="modal-backdrop"
          onClick={() => !savingCourse && setShowCreateCourseModal(false)}
        >
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '640px', borderRadius: '1.25rem', padding: '1.75rem' }}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '1.15rem', fontWeight: '800' }}>
                <GraduationCap size={22} style={{ color: 'var(--tc-accent, #0284c7)' }} />
                Cadastrar Novo Curso
              </h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => !savingCourse && setShowCreateCourseModal(false)}
                disabled={savingCourse}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNewCourse}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Cadastre um novo curso no catálogo. Ele ficará salvo no sistema e disponível na seleção de cursos para emissão de certificados e turmas.
                </p>

                <div className="tc-modal-field">
                  <label htmlFor="new-course-name" style={{ fontSize: '0.84rem', fontWeight: '700', marginBottom: '0.35rem', display: 'block' }}>
                    Nome oficial do curso / treinamento <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
                  </label>
                  <input
                    id="new-course-name"
                    type="text"
                    required
                    className={`tc-input ${courseFormErrors.name ? 'is-invalid' : ''}`}
                    placeholder="Ex: NR-12 – Segurança em Máquinas e Equipamentos"
                    value={newCourseData.name}
                    onChange={(e) => handleNewCourseNameChange(e.target.value)}
                    autoFocus
                  />
                  {courseFormErrors.name && (
                    <span className="tc-field-error" style={{ color: 'var(--danger, #ef4444)', fontSize: '0.78rem' }}>
                      {courseFormErrors.name}
                    </span>
                  )}
                </div>

                <div className="tc-grid-3">
                  <div className="tc-modal-field">
                    <label htmlFor="new-course-duration" style={{ fontSize: '0.84rem', fontWeight: '700', marginBottom: '0.35rem', display: 'block' }}>
                      Carga horária
                    </label>
                    <input
                      id="new-course-duration"
                      type="text"
                      className="tc-input"
                      placeholder="Ex: 8 horas"
                      value={newCourseData.duracao}
                      onChange={(e) => setNewCourseData(prev => ({ ...prev, duracao: e.target.value }))}
                    />
                  </div>

                  <div className="tc-modal-field">
                    <label htmlFor="new-course-validade" style={{ fontSize: '0.84rem', fontWeight: '700', marginBottom: '0.35rem', display: 'block' }}>
                      Validade
                    </label>
                    <input
                      id="new-course-validade"
                      type="text"
                      className="tc-input"
                      placeholder="Ex: 24 meses"
                      value={newCourseData.validade}
                      onChange={(e) => setNewCourseData(prev => ({ ...prev, validade: e.target.value }))}
                    />
                  </div>

                  <div className="tc-modal-field">
                    <label htmlFor="new-course-model" style={{ fontSize: '0.84rem', fontWeight: '700', marginBottom: '0.35rem', display: 'block' }}>
                      Modelo do certificado
                    </label>
                    <select
                      id="new-course-model"
                      className="tc-input"
                      value={newCourseData.cert_model}
                      onChange={(e) => setNewCourseData(prev => ({ ...prev, cert_model: e.target.value }))}
                    >
                      <option value="modelo1">EcoCurvas (Modelo 1)</option>
                      <option value="modelo2">Ondas & Colmeia (Modelo 2)</option>
                    </select>
                  </div>
                </div>

                <div className="tc-modal-field">
                  <label htmlFor="new-course-desc" style={{ fontSize: '0.84rem', fontWeight: '700', marginBottom: '0.35rem', display: 'block' }}>
                    Texto de certificação (Frente do certificado)
                  </label>
                  <textarea
                    id="new-course-desc"
                    rows={3}
                    className="tc-input"
                    placeholder="Descrição impressa na frente do certificado..."
                    value={newCourseData.descricao}
                    onChange={(e) => setNewCourseData(prev => ({ ...prev, descricao: e.target.value }))}
                  />
                </div>

                <div className="tc-modal-field">
                  <label htmlFor="new-course-content" style={{ fontSize: '0.84rem', fontWeight: '700', marginBottom: '0.35rem', display: 'block' }}>
                    Conteúdo programático (Verso do certificado)
                  </label>
                  <textarea
                    id="new-course-content"
                    rows={4}
                    className="tc-input tc-mono"
                    placeholder="1. Introdução e Requisitos Básicos&#10;2. Procedimentos Operacionais&#10;3. Medidas de Proteção e Prevenção&#10;4. Avaliação Teórica e Prática"
                    value={newCourseData.conteudo}
                    onChange={(e) => setNewCourseData(prev => ({ ...prev, conteudo: e.target.value }))}
                  />
                </div>

                {/* Instrutor Padrão (Opcional) */}
                <div className="tc-modal-field">
                  <label htmlFor="new-course-instructor" style={{ fontSize: '0.84rem', fontWeight: '700', marginBottom: '0.35rem', display: 'block' }}>
                    Instrutor padrão (opcional)
                  </label>
                  <select
                    id="new-course-instructor"
                    className="tc-input"
                    value={profiles.some(p => p.name === newCourseData.instrutorNome) ? newCourseData.instrutorNome : (newCourseData.instrutorNome ? 'custom' : '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setNewCourseData(prev => ({ ...prev, instrutorNome: '', instrutorCargo: '', instrutorRegistro: '' }));
                      } else if (val === 'custom') {
                        setNewCourseData(prev => ({ ...prev, instrutorNome: '' }));
                      } else {
                        const prof = profiles.find(p => p.name === val);
                        if (prof) {
                          setNewCourseData(prev => ({
                            ...prev,
                            instrutorNome: prof.name,
                            instrutorCargo: prof.role || '',
                            instrutorRegistro: prof.registration || ''
                          }));
                        }
                      }
                    }}
                  >
                    <option value="">Selecione um instrutor do sistema (opcional)...</option>
                    {profiles.map(p => (
                      <option key={p.id || p.name} value={p.name}>
                        {p.name} {p.role ? `(${p.role})` : ''}
                      </option>
                    ))}
                    <option value="custom">Outro instrutor (digitar manualmente)...</option>
                  </select>
                  {(!profiles.some(p => p.name === newCourseData.instrutorNome) || !newCourseData.instrutorNome) && (
                    <div className="tc-grid-3" style={{ marginTop: '0.5rem' }}>
                      <input
                        type="text"
                        className="tc-input"
                        placeholder="Nome do instrutor"
                        value={newCourseData.instrutorNome}
                        onChange={(e) => setNewCourseData(prev => ({ ...prev, instrutorNome: e.target.value }))}
                      />
                      <input
                        type="text"
                        className="tc-input"
                        placeholder="Cargo do instrutor"
                        value={newCourseData.instrutorCargo}
                        onChange={(e) => setNewCourseData(prev => ({ ...prev, instrutorCargo: e.target.value }))}
                      />
                      <input
                        type="text"
                        className="tc-input"
                        placeholder="Registro (SRTE / CREA)"
                        value={newCourseData.instrutorRegistro}
                        onChange={(e) => setNewCourseData(prev => ({ ...prev, instrutorRegistro: e.target.value }))}
                      />
                    </div>
                  )}
                </div>

                <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCreateCourseModal(false)}
                    disabled={savingCourse}
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-save-new-course"
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingCourse}
                    style={{ backgroundColor: '#0284c7', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    {savingCourse ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        Salvando curso...
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        Cadastrar Curso
                      </>
                    )}
                  </button>
                </div>
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
        const modalCertModel = qrModalTurma.cert_model || certModel;
        const modalInstructors = (Array.isArray(qrModalTurma.instructors) && qrModalTurma.instructors.length > 0)
          ? qrModalTurma.instructors.filter(i => i && i.name && i.name.trim())
          : (qrModalTurma.instructor_name && qrModalTurma.instructor_name.trim() ? [
              {
                id: 'inst-1',
                name: qrModalTurma.instructor_name,
                role: qrModalTurma.instructor_role || 'Instrutor',
                registration: qrModalTurma.instructor_registration || ''
              }
            ] : []);

        const modalTechLead = (qrModalTurma.tech_lead && (qrModalTurma.tech_lead.name?.trim() || qrModalTurma.tech_lead.role?.trim()))
          ? qrModalTurma.tech_lead
          : (qrModalTurma.tech_lead_name?.trim() ? {
              name: qrModalTurma.tech_lead_name,
              role: qrModalTurma.tech_lead_role || 'Responsável Técnico',
              registration: qrModalTurma.tech_lead_registration || ''
            } : null);

        const modalCoordinator = (qrModalTurma.coordinator && (qrModalTurma.coordinator.name?.trim() || qrModalTurma.coordinator.role?.trim()))
          ? qrModalTurma.coordinator
          : null;

        const signersList = [
          ...modalInstructors.map((inst, idx) => ({
            key: idx === 0 ? 'instructor' : `instructor_${idx}`,
            label: modalInstructors.length > 1 ? `Instrutor #${idx + 1}` : 'Instrutor(a)',
            name: inst.name,
            role: inst.role || 'Instrutor(a)',
            instructorId: inst.id
          })),
          ...(modalTechLead && modalTechLead.name?.trim() ? [{
            key: 'tech_lead',
            label: 'Responsável Técnico',
            name: modalTechLead.name,
            role: modalTechLead.role || 'Responsável Técnico',
            instructorId: null
          }] : []),
          ...(modalCoordinator && modalCoordinator.name?.trim() ? [{
            key: 'coordinator',
            label: 'Coordenação Técnica',
            name: modalCoordinator.name,
            role: modalCoordinator.role || 'Coordenação Técnica',
            instructorId: null
          }] : [])
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
