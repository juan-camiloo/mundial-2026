import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import type { TeamFlagMap } from "../lib/teamFlags";
import type { TeamRow } from "../lib/teams";
import TeamLabel from "./TeamLabel";

type TeamSelectProps = {
  label: string;
  placeholder: string;
  teams: TeamRow[];
  value: TeamRow | null;
  disabledTeamId?: string | null;
  teamFlags?: TeamFlagMap;
  onChange: (team: TeamRow | null) => void;
};

const normalize = (value: string | null | undefined) =>
  (value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export default function TeamSelect({
  label,
  placeholder,
  teams,
  value,
  disabledTeamId,
  teamFlags,
  onChange,
}: TeamSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedId = value?.id ?? "";
  const normalizedSearch = normalize(search);

  const filteredTeams = useMemo(
    () =>
      teams.filter((team) => {
        if (!normalizedSearch) return true;
        return normalize(team.country).includes(normalizedSearch);
      }),
    [normalizedSearch, teams]
  );

  return (
    <div
      className="team-select"
      onBlur={(event) => {
        const nextFocusedElement = event.relatedTarget;
        if (
          !(nextFocusedElement instanceof Node) ||
          !event.currentTarget.contains(nextFocusedElement)
        ) {
          setOpen(false);
          setSearch("");
        }
      }}
    >
      <span className="team-select-label">{label}</span>
      <button
        type="button"
        className={`team-select-trigger ${open ? "open" : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={value ? "team-select-value" : "team-select-placeholder"}>
          {value ? (
            <TeamLabel country={value.country} flag={value.flag} teamFlags={teamFlags} />
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>

      {open ? (
        <div className="team-select-menu">
          <label className="team-select-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar pais..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              autoFocus
            />
          </label>

          <div className="team-select-options">
            {filteredTeams.length === 0 ? (
              <div className="team-select-empty">No hay equipos con ese nombre.</div>
            ) : (
              filteredTeams.map((team) => {
                const selected = team.id === selectedId;
                const disabled = Boolean(disabledTeamId && team.id === disabledTeamId);

                return (
                  <button
                    type="button"
                    className={`team-select-option ${selected ? "selected" : ""}`}
                    key={team.id}
                    disabled={disabled}
                    onClick={() => {
                      onChange(team);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <TeamLabel country={team.country} flag={team.flag} teamFlags={teamFlags} />
                    {disabled ? (
                      <span className="team-select-option-note">Ya elegido</span>
                    ) : selected ? (
                      <Check size={16} aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
