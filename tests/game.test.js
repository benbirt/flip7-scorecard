import assert from "node:assert/strict";
import { test } from "node:test";

import * as G from "../site/js/game.js";

function play(game, ...rounds) {
  for (const scores of rounds) {
    const round = {};
    game.players.forEach((p, i) => {
      round[p.id] = scores[i];
    });
    game = G.addRound(game, round);
  }
  return game;
}

test("a game needs two named players and a positive target", () => {
  assert.throws(() => G.newGame(["Ana", " "]), /two players/);
  assert.throws(() => G.newGame(["Ana", "Bo"], { target: 0 }), /positive/);
  const game = G.newGame([" Ana ", "", "Bo"]);
  assert.deepEqual(
    game.players.map((p) => p.name),
    ["Ana", "Bo"],
  );
  assert.equal(game.target, 200);
  assert.equal(game.vengeance, false);
  assert.notEqual(game.players[0].id, game.players[1].id);
});

test("totals add up every round", () => {
  const game = play(G.newGame(["Ana", "Bo"]), [10, 0], [25, 40]);
  const [a, b] = game.players;
  assert.deepEqual(G.totals(game), { [a.id]: 35, [b.id]: 40 });
});

test("nobody wins below the target", () => {
  const game = play(G.newGame(["Ana", "Bo"]), [199, 150]);
  assert.equal(G.outcome(game).state, "playing");
});

test("the highest total at or over the target wins", () => {
  const game = play(G.newGame(["Ana", "Bo", "Cy"]), [150, 190, 10], [55, 30, 0]);
  const out = G.outcome(game);
  assert.equal(out.state, "won");
  assert.equal(out.winner.name, "Bo");
  assert.equal(out.total, 220);
});

test("a tie for the lead at the target means another round", () => {
  let game = play(G.newGame(["Ana", "Bo"]), [100, 120], [110, 90]);
  const out = G.outcome(game);
  assert.equal(out.state, "tie");
  assert.deepEqual(
    out.leaders.map((p) => p.name),
    ["Ana", "Bo"],
  );
  game = play(game, [0, 3]);
  assert.equal(G.outcome(game).winner.name, "Bo");
});

test("With a Vengeance: negative rounds and totals", () => {
  const game = play(G.newGame(["Ana", "Bo"], { vengeance: true }), [-12, 30], [5, -40]);
  const [a, b] = game.players;
  assert.deepEqual(G.totals(game), { [a.id]: -7, [b.id]: -10 });
  assert.deepEqual(G.ranks(game), { [a.id]: 1, [b.id]: 2 });
  assert.equal(G.outcome(game).state, "playing");
});

test("makeRound treats blanks as busts and drops negatives without vengeance", () => {
  const plain = G.newGame(["Ana", "Bo"]);
  const [a, b] = plain.players;
  assert.deepEqual(G.makeRound(plain, { [a.id]: "-5" }), { [a.id]: 0, [b.id]: 0 });
  const mean = { ...plain, vengeance: true };
  assert.deepEqual(G.makeRound(mean, { [a.id]: "-5", [b.id]: "-" }), { [a.id]: -5, [b.id]: 0 });
});

test("keypad", () => {
  const k = (text, key, vengeance = false) => G.keypad(text, key, { vengeance });
  assert.equal(k("", "4"), "4");
  assert.equal(k("4", "2"), "42");
  assert.equal(k("0", "7"), "7");
  assert.equal(k("123", "4"), "123");
  assert.equal(k("42", "back"), "4");
  assert.equal(k("42", "clear"), "");
  assert.equal(k("42", "neg"), "42");
  assert.equal(k("42", "neg", true), "-42");
  assert.equal(k("-42", "neg", true), "42");
  assert.equal(k("", "neg", true), "-");
  assert.equal(k("-", "5", true), "-5");
  assert.equal(k("-0", "5", true), "-5");
  assert.equal(k("-123", "4", true), "-123");
  assert.equal(k("1", "x"), "1");
});

test("the Flip 7 bonus adds 15", () => {
  assert.equal(G.addBonus(""), "15");
  assert.equal(G.addBonus("30"), "45");
  assert.equal(G.addBonus("-20"), "-5");
});

test("ranks share places on ties", () => {
  const game = play(G.newGame(["Ana", "Bo", "Cy", "Di"]), [10, 30, 30, 5]);
  assert.deepEqual(
    game.players.map((p) => G.ranks(game)[p.id]),
    [3, 1, 1, 4],
  );
});

test("the deal moves round the table", () => {
  let game = G.newGame(["Ana", "Bo", "Cy"]);
  const dealers = [];
  for (let i = 0; i < 4; i++) {
    dealers.push(G.dealer(game).name);
    game = play(game, [0, 0, 0]);
  }
  assert.deepEqual(dealers, ["Ana", "Bo", "Cy", "Ana"]);
});

test("rounds can be changed and removed", () => {
  let game = play(G.newGame(["Ana", "Bo"]), [10, 20], [30, 40]);
  const [a, b] = game.players;
  game = G.replaceRound(game, 0, { [a.id]: 1, [b.id]: 2 });
  assert.deepEqual(G.totals(game), { [a.id]: 31, [b.id]: 42 });
  game = G.removeRound(game, 1);
  assert.deepEqual(G.totals(game), { [a.id]: 1, [b.id]: 2 });
});

test("rematch keeps players and settings but not rounds", () => {
  const game = play(G.newGame(["Ana", "Bo"], { target: 150, vengeance: true }), [200, 0]);
  const next = G.rematch(game);
  assert.deepEqual(
    next.players.map((p) => p.name),
    ["Ana", "Bo"],
  );
  assert.equal(next.target, 150);
  assert.equal(next.vengeance, true);
  assert.equal(next.rounds.length, 0);
});

test("renaming ignores blank names", () => {
  const game = G.newGame(["Ana", "Bo"]);
  const id = game.players[0].id;
  assert.equal(G.renamePlayer(game, id, "  ").players[0].name, "Ana");
  assert.equal(G.renamePlayer(game, id, " Anna ").players[0].name, "Anna");
});

test("pickCelebration resolves 'random' to a real celebration", () => {
  assert.equal(G.pickCelebration("fireworks"), "fireworks");
  const ids = new Set();
  for (const r of [0, 0.3, 0.6, 0.99]) ids.add(G.pickCelebration("random", () => r));
  assert.ok(!ids.has("random"));
  assert.equal(ids.size, 4);
});

test("validGame rejects damaged saved state", () => {
  const game = play(G.newGame(["Ana", "Bo"]), [3, 4]);
  assert.deepEqual(G.validGame(JSON.parse(JSON.stringify(game))), game);
  assert.equal(G.validGame(null), null);
  assert.equal(G.validGame({ ...game, players: [game.players[0]] }), null);
  assert.equal(G.validGame({ ...game, target: "200" }), null);
  assert.equal(G.validGame({ ...game, rounds: [{ [game.players[0].id]: "3" }] }), null);
});
