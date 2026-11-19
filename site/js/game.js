// Game rules and state, with no DOM, so that tests/ can check them in a
// browser on their own.

export const DEFAULT_TARGET = 200;
export const FLIP7_BONUS = 15;
export const MAX_DIGITS = 3;

export const CELEBRATIONS = [
  { id: "champagne", label: "Champagne", emoji: "🍾" },
  { id: "fireworks", label: "Fireworks", emoji: "🎆" },
  { id: "confetti", label: "Confetti", emoji: "🎉" },
  { id: "trophy", label: "Trophy", emoji: "🏆" },
  { id: "random", label: "Surprise me", emoji: "🎲" },
];

let nextId = 0;
function newId() {
  nextId += 1;
  return `p${Date.now().toString(36)}${nextId}`;
}

// names: player names in seating order. With vengeance on, round scores and
// totals may be negative (Flip 7: With a Vengeance).
export function newGame(names, { target = DEFAULT_TARGET, vengeance = false } = {}) {
  const players = names
    .map((n) => n.trim())
    .filter((n) => n !== "")
    .map((name) => ({ id: newId(), name }));
  if (players.length < 2) throw new Error("A game needs at least two players.");
  if (!Number.isInteger(target) || target <= 0) throw new Error("The target must be a positive whole number.");
  return { players, rounds: [], target, vengeance, startedAt: Date.now() };
}

// A new game with the same players, settings and seating order.
export function rematch(game) {
  return newGame(
    game.players.map((p) => p.name),
    { target: game.target, vengeance: game.vengeance },
  );
}

export function totals(game) {
  const t = {};
  for (const p of game.players) t[p.id] = 0;
  for (const round of game.rounds) {
    for (const p of game.players) t[p.id] += round[p.id] ?? 0;
  }
  return t;
}

// The game ends after the round in which anyone reaches the target. The
// highest total wins; players tied for it play on until the tie is broken.
export function outcome(game) {
  if (game.players.length === 0) return { state: "playing" };
  const t = totals(game);
  const best = Math.max(...game.players.map((p) => t[p.id]));
  if (best < game.target) return { state: "playing" };
  const leaders = game.players.filter((p) => t[p.id] === best);
  if (leaders.length > 1) return { state: "tie", leaders, total: best };
  return { state: "won", winner: leaders[0], total: best };
}

// Standard competition ranking ("1, 2, 2, 4"), by total, highest first.
export function ranks(game) {
  const t = totals(game);
  const r = {};
  for (const p of game.players) {
    r[p.id] = 1 + game.players.filter((q) => t[q.id] > t[p.id]).length;
  }
  return r;
}

// The dealer moves one seat to the left each round.
export function dealer(game) {
  return game.players[game.rounds.length % game.players.length];
}

// Turns the text shown for one score into a number; blank counts as 0 (a bust).
export function scoreValue(text) {
  if (text === "" || text === "-") return 0;
  return Number.parseInt(text, 10);
}

// The text for one score after a keypad key: "0"–"9", "back", "neg" or
// "clear". "neg" only works with vengeance on.
export function keypad(text, key, { vengeance = false } = {}) {
  const negative = text.startsWith("-");
  const digits = negative ? text.slice(1) : text;
  if (key === "clear") return "";
  if (key === "back") return text.slice(0, -1);
  if (key === "neg") {
    if (!vengeance) return text;
    return negative ? digits : `-${digits}`;
  }
  if (!/^[0-9]$/.test(key)) return text;
  if (digits === "0") return (negative ? "-" : "") + key;
  if (digits.length >= MAX_DIGITS) return text;
  return text + key;
}

// Adds FLIP7_BONUS to a score's text.
export function addBonus(text) {
  return String(scoreValue(text) + FLIP7_BONUS);
}

// A round from the texts typed for each player (by player id).
export function makeRound(game, texts) {
  const round = {};
  for (const p of game.players) {
    let v = scoreValue(texts[p.id] ?? "");
    if (!Number.isFinite(v)) v = 0;
    if (!game.vengeance && v < 0) v = 0;
    round[p.id] = v;
  }
  return round;
}

export function addRound(game, round) {
  return { ...game, rounds: [...game.rounds, round] };
}

export function replaceRound(game, index, round) {
  const rounds = game.rounds.slice();
  rounds[index] = round;
  return { ...game, rounds };
}

export function removeRound(game, index) {
  return { ...game, rounds: game.rounds.filter((_, i) => i !== index) };
}

export function renamePlayer(game, id, name) {
  const trimmed = name.trim();
  if (trimmed === "") return game;
  return {
    ...game,
    players: game.players.map((p) => (p.id === id ? { ...p, name: trimmed } : p)),
  };
}

export function pickCelebration(choice, random = Math.random) {
  if (choice !== "random") return choice;
  const real = CELEBRATIONS.filter((c) => c.id !== "random");
  return real[Math.floor(random() * real.length)].id;
}

// Checks state read back from storage; returns null if it is not a game.
export function validGame(g) {
  if (!g || typeof g !== "object") return null;
  if (!Array.isArray(g.players) || g.players.length < 2) return null;
  if (!g.players.every((p) => p && typeof p.id === "string" && typeof p.name === "string")) return null;
  if (!Array.isArray(g.rounds)) return null;
  for (const r of g.rounds) {
    if (!r || typeof r !== "object") return null;
    for (const p of g.players) {
      if (r[p.id] !== undefined && !Number.isInteger(r[p.id])) return null;
    }
  }
  if (!Number.isInteger(g.target) || g.target <= 0) return null;
  return { ...g, vengeance: Boolean(g.vengeance) };
}
