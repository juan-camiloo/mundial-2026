import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown, CircleCheck, Clock, Filter, Search, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import TeamLabel from "../components/TeamLabel";
import {
  formatScoreWithPenalty,
  getPenaltyWinnerLabel,
  hasMatchStarted,
  isPredictionClosed,
  type PenaltyWinner,
} from "../lib/predictions";
import { supabase } from "../lib/supabase";
import { buildTeamFlagMap, formatTeamName, type TeamFlagMap } from "../lib/teamFlags";
import {
  compareMatchesByTimeline,
  getMatchTimelineStatus,
  hasOfficialScore,
  isMatchFinishedForDisplay,
  MATCH_COLUMNS,
  type MatchRow,
} from "../lib/matches";
import { getTournamentPhaseLabel } from "../lib/tournament";
import {
  buildTeamLookup,
  getMatchTeam,
  TEAM_COLUMNS,
  type TeamLookup,
} from "../lib/teams";

type MatchFilterKey = "live" | "scheduled" | "finished" | "today" | "tomorrow";

type MatchPredictionRow = {
  id: string;
  match_id: string | null;
  pred_goals_a: number | null;
  pred_goals_b: number | null;
  pred_penalty_winner?: PenaltyWinner | null;
};

const MATCH_FILTERS: Array<{ key: MatchFilterKey; label: string }> = [
  { key: "live", label: "En juego" },
  { key: "scheduled", label: "Sin jugar" },
  { key: "finished", label: "Finalizados" },
  { key: "today", label: "Hoy" },
  { key: "tomorrow", label: "Mañana" },
];

const normalizeSearchText = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const getColombiaDateKey = (value: string | number | Date | null | undefined) => {
  if (value === null || value === undefined) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Bogota",
  }).format(date);
};

const getRelativeColombiaDateKey = (now: number, offsetDays: number) => {
  const todayKey = getColombiaDateKey(now);
  if (!todayKey) return null;

  const [year, month, day] = todayKey.split("-").map(Number);
  if ([year, month, day].some((part) => Number.isNaN(part))) return null;

  return new Date(Date.UTC(year, month - 1, day + offsetDays)).toISOString().slice(0, 10);
};

export default function Matches() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [predictionsByMatchId, setPredictionsByMatchId] = useState<Record<string, MatchPredictionRow>>({});
  const [teamFlags, setTeamFlags] = useState<TeamFlagMap>({});
  const [teamsById, setTeamsById] = useState<TeamLookup>({});
  const [matchSearch, setMatchSearch] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<MatchFilterKey[]>([]);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
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
  const visibleMatches = useMemo(() => {
    const normalizedQuery = normalizeSearchText(matchSearch);
    const selectedFilterSet = new Set(selectedFilters);
    const todayKey = getRelativeColombiaDateKey(currentTime, 0);
    const tomorrowKey = getRelativeColombiaDateKey(currentTime, 1);

    return [...matches]
      .sort((matchA, matchB) => compareMatchesByTimeline(matchA, matchB, currentTime))
      .filter((match) => {
        if (!normalizedQuery && selectedFilterSet.size === 0) return true;

        const teamA = getMatchTeam(teamsById, match.team_a_id, match.team_a_info, "Selección por definir");
        const teamB = getMatchTeam(teamsById, match.team_b_id, match.team_b_info, "Selección por definir");
        const phaseLabel = getTournamentPhaseLabel(match.phase, teamA.group_key ?? teamB.group_key);
        const searchableText = normalizeSearchText(
          [
            teamA.country,
            teamB.country,
            formatTeamName(teamA.country),
            formatTeamName(teamB.country),
            match.phase,
            phaseLabel,
          ].join(" ")
        );

        const matchesSearch = !normalizedQuery || searchableText.includes(normalizedQuery);
        if (!matchesSearch) return false;

        if (selectedFilterSet.size === 0) return true;

        const status = getMatchTimelineStatus(match, currentTime);
        const matchDateKey = getColombiaDateKey(match.match_date);

        return selectedFilters.some((filterKey) => {
          if (filterKey === "today") return matchDateKey === todayKey;
          if (filterKey === "tomorrow") return matchDateKey === tomorrowKey;
          return status === filterKey;
        });
      });
  }, [currentTime, matchSearch, matches, selectedFilters, teamsById]);

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

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userData.user || userError) {
        navigate("/login");
        setLoading(false);
        return;
      }

      const [
        { data, error: matchesError },
        { data: teams },
        { data: predictionRows, error: predictionsError },
      ] = await Promise.all([
        supabase.from("matches").select(MATCH_COLUMNS).order("match_date", { ascending: true }),
        supabase.from("teams").select(TEAM_COLUMNS),
        supabase
          .from("predictions")
          .select("id, match_id, pred_goals_a, pred_goals_b, pred_penalty_winner")
          .eq("user_id", userData.user.id),
      ]);

      if (matchesError) {
        setError("No pudimos cargar los partidos.");
        setLoading(false);
        return;
      }

      if (predictionsError) {
        setError("No pudimos cargar tus pronosticos.");
        setLoading(false);
        return;
      }

      const predictionMap = ((predictionRows ?? []) as MatchPredictionRow[]).reduce<
        Record<string, MatchPredictionRow>
      >((acc, prediction) => {
        if (prediction.match_id) acc[prediction.match_id] = prediction;
        return acc;
      }, {});

      setMatches(data ?? []);
      setPredictionsByMatchId(predictionMap);
      setTeamFlags(buildTeamFlagMap(teams ?? []));
      setTeamsById(buildTeamLookup(teams ?? []));
      setLoading(false);
    };

    loadMatches();
  }, [navigate]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!filterMenuOpen) return;

    const handlePointerDown = (event: Event) => {
      if (!filterMenuRef.current?.contains(event.target as Node)) {
        setFilterMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFilterMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [filterMenuOpen]);

  const toggleMatchFilter = (filterKey: MatchFilterKey) => {
    setSelectedFilters((currentFilters) =>
      currentFilters.includes(filterKey)
        ? currentFilters.filter((currentFilter) => currentFilter !== filterKey)
        : [...currentFilters, filterKey],
    );
  };

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
            <p>Los pronósticos se cierran 10 minutos antes del inicio del partido.</p>
          </div>

          <div className="matches-controls">
            <label className="matches-search">
              <span>Buscar partidos</span>
              <div className="matches-search-control">
                <Search size={18} aria-hidden="true" />
                <input
                  type="search"
                  value={matchSearch}
                  placeholder="Equipo o fase"
                  onChange={(event) => setMatchSearch(event.target.value)}
                />
              </div>
            </label>

            <div className="match-filter" ref={filterMenuRef}>
              <button
                className={`match-filter-button${selectedFilters.length > 0 ? " active" : ""}`}
                type="button"
                aria-haspopup="menu"
                aria-expanded={filterMenuOpen}
                onClick={() => setFilterMenuOpen((isOpen) => !isOpen)}
              >
                <Filter size={16} aria-hidden="true" />
                <span>Filtro</span>
                {selectedFilters.length > 0 ? (
                  <strong>{selectedFilters.length}</strong>
                ) : null}
                <ChevronDown
                  className={filterMenuOpen ? "open" : ""}
                  size={15}
                  aria-hidden="true"
                />
              </button>

              {filterMenuOpen ? (
                <div className="match-filter-menu" role="menu" aria-label="Filtros de partidos">
                  {MATCH_FILTERS.map((filterOption) => (
                    <label className="match-filter-option" key={filterOption.key}>
                      <input
                        type="checkbox"
                        checked={selectedFilters.includes(filterOption.key)}
                        onChange={() => toggleMatchFilter(filterOption.key)}
                      />
                      <span>{filterOption.label}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {loading ? (
          <div className="empty-state">Cargando partidos...</div>
        ) : error ? (
          <div className="empty-state">{error}</div>
        ) : matches.length === 0 ? (
          <div className="empty-state">Aún no hay partidos cargados.</div>
        ) : visibleMatches.length === 0 ? (
          <div className="empty-state">No encontramos partidos con esa busqueda.</div>
        ) : (
          <div className="matches-grid">
            {visibleMatches.map((match) => {
              const matchDate = new Date(match.match_date);
              const teamA = getMatchTeam(teamsById, match.team_a_id, match.team_a_info, "Selección por definir");
              const teamB = getMatchTeam(teamsById, match.team_b_id, match.team_b_info, "Selección por definir");
              const phaseLabel = getTournamentPhaseLabel(match.phase, teamA.group_key ?? teamB.group_key);
              const dateLabel = dateFormatter.format(matchDate);
              const timeLabel = timeFormatter.format(matchDate);
              const showScore = hasOfficialScore(match);
              const resultsPendingAfterWindow = !showScore && isMatchFinishedForDisplay(match, currentTime);
              const predictionClosed = isPredictionClosed(match, currentTime);
              const matchStarted = hasMatchStarted(match, currentTime);
              const canOpenPrediction = !showScore && !matchStarted && !predictionClosed;
              const userPrediction = predictionsByMatchId[match.id];
              const predictionLabel = userPrediction
                ? formatScoreWithPenalty({
                    goalsA: userPrediction.pred_goals_a,
                    goalsB: userPrediction.pred_goals_b,
                    penaltyWinner: userPrediction.pred_penalty_winner,
                    teamA: formatTeamName(teamA.country),
                    teamB: formatTeamName(teamB.country),
                  })
                : "Pendiente";
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

                  <div className={`match-prediction-summary${userPrediction ? " has-prediction" : ""}`}>
                    <span>{userPrediction ? "Pronosticado" : "Sin pronostico"}</span>
                    <strong>{predictionLabel}</strong>
                  </div>

                  {resultsPendingAfterWindow ? (
                    <p className="match-results-pending">
                      Aún no se han publicado resultados para este partido.
                    </p>
                  ) : null}

                  {penaltyWinnerLabel ? (
                    <div className="match-note">
                      <ShieldCheck size={15} aria-hidden="true" />
                      {penaltyWinnerWithFlag} ganó por penales.
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
