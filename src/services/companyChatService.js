import { supabase } from '../lib/supabase';
import { uploadDocument, deleteDocumentFromStorage } from './storageService';
import { compressFileForUpload } from '../utils/fileCompressor';

const LAST_READ_PREFIX = 'ecoclinic_company_chat_read';
const LOCAL_READ_NOTIF_PREFIX = 'ecoclinic_read_notifications';

function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function escapeRegExp(str = '') {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isChatTableMissingError(error) {
  if (!error) return false;
  const code = String(error.code || '').toUpperCase();
  const message = String(error.message || '').toLowerCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    (message.includes('company_messages') &&
      (message.includes('does not exist') || message.includes('schema cache')))
  );
}

export function isNotificationsTableMissingError(error) {
  if (!error) return false;
  const code = String(error.code || '').toUpperCase();
  const message = String(error.message || '').toLowerCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    (message.includes('user_notifications') &&
      (message.includes('does not exist') || message.includes('schema cache')))
  );
}

export function mapCompanyMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    userId: row.user_id,
    authorName: row.author_name || 'Técnico',
    authorRole: row.author_role || '',
    authorSector: row.author_sector || '',
    category: row.category || 'geral',
    message: row.message || '',
    attachmentPath: row.attachment_path || null,
    attachmentName: row.attachment_name || null,
    attachmentSize: row.attachment_size || null,
    attachmentOriginalSize: row.attachment_original_size || null,
    attachmentMimeType: row.attachment_mime_type || null,
    mentionedUserIds: Array.isArray(row.mentioned_user_ids) ? row.mentioned_user_ids : [],
    mentions: Array.isArray(row.mentions) ? row.mentions : [],
    replyToId: row.reply_to_id || null,
    editedAt: row.edited_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapUserNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    recipientUserId: row.recipient_user_id,
    senderUserId: row.sender_user_id,
    senderName: row.sender_name || 'Técnico',
    companyId: row.company_id,
    companyName: row.company_name || 'Empresa',
    messageId: row.message_id,
    type: row.type || 'mention',
    title: row.title || 'Você foi marcado no chat',
    body: row.body || '',
    readAt: row.read_at || null,
    createdAt: row.created_at,
  };
}

export async function getMentionableUsers() {
  const [profilesRes, linksRes] = await Promise.all([
    supabase.from('profiles').select('id, name, role, sector').order('name', { ascending: true }),
    supabase.from('user_links').select('user_id, sector, role, status').eq('status', 'approved'),
  ]);

  let profiles = profilesRes.data || [];
  if (profilesRes.error) {
    const fallbackProfilesRes = await supabase
      .from('profiles')
      .select('id, name, role')
      .order('name', { ascending: true });
    profiles = fallbackProfilesRes.data || [];
  }

  const linksByUserId = new Map();
  if (!linksRes.error && Array.isArray(linksRes.data)) {
    linksRes.data.forEach((link) => {
      if (!link?.user_id) return;
      const existing = linksByUserId.get(link.user_id) || [];
      existing.push(link);
      linksByUserId.set(link.user_id, existing);
    });
  }

  const usersMap = new Map();
  profiles.forEach((profile) => {
    const cleanName = String(profile?.name || '').trim();
    if (!profile?.id || !cleanName) return;

    const userLinks = linksByUserId.get(profile.id) || [];
    const sectors = Array.from(
      new Set(userLinks.map((l) => l.sector).filter(Boolean))
    );
    const roles = Array.from(
      new Set(userLinks.map((l) => l.role).filter(Boolean))
    );

    usersMap.set(profile.id, {
      id: profile.id,
      name: cleanName,
      sector: sectors.join(' / ') || profile.sector || '',
      role: roles.join(' / ') || profile.role || '',
    });
  });

  return Array.from(usersMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
  );
}

export async function getCompanyMessages(companyId, { limit = 100, beforeCreatedAt = null } = {}) {
  if (!companyId) {
    return { messages: [], hasMore: false, tableMissing: false, error: null };
  }

  let query = supabase
    .from('company_messages')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (beforeCreatedAt) {
    query = query.lt('created_at', beforeCreatedAt);
  }

  const { data, error } = await query;

  if (error) {
    const tableMissing = isChatTableMissingError(error);
    if (!tableMissing) {
      console.error('Erro ao buscar mensagens do chat da empresa:', error);
    }
    return { messages: [], hasMore: false, tableMissing, error };
  }

  const rows = data || [];
  const hasMore = rows.length > limit;
  const sliced = hasMore ? rows.slice(0, limit) : rows;
  const ordered = sliced.reverse().map(mapCompanyMessage).filter(Boolean);

  return { messages: ordered, hasMore, tableMissing: false, error: null };
}

export async function getCompanyChatSummary(companyId, userId = null) {
  if (!companyId) {
    return { totalCount: 0, unreadCount: 0, latestAt: null, tableMissing: false };
  }

  const lastReadAt = userId ? getLastReadAt(userId, companyId) : null;

  const totalRes = await supabase
    .from('company_messages')
    .select('id, created_at', { count: 'exact' })
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (totalRes.error) {
    const tableMissing = isChatTableMissingError(totalRes.error);
    if (!tableMissing) {
      console.error('Erro ao buscar resumo do chat da empresa:', totalRes.error);
    }
    return { totalCount: 0, unreadCount: 0, latestAt: null, tableMissing };
  }

  const totalCount = totalRes.count || 0;
  const latestAt = totalRes.data?.[0]?.created_at || null;

  let unreadCount = 0;
  if (totalCount > 0 && lastReadAt) {
    let unreadQuery = supabase
      .from('company_messages')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gt('created_at', lastReadAt);

    if (userId) {
      unreadQuery = unreadQuery.neq('user_id', userId);
    }

    const unreadRes = await unreadQuery;
    if (!unreadRes.error) {
      unreadCount = unreadRes.count || 0;
    }
  } else if (totalCount > 0 && !lastReadAt) {
    if (userId) {
      const unreadRes = await supabase
        .from('company_messages')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .neq('user_id', userId);
      unreadCount = unreadRes.error ? 0 : (unreadRes.count || 0);
    } else {
      unreadCount = totalCount;
    }
  }

  return { totalCount, unreadCount, latestAt, tableMissing: false };
}

const VALID_CHAT_CATEGORIES = ['geral', 'visita', 'pendencia', 'documento'];

function shouldFallbackLegacyInsert(error) {
  if (!error) return false;
  const code = String(error.code || '').toUpperCase();
  const msg = String(error.message || '').toLowerCase();
  return (
    code === 'PGRST204' ||
    code === '42703' ||
    code === '23514' ||
    msg.includes('column') ||
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('category_check') ||
    msg.includes('check constraint')
  );
}

async function createMentionNotifications({
  messageRow,
  companyId,
  companyName = '',
  senderId,
  senderName,
  mentions = [],
}) {
  if (!messageRow?.id || !Array.isArray(mentions) || mentions.length === 0) return;

  const uniqueRecipients = [];
  const seen = new Set();
  mentions.forEach((m) => {
    if (!m?.id || seen.has(m.id)) return;
    seen.add(m.id);
    uniqueRecipients.push(m);
  });

  if (uniqueRecipients.length === 0) return;

  let resolvedCompanyName = (companyName || '').trim();
  if (!resolvedCompanyName && companyId) {
    const { data: comp } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .maybeSingle();
    resolvedCompanyName = comp?.name || 'Empresa';
  }

  const rawBody =
    (messageRow.message || '').trim() ||
    (messageRow.attachmentName ? `Anexo: ${messageRow.attachmentName}` : 'Nova menção no chat');
  const body = rawBody.length > 220 ? `${rawBody.slice(0, 217)}...` : rawBody;
  const title = `${senderName || 'Técnico'} marcou você em ${resolvedCompanyName || 'uma empresa'}`;

  const rows = uniqueRecipients.map((recipient) => ({
    recipient_user_id: recipient.id,
    sender_user_id: senderId,
    sender_name: (senderName || 'Técnico').trim(),
    company_id: companyId,
    company_name: resolvedCompanyName || 'Empresa',
    message_id: messageRow.id,
    type: 'mention',
    title,
    body,
  }));

  try {
    const { error } = await supabase.from('user_notifications').insert(rows);
    if (error && !isNotificationsTableMissingError(error)) {
      console.warn('Não foi possível registrar notificação de menção:', error.message);
    }
  } catch (err) {
    console.warn('Falha ao enviar notificações de menção:', err);
  }
}

export async function sendCompanyMessage({
  companyId,
  companyName = '',
  userId,
  authorName,
  authorRole = '',
  authorSector = '',
  category = 'geral',
  message = '',
  attachmentFile = null,
  attachmentOriginalSize = null,
  attachmentMimeType = null,
  mentions = [],
  replyToId = null,
}) {
  const trimmedMessage = (message || '').trim();
  if (!trimmedMessage && !attachmentFile) {
    throw new Error('Digite uma mensagem ou anexe um arquivo antes de enviar.');
  }

  let attachmentPath = null;
  let attachmentName = null;
  let attachmentSize = null;
  let finalOriginalSize = attachmentOriginalSize;
  let finalMimeType = attachmentMimeType;

  if (attachmentFile) {
    let fileToUpload = attachmentFile;
    if (finalOriginalSize === null) {
      const compressed = await compressFileForUpload(attachmentFile);
      fileToUpload = compressed.file || attachmentFile;
      finalOriginalSize = compressed.originalSize;
    }

    attachmentPath = await uploadDocument(fileToUpload, `company-chat/${companyId}`, {
      skipCompression: true,
    });
    if (!attachmentPath) {
      throw new Error('Não foi possível enviar o arquivo anexo. Verifique sua conexão e as permissões do Storage.');
    }
    attachmentName = fileToUpload.name;
    attachmentSize = fileToUpload.size;
    finalMimeType = finalMimeType || fileToUpload.type || null;
  }

  const normalizedCategory = VALID_CHAT_CATEGORIES.includes(category) ? category : 'geral';

  const uniqueMentions = [];
  const seenMentionIds = new Set();
  (Array.isArray(mentions) ? mentions : []).forEach((item) => {
    if (!item?.id || seenMentionIds.has(item.id)) return;
    seenMentionIds.add(item.id);
    uniqueMentions.push({
      id: item.id,
      name: item.name || 'Técnico',
      role: item.role || '',
      sector: item.sector || '',
    });
  });
  const mentionedUserIds = uniqueMentions.map((m) => m.id);

  const basePayload = {
    company_id: companyId,
    user_id: userId,
    author_name: (authorName || 'Técnico').trim(),
    author_role: authorRole || null,
    author_sector: authorSector || null,
    category: normalizedCategory === 'documento' ? 'geral' : normalizedCategory,
    message: trimmedMessage,
    attachment_path: attachmentPath,
    attachment_name: attachmentName,
    reply_to_id: replyToId || null,
  };

  const extendedPayload = {
    ...basePayload,
    category: normalizedCategory,
    attachment_size: attachmentSize,
    attachment_original_size: finalOriginalSize,
    attachment_mime_type: finalMimeType,
    mentioned_user_ids: mentionedUserIds,
    mentions: uniqueMentions,
  };

  let res = await supabase
    .from('company_messages')
    .insert([extendedPayload])
    .select()
    .single();

  if (res.error && shouldFallbackLegacyInsert(res.error)) {
    res = await supabase
      .from('company_messages')
      .insert([basePayload])
      .select()
      .single();
  }

  if (res.error) {
    throw res.error;
  }

  const mappedMessage = mapCompanyMessage(res.data);

  if (uniqueMentions.length > 0) {
    await createMentionNotifications({
      messageRow: mappedMessage,
      companyId,
      companyName,
      senderId: userId,
      senderName: authorName,
      mentions: uniqueMentions,
    });
  }

  return mappedMessage;
}

export async function updateCompanyMessage(messageId, newMessage) {
  const trimmed = (newMessage || '').trim();
  if (!trimmed) {
    throw new Error('A mensagem não pode ficar vazia.');
  }

  const { data, error } = await supabase
    .from('company_messages')
    .update({
      message: trimmed,
      edited_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapCompanyMessage(data);
}

export async function deleteCompanyMessage(messageId, attachmentPath = null) {
  const { error } = await supabase
    .from('company_messages')
    .delete()
    .eq('id', messageId);

  if (error) {
    throw error;
  }

  if (attachmentPath) {
    await deleteDocumentFromStorage(attachmentPath);
  }

  return true;
}

export function subscribeToCompanyMessages(companyId, { onInsert, onUpdate, onDelete, onStatus } = {}) {
  if (!companyId) return () => {};

  const channel = supabase
    .channel(`company-chat:${companyId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'company_messages',
        filter: `company_id=eq.${companyId}`,
      },
      (payload) => {
        if (payload?.new && onInsert) {
          onInsert(mapCompanyMessage(payload.new));
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'company_messages',
        filter: `company_id=eq.${companyId}`,
      },
      (payload) => {
        if (payload?.new && onUpdate) {
          onUpdate(mapCompanyMessage(payload.new));
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'company_messages',
      },
      (payload) => {
        if (payload?.old?.id && onDelete) {
          onDelete(payload.old.id);
        }
      }
    )
    .subscribe((status) => {
      if (onStatus) onStatus(status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

export function getLastReadAt(userId, companyId) {
  if (!userId || !companyId) return null;
  try {
    return localStorage.getItem(`${LAST_READ_PREFIX}_${userId}_${companyId}`);
  } catch {
    return null;
  }
}

export function markCompanyChatAsRead(userId, companyId, timestampIso = new Date().toISOString()) {
  if (!userId || !companyId) return;
  try {
    localStorage.setItem(`${LAST_READ_PREFIX}_${userId}_${companyId}`, timestampIso);
  } catch {
    // Storage indisponível
  }
}

// --- Notificações de Menções (@pessoa) ---

function getLocalReadNotificationIds(userId) {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(`${LOCAL_READ_NOTIF_PREFIX}_${userId}`);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function addLocalReadNotificationIds(userId, ids = []) {
  if (!userId || ids.length === 0) return;
  try {
    const current = getLocalReadNotificationIds(userId);
    ids.forEach((id) => {
      if (id) current.add(String(id));
    });
    const trimmed = Array.from(current).slice(-200);
    localStorage.setItem(`${LOCAL_READ_NOTIF_PREFIX}_${userId}`, JSON.stringify(trimmed));
  } catch {
    // Storage indisponível
  }
}

export function doesMessageMentionUser(msg, userId, userName = '') {
  if (!msg || !userId) return false;
  if (Array.isArray(msg.mentionedUserIds) && msg.mentionedUserIds.includes(userId)) {
    return true;
  }
  if (Array.isArray(msg.mentions) && msg.mentions.some((m) => m?.id === userId)) {
    return true;
  }
  const cleanName = normalizeText(userName);
  if (!cleanName) return false;
  const text = normalizeText(msg.message || '');
  if (!text) return false;
  const regex = new RegExp(`@${escapeRegExp(cleanName)}(?=$|[\\s.,;:!?()\\]])`, 'i');
  return regex.test(text);
}

function buildFallbackNotificationFromMessage(row, userId, companyName, isRead) {
  const author = row.author_name || 'Técnico';
  const resolvedCompany = companyName || row.companies?.name || 'Empresa';
  const rawBody =
    (row.message || '').trim() ||
    (row.attachment_name ? `Anexo: ${row.attachment_name}` : 'Nova menção no chat');
  return {
    id: `msg-${row.id}`,
    recipientUserId: userId,
    senderUserId: row.user_id,
    senderName: author,
    companyId: row.company_id,
    companyName: resolvedCompany,
    messageId: row.id,
    type: 'mention',
    title: `${author} marcou você em ${resolvedCompany}`,
    body: rawBody.length > 220 ? `${rawBody.slice(0, 217)}...` : rawBody,
    readAt: isRead ? row.created_at : null,
    createdAt: row.created_at,
    isFallback: true,
  };
}

export async function getUserNotifications(userId, userName = '') {
  if (!userId) return { notifications: [], tableMissing: false };

  const { data, error } = await supabase
    .from('user_notifications')
    .select('*')
    .eq('recipient_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(40);

  if (!error) {
    return {
      notifications: (data || []).map(mapUserNotification).filter(Boolean),
      tableMissing: false,
    };
  }

  if (!isNotificationsTableMissingError(error)) {
    console.error('Erro ao buscar notificações do usuário:', error);
    return { notifications: [], tableMissing: false };
  }

  // Fallback caso a tabela user_notifications ainda não tenha sido criada no Supabase
  let msgRes = await supabase
    .from('company_messages')
    .select('id, company_id, user_id, author_name, message, attachment_name, mentioned_user_ids, mentions, created_at, companies(name)')
    .order('created_at', { ascending: false })
    .limit(80);

  if (msgRes.error) {
    msgRes = await supabase
      .from('company_messages')
      .select('id, company_id, user_id, author_name, message, attachment_name, created_at, companies(name)')
      .order('created_at', { ascending: false })
      .limit(80);
  }

  if (msgRes.error) {
    return { notifications: [], tableMissing: true };
  }

  const readIds = getLocalReadNotificationIds(userId);
  const notifications = (msgRes.data || [])
    .filter((row) =>
      doesMessageMentionUser(
        {
          mentionedUserIds: row.mentioned_user_ids,
          mentions: row.mentions,
          message: row.message,
        },
        userId,
        userName
      )
    )
    .slice(0, 40)
    .map((row) =>
      buildFallbackNotificationFromMessage(
        row,
        userId,
        row.companies?.name,
        readIds.has(`msg-${row.id}`) || readIds.has(String(row.id))
      )
    );

  return { notifications, tableMissing: true };
}

export async function markNotificationAsRead(notificationId, userId = null, messageId = null) {
  if (!notificationId) return false;
  if (userId) {
    addLocalReadNotificationIds(userId, [notificationId, messageId]);
  }
  if (String(notificationId).startsWith('msg-')) {
    return true;
  }

  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error && !isNotificationsTableMissingError(error)) {
    console.warn('Erro ao marcar notificação como lida:', error.message);
    return false;
  }
  return true;
}

export async function markAllNotificationsAsRead(userId, currentNotifications = []) {
  if (!userId) return false;
  const fallbackIds = currentNotifications.flatMap((n) => [n.id, n.messageId]);
  addLocalReadNotificationIds(userId, fallbackIds);

  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_user_id', userId)
    .is('read_at', null);

  if (error && !isNotificationsTableMissingError(error)) {
    console.warn('Erro ao marcar todas as notificações como lidas:', error.message);
    return false;
  }
  return true;
}

export async function deleteUserNotification(notificationId) {
  if (!notificationId || String(notificationId).startsWith('msg-')) return true;
  const { error } = await supabase
    .from('user_notifications')
    .delete()
    .eq('id', notificationId);

  if (error && !isNotificationsTableMissingError(error)) {
    console.warn('Erro ao excluir notificação:', error.message);
    return false;
  }
  return true;
}

export function subscribeToUserNotifications(userId, userName = '', { onNotification } = {}) {
  if (!userId || !onNotification) return () => {};

  const seenMessageIds = new Set();
  const pendingTimers = new Set();

  const channel = supabase
    .channel(`user-notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_notifications',
        filter: `recipient_user_id=eq.${userId}`,
      },
      (payload) => {
        if (!payload?.new) return;
        const notif = mapUserNotification(payload.new);
        if (!notif) return;
        if (notif.messageId) {
          if (seenMessageIds.has(notif.messageId)) return;
          seenMessageIds.add(notif.messageId);
        }
        onNotification(notif);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'company_messages',
      },
      (payload) => {
        const row = payload?.new;
        if (!row) return;
        const mappedMsg = mapCompanyMessage(row);
        if (!doesMessageMentionUser(mappedMsg, userId, userName)) return;

        // Aguarda brevemente o evento da tabela user_notifications para evitar duplicidade
        const timerId = setTimeout(async () => {
          pendingTimers.delete(timerId);
          if (seenMessageIds.has(row.id)) return;
          seenMessageIds.add(row.id);

          let companyName = 'Empresa';
          if (row.company_id) {
            const { data: comp } = await supabase
              .from('companies')
              .select('name')
              .eq('id', row.company_id)
              .maybeSingle();
            if (comp?.name) companyName = comp.name;
          }

          onNotification(buildFallbackNotificationFromMessage(row, userId, companyName, false));
        }, 400);

        pendingTimers.add(timerId);
      }
    )
    .subscribe();

  return () => {
    pendingTimers.forEach((id) => clearTimeout(id));
    pendingTimers.clear();
    supabase.removeChannel(channel);
  };
}
