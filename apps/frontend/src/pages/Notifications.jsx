import { useNotifications } from '../context/NotificationContext.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import { formatDate } from '../utils/format.js';

export default function Notifications() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread · stay on top of leads, payments, and appointments.`}
        breadcrumbs={[{ label: 'Insights' }, { label: 'Notifications' }]}
        actions={
          unreadCount > 0 ? (
            <Button variant="secondary" onClick={markAllRead}>
              Mark all read
            </Button>
          ) : null
        }
      />

      <Card>
        <ul className="divide-y divide-[var(--border)]">
          {notifications.map((n) => (
            <li key={n.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
              <span
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                  n.read ? 'bg-transparent' : 'bg-brand-500'
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">{n.title}</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{n.message}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {formatDate(n.time)} · {n.type}
                    </p>
                  </div>
                  {!n.read ? (
                    <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>
                      Mark read
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
