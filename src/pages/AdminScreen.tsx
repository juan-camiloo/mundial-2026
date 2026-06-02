import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, GitBranch, Save, ShieldCheck, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FormStatusMessage from "../components/FormStatusMessage";
import TeamLabelNoCountry from "../components/TeamLabelNoCountry";
import TeamSelect from "../components/TeamSelect";
import {
  isDrawScore,
  type PenaltyWinner,
} from "../lib/predictions";
import { supabase } from "../lib/supabase";
import {
  buildTeamFlagMap,
  formatTeamName,
  type TeamFlagMap,
} from "../lib/teamFlags";
import { MATCH_COLUMNS, type MatchRow } from "../lib/matches";
import {
  getBracketStage,
  getPhaseKnockoutConfig,
  getTournamentPhaseLabel,
  TOURNAMENT_PHASES,
} from "../lib/tournament";
import {
  buildTeamLookup,
  getMatchTeam,
  TEAM_COLUMNS,
  type TeamLookup,
  type TeamRow,
} from "../lib/teams";
import { useNotification } from "../components/notificationContext";

type Team = TeamRow;
type MatchAdminRow = MatchRow;

type ResultDraft = {
  goalsA: string;
  goalsB: string;
  supportsPenalties: boolean;
  penaltyWinner: PenaltyWinner | "";
  isKnockout: boolean;
};

type TournamentPodium = {
  champion: string;
  subchampion: string;
  third_place: string;
  fourth_place: string;
};

type TournamentSettingsRow = {
  knockout_stage_enabled: boolean | null;
};

const isPenaltyMigrationError = (message: string) =>
  ["supports_penalties", "penalty_winner", "pred_penalty_winner", "is_knockout"].some((column) =>
    message.includes(column)
  );

const getDraftFromMatch = (match: MatchAdminRow): ResultDraft => {
  const phaseConfig = getPhaseKnockoutConfig(match.phase);

  return {
    goalsA: match.goals_a === null ? "" : String(match.goals_a),
    goalsB: match.goals_b === null ? "" : String(match.goals_b),
    supportsPenalties: phaseConfig.supportsPenalties,
    penaltyWinner: match.penalty_winner ?? "",
    isKnockout: phaseConfig.isKnockout,
  };
};

const COLOMBIA_UTC_OFFSET_MINUTES = -5 * 60;

const colombiaDateTimeToUtcIso = (value: string) => {
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) return null;

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second = 0] = timePart.split(":").map(Number);

  if ([year, month, day, hour, minute, second].some((part) => Number.isNaN(part))) {
    return null;
  }

  const utcTimestamp =
    Date.UTC(year, month - 1, day, hour, minute, second) -
    COLOMBIA_UTC_OFFSET_MINUTES * 60 * 1000;

  return new Date(utcTimestamp).toISOString();
};

const hasOfficialScore = (match: MatchAdminRow) =>
  match.goals_a !== null && match.goals_b !== null;

const getMatchSortValue = (match: MatchAdminRow) =>
  match.match_number ?? new Date(match.match_date).getTime();

const findStageMatch = (matches: MatchAdminRow[], stage: "final" | "third") =>
  [...matches]
    .filter((match) => getBracketStage(match.phase).key === stage)
    .sort((a, b) => getMatchSortValue(a) - getMatchSortValue(b))[0] ?? null;

const getTeamName = (team: TeamRow) => formatTeamName(team.country).trim();

const getMatchPodiumPair = (
  match: MatchAdminRow | null,
  teamsById: TeamLookup,
): { winner: string; loser: string } | null => {
  if (!match || !hasOfficialScore(match)) return null;

  const teamA = getMatchTeam(teamsById, match.team_a_id, match.team_a_info, "SelecciÃ³n por definir");
  const teamB = getMatchTeam(teamsById, match.team_b_id, match.team_b_info, "SelecciÃ³n por definir");

  if ((match.goals_a ?? 0) > (match.goals_b ?? 0)) {
    return { winner: getTeamName(teamA), loser: getTeamName(teamB) };
  }

  if ((match.goals_b ?? 0) > (match.goals_a ?? 0)) {
    return { winner: getTeamName(teamB), loser: getTeamName(teamA) };
  }

  if (match.penalty_winner === "team_a") {
    return { winner: getTeamName(teamA), loser: getTeamName(teamB) };
  }

  if (match.penalty_winner === "team_b") {
    return { winner: getTeamName(teamB), loser: getTeamName(teamA) };
  }

  return null;
};

const buildTournamentPodium = (
  matches: MatchAdminRow[],
  teamsById: TeamLookup,
): TournamentPodium | null => {
  const finalPair = getMatchPodiumPair(findStageMatch(matches, "final"), teamsById);
  const thirdPlacePair = getMatchPodiumPair(findStageMatch(matches, "third"), teamsById);

  if (!finalPair || !thirdPlacePair) return null;

  return {
    champion: finalPair.winner,
    subchampion: finalPair.loser,
    third_place: thirdPlacePair.winner,
    fourth_place: thirdPlacePair.loser,
  };
};

const syncTournamentPodiumFromMatches = async (
  matches: MatchAdminRow[],
  teamsById: TeamLookup,
) => {
  const podium = buildTournamentPodium(matches, teamsById);
  if (!podium) return { status: "pending" as const };

  const { error } = await supabase.from("tournament_podium").upsert(
    {
      id: true,
      ...podium,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) return { status: "error" as const, message: error.message };

  return { status: "updated" as const };
};

export default function AdminScreen() {
  const [teamASelected, setTeamASelected] = useState<Team | null>(null);
  const [teamBSelected, setTeamBSelected] = useState<Team | null>(null);
  const [teamsList, setTeamsList] = useState<Team[]>([]);
  const [teamFlags, setTeamFlags] = useState<TeamFlagMap>({});
  const [teamsById, setTeamsById] = useState<TeamLookup>({});
  const [matches, setMatches] = useState<MatchAdminRow[]>([]);
  const [resultDrafts, setResultDrafts] = useState<Record<string, ResultDraft>>({});
  const [date, setDate] = useState("");
  const [phase, setPhase] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [savingNewMatch, setSavingNewMatch] = useState(false);
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [knockoutStageEnabled, setKnockoutStageEnabled] = useState(false);
  const [savingTournamentSettings, setSavingTournamentSettings] = useState(false);
  const [newMatchError, setNewMatchError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { notify } = useNotification();

  const loadTeams = useCallback(async () => {
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select(TEAM_COLUMNS)
      .order("country", { ascending: true });

    if (teamsError) {
      notify({
        title: "Error cargando equipos",
        message: "Actualiza la página o intenta de nuevo en unos segundos.",
        variant: "error",
      });
      return;
    }

    const rows = (teams ?? []) as Team[];
    setTeamsList(rows);
    setTeamFlags(buildTeamFlagMap(rows));
    setTeamsById(buildTeamLookup(rows));
  }, [notify]);

  const loadMatches = useCallback(async () => {
    const { data, error } = await supabase
      .from("matches")
      .select(MATCH_COLUMNS)
      .order("match_date", { ascending: true });

      if (error) {
      notify({
        title: "Error cargando partidos",
        message: error.message,
        variant: "error",
      });
        return;
      }

    const rows = (data ?? []) as MatchAdminRow[];
    setMatches(rows);
    setResultDrafts(
      rows.reduce<Record<string, ResultDraft>>((acc, match) => {
        acc[match.id] = getDraftFromMatch(match);
        return acc;
      }, {})
    );
  }, [notify]);

  const loadTournamentSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from("tournament_settings")
      .select("knockout_stage_enabled")
      .eq("id", true)
      .maybeSingle();

      if (error) {
      return;
    }

    setKnockoutStageEnabled(Boolean((data as TournamentSettingsRow | null)?.knockout_stage_enabled));
  }, []);

  useEffect(() => {
    const checkUserAndLoadData = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          navigate("/login");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();

        if (error || !data?.is_admin) {
          notify({
            title: "Sin permisos de administrador",
            message: "Tu usuario no tiene acceso a este panel.",
            variant: "warning",
            action: { label: "Ir al inicio", onClick: () => navigate("/") },
          });
          navigate("/");
          return;
        }

        setIsAdmin(true);

        await loadTeams();
        await loadMatches();
        await loadTournamentSettings();
      } catch {
        navigate("/login");
      }
    };

    checkUserAndLoadData();
  }, [loadMatches, loadTeams, loadTournamentSettings, navigate, notify]);

  const selectedPhaseConfig = getPhaseKnockoutConfig(phase);

  const updateDraft = (matchId: string, patch: Partial<ResultDraft>) => {
    setResultDrafts((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        ...patch,
      },
    }));
  };

  const handleNewMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingNewMatch) return;
    setNewMatchError(null);

    if (!teamASelected || !teamBSelected || !date || !phase) {
      setNewMatchError("Por favor completa todos los campos.");
      return;
    }

    if (String(teamASelected.id) === String(teamBSelected.id)) {
      setNewMatchError("No puedes seleccionar el mismo equipo para ambos lados.");
      return;
    }

    const matchDateIso = colombiaDateTimeToUtcIso(date);
    if (!matchDateIso) {
      setNewMatchError("La fecha del partido no es válida.");
      return;
    }

    setSavingNewMatch(true);

    try {
      const { error } = await supabase.from("matches").insert({
        team_a_id: teamASelected.id,
        team_b_id: teamBSelected.id,
        match_date: matchDateIso,
        phase,
        is_knockout: selectedPhaseConfig.isKnockout,
        supports_penalties: selectedPhaseConfig.supportsPenalties,
      });

      if (error) {
        notify({
          title: "No pudimos crear el partido",
          message: isPenaltyMigrationError(error.message)
            ? "Falta aplicar la migración de penales en Supabase antes de crear este partido."
            : "Error al crear el partido: " + error.message,
          variant: "error",
        });
        return;
      }

      notify({
        title: "Partido creado",
        message: "El partido quedó registrado en el panel.",
        variant: "success",
      });
      setDate("");
      setPhase("");
      setTeamASelected(null);
      setTeamBSelected(null);
      await loadMatches();
    } finally {
      setSavingNewMatch(false);
    }
  };
  
    const handleSaveResult = async (match: MatchAdminRow) => {
      if (savingMatchId) return;

      try{
        const draft = resultDrafts[match.id];
        if (!draft) return;

        const goalsA = draft.goalsA === "" ? null : Number(draft.goalsA);
        const goalsB = draft.goalsB === "" ? null : Number(draft.goalsB);

        if (
          (goalsA === null) !== (goalsB === null) ||
          (goalsA !== null && (!Number.isInteger(goalsA) || goalsA < 0)) ||
          (goalsB !== null && (!Number.isInteger(goalsB) || goalsB < 0))
        ) {
          notify({
            title: "Marcador incompleto",
            message: "Carga ambos goles con números enteros positivos, o deja ambos vacíos.",
            variant: "warning",
          });
          return;
        }

        const needsPenaltyWinner =
          draft.supportsPenalties && goalsA !== null && goalsB !== null && isDrawScore(goalsA, goalsB);

        if (needsPenaltyWinner && !draft.penaltyWinner) {
          notify({
            title: "Falta ganador por penales",
            message: "Elige el ganador por penales para guardar un empate de eliminación directa.",
            variant: "warning",
          });
          return;
        }

        const penaltyWinner: PenaltyWinner | null = needsPenaltyWinner
          ? (draft.penaltyWinner as PenaltyWinner)
          : null;

        setSavingMatchId(match.id);

        const { data: updatedMatch, error } = await supabase
          .from("matches")
          .update({
            goals_a: goalsA,
            goals_b: goalsB,
            is_knockout: draft.isKnockout,
            supports_penalties: draft.supportsPenalties,
            penalty_winner: penaltyWinner,
          })
          .eq("id", match.id)
          .select("id, goals_a, goals_b, is_knockout, supports_penalties, penalty_winner")
          .maybeSingle();

        if (error) {
          notify({
            title: "No pudimos guardar el resultado",
            message: isPenaltyMigrationError(error.message)
              ? "Falta aplicar la migración de penales en Supabase antes de guardar este resultado."
              : "Error al actualizar el resultado: " + error.message,
            variant: "error",
          });
          return;
        }

        if (!updatedMatch) {
          notify({
            title: "Resultado no actualizado",
            message:
              "No se actualizó ninguna fila. Revisa que el usuario siga siendo admin y que las políticas RLS de matches permitan update.",
            variant: "error",
          });
          return;
        }

        const nextMatches = matches.map((currentMatch) =>
          currentMatch.id === match.id
            ? {
                ...currentMatch,
                goals_a: goalsA,
                goals_b: goalsB,
                is_knockout: draft.isKnockout,
                supports_penalties: draft.supportsPenalties,
                penalty_winner: penaltyWinner,
              }
            : currentMatch
        );
        const savedStage = getBracketStage(match.phase).key;
        const podiumSync =
          savedStage === "final" || savedStage === "third"
            ? await syncTournamentPodiumFromMatches(nextMatches, teamsById)
            : { status: "skipped" as const };

        if (podiumSync.status === "error") {
          notify({
            title: "Resultado actualizado",
            message: podiumSync.message.includes("tournament_podium")
              ? "Falta aplicar la migración del podio oficial en Supabase."
              : "No se pudo actualizar el podio oficial: " + podiumSync.message,
            variant: "warning",
          });
        } else {
          notify({
            title: "Resultado actualizado",
            message: podiumSync.status === "updated" ? "Podio oficial sincronizado." : "Cambios guardados.",
            variant: "success",
          });
        }
        await loadMatches();
      } catch (error) {
        notify({
          title: "Error inesperado",
          message: error instanceof Error ? error.message : String(error),
          variant: "error",
        });
      } finally {
        setSavingMatchId(null);
      }  
    };
 
  const handleToggleKnockoutStage = async (enabled: boolean) => {
    if (savingTournamentSettings) return;

    const previousValue = knockoutStageEnabled;

    setKnockoutStageEnabled(enabled);
    setSavingTournamentSettings(true);

    const { error } = await supabase.from("tournament_settings").upsert(
      {
        id: true,
        knockout_stage_enabled: enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    setSavingTournamentSettings(false);

    if (error) {
      setKnockoutStageEnabled(previousValue);
      notify({
        title: "No pudimos actualizar el torneo",
        message: error.message.includes("tournament_settings")
          ? "Falta aplicar la migración de configuración del torneo en Supabase."
          : "Error al actualizar la configuración del torneo: " + error.message,
        variant: "error",
      });
    }
  };

  if (!isAdmin) return null;

  return (
    <main className="page">
      <div className="admin-shell">
        <section className="rule-block admin-tournament-flow">
          <div className="section-header">
            <span className="pill">
              <GitBranch size={14} aria-hidden="true" />
              Flujo del torneo
            </span>
            <h2>Rondas finales</h2>
            <p>Al activarlas, el ranking del torneo muestra la rama de fases finales.</p>
          </div>

          <div className="admin-flow-toggle-row">
            <div className="admin-flow-copy">
              <strong>Mostrar fases finales</strong>
              <span>{knockoutStageEnabled ? "Rama visible" : "Solo grupos y terceros"}</span>
            </div>

            <label
              className={`admin-switch${savingTournamentSettings ? " saving" : ""}`}
              aria-busy={savingTournamentSettings}
            >
              <input
                type="checkbox"
                role="switch"
                checked={knockoutStageEnabled}
                disabled={savingTournamentSettings}
                onChange={(event) => handleToggleKnockoutStage(event.target.checked)}
              />
              <span className="admin-switch-track" aria-hidden="true" />
              <span className="admin-switch-label">
                {savingTournamentSettings ? "Guardando..." : knockoutStageEnabled ? "Activo" : "Inactivo"}
              </span>
            </label>
          </div>
        </section>

        <section className="auth-card">
          <form className="form" onSubmit={handleNewMatch} aria-busy={savingNewMatch}>
            <div className="form-header">
              <h2>Panel de Control</h2>
              <p>Configurar nuevo partido del torneo</p>
            </div>

            <TeamSelect
              label="Selección local"
              placeholder="Seleccionar país..."
              teams={teamsList}
              value={teamASelected}
              disabledTeamId={teamBSelected?.id}
              disabled={savingNewMatch}
              teamFlags={teamFlags}
              onChange={(team) => {
                setTeamASelected(team);
                setNewMatchError(null);
              }}
            />
            <label className="field legacy-team-select">
              <span>Selección local</span>
              <select
                disabled
                required
                className="select-input"
                value={teamASelected?.id ?? ""}
                onChange={(e) =>
                  setTeamASelected(teamsList.find((team) => String(team.id) === e.target.value) || null)
                }
              >
                <option value="">Seleccionar país...</option>
                {teamsList.map((team) => (
                  <option key={team.id} value={team.id}>
                    {formatTeamName(team.country)}
                  </option>
                ))}
              </select>
            </label>

            <TeamSelect
              label="Selección visitante"
              placeholder="Seleccionar país..."
              teams={teamsList}
              value={teamBSelected}
              disabledTeamId={teamASelected?.id}
              disabled={savingNewMatch}
              teamFlags={teamFlags}
              onChange={(team) => {
                setTeamBSelected(team);
                setNewMatchError(null);
              }}
            />
            <label className="field legacy-team-select">
              <span>Selección visitante</span>
              <select
                disabled
                required
                className="select-input"
                value={teamBSelected?.id ?? ""}
                onChange={(e) =>
                  setTeamBSelected(teamsList.find((team) => String(team.id) === e.target.value) || null)
                }
              >
                <option value="">Seleccionar país...</option>
                {teamsList.map((team) => (
                  <option key={team.id} value={team.id}>
                    {formatTeamName(team.country)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Fecha y Hora del Encuentro</span>
              <input
                type="datetime-local"
                required
                disabled={savingNewMatch}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setNewMatchError(null);
                }}
              />
            </label>

            <label className="field">
              <span>Fase del Torneo</span>
              <select
                required
                disabled={savingNewMatch}
                value={phase}
                onChange={(e) => {
                  setPhase(e.target.value);
                  setNewMatchError(null);
                }}
              >
                <option value="">Seleccionar fase...</option>
                {TOURNAMENT_PHASES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <small className="phase-helper">
                {phase
                  ? selectedPhaseConfig.supportsPenalties
                    ? "Fase final: los penales quedan activos automáticamente si el marcador empata."
                    : "Fase de grupos: los empates no piden ganador por penales."
                  : "Elige una fase fija para configurar penales automáticamente."}
              </small>
            </label>
            <FormStatusMessage message={newMatchError} />

            <button className="primary-btn" type="submit" disabled={savingNewMatch}>
              <CalendarPlus size={18} aria-hidden="true" />
              {savingNewMatch ? "Registrando..." : "Registrar Partido"}
            </button>

            <p className="form-footer">Asegúrate de que los datos sean correctos antes de enviar.</p>
          </form>
        </section>

        <section className="rule-block admin-results">
          <div className="section-header">
            <span className="pill">
              <ShieldCheck size={14} aria-hidden="true" />
              Resultados oficiales
            </span>
            <h2>Cargar marcador y penales</h2>
            <p>El ganador por penales solo aplica si el partido admite penales y el marcador queda empatado.</p>
          </div>

          {matches.length === 0 ? (
            <div className="empty-state">Aún no hay partidos cargados.</div>
          ) : (
            <div className="admin-results-list" style={{ maxHeight: "480px", overflowY: "auto" }}>
              {matches.map((match) => {
                const draft = resultDrafts[match.id] ?? getDraftFromMatch(match);
                const teamA = getMatchTeam(teamsById, match.team_a_id, match.team_a_info, "Seleccion por definir");
                const teamB = getMatchTeam(teamsById, match.team_b_id, match.team_b_info, "Seleccion por definir");
                const phaseLabel = getTournamentPhaseLabel(match.phase, teamA.group_key ?? teamB.group_key);
                const parsedGoalsA = draft.goalsA === "" ? null : Number(draft.goalsA);
                const parsedGoalsB = draft.goalsB === "" ? null : Number(draft.goalsB);
                const showPenaltyWinner =
                  draft.supportsPenalties &&
                  parsedGoalsA !== null &&
                  parsedGoalsB !== null &&
                  isDrawScore(parsedGoalsA, parsedGoalsB);
                const isSavingResult = savingMatchId === match.id;
                const resultSaveInProgress = savingMatchId !== null;

                return (
                  <article className="admin-match-row" key={match.id}>
                    <div className="admin-match-title">
                      <Trophy size={18} aria-hidden="true" />
                      <span>{phaseLabel}</span>
                    </div>

                    <div className="admin-result-grid">
                      <label className="field">
                        <span className="field-label">
                          Goles <TeamLabelNoCountry country={teamA.country} flag={teamA.flag} teamFlags={teamFlags} />
                        </span>
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          disabled={resultSaveInProgress}
                          value={draft.goalsA}
                          onChange={(e) => updateDraft(match.id, { goalsA: e.target.value })}
                        />
                      </label>

                      <label className="field">
                        <span className="field-label">
                          Goles <TeamLabelNoCountry country={teamB.country} flag={teamB.flag} teamFlags={teamFlags} />
                        </span>
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          disabled={resultSaveInProgress}
                          value={draft.goalsB}
                          onChange={(e) => updateDraft(match.id, { goalsB: e.target.value })}
                        />
                      </label>

                      {showPenaltyWinner ? (
                        <div className="penalty-winner-panel">
                          <span className="penalty-helper">Elige al ganador por penales</span>
                          <div className="penalty-options" role="radiogroup" aria-label="Ganador por penales">
                            <button
                              className={`penalty-option${draft.penaltyWinner === "team_a" ? " selected" : ""}`}
                              type="button"
                              role="radio"
                              aria-checked={draft.penaltyWinner === "team_a"}
                              disabled={resultSaveInProgress}
                              onClick={() =>
                                updateDraft(match.id, {
                                  penaltyWinner: "team_a",
                                })
                              }
                            >
                              <TeamLabelNoCountry country={teamA.country} flag={teamA.flag} teamFlags={teamFlags} />
                              <span>{formatTeamName(teamA.country)}</span>
                            </button>
                            <button
                              className={`penalty-option${draft.penaltyWinner === "team_b" ? " selected" : ""}`}
                              type="button"
                              role="radio"
                              aria-checked={draft.penaltyWinner === "team_b"}
                              disabled={resultSaveInProgress}
                              onClick={() =>
                                updateDraft(match.id, {
                                  penaltyWinner: "team_b",
                                })
                              }
                            >
                              <TeamLabelNoCountry country={teamB.country} flag={teamB.flag} teamFlags={teamFlags} />
                              <span>{formatTeamName(teamB.country)}</span>
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="admin-result-actions">
                      <button
                        className="ghost-btn admin-save-btn"
                        type="button"
                        disabled={resultSaveInProgress}
                        aria-busy={isSavingResult}
                        onClick={() => handleSaveResult(match)}
                      >
                        <Save size={16} aria-hidden="true" />
                        {isSavingResult ? "Guardando..." : "Guardar resultado"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
