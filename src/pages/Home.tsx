import { useEffect } from "react";
import { ClipboardList, Gift, ShieldCheck, Sparkles, Target, Timer, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import prizeFc26Image from "../assets/prize-fc26-ps5-cropped.jpg";
import prizeSpeakerImage from "../assets/prize-speaker-boc241-cropped.jpg";
import prizeTvImage from "../assets/prize-tv-caixun-c43kafz-cropped.jpg";
import { supabase } from "../lib/supabase";

const prizes = [
  {
    place: "1er puesto",
    title: 'Televisor Caixun 43" Smart TV FHD C43KAFZ',
    description: "Pantalla principal para disfrutar partidos, series y entretenimiento en grande.",
    image: prizeTvImage,
    imageAlt: 'Televisor Caixun 43" Smart TV FHD C43KAFZ',
    variant: "wide",
  },
  {
    place: "2do puesto",
    title: "EA Sports FC 26 para PS5",
    description: "Juego fisico para PlayStation 5 y seguir viviendo el futbol desde la consola.",
    image: prizeFc26Image,
    imageAlt: "Caja de EA Sports FC 26 para PS5",
    variant: "portrait",
  },
  {
    place: "3er puesto",
    title: "Bocina inalambrica 1Hora BOC241",
    description: "Barra de sonido Bluetooth con luces RGB para mejorar el audio en casa.",
    image: prizeSpeakerImage,
    imageAlt: "Bocina inalambrica 1Hora BOC241",
    variant: "wide",
  },
];

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
            <h1>Tu pronóstico mueve la tabla.</h1>
            <p>
              El objetivo es sumar la mayor cantidad de puntos en cada fecha y en el acumulado
              general del torneo. Gana quien más puntos acumule.
            </p>
          </div>

          <div className="hero-image" role="img" aria-label="Hinchas celebrando un evento deportivo" />

          <div className="hero-stats">
            <div className="stat-card">
              <Timer size={22} aria-hidden="true" />
              <span>Cierre</span>
              <strong>10 minutos antes</strong>
              <small>Se pueden modificar pronósticos hasta 10 minutos antes del partido.</small>
            </div>

            <div className="stat-card">
              <Trophy size={22} aria-hidden="true" />
              <span>Máximo por partido</span>
              <strong>17 puntos</strong>
              <small>Marcador exacto mas ganador por penales.</small>
            </div>

            <div className="stat-card">
              <Sparkles size={22} aria-hidden="true" />
              <span>Final soñada</span>
              <strong>+40 puntos</strong>
              <small>10 por cada posición acertada entre los cuatro primeros.</small>
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
              es acumular la mayor cantidad de puntos. El ganador del torneo es quien mas puntos acumule en todo el
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
              Puedes pronosticar partidos de las fechas habilitadas. Si un partido ya comenzó
              o ya se cerró su plazo, no podrás cargar ni modificar el resultado y no sumarás
              puntos en ese encuentro.
            </p>
          </div>

          <ul className="rule-list">
            <li>Marcador exacto: 12 puntos.</li>
            <li>Acertar resultado, ganador o empate no exacto: 5 puntos.</li>
            <li>Acertar el marcador de una selección: 2 puntos.</li>
            <li>Si aciertas resultado y goles de una selección sin ser exacto, sumas 7 puntos.</li>
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
              En el formulario de inscripción cada participante define campeón, subcampeón,
              tercer puesto y cuarto puesto. Se otorgan 10 puntos por cada posición acertada.
            </p>
          </div>

          <ul className="rule-list">
            <li>No se pueden repetir selecciones en el podio.</li>
            <li>La final soñada se registra una sola vez y no se puede editar después de enviarla.</li>
          </ul>
        </section>

        <section className="rule-block">
          <div className="section-header">
            <h2>
              <ShieldCheck size={20} aria-hidden="true" />
              4. Penales
            </h2>
            <p>
              En fase de eliminación directa puedes pronosticar empate y seleccionar quién
              avanza por penales. Si el marcador final es empate, se elige solo al ganador de
              penales.
            </p>
          </div>

          <ul className="rule-list">
            <li>Marcador exacto en empate de eliminación directa: 12 puntos.</li>
            <li>Ganador por penales acertado: 5 puntos adicionales.</li>
            <li>Empate acertado sin marcador exacto: 5 puntos.</li>
          </ul>
        </section>

        <section className="rule-block">
          <div className="section-header">
            <h2>
              <Trophy size={20} aria-hidden="true" />
              5. Situación de empate
            </h2>
            <p>En caso de empate en puntos, el orden se define por:</p>
          </div>

          <ol className="rule-steps">
            <li>Mayor cantidad de resultados exactos en la última jornada.</li>
            <li>Mayor cantidad de resultados exactos en todo el torneo.</li>
            <li>Pronóstico más antiguo en el juego.</li>
          </ol>
        </section>

        <section className="rule-block">
          <div className="section-header">
            <h2>
              <Gift size={20} aria-hidden="true" />
              6. Premios
            </h2>
            <p>
              Al cierre del torneo se entregarán premios a los tres mejores puestos del ranking
              general, como reconocimiento a la constancia y precisión durante todo el mundial.
            </p>
          </div>

          <div className="prize-grid" aria-label="Premios del ranking general">
            {prizes.map((prize) => (
              <article className={`prize-card prize-card-${prize.variant}`} key={prize.place}>
                <div className="prize-image-frame">
                  <img src={prize.image} alt={prize.imageAlt} loading="lazy" />
                </div>

                <div className="prize-copy">
                  <span className="prize-place">{prize.place}</span>
                  <h3>{prize.title}</h3>
                  <p>{prize.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
