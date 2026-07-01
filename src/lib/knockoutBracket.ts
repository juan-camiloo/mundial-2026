import type { MatchRow } from "./matches";
import {
  FIFA_2026_KNOCKOUT_PROGRESSION,
  type Fifa2026KnockoutRoundKey,
} from "./fifa2026";
import { getBracketStage, isKnockoutMatch } from "./tournament";

export type KnockoutSourceResult = "W" | "L";

export type KnockoutSourceRef = {
  result: KnockoutSourceResult;
  matchNo: number;
};

export const parseKnockoutSourceRef = (value: string): KnockoutSourceRef | null => {
  const match = value.match(/^([WL])(\d+)$/);
  if (!match?.[1] || !match[2]) return null;

  return {
    result: match[1] as KnockoutSourceResult,
    matchNo: Number(match[2]),
  };
};

export const resolveKnockoutMatchNo = (match: MatchRow): number | null => {
  if (match.match_number != null) return match.match_number;

  const fromId = match.id.match(/^m?(7[3-9]|8\d|9\d|10[0-4])$/i);
  if (fromId?.[1]) return Number(fromId[1]);

  const fromPhase = (match.phase ?? "").match(/\b(?:m|match|partido)?\s*(7[3-9]|8\d|9\d|10[0-4])\b/i);
  return fromPhase?.[1] ? Number(fromPhase[1]) : null;
};

export const getKnockoutWinnerTeamId = (match: MatchRow) => {
  if (match.goals_a === null || match.goals_b === null) return null;
  if (match.goals_a > match.goals_b) return match.team_a_id;
  if (match.goals_b > match.goals_a) return match.team_b_id;
  if (match.penalty_winner === "team_a") return match.team_a_id;
  if (match.penalty_winner === "team_b") return match.team_b_id;
  return null;
};

export const getKnockoutLoserTeamId = (match: MatchRow) => {
  const winnerId = getKnockoutWinnerTeamId(match);
  if (!winnerId) return null;
  if (winnerId === match.team_a_id) return match.team_b_id;
  if (winnerId === match.team_b_id) return match.team_a_id;
  return null;
};

export const buildKnockoutMatchNumberMap = (matches: MatchRow[]) =>
  matches.reduce<Map<number, MatchRow>>((acc, match) => {
    if (!isKnockoutMatch(match)) return acc;

    const matchNo = resolveKnockoutMatchNo(match);
    if (matchNo === null || acc.has(matchNo)) return acc;

    acc.set(matchNo, match);
    return acc;
  }, new Map());

const getSourceTeamId = (matchesByNo: Map<number, MatchRow>, sourceRef: string) => {
  const source = parseKnockoutSourceRef(sourceRef);
  if (!source) return null;

  const sourceMatch = matchesByNo.get(source.matchNo);
  if (!sourceMatch) return null;

  return source.result === "W"
    ? getKnockoutWinnerTeamId(sourceMatch)
    : getKnockoutLoserTeamId(sourceMatch);
};

// Helper functions for resolving knockout sources and numbering

type InferKnockoutMatchNumberParams = {
  matches: MatchRow[];
  phase: string | null | undefined;
  teamAId: string | null | undefined;
  teamBId: string | null | undefined;
};

export const inferKnockoutMatchNumberForTeams = ({
  matches,
  phase,
  teamAId,
  teamBId,
}: InferKnockoutMatchNumberParams) => {
  const targetRound = getBracketStage(phase).key;
  if (targetRound === "other" || targetRound === "round32") return null;

  const selectedTeamIds = [teamAId, teamBId].filter((id): id is string => Boolean(id));
  if (selectedTeamIds.length === 0) return null;

  const selectedTeamSet = new Set(selectedTeamIds);
  const matchesByNo = buildKnockoutMatchNumberMap(matches);
  const occupiedMatchNos = new Set(matchesByNo.keys());
  const candidates: Array<{ matchNo: number; score: number; knownSources: number }> = [];

  FIFA_2026_KNOCKOUT_PROGRESSION.forEach((progression) => {
    if (progression.round !== (targetRound as Fifa2026KnockoutRoundKey)) return;
    if (occupiedMatchNos.has(progression.matchNo)) return;

    const homeTeamId = getSourceTeamId(matchesByNo, progression.homeFrom);
    const awayTeamId = getSourceTeamId(matchesByNo, progression.awayFrom);
    const knownSources = Number(Boolean(homeTeamId)) + Number(Boolean(awayTeamId));
    if (knownSources === 0) return;

    const homeMatches = Boolean(homeTeamId && selectedTeamSet.has(homeTeamId));
    const awayMatches = Boolean(awayTeamId && selectedTeamSet.has(awayTeamId));
    if (!homeMatches && !awayMatches) return;

    const exactPair =
      Boolean(homeTeamId && awayTeamId) &&
      selectedTeamSet.has(homeTeamId as string) &&
      selectedTeamSet.has(awayTeamId as string);

    candidates.push({
      matchNo: progression.matchNo,
      score: (exactPair ? 100 : 0) + (homeMatches ? 10 : 0) + (awayMatches ? 10 : 0) + knownSources,
      knownSources,
    });
  });

  candidates.sort(
    (a, b) =>
      b.score - a.score ||
      b.knownSources - a.knownSources ||
      a.matchNo - b.matchNo
  );

  if (candidates.length === 0) return null;
  if (candidates[1] && candidates[1].score === candidates[0].score) return null;

  return candidates[0].matchNo;
};

export const inferKnockoutMatchNumberForMatch = (match: MatchRow, matches: MatchRow[]) =>
  match.match_number != null
    ? match.match_number
    : inferKnockoutMatchNumberForTeams({
        matches,
        phase: match.phase,
        teamAId: match.team_a_id,
        teamBId: match.team_b_id,
      });
