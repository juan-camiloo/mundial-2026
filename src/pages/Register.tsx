import { useState } from "react";
import { Award, KeyRound, Mail, Target, Trophy, User, UserPlus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Link, useNavigate } from "react-router-dom";
import FormStatusMessage from "../components/FormStatusMessage";
import PasswordField from "../components/PasswordField";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmatePassword, setConfirmatePassword] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();


  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setCodeError(null);
    setPasswordError(null);
    setFormError(null);

    try{
      const { data: isValid } = await supabase.rpc("validate_access_code", {
        input_code: inputCode,
      });
      if (!isValid) {
        setCodeError("Código inválido.");
        return;
      }

      if (password !== confirmatePassword){
        setPasswordError("Las contraseñas deben coincidir.");
        return; 
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
        
        

      if (error) {
        console.error(error.message);
        setFormError("No fue posible crear el usuario. Intenta de nuevo.");
        return;
      }

      if (data.user) {
        await supabase.from("profiles").update({ name }).eq("id", data.user.id);
      }

      navigate("/login");
    }catch {
      setFormError("No fue posible crear el usuario. Intenta de nuevo.");
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
            Bienvenido al juego
          </span>
          <h1>Registra tu cuenta y pronostica cada partido.</h1>
          <p>
            Cada acierto suma puntos. El cierre de pronósticos es 10 minutos antes del
            comienzo del partido.
          </p>
          <div className="intro-highlights">
            <div className="highlight">
              <Award size={20} aria-hidden="true" />
              <h3>5 puntos</h3>
              <p>Por acertar resultado sin marcador exacto.</p>
            </div>
            <div className="highlight">
              <Target size={20} aria-hidden="true" />
              <h3>2 puntos</h3>
              <p>Por acertar goles de un equipo.</p>
            </div>
          </div>
        </section>

        <section className="auth-card">
          <form className="form" onSubmit={handleRegister} aria-busy={isSubmitting}>
            <div className="form-header">
              <h2>Crear cuenta</h2>
              <p>Completa tus datos para entrar al juego de pronósticos de Ingelox SAS.</p>
            </div>
            <label className="field">
              <span>Nombre</span>
              <div className="input-control">
                <User size={18} aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Tu nombre"
                  autoComplete="name"
                  required
                  disabled={isSubmitting}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setFormError(null);
                  }}
                />
              </div>
            </label>
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFormError(null);
                  }}
                />
              </div>
            </label>
            <PasswordField
              label="Contraseña"
              placeholder="Crea una contraseña"
              autoComplete="new-password"
              required
              disabled={isSubmitting}
              value={password}
              visible={showPassword}
              onChange={(value) => {
                setPassword(value);
                setPasswordError(null);
              }}
              onVisibleChange={setShowPassword}
            />
            <PasswordField
              label="Confirmar contraseña"
              placeholder="Confirma tu contraseña"
              autoComplete="new-password"
              required
              disabled={isSubmitting}
              error={passwordError}
              value={confirmatePassword}
              visible={showPassword}
              onChange={(value) => {
                setConfirmatePassword(value);
                setPasswordError(null);
              }}
              onVisibleChange={setShowPassword}
            />
            <label className="field">
              <span>Código de acceso</span>
              <div className="input-control">
                <KeyRound size={18} aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Ingresa tu código"
                  required
                  disabled={isSubmitting}
                  aria-invalid={Boolean(codeError)}
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value);
                    setCodeError(null);
                  }}
                />
              </div>
              <p className="field-error" role={codeError ? "alert" : undefined} aria-hidden={codeError ? undefined : true}>
                {codeError ?? ""}
              </p>
            </label>
            <FormStatusMessage message={formError} />
            <button className="primary-btn" type="submit" disabled={isSubmitting}>
              <UserPlus size={18} aria-hidden="true" />
              {isSubmitting ? "Creando cuenta..." : "Registrarme"}
            </button>
            <p className="form-footer">
              ¿Ya tienes cuenta? <Link to="/login">Entrar</Link>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
