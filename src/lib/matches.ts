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
