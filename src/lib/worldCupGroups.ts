import { normalizeTeamName } from "./teamFlags";
import type { TeamRow } from "./teams";
import { FIFA_2026_GROUP_KEYS, type Fifa2026GroupKey } from "./fifa2026";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WorldCupGroup = {
  key: Fifa2026GroupKey;
  label: string;
  teams: TeamRow[];
};

// ---------------------------------------------------------------------------
// Alias table — kept for name-normalisation when match data uses a variant
// spelling of a team's official name (e.g. "Irán" vs "RI de Irán").
// This is NOT a data-source for group membership; that comes from teams.group_key.
// ---------------------------------------------------------------------------

export const WORLD_CUP_TEAM_ALIASES: Record<string, string[]> = {
  "República de Corea": ["Corea del Sur", "Korea Republic"],
  "República Checa":    ["Chequia", "Czechia"],
  "RI de Irán":         ["Irán", "Iran", "IR Iran"],
  "Arabia Saudí":       ["Arabia Saudita", "Saudi Arabia"],
  "RD de Congo":        ["RD Congo", "DR Congo", "Congo DR"],
  Turquía:              ["Turquia", "Türkiye", "Turkey"],
  Curazao:              ["Curaçao"],
};

// ---------------------------------------------------------------------------
// Core builder — replaces the old hard-coded WORLD_CUP_2026_GROUPS constant.
// Reads group_key (and optionally group_seed_order) from the teams already
// loaded from the database.
// ---------------------------------------------------------------------------

export const buildWorldCupGroupsFromTeams = (teams: TeamRow[]): WorldCupGroup[] => {
  const groupMap = new Map<Fifa2026GroupKey, TeamRow[]>();

  teams.forEach((team) => {
    if (!team.group_key) return;
    const key = team.group_key.toUpperCase() as Fifa2026GroupKey;
    if (!FIFA_2026_GROUP_KEYS.includes(key)) return;

    const bucket = groupMap.get(key) ?? [];
    bucket.push(team);
    groupMap.set(key, bucket);
  });

  return FIFA_2026_GROUP_KEYS.filter((key) => groupMap.has(key)).map((key) => ({
    key,
    label: `Grupo ${key}`,
    teams: (groupMap.get(key) ?? []).sort(
      (a, b) =>
        (a.group_seed_order ?? 99) - (b.group_seed_order ?? 99) ||
        (a.country ?? "").localeCompare(b.country ?? "", "es"),
    ),
  }));
};

// ---------------------------------------------------------------------------
// Helpers — same public API as before so callers need minimal changes
// ---------------------------------------------------------------------------

/**
 * Returns all name variants for a team (canonical + known aliases).
 * Used when resolving match team_info strings that may use alternate spellings.
 */
export const getWorldCupTeamCandidates = (country: string): string[] => [
  country,
  ...(WORLD_CUP_TEAM_ALIASES[country] ?? []),
];

/**
 * Returns the group label ("Grupo A"…"Grupo L") for a country name by
 * looking it up in the already-loaded teams list.
 * Falls back to null when the team has no group_key set in the DB.
 */
export const getWorldCupGroupForTeam = (
  country: string | null | undefined,
  teamList?: TeamRow[],
): string | null => {
  if (!teamList) return null;
  const normalized = normalizeTeamName(country);
  const team = teamList.find((t) => normalizeTeamName(t.country) === normalized);
  return team?.group_key ? `Grupo ${team.group_key.toUpperCase()}` : null;
};