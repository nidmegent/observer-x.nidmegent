
/* ==========================================
   OBSERVER X - PHASE 3.9
   SPIKE STATUS HUD / OVERLAY
========================================== */

import {
  getApps,
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

import {
  getDatabase,
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

import {
  firebaseConfig,
  MATCH_ID
} from "./firebase-config.js";

const app = getApps()[0] || initializeApp(firebaseConfig);
const db = getDatabase(app);

const matchRef = ref(db, `matches/${MATCH_ID}`);

let matchData = {};
let spikeData = {};

function createSpikeHUD() {
  const stage = document.getElementById("stage");
  if (!stage) return null;

  let hud = document.getElementById("p39SpikeHUD");

  if (!hud) {
    hud = document.createElement("div");
    hud.id = "p39SpikeHUD";
    hud.hidden = true;

    hud.innerHTML = `
      <div class="p39-spike-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2L19 9V18L12 22L5 18V9Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"/>
          <path d="M12 6V17M8 11H16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"/>
        </svg>
      </div>
      <div class="p39-spike-info">
        <div class="p39-spike-title"></div>
        <div class="p39-spike-subtitle"></div>
      </div>
    `;

    stage.appendChild(hud);
  }

  return hud;
}


function updateSpikeHUD() {
  const hud = createSpikeHUD();
  if (!hud) return;

  const status = spikeData.status || "none";
  const holder = spikeData.holder || "none";

  const title = hud.querySelector(".p39-spike-title");
  const subtitle = hud.querySelector(".p39-spike-subtitle");
  const icon = hud.querySelector(".p39-spike-icon");

  hud.classList.remove(
    "p39-team-a",
    "p39-team-b",
    "p39-planted"
  );

  if (status === "planted") {
    hud.hidden = false;
    hud.classList.add("p39-planted");

    // プラント後の位置はタイマーUI制作時に調整
    title.textContent = "SPIKE PLANTED";
    subtitle.textContent = "";
    icon.textContent = "◆";

    return;
  }

  if (status === "carried" &&
      ["teamA", "teamB"].includes(holder)) {

    const isA = holder === "teamA";

    hud.hidden = false;
    hud.classList.add(isA ? "p39-team-a" : "p39-team-b");

    title.textContent = "SPIKE";
    subtitle.textContent = "";

    // TEAM A = 左 / TEAM B = 右
    icon.textContent = isA ? "◀" : "▶";

    return;
  }

  hud.hidden = true;
}


function initialize() {
  createSpikeHUD();
  updateSpikeHUD();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initialize,
    { once: true }
  );
} else {
  initialize();
}

onValue(matchRef, snapshot => {
  matchData = snapshot.val() || {};
  spikeData = matchData.spikeStatus || {};
  updateSpikeHUD();
}, error => {
  console.error("Phase 3.9 Firebase:", error);
});
