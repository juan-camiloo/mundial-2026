import type { MatchRow } from "./matches";
import {
  FIFA_2026_GROUP_KEYS,
  FIFA_2026_GROUP_LABELS,
  FIFA_2026_KNOCKOUT_PHASES,
  type Fifa2026GroupKey,
} from "./fifa2026";

type TournamentMatchLike = Pick<MatchRow, "phase" | "is_knockout" | "supports_penalties">;

const normalizeTournamentText = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export type BracketStageKey = "round32" | "round16" | "quarter" | "semi" | "third" | "final" | "other";

export type TournamentPhaseOption = {
  value: string;
  label: string;
  isKnockout: boolean;
  supportsPenalties: boolean;
};

const GROUP_PHASE_OPTIONS: TournamentPhaseOption[] = FIFA_2026_GROUP_KEYS.map((group) => ({
  value: `Grupo ${group}`,
  label: `Grupo ${group}`,
  isKnockout: false,
  supportsPenalties: false,
}));

export const TOURNAMENT_PHASES: TournamentPhaseOption[] = [
  ...GROUP_PHASE_OPTIONS,
  ...FIFA_2026_KNOCKOUT_PHASES.map((phase) => ({
    value: phase.value,
    label: phase.label,
    isKnockout: true,
    supportsPenalties: phase.supportsPenalties,
  })),
];

export const getTournamentPhaseOption = (phase: string | null | undefined) => {
  const normalizedPhase = normalizeTournamentText(phase);

  return TOURNAMENT_PHASES.find(
    (option) =>
      normalizeTournamentText(option.value) === normalizedPhase ||
      normalizeTournamentText(option.label) === normalizedPhase
  );
};

export const inferKnockoutFromPhase = (phase: string | null | undefined) => {
  const normalized = normalizeTournamentText(phase);

  if (!normalized) return false;
  if (normalized.includes("grupo") || normalized.includes("group") || normalized.includes("liga")) {
    return false;
  }

  return [
    "dieciseisavos",
    "round of 32",
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
    "tercer lugar",
  ].some((keyword) => normalized.includes(keyword));
};

export const getPhaseKnockoutConfig = (phase: string | null | undefined) => {
  const fixedPhase = getTournamentPhaseOption(phase);

  if (fixedPhase) {
    return {
      isKnockout: fixedPhase.isKnockout,
      supportsPenalties: fixedPhase.supportsPenalties,
    };
  }

  const isKnockout = inferKnockoutFromPhase(phase);

  return {
    isKnockout,
    supportsPenalties: isKnockout,
  };
};

export const isKnockoutMatch = (match: TournamentMatchLike | null | undefined) => {
  if (!match) return false;
  const fixedPhase = getTournamentPhaseOption(match.phase);
  if (fixedPhase) return fixedPhase.isKnockout;
  if (inferKnockoutFromPhase(match.phase)) return true;
  if (typeof match.is_knockout === "boolean") return match.is_knockout;
  if (typeof match.supports_penalties === "boolean" && match.supports_penalties) return true;
  return false;
};

export const getGroupLabelFromPhase = (phase: string | null | undefined) => {
  const value = phase ?? "";
  const groupMatch = value.match(/\bgrupo\s*([a-z0-9]+)/i) ?? value.match(/\bgroup\s*([a-z0-9]+)/i);

  if (groupMatch?.[1]) {
    return `Grupo ${groupMatch[1].toUpperCase()}`;
  }

  if (normalizeTournamentText(value).includes("grupo") || normalizeTournamentText(value).includes("group")) {
    return "Grupo por definir";
  }

  return "Grupo por definir";
};

export const getBracketStage = (phase: string | null | undefined): {
  key: BracketStageKey;
  label: string;
  order: number;
} => {
  const normalized = normalizeTournamentText(phase);

  if (normalized.includes("dieciseisavos") || normalized.includes("round of 32")) {
    return { key: "round32", label: "Dieciseisavos", order: 1 };
  }

  if (normalized.includes("octavos") || normalized.includes("round of 16")) {
    return { key: "round16", label: "Octavos", order: 2 };
  }

  if (normalized.includes("cuartos") || normalized.includes("quarter")) {
    return { key: "quarter", label: "Cuartos", order: 3 };
  }

  if (normalized.includes("semifinal") || normalized.includes("semi")) {
    return { key: "semi", label: "Semifinales", order: 4 };
  }

  if (
    normalized.includes("tercer puesto") ||
    normalized.includes("tercer lugar") ||
    normalized.includes("third place")
  ) {
    return { key: "third", label: "Tercer puesto", order: 5 };
  }

  if (normalized.includes("final")) {
    return { key: "final", label: "Final", order: 6 };
  }

  return { key: "other", label: phase || "Fase final", order: 99 };
};

const getKnownGroupKey = (groupKey: string | null | undefined) => {
  const normalized = (groupKey ?? "").trim().toUpperCase();
  return FIFA_2026_GROUP_KEYS.includes(normalized as Fifa2026GroupKey)
    ? (normalized as Fifa2026GroupKey)
    : null;
};

export const getTournamentPhaseLabel = (
  phase: string | null | undefined,
  groupKey?: string | null
) => {
  const fixedPhase = getTournamentPhaseOption(phase);
  if (fixedPhase) return fixedPhase.label;

  const normalized = normalizeTournamentText(phase);
  if (!normalized) return "Fase sin definir";

  if (normalized.includes("grupo") || normalized.includes("group")) {
    const labelFromPhase = getGroupLabelFromPhase(phase);
    if (labelFromPhase !== "Grupo por definir") return labelFromPhase;

    const knownGroupKey = getKnownGroupKey(groupKey);
    return knownGroupKey ? FIFA_2026_GROUP_LABELS[knownGroupKey] : "Grupo por definir";
  }

  const bracketStage = getBracketStage(phase);
  return bracketStage.key === "other" ? phase ?? "Fase sin definir" : bracketStage.label;
};
