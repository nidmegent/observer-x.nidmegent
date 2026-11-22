
"use strict";

// Phase 1.1 デモデータ
// 今後Firebaseから取得するデータに置き換える
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
  round: 15,
  timer: "1:12",
  eventName: "OBSERVER X CHAMPIONSHIP",
  matchInfo: "GRAND FINAL"
};

const byId = id => document.getElementById(id);

function setText(id, value) {
  byId(id).textContent = String(value ?? "");
}

function renderRoster(id, players) {
  const root = byId(id);
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
      `${player.agent || "AGENT TBD"}  •  K/D/A —`;

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
  setText("roundLabel", `ROUND ${match.round}`);
  setText("timerLabel", match.timer);

  setText(
    "mapInfo",
    `${match.map}  •  MAP ${match.mapNumber}  •  BO${match.bestOf}`
  );

  setText("eventName", match.eventName);
  setText("matchInfo", match.matchInfo);

  renderRoster("rosterA", match.teamA.players);
  renderRoster("rosterB", match.teamB.players);
}

function scaleStage() {
  byId("stage").style.transform =
    `scale(${window.innerWidth / 1920}, ${window.innerHeight / 1080})`;
}

const params = new URLSearchParams(location.search);

if (params.get("players") === "0") {
  document.querySelectorAll(".roster").forEach(
    element => element.classList.add("hidden")
  );
}

if (params.get("cover") === "0") {
  document.querySelector(".top-cover")
    .classList.add("hidden");
}

if (params.get("event") === "0") {
  document.querySelector(".event-banner")
    .classList.add("hidden");
}

if (params.get("demo") === "0") {
  byId("demoLabel").classList.add("hidden");
}

renderMatch(demoMatch);
scaleStage();
window.addEventListener("resize", scaleStage);
