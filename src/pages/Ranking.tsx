import { useCallback, useEffect, useMemo, useState } from "react";
import { GitBranch, ListChecks, Medal, Search, Trophy, Users } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { MATCH_COLUMNS, type MatchRow } from "../lib/matches";
import { computePredictionScore, type PenaltyWinner } from "../lib/predictions";
import { supabase } from "../lib/supabase";
import {
  buildTeamFlagMap,
  buildTeamIsoMap,
  formatTeamName,
  getTeamFlag,
  getTeamFlagImage,
  normalizeTeamName,
  type TeamFlagMap,
  type TeamIsoMap,
} from "../lib/teamFlags";
import {
  buildTeamLookup,
  getMatchTeam,
  TEAM_COLUMNS,
  type TeamLookup,
  type TeamRow,
} from "../lib/teams";
import {
  buildWorldCupGroupsFromTeams,
  getWorldCupGroupForTeam,
} from "../lib/worldCupGroups";
import {
  calculateFifa2026GroupStanding,
  FIFA_2026_GROUP_KEYS,
  FIFA_2026_KNOCKOUT_PROGRESSION,
  getFifa2026Qualifiers,
  type Fifa2026GroupKey,
  type Fifa2026GroupMatch,
  type Fifa2026GroupStanding,
  type Fifa2026KnockoutRoundKey,
  type Fifa2026StandingRow,
  type Fifa2026TeamSeed,
} from "../lib/fifa2026";
import {
  inferKnockoutMatchNumberForMatch,
  parseKnockoutSourceRef,
  resolveKnockoutMatchNo,
} from "../lib/knockoutBracket";
import { getBracketStage, getGroupLabelFromPhase, isKnockoutMatch } from "../lib/tournament";

// ─── Types ───────────────────────────────────────────────────────────────────

type LeaderRow = {
  user_id: string;
  name: string | null;
  total_points: number | null;
  exact_hits: number | null;
  date_exact_hits?: number | null;
  current_date_exact_hits?: number | null;
  matchday_exact_hits?: number | null;
  round_exact_hits?: number | null;
  penalty_hits?: number | null;
  predictions_count: number | null;
  first_prediction_at?: string | null;
};

type LeaderboardPredictionRow = {
  user_id: string | null;
  created_at: string | null;
  pred_goals_a: number | null;
  pred_goals_b: number | null;
  pred_penalty_winner?: PenaltyWinner | null;
  match: MatchRow | MatchRow[] | null;
};

type CompleteBracketSlot = {
  id: string;
  matchNo: number | null;
  teamA: TeamRow | null;
  teamB: TeamRow | null;
  goalsA: number | null;
  goalsB: number | null;
  winnerId: string | null;
  penaltyWinner: boolean;
  isOfficial: boolean;
  matchTime: number | null;
};

type CompleteBracketRound = {
  key: Fifa2026KnockoutRoundKey;
  label: string;
  slots: CompleteBracketSlot[];
};

type TournamentSettingsRow = {
  knockout_stage_enabled: boolean | null;
};

const normalizeSearchText = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

// ─── Constants ───────────────────────────────────────────────────────────────

const COMPLETE_BRACKET_ROUNDS: Array<{
  key: Fifa2026KnockoutRoundKey;
  label: string;
  matchNumbers: number[];
}> = [
  { key: "round32", label: "Dieciseisavos", matchNumbers: Array.from({ length: 16 }, (_, i) => 73 + i) },
  { key: "round16", label: "Octavos",       matchNumbers: Array.from({ length: 8 },  (_, i) => 89 + i) },
  { key: "quarter", label: "Cuartos",       matchNumbers: Array.from({ length: 4 },  (_, i) => 97 + i) },
  { key: "semi",    label: "Semifinales",   matchNumbers: [101, 102] },
  { key: "final",   label: "Final",         matchNumbers: [104] },
  { key: "third",   label: "Tercer puesto", matchNumbers: [103] },
];

// ─── Small helpers ────────────────────────────────────────────────────────────

const sortGroupLabels = (a: string, b: string) =>
  a.localeCompare(b, "es", { numeric: true, sensitivity: "base" });

const getGroupKeyFromLabel = (label: string | null | undefined): Fifa2026GroupKey | null => {
  const m = (label ?? "").match(/\b(?:grupo|group)\s*([a-l])\b/i);
  return m?.[1] ? (m[1].toUpperCase() as Fifa2026GroupKey) : null;
};

const hasOfficialScore = (match: MatchRow) =>
  match.goals_a !== null && match.goals_b !== null;

const getWinnerId = (match: MatchRow) => {
  if (!hasOfficialScore(match)) return null;
  if ((match.goals_a ?? 0) > (match.goals_b ?? 0)) return match.team_a_id;
  if ((match.goals_b ?? 0) > (match.goals_a ?? 0)) return match.team_b_id;
  if (match.penalty_winner === "team_a") return match.team_a_id;
  if (match.penalty_winner === "team_b") return match.team_b_id;
  return null;
};

const getMatchInfo = (match: MatchRow, side: "A" | "B") =>
  side === "A" ? match.team_a_info : match.team_b_info;

const hasRelatedTeam = (team: TeamRow | TeamRow[] | null | undefined) =>
  Array.isArray(team) ? team.length > 0 : Boolean(team);

const isPlaceholderTeam = (team: TeamRow | null) => {
  const label = normalizeTeamName(team?.country);
  return !label || /por definir|winner|ganador|perdedor|\b[wl]\d+/.test(label);
};

const getNullableMatchTeam = (
  teamsById: TeamLookup,
  match: MatchRow,
  side: "A" | "B",
) => {
  const teamId = side === "A" ? match.team_a_id : match.team_b_id;
  const info   = getMatchInfo(match, side);
  if (!teamId && !hasRelatedTeam(info)) return null;
  const team = getMatchTeam(teamsById, teamId, info, "Selección por definir");
  return isPlaceholderTeam(team) ? null : team;
};

const formatGoalDifference = (value: number) => (value > 0 ? `+${value}` : String(value));

const getMatchTime = (match: MatchRow) => new Date(match.match_date).getTime();

const getColombiaDateKey = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Bogota",
  }).format(date);
};

const getSingleMatch = (match: MatchRow | MatchRow[] | null) =>
  Array.isArray(match) ? match[0] ?? null : match;

const getDateSortTime = (value: string | null | undefined) => {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
};

const buildFirstPredictionAtByUser = (predictions: LeaderboardPredictionRow[]) =>
  predictions.reduce<Record<string, string>>((acc, prediction) => {
    if (!prediction.user_id || !prediction.created_at) return acc;

    const predictionTime = getDateSortTime(prediction.created_at);
    if (predictionTime === Number.MAX_SAFE_INTEGER) return acc;

    const currentTime = getDateSortTime(acc[prediction.user_id]);
    if (predictionTime < currentTime) {
      acc[prediction.user_id] = prediction.created_at;
    }

    return acc;
  }, {});

const buildDateExactHitsByUser = (predictions: LeaderboardPredictionRow[]) => {
  const finishedPredictions = predictions
    .map((prediction) => ({
      prediction,
      match: getSingleMatch(prediction.match),
    }))
    .filter(({ match }) => match && hasOfficialScore(match));

  const latestMatchTime = finishedPredictions.reduce((latest, { match }) => {
    const matchTime = getMatchTime(match as MatchRow);
    return Number.isNaN(matchTime) ? latest : Math.max(latest, matchTime);
  }, -Infinity);

  if (!Number.isFinite(latestMatchTime)) return null;

  const latestDateKey = getColombiaDateKey(new Date(latestMatchTime).toISOString());
  if (!latestDateKey) return null;

  return finishedPredictions.reduce<Record<string, number>>((acc, { prediction, match }) => {
    if (!prediction.user_id || !match) return acc;
    if (getColombiaDateKey(match.match_date) !== latestDateKey) return acc;

    const score = computePredictionScore(prediction, match);
    if (score.exact) {
      acc[prediction.user_id] = (acc[prediction.user_id] ?? 0) + 1;
    }

    return acc;
  }, {});
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TeamStack({
  team,
  teamFlags,
  isoMap,
  compact = false,
}: {
  team: TeamRow;
  teamFlags: TeamFlagMap;
  isoMap: TeamIsoMap;
  compact?: boolean;
}) {
  // DB iso_code -> flag image; subdivision flags use embedded SVGs.
  const flagImage =
    team.flag && team.flag.startsWith("http")
      ? team.flag
      : getTeamFlagImage(team.country, isoMap);

  const flag = flagImage ? "" : getTeamFlag(team.country, teamFlags, isoMap);

  return (
    <span className={`team-stack${compact ? " compact" : ""}`}>
      {flagImage ? (
        <img className="team-stack-flag-img" src={flagImage} alt="" loading="lazy" aria-hidden="true" />
      ) : flag ? (
        <span className="team-stack-flag" aria-hidden="true">{flag}</span>
      ) : (
        <span className="team-stack-placeholder" aria-hidden="true" />
      )}
      <span className="team-stack-name">{formatTeamName(team.country)}</span>
    </span>
  );
}

function BracketTeamTile({
  team,
  score,
  winner,
  teamFlags,
  isoMap,
}: {
  team: TeamRow | null;
  score: number | null;
  winner: boolean;
  teamFlags: TeamFlagMap;
  isoMap: TeamIsoMap;
}) {
  if (!team) {
    return (
      <div className="bracket-team-tile empty">
        <div className="bracket-team-main">
          <span className="bracket-flag-placeholder" />
          <span className="bracket-team-name">Por definir</span>
        </div>
        <span className="bracket-score-mini">-</span>
      </div>
    );
  }

  const flagImage =
    team.flag && team.flag.startsWith("http")
      ? team.flag
      : getTeamFlagImage(team.country, isoMap);

  const flag  = flagImage ? "" : getTeamFlag(team.country, teamFlags, isoMap);
  const label = formatTeamName(team.country);

  return (
    <div className={`bracket-team-tile${winner ? " winner" : ""}`} title={label}>
      <div className="bracket-team-main">
        <div className="bracket-flag-box">
          {flagImage  ? <img src={flagImage} alt="" loading="lazy" /> :
           flag       ? <span>{flag}</span> :
                        <span className="bracket-flag-placeholder" />}
        </div>
        <span className="bracket-team-name">{label}</span>
      </div>
      <span className="bracket-score-mini">{score ?? "-"}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Ranking() {
  const [matches,        setMatches]        = useState<MatchRow[]>([]);
  const [teamsById,      setTeamsById]      = useState<TeamLookup>({});
  const [teamFlags,      setTeamFlags]      = useState<TeamFlagMap>({});
  const [isoMap,         setIsoMap]         = useState<TeamIsoMap>({});
  const [rows,           setRows]           = useState<LeaderRow[]>([]);
  const [tournamentLoading,  setTournamentLoading]  = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [tournamentError,    setTournamentError]    = useState<string | null>(null);
  const [leaderboardError,   setLeaderboardError]   = useState<string | null>(null);
  const [dateExactHitsByUser, setDateExactHitsByUser] = useState<Record<string, number> | null>(null);
  const [firstPredictionAtByUser, setFirstPredictionAtByUser] = useState<Record<string, string> | null>(null);
  const [knockoutStageEnabled, setKnockoutStageEnabled] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showTeamsOrPlayers: "teams" | "players" =
    searchParams.get("vista") === "torneo" ? "teams" : "players";
  const predictionDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeZone: "America/Bogota",
      }),
    []
  );

  // ── Data loading ──────────────────────────────────────────

  const loadTournament = useCallback(async () => {
    setTournamentLoading(true);
    setTournamentError(null);

    const [
      { data: matchRows, error: matchesError },
      { data: teamRows,  error: teamsError },
      { data: settingsRow },
    ] = await Promise.all([
      supabase.from("matches").select(MATCH_COLUMNS).order("match_date", { ascending: true }),
      supabase.from("teams").select(TEAM_COLUMNS).order("group_key,group_seed_order,country", { ascending: true }),
      supabase
        .from("tournament_settings")
        .select("knockout_stage_enabled")
        .eq("id", true)
        .maybeSingle(),
    ]);

    if (matchesError || teamsError) {
      setTournamentError("No pudimos cargar la tabla del torneo.");
      setTournamentLoading(false);
      return;
    }

    const teams = (teamRows ?? []) as TeamRow[];
    setMatches((matchRows ?? []) as MatchRow[]);
    setTeamsById(buildTeamLookup(teams));
    setTeamFlags(buildTeamFlagMap(teams));
    setKnockoutStageEnabled(Boolean((settingsRow as TournamentSettingsRow | null)?.knockout_stage_enabled));
    setIsoMap(buildTeamIsoMap(teams));        // ← new: iso codes from DB
    setTournamentLoading(false);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(loadTournament, 0);
    return () => window.clearTimeout(id);
  }, [loadTournament]);

  // ── Auth guard ────────────────────────────────────────────

  useEffect(() => {
    const checkUser = async () => {
      const { data, error: authError } = await supabase.auth.getUser();
      if (!data.user || authError) navigate("/login");
    };
    checkUser();
  }, [navigate]);

  // ── Leaderboard ───────────────────────────────────────────

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLeaderboardLoading(true);
      setLeaderboardError(null);
      const [
        { data, error: leaderboardLoadError },
        { data: predictionRows, error: predictionRowsError },
      ] = await Promise.all([
        supabase.rpc("get_leaderboard"),
        supabase
          .from("predictions")
          .select(`
            user_id,
            created_at,
            pred_goals_a,
            pred_goals_b,
            pred_penalty_winner,
            match:matches (${MATCH_COLUMNS})
          `),
      ]);
      if (leaderboardLoadError) {
        setLeaderboardError("No pudimos cargar el ranking. Aplica la migración de leaderboard en Supabase.");
        setLeaderboardLoading(false);
        return;
      }
      const nextRows = (data ?? []) as LeaderRow[];
      const typedPredictionRows = (predictionRows ?? []) as LeaderboardPredictionRow[];
      const predictionUserIds = new Set(typedPredictionRows.map((prediction) => prediction.user_id).filter(Boolean));
      const hasPredictionCoverage = nextRows.every(
        (row) => (row.predictions_count ?? 0) === 0 || predictionUserIds.has(row.user_id)
      );

      setDateExactHitsByUser(
        predictionRowsError || !hasPredictionCoverage
          ? null
          : buildDateExactHitsByUser(typedPredictionRows)
      );
      setFirstPredictionAtByUser(
        predictionRowsError || !hasPredictionCoverage
          ? null
          : buildFirstPredictionAtByUser(typedPredictionRows)
      );
      setRows(nextRows);
      setLeaderboardLoading(false);
    };
    loadLeaderboard();
  }, []);

  // ── Derived tournament data ───────────────────────────────

  const {
    groups,
    bracketRounds,
    qualifiedTeamIds,
    qualifiedThirdTeamIds,
    thirdPlacesOfficial,
    thirdPlaceRows,
  } = useMemo(() => {
    const allTeams     = Object.values(teamsById);

    // ── Build group seeds from DB (teams.group_key) ──────────
    //    Each TeamRow already knows its group; no hardcoded list needed.
    const worldCupGroups = buildWorldCupGroupsFromTeams(allTeams);

    const groupByTeamId = new Map<string, Fifa2026GroupKey>();
    allTeams.forEach((team) => {
      if (!team.group_key) return;
      const key = team.group_key.toUpperCase() as Fifa2026GroupKey;
      if (FIFA_2026_GROUP_KEYS.includes(key)) groupByTeamId.set(team.id, key);
    });

    const groupSeeds = worldCupGroups.map((group) => ({
      key:   group.key,
      label: group.label,
      seeds: group.teams.map((team, index): Fifa2026TeamSeed => ({
        team,
        group:     group.key,
        seedOrder: team.group_seed_order ?? index,
      })),
    }));

    // ── Partition matches into group / knockout ──────────────
    const groupMatches: Fifa2026GroupMatch[] = [];
    const bracketMatchesByRound = new Map<Fifa2026KnockoutRoundKey, MatchRow[]>();
    
    matches.forEach((match) => {
      const knockout = isKnockoutMatch(match);

      const teamA = knockout
        ? getNullableMatchTeam(teamsById, match, "A")
        : getMatchTeam(teamsById, match.team_a_id, match.team_a_info, "Selección por definir");
      const teamB = knockout
        ? getNullableMatchTeam(teamsById, match, "B")
        : getMatchTeam(teamsById, match.team_b_id, match.team_b_info, "Selección por definir");

      if (knockout) {
        const stage       = getBracketStage(match.phase);
        const roundConfig = COMPLETE_BRACKET_ROUNDS.find((r) => r.key === stage.key);
        if (!roundConfig) return;

        const bucket = bracketMatchesByRound.get(roundConfig.key) ?? [];
        bucket.push(match);
        bracketMatchesByRound.set(roundConfig.key, bucket);
        return;
      }

      if (!teamA || !teamB) return;

      // For group matches: look up group from team.group_key, then fall back to phase
      const group =
        groupByTeamId.get(teamA.id) ??
        groupByTeamId.get(teamB.id) ??
        getGroupKeyFromLabel(getWorldCupGroupForTeam(teamA.country, allTeams)) ??
        getGroupKeyFromLabel(getWorldCupGroupForTeam(teamB.country, allTeams)) ??
        getGroupKeyFromLabel(getGroupLabelFromPhase(match.phase));

      if (!group) return;

      groupMatches.push({
        id:      match.id,
        group,
        teamAId: teamA.id,
        teamBId: teamB.id,
        goalsA:  match.goals_a,
        goalsB:  match.goals_b,
      });
    });

    // ── Calculate group standings ────────────────────────────
    const calculatedGroups = groupSeeds
      .map((g): Fifa2026GroupStanding =>
        calculateFifa2026GroupStanding(g.key, g.seeds, groupMatches)
      )
      .sort((a, b) => sortGroupLabels(a.label, b.label));

    const qualifiers         = getFifa2026Qualifiers(calculatedGroups);
    const groupRowsByGroup   = new Map(calculatedGroups.map((g) => [g.group, g.rows]));
    const isGroupStandingReady = (group: Fifa2026GroupKey) => {
      const rowsForGroup = groupRowsByGroup.get(group);
      if (!rowsForGroup || rowsForGroup.length !== 4) return false;
      return rowsForGroup.every((row) => row.played === 3 && row.rankStatus === "official");
    };

    const allGroupStandingsReady = FIFA_2026_GROUP_KEYS.every(isGroupStandingReady);
    const thirdPlaceRankingReady =
      allGroupStandingsReady &&
      qualifiers.thirdPlacedRanking.every((row) => row.rankStatus === "official");
    // ── Build bracket ────────────────────────────────────────
    const hasBracketMatches = COMPLETE_BRACKET_ROUNDS.some(
      (round) => (bracketMatchesByRound.get(round.key) ?? []).length > 0
    );

    const completeBracketRounds = hasBracketMatches ? COMPLETE_BRACKET_ROUNDS.map((round): CompleteBracketRound => {
      const matchesForRound = [...(bracketMatchesByRound.get(round.key) ?? [])].sort((a, b) => {
        const aMatchNo = resolveKnockoutMatchNo(a);
        const bMatchNo = resolveKnockoutMatchNo(b);

        return (
          (aMatchNo ?? Number.MAX_SAFE_INTEGER) - (bMatchNo ?? Number.MAX_SAFE_INTEGER) ||
          getMatchTime(a) - getMatchTime(b) ||
          a.id.localeCompare(b.id)
        );
      });
      const usedMatchIds = new Set<string>();

      return {
        key: round.key,
        label: round.label,
        slots: round.matchNumbers.map((matchNo): CompleteBracketSlot => {
          const match =
            matchesForRound.find(
              (candidate) => !usedMatchIds.has(candidate.id) && resolveKnockoutMatchNo(candidate) === matchNo
            ) ??
            matchesForRound.find((candidate) => {
              if (usedMatchIds.has(candidate.id)) return false;
              const candidateNo = inferKnockoutMatchNumberForMatch(candidate, matches);
              return candidateNo === null || !round.matchNumbers.includes(candidateNo);
            });

          if (!match) {
            return {
              id: `${round.key}-${matchNo}`,
              matchNo,
              teamA: null,
              teamB: null,
              goalsA: null,
              goalsB: null,
              winnerId: null,
              penaltyWinner: false,
              isOfficial: false,
              matchTime: null,
            };
          }

          usedMatchIds.add(match.id);

          const goalsA = match.goals_a ?? null;
          const goalsB = match.goals_b ?? null;
          const winnerId = getWinnerId(match);

          return {
            id: match.id,
            matchNo,
            teamA: getNullableMatchTeam(teamsById, match, "A"),
            teamB: getNullableMatchTeam(teamsById, match, "B"),
            goalsA,
            goalsB,
            winnerId,
            penaltyWinner: Boolean(winnerId) && goalsA !== null && goalsB !== null && goalsA === goalsB,
            isOfficial: true,
            matchTime: getMatchTime(match),
          };
        }),
      };
    }) : [];

    const bracketSlotsByMatchNo = new Map<number, CompleteBracketSlot>();
    completeBracketRounds.forEach((round) => {
      round.slots.forEach((slot) => {
        if (slot.matchNo !== null) bracketSlotsByMatchNo.set(slot.matchNo, slot);
      });
    });

    const getSourceProjection = (sourceRef: string) => {
      const source = parseKnockoutSourceRef(sourceRef);
      if (!source) return null;

      const sourceSlot = bracketSlotsByMatchNo.get(source.matchNo);
      if (!sourceSlot?.winnerId) return null;

      const winnerTeam =
        sourceSlot.winnerId === sourceSlot.teamA?.id
          ? sourceSlot.teamA
          : sourceSlot.winnerId === sourceSlot.teamB?.id
            ? sourceSlot.teamB
            : null;
      const loserTeam =
        sourceSlot.winnerId === sourceSlot.teamA?.id
          ? sourceSlot.teamB
          : sourceSlot.winnerId === sourceSlot.teamB?.id
            ? sourceSlot.teamA
            : null;
      const team = source.result === "W" ? winnerTeam : loserTeam;

      return team;
    };

    const projectedBracketRounds = completeBracketRounds.map((round): CompleteBracketRound => ({
      ...round,
      slots: round.slots.map((slot) => {
        if (slot.isOfficial || slot.matchNo === null) return slot;

        const progression = FIFA_2026_KNOCKOUT_PROGRESSION.find(
          (candidate) => candidate.matchNo === slot.matchNo
        );
        if (!progression) return slot;

        const projectedHome = getSourceProjection(progression.homeFrom);
        const projectedAway = getSourceProjection(progression.awayFrom);
        const hasHome = Boolean(projectedHome);
        const hasAway = Boolean(projectedAway);

        if (!hasHome && !hasAway) return slot;
        if (hasHome && hasAway) return slot;

        return {
          ...slot,
          teamA: projectedHome ?? null,
          teamB: projectedAway ?? null,
        };
      }),
    }));

    const automaticQualifiedRows = qualifiers.automatic.filter((row) => isGroupStandingReady(row.group));
    const projectedThirdRows = qualifiers.qualifiedThirdPlaced;
    const qualifiedTeamIds = new Set(
      [...automaticQualifiedRows, ...projectedThirdRows].map((r) => r.team.id)
    );
    const qualifiedThirdTeamIds = new Set(projectedThirdRows.map((r) => r.team.id));

    return {
      groups: calculatedGroups,
      bracketRounds: projectedBracketRounds,
      qualifiedTeamIds,
      qualifiedThirdTeamIds,
      thirdPlacesOfficial: thirdPlaceRankingReady,
      thirdPlaceRows: qualifiers.thirdPlacedRanking,
    };
  }, [matches, teamsById]);

  useEffect(() => {
    // Use Vite env flag instead of Node `process` to avoid TS issues in the browser
    const viteEnv = (import.meta as unknown as { env?: { DEV?: boolean } }).env;
    if (!viteEnv?.DEV) return;
    try {
      console.debug("Ranking debug: matches count", matches.length);

      // Inferred match numbers for knockout matches
      const knockoutMatches = matches.filter((m) => m.is_knockout);
      knockoutMatches.forEach((m) => {
        const resolved = resolveKnockoutMatchNo(m);
        const inferred = inferKnockoutMatchNumberForMatch(m, matches);

        const aInfo = getMatchInfo(m, "A");
        const bInfo = getMatchInfo(m, "B");
        const aName = Array.isArray(aInfo) ? aInfo[0]?.country : aInfo?.country;
        const bName = Array.isArray(bInfo) ? bInfo[0]?.country : bInfo?.country;

        const resolvedA = aName ?? (m.team_a_id ? teamsById[m.team_a_id]?.country : undefined) ?? m.team_a_id ?? 'UNKNOWN';
        const resolvedB = bName ?? (m.team_b_id ? teamsById[m.team_b_id]?.country : undefined) ?? m.team_b_id ?? 'UNKNOWN';

        console.debug(
          `Ranking debug: match ${m.id} ${resolvedA} vs ${resolvedB} match_number=${m.match_number} resolved=${resolved} inferred=${inferred}`
        );
      });

      // Progression projection
      console.debug("Ranking debug: progression projections:");
      FIFA_2026_KNOCKOUT_PROGRESSION.forEach((p) => {
        const home = (bracketRounds || []).flatMap((r) => r.slots).find((s) => s.matchNo === p.matchNo)?.teamA;
        const away = (bracketRounds || []).flatMap((r) => r.slots).find((s) => s.matchNo === p.matchNo)?.teamB;
        console.debug(
          `M${p.matchNo}: ${p.homeFrom} -> ${home?.country ?? home?.id ?? 'null'} ; ${p.awayFrom} -> ${away?.country ?? away?.id ?? 'null'}`
        );
      });
      // Round slot ordering
      console.debug('Ranking debug: round slot ordering:');
      (bracketRounds || []).forEach((r) => {
        console.debug(`Round ${r.key}: ${r.slots.map((s, i) => `idx=${i}+M${s.matchNo ?? 'nil'}:${s.teamA?.country ?? s.teamA?.id ?? 'null'}-vs-${s.teamB?.country ?? s.teamB?.id ?? 'null'}`).join(' | ')}`);
      });
    } catch (err) {
      console.error("Ranking debug error", err);
    }
  }, [matches, teamsById, bracketRounds]);

  // ── Leaderboard sort ──────────────────────────────────────

  const getRowDateExactHits = useCallback(
    (row: LeaderRow) =>
      row.date_exact_hits ??
      row.current_date_exact_hits ??
      row.matchday_exact_hits ??
      row.round_exact_hits ??
      dateExactHitsByUser?.[row.user_id] ??
      null,
    [dateExactHitsByUser]
  );

  const getRowFirstPredictionAt = useCallback(
    (row: LeaderRow) => row.first_prediction_at ?? firstPredictionAtByUser?.[row.user_id] ?? null,
    [firstPredictionAtByUser]
  );

  const getFirstPredictionAtLabel = useCallback(
    (value: string | null) => {
      if (!value) return "Sin pronósticos";
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? "Sin pronóstico" : predictionDateFormatter.format(date);
    },
    [predictionDateFormatter]
  );

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const pts = (b.total_points ?? 0) - (a.total_points ?? 0);
        if (pts !== 0) return pts;
        const dateExact = (getRowDateExactHits(b) ?? 0) - (getRowDateExactHits(a) ?? 0);
        if (dateExact !== 0) return dateExact;
        const ex = (b.exact_hits ?? 0) - (a.exact_hits ?? 0);
        if (ex !== 0) return ex;
        return getDateSortTime(getRowFirstPredictionAt(a)) - getDateSortTime(getRowFirstPredictionAt(b));
      }),
    [getRowDateExactHits, getRowFirstPredictionAt, rows],
  );

  const visiblePlayerRows = useMemo(() => {
    const normalizedQuery = normalizeSearchText(playerSearch);
    if (!normalizedQuery) return sorted;

    return sorted.filter((row) =>
      normalizeSearchText(row.name ?? "Jugador").includes(normalizedQuery)
    );
  }, [playerSearch, sorted]);

  // ─────────────────────────────────────────────────────────
  // Render: Players ranking
  // ─────────────────────────────────────────────────────────

  if (showTeamsOrPlayers === "players") {
    return (
      <main className="page">
        <div className="matches-shell">
          <header className="matches-header ranking-header">
            <span className="pill">
              <Trophy size={14} aria-hidden="true" />
              Clasificación
            </span>
            <h1>Ranking de jugadores</h1>
            <p>Desempate: exactos en la fecha, exactos totales y pronóstico más antiguo.</p>
            <label className="matches-search ranking-search" aria-label="Buscar jugador">
              <div className="matches-search-control">
                <Search size={18} aria-hidden="true" />
                <input
                  type="search"
                  value={playerSearch}
                  placeholder="Nombre del participante"
                  onChange={(event) => setPlayerSearch(event.target.value)}
                />
              </div>
            </label>
          </header>

          {leaderboardLoading ? (
            <div className="empty-state">Cargando ranking...</div>
          ) : leaderboardError ? (
            <div className="empty-state">{leaderboardError}</div>
          ) : sorted.length === 0 ? (
            <div className="empty-state">Aún no hay datos en el ranking.</div>
          ) : visiblePlayerRows.length === 0 ? (
            <div className="empty-state">No encontramos jugadores con esa busqueda.</div>
          ) : (
            <>
              <section className="summary-grid">
                <div className="summary-card">
                  <Users size={22} aria-hidden="true" />
                  <span>Participantes</span>
                  <strong>{playerSearch.trim() ? `${visiblePlayerRows.length}/${sorted.length}` : sorted.length}</strong>
                </div>

                <div className="summary-card">
                  <Trophy size={22} aria-hidden="true" />
                  <span>Líder</span>
                  <strong>{sorted[0].name ?? "Jugador"}</strong>
                </div>
              </section>

              <section className="ranking-list">
                {visiblePlayerRows.map((row) => {
                  const rankingIndex = sorted.findIndex((sortedRow) => sortedRow.user_id === row.user_id);
                  const rankPosition = rankingIndex >= 0 ? rankingIndex + 1 : 0;
                  const isPodium = rankingIndex >= 0 && rankingIndex < 3;

                  return (
                    <Link
                      className="ranking-row ranking-row-link"
                      key={row.user_id}
                      to={`/perfil/${row.user_id}`}
                      aria-label={`Ver pronósticos de ${row.name ?? "Jugador"}`}
                    >
                      <div className="rank-left">
                        <span className={`rank-badge rank-${isPodium ? rankingIndex + 1 : "default"}`}>
                          {isPodium ? <Medal size={17} aria-hidden="true" /> : rankPosition}
                        </span>
                        <div className="rank-player-info">
                          <strong>{row.name ?? "Jugador"}</strong>
                          <small>
                            Pronósticos: {row.predictions_count ?? 0}
                          </small>
                          <dl className="rank-tiebreaks" aria-label="Criterios de desempate">
                            <div>
                              <dt>Primer Pronóstico</dt>
                              <dd>{getFirstPredictionAtLabel(getRowFirstPredictionAt(row))}</dd>
                            </div>
                            <div>
                              <dt>Resultados exactos/fecha</dt>
                              <dd>{getRowDateExactHits(row) ?? "0"}</dd>
                            </div>
                            <div>
                              <dt>Resultados exactos/torneo</dt>
                              <dd>{row.exact_hits ?? 0}</dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                      <div className="rank-points">
                        <span>Puntos</span>
                        <strong>{row.total_points ?? 0}</strong>
                      </div>
                    </Link>
                  );
                })}
              </section>
            </>
          )}
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────────────
  // Render: Tournament view
  // ─────────────────────────────────────────────────────────

  if (showTeamsOrPlayers === "teams") {
    return (
      <main className="page tournament-page">
        <div className="tournament-shell">
          <header className="matches-header tournament-header">
            <div>
              <span className="pill">
                <Trophy size={14} aria-hidden="true" />
                Ranking del torneo
              </span>
              <h1>Tablas de posiciones</h1>
              <p>
                Posiciones de grupos, tabla de mejores terceros actualizada y resultados de la fase final.
              </p>
            </div>

          </header>

          {tournamentLoading ? (
            <div className="empty-state">Cargando torneo...</div>
          ) : tournamentError ? (
            <div className="empty-state">{tournamentError}</div>
          ) : (
            <>
              {/* ── Group standings ── */}
              <section className="rule-block tournament-section">
                <div className="section-header">
                  <span className="pill">
                    <ListChecks size={14} aria-hidden="true" />
                    Grupos
                  </span>
                </div>

                <div className="groups-grid">
                  {groups.map((group) => (
                    <article className="group-card" key={group.label}>
                      <div className="group-card-title">
                        <h3>{group.label}</h3>
                      </div>

                      <div className="standings-table standings-table-full">
                        <div className="standings-row standings-head">
                          <span>#</span>
                          <span>Selección</span>
                          <span>PTS</span>
                          <span>PJ</span>
                          <span>PG</span>
                          <span>PE</span>
                          <span>PP</span>
                          <span>GF</span>
                          <span>GC</span>
                          <span>DG</span>
                          <span>Estado</span>
                        </div>

                        {group.rows.map((row, index) => {
                          const isDirect   = index < 2;
                          const isBestThird = index === 2 && qualifiedThirdTeamIds.has(row.team.id);
                          const isQualified = qualifiedTeamIds.has(row.team.id);
                          const status = isDirect
                            ? "Clasifica"
                            : isBestThird? "Clasifica": "Eliminado";

                          return (
                            <div
                              className={`standings-row${isQualified ? " qualified" : ""}${isBestThird ? " best-third" : ""}`}
                              key={row.team.id}
                            >
                              <span className="standing-rank">{index + 1}</span>
                              <TeamStack team={row.team} teamFlags={teamFlags} isoMap={isoMap} compact />
                              <strong>{row.points}</strong>
                              <span>{row.played}</span>
                              <span>{row.won}</span>
                              <span>{row.drawn}</span>
                              <span>{row.lost}</span>
                              <span>{row.goalsFor}</span>
                              <span>{row.goalsAgainst}</span>
                              <span>{formatGoalDifference(row.goalDifference)}</span>
                              <span className="standing-status">{status}</span>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              {/* ── Best third-placed ranking ── */}
              <section className="rule-block tournament-section">
                <div className="section-header">
                  <span className="pill">
                    <ListChecks size={14} aria-hidden="true" />
                    Mejores terceros
                  </span>
                </div>

                <div className="standings-table third-place-table">
                  <div className="standings-row standings-head">
                    <span>#</span>
                    <span>Selección</span>
                    <span>Grupo</span>
                    <span>PTS</span>
                    <span>DG</span>
                    <span>GF</span>
                    <span>Estado</span>
                  </div>

                  {thirdPlaceRows.map((row: Fifa2026StandingRow, index: number) => {
                    const qualified = qualifiedThirdTeamIds.has(row.team.id);
                    return (
                      <div
                        className={`standings-row${qualified ? " qualified best-third" : ""}`}
                        key={row.team.id}
                      >
                        <span className="standing-rank">{index + 1}</span>
                        <TeamStack team={row.team} teamFlags={teamFlags} isoMap={isoMap} compact />
                        <span>{row.group}</span>
                        <strong>{row.points}</strong>
                        <span>{formatGoalDifference(row.goalDifference)}</span>
                        <span>{row.goalsFor}</span>
                        <span className="standing-status">
                          {qualified ? (thirdPlacesOfficial ? "Clasifica" : "Zona mejor 3") : thirdPlacesOfficial ? "Eliminado" : "Pendiente"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* ── Bracket ── */}
              {knockoutStageEnabled ? (
              <section className="rule-block tournament-section">
                <div className="section-header">
                  <span className="pill">
                    <GitBranch size={14} aria-hidden="true" />
                    Fases finales
                  </span>
                  <h2>Rama del torneo</h2>
                </div>

                  <div className="bracket-scroll">
                    <div className="bracket-board">
                      {bracketRounds.map((round) => (
                        <section
                          className={`bracket-stage ${round.key}`}
                          key={round.key}
                          aria-label={round.label}
                        >
                          <header className="bracket-stage-header">
                            <div className="bracket-stage-title">{round.label}</div>
                          </header>

                          <div className="bracket-stage-matches">
                            {round.slots.map((slot) => {
                              const teamAWinner = slot.winnerId === slot.teamA?.id;
                              const teamBWinner = slot.winnerId === slot.teamB?.id;

                              return (
                                <article
                                  className="bracket-match"
                                  key={slot.id}
                                  aria-label={`${round.label}`}
                                >
                                  <span className="bracket-entry-line" aria-hidden="true" />

                                  <BracketTeamTile
                                    team={slot.teamA}
                                    score={slot.goalsA}
                                    winner={teamAWinner}
                                    teamFlags={teamFlags}
                                    isoMap={isoMap}
                                  />
                                  <BracketTeamTile
                                    team={slot.teamB}
                                    score={slot.goalsB}
                                    winner={teamBWinner}
                                    teamFlags={teamFlags}
                                    isoMap={isoMap}
                                  />

                                  {slot.penaltyWinner ? (
                                    <span className="bracket-penalty-note" title="Definido por penales">
                                      P
                                    </span>
                                  ) : null}
                                </article>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  </div>
              </section>
              ) : null}
            </>
          )}
        </div>
      </main>
    );
  }

  return null;
}
