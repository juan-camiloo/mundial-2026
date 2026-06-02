import { supabase } from "../lib/supabase";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import FormStatusMessage from "../components/FormStatusMessage";
import PasswordField from "../components/PasswordField";
import { useNotification } from "../components/notificationContext";

export default function UpdatePassword (){
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();
    const { notify } = useNotification();
    
    const handleUpdatePassword = async (e: React.FormEvent) =>{
        e.preventDefault();
        if (isSubmitting) return;
        setPasswordError(null);
        setFormError(null);

        if (newPassword !== confirmPassword){
            setPasswordError("Las contraseñas deben coincidir.");
            return;
        }

        setIsSubmitting(true);

        try {
            const { error}= await supabase.auth.updateUser({
                password: newPassword
            })
            if (error){
                setFormError("Error cambiando la contraseña. Intenta de nuevo.")
            }else{
                notify({
                    title: "Contraseña actualizada",
                    message: "Ya puedes iniciar sesión con tu nueva contraseña.",
                    variant: "success",
                });
                navigate ('/login')
            }
        } finally {
            setIsSubmitting(false);
        }
    }
    return(
        <main className="page page-center">
        <section className="auth-card">
          <form className="form" onSubmit={handleUpdatePassword} aria-busy={isSubmitting}>
            <div className="form-header">
              <h2>Actualizar Contraseña</h2>
              <p>Ingresa tu contraseña nueva</p>
            </div>
            <PasswordField
              label="Contraseña nueva"
              placeholder="••••••••"
              autoComplete="new-password"
              required
              disabled={isSubmitting}
              value={newPassword}
              visible={showPassword}
              onChange={(value) => {
                setNewPassword(value);
                setPasswordError(null);
                setFormError(null);
              }}
              onVisibleChange={setShowPassword}
            />
            <PasswordField
              label="Confirmar contraseña nueva"
              placeholder="••••••••"
              autoComplete="new-password"
              required
              disabled={isSubmitting}
              error={passwordError}
              value={confirmPassword}
              visible={showPassword}
              onChange={(value) => {
                setConfirmPassword(value);
                setPasswordError(null);
                setFormError(null);
              }}
              onVisibleChange={setShowPassword}
            />
            <FormStatusMessage message={formError} />
            <button className="primary-btn" type="submit" disabled={isSubmitting}>
              <Send size={18} aria-hidden="true" />
              {isSubmitting ? "Actualizando..." : "Actualizar contraseña"}
            </button>
            <p className="form-footer">
            </p>
          </form>
        </section>
        </main>
    );
}
