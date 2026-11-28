
/* ==========================================
   OBSERVER X
   PHASE 4.0.1 - CYBER ESPORTS TIMER REDESIGN
========================================== */

import { getApps, initializeApp } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

import { getDatabase, ref, onValue } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

import { firebaseConfig, MATCH_ID } from
  "./firebase-config.js";

const app = getApps()[0] || initializeApp(firebaseConfig);
const db = getDatabase(app);
const matchRef = ref(db, `matches/${MATCH_ID}`);

let matchData = {};

function createTimerHUD() {
  const stage = document.getElementById("stage");

  if (!stage) return null;

  let hud = document.getElementById("p40TimerHUD");

  if (hud) return hud;

  hud = document.createElement("div");
  hud.id = "p40TimerHUD";

  hud.innerHTML = `
    <svg
  class="p40-frame"
  viewBox="0 0 320 110"
  preserveAspectRatio="none"
  xmlns="http://www.w3.org/2000/svg"
  aria-hidden="true"
>

      <!-- TEAM A PANEL -->

      <path class="p40-frame-panel"
        d="M0 0 H80 L100 20
           V70 L130 100
           H160 V110 H90
           L0 82 Z"/>

      <!-- TEAM B PANEL -->

      <path class="p40-frame-panel"
        d="M320 0 H240 L220 20
           V70 L190 100
           H160 V110 H230
           L320 82 Z"/>

      <!-- TEAM A COLOR LINE -->

      <path class="p40-line-a"
        d="M0 2 H79 L98 21
           V71 L130 102 H160"/>

      <!-- TEAM B COLOR LINE -->

      <path class="p40-line-b"
        d="M320 2 H241 L222 21
           V71 L190 102 H160"/>

      <!-- TEAM A LOWER LINE -->

      <path class="p40-edge-a"
        d="M0 80 L90 108 H160"/>

      <!-- TEAM B LOWER LINE -->

      <path class="p40-edge-b"
        d="M320 80 L230 108 H160"/>

      <!-- LEFT INNER DETAILS -->

      <path class="p40-detail"
        d="M10 12 H73 L88 27 V64"/>

      <path class="p40-detail"
        d="M16 48 H57 L77 68"/>

      <!-- RIGHT INNER DETAILS -->

      <path class="p40-detail"
        d="M310 12 H247 L232 27 V64"/>

      <path class="p40-detail"
        d="M304 48 H263 L243 68"/>

      <!-- TEAM A ACCENTS -->

      <g class="p40-accent-a">
        <path d="M18 24 H48 L56 32 H26 Z"/>
        <path d="M60 24 H68 L76 32 H68 Z"/>
        <path d="M18 38 H35 L39 42 H22 Z"/>
      </g>

      <!-- TEAM B ACCENTS -->

      <g class="p40-accent-b">
        <path d="M302 24 H272 L264 32 H294 Z"/>
        <path d="M260 24 H252 L244 32 H252 Z"/>
        <path d="M302 38 H285 L281 42 H298 Z"/>
      </g>

      <!-- CENTER BOTTOM DETAIL -->

      <path class="p40-detail"
        d="M142 106 H178"/>

    </svg>

    <div class="p40-round-label">
      <span class="p40-round-text">ROUND</span>
      <strong id="p40RoundNumber">01</strong>
    </div>
  `;

  stage.appendChild(hud);

  return hud;
}

function updateTimerHUD() {
  const hud = createTimerHUD();

  if (!hud) return;

  const scoreA = Math.max(
    0,
    Math.trunc(Number(matchData.teamA?.score) || 0)
  );

  const scoreB = Math.max(
    0,
    Math.trunc(Number(matchData.teamB?.score) || 0)
  );

  const roundNumber = scoreA + scoreB + 1;

  hud.querySelector("#p40RoundNumber").textContent =
    String(roundNumber).padStart(2, "0");

  const spike = matchData.spikeStatus || {};

  const isPlanted =
    spike.status === "planted";

  const carriedA =
    spike.status === "carried" &&
    spike.holder === "teamA";

  const carriedB =
    spike.status === "carried" &&
    spike.holder === "teamB";

  hud.classList.toggle(
    "p40-planted",
    isPlanted
  );

  hud.classList.toggle(
    "p40-carried-a",
    carriedA
  );

  hud.classList.toggle(
    "p40-carried-b",
    carriedB
  );
}

function init() {
  createTimerHUD();

  onValue(
    matchRef,
    snapshot => {
      matchData = snapshot.val() || {};

      updateTimerHUD();
    },
    error => {
      console.error("Phase 4.0.1:", error);
    }
  );
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
