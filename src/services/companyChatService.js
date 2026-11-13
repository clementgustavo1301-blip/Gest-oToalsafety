import { supabase } from '../lib/supabase';
import { uploadDocument } from './storageService';

const LAST_READ_PREFIX = 'ecoclinic_company_chat_read';

export function isChatTableMissingError(error) {
  if (!error) return false;
  const code = String(error.code || '').toUpperCase();
  const message = String(error.message || '').toLowerCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    message.includes('company_messages') && (message.includes('does not exist') || message.includes('schema cache'))
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
    replyToId: row.reply_to_id || null,
    editedAt: row.edited_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

export async function sendCompanyMessage({
  companyId,
  userId,
  authorName,
  authorRole = '',
  authorSector = '',
  category = 'geral',
  message = '',
  attachmentFile = null,
  replyToId = null,
}) {
  const trimmedMessage = (message || '').trim();
  if (!trimmedMessage && !attachmentFile) {
    throw new Error('Digite uma mensagem ou anexe um arquivo antes de enviar.');
  }

  let attachmentPath = null;
  let attachmentName = null;

  if (attachmentFile) {
    attachmentPath = await uploadDocument(attachmentFile, `company-chat/${companyId}`);
    if (!attachmentPath) {
      throw new Error('Não foi possível enviar o arquivo anexo. Verifique sua conexão e tente novamente.');
    }
    attachmentName = attachmentFile.name;
  }

  const payload = {
    company_id: companyId,
    user_id: userId,
    author_name: (authorName || 'Técnico').trim(),
    author_role: authorRole || null,
    author_sector: authorSector || null,
    category: ['geral', 'visita', 'pendencia'].includes(category) ? category : 'geral',
    message: trimmedMessage,
    attachment_path: attachmentPath,
    attachment_name: attachmentName,
    reply_to_id: replyToId || null,
  };

  const { data, error } = await supabase
    .from('company_messages')
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapCompanyMessage(data);
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

export async function deleteCompanyMessage(messageId) {
  const { error } = await supabase
    .from('company_messages')
    .delete()
    .eq('id', messageId);

  if (error) {
    throw error;
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
