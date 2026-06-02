import { useEffect, useState } from "react";
import { Lock, Save, ShieldCheck, Trophy } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import FormStatusMessage from "../components/FormStatusMessage";
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
import {
  FAIRYTALE_ENDING_REMINDER_MESSAGE,
  shouldRemindFairytaleEnding,
} from "../lib/fairytaleEnding";
import { buildTeamFlagMap, formatTeamName, type TeamFlagMap } from "../lib/teamFlags";
import { MATCH_COLUMNS, type MatchRow } from "../lib/matches";
import {
  buildTeamLookup,
  getMatchTeam,
  TEAM_COLUMNS,
  type TeamLookup,
} from "../lib/teams";
import { useNotification } from "../components/notificationContext";

type PredictionRow = {
  id: string;
  match_id: string;
  pred_goals_a: number | null;
  pred_goals_b: number | null;
  pred_penalty_winner?: PenaltyWinner | null;
};

export default function EditPredictions() {
  const navigate = useNavigate();
  const { predictionId } = useParams();
  const [prediction, setPrediction] = useState<PredictionRow | null>(null);
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [teamFlags, setTeamFlags] = useState<TeamFlagMap>({});
  const [teamsById, setTeamsById] = useState<TeamLookup>({});
  const [goalsA, setGoalsA] = useState<number | null>(null);
  const [goalsB, setGoalsB] = useState<number | null>(null);
  const [penaltyWinner, setPenaltyWinner] = useState<PenaltyWinner | null>(null);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const { notify } = useNotification();

  useEffect(() => {
    const loadPrediction = async () => {
      if (!predictionId) {
        navigate("/mis-pronosticos");
        return;
      }

      const { data, error } = await supabase
        .from("predictions")
        .select("id, match_id, pred_goals_a, pred_goals_b, pred_penalty_winner")
        .eq("id", predictionId)
        .single();

      if (error || !data) {
        notify({
          title: "No pudimos cargar el pronóstico",
          message: "Vuelve a la lista e intenta abrirlo otra vez.",
          variant: "error",
          action: { label: "Ir a partidos", onClick: () => navigate("/partidos") },
        });
        navigate("/partidos");
        return;
      }

      setPrediction(data);
      setGoalsA(data.pred_goals_a);
      setGoalsB(data.pred_goals_b);
      setPenaltyWinner(data.pred_penalty_winner ?? null);

      const { data: teams } = await supabase.from("teams").select(TEAM_COLUMNS);
      setTeamFlags(buildTeamFlagMap(teams ?? []));
      setTeamsById(buildTeamLookup(teams ?? []));

      if (!data.match_id) {
        return;
      }

      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select(MATCH_COLUMNS)
        .eq("id", data.match_id)
        .single();

      if (matchError || !matchData) {
        notify({
          title: "No pudimos cargar el partido",
          message: "Vuelve a Mis pronósticos e intenta abrirlo otra vez.",
          variant: "error",
          action: { label: "Ir a Mis pronósticos", onClick: () => navigate("/mis-pronosticos") },
        });
        navigate("/mis-pronosticos");
        return;
      }

      if (matchData) {
        if (isPredictionClosed(matchData)) {
          notify({
            title: "Edición cerrada",
            message: `La edición de este pronóstico se cierra ${PREDICTION_LOCK_MINUTES} minutos antes del inicio del partido.`,
            variant: "warning",
            action: { label: "Ir a Mis pronósticos", onClick: () => navigate("/mis-pronosticos") },
          });
          navigate("/mis-pronosticos");
          return;
        }

        setMatch(matchData);
      }
    };

    loadPrediction();
  }, [navigate, notify, predictionId]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userData.user || userError) {
        notify({
          title: "Inicia sesión de nuevo",
          message: "No se encontró una sesión activa.",
          variant: "warning",
          action: { label: "Ir a login", onClick: () => navigate("/login") },
        });
        navigate("/login");
      }
    };

    checkUser();
  }, [navigate, notify]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  const handleEditPredictions = async () => {
    if (!predictionId || !match) return;
    const selectedPenaltyWinner = needsPenaltyWinnerPrediction(match, goalsA, goalsB)
      ? penaltyWinner
      : null;
    setFormError(null);

    if (isPredictionClosed(match)) {
      notify({
        title: "Edición cerrada",
        message: `La edición de este pronóstico se cierra ${PREDICTION_LOCK_MINUTES} minutos antes del inicio del partido.`,
        variant: "warning",
        action: { label: "Ir a Mis pronósticos", onClick: () => navigate("/mis-pronosticos") },
      });
      navigate("/mis-pronosticos");
      return;
    }

    if (goalsA === null || goalsB === null) {
      setFormError("Ingresa el marcador antes de guardar.");
      return;
    }

    if (needsPenaltyWinnerPrediction(match, goalsA, goalsB) && !selectedPenaltyWinner) {
      setFormError("Elige quién gana por penales para los empates.");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("predictions")
      .update({
        pred_goals_a: goalsA,
        pred_goals_b: goalsB,
        pred_penalty_winner: selectedPenaltyWinner,
      })
      .eq("id", predictionId)
      .select("id")
      .single();

    if (error) {
      const missingColumn = error.message.includes("pred_penalty_winner");
      const closedWindow = error.message.includes(`${PREDICTION_LOCK_MINUTES} minutos antes`);
      notify({
        title: closedWindow ? "Edición cerrada" : "No pudimos actualizar",
        message: closedWindow
          ? error.message
          : missingColumn
          ? "Falta aplicar la migración de penales en Supabase antes de actualizar este pronóstico."
          : "Tuvimos problemas para actualizar tu pronóstico.",
        variant: closedWindow ? "warning" : "error",
        action: closedWindow
          ? { label: "Ir a Mis pronósticos", onClick: () => navigate("/mis-pronosticos") }
          : undefined,
      });
      setLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const shouldShowFairytaleReminder = userData.user
      ? await shouldRemindFairytaleEnding(userData.user.id)
      : false;

    notify({
      title: "Pronóstico actualizado",
      message: shouldShowFairytaleReminder ? FAIRYTALE_ENDING_REMINDER_MESSAGE : "Tus cambios quedaron guardados.",
      variant: "success",
      action: shouldShowFairytaleReminder
        ? { label: "Ir a Mi Final soñada", onClick: () => navigate("/mi-final-sonada") }
        : undefined,
    });
    navigate("/mis-pronosticos");
    setLoading(false);
  };

  const teamA = getMatchTeam(teamsById, match?.team_a_id, match?.team_a_info, "Selección por definir");
  const teamB = getMatchTeam(teamsById, match?.team_b_id, match?.team_b_info, "Selección por definir");
  const canPredictPenalties = matchSupportsPenalties(match);
  const predictionClosed = isPredictionClosed(match, currentTime);
  const selectedPenaltyWinner = needsPenaltyWinnerPrediction(match, goalsA, goalsB)
    ? penaltyWinner
    : null;
  const deadlineDate = getPredictionDeadline(match);
  const currentPrediction = formatScoreWithPenalty({
    goalsA: prediction?.pred_goals_a,
    goalsB: prediction?.pred_goals_b,
    penaltyWinner: prediction?.pred_penalty_winner,
    teamA: formatTeamName(teamA.country),
    teamB: formatTeamName(teamB.country),
  });
  const preview = formatScoreWithPenalty({
    goalsA,
    goalsB,
    penaltyWinner: selectedPenaltyWinner,
    teamA: formatTeamName(teamA.country),
    teamB: formatTeamName(teamB.country),
  });
  const updateGoalsA = (value: number | null) => {
    setGoalsA(value);
    setFormError(null);
  };
  const updateGoalsB = (value: number | null) => {
    setGoalsB(value);
    setFormError(null);
  };
  const updatePenaltyWinner = (value: PenaltyWinner | null) => {
    setPenaltyWinner(value);
    setFormError(null);
  };

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
            {canPredictPenalties ? "Editar desempate" : "Editar pronóstico"}
          </span>
          <h1>
            <TeamLabel country={teamA.country} flag={teamA.flag} teamFlags={teamFlags} /> vs{" "}
            <TeamLabel country={teamB.country} flag={teamB.flag} teamFlags={teamFlags} />
          </h1>
          <p>Pronóstico actual: {currentPrediction}</p>
          {deadlineDate ? (
            <p>
              Cierre: {deadlineDate.toLocaleString("es-CO")} ({PREDICTION_LOCK_MINUTES} minutos
              antes del partido).
            </p>
          ) : null}
          {predictionClosed ? (
            <p className="prediction-preview">La edición de este pronóstico ya está cerrada.</p>
          ) : null}
          {(goalsA !== null || goalsB !== null) && (
            <p className="prediction-preview">Nueva vista previa: {preview}</p>
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
            disabled={loading || predictionClosed}
            onGoalsAChange={updateGoalsA}
            onGoalsBChange={updateGoalsB}
            onPenaltyWinnerChange={updatePenaltyWinner}
          />
          <FormStatusMessage message={formError} />
        </section>

        <article className="prediction-actions">
          <button
            className="navbar-btn"
            type="button"
            disabled={loading || !prediction || !match || predictionClosed}
            aria-busy={loading}
            onClick={handleEditPredictions}
          >
            {predictionClosed ? (
              <>
                <Lock size={16} aria-hidden="true" />
                Edicion cerrada
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
