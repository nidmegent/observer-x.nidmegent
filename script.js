
"use strict";

const demoMatch = {
  teamA: {
    name: "TEAM ALPHA",
    score: 8,
    side: "ATTACK",
    players: [
      {name:"ALPHA 1",agent:"JETT"},
      {name:"ALPHA 2",agent:"SOVA"},
      {name:"ALPHA 3",agent:"OMEN"},
      {name:"ALPHA 4",agent:"KILLJOY"},
      {name:"ALPHA 5",agent:"KAY/O"}
    ]
  },

  teamB: {
    name: "TEAM BRAVO",
    score: 6,
    side: "DEFENSE",
    players: [
      {name:"BRAVO 1",agent:"RAZE"},
      {name:"BRAVO 2",agent:"FADE"},
      {name:"BRAVO 3",agent:"BRIMSTONE"},
      {name:"BRAVO 4",agent:"CYPHER"},
      {name:"BRAVO 5",agent:"SKYE"}
    ]
  },

  map: "ASCENT",
  mapNumber: 1,
  bestOf: 3,
  eventName: "OBSERVER X CHAMPIONSHIP",
  matchInfo: "GRAND FINAL"
};

const $ = id => document.getElementById(id);

function setText(id, value) {
  $(id).textContent = String(value ?? "");
}

function renderRoster(id, players) {
  const root = $(id);
  root.replaceChildren();

  players.slice(0, 5).forEach(player => {
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
  setText("teamAName", match.teamA.name);
  setText("teamBName", match.teamB.name);

  setText("teamASide", match.teamA.side);
  setText("teamBSide", match.teamB.side);

  setText("teamAScore", match.teamA.score);
  setText("teamBScore", match.teamB.score);

  setText(
    "mapInfo",
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

const params = new URLSearchParams(location.search);

function hide(selector) {
  document.querySelectorAll(selector).forEach(
    el => el.classList.add("hidden")
  );
}

if (params.get("players") === "0") {
  hide(".roster");
}

if (params.get("event") === "0") {
  hide(".event-banner");
}

if (params.get("demo") === "0") {
  hide(".demo-label");
}

if (params.get("map") === "0") {
  hide(".map-info");
}

/* OBSからURLで位置を微調整できる */
const rootStyle = document.documentElement.style;

function setPixelParam(name, variable, min, max) {
  const raw = params.get(name);
  if (raw === null || raw.trim() === "") return;

  const value = Number(raw);
  if (!Number.isFinite(value)) return;

  const safe = Math.max(min, Math.min(max, value));
  rootStyle.setProperty(variable, `${safe}px`);
}

setPixelParam("rosterY", "--roster-top", 0, 1000);
setPixelParam("scoreY", "--score-top", 0, 300);
setPixelParam("scoreLeft", "--score-left", 0, 800);
setPixelParam("scoreRight", "--score-right", 0, 800);

renderMatch(demoMatch);
scaleStage();

window.addEventListener("resize", scaleStage);
