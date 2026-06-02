import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

const DEFAULT_RECOVERY_REDIRECT = "/contrase\u00f1a-nueva";

const getSafeNextPath = (nextPath: string | null) => {
    if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
        return DEFAULT_RECOVERY_REDIRECT;
    }

    return nextPath;
};


export default function Confirmation(){
    const navigate = useNavigate();

    useEffect (() =>{
        const handleAuth =async ()=>{
            const queryParams = new URLSearchParams(window.location.search);
            const token_hash = queryParams.get("token_hash")
            const type = queryParams.get("type")
            const nextPath = getSafeNextPath(queryParams.get("next"))

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
                navigate (nextPath)
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
