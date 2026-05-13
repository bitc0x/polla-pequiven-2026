// ============ FIFA WORLD CUP 2026 STATIC DATA ============
// Source: openfootball/worldcup.json + FIFA Final Draw (Dec 5, 2025)

export const TEAMS = {
  MEX: { name: "México", short: "MEX", flag: "🇲🇽", aliases: ["Mexico"] },
  RSA: { name: "Sudáfrica", short: "RSA", flag: "🇿🇦", aliases: ["South Africa"] },
  KOR: { name: "Corea del Sur", short: "KOR", flag: "🇰🇷", aliases: ["South Korea", "Korea Republic"] },
  CZE: { name: "Chequia", short: "CZE", flag: "🇨🇿", aliases: ["Czech Republic", "Czechia"] },

  CAN: { name: "Canadá", short: "CAN", flag: "🇨🇦", aliases: ["Canada"] },
  SUI: { name: "Suiza", short: "SUI", flag: "🇨🇭", aliases: ["Switzerland"] },
  QAT: { name: "Catar", short: "QAT", flag: "🇶🇦", aliases: ["Qatar"] },
  BIH: { name: "Bosnia", short: "BIH", flag: "🇧🇦", aliases: ["Bosnia & Herzegovina", "Bosnia and Herzegovina"] },

  BRA: { name: "Brasil", short: "BRA", flag: "🇧🇷", aliases: ["Brazil"] },
  MAR: { name: "Marruecos", short: "MAR", flag: "🇲🇦", aliases: ["Morocco"] },
  HAI: { name: "Haití", short: "HAI", flag: "🇭🇹", aliases: ["Haiti"] },
  SCO: { name: "Escocia", short: "SCO", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", aliases: ["Scotland"] },

  USA: { name: "EE.UU.", short: "USA", flag: "🇺🇸", aliases: ["USA", "United States"] },
  PAR: { name: "Paraguay", short: "PAR", flag: "🇵🇾", aliases: ["Paraguay"] },
  AUS: { name: "Australia", short: "AUS", flag: "🇦🇺", aliases: ["Australia"] },
  TUR: { name: "Turquía", short: "TUR", flag: "🇹🇷", aliases: ["Turkey", "Türkiye"] },

  GER: { name: "Alemania", short: "GER", flag: "🇩🇪", aliases: ["Germany"] },
  CUW: { name: "Curazao", short: "CUW", flag: "🇨🇼", aliases: ["Curaçao", "Curacao"] },
  CIV: { name: "Costa de Marfil", short: "CIV", flag: "🇨🇮", aliases: ["Ivory Coast", "Cote d'Ivoire"] },
  ECU: { name: "Ecuador", short: "ECU", flag: "🇪🇨", aliases: ["Ecuador"] },

  NED: { name: "Países Bajos", short: "NED", flag: "🇳🇱", aliases: ["Netherlands"] },
  JPN: { name: "Japón", short: "JPN", flag: "🇯🇵", aliases: ["Japan"] },
  TUN: { name: "Túnez", short: "TUN", flag: "🇹🇳", aliases: ["Tunisia"] },
  SWE: { name: "Suecia", short: "SWE", flag: "🇸🇪", aliases: ["Sweden"] },

  BEL: { name: "Bélgica", short: "BEL", flag: "🇧🇪", aliases: ["Belgium"] },
  EGY: { name: "Egipto", short: "EGY", flag: "🇪🇬", aliases: ["Egypt"] },
  IRN: { name: "Irán", short: "IRN", flag: "🇮🇷", aliases: ["Iran"] },
  NZL: { name: "Nueva Zelanda", short: "NZL", flag: "🇳🇿", aliases: ["New Zealand"] },

  ESP: { name: "España", short: "ESP", flag: "🇪🇸", aliases: ["Spain"] },
  CPV: { name: "Cabo Verde", short: "CPV", flag: "🇨🇻", aliases: ["Cape Verde"] },
  KSA: { name: "Arabia Saudita", short: "KSA", flag: "🇸🇦", aliases: ["Saudi Arabia"] },
  URU: { name: "Uruguay", short: "URU", flag: "🇺🇾", aliases: ["Uruguay"] },

  FRA: { name: "Francia", short: "FRA", flag: "🇫🇷", aliases: ["France"] },
  SEN: { name: "Senegal", short: "SEN", flag: "🇸🇳", aliases: ["Senegal"] },
  NOR: { name: "Noruega", short: "NOR", flag: "🇳🇴", aliases: ["Norway"] },
  IRQ: { name: "Irak", short: "IRQ", flag: "🇮🇶", aliases: ["Iraq"] },

  ARG: { name: "Argentina", short: "ARG", flag: "🇦🇷", aliases: ["Argentina"] },
  ALG: { name: "Argelia", short: "ALG", flag: "🇩🇿", aliases: ["Algeria"] },
  AUT: { name: "Austria", short: "AUT", flag: "🇦🇹", aliases: ["Austria"] },
  JOR: { name: "Jordania", short: "JOR", flag: "🇯🇴", aliases: ["Jordan"] },

  POR: { name: "Portugal", short: "POR", flag: "🇵🇹", aliases: ["Portugal"] },
  UZB: { name: "Uzbekistán", short: "UZB", flag: "🇺🇿", aliases: ["Uzbekistan"] },
  COL: { name: "Colombia", short: "COL", flag: "🇨🇴", aliases: ["Colombia"] },
  COD: { name: "RD Congo", short: "COD", flag: "🇨🇩", aliases: ["DR Congo", "Congo DR"] },

  ENG: { name: "Inglaterra", short: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", aliases: ["England"] },
  CRO: { name: "Croacia", short: "CRO", flag: "🇭🇷", aliases: ["Croatia"] },
  GHA: { name: "Ghana", short: "GHA", flag: "🇬🇭", aliases: ["Ghana"] },
  PAN: { name: "Panamá", short: "PAN", flag: "🇵🇦", aliases: ["Panama"] },
};

// Reverse-lookup: external name -> internal code
export const NAME_TO_CODE = (() => {
  const m = {};
  for (const [code, t] of Object.entries(TEAMS)) {
    m[t.name.toLowerCase()] = code;
    m[t.short.toLowerCase()] = code;
    for (const a of (t.aliases || [])) m[a.toLowerCase()] = code;
  }
  return m;
})();

export const GROUPS = {
  A: ["MEX", "RSA", "KOR", "CZE"],
  B: ["CAN", "SUI", "QAT", "BIH"],
  C: ["BRA", "MAR", "HAI", "SCO"],
  D: ["USA", "PAR", "AUS", "TUR"],
  E: ["GER", "CUW", "CIV", "ECU"],
  F: ["NED", "JPN", "TUN", "SWE"],
  G: ["BEL", "EGY", "IRN", "NZL"],
  H: ["ESP", "CPV", "KSA", "URU"],
  I: ["FRA", "SEN", "NOR", "IRQ"],
  J: ["ARG", "ALG", "AUT", "JOR"],
  K: ["POR", "UZB", "COL", "COD"],
  L: ["ENG", "CRO", "GHA", "PAN"],
};

// Group stage matches
function generateGroupMatches(groupId) {
  const teams = GROUPS[groupId];
  return [
    { id: `${groupId}-1`, home: teams[0], away: teams[1], group: groupId, matchday: 1 },
    { id: `${groupId}-2`, home: teams[2], away: teams[3], group: groupId, matchday: 1 },
    { id: `${groupId}-3`, home: teams[0], away: teams[2], group: groupId, matchday: 2 },
    { id: `${groupId}-4`, home: teams[3], away: teams[1], group: groupId, matchday: 2 },
    { id: `${groupId}-5`, home: teams[3], away: teams[0], group: groupId, matchday: 3 },
    { id: `${groupId}-6`, home: teams[1], away: teams[2], group: groupId, matchday: 3 },
  ];
}

export const GROUP_MATCHES = Object.keys(GROUPS).flatMap(g => generateGroupMatches(g));

export const GROUP_DATES = {
  1: "11-17 jun",
  2: "17-23 jun",
  3: "23-27 jun",
};

// Knockout rounds (user predicts which teams advance to each round)
export const KO_ROUNDS = [
  { key: 'r32', label: 'Round of 32', count: 32, dates: '28 jun - 3 jul', pointsTeam: 3 },
  { key: 'r16', label: 'Octavos', count: 16, dates: '4-7 jul', pointsTeam: 6 },
  { key: 'qf', label: 'Cuartos', count: 8, dates: '9-11 jul', pointsTeam: 12 },
  { key: 'sf', label: 'Semis', count: 4, dates: '14-15 jul', pointsTeam: 25 },
  { key: 'final', label: 'Final', count: 2, dates: '19 jul', pointsTeam: 50 },
];

// Tournament start: Mexico vs South Africa, 11 jun 2026, 13:00 local CDMX (UTC-6) = 19:00 UTC
export const TOURNAMENT_START = new Date("2026-06-11T19:00:00Z");

export const SPECIAL_AWARDS = [
  { id: "champion", label: "Campeón Mundial", points: 100 },
  { id: "runnerUp", label: "Subcampeón", points: 40 },
  { id: "thirdPlace", label: "Tercer Lugar", points: 25 },
  { id: "topScorer", label: "Bota de Oro (Goleador)", points: 30, freeText: true },
  { id: "bestPlayer", label: "Balón de Oro (Mejor Jugador)", points: 30, freeText: true },
  { id: "bestGK", label: "Guante de Oro (Mejor Portero)", points: 30, freeText: true },
  { id: "youngPlayer", label: "Mejor Sub-21", points: 25, freeText: true },
  { id: "surpriseTeam", label: "Selección Revelación", points: 25 },
];

export const SCORING = {
  exactScore: 5,
  correctOutcome: 2,
  goalDiff: 1,
  r32Team: 3,
  r16Team: 6,
  qfTeam: 12,
  sfTeam: 25,
  finalTeam: 50,
};

export const TOTAL_GROUP_MATCHES = GROUP_MATCHES.length; // 72

// Prize pool
export const BUY_IN_USD = 20;
export const VENMO_HANDLE = "Jose-Latorre";

// External data source for auto-sync
export const OPENFOOTBALL_URL = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";
