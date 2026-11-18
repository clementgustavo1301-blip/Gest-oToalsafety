import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  AtSign,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { getDocumentUrl } from '../services/storageService';
import { compressFileForUpload, formatFileSize } from '../utils/fileCompressor';
import NotificationBell from './NotificationBell';
import {
  getCompanyMessages,
  getMentionableUsers,
  doesMessageMentionUser,
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

function normalizeForMatch(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function escapeRegExp(str = '') {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isSamePersonName(nameA, nameB) {
  const a = normalizeForMatch(nameA);
  const b = normalizeForMatch(nameB);
  if (!a || !b) return false;
  if (a === b) return true;
  const partsA = a.split(/\s+/).filter(Boolean);
  const partsB = b.split(/\s+/).filter(Boolean);
  if (partsA[0] && partsA[0] === partsB[0]) {
    if (partsA.length === 1 || partsB.length === 1) return true;
    if (partsA[partsA.length - 1] === partsB[partsB.length - 1]) return true;
  }
  return false;
}

function findActiveMentionTrigger(text, cursorPos, users) {
  if (typeof text !== 'string') return null;
  const caret = typeof cursorPos === 'number' ? cursorPos : text.length;
  const beforeCaret = text.slice(0, caret);
  const match = beforeCaret.match(/(?:^|\s)@([^@\n\r]{0,35})$/);
  if (!match) return null;

  const query = match[1];
  const atIndex = beforeCaret.lastIndexOf('@');
  const normQuery = normalizeForMatch(query);

  if (query.includes(' ')) {
    const matchesAnyUser = users.some((u) =>
      normalizeForMatch(u.name).includes(normQuery)
    );
    if (!matchesAnyUser) return null;
  }

  return {
    atIndex,
    endIndex: caret,
    query,
  };
}

const CompanyChat = ({ company, group, onMessagesSync }) => {
  const { user, userProfile, activeLink } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
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

  const [mentionableUsers, setMentionableUsers] = useState([]);
  const [mentionTrigger, setMentionTrigger] = useState(null);
  const [manualMentionOpen, setManualMentionOpen] = useState(false);
  const [mentionHighlightIdx, setMentionHighlightIdx] = useState(0);

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

  useEffect(() => {
    let active = true;
    getMentionableUsers().then((users) => {
      if (active) setMentionableUsers(users);
    });
    return () => {
      active = false;
    };
  }, []);

  const sortedMentionableUsers = useMemo(() => {
    const annotated = mentionableUsers.map((person) => {
      const isTec = effTecnico !== 'Não definido' && isSamePersonName(person.name, effTecnico);
      const isSup = effSupervisor !== 'Não definido' && isSamePersonName(person.name, effSupervisor);
      let companyTag = '';
      if (isTec && isSup) companyTag = 'Técnico / Supervisor';
      else if (isTec) companyTag = 'Técnico da Empresa';
      else if (isSup) companyTag = 'Supervisor';
      return { ...person, companyTag, priority: isTec || isSup ? 0 : 1 };
    });

    return annotated.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
    });
  }, [mentionableUsers, effTecnico, effSupervisor]);

  const mentionSuggestions = useMemo(() => {
    const queryNorm = normalizeForMatch(mentionTrigger?.query || '');
    if (!queryNorm) return sortedMentionableUsers;
    return sortedMentionableUsers.filter(
      (person) =>
        normalizeForMatch(person.name).includes(queryNorm) ||
        normalizeForMatch(person.sector).includes(queryNorm) ||
        normalizeForMatch(person.role).includes(queryNorm)
    );
  }, [sortedMentionableUsers, mentionTrigger]);

  const isMentionMenuOpen = Boolean(mentionTrigger) || manualMentionOpen;

  const selectedMentions = useMemo(() => {
    const normDraft = normalizeForMatch(draft);
    if (!normDraft.includes('@')) return [];
    return sortedMentionableUsers.filter((person) => {
      const normName = normalizeForMatch(person.name);
      if (!normName) return false;
      const regex = new RegExp(`(?:^|\\s)@${escapeRegExp(normName)}(?=$|[\\s.,;:!?()\\]])`, 'i');
      return regex.test(normDraft);
    });
  }, [draft, sortedMentionableUsers]);

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
        companyName: company?.name || '',
        userId: user.id,
        authorName,
        authorRole,
        authorSector,
        category,
        message: draft,
        attachmentFile,
        attachmentOriginalSize: attachmentMeta?.originalSize ?? null,
        attachmentMimeType: attachmentFile?.type || null,
        mentions: selectedMentions,
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
      setMentionTrigger(null);
      setManualMentionOpen(false);
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

  const insertMentionIntoDraft = useCallback(
    (person) => {
      if (!person) return;
      const el = textareaRef.current;
      const mentionText = `@${person.name} `;
      let nextDraft = draft;
      let nextCursorPos = draft.length;

      if (mentionTrigger) {
        const before = draft.slice(0, mentionTrigger.atIndex);
        const after = draft.slice(mentionTrigger.endIndex).replace(/^\s+/, '');
        nextDraft = `${before}${mentionText}${after}`;
        nextCursorPos = before.length + mentionText.length;
      } else {
        const caret = el && typeof el.selectionStart === 'number' ? el.selectionStart : draft.length;
        const before = draft.slice(0, caret);
        const after = draft.slice(caret);
        const needsLeadingSpace = before.length > 0 && !/\s$/.test(before);
        const prefix = needsLeadingSpace ? ' ' : '';
        nextDraft = `${before}${prefix}${mentionText}${after}`;
        nextCursorPos = before.length + prefix.length + mentionText.length;
      }

      setDraft(nextDraft);
      setMentionTrigger(null);
      setManualMentionOpen(false);
      setMentionHighlightIdx(0);

      requestAnimationFrame(() => {
        if (!el) return;
        el.focus();
        el.setSelectionRange(nextCursorPos, nextCursorPos);
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
      });
    },
    [draft, mentionTrigger]
  );

  const removeMentionFromDraft = useCallback(
    (person) => {
      if (!person?.name) return;
      const regex = new RegExp(`(^|\\s)@${escapeRegExp(person.name)}\\s?`, 'gi');
      const cleaned = draft.replace(regex, '$1').replace(/\s{2,}/g, ' ').trimStart();
      setDraft(cleaned);
    },
    [draft]
  );

  const handleToggleMentionPicker = () => {
    if (isMentionMenuOpen) {
      setManualMentionOpen(false);
      setMentionTrigger(null);
      return;
    }
    setMentionHighlightIdx(0);
    setManualMentionOpen(true);
    textareaRef.current?.focus();
  };

  const handleTextareaKeyDown = (event) => {
    if (isMentionMenuOpen && mentionSuggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setMentionHighlightIdx((prev) => (prev + 1) % mentionSuggestions.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setMentionHighlightIdx(
          (prev) => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length
        );
        return;
      }
      if ((event.key === 'Enter' || event.key === 'Tab') && !event.shiftKey) {
        event.preventDefault();
        const chosen = mentionSuggestions[mentionHighlightIdx] || mentionSuggestions[0];
        insertMentionIntoDraft(chosen);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setMentionTrigger(null);
        setManualMentionOpen(false);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (event) => {
    const val = event.target.value;
    const cursorPos = event.target.selectionStart;
    setDraft(val);

    const trigger = findActiveMentionTrigger(val, cursorPos, sortedMentionableUsers);
    setMentionTrigger(trigger);
    if (trigger) {
      setManualMentionOpen(false);
      setMentionHighlightIdx(0);
    }

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

  const jumpToMessage = useCallback((targetId) => {
    if (!targetId) return;
    const el = document.getElementById(`company-msg-${targetId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedId(targetId);
    setTimeout(() => setHighlightedId((curr) => (curr === targetId ? null : curr)), 2000);
  }, []);

  const targetMsgParam = searchParams.get('msg');
  useEffect(() => {
    if (loading || !targetMsgParam) return undefined;
    const exists = messages.some((m) => m.id === targetMsgParam);
    if (!exists) return undefined;

    const timer = setTimeout(() => {
      jumpToMessage(targetMsgParam);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('msg');
      setSearchParams(nextParams, { replace: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [loading, targetMsgParam, messages, jumpToMessage, searchParams, setSearchParams]);

  const renderMessageWithMentions = useCallback(
    (msg) => {
      const text = msg?.message || '';
      if (!text) return null;

      const knownPeople = [];
      const seenNames = new Set();
      [...(msg.mentions || []), ...mentionableUsers].forEach((p) => {
        if (!p?.name) return;
        const norm = normalizeForMatch(p.name);
        if (!norm || seenNames.has(norm)) return;
        seenNames.add(norm);
        knownPeople.push(p);
      });

      if (knownPeople.length === 0) return text;

      knownPeople.sort((a, b) => b.name.length - a.name.length);
      const pattern = knownPeople.map((p) => `@${escapeRegExp(p.name)}`).join('|');
      const regex = new RegExp(`(${pattern})(?=$|[\\s.,;:!?()\\]])`, 'gi');
      const parts = text.split(regex);

      return parts.map((part, idx) => {
        if (!part.startsWith('@')) {
          return <React.Fragment key={idx}>{part}</React.Fragment>;
        }
        const rawMention = part.slice(1);
        const normMention = normalizeForMatch(rawMention);
        const matched = knownPeople.find((p) => normalizeForMatch(p.name) === normMention);
        if (!matched) {
          return <React.Fragment key={idx}>{part}</React.Fragment>;
        }
        const isCurrentUser =
          matched.id === currentUserId ||
          (authorName && normalizeForMatch(authorName) === normMention);

        return (
          <span
            key={idx}
            className={`company-chat__mention-pill ${isCurrentUser ? 'is-me' : ''}`}
            title={
              isCurrentUser
                ? 'Você foi marcado nesta mensagem'
                : `${matched.name}${matched.sector ? ` (${matched.sector})` : ''}`
            }
          >
            @{matched.name}
          </span>
        );
      });
    },
    [mentionableUsers, currentUserId, authorName]
  );

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
            <NotificationBell variant="compact" />
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
                const mentionsCurrentUser =
                  !isOwn && doesMessageMentionUser(msg, currentUserId, authorName);

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

                      <div
                        className={`company-chat__bubble ${isOwn ? 'is-own' : ''} ${
                          mentionsCurrentUser ? 'is-mentioning-me' : ''
                        }`}
                      >
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
                            {mentionsCurrentUser && (
                              <span className="company-chat__tag company-chat__tag--mention">
                                <AtSign size={10} />
                                Mencionou você
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
                              <div className="company-chat__text">
                                {renderMessageWithMentions(msg)}
                              </div>
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

        {selectedMentions.length > 0 && (
          <div className="company-chat__pending-mentions">
            <span className="company-chat__pending-mentions-label">
              <AtSign size={12} /> Notificará:
            </span>
            {selectedMentions.map((person) => (
              <span key={person.id} className="company-chat__mention-chip">
                <span>@{person.name}</span>
                <button
                  type="button"
                  onClick={() => removeMentionFromDraft(person)}
                  aria-label={`Remover marcação de ${person.name}`}
                  title={`Remover marcação de ${person.name}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {isMentionMenuOpen && (
          <div className="company-chat__mention-menu" role="listbox" aria-label="Marcar pessoa na mensagem">
            <div className="company-chat__mention-menu-head">
              <span>
                <AtSign size={13} /> Marcar pessoa para notificar
              </span>
              <button
                type="button"
                onClick={() => {
                  setMentionTrigger(null);
                  setManualMentionOpen(false);
                }}
                aria-label="Fechar lista de pessoas"
              >
                <X size={13} />
              </button>
            </div>
            <div className="company-chat__mention-list">
              {mentionSuggestions.length === 0 ? (
                <div className="company-chat__mention-empty">
                  Nenhuma pessoa encontrada para "{mentionTrigger?.query || ''}"
                </div>
              ) : (
                mentionSuggestions.map((person, idx) => {
                  const isHighlighted = idx === mentionHighlightIdx;
                  const subtitle = [person.sector, person.role].filter(Boolean).join(' • ');
                  return (
                    <button
                      key={person.id}
                      type="button"
                      className={`company-chat__mention-item ${
                        isHighlighted ? 'is-highlighted' : ''
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertMentionIntoDraft(person);
                      }}
                    >
                      <span
                        className="company-chat__mention-avatar"
                        style={{ backgroundColor: getAvatarColor(person.id || person.name) }}
                      >
                        {getInitials(person.name)}
                      </span>
                      <span className="company-chat__mention-copy">
                        <strong>{person.name}</strong>
                        {subtitle && <small>{subtitle}</small>}
                      </span>
                      {person.companyTag && (
                        <span className="company-chat__mention-tag">{person.companyTag}</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
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

          <div className="company-chat__composer-actions">
            <button
              type="button"
              className={`btn btn-secondary company-chat__mention-btn ${
                isMentionMenuOpen ? 'is-active' : ''
              }`}
              onClick={handleToggleMentionPicker}
              disabled={sending}
              title="Marcar uma pessoa (@Nome) para enviar notificação"
            >
              <AtSign size={14} />
              <span>Marcar pessoa</span>
            </button>
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
            placeholder="Escreva uma mensagem, use @ para marcar alguém ou anexe um documento... (Enter envia)"
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
