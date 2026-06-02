import type { ChangeEvent } from "react";
import { useId } from "react";
import { ShieldCheck } from "lucide-react";
import type { PenaltyWinner } from "../lib/predictions";
import { isDrawScore } from "../lib/predictions";
import type { TeamFlagMap } from "../lib/teamFlags";
import TeamLabel from "./TeamLabel";
import TeamLabelNoCountry from "./TeamLabelNoCountry";

type PredictionFormFieldsProps = {
  teamA: string;
  teamB: string;
  teamAFlag?: string | null;
  teamBFlag?: string | null;
  goalsA: number | null;
  goalsB: number | null;
  penaltyWinner: PenaltyWinner | null;
  canPredictPenalties: boolean;
  disabled?: boolean;
  teamFlags?: TeamFlagMap;
  onGoalsAChange: (value: number | null) => void;
  onGoalsBChange: (value: number | null) => void;
  onPenaltyWinnerChange: (value: PenaltyWinner | null) => void;
};

const parseGoals = (event: ChangeEvent<HTMLInputElement>) => {
  const rawValue = event.target.value;
  if (rawValue === "") return null;

  const parsedValue = Number(rawValue);
  return Number.isNaN(parsedValue) ? null : Math.max(0, Math.trunc(parsedValue));
};

export default function PredictionFormFields({
  teamA,
  teamB,
  teamAFlag,
  teamBFlag,
  goalsA,
  goalsB,
  penaltyWinner,
  canPredictPenalties,
  disabled = false,
  teamFlags,
  onGoalsAChange,
  onGoalsBChange,
  onPenaltyWinnerChange,
}: PredictionFormFieldsProps) {
  const penaltyGroupId = useId();
  const showPenaltyOptions = canPredictPenalties && isDrawScore(goalsA, goalsB);
  const updateGoalsA = (value: number | null) => {
    onGoalsAChange(value);
    if (!isDrawScore(value, goalsB)) onPenaltyWinnerChange(null);
  };
  const updateGoalsB = (value: number | null) => {
    onGoalsBChange(value);
    if (!isDrawScore(goalsA, value)) onPenaltyWinnerChange(null);
  };

  return (
    <div className="form prediction-form">
      <div className="score-fields">
        <label className="field">
          <span className="field-label">
            Goles <TeamLabel country={teamA} flag={teamAFlag} teamFlags={teamFlags} />
          </span>
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            disabled={disabled}
            value={goalsA ?? ""}
            onChange={(event) => updateGoalsA(parseGoals(event))}
          />
        </label>

        <div className="score-divider" aria-hidden="true">
          -
        </div>

        <label className="field">
          <span className="field-label">
            Goles <TeamLabel country={teamB} flag={teamBFlag} teamFlags={teamFlags} />
          </span>
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            disabled={disabled}
            value={goalsB ?? ""}
            onChange={(event) => updateGoalsB(parseGoals(event))}
          />
        </label>
      </div>

      {canPredictPenalties ? (
        <div className="penalty-panel">
          <div className="penalty-copy">
            <strong>
              <ShieldCheck size={18} aria-hidden="true" />
              Desempate por penales
            </strong>
            <p>Si pronosticas empate, elige quién avanza por penales.</p>
          </div>

          <fieldset
            className={`penalty-options ${showPenaltyOptions ? "" : "penalty-options-hidden"}`}
            aria-hidden={showPenaltyOptions ? undefined : true}
          >
            <legend>Ganador por penales</legend>

            <label
              className={`penalty-option prediction-penalty-option ${penaltyWinner === "team_a" ? "selected" : ""}${
                disabled || !showPenaltyOptions ? " disabled" : ""
              }`}
              aria-label={`${teamA} gana por penales`}
            >
              <input
                type="radio"
                name={penaltyGroupId}
                value="team_a"
                checked={penaltyWinner === "team_a"}
                disabled={disabled || !showPenaltyOptions}
                onChange={() => onPenaltyWinnerChange("team_a")}
              />
              <TeamLabelNoCountry country={teamA} flag={teamAFlag} teamFlags={teamFlags} />
            </label>

            <label
              className={`penalty-option prediction-penalty-option ${penaltyWinner === "team_b" ? "selected" : ""}${
                disabled || !showPenaltyOptions ? " disabled" : ""
              }`}
              aria-label={`${teamB} gana por penales`}
            >
              <input
                type="radio"
                name={penaltyGroupId}
                value="team_b"
                checked={penaltyWinner === "team_b"}
                disabled={disabled || !showPenaltyOptions}
                onChange={() => onPenaltyWinnerChange("team_b")}
              />
              <TeamLabelNoCountry country={teamB} flag={teamBFlag} teamFlags={teamFlags} />
            </label>
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}
