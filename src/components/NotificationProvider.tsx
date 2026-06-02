import { useCallback, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import {
  NotificationContext,
  type NotificationPayload,
  type NotificationVariant,
} from "./notificationContext";

type ActiveNotification = NotificationPayload & {
  id: number;
  variant: NotificationVariant;
};

const variantIcons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
} satisfies Record<NotificationVariant, typeof Info>;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<ActiveNotification | null>(null);

  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const notify = useCallback((payload: NotificationPayload) => {
    setNotification({
      ...payload,
      id: Date.now(),
      variant: payload.variant ?? "info",
    });
  }, []);

  const value = useMemo(
    () => ({
      notify,
      dismissNotification,
    }),
    [dismissNotification, notify],
  );

  const Icon = notification ? variantIcons[notification.variant] : Info;

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {notification ? (
        <div className="app-notification-layer" role="presentation">
          <section
            className={`app-notification app-notification-${notification.variant}`}
            role="alertdialog"
            aria-labelledby={`app-notification-title-${notification.id}`}
            aria-describedby={notification.message ? `app-notification-message-${notification.id}` : undefined}
          >
            <div className="app-notification-icon" aria-hidden="true">
              <Icon size={20} />
            </div>
            <div className="app-notification-copy">
              <strong id={`app-notification-title-${notification.id}`}>{notification.title}</strong>
              {notification.message ? (
                <p id={`app-notification-message-${notification.id}`}>{notification.message}</p>
              ) : null}
              <div className="app-notification-actions">
                <button className="notification-btn notification-btn-muted" type="button" onClick={dismissNotification}>
                  OK
                </button>
                {notification.action ? (
                  <button
                    className="notification-btn notification-btn-primary"
                    type="button"
                    onClick={() => {
                      const action = notification.action;
                      dismissNotification();
                      action?.onClick();
                    }}
                  >
                    {notification.action.label}
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </NotificationContext.Provider>
  );
}
