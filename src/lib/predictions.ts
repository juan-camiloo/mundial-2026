import { getTournamentPhaseOption } from "./tournament";

export type PenaltyWinner = "team_a" | "team_b";

type Nullable<T> = T | null | undefined;
const PREDICTION_LOCK_MINUTES = 10;
const PREDICTION_LOCK_MS = PREDICTION_LOCK_MINUTES * 60 * 1000;

export type MatchLike = {
  team_a_id?: string | null;
  team_b_id?: string | null;
  phase?: string | null;
  match_date?: string | null;
  prediction_deadline?: string | null;
  goals_a?: number | null;
  goals_b?: number | null;
  supports_penalties?: boolean | null;
  penalty_winner?: PenaltyWinner | null;
};

export type PredictionLike = {
  pred_goals_a?: number | null;
  pred_goals_b?: number | null;
  pred_penalty_winner?: PenaltyWinner | null;
};

export type ScoreInfo = {
  points: number;
  status: "pendiente" | "finalizado";
  exact: boolean;
  resultHit: boolean;
  goalHit: boolean;
  penaltyWinnerHit: boolean;
  breakdown: string;
};

const normalizePhase = (phase: Nullable<string>) =>
  (phase ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const parseMatchDate = (value: Nullable<string>) => {
  if (!value) return null;

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export { PREDICTION_LOCK_MINUTES };

export const getPredictionDeadline = (match: MatchLike | null) => {
  const matchDate = parseMatchDate(match?.match_date);
  if (matchDate) {
    return new Date(matchDate.getTime() - PREDICTION_LOCK_MS);
  }

  return parseMatchDate(match?.prediction_deadline);
};

export const hasMatchStarted = (match: MatchLike | null, now = Date.now()) => {
  const matchDate = parseMatchDate(match?.match_date);
  return matchDate ? now >= matchDate.getTime() : false;
};

export const isPredictionClosed = (match: MatchLike | null, now = Date.now()) => {
  const deadlineDate = getPredictionDeadline(match);
  return deadlineDate ? now >= deadlineDate.getTime() : false;
};

export const inferPenaltySupportFromPhase = (phase: Nullable<string>) => {
  const fixedPhase = getTournamentPhaseOption(phase);
  if (fixedPhase) return fixedPhase.supportsPenalties;

  const normalized = normalizePhase(phase);

  if (!normalized) return false;
  if (
    normalized.includes("grupo") ||
    normalized.includes("groups") ||
    normalized.includes("liga")
  ) {
    return false;
  }

  return [
    "octavos",
    "cuartos",
    "semifinal",
    "final",
    "elimin",
    "knockout",
    "round of 16",
    "quarter",
    "semi",
    "third place",
    "tercer puesto",
  ].some((keyword) => normalized.includes(keyword));
};

export const matchSupportsPenalties = (match: MatchLike | null) => {
  if (!match) return false;
  const fixedPhase = getTournamentPhaseOption(match.phase);
  if (fixedPhase) return fixedPhase.supportsPenalties;
  if (inferPenaltySupportFromPhase(match.phase)) return true;
  return typeof match.supports_penalties === "boolean" ? match.supports_penalties : false;
};

export const isDrawScore = (goalsA: Nullable<number>, goalsB: Nullable<number>) =>
  goalsA !== null &&
  goalsA !== undefined &&
  goalsB !== null &&
  goalsB !== undefined &&
  goalsA === goalsB;

export const needsPenaltyWinnerPrediction = (
  match: MatchLike | null,
  goalsA: Nullable<number>,
  goalsB: Nullable<number>
) => matchSupportsPenalties(match) && isDrawScore(goalsA, goalsB);

export const getPenaltyWinnerLabel = (
  winner: Nullable<PenaltyWinner>,
  teamA: Nullable<string>,
  teamB: Nullable<string>
) => {
  if (winner === "team_a") return teamA ?? "Selección por definir";
  if (winner === "team_b") return teamB ?? "Selección por definir";
  return null;
};

export const formatScoreWithPenalty = ({
  goalsA,
  goalsB,
  penaltyWinner,
  teamA,
  teamB,
}: {
  goalsA: Nullable<number>;
  goalsB: Nullable<number>;
  penaltyWinner?: Nullable<PenaltyWinner>;
  teamA?: Nullable<string>;
  teamB?: Nullable<string>;
}) => {
  if (goalsA === null || goalsA === undefined || goalsB === null || goalsB === undefined) {
    return "Sin pronostico";
  }

  const score = `${goalsA} - ${goalsB}`;
  const winnerLabel = getPenaltyWinnerLabel(penaltyWinner, teamA, teamB);

  if (!winnerLabel || goalsA !== goalsB) {
    return score;
  }

  return `${score} (${winnerLabel} gana penales)`;
};

const getOutcome = (a: number, b: number) => {
  if (a === b) return 0;
  return a > b ? 1 : -1;
};

export const computePredictionScore = (
  prediction: PredictionLike,
  match: MatchLike | null
): ScoreInfo => {
  if (!match || match.goals_a === null || match.goals_a === undefined || match.goals_b === null || match.goals_b === undefined) {
    return {
      points: 0,
      status: "pendiente",
      exact: false,
      resultHit: false,
      goalHit: false,
      penaltyWinnerHit: false,
      breakdown: "Pendiente",
    };
  }

  if (
    prediction.pred_goals_a === null ||
    prediction.pred_goals_a === undefined ||
    prediction.pred_goals_b === null ||
    prediction.pred_goals_b === undefined
  ) {
    return {
      points: 0,
      status: "finalizado",
      exact: false,
      resultHit: false,
      goalHit: false,
      penaltyWinnerHit: false,
      breakdown: "Sin puntos",
    };
  }

  const exact =
    prediction.pred_goals_a === match.goals_a &&
    prediction.pred_goals_b === match.goals_b;
  const resultHit =
    getOutcome(prediction.pred_goals_a, prediction.pred_goals_b) ===
    getOutcome(match.goals_a, match.goals_b);
  const goalHit =
    prediction.pred_goals_a === match.goals_a ||
    prediction.pred_goals_b === match.goals_b;
  const officialPenaltyWinner =
    isDrawScore(match.goals_a, match.goals_b) && matchSupportsPenalties(match)
      ? match.penalty_winner
      : null;
  const penaltyWinnerHit =
    officialPenaltyWinner !== null &&
    officialPenaltyWinner !== undefined &&
    prediction.pred_penalty_winner === officialPenaltyWinner;

  let points = exact ? 12 : 0;
  if (!exact && resultHit) points += 5;
  if (!exact && goalHit) points += 2;
  if (penaltyWinnerHit) points += 5;

  const breakdownParts: string[] = [];
  if (exact) {
    breakdownParts.push("12 exacto");
  } else {
    if (resultHit) breakdownParts.push("5 resultado");
    if (goalHit) breakdownParts.push("2 goles");
  }
  if (penaltyWinnerHit) breakdownParts.push("5 penales");

  return {
    points,
    status: "finalizado",
    exact,
    resultHit,
    goalHit,
    penaltyWinnerHit,
    breakdown: breakdownParts.length > 0 ? breakdownParts.join(" + ") : "Sin puntos",
  };
};
