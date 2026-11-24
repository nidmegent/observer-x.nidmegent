
/* ==========================================
   OBSERVER X
   PHASE 4.0 - CYBER ESPORTS TIMER HUD
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
    <div class="p40-round-label">
      ROUND <span id="p40RoundNumber">01</span>
    </div>

    <svg class="p40-frame"
         viewBox="0 0 320 100"
         xmlns="http://www.w3.org/2000/svg">

      <!-- 左側フレーム -->
      <path class="p40-frame-panel"
        d="M0 0 H90 L110 18
           V70 L130 100 H70 L0 65 Z"/>

      <!-- 右側フレーム -->
      <path class="p40-frame-panel"
        d="M320 0 H230 L210 18
           V70 L190 100 H250 L320 65 Z"/>

      <!-- 下側フレーム -->
      <path class="p40-frame-panel"
        d="M70 85 H250 L230 100 H90 Z"/>

      <!-- TEAM A ライン -->
      <path class="p40-line-a"
        d="M0 2 H88 L108 20
           V70 L130 98 H160"/>

      <!-- TEAM B ライン -->
      <path class="p40-line-b"
        d="M320 2 H232 L212 20
           V70 L190 98 H160"/>

      <!-- 内側装飾 -->
      <path class="p40-detail"
        d="M8 10 H83 L100 26 V63"/>

      <path class="p40-detail"
        d="M312 10 H237 L220 26 V63"/>

      <!-- 左アクセント -->
      <path class="p40-accent-a"
        d="M20 22 H48 L57 31 H29 Z"/>

      <!-- 右アクセント -->
      <path class="p40-accent-b"
        d="M300 22 H272 L263 31 H291 Z"/>

      <!-- 下部アクセント -->
      <path class="p40-detail"
        d="M138 91 H182"/>

    </svg>
  `;

  stage.appendChild(hud);

  return hud;
}

function updateTimerHUD() {
  const hud = createTimerHUD();
  if (!hud) return;

  const scoreA = Math.max(
    0,
    Number(matchData.teamA?.score) || 0
  );

  const scoreB = Math.max(
    0,
    Number(matchData.teamB?.score) || 0
  );

  const roundNumber = scoreA + scoreB + 1;

  const roundText =
    hud.querySelector("#p40RoundNumber");

  roundText.textContent =
    String(roundNumber).padStart(2, "0");

  const isPlanted =
    matchData.spikeStatus?.status === "planted";

  hud.classList.toggle(
    "p40-planted",
    isPlanted
  );
}

function init() {
  createTimerHUD();

  onValue(matchRef, snapshot => {
    matchData = snapshot.val() || {};
    updateTimerHUD();
  }, error => {
    console.error("Phase 4.0:", error);
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
