
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

const layer = document.createElement("div");
layer.id = "p3Layer";

const pauseBox = document.createElement("div");
pauseBox.id = "p3Pause";
pauseBox.className = "p3-pause";
pauseBox.hidden = true;

const pauseEyebrow = document.createElement("div");
pauseEyebrow.className = "p3-eyebrow";

const pauseTitle = document.createElement("div");
pauseTitle.className = "p3-title";

const pauseDetail = document.createElement("div");
pauseDetail.className = "p3-detail";

pauseBox.append(pauseEyebrow, pauseTitle, pauseDetail);

const roundBox = document.createElement("div");
roundBox.id = "p3Round";
roundBox.className = "p3-round";
roundBox.hidden = true;

const roundTeam = document.createElement("div");
roundTeam.className = "p3-round-team";

const roundLabel = document.createElement("div");
roundLabel.className = "p3-round-label";
roundLabel.textContent = "ROUND WIN";

roundBox.append(roundTeam, roundLabel);
layer.append(pauseBox, roundBox);
stage.appendChild(layer);

let match = null;
let lastRoundId = null;
let roundTimer = null;

function getTeamName(team) {
  return team === "B"
    ? match?.teamB?.name || "TEAM B"
    : match?.teamA?.name || "TEAM A";
}

function renderPause() {
  const pause = match?.pause;
  const type = pause?.type || "none";

  pauseBox.hidden = type === "none";

  if (type === "timeout") {
    pauseBox.dataset.mode = "timeout";
    pauseEyebrow.textContent = "TACTICAL BREAK";
    pauseTitle.textContent = "TIME OUT";
    pauseDetail.textContent = getTeamName(pause.team);
  } else if (type === "technical") {
    pauseBox.dataset.mode = "technical";
    pauseEyebrow.textContent = "MATCH INTERRUPTED";
    pauseTitle.textContent = "TECHNICAL PAUSE";
    pauseDetail.textContent = "PLEASE STAND BY";
  } else {
    pauseBox.hidden = true;
  }
}

function clearRound() {
  if (roundTimer) clearTimeout(roundTimer);
  roundTimer = null;
  roundBox.hidden = true;
}

function renderRound() {
  const event = match?.roundEvent;

  if (!event || event.type !== "roundWin") {
    clearRound();
    return;
  }

  const remaining = Number(event.expiresAt) - Date.now();

  if (!Number.isFinite(remaining) || remaining <= 0) {
    clearRound();
    return;
  }

  if (lastRoundId === event.id) return;
  lastRoundId = event.id;

  clearRound();

  roundBox.dataset.team = event.team;
  roundTeam.textContent = getTeamName(event.team);
  roundBox.hidden = false;

  roundTimer = setTimeout(clearRound, remaining);
}

onValue(matchRef, snapshot => {
  match = snapshot.val();
  if (!match) return;

  renderPause();
  renderRound();
}, error => {
  console.error("Observer X Phase 3:", error);
});
