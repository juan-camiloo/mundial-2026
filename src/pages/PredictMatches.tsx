import { useEffect, useState } from "react";
import { Lock, Save, ShieldCheck, Trophy } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import PredictionFormFields from "../components/PredictionFormFields";
import TeamLabel from "../components/TeamLabel";
import {
  formatScoreWithPenalty,
  getPredictionDeadline,
  isPredictionClosed,
  matchSupportsPenalties,
  needsPenaltyWinnerPrediction,
  PREDICTION_LOCK_MINUTES,
  type PenaltyWinner,
} from "../lib/predictions";
import { supabase } from "../lib/supabase";
import { buildTeamFlagMap, formatTeamName, type TeamFlagMap } from "../lib/teamFlags";
import { MATCH_COLUMNS, type MatchRow } from "../lib/matches";
import {
  buildTeamLookup,
  getMatchTeam,
  TEAM_COLUMNS,
  type TeamLookup,
} from "../lib/teams";

export default function PredictMatches() {
  const [loading, setLoading] = useState(false);
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [teamFlags, setTeamFlags] = useState<TeamFlagMap>({});
  const [teamsById, setTeamsById] = useState<TeamLookup>({});
  const [goalsA, setGoalsA] = useState<number | null>(null);
  const [goalsB, setGoalsB] = useState<number | null>(null);
  const [penaltyWinner, setPenaltyWinner] = useState<PenaltyWinner | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const navigate = useNavigate();
  const { matchId } = useParams();

  useEffect(() => {
    const loadMatch = async () => {
      if (!matchId) {
        navigate("/partidos");
        return;
      }

      const [{ data, error }, { data: teams }] = await Promise.all([
        supabase.from("matches").select(MATCH_COLUMNS).eq("id", matchId).single(),
        supabase.from("teams").select(TEAM_COLUMNS),
      ]);

      if (error || !data) {
        alert("Error al cargar el partido.");
        navigate("/partidos");
        return;
      }

      if (isPredictionClosed(data)) {
        alert(
          `Los pronosticos para este partido se cierran ${PREDICTION_LOCK_MINUTES} minutos antes del inicio.`
        );
        navigate("/partidos");
        return;
      }

      setMatch(data);
      setTeamFlags(buildTeamFlagMap(teams ?? []));
      setTeamsById(buildTeamLookup(teams ?? []));
    };

    loadMatch();
  }, [matchId, navigate]);

  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!data.user || error) {
        navigate("/login");
      }
    };

    checkUser();
  }, [navigate]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  const teamA = getMatchTeam(teamsById, match?.team_a_id, match?.team_a_info, "Selección por definir");
  const teamB = getMatchTeam(teamsById, match?.team_b_id, match?.team_b_info, "Selección por definir");

  const handleSavePredictions = async () => {
    if (!matchId || !match) return;
    const selectedPenaltyWinner = needsPenaltyWinnerPrediction(match, goalsA, goalsB)
      ? penaltyWinner
      : null;

    if (isPredictionClosed(match)) {
      alert(
        `Los pronosticos para este partido se cierran ${PREDICTION_LOCK_MINUTES} minutos antes del inicio.`
      );
      navigate("/partidos");
      return;
    }

    if (goalsA === null || goalsB === null) {
      alert("Ingresa el marcador antes de guardar.");
      return;
    }

    if (needsPenaltyWinnerPrediction(match, goalsA, goalsB) && !selectedPenaltyWinner) {
      alert("Elige quien gana por penales para los empates.");
      return;
    }

    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (!userData.user || userError) {
      alert("No pudimos verificar tu usuario. Por favor inicia sesion de nuevo.");
      setLoading(false);
      navigate("/login");
      return;
    }

    const predictionPayload = {
      user_id: userData.user.id,
      match_id: matchId,
      pred_goals_a: goalsA,
      pred_goals_b: goalsB,
      pred_team_a: teamA.country,
      pred_team_b: teamB.country,
      pred_penalty_winner: selectedPenaltyWinner,
    };

    const { data: existingPrediction, error: lookupError } = await supabase
      .from("predictions")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("match_id", matchId)
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      alert("No pudimos revisar si ya tenias un pronostico para este partido.");
      setLoading(false);
      return;
    }

    const { error } = existingPrediction
      ? await supabase
          .from("predictions")
          .update(predictionPayload)
          .eq("id", existingPrediction.id)
      : await supabase.from("predictions").insert(predictionPayload);

    if (error) {
      const missingColumn = error.message.includes("pred_penalty_winner");
      const closedWindow = error.message.includes(`${PREDICTION_LOCK_MINUTES} minutos antes`);
      alert(
        closedWindow
          ? error.message
          : missingColumn
          ? "Falta aplicar la migracion de penales en Supabase antes de guardar este pronostico."
          : "Error al guardar el pronostico."
      );
      setLoading(false);
      return;
    }

    alert("Pronostico guardado exitosamente.");
    navigate("/mis-pronosticos");
    setLoading(false);
  };

  const canPredictPenalties = matchSupportsPenalties(match);
  const predictionClosed = isPredictionClosed(match, currentTime);
  const selectedPenaltyWinner = needsPenaltyWinnerPrediction(match, goalsA, goalsB)
    ? penaltyWinner
    : null;
  const deadlineDate = getPredictionDeadline(match);
  const preview = formatScoreWithPenalty({
    goalsA,
    goalsB,
    penaltyWinner: selectedPenaltyWinner,
    teamA: formatTeamName(teamA.country),
    teamB: formatTeamName(teamB.country),
  });

  return (
    <main className="page">
      <div className="matches-shell">
        <header className="matches-header">
          <span className="pill">
            {canPredictPenalties ? (
              <ShieldCheck size={14} aria-hidden="true" />
            ) : (
              <Trophy size={14} aria-hidden="true" />
            )}
            {canPredictPenalties ? "Pronostico con desempate" : "Nuevo pronostico"}
          </span>
          <h1>
            <TeamLabel country={teamA.country} flag={teamA.flag} teamFlags={teamFlags} /> vs{" "}
            <TeamLabel country={teamB.country} flag={teamB.flag} teamFlags={teamFlags} />
          </h1>
          <p>
            {canPredictPenalties
              ? "Pronostica el marcador en 90 minutos y, si ves empate, quien avanza por penales."
              : "Ingresa el numero de goles que crees que marcara cada equipo."}
          </p>
          {deadlineDate ? (
            <p>
              Cierre: {deadlineDate.toLocaleString("es-CO")} ({PREDICTION_LOCK_MINUTES} minutos
              antes del partido).
            </p>
          ) : null}
          {predictionClosed ? (
            <p className="prediction-preview">Este partido ya cerro para nuevos pronosticos.</p>
          ) : null}
          {(goalsA !== null || goalsB !== null) && (
            <p className="prediction-preview">Vista previa: {preview}</p>
          )}
        </header>

        <section className="prediction-card">
          <PredictionFormFields
            teamA={teamA.country ?? "Selección por definir"}
            teamB={teamB.country ?? "Selección por definir"}
            teamAFlag={teamA.flag}
            teamBFlag={teamB.flag}
            teamFlags={teamFlags}
            goalsA={goalsA}
            goalsB={goalsB}
            penaltyWinner={selectedPenaltyWinner}
            canPredictPenalties={canPredictPenalties}
            onGoalsAChange={setGoalsA}
            onGoalsBChange={setGoalsB}
            onPenaltyWinnerChange={setPenaltyWinner}
          />
        </section>

        <article className="prediction-actions">
          <button
            className="navbar-btn"
            type="button"
            disabled={loading || !match || predictionClosed}
            onClick={handleSavePredictions}
          >
            {predictionClosed ? (
              <>
                <Lock size={16} aria-hidden="true" />
                Cerrado
              </>
            ) : (
              <>
                <Save size={16} aria-hidden="true" />
                {loading ? "Guardando..." : "Guardar"}
              </>
            )}
          </button>
        </article>
      </div>
    </main>
  );
}
