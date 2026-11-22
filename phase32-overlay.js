
import { getApps, initializeApp } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

import {
  getDatabase, ref, onValue
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

import { firebaseConfig, MATCH_ID } from "./firebase-config.js";

const app = getApps()[0] || initializeApp(firebaseConfig);
const db = getDatabase(app);

const teamABox =
  document.querySelector(".score-group.team-a");
const teamBBox =
  document.querySelector(".score-group.team-b");

function createIndicator(box, team) {
  if (!box) {
    console.error("Observer X: score-group not found", team);
    return null;
  }

  const indicator = document.createElement("div");
  indicator.className = `p32-indicator p32-indicator-${team}`;
  indicator.setAttribute("aria-label", "Map wins");

  const dots = document.createElement("div");
  dots.className = "p32-map-dots";

  const label = document.createElement("span");
  label.className = "p32-map-label";
  label.textContent = "MAP WINS";

  indicator.append(label, dots);
  box.appendChild(indicator);

  return dots;
}

const dotsA = createIndicator(teamABox, "a");
const dotsB = createIndicator(teamBBox, "b");

function renderDots(container, wins, total) {
  if (!container) return;

  container.replaceChildren();

  for (let i = 0; i < total; i++) {
    const dot = document.createElement("span");
    dot.className = "p32-map-dot";

    if (i < wins) {
      dot.classList.add("active");
    }

    container.appendChild(dot);
  }
}

function render(match) {
  if (!match) return;

  const bo = [1,3,5].includes(Number(match.bestOf))
    ? Number(match.bestOf) : 3;

  const needed = Math.floor(bo / 2) + 1;

  const winsA = Math.max(
    0, Math.trunc(Number(match.teamA?.seriesWins) || 0)
  );
  const winsB = Math.max(
    0, Math.trunc(Number(match.teamB?.seriesWins) || 0)
  );

  renderDots(dotsA, winsA, needed);
  renderDots(dotsB, winsB, needed);
}

onValue(
  ref(db, `matches/${MATCH_ID}`),
  snapshot => render(snapshot.val()),
  error => console.error("Series HUD error:", error)
);
