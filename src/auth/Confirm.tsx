import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"


export default function Confirmation(){
    const navigate = useNavigate();

    useEffect (() =>{
        const handleAuth =async ()=>{
            const queryParams = new URLSearchParams(window.location.search);
            const token_hash = queryParams.get("token_hash")
            const type = queryParams.get("type")

            console.log(window.location.href)
            if (token_hash && type==="recovery"){
                const {error} = await supabase.auth.verifyOtp({
                    token_hash,
                    type: "recovery",
                })
                if (error){
                    console.log("Error intercambiando el token: ", error.message )
                    return;
                }
                navigate ('/contraseña-nueva')
            }else {
                console.log("No hay token válido en la URL");
            }

        }
        handleAuth();
        
    }, [navigate]);

    return (
        <div></div>
    )
    
}
