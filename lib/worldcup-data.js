// ============ FIFA WORLD CUP 2026 STATIC DATA ============
// Source: FIFA Final Draw (Dec 5, 2025) + final qualifying playoffs (Mar 31, 2026)

export const TEAMS = {
  MEX: { name: "Mexico", short: "MEX", flag: "🇲🇽", confederation: "CONCACAF" },
  RSA: { name: "Sudáfrica", short: "RSA", flag: "🇿🇦", confederation: "CAF" },
  KOR: { name: "Corea del Sur", short: "KOR", flag: "🇰🇷", confederation: "AFC" },
  CZE: { name: "Chequia", short: "CZE", flag: "🇨🇿", confederation: "UEFA" },

  CAN: { name: "Canadá", short: "CAN", flag: "🇨🇦", confederation: "CONCACAF" },
  SUI: { name: "Suiza", short: "SUI", flag: "🇨🇭", confederation: "UEFA" },
  QAT: { name: "Catar", short: "QAT", flag: "🇶🇦", confederation: "AFC" },
  BIH: { name: "Bosnia y Herzegovina", short: "BIH", flag: "🇧🇦", confederation: "UEFA" },

  BRA: { name: "Brasil", short: "BRA", flag: "🇧🇷", confederation: "CONMEBOL" },
  MAR: { name: "Marruecos", short: "MAR", flag: "🇲🇦", confederation: "CAF" },
  HAI: { name: "Haití", short: "HAI", flag: "🇭🇹", confederation: "CONCACAF" },
  SCO: { name: "Escocia", short: "SCO", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", confederation: "UEFA" },

  USA: { name: "Estados Unidos", short: "USA", flag: "🇺🇸", confederation: "CONCACAF" },
  PAR: { name: "Paraguay", short: "PAR", flag: "🇵🇾", confederation: "CONMEBOL" },
  AUS: { name: "Australia", short: "AUS", flag: "🇦🇺", confederation: "AFC" },
  TUR: { name: "Turquía", short: "TUR", flag: "🇹🇷", confederation: "UEFA" },

  GER: { name: "Alemania", short: "GER", flag: "🇩🇪", confederation: "UEFA" },
  CUW: { name: "Curazao", short: "CUW", flag: "🇨🇼", confederation: "CONCACAF" },
  CIV: { name: "Costa de Marfil", short: "CIV", flag: "🇨🇮", confederation: "CAF" },
  ECU: { name: "Ecuador", short: "ECU", flag: "🇪🇨", confederation: "CONMEBOL" },

  NED: { name: "Países Bajos", short: "NED", flag: "🇳🇱", confederation: "UEFA" },
  JPN: { name: "Japón", short: "JPN", flag: "🇯🇵", confederation: "AFC" },
  TUN: { name: "Túnez", short: "TUN", flag: "🇹🇳", confederation: "CAF" },
  SWE: { name: "Suecia", short: "SWE", flag: "🇸🇪", confederation: "UEFA" },

  BEL: { name: "Bélgica", short: "BEL", flag: "🇧🇪", confederation: "UEFA" },
  EGY: { name: "Egipto", short: "EGY", flag: "🇪🇬", confederation: "CAF" },
  IRN: { name: "Irán", short: "IRN", flag: "🇮🇷", confederation: "AFC" },
  NZL: { name: "Nueva Zelanda", short: "NZL", flag: "🇳🇿", confederation: "OFC" },

  ESP: { name: "España", short: "ESP", flag: "🇪🇸", confederation: "UEFA" },
  CPV: { name: "Cabo Verde", short: "CPV", flag: "🇨🇻", confederation: "CAF" },
  KSA: { name: "Arabia Saudita", short: "KSA", flag: "🇸🇦", confederation: "AFC" },
  URU: { name: "Uruguay", short: "URU", flag: "🇺🇾", confederation: "CONMEBOL" },

  FRA: { name: "Francia", short: "FRA", flag: "🇫🇷", confederation: "UEFA" },
  SEN: { name: "Senegal", short: "SEN", flag: "🇸🇳", confederation: "CAF" },
  NOR: { name: "Noruega", short: "NOR", flag: "🇳🇴", confederation: "UEFA" },
  IRQ: { name: "Irak", short: "IRQ", flag: "🇮🇶", confederation: "AFC" },

  ARG: { name: "Argentina", short: "ARG", flag: "🇦🇷", confederation: "CONMEBOL" },
  ALG: { name: "Argelia", short: "ALG", flag: "🇩🇿", confederation: "CAF" },
  AUT: { name: "Austria", short: "AUT", flag: "🇦🇹", confederation: "UEFA" },
  JOR: { name: "Jordania", short: "JOR", flag: "🇯🇴", confederation: "AFC" },

  POR: { name: "Portugal", short: "POR", flag: "🇵🇹", confederation: "UEFA" },
  UZB: { name: "Uzbekistán", short: "UZB", flag: "🇺🇿", confederation: "AFC" },
  COL: { name: "Colombia", short: "COL", flag: "🇨🇴", confederation: "CONMEBOL" },
  COD: { name: "RD Congo", short: "COD", flag: "🇨🇩", confederation: "CAF" },

  ENG: { name: "Inglaterra", short: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", confederation: "UEFA" },
  CRO: { name: "Croacia", short: "CRO", flag: "🇭🇷", confederation: "UEFA" },
  GHA: { name: "Ghana", short: "GHA", flag: "🇬🇭", confederation: "CAF" },
  PAN: { name: "Panamá", short: "PAN", flag: "🇵🇦", confederation: "CONCACAF" },
};

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

// Generate the 6 matches per group (each team plays each other once)
// Pattern: team1 vs team2, team3 vs team4, team1 vs team3, team4 vs team2, team4 vs team1, team2 vs team3
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

// Match date approximations based on FIFA schedule (Jun 11 - Jun 27)
// Matchday 1: Jun 11-17, Matchday 2: Jun 17-23, Matchday 3: Jun 23-27
export const GROUP_DATES = {
  1: "11-17 jun",
  2: "17-23 jun",
  3: "23-27 jun",
};

// Knockout slots (32 -> 16 -> 8 -> 4 -> 2 -> 1)
// Round of 32: 16 matches, dates Jun 28 - Jul 3
// Round of 16: 8 matches, dates Jul 4 - Jul 7
// Quarterfinals: 4 matches, dates Jul 9 - Jul 11
// Semifinals: 2 matches, dates Jul 14 - Jul 15
// 3rd place: 1 match, Jul 18
// Final: Jul 19

export const KNOCKOUT_SLOTS = {
  // Round of 32 - 16 matches. We won't tie them to specific groups (depends on standings)
  // User predicts which 32 teams advance, then bracket winners
  r32: Array.from({ length: 16 }, (_, i) => `r32-${i + 1}`),
  r16: Array.from({ length: 8 }, (_, i) => `r16-${i + 1}`),
  qf: Array.from({ length: 4 }, (_, i) => `qf-${i + 1}`),
  sf: Array.from({ length: 2 }, (_, i) => `sf-${i + 1}`),
  third: ["third-1"],
  final: ["final"],
};

export const TOURNAMENT_START = new Date("2026-06-11T16:00:00-06:00"); // Mexico vs South Africa, 16:00 CDMX time

export const SPECIAL_AWARDS = [
  { id: "champion", label: "Campeón Mundial", points: 100 },
  { id: "runnerUp", label: "Subcampeón", points: 40 },
  { id: "thirdPlace", label: "Tercer Lugar", points: 25 },
  { id: "topScorer", label: "Bota de Oro (goleador)", points: 30, freeText: true },
  { id: "bestPlayer", label: "Balón de Oro (mejor jugador)", points: 30, freeText: true },
  { id: "bestGK", label: "Guante de Oro (mejor portero)", points: 30, freeText: true },
  { id: "youngPlayer", label: "Mejor Sub-21", points: 25, freeText: true },
  { id: "surpriseTeam", label: "Selección Revelación", points: 25 },
];

// Scoring system
export const SCORING = {
  exactScore: 5,       // exact final score in group stage
  correctOutcome: 2,   // correct 1X2 only
  goalDiff: 1,         // correct goal difference bonus
  r32Team: 3,          // each team correctly predicted to be in R32
  r16Team: 6,          // each team correctly predicted to be in R16
  qfTeam: 12,          // each team correctly predicted to be in QF
  sfTeam: 25,          // each team correctly predicted to be in SF
  finalTeam: 50,       // each team correctly predicted to be in Final
};

// Total matches helper
export const TOTAL_GROUP_MATCHES = GROUP_MATCHES.length; // 72
