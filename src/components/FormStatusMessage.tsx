type FormStatusMessageProps = {
  message?: string | null;
  type?: "success" | "error";
  role?: "alert" | "status";
  className?: string;
};

export default function FormStatusMessage({
  message,
  type = "error",
  role = "alert",
  className,
}: FormStatusMessageProps) {
  const visible = Boolean(message);
  const classNames = ["form-alert", `form-alert-${type}`, className].filter(Boolean).join(" ");

  return (
    <p
      className={classNames}
      role={visible ? role : undefined}
      aria-live={visible ? (role === "alert" ? "assertive" : "polite") : undefined}
      aria-hidden={visible ? undefined : true}
    >
      {message ?? ""}
    </p>
  );
}
