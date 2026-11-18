import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  MessageSquare,
  X,
  AtSign,
  Trash2,
  BellRing,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteUserNotification,
  subscribeToUserNotifications,
} from '../services/companyChatService';

// Store compartilhado entre todas as instâncias de NotificationBell (Sidebar, MobileTopBar, CompanyChat)
const sharedStore = {
  userId: null,
  notifications: [],
  loaded: false,
  listeners: new Set(),
  toastListeners: new Set(),
  unsubscribeRealtime: null,
};

function emitStoreChange() {
  sharedStore.listeners.forEach((cb) => cb(sharedStore.notifications));
}

function emitToast(notif) {
  sharedStore.toastListeners.forEach((cb) => cb(notif));
}

function setStoreNotifications(updater) {
  sharedStore.notifications =
    typeof updater === 'function' ? updater(sharedStore.notifications) : updater;
  emitStoreChange();
}

function showBrowserNotification(notif) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (window.Notification.permission !== 'granted') return;
  try {
    const nativeNotif = new window.Notification(notif.title || 'Nova menção no chat', {
      body: notif.body || 'Você foi marcado em uma mensagem.',
      icon: '/logo-ecosafety.png',
      tag: `mention-${notif.messageId || notif.id}`,
    });
    nativeNotif.onclick = () => {
      window.focus();
      nativeNotif.close();
    };
  } catch {
    // Algumas plataformas restringem Notification() fora de ServiceWorker
  }
}

async function ensureStoreInitialized(userId, userName) {
  if (!userId) {
    if (sharedStore.unsubscribeRealtime) {
      sharedStore.unsubscribeRealtime();
      sharedStore.unsubscribeRealtime = null;
    }
    sharedStore.userId = null;
    sharedStore.notifications = [];
    sharedStore.loaded = false;
    emitStoreChange();
    return;
  }

  if (sharedStore.userId === userId && sharedStore.loaded) return;

  if (sharedStore.unsubscribeRealtime) {
    sharedStore.unsubscribeRealtime();
    sharedStore.unsubscribeRealtime = null;
  }

  sharedStore.userId = userId;
  sharedStore.loaded = true;

  const { notifications } = await getUserNotifications(userId, userName);
  if (sharedStore.userId !== userId) return;

  sharedStore.notifications = notifications;
  emitStoreChange();

  sharedStore.unsubscribeRealtime = subscribeToUserNotifications(userId, userName, {
    onNotification: (incoming) => {
      if (!incoming) return;
      const alreadyExists = sharedStore.notifications.some(
        (n) =>
          n.id === incoming.id ||
          (incoming.messageId && n.messageId === incoming.messageId)
      );
      if (alreadyExists) return;

      sharedStore.notifications = [incoming, ...sharedStore.notifications].slice(0, 50);
      emitStoreChange();
      emitToast(incoming);
      showBrowserNotification(incoming);
    },
  });
}

function formatRelativeTime(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  } catch {
    return date.toLocaleString('pt-BR');
  }
}

const NotificationBell = ({ variant = 'sidebar', enableToast = false }) => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id || null;
  const userName =
    userProfile?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    '';

  const [notifications, setNotifications] = useState(sharedStore.notifications);
  const [open, setOpen] = useState(false);
  const [activeToast, setActiveToast] = useState(null);
  const [popoverCoords, setPopoverCoords] = useState(null);
  const [browserPermission, setBrowserPermission] = useState(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? window.Notification.permission
      : 'unsupported'
  );

  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    const sync = (nextList) => setNotifications([...nextList]);
    sharedStore.listeners.add(sync);
    ensureStoreInitialized(userId, userName);

    return () => {
      sharedStore.listeners.delete(sync);
    };
  }, [userId, userName]);

  useEffect(() => {
    if (!enableToast) return undefined;

    const handleNewToast = (incoming) => {
      setActiveToast(incoming);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setActiveToast(null);
      }, 7500);
    };

    sharedStore.toastListeners.add(handleNewToast);
    return () => {
      sharedStore.toastListeners.delete(handleNewToast);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [enableToast]);

  const updatePopoverPosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const popoverWidth = Math.min(360, window.innerWidth - 24);
    const spaceRight = window.innerWidth - rect.right;

    if (variant === 'sidebar' && window.innerWidth >= 1024 && spaceRight >= popoverWidth + 16) {
      setPopoverCoords({
        top: Math.max(12, Math.min(rect.top, window.innerHeight - 440)),
        left: rect.right + 10,
        width: popoverWidth,
      });
    } else {
      const left = Math.max(
        12,
        Math.min(rect.right - popoverWidth, window.innerWidth - popoverWidth - 12)
      );
      setPopoverCoords({
        top: Math.min(rect.bottom + 8, window.innerHeight - 240),
        left,
        width: popoverWidth,
      });
    }
  }, [variant]);

  useEffect(() => {
    if (!open) return undefined;
    updatePopoverPosition();

    const handleClickOutside = (event) => {
      if (
        !buttonRef.current?.contains(event.target) &&
        !popoverRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const handleResize = () => updatePopoverPosition();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [open, updatePopoverPosition]);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const handleOpenNotification = async (notif) => {
    if (!notif) return;
    const nowIso = new Date().toISOString();
    setStoreNotifications((prev) =>
      prev.map((item) =>
        item.id === notif.id ? { ...item, readAt: item.readAt || nowIso } : item
      )
    );
    await markNotificationAsRead(notif.id, userId, notif.messageId);

    setOpen(false);
    setActiveToast(null);
    if (notif.companyId) {
      const msgParam = notif.messageId ? `&msg=${notif.messageId}` : '';
      navigate(`/company/${notif.companyId}?tab=chat${msgParam}`);
    }
  };

  const handleMarkAllRead = async () => {
    if (!userId || unreadCount === 0) return;
    const nowIso = new Date().toISOString();
    const nextList = sharedStore.notifications.map((item) => ({
      ...item,
      readAt: item.readAt || nowIso,
    }));
    setStoreNotifications(nextList);
    await markAllNotificationsAsRead(userId, nextList);
  };

  const handleDeleteNotification = async (event, notif) => {
    event.stopPropagation();
    setStoreNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    await deleteUserNotification(notif.id);
  };

  const handleEnableBrowserNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const perm = await window.Notification.requestPermission();
      setBrowserPermission(perm);
    } catch {
      // Ignora caso bloqueado
    }
  };

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  if (!userId) return null;

  return (
    <>
      {variant === 'sidebar' && (
        <button
          ref={buttonRef}
          type="button"
          className={`sidebar__item notification-bell__sidebar-btn ${open ? 'is-active' : ''}`}
          onClick={handleToggle}
          title={unreadCount > 0 ? `Notificações (${unreadCount} não lidas)` : 'Notificações'}
          aria-label={`Notificações${unreadCount > 0 ? `, ${unreadCount} não lidas` : ''}`}
        >
          <span className="sidebar__item-icon notification-bell__icon-wrap">
            <Bell size={15} />
            {unreadCount > 0 && <span className="notification-bell__mini-dot" />}
          </span>
          <span className="sidebar__item-label">Notificações</span>
          {unreadCount > 0 && (
            <span className="sidebar__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>
      )}

      {variant === 'topbar' && (
        <button
          ref={buttonRef}
          type="button"
          className="mobile-topbar__notification"
          onClick={handleToggle}
          aria-label={`Notificações${unreadCount > 0 ? `, ${unreadCount} não lidas` : ''}`}
        >
          <Bell size={19} />
          {unreadCount > 0 && (
            <span className="notification-bell__count-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {variant === 'compact' && (
        <button
          ref={buttonRef}
          type="button"
          className={`icon-button company-chat__tool-btn notification-bell__compact-btn ${
            open ? 'is-active' : ''
          }`}
          onClick={handleToggle}
          title={
            unreadCount > 0
              ? `Você tem ${unreadCount} menção(ões) não lida(s)`
              : 'Notificações de menções (@)'
          }
          aria-label={`Notificações${unreadCount > 0 ? `, ${unreadCount} não lidas` : ''}`}
        >
          <Bell size={15} />
          {unreadCount > 0 && (
            <span className="notification-bell__count-badge">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {open && popoverCoords && (
        <div
          ref={popoverRef}
          className="notification-popover"
          style={{
            top: `${popoverCoords.top}px`,
            left: `${popoverCoords.left}px`,
            width: `${popoverCoords.width}px`,
          }}
          role="dialog"
          aria-label="Central de notificações"
        >
          <div className="notification-popover__header">
            <div className="notification-popover__title">
              <AtSign size={15} color="var(--primary)" />
              <strong>Notificações (@Menções)</strong>
              {unreadCount > 0 && (
                <span className="notification-popover__unread-pill">{unreadCount}</span>
              )}
            </div>
            <div className="notification-popover__header-actions">
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="notification-popover__action-btn"
                  onClick={handleMarkAllRead}
                  title="Marcar todas como lidas"
                >
                  <CheckCheck size={14} />
                  <span>Ler todas</span>
                </button>
              )}
              <button
                type="button"
                className="notification-popover__close-btn"
                onClick={() => setOpen(false)}
                aria-label="Fechar notificações"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {browserPermission === 'default' && (
            <div className="notification-popover__permission">
              <span>Ativar alertas de menção no navegador?</span>
              <button type="button" onClick={handleEnableBrowserNotifications}>
                <BellRing size={12} /> Ativar
              </button>
            </div>
          )}

          <div className="notification-popover__list">
            {notifications.length === 0 ? (
              <div className="notification-popover__empty">
                <Bell size={24} />
                <strong>Nenhuma menção recebida</strong>
                <span>
                  Quando alguém marcar você com <code>@Nome</code> no chat de uma empresa, o alerta
                  aparecerá aqui.
                </span>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.readAt;
                return (
                  <div
                    key={notif.id}
                    className={`notification-popover__item ${isUnread ? 'is-unread' : ''}`}
                    onClick={() => handleOpenNotification(notif)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenNotification(notif);
                      }
                    }}
                  >
                    <div className="notification-popover__item-icon">
                      <MessageSquare size={15} />
                    </div>
                    <div className="notification-popover__item-content">
                      <div className="notification-popover__item-top">
                        <strong>{notif.title}</strong>
                        {isUnread && <span className="notification-popover__dot" />}
                      </div>
                      {notif.body && (
                        <p className="notification-popover__item-body">{notif.body}</p>
                      )}
                      <span className="notification-popover__item-time">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>
                    {!notif.isFallback && (
                      <button
                        type="button"
                        className="notification-popover__delete-btn"
                        onClick={(e) => handleDeleteNotification(e, notif)}
                        title="Remover notificação"
                        aria-label="Remover notificação"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {enableToast && activeToast && (
        <div className="notification-toast" role="status" aria-live="polite">
          <div className="notification-toast__icon">
            <AtSign size={17} />
          </div>
          <div className="notification-toast__content">
            <strong>{activeToast.title}</strong>
            <p>{activeToast.body}</p>
            <div className="notification-toast__actions">
              <button
                type="button"
                className="btn btn-primary notification-toast__btn"
                onClick={() => handleOpenNotification(activeToast)}
              >
                Ver no chat
              </button>
              <button
                type="button"
                className="notification-toast__dismiss"
                onClick={() => setActiveToast(null)}
              >
                Dispensar
              </button>
            </div>
          </div>
          <button
            type="button"
            className="notification-toast__close"
            onClick={() => setActiveToast(null)}
            aria-label="Fechar alerta"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
};

export default NotificationBell;
