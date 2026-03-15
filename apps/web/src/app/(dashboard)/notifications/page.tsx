'use client';
import { useQuery, useMutation } from '@apollo/client';
import {
  Calendar,
  Megaphone,
  ArrowLeftRight,
  CheckCircle,
  XCircle,
  ArrowDown,
  AlertTriangle,
  Bell,
  BellOff,
  Loader2,
  CheckCheck,
  Inbox,
} from 'lucide-react';
import { Header } from '../../../components/layout/header';
import { GET_NOTIFICATIONS } from '../../../lib/graphql/queries';
import { MARK_NOTIFICATION_READ, MARK_ALL_READ } from '../../../lib/graphql/mutations';
import { useNotificationStore } from '../../../stores/notification-store';

type NotifType =
  | 'SHIFT_ASSIGNED'
  | 'SCHEDULE_PUBLISHED'
  | 'SWAP_REQUESTED'
  | 'SWAP_APPROVED'
  | 'SWAP_REJECTED'
  | 'DROP_AVAILABLE'
  | 'OVERTIME_WARNING';

const NOTIF_META: Record<NotifType, { icon: React.ReactNode; color: string }> = {
  SHIFT_ASSIGNED:      { icon: <Calendar className="w-4 h-4" />,       color: 'bg-blue-100 text-blue-600' },
  SCHEDULE_PUBLISHED:  { icon: <Megaphone className="w-4 h-4" />,      color: 'bg-green-100 text-green-600' },
  SWAP_REQUESTED:      { icon: <ArrowLeftRight className="w-4 h-4" />, color: 'bg-indigo-100 text-indigo-600' },
  SWAP_APPROVED:       { icon: <CheckCircle className="w-4 h-4" />,    color: 'bg-green-100 text-green-600' },
  SWAP_REJECTED:       { icon: <XCircle className="w-4 h-4" />,        color: 'bg-red-100 text-red-600' },
  DROP_AVAILABLE:      { icon: <ArrowDown className="w-4 h-4" />,      color: 'bg-orange-100 text-orange-600' },
  OVERTIME_WARNING:    { icon: <AlertTriangle className="w-4 h-4" />,  color: 'bg-yellow-100 text-yellow-600' },
};

function NotifIcon({ type }: { type: string }) {
  const meta = NOTIF_META[type as NotifType] ?? {
    icon: <Bell className="w-4 h-4" />,
    color: 'bg-gray-100 text-gray-500',
  };
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${meta.color}`}>
      {meta.icon}
    </div>
  );
}

export default function NotificationsPage() {
  const { data, loading, refetch } = useQuery(GET_NOTIFICATIONS);
  const setUnreadCount = useNotificationStore(s => s.setUnreadCount);

  const [markRead] = useMutation(MARK_NOTIFICATION_READ, { onCompleted: () => refetch() });
  const [markAll, { loading: markingAll }] = useMutation(MARK_ALL_READ, {
    onCompleted: () => { refetch(); setUnreadCount(0); },
  });

  const notifications: any[] = data?.notifications ?? [];
  const unread = notifications.filter((n: any) => !n.isRead).length;

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : 'All caught up'}
        actions={
          unread > 0 ? (
            <button
              onClick={() => markAll()}
              disabled={markingAll}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              {markingAll
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <CheckCheck className="w-4 h-4" />}
              Mark all read
            </button>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <BellOff className="w-7 h-7" />
            </div>
            <p className="font-medium text-gray-500">No notifications yet</p>
            <p className="text-sm mt-1">You&apos;ll see shift updates and alerts here</p>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl">
            {unread === 0 && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-100 rounded-lg px-4 py-2.5 mb-4">
                <Inbox className="w-4 h-4" />
                You&apos;re all caught up!
              </div>
            )}
            {notifications.map((n: any) => (
              <div
                key={n.id}
                onClick={() => !n.isRead && markRead({ variables: { id: n.id } })}
                className={`rounded-xl border p-4 transition-colors ${
                  !n.isRead
                    ? 'bg-blue-50/40 border-blue-200 cursor-pointer hover:bg-blue-50'
                    : 'bg-white border-gray-200 cursor-default'
                }`}
              >
                <div className="flex items-start gap-3">
                  <NotifIcon type={n.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-medium ${!n.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {new Date(n.createdAt).toLocaleString(undefined, {
                        month: 'short', day: 'numeric',
                        hour: 'numeric', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
