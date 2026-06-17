import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CircleCheck, ClipboardList, Clock, Sparkles, Target, Trophy } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import TeamLabel from "../components/TeamLabel";
import {
  compareMatchesByTimeline,
  getMatchTimelineStatus,
  MATCH_COLUMNS,
  type MatchRow,
} from "../lib/matches";
import {
  computePredictionScore,
  formatScoreWithPenalty,
  hasMatchStarted,
  type PenaltyWinner,
} from "../lib/predictions";
import { isFairytaleEndingClosed } from "../lib/fairytaleEnding";
import { supabase } from "../lib/supabase";
import { buildTeamFlagMap, formatTeamName, type TeamFlagMap } from "../lib/teamFlags";
import {
  buildTeamLookup,
  getMatchTeam,
  TEAM_COLUMNS,
  type TeamLookup,
  type TeamRow,
} from "../lib/teams";
import { getTournamentPhaseLabel } from "../lib/tournament";

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

type FairytaleEndingRow = {
  champion: string;
  subchampion: string;
  third_place: string;
  fourth_place: string;
};

const FAIRYTALE_POSITIONS: Array<{
  key: keyof FairytaleEndingRow;
  label: string;
}> = [
  { key: "champion", label: "Campeon" },
  { key: "subchampion", label: "2do lugar" },
  { key: "third_place", label: "3er lugar" },
  { key: "fourth_place", label: "4to lugar" },
];

export default function PlayerProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("Jugador");
  const [predictions, setPredictions] = useState<PredictionRow[]>([]);
  const [fairytaleEnding, setFairytaleEnding] = useState<FairytaleEndingRow | null>(null);
  const [teamFlags, setTeamFlags] = useState<TeamFlagMap>({});
  const [teamsById, setTeamsById] = useState<TeamLookup>({});
  const [canShowFairytaleEnding, setCanShowFairytaleEnding] = useState(() =>
    isFairytaleEndingClosed()
  );
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
      setCanShowFairytaleEnding(isFairytaleEndingClosed());
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) {
        setError("No encontramos este perfil.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userData.user || userError) {
        navigate("/login");
        return;
      }

      const fairytaleRequest = canShowFairytaleEnding
        ? supabase
            .from("fairytale_ending")
            .select("champion, subchampion, third_place, fourth_place")
            .eq("user_id", userId)
            .maybeSingle()
        : Promise.resolve({ data: null });

      const [
        { data: profile },
        { data: predictionRows, error: predictionsError },
        { data: teams },
        { data: fairytaleData },
      ] = await Promise.all([
        supabase.from("profiles").select("name").eq("id", userId).maybeSingle(),
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
          .eq("user_id", userId),
        supabase.from("teams").select(TEAM_COLUMNS),
        fairytaleRequest,
      ]);

      if (predictionsError) {
        setError("No pudimos cargar los pronosticos de este jugador.");
        setLoading(false);
        return;
      }

      const formattedPredictions = ((predictionRows ?? []) as RawPredictionRow[])
        .map((prediction) => ({
          ...prediction,
          match: Array.isArray(prediction.match) ? prediction.match[0] ?? null : prediction.match,
        }));

      const teamRows = (teams ?? []) as TeamRow[];
      setPlayerName(profile?.name ?? "Jugador");
      setPredictions(formattedPredictions);
      setFairytaleEnding((fairytaleData as FairytaleEndingRow | null) ?? null);
      setTeamFlags(buildTeamFlagMap(teamRows));
      setTeamsById(buildTeamLookup(teamRows));
      setLoading(false);
    };

    loadProfile();
  }, [canShowFairytaleEnding, navigate, userId]);

  const visiblePredictions = useMemo(
    () =>
      predictions
        .filter((prediction) => {
          const match = prediction.match;
          if (!match) return false;
          if (match.goals_a !== null && match.goals_b !== null) return true;
          return hasMatchStarted(match, currentTime);
        })
        .sort((predictionA, predictionB) =>
          compareMatchesByTimeline(predictionA.match, predictionB.match, currentTime),
        ),
    [currentTime, predictions],
  );

  const summary = useMemo(() => {
    let totalPoints = 0;
    let exactHits = 0;
    let resultHits = 0;
    let penaltyHits = 0;
    let pending = 0;
    let finished = 0;

    visiblePredictions.forEach((prediction) => {
      const score = computePredictionScore(prediction, prediction.match);
      totalPoints += score.points;

      if (score.status === "pendiente") {
        pending += 1;
        return;
      }

      finished += 1;
      if (score.exact) exactHits += 1;
      if (score.resultHit) resultHits += 1;
      if (score.penaltyWinnerHit) penaltyHits += 1;
    });

    return { totalPoints, exactHits, resultHits, penaltyHits, pending, finished };
  }, [visiblePredictions]);

  return (
    <main className="page">
      <div className="matches-shell">
        <header className="matches-header">
          <span className="pill">
            <ClipboardList size={14} aria-hidden="true" />
            Perfil
          </span>
          <h1>{playerName}</h1>
          <p>Pronosticos registrados por este participante.</p>
          <Link className="ghost-btn profile-back-link" to="/ranking">
            <ArrowLeft size={16} aria-hidden="true" />
            Volver al ranking
          </Link>
        </header>

        {loading ? (
          <div className="empty-state">Cargando pronosticos...</div>
        ) : error ? (
          <div className="empty-state">{error}</div>
        ) : visiblePredictions.length === 0 && !fairytaleEnding ? (
          <div className="empty-state">
            Este jugador aun no tiene pronosticos visibles. Se mostraran cuando el partido este en juego o finalizado.
          </div>
        ) : (
          <>
            <section className="summary-grid">
              <div className="summary-card">
                <Trophy size={22} aria-hidden="true" />
                <span>Puntos totales</span>
                <strong>{summary.totalPoints}</strong>
                <small>Acumulado visible.</small>
              </div>
              <div className="summary-card">
                <ClipboardList size={22} aria-hidden="true" />
                <span>Partidos finalizados</span>
                <strong>{summary.finished}</strong>
                <small>En juego: {summary.pending}.</small>
              </div>
              <div className="summary-card">
                <Target size={22} aria-hidden="true" />
                <span>Exactos</span>
                <strong>{summary.exactHits}</strong>
                <small>Marcador de 90 minutos exacto.</small>
              </div>
            </section>

            {fairytaleEnding ? (
              <section className="rule-block player-profile-section">
                <div className="section-header">
                  <h2>
                    <Sparkles size={20} aria-hidden="true" />
                    Final soñada
                  </h2>
                  <p>Podio final registrado por {playerName}.</p>
                </div>

                <div className="predictions-grid">
                  {FAIRYTALE_POSITIONS.map(({ key, label }) => (
                    <article className="prediction-card" key={key}>
                      <div className="prediction-row">
                        <span>{label}</span>
                        <strong>
                          <TeamLabel country={fairytaleEnding[key]} teamFlags={teamFlags} />
                        </strong>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {visiblePredictions.length ? (
              <section className="predictions-grid">
                {visiblePredictions.map((prediction) => {
                  const match = prediction.match;
                  if (!match) return null;

                  const teamA = getMatchTeam(teamsById, match.team_a_id, match.team_a_info, "Seleccion por definir");
                  const teamB = getMatchTeam(teamsById, match.team_b_id, match.team_b_info, "Seleccion por definir");
                  const phaseLabel = getTournamentPhaseLabel(match.phase, teamA.group_key ?? teamB.group_key);
                  const matchDate = formatter.format(new Date(match.match_date));
                  const score = computePredictionScore(prediction, match);
                  const timelineStatus = getMatchTimelineStatus(match, currentTime);
                  const matchIsFinished = score.status === "finalizado" || timelineStatus === "finished";
                  const statusLabel = matchIsFinished ? "finalizado" : "en juego";
                  const statusClass = matchIsFinished ? "finished" : "live";
                  const StatusIcon = matchIsFinished ? CircleCheck : Clock;
                  const officialResult =
                    score.status === "finalizado"
                      ? formatScoreWithPenalty({
                          goalsA: match.goals_a,
                          goalsB: match.goals_b,
                          penaltyWinner: match.penalty_winner,
                          teamA: formatTeamName(teamA.country),
                          teamB: formatTeamName(teamB.country),
                        })
                      : matchIsFinished
                      ? "Resultado pendiente"
                      : "En juego";
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
                        <span className={`match-status status-${statusClass}`}>
                          <StatusIcon size={13} aria-hidden="true" />
                          {statusLabel}
                        </span>
                      </div>

                      <div className="match-teams">
                        <TeamLabel country={teamA.country} flag={teamA.flag} teamFlags={teamFlags} />
                        <strong>
                          {matchIsFinished && match.goals_a !== null && match.goals_b !== null
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
                        <span>Pronostico de {playerName}</span>
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
                    </article>
                  );
                })}
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
