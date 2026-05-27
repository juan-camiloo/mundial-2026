export type TeamRow = {
  id: string;
  country: string | null;
  flag: string | null;
  iso_code?: string | null;       
  group_key?: string | null;      
  group_seed_order?: number | null;
};

export type TeamLookup = Record<string, TeamRow>;

export const TEAM_COLUMNS = "id, country, flag, iso_code, group_key, group_seed_order";
export const UNKNOWN_TEAM_FLAG = "";

export const buildTeamLookup = (teams: TeamRow[] = []) =>
  teams.reduce<TeamLookup>((acc, team) => {
    acc[team.id] = team;
    return acc;
  }, {});

const normalizeRelatedTeam = (team: TeamRow | TeamRow[] | null | undefined) =>
  Array.isArray(team) ? team[0] ?? null : team ?? null;

export const getMatchTeam = (
  teamsById: TeamLookup,
  teamId: string | null | undefined,
  relatedTeam: TeamRow | TeamRow[] | null | undefined,
  fallback: string
): TeamRow => {
  const team = normalizeRelatedTeam(relatedTeam);
  const lookupTeam = teamId ? teamsById[teamId] : null;

  return {
    id: team?.id ?? lookupTeam?.id ?? teamId ?? fallback,
    country: team?.country ?? lookupTeam?.country ?? fallback,
    flag: team?.flag ?? lookupTeam?.flag ?? UNKNOWN_TEAM_FLAG,
    iso_code: team?.iso_code ?? lookupTeam?.iso_code ?? null,
    group_key: team?.group_key ?? lookupTeam?.group_key ?? null,
    group_seed_order: team?.group_seed_order ?? lookupTeam?.group_seed_order ?? null,
  };
};
