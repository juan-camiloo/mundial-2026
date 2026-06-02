import { useEffect, useMemo, useState } from "react";
import { CircleCheck, ClipboardList, Clock, Lock, Pencil, ShieldCheck, Target, Trophy } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import TeamLabel from "../components/TeamLabel";
import {
  computePredictionScore,
  formatScoreWithPenalty,
  isPredictionClosed,
  type PenaltyWinner,
} from "../lib/predictions";
import { supabase } from "../lib/supabase";
import { buildTeamFlagMap, formatTeamName, type TeamFlagMap } from "../lib/teamFlags";
import { MATCH_COLUMNS, type MatchRow } from "../lib/matches";
import { getTournamentPhaseLabel } from "../lib/tournament";
import {
  buildTeamLookup,
  getMatchTeam,
  TEAM_COLUMNS,
  type TeamLookup,
} from "../lib/teams";
import { useNotification } from "../components/notificationContext";

type PredictionRow = {
  id: string;
  pred_goals_a: number | null;
  pred_goals_b: number | null;
  pred_penalty_winner?: PenaltyWinner | null;
  created_at: string | null;
  match: MatchRow | null;
};

type RawPredictionRow = Omit<PredictionRow, "match"> & {
  match: MatchRow | MatchRow[] | null;
};

export default function MyPredictions() {
  const [predictions, setPredictions] = useState<PredictionRow[]>([]);
  const [teamFlags, setTeamFlags] = useState<TeamFlagMap>({});
  const [teamsById, setTeamsById] = useState<TeamLookup>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const navigate = useNavigate();
  const { notify } = useNotification();

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Bogota",
      }),
    []
  );

  useEffect(() => {
    const checkUser = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userData.user || userError) navigate("/login");
    };

    checkUser();
  }, [navigate]);

  useEffect(() => {
    const loadPredictions = async () => {
      setLoading(true);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userData.user || userError) {
        navigate("/login");
        notify({
          title: "Inicia sesión de nuevo",
          message: "No pudimos verificar tu usuario.",
          variant: "warning",
          action: { label: "Ir a login", onClick: () => navigate("/login") },
        });
        setLoading(false);
        return;
      }

      const [{ data, error: predictionsError }, { data: teams }] = await Promise.all([
        supabase
          .from("predictions")
          .select(`
            id,
            pred_goals_a,
            pred_goals_b,
            pred_penalty_winner,
            created_at,
            match:matches (${MATCH_COLUMNS})
          `)
          .eq("user_id", userData.user.id),
        supabase.from("teams").select(TEAM_COLUMNS),
      ]);

      if (predictionsError) {
        setError("No pudimos cargar tus pronósticos.");
        setLoading(false);
        return;
      }

      const formattedData: PredictionRow[] = ((data || []) as RawPredictionRow[]).map((item) => ({
        ...item,
        match: Array.isArray(item.match) ? item.match[0] ?? null : item.match,
      }));

      setPredictions(formattedData);
      setTeamFlags(buildTeamFlagMap(teams ?? []));
      setTeamsById(buildTeamLookup(teams ?? []));
      setLoading(false);
    };

    loadPredictions();
  }, [navigate, notify]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  const summary = useMemo(() => {
    let totalPoints = 0;
    let exactHits = 0;
    let resultHits = 0;
    let goalHits = 0;
    let penaltyHits = 0;
    let pending = 0;
    let finished = 0;

    predictions.forEach((prediction) => {
      const score = computePredictionScore(prediction, prediction.match);
      totalPoints += score.points;

      if (score.status === "pendiente") {
        pending += 1;
        return;
      }

      finished += 1;
      if (score.exact) exactHits += 1;
      if (score.resultHit) resultHits += 1;
      if (score.goalHit) goalHits += 1;
      if (score.penaltyWinnerHit) penaltyHits += 1;
    });

    return { totalPoints, exactHits, resultHits, goalHits, penaltyHits, pending, finished };
  }, [predictions]);

  return (
    <main className="page">
      <div className="matches-shell">
        <header className="matches-header">
          <span className="pill">
            <ClipboardList size={14} aria-hidden="true" />
            Mi resumen
          </span>
          <h1>Mis pronósticos</h1>
          <p>Revisa tus puntos por partido, incluidos empates con penales.</p>
        </header>

        {loading ? (
          <div className="empty-state">Cargando resumen...</div>
        ) : error ? (
          <div className="empty-state">{error}</div>
        ) : predictions.length === 0 ? (
          <div className="empty-state">Aún no tienes pronósticos. Ve a partidos para crear el primero.</div>
        ) : (
          <>
            <section className="summary-grid">
              <div className="summary-card">
                <Trophy size={22} aria-hidden="true" />
                <span>Puntos totales</span>
                <strong>{summary.totalPoints}</strong>
                <small>Acumulado general.</small>
              </div>
              <div className="summary-card">
                <ClipboardList size={22} aria-hidden="true" />
                <span>Pronósticos cerrados</span>
                <strong>{summary.finished}</strong>
                <small>Pendientes: {summary.pending}.</small>
              </div>
              <div className="summary-card">
                <Target size={22} aria-hidden="true" />
                <span>Exactos</span>
                <strong>{summary.exactHits}</strong>
                <small>Marcador de 90 minutos exacto.</small>
              </div>
              <div className="summary-card">
                <CircleCheck size={22} aria-hidden="true" />
                <span>Resultados acertados</span>
                <strong>{summary.resultHits}</strong>
                <small>Incluye empates correctos.</small>
              </div>
              <div className="summary-card">
                <ShieldCheck size={22} aria-hidden="true" />
                <span>Penales acertados</span>
                <strong>{summary.penaltyHits}</strong>
                <small>Ganador por penales correcto.</small>
              </div>
            </section>

            <section className="predictions-grid">
              {predictions.map((prediction) => {
                const match = prediction.match;
                if (!match) return null;

                const teamA = getMatchTeam(teamsById, match.team_a_id, match.team_a_info, "Selección por definir");
                const teamB = getMatchTeam(teamsById, match.team_b_id, match.team_b_info, "Selección por definir");
                const phaseLabel = getTournamentPhaseLabel(match.phase, teamA.group_key ?? teamB.group_key);
                const matchDate = formatter.format(new Date(match.match_date));
                const score = computePredictionScore(prediction, match);
                const canEditPrediction =
                  !isPredictionClosed(match, currentTime) &&
                  match.goals_a === null &&
                  match.goals_b === null;
                const officialResult =
                  score.status === "finalizado"
                    ? formatScoreWithPenalty({
                        goalsA: match.goals_a,
                        goalsB: match.goals_b,
                        penaltyWinner: match.penalty_winner,
                        teamA: formatTeamName(teamA.country),
                        teamB: formatTeamName(teamB.country),
                      })
                    : "Pendiente";
                const predictedResult = formatScoreWithPenalty({
                  goalsA: prediction.pred_goals_a,
                  goalsB: prediction.pred_goals_b,
                  penaltyWinner: prediction.pred_penalty_winner,
                  teamA: formatTeamName(teamA.country),
                  teamB: formatTeamName(teamB.country),
                });

                return (
                  <article className="prediction-card" key={prediction.id}>
                    <div className="prediction-top">
                      <span className="match-stage">{phaseLabel}</span>
                      <span className={`match-status status-${score.status === "pendiente" ? "scheduled" : "finished"}`}>
                        {score.status === "pendiente" ? (
                          <Clock size={13} aria-hidden="true" />
                        ) : (
                          <CircleCheck size={13} aria-hidden="true" />
                        )}
                        {score.status}
                      </span>
                    </div>

                    <div className="match-teams">
                      <TeamLabel country={teamA.country} flag={teamA.flag} teamFlags={teamFlags} />
                      <strong>
                        {score.status === "finalizado" && match.goals_a !== null && match.goals_b !== null
                          ? `${match.goals_a} - ${match.goals_b}`
                          : "vs"}
                      </strong>
                      <TeamLabel country={teamB.country} flag={teamB.flag} teamFlags={teamFlags} />
                    </div>

                    <div className="prediction-meta">
                      <span>Fecha del partido: {matchDate}</span>
                    </div>

                    <div className="prediction-row">
                      <span>Resultado oficial</span>
                      <strong>{officialResult}</strong>
                    </div>

                    <div className="prediction-row">
                      <span>Tu pronóstico</span>
                      <strong>{predictedResult}</strong>
                    </div>

                    <div className="prediction-row">
                      <span>Desglose</span>
                      <strong>{score.breakdown}</strong>
                    </div>

                    <div className="prediction-row">
                      <span>Puntos ganados</span>
                      <span className="points-badge">{score.points}</span>
                    </div>

                    {canEditPrediction ? (
                      <Link className="ghost-btn prediction-link" to={`/actualizar-pronosticos/${prediction.id}`}>
                        <Pencil size={16} aria-hidden="true" />
                        Editar pronóstico
                      </Link>
                    ) : (
                      <span className="ghost-btn prediction-link" aria-disabled="true">
                        <Lock size={16} aria-hidden="true" />
                        Edición cerrada
                      </span>
                    )}
                  </article>
                );
              })}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
