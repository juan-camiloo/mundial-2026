import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Award, Crown, Flag, Medal, Send, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TeamLabel from "../components/TeamLabel";
import { supabase } from "../lib/supabase";
import { buildTeamFlagMap, type TeamFlagMap } from "../lib/teamFlags";

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

const normalizeTeam = (team: string) =>
  team
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export default function FairytaleEnding() {
  const [form, setForm] = useState<Record<PositionKey, string>>({
    champion: "",
    subchampion: "",
    third_place: "",
    fourth_place: "",
  });
  const [existing, setExisting] = useState<FairytaleEndingRow | null>(null);
  const [teamsList, setTeamsList] = useState<string[]>([]);
  const [teamFlags, setTeamFlags] = useState<TeamFlagMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userData?.user || userError) {
        navigate("/login");
        return;
      }

      const [{ data: predData, error: predError }, { data: teams }] = await Promise.all([
        supabase
          .from("fairytale_ending")
          .select("*")
          .eq("user_id", userData.user.id)
          .maybeSingle(),
        supabase.from("teams").select("country, flag").order("country", { ascending: true }),
      ]);

      if (predError) {
        setError("Error al cargar tu pronóstico.");
      } else if (predData) {
        setExisting(predData);
      }

      setTeamsList((teams ?? []).map((team) => team.country).filter(Boolean));
      setTeamFlags(buildTeamFlagMap(teams ?? []));

      setLoading(false);
    };

    load();
  }, [navigate]);

  const selectedTeams = POSITIONS.map(({ key }) => normalizeTeam(form[key])).filter(Boolean);
  const allFilled = POSITIONS.every(({ key }) => form[key].trim() !== "");
  const hasDuplicateTeams = new Set(selectedTeams).size !== selectedTeams.length;
  const canSubmit = allFilled && !hasDuplicateTeams && !saving;

  const handleSubmit = async () => {
    if (!allFilled) return;
    if (hasDuplicateTeams) {
      setError("No puedes repetir equipos en la final soñada.");
      return;
    }

    setSaving(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setSaving(false);
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
            así que elige con cuidado.
          </p>
        </header>

        {loading ? (
          <div className="empty-state">Cargando tu pronóstico...</div>
        ) : existing ? (
          <div className="rule-block">
            <div className="section-header">
              <h2>
                <Sparkles size={20} aria-hidden="true" />
                Tu pronóstico registrado
              </h2>
              <p>Ya enviaste tu Final Soñada. Buena suerte.</p>
            </div>

            <div className="fairytale-podium-visual">
              {PODIUM_ORDER.map((key) => {
                const pos = POSITIONS.find((position) => position.key === key)!;
                const team = existing[key];
                const Icon = pos.Icon;

                return (
                  <div className="fairytale-podium-col" key={key}>
                    <Icon className="fairytale-medal" size={26} aria-hidden="true" />
                    <div className={`fairytale-team-chip ${pos.chipClass}`}>
                      <TeamLabel country={team} teamFlags={teamFlags} />
                    </div>
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
                    value={form[key]}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>

            {hasDuplicateTeams ? (
              <p className="fairytale-error">No repitas equipos entre posiciones.</p>
            ) : null}
            {error && <p className="fairytale-error">{error}</p>}
            {saved && <p className="fairytale-success">Pronóstico guardado exitosamente.</p>}

            <div className="prediction-actions fairytale-actions">
              <button className="navbar-btn" onClick={handleSubmit} disabled={!canSubmit}>
                <Send size={16} aria-hidden="true" />
                {saving ? "Guardando..." : "Enviar pronóstico final"}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
