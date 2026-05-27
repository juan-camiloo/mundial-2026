import { useEffect } from "react";
import { ClipboardList, ShieldCheck, Sparkles, Target, Timer, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!data.user || error) {
        navigate("/login");
      }
    };

    checkUser();
  }, [navigate]);

  return (
    <main className="page">
      <div className="home-shell">
        <section className="hero">
          <div className="hero-text">
            <span className="pill">
              <ClipboardList size={14} aria-hidden="true" />
              Reglamento oficial
            </span>
            <h1>Tu pronostico mueve la tabla.</h1>
            <p>
              El objetivo es sumar la mayor cantidad de puntos en cada fecha y en el acumulado
              general del torneo. Gana quien mas puntos acumule.
            </p>
          </div>

          <div className="hero-stats">
            <div className="stat-card">
              <Timer size={22} aria-hidden="true" />
              <span>Cierre</span>
              <strong>10 minutos antes</strong>
              <small>Se pueden modificar pronosticos hasta 10 minutos antes del partido.</small>
            </div>

            <div className="stat-card">
              <Trophy size={22} aria-hidden="true" />
              <span>Maximo por partido</span>
              <strong>17 puntos</strong>
              <small>Marcador exacto mas ganador por penales.</small>
            </div>

            <div className="stat-card">
              <Sparkles size={22} aria-hidden="true" />
              <span>Final soñada</span>
              <strong>+40 puntos</strong>
              <small>10 por cada posicion acertada entre los cuatro primeros.</small>
            </div>
          </div>
        </section>

        <section className="rule-block">
          <div className="section-header">
            <h2>
              <Target size={20} aria-hidden="true" />
              1. Objetivo del juego
            </h2>
            <p>
              Cada participante pronostica resultados de los partidos del mundial. El objetivo
              es acumular la mayor cantidad de puntos. El ganador de cada fecha es quien mas
              sume en esa fecha y el ganador del torneo es quien mas puntos acumule en todo el
              torneo.
            </p>
          </div>
        </section>

        <section className="rule-block">
          <div className="section-header">
            <h2>
              <ClipboardList size={20} aria-hidden="true" />
              2. Desarrollo
            </h2>
            <p>
              Puedes pronosticar partidos de las fechas habilitadas. Si un partido ya comenzo
              o ya se cerro su plazo, no podras cargar ni modificar el resultado y no sumaras
              puntos en ese encuentro.
            </p>
          </div>

          <ul className="rule-list">
            <li>Marcador exacto: 12 puntos.</li>
            <li>Acertar resultado, ganador o empate no exacto: 5 puntos.</li>
            <li>Acertar el marcador de una seleccion: 2 puntos.</li>
            <li>Si aciertas resultado y goles de una seleccion sin ser exacto, sumas 7 puntos.</li>
            <li>Los resultados pueden modificarse hasta 10 minutos antes del comienzo.</li>
          </ul>
        </section>

        <section className="rule-block">
          <div className="section-header">
            <h2>
              <Sparkles size={20} aria-hidden="true" />
              3. Tu final soñada
            </h2>
            <p>
              En el formulario de inscripcion cada participante define campeon, subcampeon,
              tercer puesto y cuarto puesto. Se otorgan 10 puntos por cada posicion acertada.
            </p>
          </div>

          <ul className="rule-list">
            <li>No se pueden repetir selecciones en el podio.</li>
            <li>La final soñada se registra una sola vez y no se puede editar despues de enviarla.</li>
          </ul>
        </section>

        <section className="rule-block">
          <div className="section-header">
            <h2>
              <ShieldCheck size={20} aria-hidden="true" />
              4. Penales
            </h2>
            <p>
              En fase de eliminacion directa puedes pronosticar empate y seleccionar quien
              avanza por penales. Si el marcador final es empate, se elige solo al ganador de
              penales.
            </p>
          </div>

          <ul className="rule-list">
            <li>Marcador exacto en empate de eliminacion directa: 12 puntos.</li>
            <li>Ganador por penales acertado: 5 puntos adicionales.</li>
            <li>Empate acertado sin marcador exacto: 5 puntos.</li>
          </ul>
        </section>

        <section className="rule-block">
          <div className="section-header">
            <h2>
              <Trophy size={20} aria-hidden="true" />
              5. Situacion de empate
            </h2>
            <p>En caso de empate en puntos, el orden se define por:</p>
          </div>

          <ol className="rule-steps">
            <li>Mayor cantidad de resultados exactos en la fecha.</li>
            <li>Mayor cantidad de resultados exactos en todo el torneo.</li>
            <li>Registro mas antiguo en el juego.</li>
          </ol>
        </section>
      </div>
    </main>
  );
}
