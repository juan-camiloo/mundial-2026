import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Award, CheckCircle2, Crown, Flag, Medal, Send, Sparkles, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FormStatusMessage from "../components/FormStatusMessage";
import TeamLabel from "../components/TeamLabel";
import {
  buildFairytaleOfficialPodiumFromMatches,
  FAIRYTALE_ENDING_CLOSED_MESSAGE,
  FAIRYTALE_ENDING_DEADLINE_LABEL,
  type FairytalePodiumLike,
  isFairytalePodiumComplete,
  isFairytalePodiumPositionHit,
  isFairytaleEndingClosed,
  normalizeFairytaleTeam,
} from "../lib/fairytaleEnding";
import { MATCH_COLUMNS, type MatchRow } from "../lib/matches";
import { supabase } from "../lib/supabase";
import { buildTeamFlagMap, type TeamFlagMap } from "../lib/teamFlags";
import { buildTeamLookup, TEAM_COLUMNS, type TeamRow } from "../lib/teams";

type FairytaleEndingRow = {
  user_id: string;
  champion: string;
  subchampion: string;
  third_place: string;
  fourth_place: string;
};

const POSITIONS = [
  {
    key: "champion",
    Icon: Crown,
    label: "Campeón",
    hint: "¿Quién levanta la copa?",
    blockClass: "podium-block-1",
    chipClass: "podium-chip-1",
    height: 110,
  },
  {
    key: "subchampion",
    Icon: Medal,
    label: "2° lugar",
    hint: "Finalista perdedor",
    blockClass: "podium-block-2",
    chipClass: "podium-chip-2",
    height: 80,
  },
  {
    key: "third_place",
    Icon: Award,
    label: "3° lugar",
    hint: "Ganador del 3er puesto",
    blockClass: "podium-block-3",
    chipClass: "podium-chip-3",
    height: 58,
  },
  {
    key: "fourth_place",
    Icon: Flag,
    label: "4° lugar",
    hint: "Perdedor del 3er puesto",
    blockClass: "podium-block-4",
    chipClass: "podium-chip-4",
    height: 40,
  },
] as const satisfies ReadonlyArray<{
  key: string;
  Icon: LucideIcon;
  label: string;
  hint: string;
  blockClass: string;
  chipClass: string;
  height: number;
}>;

type PositionKey = typeof POSITIONS[number]["key"];

const PODIUM_ORDER: PositionKey[] = ["subchampion", "champion", "third_place", "fourth_place"];

export default function FairytaleEnding() {
  const [form, setForm] = useState<Record<PositionKey, string>>({
    champion: "",
    subchampion: "",
    third_place: "",
    fourth_place: "",
  });
  const [existing, setExisting] = useState<FairytaleEndingRow | null>(null);
  const [officialPodium, setOfficialPodium] = useState<FairytalePodiumLike | null>(null);
  const [teamsList, setTeamsList] = useState<string[]>([]);
  const [teamFlags, setTeamFlags] = useState<TeamFlagMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmingSave, setConfirmingSave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userData?.user || userError) {
        navigate("/login");
        return;
      }

      const [
        { data: predData, error: predError },
        { data: matchRows },
        { data: teams },
      ] = await Promise.all([
        supabase
          .from("fairytale_ending")
          .select("*")
          .eq("user_id", userData.user.id)
          .maybeSingle(),
        supabase
          .from("matches")
          .select(MATCH_COLUMNS)
          .order("match_date", { ascending: true }),
        supabase.from("teams").select(TEAM_COLUMNS).order("country", { ascending: true }),
      ]);

      if (predError) {
        setError("Error al cargar tu pronóstico.");
      } else if (predData) {
        setExisting(predData);
      }

      const teamRows = (teams ?? []) as TeamRow[];
      setOfficialPodium(
        buildFairytaleOfficialPodiumFromMatches(
          (matchRows ?? []) as MatchRow[],
          buildTeamLookup(teamRows),
        ),
      );
      setTeamsList(teamRows.flatMap((team) => (team.country ? [team.country] : [])));
      setTeamFlags(buildTeamFlagMap(teamRows));

      setLoading(false);
    };

    load();
  }, [navigate]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  const selectedTeams = POSITIONS.map(({ key }) => normalizeFairytaleTeam(form[key])).filter(Boolean);
  const allFilled = POSITIONS.every(({ key }) => form[key].trim() !== "");
  const hasDuplicateTeams = new Set(selectedTeams).size !== selectedTeams.length;
  const submissionClosed = isFairytaleEndingClosed(currentTime);
  const canSubmit = allFilled && !hasDuplicateTeams && !saving && !confirmingSave && !submissionClosed;
  const podiumPreview = POSITIONS.map(({ key, label }) => ({
    key,
    label,
    team: form[key].trim(),
  }));
  const fairytaleStatus = hasDuplicateTeams
    ? { type: "error" as const, message: "No repitas equipos entre posiciones." }
    : error
      ? { type: "error" as const, message: error }
      : saved
        ? { type: "success" as const, message: "Pronóstico guardado exitosamente." }
        : null;
  const officialPodiumLoaded = isFairytalePodiumComplete(officialPodium);

  const getPodiumResult = (key: PositionKey) => {
    if (!existing || !officialPodiumLoaded || !officialPodium) return null;

    const hit = isFairytalePodiumPositionHit(existing, officialPodium, key);

    return hit
      ? {
          className: "hit",
          Icon: CheckCircle2,
          label: "Acertaste",
          title: "Coincide con el podio oficial.",
        }
      : {
          className: "miss",
          Icon: XCircle,
          label: "Fallaste",
          title: `Oficial: ${officialPodium[key] ?? ""}`,
        };
  };

  const handleSubmit = () => {
    if (isFairytaleEndingClosed()) {
      setError(FAIRYTALE_ENDING_CLOSED_MESSAGE);
      return;
    }

    if (!allFilled) return;
    if (hasDuplicateTeams) {
      setError("No puedes repetir equipos en la final soñada.");
      return;
    }

    setError(null);
    setSaved(false);
    setConfirmingSave(true);
  };

  const handleConfirmSave = async () => {
    if (saving) return;

    if (isFairytaleEndingClosed()) {
      setConfirmingSave(false);
      setError(FAIRYTALE_ENDING_CLOSED_MESSAGE);
      return;
    }

    if (!allFilled) {
      setConfirmingSave(false);
      return;
    }

    if (hasDuplicateTeams) {
      setConfirmingSave(false);
      setError("No puedes repetir equipos en la final soñada.");
      return;
    }

    setSaving(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setSaving(false);
      setConfirmingSave(false);
      navigate("/login");
      return;
    }

    const payload = {
      user_id: userData.user.id,
      champion: form.champion.trim(),
      subchampion: form.subchampion.trim(),
      third_place: form.third_place.trim(),
      fourth_place: form.fourth_place.trim(),
    };

    const { data, error: upsertError } = await supabase
      .from("fairytale_ending")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();

    if (upsertError) {
      setError("No pudimos guardar tu pronóstico. Intenta de nuevo.");
    } else {
      setExisting(data);
      setSaved(true);
    }

    setConfirmingSave(false);
    setSaving(false);
  };

  return (
    <main className="page">
      <div className="fairytale-shell">
        <header className="matches-header">
          <span className="pill">
            <Sparkles size={14} aria-hidden="true" />
            Pronóstico especial
          </span>
          <h1>Final soñada</h1>
          <p>
            Predice el podio final del torneo. Solo puedes enviar este pronóstico una vez,
            así que elige con cuidado. Disponible hasta el {FAIRYTALE_ENDING_DEADLINE_LABEL}.
          </p>
        </header>

        {loading ? (
          <div className="empty-state">Cargando tu pronóstico...</div>
        ) : existing ? (
          <div className="rule-block fairytale-result-card">
            <div className="section-header">
              <h2>
                <Sparkles size={20} aria-hidden="true" />
                Tu pronóstico registrado
              </h2>
              <p>
                {officialPodiumLoaded
                  ? "Los resultados de la final y el tercer puesto ya están cargados. Revisa cuáles posiciones acertaste."
                  : "Ya enviaste tu Final Soñada. Los aciertos aparecerán cuando se carguen los resultados de la final y el tercer puesto."}
              </p>
            </div>

            <div className="fairytale-podium-visual">
              {PODIUM_ORDER.map((key) => {
                const pos = POSITIONS.find((position) => position.key === key)!;
                const team = existing[key];
                const Icon = pos.Icon;
                const result = getPodiumResult(key);
                const ResultIcon = result?.Icon;

                return (
                  <div className="fairytale-podium-col" key={key}>
                    <Icon className="fairytale-medal" size={26} aria-hidden="true" />
                    <div className={`fairytale-team-chip ${pos.chipClass}`}>
                      <TeamLabel country={team} teamFlags={teamFlags} />
                    </div>
                    {result && ResultIcon ? (
                      <span
                        className={`fairytale-result-badge ${result.className}`}
                        title={result.title}
                      >
                        <ResultIcon size={14} aria-hidden="true" />
                        {result.label}
                      </span>
                    ) : null}
                    <div
                      className={`fairytale-podium-block ${pos.blockClass}`}
                      style={{ height: pos.height }}
                    >
                      <span className="fairytale-podium-rank">
                        {pos.label.replace(" lugar", "").replace("Campeón", "1°")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : submissionClosed ? (
          <section className="rule-block">
            <div className="section-header">
              <h2>
                <Sparkles size={20} aria-hidden="true" />
                Final soñada cerrada
              </h2>
              <p>{FAIRYTALE_ENDING_CLOSED_MESSAGE}</p>
            </div>
          </section>
        ) : (
          <section className="rule-block">
            <div className="section-header">
              <h2>
                <Sparkles size={20} aria-hidden="true" />
                Completa tu pronóstico
              </h2>
              <p>
                Ingresa el nombre de los cuatro equipos que terminarán en cada posición.
                Este pronóstico no se puede editar una vez enviado.
              </p>
            </div>

            <div className="fairytale-form-grid">
              <datalist id="world-cup-teams">
                {teamsList.map((team) => (
                  <option value={team} key={team} />
                ))}
              </datalist>
              {POSITIONS.map(({ key, Icon, label, hint }) => (
                <div className="fairytale-field" key={key}>
                  <div className="fairytale-field-header">
                    <Icon className="podium-emoji" size={24} aria-hidden="true" />
                    <div>
                      <span className="fairytale-field-label">{label}</span>
                      <span className="fairytale-field-hint">{hint}</span>
                    </div>
                  </div>
                  <input
                    type="text"
                    list="world-cup-teams"
                    placeholder={`Selección ${label.toLowerCase()}`}
                    disabled={saving}
                    value={form[key]}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>

            <FormStatusMessage
              className="fairytale-status"
              message={fairytaleStatus?.message}
              type={fairytaleStatus?.type ?? "error"}
              role={fairytaleStatus?.type === "success" ? "status" : "alert"}
            />

            <div className="prediction-actions fairytale-actions">
              <button
                className="navbar-btn"
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                aria-busy={saving}
              >
                <Send size={16} aria-hidden="true" />
                {saving ? "Guardando..." : "Enviar pronóstico final"}
              </button>
            </div>

            {confirmingSave ? (
              <div className="fairytale-confirm-backdrop" role="presentation">
                <section
                  className="fairytale-confirm-dialog"
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="fairytale-confirm-title"
                  aria-describedby="fairytale-confirm-copy"
                >
                  <div className="fairytale-confirm-header">
                    <Sparkles size={20} aria-hidden="true" />
                    <h3 id="fairytale-confirm-title">Guardar Final Soñada</h3>
                  </div>
                  <p id="fairytale-confirm-copy">
                    Recuerda que solo puedes cargar tu Final Soñada 1 vez. Este registro{" "}
                    <strong>NO se podrá editar</strong> una vez guardado. ¿Deseas guardar estas
                    posiciones en el podio?
                  </p>

                  <dl className="fairytale-confirm-podium">
                    {podiumPreview.map(({ key, label, team }) => (
                      <div className="fairytale-confirm-row" key={key}>
                        <dt>{label}</dt>
                        <dd>{team}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="fairytale-confirm-actions">
                    <button
                      className="ghost-btn"
                      type="button"
                      disabled={saving}
                      onClick={() => setConfirmingSave(false)}
                    >
                      No, editar
                    </button>
                    <button
                      className="primary-btn"
                      type="button"
                      disabled={saving}
                      aria-busy={saving}
                      onClick={handleConfirmSave}
                    >
                      {saving ? "Guardando..." : "Sí, guardar"}
                    </button>
                  </div>
                </section>
              </div>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}
