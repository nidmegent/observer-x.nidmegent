
/* ==========================================
   OBSERVER X
   PHASE 4.3 - ROUND HISTORY OVERLAY
========================================== */

import { getApps, initializeApp } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

import {
  getDatabase,
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

import { firebaseConfig, MATCH_ID } from
  "./firebase-config.js";

const app = getApps()[0] || initializeApp(firebaseConfig);
const db = getDatabase(app);
const matchRef = ref(db, `matches/${MATCH_ID}`);

let match = {};
let previousHistory = {};
let initialized = false;
let previousSignature = "";

const defaults = {
  visible: false,
  x: 960,
  y: 650,
  width: 1230,
  height: 400
};

function createHUD() {
  const stage = document.getElementById("stage");

  if (!stage) return null;

  let hud = document.getElementById("p43HistoryHUD");

  if (hud) return hud;

  hud = document.createElement("section");

  hud.id = "p43HistoryHUD";
  hud.hidden = true;

  hud.innerHTML = `
    <div class="p43-top-line"></div>

    <div class="p43-hud-header">
      <span class="p43-hud-kicker">
        OBSERVER X / MATCH ANALYSIS
      </span>

      <h2>ROUND HISTORY</h2>
    </div>

    <div class="p43-hud-content"></div>

    <div class="p43-hud-footer">

      <div class="p43-footer-team p43-team-a">
        <span class="p43-name-a"></span>
      </div>

      <div class="p43-footer-score">
        <strong class="p43-score-a">0</strong>
        <span>:</span>
        <strong class="p43-score-b">0</strong>
      </div>

      <div class="p43-footer-team p43-team-b">
        <span class="p43-name-b"></span>
      </div>

    </div>

    <div class="p43-bottom-line"></div>
  `;

  stage.appendChild(hud);

  return hud;
}

function teamName(team) {
  return team === "A"
    ? match.teamA?.name || "TEAM A"
    : match.teamB?.name || "TEAM B";
}

function createHalf(
  title,
  start,
  end,
  history,
  latestRound
) {
  const half = document.createElement("div");

  half.className = "p43-half";

  const heading = document.createElement("div");

  heading.className = "p43-half-title";
  heading.textContent = title;

  half.appendChild(heading);

  const grid = document.createElement("div");

  grid.className = "p43-round-grid";

  grid.style.gridTemplateColumns =
    `minmax(52px, 1.5fr) repeat(${end - start + 1}, minmax(0, 1fr))`;

  const blank = document.createElement("div");

  grid.appendChild(blank);

  for (let round = start; round <= end; round++) {
    const number = document.createElement("div");

    number.className = "p43-round-number";
    number.textContent = round;

    grid.appendChild(number);
  }

  ["A", "B"].forEach(team => {
    const label = document.createElement("div");

    label.className =
      `p43-row-label p43-team-${team.toLowerCase()}`;

    label.textContent = `TEAM ${team}`;

    grid.appendChild(label);

    for (let round = start; round <= end; round++) {
      const cell = document.createElement("div");

      cell.className = "p43-round-cell";

      if (history[round]?.team === team) {
        cell.classList.add(
          "p43-won",
          `p43-win-${team.toLowerCase()}`
        );

        cell.textContent = "✓";

        if (round === latestRound) {
          cell.classList.add("p43-latest");
        }
      }

      grid.appendChild(cell);
    }
  });

  half.appendChild(grid);

  return half;
}

function normalizeHistory(raw) {
  const history = {};

  Object.entries(raw || {}).forEach(([key, value]) => {
    const round = Number(key);

    if (
      Number.isInteger(round) &&
      round >= 1 &&
      round <= 999 &&
      ["A", "B"].includes(value?.team)
    ) {
      history[round] = value;
    }
  });

  return history;
}

function render() {
  const hud = createHUD();

  if (!hud) return;

  const ui = {
    ...defaults,
    ...(match.roundHistoryUI || {})
  };

  const history = normalizeHistory(match.roundHistory);

  hud.style.setProperty("--p43-x", `${ui.x}px`);
  hud.style.setProperty("--p43-y", `${ui.y}px`);
  hud.style.setProperty("--p43-width", `${ui.width}px`);
  hud.style.setProperty("--p43-height", `${ui.height}px`);

  const scoreA = Number(match.teamA?.score) || 0;
  const scoreB = Number(match.teamB?.score) || 0;

  hud.querySelector(".p43-name-a").textContent =
    teamName("A");

  hud.querySelector(".p43-name-b").textContent =
    teamName("B");

  hud.querySelector(".p43-score-a").textContent =
    scoreA;

  hud.querySelector(".p43-score-b").textContent =
    scoreB;

  const rounds = Object.keys(history).map(Number);

  const maxRound = Math.max(
    24,
    scoreA + scoreB,
    ...rounds
  );

  const signature = JSON.stringify(history) +
    "|" + maxRound;

  if (signature !== previousSignature) {
    let latestRound = -1;

    if (initialized) {
      const changedRounds = rounds.filter(round =>
        !previousHistory[round] ||
        previousHistory[round].team !== history[round].team
      );

      latestRound = Math.max(-1, ...changedRounds);
    }

    const content = hud.querySelector(".p43-hud-content");

    content.replaceChildren();

    const regulation = document.createElement("div");

    regulation.className = "p43-regulation";

    regulation.appendChild(
      createHalf(
        "FIRST HALF",
        1,
        12,
        history,
        latestRound
      )
    );

    regulation.appendChild(
      createHalf(
        "SECOND HALF",
        13,
        24,
        history,
        latestRound
      )
    );

    content.appendChild(regulation);

    // OVERTIME
    if (maxRound > 24) {
      const overtime = document.createElement("div");

      overtime.className = "p43-overtime";

      // 長期戦では直近12ラウンドを表示
      const start = Math.max(
        25,
        25 + Math.floor((maxRound - 25) / 12) * 12
      );

      const end = Math.min(
        start + 11,
        Math.max(start + 1, maxRound)
      );

      overtime.appendChild(
        createHalf(
          `OVERTIME / R${start}–R${end}`,
          start,
          end,
          history,
          latestRound
        )
      );

      content.appendChild(overtime);
    }

    previousSignature = signature;
  }

  previousHistory = history;
  initialized = true;

  hud.hidden = ui.visible !== true;
}

function init() {
  createHUD();

  onValue(matchRef, snapshot => {
    match = snapshot.val() || {};

    render();
  }, error => {
    console.error("Phase 4.3:", error);
  });
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    init,
    { once: true }
  );
} else {
  init();
}
