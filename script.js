
"use strict";

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);

const demoMatch = {
  eventName: "OBSERVER X CHAMPIONSHIP",
  matchInfo: "GRAND FINAL",
  map: "ASCENT",
  mapNumber: 1,
  bestOf: 3,
  teamA: {
    name: "TEAM ALPHA",
    score: 8,
    side: "ATTACK",
    players: Array.from({length:5}, (_,i) => ({
      name: `ALPHA ${i+1}`, agent: "UNKNOWN"
    }))
  },
  teamB: {
    name: "TEAM BRAVO",
    score: 6,
    side: "DEFENSE",
    players: Array.from({length:5}, (_,i) => ({
      name: `BRAVO ${i+1}`, agent: "UNKNOWN"
    }))
  }
};

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = String(value ?? "");
}

function renderRoster(id, players = []) {
  const root = $(id);
  if (!root) return;
  root.replaceChildren();

  players.slice(0,5).forEach(player => {
    const card = document.createElement("div");
    card.className = "player";

    const name = document.createElement("div");
    name.className = "player-name";
    name.textContent = player.name || "PLAYER";

    const meta = document.createElement("div");
    meta.className = "player-meta";
    meta.textContent =
      `${player.agent || "UNKNOWN"} • K/D/A —`;

    card.append(name, meta);
    root.appendChild(card);
  });
}

function renderMatch(match) {
  if (!match?.teamA || !match?.teamB) return;

  setText("teamAName", match.teamA.name);
  setText("teamBName", match.teamB.name);
  setText("teamASide", match.teamA.side);
  setText("teamBSide", match.teamB.side);
  setText("teamAScore", match.teamA.score);
  setText("teamBScore", match.teamB.score);

  setText("mapInfo",
    `${match.map} • MAP ${match.mapNumber} • BO${match.bestOf}`
  );
  setText("eventName", match.eventName);
  setText("matchInfo", match.matchInfo);

  renderRoster("rosterA", match.teamA.players);
  renderRoster("rosterB", match.teamB.players);
}

function scaleStage() {
  $("stage").style.transform =
    `scale(${innerWidth / 1920}, ${innerHeight / 1080})`;
}

function hide(selector) {
  document.querySelectorAll(selector).forEach(
    el => el.classList.add("hidden")
  );
}

if (params.get("players") === "0") hide(".roster");
if (params.get("event") === "0") hide(".event-banner");
if (params.get("map") === "0") hide(".map-info");
if (params.get("demo") === "0") hide(".demo-label");

// Phase 1で確定した選手欄の位置
const rootStyle = document.documentElement.style;
rootStyle.setProperty("--roster-top", "650px");

function pixelParam(name, cssVar, min, max) {
  const raw = params.get(name);
  if (raw === null || raw.trim() === "") return;
  const value = Number(raw);
  if (!Number.isFinite(value)) return;
  rootStyle.setProperty(
    cssVar,
    `${Math.max(min, Math.min(max, value))}px`
  );
}

pixelParam("rosterY", "--roster-top", 0, 1000);
pixelParam("scoreY", "--score-top", 0, 300);
pixelParam("scoreLeft", "--score-left", 0, 800);
pixelParam("scoreRight", "--score-right", 0, 800);

scaleStage();
window.addEventListener("resize", scaleStage);

// Firebase読み込み前のプレビュー
renderMatch(demoMatch);

(async () => {
  try {
    const {firebaseConfig, MATCH_ID} =
      await import("./firebase-config.js");

    const {initializeApp} = await import(
      "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js"
    );

    const {getDatabase, ref, onValue} = await import(
      "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js"
    );

    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);

    onValue(
      ref(db, `matches/${MATCH_ID}`),
      snapshot => {
        const match = snapshot.val();
        if (match) {
          renderMatch(match);
          hide(".demo-label");
        } else {
          console.warn("Observer X: 試合データ未作成");
        }
      },
      error => {
        console.error("Observer X Firebase:", error);
      }
    );
  } catch (error) {
    console.error("Observer X initialization:", error);
  }
})();
