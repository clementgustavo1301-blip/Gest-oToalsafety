import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Send,
  Paperclip,
  X,
  FileText,
  MessageSquare,
  Search,
  Reply,
  Edit2,
  Trash2,
  Check,
  RefreshCw,
  AlertTriangle,
  ClipboardCheck,
  Database,
  ExternalLink,
  Download,
  ChevronUp,
  Eye,
  Upload,
  Loader2,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { getDocumentUrl } from '../services/storageService';
import { compressFileForUpload, formatFileSize } from '../utils/fileCompressor';
import {
  getCompanyMessages,
  sendCompanyMessage,
  updateCompanyMessage,
  deleteCompanyMessage,
  subscribeToCompanyMessages,
  markCompanyChatAsRead,
} from '../services/companyChatService';

const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB (antes da compressão)
const ACCEPTED_ATTACHMENT_TYPES =
  'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.csv,.txt,.rtf,.zip';

const CATEGORY_OPTIONS = [
  { id: 'geral', label: 'Mensagem', shortLabel: 'Geral' },
  { id: 'visita', label: 'Visita Técnica', shortLabel: 'Visita' },
  { id: 'pendencia', label: 'Pendência / Alerta', shortLabel: 'Pendência' },
  { id: 'documento', label: 'Documento / Laudo', shortLabel: 'Documento' },
];

const CATEGORY_META = {
  geral: { label: 'Geral', className: 'company-chat__tag--geral' },
  visita: { label: 'Visita Técnica', className: 'company-chat__tag--visita', icon: ClipboardCheck },
  pendencia: { label: 'Pendência', className: 'company-chat__tag--pendencia', icon: AlertTriangle },
  documento: { label: 'Documento', className: 'company-chat__tag--documento', icon: FileText },
};

const AVATAR_PALETTE = [
  '#0284c7',
  '#0d9488',
  '#4f46e5',
  '#d97706',
  '#059669',
  '#7c3aed',
  '#db2777',
  '#2563eb',
];

function getAvatarColor(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'T';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDateGroupLabel(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  return format(date, "dd 'de' MMM 'de' yyyy", { locale: ptBR });
}

function formatDayKey(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, 'yyyy-MM-dd');
}

function formatTime(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, 'HH:mm');
}

function isImageFile(nameOrPath = '') {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(nameOrPath);
}

function getFileBadgeLabel(nameOrPath = '') {
  const clean = nameOrPath.split('?')[0];
  const idx = clean.lastIndexOf('.');
  if (idx === -1) return 'DOC';
  const ext = clean.slice(idx + 1).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return ext.slice(0, 5) || 'DOC';
}

const CompanyChat = ({ company, group, onMessagesSync }) => {
  const { user, userProfile, activeLink } = useAuth();
  const currentUserId = user?.id;
  const companyId = company?.id;

  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState('CONNECTING');

  const [draft, setDraft] = useState('');
  const [category, setCategory] = useState('geral');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentMeta, setAttachmentMeta] = useState(null);
  const [compressingFile, setCompressingFile] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [filterCategory, setFilterCategory] = useState('all');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedId, setHighlightedId] = useState(null);

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const dragCounterRef = useRef(0);
  const compressionReqRef = useRef(0);

  const authorName =
    userProfile?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Técnico';
  const authorRole = activeLink?.role || userProfile?.role || '';
  const authorSector = activeLink?.sector || userProfile?.sector || '';
  const isAdmin = activeLink?.role === 'Admin';

  const effSupervisor = group?.supervisor || company?.supervisor || company?.supportResponsible || 'Não definido';
  const effTecnico = group?.tecnicoResponsavel || company?.tecnicoResponsavel || company?.responsible || 'Não definido';

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);

  const markReadNow = useCallback((latestTimestamp) => {
    if (!currentUserId || !companyId) return;
    markCompanyChatAsRead(currentUserId, companyId, latestTimestamp || new Date().toISOString());
  }, [currentUserId, companyId]);

  useEffect(() => {
    if (!loading && !tableMissing && onMessagesSync) {
      onMessagesSync({
        unreadCount: 0,
        ...(!hasMore ? { totalCount: messages.length } : {}),
      });
    }
  }, [loading, tableMissing, hasMore, messages.length, onMessagesSync]);

  const fetchInitialMessages = useCallback(async () => {
    if (!companyId) return;
    const result = await getCompanyMessages(companyId, { limit: 100 });
    setMessages(result.messages);
    setHasMore(result.hasMore);
    setTableMissing(result.tableMissing);
    setLoading(false);

    if (!result.tableMissing && result.messages.length > 0) {
      const lastMsg = result.messages[result.messages.length - 1];
      markReadNow(lastMsg.createdAt);
    } else if (!result.tableMissing) {
      markReadNow();
    }

    requestAnimationFrame(() => scrollToBottom('auto'));
  }, [companyId, markReadNow, scrollToBottom]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!companyId) return;
      const result = await getCompanyMessages(companyId, { limit: 100 });
      if (!active) return;

      setMessages(result.messages);
      setHasMore(result.hasMore);
      setTableMissing(result.tableMissing);
      setLoading(false);

      if (!result.tableMissing) {
        const lastMsg = result.messages[result.messages.length - 1];
        markReadNow(lastMsg?.createdAt);
        requestAnimationFrame(() => scrollToBottom('auto'));
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [companyId, markReadNow, scrollToBottom]);

  useEffect(() => {
    if (!companyId || tableMissing) return undefined;

    const unsubscribe = subscribeToCompanyMessages(companyId, {
      onInsert: (incoming) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
        markReadNow(incoming.createdAt);
        if (isNearBottomRef.current || incoming.userId === currentUserId) {
          requestAnimationFrame(() => scrollToBottom('smooth'));
        }
      },
      onUpdate: (updated) => {
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      },
      onDelete: (deletedId) => {
        setMessages((prev) => prev.filter((m) => m.id !== deletedId));
      },
      onStatus: (status) => {
        setRealtimeStatus(status);
      },
    });

    return unsubscribe;
  }, [companyId, tableMissing, currentUserId, markReadNow, scrollToBottom]);

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom < 120;
  };

  const handleLoadOlder = async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    const container = messagesContainerRef.current;
    const previousScrollHeight = container ? container.scrollHeight : 0;

    setLoadingOlder(true);
    const oldest = messages[0];
    const result = await getCompanyMessages(companyId, {
      limit: 100,
      beforeCreatedAt: oldest.createdAt,
    });

    if (!result.error) {
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const olderUnique = result.messages.filter((m) => !existingIds.has(m.id));
        return [...olderUnique, ...prev];
      });
      setHasMore(result.hasMore);

      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - previousScrollHeight;
        }
      });
    }
    setLoadingOlder(false);
  };

  const processSelectedFile = useCallback(async (file) => {
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      setErrorMsg('O arquivo excede o limite máximo de 25 MB.');
      return;
    }

    const requestId = ++compressionReqRef.current;
    setErrorMsg('');
    setAttachmentFile(null);
    setAttachmentMeta(null);
    setCompressingFile(true);

    try {
      const result = await compressFileForUpload(file);
      if (compressionReqRef.current !== requestId) return;

      setAttachmentFile(result.file);
      setAttachmentMeta({
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        savedBytes: result.savedBytes,
        savedPercent: result.savedPercent,
        wasCompressed: result.wasCompressed,
      });
      setCategory((curr) => (curr === 'geral' ? 'documento' : curr));
    } catch (err) {
      if (compressionReqRef.current !== requestId) return;
      console.warn('Erro ao processar anexo, usando arquivo original:', err);
      setAttachmentFile(file);
      setAttachmentMeta({
        originalSize: file.size,
        compressedSize: file.size,
        savedBytes: 0,
        savedPercent: 0,
        wasCompressed: false,
      });
      setCategory((curr) => (curr === 'geral' ? 'documento' : curr));
    } finally {
      if (compressionReqRef.current === requestId) {
        setCompressingFile(false);
      }
    }
  }, []);

  const handleAttachmentSelect = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleRemoveAttachment = () => {
    compressionReqRef.current += 1;
    setCompressingFile(false);
    setAttachmentFile(null);
    setAttachmentMeta(null);
    if (category === 'documento') {
      setCategory('geral');
    }
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current += 1;
    if (event.dataTransfer?.types?.includes('Files')) {
      setIsDraggingOver(true);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);
    if (sending || compressingFile) return;
    const droppedFile = event.dataTransfer?.files?.[0];
    if (droppedFile) {
      processSelectedFile(droppedFile);
    }
  };

  const handleDownloadAttachment = async (url, filename) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Falha ao baixar');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename || 'documento';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSend = async (event) => {
    if (event) event.preventDefault();
    if (sending || compressingFile) return;
    if (!draft.trim() && !attachmentFile) return;
    if (!user?.id) {
      setErrorMsg('Sessão expirada. Faça login novamente para enviar mensagens.');
      return;
    }

    setSending(true);
    setErrorMsg('');

    try {
      const created = await sendCompanyMessage({
        companyId,
        userId: user.id,
        authorName,
        authorRole,
        authorSector,
        category,
        message: draft,
        attachmentFile,
        attachmentOriginalSize: attachmentMeta?.originalSize ?? null,
        attachmentMimeType: attachmentFile?.type || null,
        replyToId: replyingTo?.id || null,
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === created.id)) return prev;
        return [...prev, created];
      });
      markReadNow(created.createdAt);

      setDraft('');
      setAttachmentFile(null);
      setAttachmentMeta(null);
      setReplyingTo(null);
      setCategory('geral');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      requestAnimationFrame(() => scrollToBottom('smooth'));
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      setErrorMsg(err?.message || 'Não foi possível enviar a mensagem. Verifique as permissões no Supabase.');
    } finally {
      setSending(false);
    }
  };

  const handleTextareaKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (event) => {
    setDraft(event.target.value);
    const el = event.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  };

  const startEdit = (msg) => {
    setEditingId(msg.id);
    setEditingText(msg.message);
    setErrorMsg('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const saveEdit = async (messageId) => {
    if (!editingText.trim() || savingEdit) return;
    setSavingEdit(true);
    setErrorMsg('');

    try {
      const updated = await updateCompanyMessage(messageId, editingText);
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      cancelEdit();
    } catch (err) {
      console.error('Erro ao editar mensagem:', err);
      setErrorMsg(err?.message || 'Erro ao editar mensagem.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (msg) => {
    if (!window.confirm('Deseja excluir esta mensagem do chat da empresa?')) return;
    setErrorMsg('');

    try {
      await deleteCompanyMessage(msg.id, msg.attachmentPath);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    } catch (err) {
      console.error('Erro ao excluir mensagem:', err);
      setErrorMsg(err?.message || 'Não foi possível excluir a mensagem.');
    }
  };

  const jumpToMessage = (targetId) => {
    if (!targetId) return;
    const el = document.getElementById(`company-msg-${targetId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedId(targetId);
    setTimeout(() => setHighlightedId((curr) => (curr === targetId ? null : curr)), 1600);
  };

  const messagesById = useMemo(() => {
    const map = new Map();
    messages.forEach((m) => map.set(m.id, m));
    return map;
  }, [messages]);

  const categoryCounts = useMemo(() => {
    const counts = { visita: 0, pendencia: 0, documento: 0 };
    messages.forEach((m) => {
      if (m.category === 'visita') counts.visita += 1;
      if (m.category === 'pendencia') counts.pendencia += 1;
      if (m.category === 'documento' || m.attachmentPath) counts.documento += 1;
    });
    return counts;
  }, [messages]);

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return messages.filter((msg) => {
      if (filterCategory === 'documento') {
        if (msg.category !== 'documento' && !msg.attachmentPath) return false;
      } else if (filterCategory !== 'all' && msg.category !== filterCategory) {
        return false;
      }
      if (!q) return true;
      return (
        msg.message.toLowerCase().includes(q) ||
        msg.authorName.toLowerCase().includes(q) ||
        (msg.attachmentName || '').toLowerCase().includes(q)
      );
    });
  }, [messages, filterCategory, searchQuery]);

  if (tableMissing) {
    return (
      <div className="card company-chat__setup">
        <div className="company-chat__setup-icon">
          <Database size={26} />
        </div>
        <h3>Configuração pendente no banco de dados</h3>
        <p>
          Para ativar o chat técnico por empresa em tempo real, execute o script SQL{' '}
          <code>supabase/company_chat.sql</code> no SQL Editor do seu projeto Supabase.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setLoading(true);
            fetchInitialMessages();
          }}
        >
          <RefreshCw size={15} /> Verificar novamente
        </button>
      </div>
    );
  }

  return (
    <div
      className={`card company-chat ${isDraggingOver ? 'is-dragging-over' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingOver && (
        <div className="company-chat__drop-overlay" aria-hidden="true">
          <div className="company-chat__drop-box">
            <Upload size={28} />
            <strong>Solte o documento ou imagem aqui</strong>
            <span>O arquivo será comprimido automaticamente antes do envio</span>
          </div>
        </div>
      )}

      {/* Header do Chat */}
      <div className="company-chat__header">
        <div className="company-chat__title-group">
          <div className="company-chat__title-row">
            <MessageSquare size={18} color="var(--primary)" />
            <h2 className="text-h2" style={{ margin: 0 }}>
              Chat Técnico da Empresa
            </h2>
            <span
              className={`company-chat__live-pill ${
                realtimeStatus === 'SUBSCRIBED' ? 'is-live' : ''
              }`}
              title={
                realtimeStatus === 'SUBSCRIBED'
                  ? 'Sincronização em tempo real ativa'
                  : 'Conectando ao canal em tempo real'
              }
            >
              <span className="company-chat__live-dot" />
              {realtimeStatus === 'SUBSCRIBED' ? 'Tempo real' : 'Sincronizando'}
            </span>
          </div>
          <p className="company-chat__subtitle">
            Comunicação da equipe para <strong>{company?.name}</strong> • Técnico: {effTecnico} • Supervisor: {effSupervisor}
          </p>
        </div>

        <div className="company-chat__toolbar">
          <div className="company-chat__filters" role="group" aria-label="Filtrar mensagens">
            <button
              type="button"
              className={`company-chat__filter-btn ${filterCategory === 'all' ? 'is-active' : ''}`}
              onClick={() => setFilterCategory('all')}
            >
              Todas ({messages.length})
            </button>
            <button
              type="button"
              className={`company-chat__filter-btn ${filterCategory === 'visita' ? 'is-active' : ''}`}
              onClick={() => setFilterCategory('visita')}
            >
              Visitas ({categoryCounts.visita})
            </button>
            <button
              type="button"
              className={`company-chat__filter-btn ${filterCategory === 'pendencia' ? 'is-active' : ''}`}
              onClick={() => setFilterCategory('pendencia')}
            >
              Pendências ({categoryCounts.pendencia})
            </button>
            <button
              type="button"
              className={`company-chat__filter-btn ${filterCategory === 'documento' ? 'is-active' : ''}`}
              onClick={() => setFilterCategory('documento')}
            >
              Documentos ({categoryCounts.documento})
            </button>
          </div>

          <div className="company-chat__toolbar-actions">
            <button
              type="button"
              className={`icon-button company-chat__tool-btn ${showSearch ? 'is-active' : ''}`}
              onClick={() => {
                setShowSearch((prev) => !prev);
                if (showSearch) setSearchQuery('');
              }}
              title="Buscar no histórico do chat"
              aria-label="Buscar mensagens"
            >
              <Search size={15} />
            </button>
            <button
              type="button"
              className="icon-button company-chat__tool-btn"
              onClick={() => {
                setLoading(true);
                fetchInitialMessages();
              }}
              title="Atualizar mensagens"
              aria-label="Atualizar mensagens"
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Busca */}
      {showSearch && (
        <div className="company-chat__search-bar">
          <Search size={15} color="var(--text-secondary)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por texto, nome do técnico ou anexo..."
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Limpar busca"
              className="company-chat__search-clear"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Lista de Mensagens */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="company-chat__messages"
      >
        {loading ? (
          <div className="company-chat__state">
            <RefreshCw size={22} className="spin" color="var(--primary)" />
            <span>Carregando histórico do chat...</span>
          </div>
        ) : (
          <>
            {hasMore && filterCategory === 'all' && !searchQuery && (
              <div className="company-chat__load-more">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleLoadOlder}
                  disabled={loadingOlder}
                >
                  <ChevronUp size={14} />
                  {loadingOlder ? 'Carregando...' : 'Carregar mensagens anteriores'}
                </button>
              </div>
            )}

            {filteredMessages.length === 0 ? (
              <div className="company-chat__state">
                <div className="company-chat__empty-icon">
                  <MessageSquare size={26} />
                </div>
                <h3>
                  {messages.length === 0
                    ? 'Nenhuma mensagem registrada nesta empresa'
                    : 'Nenhuma mensagem encontrada para este filtro'}
                </h3>
                <p>
                  {messages.length === 0
                    ? 'Alinhe visitas técnicas, pendências de NR, entregas de documentos ou observações operacionais com a equipe.'
                    : 'Tente limpar a busca ou selecionar "Todas" para visualizar todo o histórico.'}
                </p>
              </div>
            ) : (
              filteredMessages.map((msg, index) => {
                const isOwn = msg.userId === user?.id;
                const prevMsg = index > 0 ? filteredMessages[index - 1] : null;
                const showDateDivider =
                  !prevMsg || formatDayKey(prevMsg.createdAt) !== formatDayKey(msg.createdAt);

                const parentMsg = msg.replyToId ? messagesById.get(msg.replyToId) : null;
                const categoryInfo = CATEGORY_META[msg.category] || CATEGORY_META.geral;
                const CategoryIcon = categoryInfo.icon;
                const attachmentUrl = msg.attachmentPath ? getDocumentUrl(msg.attachmentPath) : null;
                const isImg = isImageFile(msg.attachmentName || msg.attachmentPath || '');
                const avatarColor = getAvatarColor(msg.userId || msg.authorName);

                return (
                  <React.Fragment key={msg.id}>
                    {showDateDivider && (
                      <div className="company-chat__date-divider">
                        <span>{formatDateGroupLabel(msg.createdAt)}</span>
                      </div>
                    )}

                    <div
                      id={`company-msg-${msg.id}`}
                      className={`company-chat__row ${isOwn ? 'is-own' : ''} ${
                        highlightedId === msg.id ? 'is-highlighted' : ''
                      }`}
                    >
                      {!isOwn && (
                        <div
                          className="company-chat__avatar"
                          style={{ backgroundColor: avatarColor }}
                          title={msg.authorName}
                        >
                          {getInitials(msg.authorName)}
                        </div>
                      )}

                      <div className={`company-chat__bubble ${isOwn ? 'is-own' : ''}`}>
                        {/* Cabeçalho da Mensagem */}
                        <div className="company-chat__bubble-head">
                          <div className="company-chat__author-meta">
                            <strong className="company-chat__author-name">
                              {isOwn ? 'Você' : msg.authorName}
                            </strong>
                            {(msg.authorSector || msg.authorRole) && (
                              <span className="company-chat__role-badge">
                                {[msg.authorSector, msg.authorRole].filter(Boolean).join(' • ')}
                              </span>
                            )}
                            {msg.category !== 'geral' && (
                              <span className={`company-chat__tag ${categoryInfo.className}`}>
                                {CategoryIcon && <CategoryIcon size={11} />}
                                {categoryInfo.label}
                              </span>
                            )}
                          </div>
                          <span className="company-chat__time" title={new Date(msg.createdAt).toLocaleString('pt-BR')}>
                            {formatTime(msg.createdAt)}
                            {msg.editedAt && <em className="company-chat__edited"> (editada)</em>}
                          </span>
                        </div>

                        {/* Citação de Resposta */}
                        {msg.replyToId && (
                          <button
                            type="button"
                            className="company-chat__quote"
                            onClick={() => jumpToMessage(msg.replyToId)}
                            title={parentMsg ? 'Ir para mensagem original' : 'Mensagem original indisponível'}
                          >
                            <span className="company-chat__quote-author">
                              {parentMsg ? parentMsg.authorName : 'Mensagem anterior'}
                            </span>
                            <span className="company-chat__quote-text">
                              {parentMsg
                                ? parentMsg.message || parentMsg.attachmentName || 'Anexo'
                                : 'Mensagem removida ou fora do histórico carregado'}
                            </span>
                          </button>
                        )}

                        {/* Corpo da Mensagem ou Edição Inline */}
                        {editingId === msg.id ? (
                          <div className="company-chat__edit-box">
                            <textarea
                              className="modal-input"
                              rows={2}
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              autoFocus
                            />
                            <div className="company-chat__edit-actions">
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={cancelEdit}
                                disabled={savingEdit}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => saveEdit(msg.id)}
                                disabled={savingEdit || !editingText.trim()}
                              >
                                <Check size={13} /> {savingEdit ? 'Salvando...' : 'Salvar'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {msg.message && (
                              <div className="company-chat__text">{msg.message}</div>
                            )}

                            {attachmentUrl && (
                              <div className="company-chat__attachment">
                                {isImg ? (
                                  <a
                                    href={attachmentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="company-chat__image-link"
                                    title="Abrir imagem em nova aba"
                                  >
                                    <img
                                      src={attachmentUrl}
                                      alt={msg.attachmentName || 'Anexo do chat'}
                                      loading="lazy"
                                    />
                                    <span>
                                      <ExternalLink size={12} /> {msg.attachmentName || 'Imagem anexa'}
                                      {msg.attachmentSize ? ` (${formatFileSize(msg.attachmentSize)})` : ''}
                                    </span>
                                  </a>
                                ) : (
                                  <div className="company-chat__doc-card">
                                    <div className="company-chat__doc-badge">
                                      {getFileBadgeLabel(msg.attachmentName || msg.attachmentPath || '')}
                                    </div>
                                    <div className="company-chat__doc-info">
                                      <span className="company-chat__doc-name" title={msg.attachmentName || 'Documento anexo'}>
                                        {msg.attachmentName || 'Documento anexo'}
                                      </span>
                                      <span className="company-chat__doc-meta">
                                        {msg.attachmentSize ? formatFileSize(msg.attachmentSize) : 'Documento'}
                                        {msg.attachmentOriginalSize &&
                                        msg.attachmentSize &&
                                        msg.attachmentOriginalSize > msg.attachmentSize
                                          ? ` (reduzido de ${formatFileSize(msg.attachmentOriginalSize)})`
                                          : ''}
                                      </span>
                                    </div>
                                    <div className="company-chat__doc-actions">
                                      <a
                                        href={attachmentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="company-chat__doc-action"
                                        title="Visualizar documento"
                                      >
                                        <Eye size={13} />
                                        <span>Visualizar</span>
                                      </a>
                                      <button
                                        type="button"
                                        className="company-chat__doc-action is-primary"
                                        onClick={() =>
                                          handleDownloadAttachment(attachmentUrl, msg.attachmentName)
                                        }
                                        title="Baixar documento"
                                      >
                                        <Download size={13} />
                                        <span>Baixar</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}

                        {/* Ações Rápidas */}
                        {editingId !== msg.id && (
                          <div className="company-chat__msg-actions">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingTo(msg);
                                textareaRef.current?.focus();
                              }}
                              title="Responder mensagem"
                              aria-label="Responder mensagem"
                            >
                              <Reply size={13} />
                            </button>
                            {isOwn && (
                              <button
                                type="button"
                                onClick={() => startEdit(msg)}
                                title="Editar mensagem"
                                aria-label="Editar mensagem"
                              >
                                <Edit2 size={13} />
                              </button>
                            )}
                            {(isOwn || isAdmin) && (
                              <button
                                type="button"
                                className="is-danger"
                                onClick={() => handleDelete(msg)}
                                title="Excluir mensagem"
                                aria-label="Excluir mensagem"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Área de Envio */}
      <form className="company-chat__composer" onSubmit={handleSend}>
        {errorMsg && (
          <div className="alert alert--danger company-chat__error" role="alert">
            <span>{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg('')} aria-label="Fechar alerta">
              <X size={14} />
            </button>
          </div>
        )}

        {replyingTo && (
          <div className="company-chat__reply-banner">
            <div className="company-chat__reply-info">
              <Reply size={14} color="var(--primary)" />
              <div>
                <strong>Respondendo a {replyingTo.authorName}</strong>
                <span>{replyingTo.message || replyingTo.attachmentName || 'Anexo'}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              aria-label="Cancelar resposta"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {compressingFile && (
          <div className="company-chat__pending-file is-compressing">
            <Loader2 size={15} className="spin" color="var(--primary)" />
            <span>Comprimindo documento para reduzir o tamanho...</span>
          </div>
        )}

        {!compressingFile && attachmentFile && (
          <div className="company-chat__pending-file">
            <FileText size={15} color="var(--primary)" />
            <span className="company-chat__pending-name">{attachmentFile.name}</span>
            {attachmentMeta && (
              <span className="company-chat__compression-badge">
                {attachmentMeta.wasCompressed
                  ? `${formatFileSize(attachmentMeta.originalSize)} → ${formatFileSize(attachmentMeta.compressedSize)} (-${attachmentMeta.savedPercent}%)`
                  : `Tamanho otimizado: ${formatFileSize(attachmentMeta.compressedSize)}`}
              </span>
            )}
            <button
              type="button"
              onClick={handleRemoveAttachment}
              aria-label="Remover anexo"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="company-chat__composer-top">
          <div className="company-chat__composer-types">
            <span className="company-chat__composer-label">Tipo:</span>
            <div className="company-chat__category-pills">
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`company-chat__cat-pill ${category === opt.id ? `is-active is-${opt.id}` : ''}`}
                  onClick={() => setCategory(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary company-chat__doc-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || compressingFile}
            title="Anexar PDF, Word, Excel, PowerPoint, imagem ou ZIP (com compressão automática)"
          >
            <Paperclip size={14} />
            <span>Anexar Documento</span>
          </button>
        </div>

        <div className="company-chat__input-row">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_ATTACHMENT_TYPES}
            style={{ display: 'none' }}
            onChange={handleAttachmentSelect}
          />
          <button
            type="button"
            className="icon-button company-chat__attach-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || compressingFile}
            title="Anexar documento ou foto (máx. 25 MB, compressão automática)"
            aria-label="Anexar documento"
          >
            <Paperclip size={16} />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={draft}
            onChange={handleTextareaChange}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Escreva uma mensagem ou anexe um documento para os técnicos desta empresa... (Enter envia, Shift+Enter quebra linha)"
            disabled={sending}
            className="company-chat__textarea"
          />

          <button
            type="submit"
            className="btn btn-primary company-chat__send-btn"
            disabled={sending || compressingFile || (!draft.trim() && !attachmentFile)}
          >
            <Send size={15} />
            <span>{sending ? 'Enviando...' : compressingFile ? 'Comprimindo...' : 'Enviar'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanyChat;
