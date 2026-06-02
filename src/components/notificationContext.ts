import { createContext, useContext } from "react";

export type NotificationVariant = "success" | "error" | "warning" | "info";

export type NotificationAction = {
  label: string;
  onClick: () => void;
};

export type NotificationPayload = {
  title: string;
  message?: string;
  variant?: NotificationVariant;
  action?: NotificationAction;
};

export type NotificationContextValue = {
  notify: (payload: NotificationPayload) => void;
  dismissNotification: () => void;
};

export const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotification() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useNotification debe usarse dentro de NotificationProvider");
  }

  return context;
}
