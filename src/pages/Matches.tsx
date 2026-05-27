import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CircleCheck, Clock, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import TeamLabel from "../components/TeamLabel";
import {
  getPenaltyWinnerLabel,
  hasMatchStarted,
  isPredictionClosed,
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

const RESULT_PUBLICATION_WINDOW_MS = 3.5 * 60 * 60 * 1000;

export default function Matches() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [teamFlags, setTeamFlags] = useState<TeamFlagMap>({});
  const [teamsById, setTeamsById] = useState<TeamLookup>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const navigate = useNavigate();

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeZone: "America/Bogota",
      }),
    []
  );
  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-CO", {
        timeStyle: "short",
        timeZone: "America/Bogota",
      }),
    []
  );

  useEffect(() => {
    const checkUser = async () => {
      const { data, error: authError } = await supabase.auth.getUser();
      if (!data.user || authError) {
        navigate("/login");
      }
    };

    checkUser();
  }, [navigate]);

  useEffect(() => {
    const loadMatches = async () => {
      setLoading(true);
      const [{ data, error: matchesError }, { data: teams }] = await Promise.all([
        supabase.from("matches").select(MATCH_COLUMNS).order("match_date", { ascending: true }),
        supabase.from("teams").select(TEAM_COLUMNS),
      ]);

      if (matchesError) {
        setError("No pudimos cargar los partidos.");
        setLoading(false);
        return;
      }

      setMatches(data ?? []);
      setTeamFlags(buildTeamFlagMap(teams ?? []));
      setTeamsById(buildTeamLookup(teams ?? []));
      setLoading(false);
    };

    loadMatches();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <main className="page matches-page">
      <div className="matches-shell">
        <header className="matches-header">
          <div>
            <span className="pill">
              <CalendarDays size={14} aria-hidden="true" />
              Calendario
            </span>
            <h1>Partidos y horarios</h1>
            <p>Los pronosticos se cierran 10 minutos antes del inicio del partido.</p>
          </div>
        </header>

        {loading ? (
          <div className="empty-state">Cargando partidos...</div>
        ) : error ? (
          <div className="empty-state">{error}</div>
        ) : matches.length === 0 ? (
          <div className="empty-state">Aun no hay partidos cargados.</div>
        ) : (
          <div className="matches-grid">
            {matches.map((match) => {
              const matchDate = new Date(match.match_date);
              const teamA = getMatchTeam(teamsById, match.team_a_id, match.team_a_info, "Selección por definir");
              const teamB = getMatchTeam(teamsById, match.team_b_id, match.team_b_info, "Selección por definir");
              const phaseLabel = getTournamentPhaseLabel(match.phase, teamA.group_key ?? teamB.group_key);
              const dateLabel = dateFormatter.format(matchDate);
              const timeLabel = timeFormatter.format(matchDate);
              const showScore = match.goals_a !== null && match.goals_b !== null;
              const resultsPendingAfterWindow =
                !showScore &&
                !Number.isNaN(matchDate.getTime()) &&
                currentTime >= matchDate.getTime() + RESULT_PUBLICATION_WINDOW_MS;
              const predictionClosed = isPredictionClosed(match, currentTime);
              const matchStarted = hasMatchStarted(match, currentTime);
              const canOpenPrediction = !showScore && !matchStarted && !predictionClosed;
              const penaltyWinnerLabel = getPenaltyWinnerLabel(
                match.penalty_winner,
                teamA.country,
                teamB.country
              );
              const penaltyWinnerWithFlag = formatTeamName(penaltyWinnerLabel);

              let statusLabel = "programado";
              let statusClass = "scheduled";

              if (showScore || resultsPendingAfterWindow) {
                statusLabel = "finalizado";
                statusClass = "finished";
              } else if (matchStarted) {
                statusLabel = "en juego";
                statusClass = "live";
              } else if (predictionClosed) {
                statusLabel = "por empezar";
                statusClass = "closed";
              }

              const StatusIcon = showScore || resultsPendingAfterWindow
                ? CircleCheck
                : matchStarted || predictionClosed
                ? Clock
                : CalendarDays;

              const card = (
                <article className="match-card">
                  <div className="match-top">
                    <span className="match-stage">{phaseLabel}</span>
                    <span className={`match-status status-${statusClass}`}>
                      <StatusIcon size={13} aria-hidden="true" />
                      {statusLabel}
                    </span>
                  </div>

                  <div className="match-teams">
                    <TeamLabel country={teamA.country} flag={teamA.flag} teamFlags={teamFlags}/>
                    <strong>{showScore ? `${match.goals_a} - ${match.goals_b}` : "vs"}</strong>
                    <TeamLabel country={teamB.country} flag={teamB.flag} teamFlags={teamFlags} />
                  </div>

                  <div className="match-meta">
                    <strong>Fecha del partido:</strong>
                    <span className="match-date">
                      <span>{dateLabel}</span>
                      <span>{timeLabel}</span>
                    </span>
                  </div>

                  {resultsPendingAfterWindow ? (
                    <p className="match-results-pending">
                      Aun no se han publicado resultados para este partido.
                    </p>
                  ) : null}

                  {penaltyWinnerLabel ? (
                    <div className="match-note">
                      <ShieldCheck size={15} aria-hidden="true" />
                      {penaltyWinnerWithFlag} gano por penales.
                    </div>
                  ) : null}
                </article>
              );

              return canOpenPrediction ? (
                <Link to={`/predecir-partidos/${match.id}`} key={match.id}>
                  {card}
                </Link>
              ) : (
                <div key={match.id} aria-disabled="true">
                  {card}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
