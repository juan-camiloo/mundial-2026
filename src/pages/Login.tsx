import { useState } from "react";
import { LogIn, Mail, Sparkles, Trophy } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Link, useNavigate } from "react-router-dom";
import PasswordField from "../components/PasswordField";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setAuthError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error(error.message);
        if (error.message === "Invalid login credentials") {
          setAuthError("Correo o contraseña incorrectas.");
        } else {
          setAuthError("No pudimos iniciar sesión. Intenta de nuevo.");
        }

        return;
      }
      navigate("/");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page page-center">
      <div className="auth-shell">
        <section className="auth-intro">
          <span className="pill">
            <Trophy size={14} aria-hidden="true" />
            Mundial 2026
          </span>
          <h1>Pronósticos con ritmo de torneo, puntos y clasificación en vivo.</h1>
          <p>
            Ingresa para registrar tus resultados y sumar puntos en cada fecha. El
            cierre es 10 minutos antes de cada partido.
          </p>
          <div className="intro-highlights">
            <div className="highlight">
              <Trophy size={20} aria-hidden="true" />
              <h3>12 puntos</h3>
              <p>Marcador exacto + bonus por resultado perfecto.</p>
            </div>
            <div className="highlight">
              <Sparkles size={20} aria-hidden="true" />
              <h3>Final soñada</h3>
              <p>10 puntos extra por cada acierto de los cuatro primeros.</p>
            </div>
          </div>
        </section>

        <section className="auth-card">
          <form className="form" onSubmit={handleLogin} aria-busy={isSubmitting}>
            <div className="form-header">
              <h2>Iniciar sesión</h2>
              <p>Bienvenido de vuelta. Vamos por esos puntos.</p>
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
                  aria-invalid={Boolean(authError)}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setAuthError(null);
                  }}
                />
              </div>
            </label>
            <PasswordField
              label="Contraseña"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={isSubmitting}
              error={authError}
              value={password}
              visible={showPassword}
              onChange={(value) => {
                setPassword(value);
                setAuthError(null);
              }}
              onVisibleChange={setShowPassword}
            />
            <p className="form-footer form-footer-slot">
              ¿Olvidaste tu contraseña?{" "}
              <Link to="/cambiar-contraseña">
                Cambiar contraseña
              </Link>
            </p>
            <button className="primary-btn auth-submit-btn" type="submit" disabled={isSubmitting}>
              <LogIn size={18} aria-hidden="true" />
              {isSubmitting ? "Entrando..." : "Entrar"}
            </button>
            <p className="form-footer">
              ¿No tienes cuenta? <Link to="/register">Crear cuenta</Link>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
