import { Mail, Send } from "lucide-react";
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ChangePassword() {
  const [email, setEmail] = useState("");

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm`,
    });

    if (error) {
      alert("No pudimos enviar el correo de recuperacion. Intenta de nuevo.");
      return;
    }

    alert("Si el correo existe, recibiras el correo para reestablecer tu contrasena.");
  };

  return (
    <main className="page page-center">
      <section className="auth-card">
        <form className="form" onSubmit={handleResetPassword}>
          <div className="form-header">
            <h2>Cambiar contrasena</h2>
            <p>Ingresa tu correo y continua con el proceso.</p>
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
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </label>
          <button className="primary-btn" type="submit">
            <Send size={18} aria-hidden="true" />
            Enviar correo de recuperacion
          </button>
        </form>
      </section>
    </main>
  );
}
