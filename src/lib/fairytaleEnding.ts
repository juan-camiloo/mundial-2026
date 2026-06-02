import type { MatchRow } from "./matches";
import { supabase } from "./supabase";
import { formatTeamName } from "./teamFlags";
import { getMatchTeam, type TeamLookup } from "./teams";
import { getBracketStage, type BracketStageKey } from "./tournament";

export const FAIRYTALE_ENDING_DEADLINE_LABEL = "15 de junio de 2026";
export const FAIRYTALE_ENDING_EXTRA_POINTS = 40;

const FAIRYTALE_ENDING_CLOSED_AT = Date.parse("2026-06-16T05:00:00.000Z");

export const isFairytaleEndingClosed = (now = Date.now()) =>
  now >= FAIRYTALE_ENDING_CLOSED_AT;

export const FAIRYTALE_ENDING_CLOSED_MESSAGE =
  "La final soñada ya cerró. Solo se podía enviar hasta el 15 de junio de 2026.";

export const FAIRYTALE_ENDING_REMINDER_MESSAGE =
  "Recuerda rellenar tu final soñada. Si no lo haces antes del 15 de junio de 2026, perderás la oportunidad de ganar 40 puntos extra.";

export const FAIRYTALE_PODIUM_KEYS = [
  "champion",
  "subchampion",
  "third_place",
  "fourth_place",
] as const;

export type FairytalePodiumKey = typeof FAIRYTALE_PODIUM_KEYS[number];

export type FairytalePodiumLike = Partial<
  Record<FairytalePodiumKey, string | null | undefined>
>;

export const normalizeFairytaleTeam = (team: string | null | undefined) =>
  (team ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const isFairytalePodiumComplete = (
  podium: FairytalePodiumLike | null | undefined,
) =>
  Boolean(
    podium &&
      FAIRYTALE_PODIUM_KEYS.every((key) => normalizeFairytaleTeam(podium[key]) !== ""),
  );

export const isFairytalePodiumPositionHit = (
  prediction: FairytalePodiumLike,
  officialPodium: FairytalePodiumLike,
  key: FairytalePodiumKey,
) => {
  if (!isFairytalePodiumComplete(officialPodium)) return false;

  const predictedTeam = normalizeFairytaleTeam(prediction[key]);
  const officialTeam = normalizeFairytaleTeam(officialPodium[key]);

  return predictedTeam !== "" && predictedTeam === officialTeam;
};

const hasResolvedMatchResult = (match: MatchRow | null | undefined) => {
  if (!match || match.goals_a === null || match.goals_b === null) return false;
  if (match.goals_a !== match.goals_b) return true;
  return match.penalty_winner === "team_a" || match.penalty_winner === "team_b";
};

const getMatchSortValue = (match: MatchRow) =>
  match.match_number ?? new Date(match.match_date).getTime();

const isPodiumStageMatch = (match: MatchRow, stage: Extract<BracketStageKey, "final" | "third">) => {
  const bracketStage = getBracketStage(match.phase).key;
  if (bracketStage === stage) return true;
  return stage === "final" ? match.match_number === 104 : match.match_number === 103;
};

const findPodiumStageMatch = (
  matches: MatchRow[],
  stage: Extract<BracketStageKey, "final" | "third">,
) =>
  [...matches]
    .filter((match) => isPodiumStageMatch(match, stage))
    .sort((a, b) => getMatchSortValue(a) - getMatchSortValue(b))[0] ?? null;

const getPodiumTeamName = (
  teamsById: TeamLookup,
  match: MatchRow,
  side: "A" | "B",
) => {
  const team = getMatchTeam(
    teamsById,
    side === "A" ? match.team_a_id : match.team_b_id,
    side === "A" ? match.team_a_info : match.team_b_info,
    "",
  );

  const name = formatTeamName(team.country).trim();
  return name || null;
};

const getPodiumMatchPair = (
  match: MatchRow | null,
  teamsById: TeamLookup,
): { winner: string; loser: string } | null => {
  if (!match || !hasResolvedMatchResult(match)) return null;

  const teamA = getPodiumTeamName(teamsById, match, "A");
  const teamB = getPodiumTeamName(teamsById, match, "B");
  if (!teamA || !teamB) return null;

  if ((match.goals_a ?? 0) > (match.goals_b ?? 0)) {
    return { winner: teamA, loser: teamB };
  }

  if ((match.goals_b ?? 0) > (match.goals_a ?? 0)) {
    return { winner: teamB, loser: teamA };
  }

  if (match.penalty_winner === "team_a") {
    return { winner: teamA, loser: teamB };
  }

  if (match.penalty_winner === "team_b") {
    return { winner: teamB, loser: teamA };
  }

  return null;
};

export const buildFairytaleOfficialPodiumFromMatches = (
  matches: MatchRow[],
  teamsById: TeamLookup,
): FairytalePodiumLike | null => {
  const finalPair = getPodiumMatchPair(findPodiumStageMatch(matches, "final"), teamsById);
  const thirdPlacePair = getPodiumMatchPair(findPodiumStageMatch(matches, "third"), teamsById);

  if (!finalPair && !thirdPlacePair) return null;

  return {
    champion: finalPair?.winner ?? null,
    subchampion: finalPair?.loser ?? null,
    third_place: thirdPlacePair?.winner ?? null,
    fourth_place: thirdPlacePair?.loser ?? null,
  };
};

export const shouldRemindFairytaleEnding = async (userId: string) => {
  if (isFairytaleEndingClosed()) return false;

  const { data, error } = await supabase
    .from("fairytale_ending")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;

  return !data;
};
