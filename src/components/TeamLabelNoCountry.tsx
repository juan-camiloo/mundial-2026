import { getTeamFlag, getTeamFlagImage, type TeamFlagMap } from "../lib/teamFlags";

type TeamLabelProps = {
  country?: string | null | undefined;
  flag?: string | null;
  teamFlags?: TeamFlagMap;
};

export default function TeamLabelNoCountry({ country, flag: explicitFlag, teamFlags }: TeamLabelProps) {
  const flagImage =
    explicitFlag && explicitFlag.startsWith("http") ? explicitFlag : getTeamFlagImage(country);
  const flag = flagImage ? "" : getTeamFlag(country, teamFlags) || explicitFlag;

  return (
    <span className="team-label">
      {flagImage ? (
        <img className="team-flag-img" src={flagImage} alt="" loading="lazy" aria-hidden="true" />
      ) : flag ? (
        <span className="team-flag" aria-hidden="true">
          {flag}
        </span>
      ) : null}
    </span>
  );
}
