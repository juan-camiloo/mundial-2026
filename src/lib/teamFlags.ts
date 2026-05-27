export type TeamFlagMap = Record<string, string>;
/** normalizedName → iso_code (e.g. "mx", "gb-eng") — built from teams.iso_code */
export type TeamIsoMap  = Record<string, string>;

type TeamLike = {
  country?:   string | null;
  flag?:      string | null;
  iso_code?:  string | null;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const repairMojibake = (value: string) =>
  value
    .replace(/ÃƒÂ¡|Ã¡/g, "á")
    .replace(/ÃƒÂ©|Ã©/g, "é")
    .replace(/ÃƒÂ­|Ã­/g, "í")
    .replace(/ÃƒÂ³|Ã³/g, "ó")
    .replace(/ÃƒÂº|Ãº/g, "ú")
    .replace(/ÃƒÂ¼|Ã¼/g, "ü")
    .replace(/ÃƒÂ±|Ã±/g, "ñ")
    .replace(/ÃƒÂ§|Ã§/g, "ç")
    .replace(/ÃƒÂ´|Ã´/g, "ô")
    .replace(/ÃƒÂ|Ã/g,   "Á")
    .replace(/ÃƒÂ‰|Ã‰/g, "É")
    .replace(/ÃƒÂ|Ã/g,   "Í")
    .replace(/ÃƒÂ"|Ã"/g, "Ó")
    .replace(/ÃƒÂš|Ãš/g, "Ú")
    .replace(/ÃƒÂœ|Ãœ/g, "Ü")
    .replace(/ÃƒÂ'|Ã'/g, "Ñ");

export const normalizeTeamName = (value: string | null | undefined) =>
  repairMojibake(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const ENGLAND_FLAG  = "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}";
const SCOTLAND_FLAG = "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}";
const SUBDIVISION_FLAG_IMAGES: Record<string, string> = {
  "gb-eng":
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 36'%3E%3Cpath fill='%23fff' d='M0 0h60v36H0z'/%3E%3Cpath fill='%23cf142b' d='M0 14h60v8H0zM26 0h8v36h-8z'/%3E%3C/svg%3E",
  "gb-sct":
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 36'%3E%3Cpath fill='%230065bd' d='M0 0h60v36H0z'/%3E%3Cpath stroke='%23fff' stroke-width='7' d='M0 0l60 36M60 0L0 36'/%3E%3C/svg%3E",
};

// ---------------------------------------------------------------------------
// FALLBACK map — only used when teams.iso_code is not populated.
// Country names here use the canonical spellings from the DB.
// If you keep teams.iso_code up to date you will never need this map.
// ---------------------------------------------------------------------------

const TEAM_FLAG_CODES_FALLBACK: Record<string, string> = {
  Alemania: "de",   Germany: "de",
  "Arabia Saudita": "sa", "Arabia Saudí": "sa", "Saudi Arabia": "sa",
  Argelia: "dz",    Algeria: "dz",
  Argentina: "ar",
  Australia: "au",
  Austria: "at",
  Bélgica: "be",    Belgica: "be",    Belgium: "be",
  "Bosnia y Herzegovina": "ba", "Bosnia and Herzegovina": "ba",
  Brasil: "br",     Brazil: "br",
  "Cabo Verde": "cv",
  Canadá: "ca",     Canada: "ca",
  Catar: "qa",      Qatar: "qa",
  Chequia: "cz",    "República Checa": "cz", Czechia: "cz",
  Colombia: "co",
  "Corea del Sur": "kr", "República de Corea": "kr", "Korea Republic": "kr",
  "Costa de Marfil": "ci", "Côte d'Ivoire": "ci", "Cote d'Ivoire": "ci",
  Croacia: "hr",    Croatia: "hr",
  Curazao: "cw",    Curaçao: "cw",
  Ecuador: "ec",
  Egipto: "eg",     Egypt: "eg",
  Escocia: "gb-sct", Scotland: "gb-sct",
  España: "es",     Espana: "es",     Spain: "es",
  "Estados Unidos": "us", USA: "us",  "United States": "us",
  Francia: "fr",    France: "fr",
  Ghana: "gh",
  Haití: "ht",      Haiti: "ht",
  Inglaterra: "gb-eng", England: "gb-eng",
  Irak: "iq",       Iraq: "iq",
  Irán: "ir",       Iran: "ir",       "RI de Irán": "ir", "IR Iran": "ir",
  Japón: "jp",      Japon: "jp",      Japan: "jp",
  Jordania: "jo",   Jordan: "jo",
  Marruecos: "ma",  Morocco: "ma",
  México: "mx",     Mexico: "mx",
  Noruega: "no",    Norway: "no",
  "Nueva Zelanda": "nz", "New Zealand": "nz",
  "Países Bajos": "nl", "Paises Bajos": "nl", Netherlands: "nl",
  Panamá: "pa",     Panama: "pa",
  Paraguay: "py",
  Portugal: "pt",
  "RD Congo": "cd", "RD de Congo": "cd", "DR Congo": "cd", "Congo DR": "cd",
  Senegal: "sn",
  Sudáfrica: "za",  Sudafrica: "za",  "South Africa": "za",
  Suecia: "se",     Sweden: "se",
  Suiza: "ch",      Switzerland: "ch",
  Túnez: "tn",      Tunez: "tn",      Tunisia: "tn",
  Turquía: "tr",    Turquia: "tr",    Türkiye: "tr",    Turkey: "tr",
  Uruguay: "uy",
  Uzbekistán: "uz", Uzbekistan: "uz",
};

const FALLBACK_CODES_BY_NAME = Object.entries(TEAM_FLAG_CODES_FALLBACK).reduce<Record<string, string>>(
  (acc, [country, code]) => {
    acc[normalizeTeamName(country)] = code.toLowerCase();
    return acc;
  },
  {},
);

const flagFromIsoCode = (code: string): string => {
  if (code === "gb-eng") return ENGLAND_FLAG;
  if (code === "gb-sct") return SCOTLAND_FLAG;
  if (!/^[a-z]{2}$/i.test(code)) return "";
  return code
    .toUpperCase()
    .split("")
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join("");
};

// ---------------------------------------------------------------------------
// Public builders — called once after loading teams from DB
// ---------------------------------------------------------------------------

/** Builds the emoji/text flag map from teams.flag (as before). */
export const buildTeamFlagMap = (teams: TeamLike[] = []): TeamFlagMap =>
  teams.reduce<TeamFlagMap>((acc, team) => {
    const key = normalizeTeamName(team.country);
    if (key && team.flag) acc[key] = repairMojibake(team.flag);
    return acc;
  }, {});

/** NEW — builds a normalizedName → iso_code map from teams.iso_code. */
export const buildTeamIsoMap = (teams: TeamLike[] = []): TeamIsoMap =>
  teams.reduce<TeamIsoMap>((acc, team) => {
    const key = normalizeTeamName(team.country);
    if (key && team.iso_code) acc[key] = team.iso_code.toLowerCase();
    return acc;
  }, {});

// ---------------------------------------------------------------------------
// Public lookups — isoMap (from DB) takes priority; fallback map is a safety net
// ---------------------------------------------------------------------------

/**
 * Returns the ISO country code for a team.
 * Checks the DB-backed isoMap first, then the built-in fallback table.
 */
export const getTeamFlagCode = (
  country:  string | null | undefined,
  isoMap?:  TeamIsoMap,
): string => {
  const key = normalizeTeamName(country);
  return isoMap?.[key] ?? FALLBACK_CODES_BY_NAME[key] ?? "";
};

/**
 * Returns a flagcdn.com image URL for the team.
 * Returns empty string for teams with no recognised code.
 */
export const getTeamFlagImage = (
  country:  string | null | undefined,
  isoMap?:  TeamIsoMap,
): string => {
  const code = getTeamFlagCode(country, isoMap);
  if (!code) return "";
  if (code === "gb-eng" || code === "gb-sct") return SUBDIVISION_FLAG_IMAGES[code];
  return `https://flagcdn.com/w40/${code}.png`;
};

/**
 * Returns the best available text/emoji flag for a team.
 * Priority: stored flag emoji (DB) → computed emoji from ISO code.
 */
export const getTeamFlag = (
  country:   string | null | undefined,
  teamFlags?: TeamFlagMap,
  isoMap?:   TeamIsoMap,
): string => {
  const key = normalizeTeamName(country);
  const storedFlag = teamFlags?.[key];
  if (storedFlag && !storedFlag.includes("ð")) return storedFlag;
  return flagFromIsoCode(getTeamFlagCode(country, isoMap));
};

export const formatTeamName = (country: string | null | undefined) =>
  repairMojibake(country ?? "Selección");
