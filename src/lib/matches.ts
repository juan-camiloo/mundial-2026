import type { PenaltyWinner } from "./predictions";
import type { TeamRow } from "./teams";

export const MATCH_COLUMNS =
  "id, match_date, prediction_deadline, goals_a, goals_b, phase, supports_penalties, penalty_winner, is_knockout, team_a_id, team_b_id, match_number, team_a_info:teams!matches_team_a_id_fkey(id, country, flag, iso_code, group_key, group_seed_order), team_b_info:teams!matches_team_b_id_fkey(id, country, flag, iso_code, group_key, group_seed_order)";

export type MatchRow = {
  id: string;
  team_a_id: string | null;
  team_b_id: string | null;
  team_a_info?: TeamRow | TeamRow[] | null;
  team_b_info?: TeamRow | TeamRow[] | null;
  phase: string | null;
  match_date: string;
  prediction_deadline: string | null;
  goals_a: number | null;
  goals_b: number | null;
  supports_penalties?: boolean | null;
  penalty_winner?: PenaltyWinner | null;
  is_knockout?: boolean | null;
  match_number?: number | null;
};

export type MatchTimelineStatus = "live" | "scheduled" | "finished";

export const RESULT_PUBLICATION_WINDOW_MS = 3.5 * 60 * 60 * 1000;

export const hasOfficialScore = (match: MatchRow | null | undefined) =>
  match?.goals_a !== null &&
  match?.goals_a !== undefined &&
  match?.goals_b !== null &&
  match?.goals_b !== undefined;

export const getMatchDateTime = (match: Pick<MatchRow, "match_date"> | null | undefined) => {
  if (!match?.match_date) return Number.MAX_SAFE_INTEGER;

  const time = new Date(match.match_date).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
};

export const isMatchPastResultWindow = (
  match: Pick<MatchRow, "match_date"> | null | undefined,
  now = Date.now(),
) => {
  const matchTime = getMatchDateTime(match);
  return matchTime !== Number.MAX_SAFE_INTEGER && now >= matchTime + RESULT_PUBLICATION_WINDOW_MS;
};

export const isMatchFinishedForDisplay = (
  match: MatchRow | null | undefined,
  now = Date.now(),
) => hasOfficialScore(match) || isMatchPastResultWindow(match, now);

export const getMatchTimelineStatus = (
  match: MatchRow | null | undefined,
  now = Date.now(),
): MatchTimelineStatus => {
  if (!match) return "finished";
  if (isMatchFinishedForDisplay(match, now)) return "finished";

  const matchTime = getMatchDateTime(match);
  return matchTime !== Number.MAX_SAFE_INTEGER && now >= matchTime ? "live" : "scheduled";
};

const getTimelineStatusRank = (status: MatchTimelineStatus) => {
  if (status === "live") return 0;
  if (status === "scheduled") return 1;
  return 2;
};

const getMatchNumber = (match: MatchRow | null | undefined) =>
  match?.match_number ?? Number.MAX_SAFE_INTEGER;

export const compareMatchesByTimeline = (
  matchA: MatchRow | null | undefined,
  matchB: MatchRow | null | undefined,
  now = Date.now(),
) => {
  const statusA = getMatchTimelineStatus(matchA, now);
  const statusB = getMatchTimelineStatus(matchB, now);
  const statusDiff = getTimelineStatusRank(statusA) - getTimelineStatusRank(statusB);
  if (statusDiff !== 0) return statusDiff;

  const timeA = getMatchDateTime(matchA);
  const timeB = getMatchDateTime(matchB);

  if (timeA !== timeB) {
    return statusA === "finished" ? timeB - timeA : timeA - timeB;
  }

  return getMatchNumber(matchA) - getMatchNumber(matchB);
};

export const sortMatchesByTimeline = <T extends MatchRow>(
  matches: T[],
  now = Date.now(),
) => [...matches].sort((matchA, matchB) => compareMatchesByTimeline(matchA, matchB, now));
