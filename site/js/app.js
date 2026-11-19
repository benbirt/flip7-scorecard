// The page: setup, the scoreboard, round entry and settings. State is kept in
// localStorage so that a reload or a locked phone loses nothing.

import * as G from "./game.js";
import { celebrate } from "./celebrate.js";
import * as sound from "./sound.js";

const STORE = "flip7-scorecard/v1";
const $ = (id) => document.getElementById(id);

const state = {
  game: null,
  lastNames: ["", ""],
  lastTarget: G.DEFAULT_TARGET,
  lastVengeance: false,
  celebration: "champagne",
  sound: true,
};

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) ?? "null");
    if (!saved) return;
    state.game = G.validGame(saved.game);
    if (Array.isArray(saved.lastNames) && saved.lastNames.every((n) => typeof n === "string")) {
      state.lastNames = saved.lastNames.length >= 2 ? saved.lastNames : [...saved.lastNames, "", ""].slice(0, 2);
    }
    if (Number.isInteger(saved.lastTarget) && saved.lastTarget > 0) state.lastTarget = saved.lastTarget;
    state.lastVengeance = Boolean(saved.lastVengeance);
    if (G.CELEBRATIONS.some((c) => c.id === saved.celebration)) state.celebration = saved.celebration;
    if (typeof saved.sound === "boolean") state.sound = saved.sound;
  } catch {
    // Unreadable state: start afresh.
  }
}

function save() {
  try {
    localStorage.setItem(STORE, JSON.stringify(state));
  } catch {
    // Private browsing or a full quota: carry on without saving.
  }
}

let toastTimer = 0;
function toast(text) {
  const t = $("toast");
  t.textContent = text;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
}

function el(tag, props = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") e.className = v;
    else if (k === "dataset") Object.assign(e.dataset, v);
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c !== null && c !== undefined && c !== false) e.append(c);
  }
  return e;
}

const signed = (n) => (n > 0 ? `+${n}` : String(n));

// ---- Setup ----

const defaultName = (i) => `Player ${i + 1}`;

function renderSetup() {
  const list = $("player-inputs");
  // With more than two players, ✕ removes the row. A game needs two, so with
  // only two it clears the name instead, and does nothing while it is empty.
  const removes = state.lastNames.length > 2;
  list.replaceChildren(
    ...state.lastNames.map((name, i) => {
      const button = el("button", {
        type: "button",
        class: "icon-btn",
        "aria-label": removes ? `Remove player ${i + 1}` : `Clear player ${i + 1}`,
        disabled: !removes && name === "",
        onclick: () => {
          if (removes) state.lastNames.splice(i, 1);
          else state.lastNames[i] = "";
          save();
          renderSetup();
          if (!removes) list.querySelectorAll("input")[i].focus();
        },
      }, "✕");
      return el("li", {},
        el("span", { class: "seat" }, String(i + 1)),
        el("input", {
          type: "text",
          value: name,
          placeholder: defaultName(i),
          "aria-label": `Player ${i + 1}`,
          autocomplete: "off",
          autocapitalize: "words",
          enterkeyhint: "next",
          maxlength: "24",
          oninput: (e) => {
            state.lastNames[i] = e.target.value;
            save();
            if (!removes) button.disabled = e.target.value === "";
          },
        }),
        button,
      );
    }),
  );
  $("target").value = state.lastTarget;
  $("vengeance").checked = state.lastVengeance;
  $("add-player").hidden = state.lastNames.length >= 18;
}

function startGame(e) {
  e.preventDefault();
  sound.unlock();
  const names = state.lastNames.map((n, i) => n.trim() || defaultName(i));
  const lower = names.map((n) => n.toLowerCase());
  if (new Set(lower).size !== lower.length) {
    $("setup-error").textContent = "Each player needs a different name.";
    return;
  }
  const target = Number.parseInt($("target").value, 10);
  try {
    state.game = G.newGame(names, { target, vengeance: $("vengeance").checked });
  } catch (err) {
    $("setup-error").textContent = err.message;
    return;
  }
  $("setup-error").textContent = "";
  state.lastTarget = target;
  state.lastVengeance = state.game.vengeance;
  save();
  render();
  window.scrollTo(0, 0);
}

// ---- Scoreboard ----

let previousTotals = {};

function renderGame() {
  const game = state.game;
  const totals = G.totals(game);
  const ranks = G.ranks(game);
  const out = G.outcome(game);
  const dealer = G.dealer(game);
  const finished = out.state === "won";
  const lastRound = game.rounds.at(-1);

  $("status").replaceChildren(
    el("span", {}, finished ? `Finished after ${game.rounds.length} rounds` : `Round ${game.rounds.length + 1}`),
    el("span", {}, `First to ${game.target}`),
    game.vengeance ? el("span", { class: "badge" }, "😈 With a Vengeance") : null,
  );

  const best = Math.max(...game.players.map((p) => totals[p.id]));
  $("scores").replaceChildren(
    ...game.players.map((p) => {
      const total = totals[p.id];
      const pct = Math.max(0, Math.min(100, (total / game.target) * 100));
      const delta = lastRound ? lastRound[p.id] ?? 0 : null;
      const leader = game.rounds.length > 0 && total === best;
      const changed = previousTotals[p.id] !== undefined && previousTotals[p.id] !== total;
      const toGo = game.target - total;
      return el("li", { class: `score${leader ? " leader" : ""}${finished && out.winner.id === p.id ? " winner" : ""}` },
        el("span", { class: "rank", title: "Place" }, finished && out.winner.id === p.id ? "👑" : String(ranks[p.id])),
        el("div", { class: "who" },
          el("div", { class: "name" }, p.name,
            !finished && dealer.id === p.id ? el("span", { class: "dealer-chip", title: "Deals this round" }, "DEALER") : null),
          el("div", { class: "meta" },
            delta === null ? "No rounds yet" : el("span", { class: `delta ${delta > 0 ? "up" : delta < 0 ? "down" : "zero"}` },
              delta === 0 ? "Bust last round" : `${signed(delta)} last round`),
            toGo > 0 && delta !== null ? ` · ${toGo} to go` : ""),
        ),
        el("div", { class: `total${total < 0 ? " negative" : ""}${changed ? " bump" : ""}` }, String(total)),
        el("div", { class: "progress", "aria-hidden": "true" }, el("span", { style: `width:${pct}%` })),
      );
    }),
  );
  previousTotals = totals;

  // Round history.
  const table = $("history-table");
  if (game.rounds.length === 0) {
    $("history").hidden = true;
  } else {
    $("history").hidden = false;
    let running = Object.fromEntries(game.players.map((p) => [p.id, 0]));
    table.replaceChildren(
      el("thead", {}, el("tr", {}, el("th", {}, "#"), ...game.players.map((p) => el("th", { scope: "col" }, p.name)))),
      el("tbody", {},
        ...game.rounds.map((r, i) => {
          running = Object.fromEntries(game.players.map((p) => [p.id, running[p.id] + (r[p.id] ?? 0)]));
          return el("tr", {
            tabindex: "0",
            "aria-label": `Change round ${i + 1}`,
            onclick: () => openRound(i),
            onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openRound(i); } },
          },
          el("td", {}, String(i + 1)),
          ...game.players.map((p) => {
            const v = r[p.id] ?? 0;
            return el("td", { class: v < 0 ? "neg" : "", title: `Total ${running[p.id]}` }, String(v));
          }));
        }),
      ),
      el("tfoot", {}, el("tr", {}, el("td", {}, "Σ"), ...game.players.map((p) => el("td", {}, String(totals[p.id]))))),
    );
  }

  $("winner-bar").hidden = !finished;
  if (finished) $("winner-text").textContent = `🏆 ${out.winner.name} wins with ${out.total}!`;
  $("score-round").hidden = finished;
  $("score-round").textContent = `Score round ${game.rounds.length + 1}`;
  $("undo").disabled = game.rounds.length === 0;
}

function render() {
  const playing = state.game !== null;
  $("setup").hidden = playing;
  $("game").hidden = !playing;
  if (playing) renderGame();
  else renderSetup();
}

// ---- Round entry ----

const entry = { index: null, texts: {}, selected: 0 };

function openRound(index = null) {
  sound.unlock();
  const game = state.game;
  entry.index = index;
  entry.selected = 0;
  entry.texts = {};
  if (index !== null) {
    for (const p of game.players) entry.texts[p.id] = String(game.rounds[index][p.id] ?? 0);
  }
  $("round-title").textContent = index === null ? `Round ${game.rounds.length + 1}` : `Change round ${index + 1}`;
  $("delete-round").hidden = index === null;
  $("key-neg").disabled = !game.vengeance;
  $("key-neg").title = game.vengeance ? "Negative" : "Negative scores need With a Vengeance";
  renderEntries();
  $("round-dialog").showModal();
}

function renderEntries() {
  const game = state.game;
  $("entry-list").replaceChildren(
    ...game.players.map((p, i) => {
      const text = entry.texts[p.id] ?? "";
      const shown = text === "" ? "–" : text;
      return el("li", {},
        el("button", {
          type: "button",
          class: "entry",
          role: "option",
          "aria-selected": String(i === entry.selected),
          onclick: () => { entry.selected = i; renderEntries(); },
        },
        el("span", { class: "name" }, p.name),
        el("span", { class: `value${text === "" ? " empty" : ""}${text.startsWith("-") ? " neg" : ""}` }, shown)),
      );
    }),
  );
  const isLast = entry.selected === game.players.length - 1;
  $("next-entry").textContent = isLast || entry.index !== null ? "Save round" : `Next: ${game.players[entry.selected + 1].name} ›`;
  $("entry-list").children[entry.selected]?.scrollIntoView({ block: "nearest" });
}

function selectedId() {
  return state.game.players[entry.selected].id;
}

function press(key) {
  const id = selectedId();
  entry.texts[id] = G.keypad(entry.texts[id] ?? "", key, { vengeance: state.game.vengeance });
  if (state.sound) sound.tick();
  renderEntries();
}

function advance() {
  const game = state.game;
  if (entry.index === null && entry.selected < game.players.length - 1) {
    entry.selected += 1;
    renderEntries();
    return;
  }
  saveRound();
}

function saveRound() {
  const game = state.game;
  const before = G.outcome(game).state;
  const round = G.makeRound(game, entry.texts);
  state.game = entry.index === null ? G.addRound(game, round) : G.replaceRound(game, entry.index, round);
  save();
  $("round-dialog").close();
  render();
  afterChange(before);
}

function afterChange(before) {
  const out = G.outcome(state.game);
  if (out.state === "won" && before !== "won") {
    party();
  } else if (out.state === "tie") {
    toast(`Tied at ${out.total}: ${out.leaders.map((p) => p.name).join(" and ")} play another round!`);
  }
}

function party() {
  const out = G.outcome(state.game);
  if (out.state !== "won") return;
  const kind = G.pickCelebration(state.celebration);
  celebrate(kind, {
    name: out.winner.name,
    detail: `${out.total} points in ${state.game.rounds.length} rounds`,
    withSound: state.sound,
  });
}

// ---- Settings ----

function renderSettings() {
  $("celebration-choices").replaceChildren(
    ...G.CELEBRATIONS.map((c) =>
      el("label", { class: "choice" },
        el("input", {
          type: "radio",
          name: "celebration",
          value: c.id,
          checked: state.celebration === c.id,
          onchange: () => { state.celebration = c.id; save(); },
        }),
        el("span", {}, el("b", { "aria-hidden": "true" }, c.emoji), c.label),
      ),
    ),
  );
  $("sound").checked = state.sound;
  const game = state.game;
  $("rename-section").hidden = !game;
  if (game) {
    $("rename-list").replaceChildren(
      ...game.players.map((p, i) =>
        el("li", {},
          el("span", { class: "seat" }, String(i + 1)),
          el("input", {
            type: "text",
            value: p.name,
            maxlength: "24",
            "aria-label": `Name of player ${i + 1}`,
            onchange: (e) => {
              state.game = G.renamePlayer(state.game, p.id, e.target.value);
              save();
              render();
            },
          }),
        ),
      ),
    );
  }
}

// ---- Wiring ----

function wire() {
  $("setup-form").addEventListener("submit", startGame);
  $("add-player").addEventListener("click", () => {
    state.lastNames.push("");
    save();
    renderSetup();
    const inputs = $("player-inputs").querySelectorAll("input");
    inputs[inputs.length - 1].focus();
  });
  $("player-inputs").addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.target.tagName !== "INPUT") return;
    const inputs = [...$("player-inputs").querySelectorAll("input")];
    const i = inputs.indexOf(e.target);
    if (i < inputs.length - 1) {
      e.preventDefault();
      inputs[i + 1].focus();
    }
  });
  $("target").addEventListener("change", (e) => {
    const v = Number.parseInt(e.target.value, 10);
    if (v > 0) { state.lastTarget = v; save(); }
  });
  $("vengeance").addEventListener("change", (e) => { state.lastVengeance = e.target.checked; save(); });

  $("score-round").addEventListener("click", () => openRound());
  $("undo").addEventListener("click", () => {
    const game = state.game;
    if (game.rounds.length === 0) return;
    const last = game.rounds.length - 1;
    state.game = G.removeRound(game, last);
    save();
    render();
    toast(`Round ${last + 1} removed`);
  });
  $("new-game").addEventListener("click", () => {
    const game = state.game;
    if (game.rounds.length > 0 && G.outcome(game).state !== "won" && !confirm("End this game and start a new one?")) return;
    // Leave unnamed seats empty so that they show the placeholder again.
    state.lastNames = game.players.map((p, i) => (p.name === defaultName(i) ? "" : p.name));
    state.game = null;
    save();
    render();
  });
  $("rematch").addEventListener("click", () => {
    state.game = G.rematch(state.game);
    previousTotals = {};
    save();
    render();
    toast("New game, same players. Good luck!");
  });
  $("celebrate-again").addEventListener("click", () => { sound.unlock(); party(); });

  // Round dialog.
  $("keypad").addEventListener("click", (e) => {
    const key = e.target.closest("button")?.dataset.key;
    if (key) press(key);
  });
  document.querySelectorAll("[data-quick]").forEach((b) =>
    b.addEventListener("click", () => {
      const id = selectedId();
      if (b.dataset.quick === "bust") {
        entry.texts[id] = "0";
        if (entry.selected < state.game.players.length - 1) entry.selected += 1;
        renderEntries();
      } else {
        entry.texts[id] = G.addBonus(entry.texts[id] ?? "");
        renderEntries();
      }
    }),
  );
  $("next-entry").addEventListener("click", advance);
  $("close-round").addEventListener("click", () => $("round-dialog").close());
  $("delete-round").addEventListener("click", () => {
    if (!confirm(`Delete round ${entry.index + 1}?`)) return;
    const before = G.outcome(state.game).state;
    state.game = G.removeRound(state.game, entry.index);
    save();
    $("round-dialog").close();
    render();
    afterChange(before);
  });
  $("round-dialog").addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === "Backspace") press("back");
    else if (e.key === "-") press("neg");
    else if (e.key === "Enter") { e.preventDefault(); advance(); }
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = state.game.players.length;
      entry.selected = (entry.selected + (e.key === "ArrowDown" ? 1 : n - 1)) % n;
      renderEntries();
    } else return;
  });
  // A tap on the backdrop closes the sheet.
  for (const d of document.querySelectorAll("dialog")) {
    d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
  }

  // Settings.
  $("open-settings").addEventListener("click", () => {
    renderSettings();
    $("settings-dialog").showModal();
  });
  $("sound").addEventListener("change", (e) => { state.sound = e.target.checked; save(); });
  $("preview").addEventListener("click", () => {
    sound.unlock();
    $("settings-dialog").close();
    const out = state.game && G.outcome(state.game);
    celebrate(G.pickCelebration(state.celebration), {
      name: out?.state === "won" ? out.winner.name : "You!",
      detail: "This is how the winner will be celebrated",
      withSound: state.sound,
    });
  });
}

load();
wire();
render();
