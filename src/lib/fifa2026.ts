import type { TeamRow } from "./teams";

export type Fifa2026GroupKey =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L";

export type Fifa2026KnockoutRoundKey =
  | "round32"
  | "round16"
  | "quarter"
  | "semi"
  | "third"
  | "final";

export type MatchState =
  | "scheduled"
  | "live"
  | "halftime"
  | "extra_time"
  | "penalties"
  | "finished"
  | "postponed"
  | "suspended"
  | "cancelled"
  | "abandoned";

export type Fifa2026TeamSeed = {
  team: TeamRow;
  group: Fifa2026GroupKey;
  seedOrder: number;
  fairPlayScore?: number | null;
  fifaRanking?: number | null;
  previousFifaRankings?: Array<number | null>;
};

export type Fifa2026GroupMatch = {
  id: string;
  group: Fifa2026GroupKey;
  teamAId: string | null;
  teamBId: string | null;
  goalsA: number | null;
  goalsB: number | null;
  state?: MatchState | null;
};

export type Fifa2026StandingRow = {
  team: TeamRow;
  group: Fifa2026GroupKey;
  seedOrder: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  fairPlayScore: number | null;
  fifaRanking: number | null;
  previousFifaRankings: Array<number | null>;
  rankStatus: "official" | "needs_fair_play" | "needs_fifa_ranking" | "unresolved";
};

export type Fifa2026GroupStanding = {
  group: Fifa2026GroupKey;
  label: string;
  rows: Fifa2026StandingRow[];
};

export type Fifa2026ThirdPlaceSlot =
  | "M74"
  | "M77"
  | "M79"
  | "M80"
  | "M81"
  | "M82"
  | "M85"
  | "M87";

export type ThirdPlaceAssignment = Record<Fifa2026ThirdPlaceSlot, Fifa2026GroupKey>;

export type ThirdPlaceAssignmentResult =
  | { status: "resolved"; assignment: ThirdPlaceAssignment }
  | { status: "ambiguous"; possibleAssignments: ThirdPlaceAssignment[] }
  | { status: "impossible"; possibleAssignments: [] };

export const FIFA_2026_GROUP_KEYS: Fifa2026GroupKey[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
];

export const FIFA_2026_MATCH_STATES: MatchState[] = [
  "scheduled",
  "live",
  "halftime",
  "extra_time",
  "penalties",
  "finished",
  "postponed",
  "suspended",
  "cancelled",
  "abandoned",
];

export const FIFA_2026_GROUP_LABELS: Record<Fifa2026GroupKey, string> = {
  A: "Grupo A",
  B: "Grupo B",
  C: "Grupo C",
  D: "Grupo D",
  E: "Grupo E",
  F: "Grupo F",
  G: "Grupo G",
  H: "Grupo H",
  I: "Grupo I",
  J: "Grupo J",
  K: "Grupo K",
  L: "Grupo L",
};

export const FIFA_2026_KNOCKOUT_PHASES: Array<{
  key: Fifa2026KnockoutRoundKey;
  value: string;
  label: string;
  matchCount: number;
  supportsPenalties: boolean;
}> = [
  { key: "round32", value: "Dieciseisavos", label: "Dieciseisavos", matchCount: 16, supportsPenalties: true },
  { key: "round16", value: "Octavos", label: "Octavos", matchCount: 8, supportsPenalties: true },
  { key: "quarter", value: "Cuartos", label: "Cuartos", matchCount: 4, supportsPenalties: true },
  { key: "semi", value: "Semifinales", label: "Semifinales", matchCount: 2, supportsPenalties: true },
  { key: "third", value: "Tercer puesto", label: "Tercer puesto", matchCount: 1, supportsPenalties: true },
  { key: "final", value: "Final", label: "Final", matchCount: 1, supportsPenalties: true },
];

export const FIFA_2026_ROUND_OF_32_TEMPLATE = [
  { matchNo: 73, slot: "M73", home: "2A", away: "2B" },
  { matchNo: 74, slot: "M74", home: "1E", away: "3A/B/C/D/F", thirdSlot: "M74", candidates: ["A", "B", "C", "D", "F"] },
  { matchNo: 75, slot: "M75", home: "1F", away: "2C" },
  { matchNo: 76, slot: "M76", home: "1C", away: "2F" },
  { matchNo: 77, slot: "M77", home: "1I", away: "3C/D/F/G/H", thirdSlot: "M77", candidates: ["C", "D", "F", "G", "H"] },
  { matchNo: 78, slot: "M78", home: "2E", away: "2I" },
  { matchNo: 79, slot: "M79", home: "1A", away: "3C/E/F/H/I", thirdSlot: "M79", candidates: ["C", "E", "F", "H", "I"] },
  { matchNo: 80, slot: "M80", home: "1L", away: "3E/H/I/J/K", thirdSlot: "M80", candidates: ["E", "H", "I", "J", "K"] },
  { matchNo: 81, slot: "M81", home: "1D", away: "3B/E/F/I/J", thirdSlot: "M81", candidates: ["B", "E", "F", "I", "J"] },
  { matchNo: 82, slot: "M82", home: "1G", away: "3A/E/H/I/J", thirdSlot: "M82", candidates: ["A", "E", "H", "I", "J"] },
  { matchNo: 83, slot: "M83", home: "2K", away: "2L" },
  { matchNo: 84, slot: "M84", home: "1H", away: "2J" },
  { matchNo: 85, slot: "M85", home: "1B", away: "3E/F/G/I/J", thirdSlot: "M85", candidates: ["E", "F", "G", "I", "J"] },
  { matchNo: 86, slot: "M86", home: "1J", away: "2H" },
  { matchNo: 87, slot: "M87", home: "1K", away: "3D/E/I/J/L", thirdSlot: "M87", candidates: ["D", "E", "I", "J", "L"] },
  { matchNo: 88, slot: "M88", home: "2D", away: "2G" },
] as const;

export const FIFA_2026_KNOCKOUT_PROGRESSION = [
  { matchNo: 89, round: "round16", homeFrom: "W74", awayFrom: "W77" },
  { matchNo: 90, round: "round16", homeFrom: "W73", awayFrom: "W75" },
  { matchNo: 91, round: "round16", homeFrom: "W76", awayFrom: "W78" },
  { matchNo: 92, round: "round16", homeFrom: "W79", awayFrom: "W80" },
  { matchNo: 93, round: "round16", homeFrom: "W83", awayFrom: "W84" },
  { matchNo: 94, round: "round16", homeFrom: "W81", awayFrom: "W82" },
  { matchNo: 95, round: "round16", homeFrom: "W86", awayFrom: "W88" },
  { matchNo: 96, round: "round16", homeFrom: "W85", awayFrom: "W87" },
  { matchNo: 97, round: "quarter", homeFrom: "W89", awayFrom: "W90" },
  { matchNo: 98, round: "quarter", homeFrom: "W93", awayFrom: "W94" },
  { matchNo: 99, round: "quarter", homeFrom: "W91", awayFrom: "W92" },
  { matchNo: 100, round: "quarter", homeFrom: "W95", awayFrom: "W96" },
  { matchNo: 101, round: "semi", homeFrom: "W97", awayFrom: "W98" },
  { matchNo: 102, round: "semi", homeFrom: "W99", awayFrom: "W100" },
  { matchNo: 103, round: "third", homeFrom: "L101", awayFrom: "L102" },
  { matchNo: 104, round: "final", homeFrom: "W101", awayFrom: "W102" },
] as const;

const thirdPlaceSlots = FIFA_2026_ROUND_OF_32_TEMPLATE.filter(
  (slot): slot is typeof slot & { thirdSlot: Fifa2026ThirdPlaceSlot; candidates: readonly Fifa2026GroupKey[] } =>
    "thirdSlot" in slot
);

const thirdPlaceAssignmentColumns: Array<{
  groupWinner: "1A" | "1B" | "1D" | "1E" | "1G" | "1I" | "1K" | "1L";
  slot: Fifa2026ThirdPlaceSlot;
}> = [
  { groupWinner: "1A", slot: "M79" },
  { groupWinner: "1B", slot: "M85" },
  { groupWinner: "1D", slot: "M81" },
  { groupWinner: "1E", slot: "M74" },
  { groupWinner: "1G", slot: "M82" },
  { groupWinner: "1I", slot: "M77" },
  { groupWinner: "1K", slot: "M87" },
  { groupWinner: "1L", slot: "M80" },
];

const FIFA_2026_ANNEX_C_ROWS = `
1 3E 3J 3I 3F 3H 3G 3L 3K
2 3H 3G 3I 3D 3J 3F 3L 3K
3 3E 3J 3I 3D 3H 3G 3L 3K
4 3E 3J 3I 3D 3H 3F 3L 3K
5 3E 3G 3I 3D 3J 3F 3L 3K
6 3E 3G 3J 3D 3H 3F 3L 3K
7 3E 3G 3I 3D 3H 3F 3L 3K
8 3E 3G 3J 3D 3H 3F 3L 3I
9 3E 3G 3J 3D 3H 3F 3I 3K
10 3H 3G 3I 3C 3J 3F 3L 3K
11 3E 3J 3I 3C 3H 3G 3L 3K
12 3E 3J 3I 3C 3H 3F 3L 3K
13 3E 3G 3I 3C 3J 3F 3L 3K
14 3E 3G 3J 3C 3H 3F 3L 3K
15 3E 3G 3I 3C 3H 3F 3L 3K
16 3E 3G 3J 3C 3H 3F 3L 3I
17 3E 3G 3J 3C 3H 3F 3I 3K
18 3H 3G 3I 3C 3J 3D 3L 3K
19 3C 3J 3I 3D 3H 3F 3L 3K
20 3C 3G 3I 3D 3J 3F 3L 3K
21 3C 3G 3J 3D 3H 3F 3L 3K
22 3C 3G 3I 3D 3H 3F 3L 3K
23 3C 3G 3J 3D 3H 3F 3L 3I
24 3C 3G 3J 3D 3H 3F 3I 3K
25 3E 3J 3I 3C 3H 3D 3L 3K
26 3E 3G 3I 3C 3J 3D 3L 3K
27 3E 3G 3J 3C 3H 3D 3L 3K
28 3E 3G 3I 3C 3H 3D 3L 3K
29 3E 3G 3J 3C 3H 3D 3L 3I
30 3E 3G 3J 3C 3H 3D 3I 3K
31 3C 3J 3E 3D 3I 3F 3L 3K
32 3C 3J 3E 3D 3H 3F 3L 3K
33 3C 3E 3I 3D 3H 3F 3L 3K
34 3C 3J 3E 3D 3H 3F 3L 3I
35 3C 3J 3E 3D 3H 3F 3I 3K
36 3C 3G 3E 3D 3J 3F 3L 3K
37 3C 3G 3E 3D 3I 3F 3L 3K
38 3C 3G 3E 3D 3J 3F 3L 3I
39 3C 3G 3E 3D 3J 3F 3I 3K
40 3C 3G 3E 3D 3H 3F 3L 3K
41 3C 3G 3J 3D 3H 3F 3L 3E
42 3C 3G 3J 3D 3H 3F 3E 3K
43 3C 3G 3E 3D 3H 3F 3L 3I
44 3C 3G 3E 3D 3H 3F 3I 3K
45 3C 3G 3J 3D 3H 3F 3E 3I
46 3H 3J 3B 3F 3I 3G 3L 3K
47 3E 3J 3I 3B 3H 3G 3L 3K
48 3E 3J 3B 3F 3I 3H 3L 3K
49 3E 3J 3B 3F 3I 3G 3L 3K
50 3E 3J 3B 3F 3H 3G 3L 3K
51 3E 3G 3B 3F 3I 3H 3L 3K
52 3E 3J 3B 3F 3H 3G 3L 3I
53 3E 3J 3B 3F 3H 3G 3I 3K
54 3H 3J 3B 3D 3I 3G 3L 3K
55 3H 3J 3B 3D 3I 3F 3L 3K
56 3I 3G 3B 3D 3J 3F 3L 3K
57 3H 3G 3B 3D 3J 3F 3L 3K
58 3H 3G 3B 3D 3I 3F 3L 3K
59 3H 3G 3B 3D 3J 3F 3L 3I
60 3H 3G 3B 3D 3J 3F 3I 3K
61 3E 3J 3B 3D 3I 3H 3L 3K
62 3E 3J 3B 3D 3I 3G 3L 3K
63 3E 3J 3B 3D 3H 3G 3L 3K
64 3E 3G 3B 3D 3I 3H 3L 3K
65 3E 3J 3B 3D 3H 3G 3L 3I
66 3E 3J 3B 3D 3H 3G 3I 3K
67 3E 3J 3B 3D 3I 3F 3L 3K
68 3E 3J 3B 3D 3H 3F 3L 3K
69 3E 3I 3B 3D 3H 3F 3L 3K
70 3E 3J 3B 3D 3H 3F 3L 3I
71 3E 3J 3B 3D 3H 3F 3I 3K
72 3E 3G 3B 3D 3J 3F 3L 3K
73 3E 3G 3B 3D 3I 3F 3L 3K
74 3E 3G 3B 3D 3J 3F 3L 3I
75 3E 3G 3B 3D 3J 3F 3I 3K
76 3E 3G 3B 3D 3H 3F 3L 3K
77 3H 3G 3B 3D 3J 3F 3L 3E
78 3H 3G 3B 3D 3J 3F 3E 3K
79 3E 3G 3B 3D 3H 3F 3L 3I
80 3E 3G 3B 3D 3H 3F 3I 3K
81 3H 3G 3B 3D 3J 3F 3E 3I
82 3H 3J 3B 3C 3I 3G 3L 3K
83 3H 3J 3B 3C 3I 3F 3L 3K
84 3I 3G 3B 3C 3J 3F 3L 3K
85 3H 3G 3B 3C 3J 3F 3L 3K
86 3H 3G 3B 3C 3I 3F 3L 3K
87 3H 3G 3B 3C 3J 3F 3L 3I
88 3H 3G 3B 3C 3J 3F 3I 3K
89 3E 3J 3B 3C 3I 3H 3L 3K
90 3E 3J 3B 3C 3I 3G 3L 3K
91 3E 3J 3B 3C 3H 3G 3L 3K
92 3E 3G 3B 3C 3I 3H 3L 3K
93 3E 3J 3B 3C 3H 3G 3L 3I
94 3E 3J 3B 3C 3H 3G 3I 3K
95 3E 3J 3B 3C 3I 3F 3L 3K
96 3E 3J 3B 3C 3H 3F 3L 3K
97 3E 3I 3B 3C 3H 3F 3L 3K
98 3E 3J 3B 3C 3H 3F 3L 3I
99 3E 3J 3B 3C 3H 3F 3I 3K
100 3E 3G 3B 3C 3J 3F 3L 3K
101 3E 3G 3B 3C 3I 3F 3L 3K
102 3E 3G 3B 3C 3J 3F 3L 3I
103 3E 3G 3B 3C 3J 3F 3I 3K
104 3E 3G 3B 3C 3H 3F 3L 3K
105 3H 3G 3B 3C 3J 3F 3L 3E
106 3H 3G 3B 3C 3J 3F 3E 3K
107 3E 3G 3B 3C 3H 3F 3L 3I
108 3E 3G 3B 3C 3H 3F 3I 3K
109 3H 3G 3B 3C 3J 3F 3E 3I
110 3H 3J 3B 3C 3I 3D 3L 3K
111 3I 3G 3B 3C 3J 3D 3L 3K
112 3H 3G 3B 3C 3J 3D 3L 3K
113 3H 3G 3B 3C 3I 3D 3L 3K
114 3H 3G 3B 3C 3J 3D 3L 3I
115 3H 3G 3B 3C 3J 3D 3I 3K
116 3C 3J 3B 3D 3I 3F 3L 3K
117 3C 3J 3B 3D 3H 3F 3L 3K
118 3C 3I 3B 3D 3H 3F 3L 3K
119 3C 3J 3B 3D 3H 3F 3L 3I
120 3C 3J 3B 3D 3H 3F 3I 3K
121 3C 3G 3B 3D 3J 3F 3L 3K
122 3C 3G 3B 3D 3I 3F 3L 3K
123 3C 3G 3B 3D 3J 3F 3L 3I
124 3C 3G 3B 3D 3J 3F 3I 3K
125 3C 3G 3B 3D 3H 3F 3L 3K
126 3C 3G 3B 3D 3H 3F 3L 3J
127 3H 3G 3B 3C 3J 3F 3D 3K
128 3C 3G 3B 3D 3H 3F 3L 3I
129 3C 3G 3B 3D 3H 3F 3I 3K
130 3H 3G 3B 3C 3J 3F 3D 3I
131 3E 3J 3B 3C 3I 3D 3L 3K
132 3E 3J 3B 3C 3H 3D 3L 3K
133 3E 3I 3B 3C 3H 3D 3L 3K
134 3E 3J 3B 3C 3H 3D 3L 3I
135 3E 3J 3B 3C 3H 3D 3I 3K
136 3E 3G 3B 3C 3J 3D 3L 3K
137 3E 3G 3B 3C 3I 3D 3L 3K
138 3E 3G 3B 3C 3J 3D 3L 3I
139 3E 3G 3B 3C 3J 3D 3I 3K
140 3E 3G 3B 3C 3H 3D 3L 3K
141 3H 3G 3B 3C 3J 3D 3L 3E
142 3H 3G 3B 3C 3J 3D 3E 3K
143 3E 3G 3B 3C 3H 3D 3L 3I
144 3E 3G 3B 3C 3H 3D 3I 3K
145 3H 3G 3B 3C 3J 3D 3E 3I
146 3C 3J 3B 3D 3E 3F 3L 3K
147 3C 3E 3B 3D 3I 3F 3L 3K
148 3C 3J 3B 3D 3E 3F 3L 3I
149 3C 3J 3B 3D 3E 3F 3I 3K
150 3C 3E 3B 3D 3H 3F 3L 3K
151 3C 3J 3B 3D 3H 3F 3L 3E
152 3C 3J 3B 3D 3H 3F 3E 3K
153 3C 3E 3B 3D 3H 3F 3L 3I
154 3C 3E 3B 3D 3H 3F 3I 3K
155 3C 3J 3B 3D 3H 3F 3E 3I
156 3C 3G 3B 3D 3E 3F 3L 3K
157 3C 3G 3B 3D 3J 3F 3L 3E
158 3C 3G 3B 3D 3J 3F 3E 3K
159 3C 3G 3B 3D 3E 3F 3L 3I
160 3C 3G 3B 3D 3E 3F 3I 3K
161 3C 3G 3B 3D 3J 3F 3E 3I
162 3C 3G 3B 3D 3H 3F 3L 3E
163 3C 3G 3B 3D 3H 3F 3E 3K
164 3H 3G 3B 3C 3J 3F 3D 3E
165 3C 3G 3B 3D 3H 3F 3E 3I
166 3H 3J 3I 3F 3A 3G 3L 3K
167 3E 3J 3I 3A 3H 3G 3L 3K
168 3E 3J 3I 3F 3A 3H 3L 3K
169 3E 3J 3I 3F 3A 3G 3L 3K
170 3E 3G 3J 3F 3A 3H 3L 3K
171 3E 3G 3I 3F 3A 3H 3L 3K
172 3E 3G 3J 3F 3A 3H 3L 3I
173 3E 3G 3J 3F 3A 3H 3I 3K
174 3H 3J 3I 3D 3A 3G 3L 3K
175 3H 3J 3I 3D 3A 3F 3L 3K
176 3I 3G 3J 3D 3A 3F 3L 3K
177 3H 3G 3J 3D 3A 3F 3L 3K
178 3H 3G 3I 3D 3A 3F 3L 3K
179 3H 3G 3J 3D 3A 3F 3L 3I
180 3H 3G 3J 3D 3A 3F 3I 3K
181 3E 3J 3I 3D 3A 3H 3L 3K
182 3E 3J 3I 3D 3A 3G 3L 3K
183 3E 3G 3J 3D 3A 3H 3L 3K
184 3E 3G 3I 3D 3A 3H 3L 3K
185 3E 3G 3J 3D 3A 3H 3L 3I
186 3E 3G 3J 3D 3A 3H 3I 3K
187 3E 3J 3I 3D 3A 3F 3L 3K
188 3H 3J 3E 3D 3A 3F 3L 3K
189 3H 3E 3I 3D 3A 3F 3L 3K
190 3H 3J 3E 3D 3A 3F 3L 3I
191 3H 3J 3E 3D 3A 3F 3I 3K
192 3E 3G 3J 3D 3A 3F 3L 3K
193 3E 3G 3I 3D 3A 3F 3L 3K
194 3E 3G 3J 3D 3A 3F 3L 3I
195 3E 3G 3J 3D 3A 3F 3I 3K
196 3H 3G 3E 3D 3A 3F 3L 3K
197 3H 3G 3J 3D 3A 3F 3L 3E
198 3H 3G 3J 3D 3A 3F 3E 3K
199 3H 3G 3E 3D 3A 3F 3L 3I
200 3H 3G 3E 3D 3A 3F 3I 3K
201 3H 3G 3J 3D 3A 3F 3E 3I
202 3H 3J 3I 3C 3A 3G 3L 3K
203 3H 3J 3I 3C 3A 3F 3L 3K
204 3I 3G 3J 3C 3A 3F 3L 3K
205 3H 3G 3J 3C 3A 3F 3L 3K
206 3H 3G 3I 3C 3A 3F 3L 3K
207 3H 3G 3J 3C 3A 3F 3L 3I
208 3H 3G 3J 3C 3A 3F 3I 3K
209 3E 3J 3I 3C 3A 3H 3L 3K
210 3E 3J 3I 3C 3A 3G 3L 3K
211 3E 3G 3J 3C 3A 3H 3L 3K
212 3E 3G 3I 3C 3A 3H 3L 3K
213 3E 3G 3J 3C 3A 3H 3L 3I
214 3E 3G 3J 3C 3A 3H 3I 3K
215 3E 3J 3I 3C 3A 3F 3L 3K
216 3H 3J 3E 3C 3A 3F 3L 3K
217 3H 3E 3I 3C 3A 3F 3L 3K
218 3H 3J 3E 3C 3A 3F 3L 3I
219 3H 3J 3E 3C 3A 3F 3I 3K
220 3E 3G 3J 3C 3A 3F 3L 3K
221 3E 3G 3I 3C 3A 3F 3L 3K
222 3E 3G 3J 3C 3A 3F 3L 3I
223 3E 3G 3J 3C 3A 3F 3I 3K
224 3H 3G 3E 3C 3A 3F 3L 3K
225 3H 3G 3J 3C 3A 3F 3L 3E
226 3H 3G 3J 3C 3A 3F 3E 3K
227 3H 3G 3E 3C 3A 3F 3L 3I
228 3H 3G 3E 3C 3A 3F 3I 3K
229 3H 3G 3J 3C 3A 3F 3E 3I
230 3H 3J 3I 3C 3A 3D 3L 3K
231 3I 3G 3J 3C 3A 3D 3L 3K
232 3H 3G 3J 3C 3A 3D 3L 3K
233 3H 3G 3I 3C 3A 3D 3L 3K
234 3H 3G 3J 3C 3A 3D 3L 3I
235 3H 3G 3J 3C 3A 3D 3I 3K
236 3C 3J 3I 3D 3A 3F 3L 3K
237 3H 3J 3F 3C 3A 3D 3L 3K
238 3H 3F 3I 3C 3A 3D 3L 3K
239 3H 3J 3F 3C 3A 3D 3L 3I
240 3H 3J 3F 3C 3A 3D 3I 3K
241 3C 3G 3J 3D 3A 3F 3L 3K
242 3C 3G 3I 3D 3A 3F 3L 3K
243 3C 3G 3J 3D 3A 3F 3L 3I
244 3C 3G 3J 3D 3A 3F 3I 3K
245 3H 3G 3F 3C 3A 3D 3L 3K
246 3C 3G 3J 3D 3A 3F 3L 3H
247 3H 3G 3J 3C 3A 3F 3D 3K
248 3H 3G 3F 3C 3A 3D 3L 3I
249 3H 3G 3F 3C 3A 3D 3I 3K
250 3H 3G 3J 3C 3A 3F 3D 3I
251 3E 3J 3I 3C 3A 3D 3L 3K
252 3H 3J 3E 3C 3A 3D 3L 3K
253 3H 3E 3I 3C 3A 3D 3L 3K
254 3H 3J 3E 3C 3A 3D 3L 3I
255 3H 3J 3E 3C 3A 3D 3I 3K
256 3E 3G 3J 3C 3A 3D 3L 3K
257 3E 3G 3I 3C 3A 3D 3L 3K
258 3E 3G 3J 3C 3A 3D 3L 3I
259 3E 3G 3J 3C 3A 3D 3I 3K
260 3H 3G 3E 3C 3A 3D 3L 3K
261 3H 3G 3J 3C 3A 3D 3L 3E
262 3H 3G 3J 3C 3A 3D 3E 3K
263 3H 3G 3E 3C 3A 3D 3L 3I
264 3H 3G 3E 3C 3A 3D 3I 3K
265 3H 3G 3J 3C 3A 3D 3E 3I
266 3C 3J 3E 3D 3A 3F 3L 3K
267 3C 3E 3I 3D 3A 3F 3L 3K
268 3C 3J 3E 3D 3A 3F 3L 3I
269 3C 3J 3E 3D 3A 3F 3I 3K
270 3H 3E 3F 3C 3A 3D 3L 3K
271 3H 3J 3F 3C 3A 3D 3L 3E
272 3H 3J 3E 3C 3A 3F 3D 3K
273 3H 3E 3F 3C 3A 3D 3L 3I
274 3H 3E 3F 3C 3A 3D 3I 3K
275 3H 3J 3E 3C 3A 3F 3D 3I
276 3C 3G 3E 3D 3A 3F 3L 3K
277 3C 3G 3J 3D 3A 3F 3L 3E
278 3C 3G 3J 3D 3A 3F 3E 3K
279 3C 3G 3E 3D 3A 3F 3L 3I
280 3C 3G 3E 3D 3A 3F 3I 3K
281 3C 3G 3J 3D 3A 3F 3E 3I
282 3H 3G 3F 3C 3A 3D 3L 3E
283 3H 3G 3E 3C 3A 3F 3D 3K
284 3H 3G 3J 3C 3A 3F 3D 3E
285 3H 3G 3E 3C 3A 3F 3D 3I
286 3H 3J 3B 3A 3I 3G 3L 3K
287 3H 3J 3B 3A 3I 3F 3L 3K
288 3I 3J 3B 3F 3A 3G 3L 3K
289 3H 3J 3B 3F 3A 3G 3L 3K
290 3H 3G 3B 3A 3I 3F 3L 3K
291 3H 3J 3B 3F 3A 3G 3L 3I
292 3H 3J 3B 3F 3A 3G 3I 3K
293 3E 3J 3B 3A 3I 3H 3L 3K
294 3E 3J 3B 3A 3I 3G 3L 3K
295 3E 3J 3B 3A 3H 3G 3L 3K
296 3E 3G 3B 3A 3I 3H 3L 3K
297 3E 3J 3B 3A 3H 3G 3L 3I
298 3E 3J 3B 3A 3H 3G 3I 3K
299 3E 3J 3B 3A 3I 3F 3L 3K
300 3E 3J 3B 3F 3A 3H 3L 3K
301 3E 3I 3B 3F 3A 3H 3L 3K
302 3E 3J 3B 3F 3A 3H 3L 3I
303 3E 3J 3B 3F 3A 3H 3I 3K
304 3E 3J 3B 3F 3A 3G 3L 3K
305 3E 3G 3B 3A 3I 3F 3L 3K
306 3E 3J 3B 3F 3A 3G 3L 3I
307 3E 3J 3B 3F 3A 3G 3I 3K
308 3E 3G 3B 3F 3A 3H 3L 3K
309 3H 3J 3B 3F 3A 3G 3L 3E
310 3H 3J 3B 3F 3A 3G 3E 3K
311 3E 3G 3B 3F 3A 3H 3L 3I
312 3E 3G 3B 3F 3A 3H 3I 3K
313 3H 3J 3B 3F 3A 3G 3E 3I
314 3I 3J 3B 3D 3A 3H 3L 3K
315 3I 3J 3B 3D 3A 3G 3L 3K
316 3H 3J 3B 3D 3A 3G 3L 3K
317 3I 3G 3B 3D 3A 3H 3L 3K
318 3H 3J 3B 3D 3A 3G 3L 3I
319 3H 3J 3B 3D 3A 3G 3I 3K
320 3I 3J 3B 3D 3A 3F 3L 3K
321 3H 3J 3B 3D 3A 3F 3L 3K
322 3H 3I 3B 3D 3A 3F 3L 3K
323 3H 3J 3B 3D 3A 3F 3L 3I
324 3H 3J 3B 3D 3A 3F 3I 3K
325 3F 3J 3B 3D 3A 3G 3L 3K
326 3I 3G 3B 3D 3A 3F 3L 3K
327 3F 3J 3B 3D 3A 3G 3L 3I
328 3F 3J 3B 3D 3A 3G 3I 3K
329 3H 3G 3B 3D 3A 3F 3L 3K
330 3H 3G 3B 3D 3A 3F 3L 3J
331 3H 3G 3B 3D 3A 3F 3J 3K
332 3H 3G 3B 3D 3A 3F 3L 3I
333 3H 3G 3B 3D 3A 3F 3I 3K
334 3H 3G 3B 3D 3A 3F 3I 3J
335 3E 3J 3B 3A 3I 3D 3L 3K
336 3E 3J 3B 3D 3A 3H 3L 3K
337 3E 3I 3B 3D 3A 3H 3L 3K
338 3E 3J 3B 3D 3A 3H 3L 3I
339 3E 3J 3B 3D 3A 3H 3I 3K
340 3E 3J 3B 3D 3A 3G 3L 3K
341 3E 3G 3B 3A 3I 3D 3L 3K
342 3E 3J 3B 3D 3A 3G 3L 3I
343 3E 3J 3B 3D 3A 3G 3I 3K
344 3E 3G 3B 3D 3A 3H 3L 3K
345 3H 3J 3B 3D 3A 3G 3L 3E
346 3H 3J 3B 3D 3A 3G 3E 3K
347 3E 3G 3B 3D 3A 3H 3L 3I
348 3E 3G 3B 3D 3A 3H 3I 3K
349 3H 3J 3B 3D 3A 3G 3E 3I
350 3E 3J 3B 3D 3A 3F 3L 3K
351 3E 3I 3B 3D 3A 3F 3L 3K
352 3E 3J 3B 3D 3A 3F 3L 3I
353 3E 3J 3B 3D 3A 3F 3I 3K
354 3H 3E 3B 3D 3A 3F 3L 3K
355 3H 3J 3B 3D 3A 3F 3L 3E
356 3H 3J 3B 3D 3A 3F 3E 3K
357 3H 3E 3B 3D 3A 3F 3L 3I
358 3H 3E 3B 3D 3A 3F 3I 3K
359 3H 3J 3B 3D 3A 3F 3E 3I
360 3E 3G 3B 3D 3A 3F 3L 3K
361 3E 3G 3B 3D 3A 3F 3L 3J
362 3E 3G 3B 3D 3A 3F 3J 3K
363 3E 3G 3B 3D 3A 3F 3L 3I
364 3E 3G 3B 3D 3A 3F 3I 3K
365 3E 3G 3B 3D 3A 3F 3I 3J
366 3H 3G 3B 3D 3A 3F 3L 3E
367 3H 3G 3B 3D 3A 3F 3E 3K
368 3H 3G 3B 3D 3A 3F 3E 3J
369 3H 3G 3B 3D 3A 3F 3E 3I
370 3I 3J 3B 3C 3A 3H 3L 3K
371 3I 3J 3B 3C 3A 3G 3L 3K
372 3H 3J 3B 3C 3A 3G 3L 3K
373 3I 3G 3B 3C 3A 3H 3L 3K
374 3H 3J 3B 3C 3A 3G 3L 3I
375 3H 3J 3B 3C 3A 3G 3I 3K
376 3I 3J 3B 3C 3A 3F 3L 3K
377 3H 3J 3B 3C 3A 3F 3L 3K
378 3H 3I 3B 3C 3A 3F 3L 3K
379 3H 3J 3B 3C 3A 3F 3L 3I
380 3H 3J 3B 3C 3A 3F 3I 3K
381 3C 3J 3B 3F 3A 3G 3L 3K
382 3I 3G 3B 3C 3A 3F 3L 3K
383 3C 3J 3B 3F 3A 3G 3L 3I
384 3C 3J 3B 3F 3A 3G 3I 3K
385 3H 3G 3B 3C 3A 3F 3L 3K
386 3H 3G 3B 3C 3A 3F 3L 3J
387 3H 3G 3B 3C 3A 3F 3J 3K
388 3H 3G 3B 3C 3A 3F 3L 3I
389 3H 3G 3B 3C 3A 3F 3I 3K
390 3H 3G 3B 3C 3A 3F 3I 3J
391 3E 3J 3B 3A 3I 3C 3L 3K
392 3E 3J 3B 3C 3A 3H 3L 3K
393 3E 3I 3B 3C 3A 3H 3L 3K
394 3E 3J 3B 3C 3A 3H 3L 3I
395 3E 3J 3B 3C 3A 3H 3I 3K
396 3E 3J 3B 3C 3A 3G 3L 3K
397 3E 3G 3B 3A 3I 3C 3L 3K
398 3E 3J 3B 3C 3A 3G 3L 3I
399 3E 3J 3B 3C 3A 3G 3I 3K
400 3E 3G 3B 3C 3A 3H 3L 3K
401 3H 3J 3B 3C 3A 3G 3L 3E
402 3H 3J 3B 3C 3A 3G 3E 3K
403 3E 3G 3B 3C 3A 3H 3L 3I
404 3E 3G 3B 3C 3A 3H 3I 3K
405 3H 3J 3B 3C 3A 3G 3E 3I
406 3E 3J 3B 3C 3A 3F 3L 3K
407 3E 3I 3B 3C 3A 3F 3L 3K
408 3E 3J 3B 3C 3A 3F 3L 3I
409 3E 3J 3B 3C 3A 3F 3I 3K
410 3H 3E 3B 3C 3A 3F 3L 3K
411 3H 3J 3B 3C 3A 3F 3L 3E
412 3H 3J 3B 3C 3A 3F 3E 3K
413 3H 3E 3B 3C 3A 3F 3L 3I
414 3H 3E 3B 3C 3A 3F 3I 3K
415 3H 3J 3B 3C 3A 3F 3E 3I
416 3E 3G 3B 3C 3A 3F 3L 3K
417 3E 3G 3B 3C 3A 3F 3L 3J
418 3E 3G 3B 3C 3A 3F 3J 3K
419 3E 3G 3B 3C 3A 3F 3L 3I
420 3E 3G 3B 3C 3A 3F 3I 3K
421 3E 3G 3B 3C 3A 3F 3I 3J
422 3H 3G 3B 3C 3A 3F 3L 3E
423 3H 3G 3B 3C 3A 3F 3E 3K
424 3H 3G 3B 3C 3A 3F 3E 3J
425 3H 3G 3B 3C 3A 3F 3E 3I
426 3I 3J 3B 3C 3A 3D 3L 3K
427 3H 3J 3B 3C 3A 3D 3L 3K
428 3H 3I 3B 3C 3A 3D 3L 3K
429 3H 3J 3B 3C 3A 3D 3L 3I
430 3H 3J 3B 3C 3A 3D 3I 3K
431 3C 3J 3B 3D 3A 3G 3L 3K
432 3I 3G 3B 3C 3A 3D 3L 3K
433 3C 3J 3B 3D 3A 3G 3L 3I
434 3C 3J 3B 3D 3A 3G 3I 3K
435 3H 3G 3B 3C 3A 3D 3L 3K
436 3H 3G 3B 3C 3A 3D 3L 3J
437 3H 3G 3B 3C 3A 3D 3J 3K
438 3H 3G 3B 3C 3A 3D 3L 3I
439 3H 3G 3B 3C 3A 3D 3I 3K
440 3H 3G 3B 3C 3A 3D 3I 3J
441 3C 3J 3B 3D 3A 3F 3L 3K
442 3C 3I 3B 3D 3A 3F 3L 3K
443 3C 3J 3B 3D 3A 3F 3L 3I
444 3C 3J 3B 3D 3A 3F 3I 3K
445 3H 3F 3B 3C 3A 3D 3L 3K
446 3C 3J 3B 3D 3A 3F 3L 3H
447 3H 3J 3B 3C 3A 3F 3D 3K
448 3H 3F 3B 3C 3A 3D 3L 3I
449 3H 3F 3B 3C 3A 3D 3I 3K
450 3H 3J 3B 3C 3A 3F 3D 3I
451 3C 3G 3B 3D 3A 3F 3L 3K
452 3C 3G 3B 3D 3A 3F 3L 3J
453 3C 3G 3B 3D 3A 3F 3J 3K
454 3C 3G 3B 3D 3A 3F 3L 3I
455 3C 3G 3B 3D 3A 3F 3I 3K
456 3C 3G 3B 3D 3A 3F 3I 3J
457 3C 3G 3B 3D 3A 3F 3L 3H
458 3H 3G 3B 3C 3A 3F 3D 3K
459 3H 3G 3B 3C 3A 3F 3D 3J
460 3H 3G 3B 3C 3A 3F 3D 3I
461 3E 3J 3B 3C 3A 3D 3L 3K
462 3E 3I 3B 3C 3A 3D 3L 3K
463 3E 3J 3B 3C 3A 3D 3L 3I
464 3E 3J 3B 3C 3A 3D 3I 3K
465 3H 3E 3B 3C 3A 3D 3L 3K
466 3H 3J 3B 3C 3A 3D 3L 3E
467 3H 3J 3B 3C 3A 3D 3E 3K
468 3H 3E 3B 3C 3A 3D 3L 3I
469 3H 3E 3B 3C 3A 3D 3I 3K
470 3H 3J 3B 3C 3A 3D 3E 3I
471 3E 3G 3B 3C 3A 3D 3L 3K
472 3E 3G 3B 3C 3A 3D 3L 3J
473 3E 3G 3B 3C 3A 3D 3J 3K
474 3E 3G 3B 3C 3A 3D 3L 3I
475 3E 3G 3B 3C 3A 3D 3I 3K
476 3E 3G 3B 3C 3A 3D 3I 3J
477 3H 3G 3B 3C 3A 3D 3L 3E
478 3H 3G 3B 3C 3A 3D 3E 3K
479 3H 3G 3B 3C 3A 3D 3E 3J
480 3H 3G 3B 3C 3A 3D 3E 3I
481 3C 3E 3B 3D 3A 3F 3L 3K
482 3C 3J 3B 3D 3A 3F 3L 3E
483 3C 3J 3B 3D 3A 3F 3E 3K
484 3C 3E 3B 3D 3A 3F 3L 3I
485 3C 3E 3B 3D 3A 3F 3I 3K
486 3C 3J 3B 3D 3A 3F 3E 3I
487 3H 3F 3B 3C 3A 3D 3L 3E
488 3H 3E 3B 3C 3A 3F 3D 3K
489 3H 3J 3B 3C 3A 3F 3D 3E
490 3H 3E 3B 3C 3A 3F 3D 3I
491 3C 3G 3B 3D 3A 3F 3L 3E
492 3C 3G 3B 3D 3A 3F 3E 3K
493 3C 3G 3B 3D 3A 3F 3E 3J
494 3C 3G 3B 3D 3A 3F 3E 3I
495 3H 3G 3B 3C 3A 3F 3D 3E
`.trim();

const isFinishedGroupMatch = (match: Fifa2026GroupMatch) =>
  match.teamAId !== null &&
  match.teamBId !== null &&
  match.goalsA !== null &&
  match.goalsB !== null &&
  (match.state === undefined || match.state === null || match.state === "finished");

const rowValue = (value: number | null | undefined) => (value === null || value === undefined ? null : value);

const compareDescNullable = (a: number | null, b: number | null) => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
};

const compareAscNullable = (a: number | null, b: number | null) => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
};

const groupByValue = <T>(items: T[], getValue: (item: T) => number | null, direction: "asc" | "desc") => {
  const buckets = new Map<string, { value: number | null; rows: T[] }>();

  items.forEach((item) => {
    const value = getValue(item);
    const key = value === null ? "null" : String(value);
    const bucket = buckets.get(key) ?? { value, rows: [] };
    bucket.rows.push(item);
    buckets.set(key, bucket);
  });

  return Array.from(buckets.values()).sort((a, b) =>
    direction === "desc" ? compareDescNullable(a.value, b.value) : compareAscNullable(a.value, b.value)
  );
};

const isFifa2026GroupKey = (value: string): value is Fifa2026GroupKey =>
  FIFA_2026_GROUP_KEYS.includes(value as Fifa2026GroupKey);

const getThirdPlaceKey = (groups: readonly Fifa2026GroupKey[]) =>
  [...new Set(groups)].sort().join("");

const parseThirdPlaceGroup = (value: string) => {
  const group = value.replace(/^3/, "");
  if (!isFifa2026GroupKey(group)) {
    throw new Error(`Invalid FIFA 2026 Annex C group value: ${value}`);
  }
  return group;
};

const getThirdPlaceSlotConfig = (slot: Fifa2026ThirdPlaceSlot) => {
  const slotConfig = thirdPlaceSlots.find((candidate) => candidate.thirdSlot === slot);
  if (!slotConfig) {
    throw new Error(`Invalid FIFA 2026 third-place slot: ${slot}`);
  }
  return slotConfig;
};

const buildOfficialThirdPlaceAssignments = () => {
  const assignments: Record<string, ThirdPlaceAssignment> = {};
  const rows = FIFA_2026_ANNEX_C_ROWS.split("\n").filter(Boolean);

  rows.forEach((line, index) => {
    const parts = line.trim().split(/\s+/);
    const option = Number(parts[0]);
    const values = parts.slice(1);

    if (option !== index + 1 || values.length !== thirdPlaceAssignmentColumns.length) {
      throw new Error(`Invalid FIFA 2026 Annex C row: ${line}`);
    }

    const groups = values.map(parseThirdPlaceGroup);
    const key = getThirdPlaceKey(groups);
    const assignment = {} as ThirdPlaceAssignment;

    thirdPlaceAssignmentColumns.forEach((column, columnIndex) => {
      const group = groups[columnIndex];
      const slotConfig = getThirdPlaceSlotConfig(column.slot);

      if (!slotConfig.candidates.includes(group)) {
        throw new Error(`Invalid FIFA 2026 Annex C assignment for ${column.groupWinner}: ${group}`);
      }

      assignment[column.slot] = group;
    });

    if (assignments[key]) {
      throw new Error(`Duplicate FIFA 2026 Annex C combination: ${key}`);
    }

    assignments[key] = assignment;
  });

  if (rows.length !== 495 || Object.keys(assignments).length !== 495) {
    throw new Error("FIFA 2026 Annex C must contain exactly 495 combinations");
  }

  return assignments;
};

export const FIFA_2026_THIRD_PLACE_ASSIGNMENTS = buildOfficialThirdPlaceAssignments();

const h2hStats = (row: Fifa2026StandingRow, concernedTeamIds: Set<string>, matches: Fifa2026GroupMatch[]) => {
  let points = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  matches.forEach((match) => {
    if (!isFinishedGroupMatch(match) || !match.teamAId || !match.teamBId) return;
    if (!concernedTeamIds.has(match.teamAId) || !concernedTeamIds.has(match.teamBId)) return;
    if (match.teamAId !== row.team.id && match.teamBId !== row.team.id) return;

    const isTeamA = match.teamAId === row.team.id;
    const ownGoals = isTeamA ? match.goalsA ?? 0 : match.goalsB ?? 0;
    const opponentGoals = isTeamA ? match.goalsB ?? 0 : match.goalsA ?? 0;

    goalsFor += ownGoals;
    goalsAgainst += opponentGoals;
    if (ownGoals > opponentGoals) points += 3;
    if (ownGoals === opponentGoals) points += 1;
  });

  return {
    points,
    goalsFor,
    goalDifference: goalsFor - goalsAgainst,
  };
};

type RankingCriterion<T> = {
  getValue: (row: T) => number | null;
  direction: "asc" | "desc";
  missingStatus?: Fifa2026StandingRow["rankStatus"];
};

const rankIntoBuckets = <T>(rows: T[], criteria: Array<RankingCriterion<T>>, criterionIndex = 0): T[][] => {
  if (rows.length <= 1 || criterionIndex >= criteria.length) return [rows];

  const criterion = criteria[criterionIndex];
  const buckets = groupByValue(rows, criterion.getValue, criterion.direction);

  return buckets.flatMap((bucket) =>
    bucket.rows.length === 1 ? [bucket.rows] : rankIntoBuckets(bucket.rows, criteria, criterionIndex + 1)
  );
};

const resolveRankingBuckets = (
  rows: Fifa2026StandingRow[],
  criteria: Array<RankingCriterion<Fifa2026StandingRow>>,
  criterionIndex = 0
): Fifa2026StandingRow[] => {
  if (rows.length <= 1) return rows;
  if (criterionIndex >= criteria.length) {
    return [...rows]
      .map((row) => ({ ...row, rankStatus: "unresolved" as const }))
      .sort((a, b) => a.seedOrder - b.seedOrder || a.team.id.localeCompare(b.team.id));
  }

  const criterion = criteria[criterionIndex];
  const buckets = groupByValue(rows, criterion.getValue, criterion.direction);

  return buckets.flatMap((bucket) => {
    const withMissingStatus =
      criterion.missingStatus && bucket.value === null
        ? bucket.rows.map((row) => ({ ...row, rankStatus: criterion.missingStatus! }))
        : bucket.rows;

    if (withMissingStatus.length === 1) return withMissingStatus;
    return resolveRankingBuckets(withMissingStatus, criteria, criterionIndex + 1);
  });
};

const resolveGroupTie = (rows: Fifa2026StandingRow[], matches: Fifa2026GroupMatch[]) => {
  const resolveHeadToHeadBuckets = (tiedRows: Fifa2026StandingRow[]): Fifa2026StandingRow[][] => {
    const concernedTeamIds = new Set(tiedRows.map((row) => row.team.id));
    const buckets = rankIntoBuckets(tiedRows, [
      {
        getValue: (row: Fifa2026StandingRow) => h2hStats(row, concernedTeamIds, matches).points,
        direction: "desc" as const,
      },
      {
        getValue: (row: Fifa2026StandingRow) => h2hStats(row, concernedTeamIds, matches).goalDifference,
        direction: "desc" as const,
      },
      {
        getValue: (row: Fifa2026StandingRow) => h2hStats(row, concernedTeamIds, matches).goalsFor,
        direction: "desc" as const,
      },
    ]);

    if (buckets.length === 1 && buckets[0].length === tiedRows.length) {
      return buckets;
    }

    return buckets.flatMap((bucket) =>
      bucket.length === 1 ? [bucket] : resolveHeadToHeadBuckets(bucket)
    );
  };

  const remainingCriteria = [
    { getValue: (row: Fifa2026StandingRow) => row.goalDifference, direction: "desc" as const },
    { getValue: (row: Fifa2026StandingRow) => row.goalsFor, direction: "desc" as const },
    {
      getValue: (row: Fifa2026StandingRow) => rowValue(row.fairPlayScore),
      direction: "desc" as const,
      missingStatus: "needs_fair_play" as const,
    },
    {
      getValue: (row: Fifa2026StandingRow) => rowValue(row.fifaRanking),
      direction: "asc" as const,
      missingStatus: "needs_fifa_ranking" as const,
    },
  ];

  return resolveHeadToHeadBuckets(rows).flatMap((bucket) =>
    bucket.length === 1 ? bucket : resolveRankingBuckets(bucket, remainingCriteria)
  );
};

export const calculateFifa2026GroupStanding = (
  group: Fifa2026GroupKey,
  teams: Fifa2026TeamSeed[],
  matches: Fifa2026GroupMatch[]
): Fifa2026GroupStanding => {
  const rowMap = teams.reduce<Map<string, Fifa2026StandingRow>>((acc, seed) => {
    acc.set(seed.team.id, {
      team: seed.team,
      group,
      seedOrder: seed.seedOrder,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      fairPlayScore: seed.fairPlayScore ?? null,
      fifaRanking: seed.fifaRanking ?? null,
      previousFifaRankings: seed.previousFifaRankings ?? [],
      rankStatus: "official",
    });
    return acc;
  }, new Map());

  matches.filter((match) => match.group === group && isFinishedGroupMatch(match)).forEach((match) => {
    if (!match.teamAId || !match.teamBId) return;
    const rowA = rowMap.get(match.teamAId);
    const rowB = rowMap.get(match.teamBId);
    if (!rowA || !rowB) return;

    const goalsA = match.goalsA ?? 0;
    const goalsB = match.goalsB ?? 0;

    rowA.played += 1;
    rowB.played += 1;
    rowA.goalsFor += goalsA;
    rowA.goalsAgainst += goalsB;
    rowB.goalsFor += goalsB;
    rowB.goalsAgainst += goalsA;
    rowA.goalDifference = rowA.goalsFor - rowA.goalsAgainst;
    rowB.goalDifference = rowB.goalsFor - rowB.goalsAgainst;

    if (goalsA > goalsB) {
      rowA.won += 1;
      rowA.points += 3;
      rowB.lost += 1;
    } else if (goalsB > goalsA) {
      rowB.won += 1;
      rowB.points += 3;
      rowA.lost += 1;
    } else {
      rowA.drawn += 1;
      rowB.drawn += 1;
      rowA.points += 1;
      rowB.points += 1;
    }
  });

  const rowsByPoints = groupByValue(Array.from(rowMap.values()), (row) => row.points, "desc");

  return {
    group,
    label: FIFA_2026_GROUP_LABELS[group],
    rows: rowsByPoints.flatMap((bucket) =>
      bucket.rows.length === 1 ? bucket.rows : resolveGroupTie(bucket.rows, matches)
    ),
  };
};

export const rankFifa2026ThirdPlacedTeams = (groups: Fifa2026GroupStanding[]) => {
  const thirdPlaced = groups
    .map((group) => group.rows[2])
    .filter((row): row is Fifa2026StandingRow => Boolean(row));

  return resolveRankingBuckets(thirdPlaced, [
    { getValue: (row) => row.points, direction: "desc" },
    { getValue: (row) => row.goalDifference, direction: "desc" },
    { getValue: (row) => row.goalsFor, direction: "desc" },
    { getValue: (row) => rowValue(row.fairPlayScore), direction: "desc", missingStatus: "needs_fair_play" },
    { getValue: (row) => rowValue(row.fifaRanking), direction: "asc", missingStatus: "needs_fifa_ranking" },
  ]);
};

export const getFifa2026Qualifiers = (groups: Fifa2026GroupStanding[]) => {
  const thirdPlacedRanking = rankFifa2026ThirdPlacedTeams(groups);

  return {
    automatic: groups.flatMap((group) => group.rows.slice(0, 2)),
    thirdPlacedRanking,
    qualifiedThirdPlaced: thirdPlacedRanking.slice(0, 8),
    eliminatedThirdPlaced: thirdPlacedRanking.slice(8),
  };
};

export const resolveFifa2026ThirdPlaceAssignments = (
  qualifiedThirdGroups: Fifa2026GroupKey[],
  annexC: Record<string, ThirdPlaceAssignment> = FIFA_2026_THIRD_PLACE_ASSIGNMENTS
): ThirdPlaceAssignmentResult => {
  const normalizedGroups = [...new Set(qualifiedThirdGroups)].sort() as Fifa2026GroupKey[];
  const key = getThirdPlaceKey(normalizedGroups);

  if (normalizedGroups.length !== 8) return { status: "impossible", possibleAssignments: [] };
  if (annexC?.[key]) return { status: "resolved", assignment: annexC[key] };

  const possibleAssignments: ThirdPlaceAssignment[] = [];

  const backtrack = (
    slotIndex: number,
    remainingGroups: Fifa2026GroupKey[],
    assignment: Partial<ThirdPlaceAssignment>
  ) => {
    if (slotIndex === thirdPlaceSlots.length) {
      possibleAssignments.push(assignment as ThirdPlaceAssignment);
      return;
    }

    const slot = thirdPlaceSlots[slotIndex];
    remainingGroups
      .filter((group) => slot.candidates.includes(group))
      .forEach((group) => {
        backtrack(
          slotIndex + 1,
          remainingGroups.filter((candidate) => candidate !== group),
          { ...assignment, [slot.thirdSlot]: group }
        );
      });
  };

  backtrack(0, normalizedGroups, {});

  if (possibleAssignments.length === 1) {
    return { status: "resolved", assignment: possibleAssignments[0] };
  }

  if (possibleAssignments.length > 1) {
    return { status: "ambiguous", possibleAssignments };
  }

  return { status: "impossible", possibleAssignments: [] };
};
