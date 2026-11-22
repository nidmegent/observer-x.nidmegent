
import { getApps, initializeApp } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

import {
  getDatabase, ref, onValue
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

import { firebaseConfig, MATCH_ID } from "./firebase-config.js";

const app = getApps()[0] || initializeApp(firebaseConfig);
const db = getDatabase(app);
const matchRef = ref(db, `matches/${MATCH_ID}`);

const stage = document.getElementById("stage");

if (!stage) {
  throw new Error("Observer X: #stage が見つかりません");
}

const layer = document.createElement("div");
layer.id = "p3Layer";

layer.innerHTML = `
  <div id="p3Pause" class="p3-pause" hidden>
    <div class="p3-backdrop"></div>
    <div class="p3-diagonal p3-diagonal-left"></div>
    <div class="p3-diagonal p3-diagonal-right"></div>

    <div class="p3-brand">
      <span class="p3-brand-symbol">X</span>
      <div>
        <strong>OBSERVER X</strong>
        <small>TOURNAMENT BROADCAST</small>
      </div>
    </div>

    <div class="p3-corner p3-tl"></div>
    <div class="p3-corner p3-tr"></div>
    <div class="p3-corner p3-bl"></div>
    <div class="p3-corner p3-br"></div>

    <div class="p3-content">
      <div id="p3Eyebrow" class="p3-eyebrow"></div>

      <div class="p3-heading-frame">
        <span class="p3-bracket p3-bracket-left"></span>
        <h1 id="p3Title" class="p3-title"></h1>
        <span class="p3-bracket p3-bracket-right"></span>
      </div>

      <div class="p3-nameplate">
        <span id="p3Detail"></span>
      </div>

      <div id="p3Footer" class="p3-footer"></div>
    </div>

    <div class="p3-edge-label">
      OBSERVER X / LIVE BROADCAST
    </div>
  </div>

  <div id="p3Round" class="p3-round" hidden>
    <div class="p3-round-accent"></div>
    <div class="p3-round-inner">
      <div class="p3-round-kicker">OBSERVER X / ROUND RESULT</div>
      <div id="p3RoundTeam" class="p3-round-team"></div>
      <div class="p3-round-label">ROUND WIN</div>
    </div>
  </div>
`;

stage.appendChild(layer);

const pauseBox = document.getElementById("p3Pause");
const roundBox = document.getElementById("p3Round");

const eyebrow = document.getElementById("p3Eyebrow");
const title = document.getElementById("p3Title");
const detail = document.getElementById("p3Detail");
const footer = document.getElementById("p3Footer");
const roundTeam = document.getElementById("p3RoundTeam");

let match = null;
let pauseVisible = false;
let pauseHideTimer = null;
let roundTimer = null;
let lastRoundId = null;
let lastRoundEvent = null;

const FADE_MS = 450;

function getTeamName(team) {
  return team === "B"
    ? match?.teamB?.name || "TEAM B"
    : match?.teamA?.name || "TEAM A";
}

function getTeamColor(team) {
  return team === "B" ? "#ff5369" : "#35d3e3";
}

function isPaused() {
  return ["timeout", "technical"].includes(
    match?.pause?.type
  );
}

function showPause() {
  if (pauseHideTimer !== null) {
    clearTimeout(pauseHideTimer);
    pauseHideTimer = null;
  }

  if (!pauseVisible) {
    pauseVisible = true;
    pauseBox.hidden = false;

    pauseBox.classList.remove("p3-exit");
    pauseBox.classList.remove("p3-enter");

    void pauseBox.offsetWidth;
    pauseBox.classList.add("p3-enter");
  } else {
    pauseBox.classList.remove("p3-exit");
  }
}

function hidePause() {
  if (!pauseVisible) return;

  pauseVisible = false;
  pauseBox.classList.remove("p3-enter");
  pauseBox.classList.add("p3-exit");

  pauseHideTimer = setTimeout(() => {
    if (!pauseVisible) {
      pauseBox.hidden = true;
      pauseBox.classList.remove("p3-exit");
    }
    pauseHideTimer = null;
  }, FADE_MS);
}

function renderPause() {
  const pause = match?.pause;
  const type = pause?.type || "none";

  if (type !== "timeout" && type !== "technical") {
    hidePause();
    return;
  }

  const previousMode = pauseBox.dataset.mode;
  const previousTeam = pauseBox.dataset.team;

  if (type === "timeout") {
    const team = pause.team === "B" ? "B" : "A";

    pauseBox.dataset.mode = "timeout";
    pauseBox.dataset.team = team;

    pauseBox.style.setProperty(
      "--p3-accent", getTeamColor(team)
    );

    eyebrow.textContent = "TACTICAL BREAK";
    title.textContent = "TIME OUT";
    detail.textContent = getTeamName(team);
    footer.textContent = "TIME OUT IN PROGRESS";
  } else {
    pauseBox.dataset.mode = "technical";
    pauseBox.dataset.team = "";

    pauseBox.style.setProperty(
      "--p3-accent", "#35d3e3"
    );

    eyebrow.textContent = "MATCH INTERRUPTED";
    title.textContent = "TECHNICAL PAUSE";
    detail.textContent = "PLEASE STAND BY";
    footer.textContent =
      "TECHNICAL INTERRUPTION — AWAITING RESUME";
  }

  const changed =
    previousMode !== pauseBox.dataset.mode ||
    previousTeam !== pauseBox.dataset.team;

  if (changed && pauseVisible) {
    pauseBox.classList.remove("p3-enter");
    void pauseBox.offsetWidth;
    pauseBox.classList.add("p3-enter");
  }

  showPause();
}

function clearRound() {
  if (roundTimer !== null) {
    clearTimeout(roundTimer);
    roundTimer = null;
  }
  roundBox.hidden = true;
}

function renderRound() {
  if (isPaused()) {
    clearRound();
    return;
  }

  const event = match?.roundEvent;

  if (!event || event.type !== "roundWin") {
    clearRound();
    return;
  }

  const remaining =
    Number(event.expiresAt) - Date.now();

  if (!Number.isFinite(remaining) || remaining <= 0) {
    clearRound();
    return;
  }

  // PAUSE解除後も有効期限内なら表示できる
  if (
    lastRoundId === event.id &&
    !roundBox.hidden
  ) {
    roundTeam.textContent = getTeamName(event.team);
    return;
  }

  lastRoundId = event.id;
  clearRound();

  roundBox.dataset.team = event.team === "B" ? "B" : "A";
  roundBox.style.setProperty(
    "--p3-accent", getTeamColor(event.team)
  );

  roundTeam.textContent = getTeamName(event.team);
  roundBox.hidden = false;

  roundBox.classList.remove("p3-round-enter");
  void roundBox.offsetWidth;
  roundBox.classList.add("p3-round-enter");

  roundTimer = setTimeout(clearRound, remaining);
}

onValue(matchRef, snapshot => {
  match = snapshot.val();

  if (!match) {
    hidePause();
    clearRound();
    return;
  }

  renderPause();
  renderRound();
}, error => {
  console.error("Observer X Phase 3:", error);
});
