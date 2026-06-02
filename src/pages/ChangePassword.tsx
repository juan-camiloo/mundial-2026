import { Mail, Send } from "lucide-react";
import { useState } from "react";
import FormStatusMessage from "../components/FormStatusMessage";
import { supabase } from "../lib/supabase";

export default function ChangePassword() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setStatus(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/confirm`,
      });

      if (error) {
        setStatus({ type: "error", message: "No pudimos enviar el correo de recuperación. Intenta de nuevo." });
        return;
      }

      setStatus({
        type: "success",
        message: "Si el correo existe, recibirás el correo para restablecer tu contraseña.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page page-center">
      <section className="auth-card">
        <form className="form" onSubmit={handleResetPassword} aria-busy={isSubmitting}>
          <div className="form-header">
            <h2>Cambiar contraseña</h2>
            <p>Ingresa tu correo y continúa con el proceso.</p>
          </div>
          <label className="field">
            <span>Email</span>
            <div className="input-control">
              <Mail size={18} aria-hidden="true" />
              <input
                type="email"
                placeholder="tu@email.com"
                autoComplete="email"
                required
                disabled={isSubmitting}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setStatus(null);
                }}
              />
            </div>
          </label>
          <FormStatusMessage
            message={status?.message}
            type={status?.type ?? "error"}
            role={status?.type === "success" ? "status" : "alert"}
          />
          <button className="primary-btn" type="submit" disabled={isSubmitting}>
            <Send size={18} aria-hidden="true" />
            {isSubmitting ? "Enviando..." : "Enviar correo de recuperación"}
          </button>
        </form>
      </section>
    </main>
  );
}
