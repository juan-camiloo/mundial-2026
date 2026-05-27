import { supabase } from "../lib/supabase";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import PasswordField from "../components/PasswordField";

export default function UpdatePassword (){
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    
    const handleUpdatePassword = async (e: React.FormEvent) =>{
        e.preventDefault();
        if (newPassword !== confirmPassword){
            alert ("Las contraseñas deben coincidir");
            return;
        }

        const { error}= await supabase.auth.updateUser({
            password: newPassword
        })
        if (error){
            alert ("Error cambiando la contraseña")
        }else{
            alert ("Contraseña actualizada correctamente")
            navigate ('/login')
        }
    }
    return(
        <main className="page page-center">
        <section className="auth-card">
          <form className="form" onSubmit={handleUpdatePassword}>
            <div className="form-header">
              <h2>Actualizar Contraseña</h2>
              <p>Ingresa tu contraseña nueva</p>
            </div>
            <PasswordField
              label="Contraseña nueva"
              placeholder="••••••••"
              autoComplete="new-password"
              required
              value={newPassword}
              visible={showPassword}
              onChange={setNewPassword}
              onVisibleChange={setShowPassword}
            />
            <PasswordField
              label="Confirmar contraseña nueva"
              placeholder="••••••••"
              autoComplete="new-password"
              required
              value={confirmPassword}
              visible={showPassword}
              onChange={setConfirmPassword}
              onVisibleChange={setShowPassword}
            />
            <button className="primary-btn" type="submit">
              <Send size={18} aria-hidden="true" />
              Actualizar contraseña
            </button>
            <p className="form-footer">
            </p>
          </form>
        </section>
        </main>
    );
}
